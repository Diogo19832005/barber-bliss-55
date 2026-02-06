
-- Create admin activity log table
CREATE TABLE public.admin_activity_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT,
  target_name TEXT,
  details TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.admin_activity_log ENABLE ROW LEVEL SECURITY;

-- Only chief admins can view all logs
CREATE POLICY "Chief admins can view all activity logs"
ON public.admin_activity_log
FOR SELECT
USING (public.is_chief_admin());

-- All admins can insert their own logs
CREATE POLICY "Admins can insert own activity logs"
ON public.admin_activity_log
FOR INSERT
WITH CHECK (public.is_admin() AND auth.uid() = admin_user_id);

-- Index for fast queries
CREATE INDEX idx_admin_activity_log_created_at ON public.admin_activity_log(created_at DESC);
CREATE INDEX idx_admin_activity_log_admin_user_id ON public.admin_activity_log(admin_user_id);
