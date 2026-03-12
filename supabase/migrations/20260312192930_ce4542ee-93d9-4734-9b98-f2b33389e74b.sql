
-- Create private bucket for backups
INSERT INTO storage.buckets (id, name, public)
VALUES ('backups', 'backups', false)
ON CONFLICT (id) DO NOTHING;

-- RLS for backups bucket - only dev can access
CREATE POLICY "Dev can view backups"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'backups' AND has_role(auth.uid(), 'dev'::app_role));

CREATE POLICY "Dev can insert backups"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'backups' AND has_role(auth.uid(), 'dev'::app_role));

CREATE POLICY "Dev can delete backups"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'backups' AND has_role(auth.uid(), 'dev'::app_role));
