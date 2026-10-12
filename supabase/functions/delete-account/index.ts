import { createClient } from 'npm:@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (body: object, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { ...cors, 'Content-Type': 'application/json' },
});

Deno.serve(async (request: Request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  const token = request.headers.get('Authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) return json({ error: 'Sign in required' }, 401);
  try {
    const url = Deno.env.get('SUPABASE_URL')!;
    const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    // Derive the account from the verified token; never accept a user ID from the caller.
    const { data: { user }, error } = await admin.auth.getUser(token);
    if (error || !user?.email) return json({ error: 'Sign in required' }, 401);
    const { password } = await request.json();
    if (typeof password !== 'string' || !password) return json({ error: 'Current password required' }, 400);
    const verifier = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: verified, error: passwordError } = await verifier.auth.signInWithPassword({ email: user.email, password });
    if (passwordError || verified.user?.id !== user.id) return json({ error: 'Incorrect password' }, 403);
    await verifier.auth.signOut({ scope: 'local' });

    // Storage objects must be removed through the Storage API before deleting their owner.
    // Re-list from the start after every deletion to avoid skipping files when paging.
    const bucket = admin.storage.from('workspace-files');
    const removeFolder = async (prefix: string): Promise<void> => {
      while (true) {
        const { data: files, error: listError } = await bucket.list(prefix, { limit: 100 });
        if (listError) throw listError;
        if (!files?.length) return;
        const paths: string[] = [];
        for (const file of files) {
          const path = `${prefix}/${file.name}`;
          if (file.id) paths.push(path);
          else await removeFolder(path);
        }
        if (paths.length) {
          const { error: removeError } = await bucket.remove(paths);
          if (removeError) throw removeError;
        }
      }
    };
    await removeFolder(user.id);
    // Foreign keys in supabase-setup.sql cascade to the workspace and share links.
    const { error: deleteError } = await admin.auth.admin.deleteUser(user.id);
    if (deleteError) throw deleteError;
    return json({ deleted: true });
  } catch {
    return json({ error: 'Could not finish deleting the account. Please try again.' }, 500);
  }
});
