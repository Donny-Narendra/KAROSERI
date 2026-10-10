CREATE TABLE IF NOT EXISTS inventory_audit_logs (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    material_id uuid REFERENCES materials(id) ON DELETE CASCADE,
    action_type text NOT NULL CHECK (action_type IN ('STOCK_ADJUSTMENT', 'PRICE_CHANGE', 'DETAIL_UPDATE', 'MATERIAL_CREATE')),
    previous_data jsonb,
    new_data jsonb,
    notes text,
    changed_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
    created_at timestamptz DEFAULT now()
);

ALTER TABLE inventory_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow service_advisor and owner to read inventory audit logs"
ON inventory_audit_logs FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role IN ('service_advisor', 'owner')
    )
);

CREATE POLICY "Allow service_advisor and owner to insert inventory audit logs"
ON inventory_audit_logs FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role IN ('service_advisor', 'owner')
    )
);
