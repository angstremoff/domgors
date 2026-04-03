import { NextRequest, NextResponse } from 'next/server';
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

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const isAdmin = await verifyAdmin();
  if (!isAdmin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const body = await request.json();
  const { name, phone, email, site, location, description, logo_url } = body;

  const { error } = await supabaseAdmin
    .from('agency_profiles')
    .update({ name, phone, email, site, location, description, logo_url })
    .eq('id', id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const isAdmin = await verifyAdmin();
  if (!isAdmin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const formData = await request.formData();
  const file = formData.get('file') as File | null;
  if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 });

  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
  const safeExt = ['jpg', 'jpeg', 'png', 'webp'].includes(ext) ? ext : 'jpg';
  const fileName = `agency-logos/${id}/${Date.now()}.${safeExt}`;

  const { error: uploadError } = await supabaseAdmin.storage
    .from('agency-logos')
    .upload(fileName, file, { contentType: file.type || `image/${safeExt}`, upsert: true });

  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 });

  const { data } = supabaseAdmin.storage.from('agency-logos').getPublicUrl(fileName);

  await supabaseAdmin
    .from('agency_profiles')
    .update({ logo_url: data.publicUrl })
    .eq('id', id);

  return NextResponse.json({ url: data.publicUrl });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const isAdmin = await verifyAdmin();
  if (!isAdmin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;

  const { error } = await supabaseAdmin.from('agency_profiles').delete().eq('id', id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
