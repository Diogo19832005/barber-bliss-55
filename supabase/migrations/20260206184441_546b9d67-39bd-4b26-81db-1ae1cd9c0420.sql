
-- Create admin_permissions table for granular collaborator permissions
CREATE TABLE public.admin_permissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  can_approve_barbers BOOLEAN NOT NULL DEFAULT false,
  can_suspend_barbers BOOLEAN NOT NULL DEFAULT false,
  can_view_emails BOOLEAN NOT NULL DEFAULT false,
  can_view_contacts BOOLEAN NOT NULL DEFAULT false,
  can_view_financials BOOLEAN NOT NULL DEFAULT false,
  can_manage_subscriptions BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.admin_permissions ENABLE ROW LEVEL SECURITY;

-- Only chief admins can manage permissions
CREATE POLICY "Chief admins can manage all permissions"
ON public.admin_permissions
FOR ALL
USING (public.is_chief_admin())
WITH CHECK (public.is_chief_admin());

-- Admins can view their own permissions
CREATE POLICY "Admins can view own permissions"
ON public.admin_permissions
FOR SELECT
USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_admin_permissions_updated_at
BEFORE UPDATE ON public.admin_permissions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
