import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { supabaseAnon } from '@/lib/supabaseAnon';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

async function verifyAdmin(): Promise<boolean> {
  const cookieStore = await cookies();
  const token = cookieStore.get('admin_session')?.value;
  if (!token) return false;

  try {
    const { data, error } = await supabaseAnon.auth.getUser(token);
    if (error || !data.user) return false;

    const adminEmail = process.env.ADMIN_EMAIL;
    if (!adminEmail) return false;

    return data.user.email?.toLowerCase() === adminEmail.toLowerCase();
  } catch {
    return false;
  }
}

export async function GET() {
  const isAdmin = await verifyAdmin();
  if (!isAdmin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await supabaseAdmin
    .from('properties')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
