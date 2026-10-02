import { createClient } from '@supabase/supabase-js';
const supabase = createClient('https://ixlgwgbfnyvhqlaqxmgr.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml4bGd3Z2Jmbnl2aHFsYXF4bWdyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MDg0ODk1NywiZXhwIjoyMTA2NDI0OTU3fQ.p2eUM4u2fHH9RLv0B6kQlt51LzGfSRCMYHRDnd-wHns');
(async () => {
  const { data, error } = await supabase.auth.admin.getUserById('226e865f-ed28-44e8-9d15-250bb883f7d7');
  console.log('Admin:', data, error);
  
  const { data: d2, error: e2 } = await supabase.auth.admin.getUserById('8289a0a4-a70a-42d6-ac38-e5862745c24f'); // Kasir
  console.log('Kasir:', d2, e2);
})();
