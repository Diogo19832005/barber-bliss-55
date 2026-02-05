import { supabase } from "@/integrations/supabase/client";

export { supabase };

export type UserRole = 'barber' | 'client';

export interface Profile {
  id: string;
  user_id: string;
  full_name: string;
  role: UserRole;
  phone: string | null;
  avatar_url: string | null;
   public_id: number | null;
   slug_nome: string | null;
   slug_final: string | null;
   barber_status: 'pending' | 'approved' | 'rejected' | null;
   nome_exibido: string | null;
   logo_url: string | null;
   cor_primaria: string | null;
   cor_secundaria: string | null;
  created_at: string;
  updated_at: string;
}

export interface Service {
  id: string;
  barber_id: string;
  name: string;
  description: string | null;
  duration_minutes: number;
  price: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface BarberSchedule {
  id: string;
  barber_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_active: boolean;
  created_at: string;
}

export interface Appointment {
  id: string;
  client_id: string;
  barber_id: string;
  service_id: string;
  appointment_date: string;
  start_time: string;
  end_time: string;
  status: 'scheduled' | 'completed' | 'cancelled';
  notes: string | null;
  created_at: string;
  updated_at: string;
}
