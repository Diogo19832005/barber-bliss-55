import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

export interface AdminPermissions {
  can_approve_barbers: boolean;
  can_suspend_barbers: boolean;
  can_view_emails: boolean;
  can_view_contacts: boolean;
  can_view_financials: boolean;
  can_manage_subscriptions: boolean;
}

const ALL_PERMISSIONS: AdminPermissions = {
  can_approve_barbers: true,
  can_suspend_barbers: true,
  can_view_emails: true,
  can_view_contacts: true,
  can_view_financials: true,
  can_manage_subscriptions: true,
};

const NO_PERMISSIONS: AdminPermissions = {
  can_approve_barbers: false,
  can_suspend_barbers: false,
  can_view_emails: false,
  can_view_contacts: false,
  can_view_financials: false,
  can_manage_subscriptions: false,
};

export function useAdminPermissions() {
  const { user, isAdmin, isChiefAdmin } = useAuth();
  const [permissions, setPermissions] = useState<AdminPermissions>(NO_PERMISSIONS);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user || !isAdmin) {
      setPermissions(NO_PERMISSIONS);
      setIsLoading(false);
      return;
    }

    // Chief admins have all permissions
    if (isChiefAdmin) {
      setPermissions(ALL_PERMISSIONS);
      setIsLoading(false);
      return;
    }

    // Fetch collaborator permissions
    const fetchPermissions = async () => {
      const { data, error } = await supabase
        .from('admin_permissions')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error fetching admin permissions:', error);
        setPermissions(NO_PERMISSIONS);
      } else if (data) {
        setPermissions({
          can_approve_barbers: data.can_approve_barbers,
          can_suspend_barbers: data.can_suspend_barbers,
          can_view_emails: data.can_view_emails,
          can_view_contacts: data.can_view_contacts,
          can_view_financials: data.can_view_financials,
          can_manage_subscriptions: data.can_manage_subscriptions,
        });
      } else {
        setPermissions(NO_PERMISSIONS);
      }
      setIsLoading(false);
    };

    fetchPermissions();
  }, [user, isAdmin, isChiefAdmin]);

  return { permissions, isLoading };
}

export const PERMISSION_LABELS: Record<keyof AdminPermissions, string> = {
  can_approve_barbers: 'Aprovar barbeiros',
  can_suspend_barbers: 'Suspender barbeiros',
  can_view_emails: 'Ver e-mails dos barbeiros',
  can_view_contacts: 'Ver contatos (telefone/WhatsApp)',
  can_view_financials: 'Ver painel financeiro/assinaturas',
  can_manage_subscriptions: 'Gerenciar assinaturas',
};
