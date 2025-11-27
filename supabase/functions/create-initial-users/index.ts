import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.84.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface UserConfig {
  username: string;
  email: string;
  password: string;
  role: 'dev' | 'admin' | 'user' | 'financeiro';
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    const users: UserConfig[] = [
      { username: 'Dev', email: 'dev@sistema.com', password: '123', role: 'dev' },
      { username: 'Admin', email: 'admin@sistema.com', password: '123', role: 'admin' },
      { username: 'User', email: 'user@sistema.com', password: '123', role: 'user' },
      { username: 'Financeiro', email: 'financeiro@sistema.com', password: '123', role: 'financeiro' },
    ];

    const results = [];

    for (const user of users) {
      console.log(`Creating user: ${user.username}`);
      
      // Create auth user
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: user.email,
        password: user.password,
        email_confirm: true,
        user_metadata: {
          username: user.username,
        },
      });

      if (authError) {
        console.error(`Error creating auth user ${user.username}:`, authError);
        results.push({ username: user.username, error: authError.message });
        continue;
      }

      console.log(`Auth user created for ${user.username}, ID: ${authData.user.id}`);

      // Update profile with username
      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .update({ username: user.username })
        .eq('id', authData.user.id);

      if (profileError) {
        console.error(`Error updating profile for ${user.username}:`, profileError);
        results.push({ username: user.username, error: profileError.message });
        continue;
      }

      console.log(`Profile updated for ${user.username}`);

      // Insert user role
      const { error: roleError } = await supabaseAdmin
        .from('user_roles')
        .insert({
          user_id: authData.user.id,
          role: user.role,
        });

      if (roleError) {
        console.error(`Error creating role for ${user.username}:`, roleError);
        results.push({ username: user.username, error: roleError.message });
        continue;
      }

      console.log(`Role assigned to ${user.username}`);
      results.push({ username: user.username, success: true });
    }

    return new Response(
      JSON.stringify({ results }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error in create-initial-users:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
