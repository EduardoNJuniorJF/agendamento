import { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

type UserRole = 'dev' | 'admin' | 'user' | 'financeiro';
type UserSector = 'Comercial' | 'Suporte' | 'Desenvolvimento' | 'Administrativo' | null;

interface AuthContextType {
  user: User | null;
  session: Session | null;
  role: UserRole | null;
  sector: UserSector;
  userName: string | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  updatePassword: (newPassword: string) => Promise<{ error: any }>;
  // Funções de verificação de acesso por setor
  canAccessCalendar: () => boolean;
  canEditCalendar: () => boolean;
  canAccessFleet: () => boolean;
  canEditFleet: () => boolean;
  canAccessBonus: () => boolean;
  canEditBonus: () => boolean;
  canAccessTeam: () => boolean;
  canEditTeam: () => boolean;
  canAccessVacations: () => boolean;
  canEditVacations: () => boolean;
  canAccessUserManagement: () => boolean;
  canEditUserManagement: (targetSector?: string) => boolean;
  // Legacy function
  canEdit: (page: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [sector, setSector] = useState<UserSector>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          setTimeout(() => {
            fetchUserRole(session.user.id);
            fetchUserProfile(session.user.id);
          }, 0);
        } else {
          setRole(null);
          setSector(null);
          setUserName(null);
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserRole(session.user.id);
        fetchUserProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserRole = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .single();

      if (!error && data) {
        setRole(data.role as UserRole);
      }
    } catch (error) {
      console.error('Error fetching user role:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('full_name, username, sector')
        .eq('id', userId)
        .single();

      if (!error && data) {
        setUserName(data.full_name || data.username || 'Usuário');
        setSector(data.sector as UserSector);
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
  };

  const signIn = async (username: string, password: string) => {
    const { data: emailData, error: emailError } = await supabase
      .rpc('get_email_from_username', { _username: username });

    if (emailError || !emailData) {
      return { error: { message: 'Usuário não encontrado' } };
    }

    const { error } = await supabase.auth.signInWithPassword({
      email: emailData,
      password,
    });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setRole(null);
    setSector(null);
    setUserName(null);
    navigate('/auth');
  };

  const updatePassword = async (newPassword: string) => {
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });
    return { error };
  };

  // ========== FUNÇÕES DE PERMISSÃO POR SETOR ==========

  // Dev tem acesso total
  const isDev = () => role === 'dev';

  // Calendário/Agendamentos: Comercial (CRUD), Administrativo (apenas ver)
  const canAccessCalendar = (): boolean => {
    if (isDev()) return true;
    return sector === 'Comercial' || sector === 'Administrativo';
  };

  const canEditCalendar = (): boolean => {
    if (isDev()) return true;
    return sector === 'Comercial';
  };

  // Frota: Comercial Admin (CRUD), Comercial User (ver), Administrativo (ver)
  const canAccessFleet = (): boolean => {
    if (isDev()) return true;
    return sector === 'Comercial' || sector === 'Administrativo';
  };

  const canEditFleet = (): boolean => {
    if (isDev()) return true;
    return sector === 'Comercial' && role === 'admin';
  };

  // Bonificação: Comercial (admin: config, user: ver), Administrativo (ver e imprimir)
  const canAccessBonus = (): boolean => {
    if (isDev()) return true;
    return sector === 'Comercial' || sector === 'Administrativo';
  };

  const canEditBonus = (): boolean => {
    if (isDev()) return true;
    return sector === 'Comercial' && role === 'admin';
  };

  // Equipe: Cada setor vê e gerencia apenas sua equipe (admin), Administrativo vê todos
  const canAccessTeam = (): boolean => {
    return true; // Todos podem acessar
  };

  const canEditTeam = (): boolean => {
    if (isDev()) return true;
    return role === 'admin';
  };

  // Férias e Folgas: Cada setor vê apenas seu setor (admin edita), Administrativo vê todos e edita todos (alteração solicitada)
  const canAccessVacations = (): boolean => {
    return true; // Todos podem acessar
  };

  const canEditVacations = (): boolean => {
    if (isDev()) return true;
    // Administrativo pode editar de todos os setores (alteração solicitada)
    if (sector === 'Administrativo' && role === 'admin') return true;
    return role === 'admin';
  };

  // Criar Usuários: Admin Comercial (todos), Admin outros (só seu setor), Admin Administrativo (vê todos, edita só seu)
  const canAccessUserManagement = (): boolean => {
    if (isDev()) return true;
    return role === 'admin';
  };

  const canEditUserManagement = (targetSector?: string): boolean => {
    if (isDev()) return true;
    if (role !== 'admin') return false;
    
    // Comercial Admin pode editar todos
    if (sector === 'Comercial') return true;
    
    // Outros admins só podem editar do seu setor
    if (targetSector) {
      return sector === targetSector;
    }
    
    return true;
  };

  // Legacy function para compatibilidade
  const canEdit = (page: string): boolean => {
    if (isDev()) return true;
    if (role === 'admin') {
      // Admin tem acesso de edição baseado no setor
      switch (page) {
        case 'dashboard':
        case 'calendar':
          return canEditCalendar();
        case 'fleet':
          return canEditFleet();
        case 'team':
          return canEditTeam();
        case 'vacations':
          return canEditVacations();
        case 'bonus':
          return canEditBonus();
        default:
          return true;
      }
    }
    
    if (role === 'user') {
      // User do Comercial pode editar dashboard e calendar
      if (sector === 'Comercial' && (page === 'dashboard' || page === 'calendar')) return true;
      return false;
    }
    
    // Financeiro não pode editar nada
    return false;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        role,
        sector,
        userName,
        loading,
        signIn,
        signOut,
        updatePassword,
        canAccessCalendar,
        canEditCalendar,
        canAccessFleet,
        canEditFleet,
        canAccessBonus,
        canEditBonus,
        canAccessTeam,
        canEditTeam,
        canAccessVacations,
        canEditVacations,
        canAccessUserManagement,
        canEditUserManagement,
        canEdit,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
