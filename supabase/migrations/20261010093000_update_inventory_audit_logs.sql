ALTER TABLE inventory_audit_logs DROP CONSTRAINT IF EXISTS inventory_audit_logs_action_type_check;
ALTER TABLE inventory_audit_logs ADD CONSTRAINT inventory_audit_logs_action_type_check CHECK (action_type IN ('STOCK_ADJUSTMENT', 'PRICE_CHANGE', 'DETAIL_UPDATE', 'MATERIAL_CREATE', 'RESTOCK'));

CREATE POLICY "Allow petugas_gudang to read inventory audit logs"
ON inventory_audit_logs FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'petugas_gudang'
    )
);

CREATE POLICY "Allow petugas_gudang to insert inventory audit logs"
ON inventory_audit_logs FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'petugas_gudang'
    )
);
