import { NextRequest, NextResponse } from 'next/server';
import { supabaseAnon } from '@/lib/supabaseAnon';

const MAX_ATTEMPTS = 5;
const BLOCK_DURATION_MS = 15 * 60 * 1000;
const failedAttempts = new Map<string, { count: number; blockedUntil: number }>();

function cleanupOldEntries() {
  const now = Date.now();
  for (const [key, value] of failedAttempts.entries()) {
    if (value.blockedUntil < now) {
      failedAttempts.delete(key);
    }
  }
}

function getIpFromRequest(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return request.headers.get('x-real-ip') || 'unknown';
}

export async function POST(request: NextRequest) {
  try {
    const ip = getIpFromRequest(request);

    cleanupOldEntries();

    const attempt = failedAttempts.get(ip);
    if (attempt && attempt.blockedUntil > Date.now()) {
      const remaining = Math.ceil((attempt.blockedUntil - Date.now()) / 60000);
      return NextResponse.json(
        { error: `Слишком много попыток. Попробуйте через ${remaining} мин.` },
        { status: 429 }
      );
    }

    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email и пароль обязательны' }, { status: 400 });
    }

    const { data, error } = await supabaseAnon.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      const current = failedAttempts.get(ip) || { count: 0, blockedUntil: 0 };
      const newCount = current.count + 1;

      if (newCount >= MAX_ATTEMPTS) {
        failedAttempts.set(ip, {
          count: newCount,
          blockedUntil: Date.now() + BLOCK_DURATION_MS,
        });
        return NextResponse.json(
          { error: 'Слишком много попыток. Попробуйте через 15 мин.' },
          { status: 429 }
        );
      }

      failedAttempts.set(ip, { count: newCount, blockedUntil: current.blockedUntil });
      return NextResponse.json({ error: 'Неверный email или пароль' }, { status: 401 });
    }

    const adminEmail = process.env.ADMIN_EMAIL;
    if (!adminEmail || data.user.email?.toLowerCase() !== adminEmail.toLowerCase()) {
      return NextResponse.json({ error: 'Доступ запрещён' }, { status: 403 });
    }

    failedAttempts.delete(ip);

    const response = NextResponse.json({ success: true });
    response.cookies.set('admin_session', data.session?.access_token || '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 8,
      path: '/',
    });

    return response;
  } catch {
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}
