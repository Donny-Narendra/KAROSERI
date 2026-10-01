CREATE TABLE qc_inspections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  spk_id UUID NOT NULL REFERENCES spk(id),
  form_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL CHECK (status IN ('PENDING', 'PASS', 'FAIL')) DEFAULT 'PENDING',
  inspected_by UUID REFERENCES auth.users(id),
  inspected_at TIMESTAMPTZ
);

CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  spk_id UUID NOT NULL REFERENCES spk(id),
  dp_amount NUMERIC NOT NULL DEFAULT 0,
  actual_material_cost NUMERIC NOT NULL DEFAULT 0,
  actual_labor_cost NUMERIC NOT NULL DEFAULT 0,
  total_amount NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL CHECK (status IN ('DRAFT', 'UNPAID', 'LUNAS')) DEFAULT 'DRAFT',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS for qc_inspections
ALTER TABLE qc_inspections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Mandor and Owner full access on qc_inspections"
  ON qc_inspections
  FOR ALL
  TO authenticated
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') IN ('mandor', 'owner')
  )
  WITH CHECK (
    (auth.jwt() -> 'user_metadata' ->> 'role') IN ('mandor', 'owner')
  );

CREATE POLICY "Kasir select access on qc_inspections"
  ON qc_inspections
  FOR SELECT
  TO authenticated
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'kasir'
  );

-- RLS for invoices
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Kasir and Owner full access on invoices"
  ON invoices
  FOR ALL
  TO authenticated
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') IN ('kasir', 'owner')
  )
  WITH CHECK (
    (auth.jwt() -> 'user_metadata' ->> 'role') IN ('kasir', 'owner')
  );
