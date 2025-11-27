export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type UserRole = 'admin' | 'tecnico';
export type VehicleStatus = 'available' | 'in_use' | 'maintenance';
export type AppointmentStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
export type ExpenseStatus = 'não_separar' | 'separar_dinheiro' | 'separar_dia_anterior';

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          role: UserRole;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          role?: UserRole;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string | null;
          role?: UserRole;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      agents: {
        Row: {
          id: string;
          name: string;
          sector: string | null;
          is_active: boolean;
          color: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          sector?: string | null;
          is_active?: boolean;
          color?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          sector?: string | null;
          is_active?: boolean;
          color?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      vehicles: {
        Row: {
          id: string;
          model: string;
          plate: string;
          status: VehicleStatus;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          model: string;
          plate: string;
          status?: VehicleStatus;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          model?: string;
          plate?: string;
          status?: VehicleStatus;
          created_at?: string;
          updated_at?: string;
        };
      };
      vacations: {
        Row: {
          id: string;
          agent_id: string;
          start_date: string;
          end_date: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          agent_id: string;
          start_date: string;
          end_date: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          agent_id?: string;
          start_date?: string;
          end_date?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      appointments: {
        Row: {
          id: string;
          title: string;
          date: string;
          time: string;
          city: string;
          agent_id: string | null;
          vehicle_id: string | null;
          expense_status: ExpenseStatus;
          status: AppointmentStatus;
          description: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          date: string;
          time: string;
          city: string;
          agent_id?: string | null;
          vehicle_id?: string | null;
          expense_status?: ExpenseStatus;
          status?: AppointmentStatus;
          description?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          date?: string;
          time?: string;
          city?: string;
          agent_id?: string | null;
          vehicle_id?: string | null;
          expense_status?: ExpenseStatus;
          status?: AppointmentStatus;
          description?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
    Functions: {
      check_vehicle_availability: {
        Args: {
          p_vehicle_id: string;
          p_date: string;
          p_time: string;
          p_appointment_id?: string;
        };
        Returns: boolean;
      };
      is_agent_on_vacation: {
        Args: {
          p_agent_id: string;
          p_date: string;
        };
        Returns: boolean;
      };
    };
  };
}
