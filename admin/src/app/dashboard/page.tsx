import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { supabaseAnon } from '@/lib/supabaseAnon';
import DashboardContent from '@/components/DashboardContent';

const ADMIN_COOKIE_NAME = 'admin_session';

async function verifyAdmin(): Promise<boolean> {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_COOKIE_NAME)?.value;

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

export default async function DashboardPage() {
  const isAdmin = await verifyAdmin();

  if (!isAdmin) {
    redirect('/login');
  }

  return <DashboardContent />;
}
