import { supabase } from '@/lib/supabase';

interface LogActionParams {
  action: string;
  targetType: string;
  targetId?: string;
  targetName?: string;
  details?: string;
}

export async function logAdminAction({ action, targetType, targetId, targetName, details }: LogActionParams) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from('admin_activity_log').insert({
    admin_user_id: user.id,
    action,
    target_type: targetType,
    target_id: targetId || null,
    target_name: targetName || null,
    details: details || null,
  } as any);
}
