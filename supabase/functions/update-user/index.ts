import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface UpdateUserRequest {
  userId: string
  username?: string
  fullName?: string
  email?: string
  password?: string
  role?: 'admin' | 'user' | 'financeiro'
  sector?: 'Comercial' | 'Suporte' | 'Desenvolvimento' | 'Administrativo' | 'Loja'
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
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

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('No authorization header')
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token)

    if (userError || !user) {
      throw new Error('Invalid token')
    }

    const { data: roleData, error: roleError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single()

    if (roleError || !roleData || (roleData.role !== 'admin' && roleData.role !== 'dev')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { userId, username, fullName, email, password, role, sector }: UpdateUserRequest = await req.json()

    console.log('Updating user:', { userId, username, email, role, sector, hasPassword: !!password })

    // Check if username already exists (if changing username)
    if (username) {
      const { data: existingProfile } = await supabaseAdmin
        .from('profiles')
        .select('username')
        .eq('username', username)
        .neq('id', userId)
        .single()

      if (existingProfile) {
        return new Response(
          JSON.stringify({ error: 'Nome de usuário já existe' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    // Update profile
    const profileUpdate: any = {}
    if (username) profileUpdate.username = username
    if (fullName) profileUpdate.full_name = fullName
    if (sector) profileUpdate.sector = sector

    if (Object.keys(profileUpdate).length > 0) {
      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .update(profileUpdate)
        .eq('id', userId)

      if (profileError) {
        console.error('Profile error:', profileError)
        throw profileError
      }
    }

    // Update email if provided and different from current
    if (email) {
      // Get current user email first
      const { data: currentUser, error: getUserError } = await supabaseAdmin.auth.admin.getUserById(userId)
      
      if (getUserError) {
        console.error('Error getting current user:', getUserError)
        throw getUserError
      }

      // Only update if email is different
      if (currentUser?.user?.email !== email) {
        // Check if new email already exists for another user
        const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers()
        const emailExists = existingUsers?.users?.some(
          (u) => u.email === email && u.id !== userId
        )

        if (emailExists) {
          return new Response(
            JSON.stringify({ error: 'Este e-mail já está em uso por outro usuário' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        const { error: emailError } = await supabaseAdmin.auth.admin.updateUserById(
          userId,
          { email }
        )

        if (emailError) {
          console.error('Email error:', emailError)
          throw emailError
        }
      }
    }

    // Update password if provided
    if (password) {
      const { error: passwordError } = await supabaseAdmin.auth.admin.updateUserById(
        userId,
        { password }
      )

      if (passwordError) {
        console.error('Password error:', passwordError)
        throw passwordError
      }
      console.log('Password updated successfully for user:', userId)
    }

    // Update role if provided
    if (role) {
      const { error: roleUpdateError } = await supabaseAdmin
        .from('user_roles')
        .update({ role })
        .eq('user_id', userId)

      if (roleUpdateError) {
        console.error('Role error:', roleUpdateError)
        throw roleUpdateError
      }
    }

    console.log('User updated successfully')

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Usuário atualizado com sucesso'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error updating user:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
