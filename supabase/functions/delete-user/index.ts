// Delete user edge function - v4
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Decode JWT to get user ID without verification (verification is done by Supabase)
function decodeJWT(token: string): { sub: string } | null {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    const payload = JSON.parse(atob(parts[1]))
    return payload
  } catch {
    return null
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('No authorization header')
    }

    const token = authHeader.replace('Bearer ', '')
    
    // Decode JWT to get user ID
    const payload = decodeJWT(token)
    if (!payload || !payload.sub) {
      throw new Error('Invalid token format')
    }

    const requestingUserId = payload.sub
    console.log('Requesting user ID from token:', requestingUserId)

    // Create admin client for privileged operations
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Verify the user exists using admin API
    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(requestingUserId)

    if (userError || !userData?.user) {
      console.error('User validation error:', userError)
      throw new Error('Invalid token')
    }

    console.log('User validated:', userData.user.id)

    const { data: roleData, error: roleError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', requestingUserId)
      .single()

    if (roleError || !roleData || (roleData.role !== 'admin' && roleData.role !== 'dev')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { userId }: { userId: string } = await req.json()

    console.log('Deleting user:', userId)

    // Prevent self-deletion
    if (userId === requestingUserId) {
      return new Response(
        JSON.stringify({ error: 'Você não pode excluir seu próprio usuário' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // First, delete the agent record if it exists (to avoid foreign key constraint)
    const { error: agentDeleteError } = await supabaseAdmin
      .from('agents')
      .delete()
      .eq('user_id', userId)

    if (agentDeleteError) {
      console.log('Agent delete result:', agentDeleteError)
    }

    // Delete user using admin API (this will cascade delete profile and roles)
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId)

    if (deleteError) {
      console.error('Delete error:', deleteError)
      throw deleteError
    }

    console.log('User deleted successfully')

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Usuário excluído com sucesso'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error deleting user:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
