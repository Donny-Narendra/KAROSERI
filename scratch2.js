import { createClient } from '@supabase/supabase-js';
const supabase = createClient('https://ixlgwgbfnyvhqlaqxmgr.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml4bGd3Z2Jmbnl2aHFsYXF4bWdyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MDg0ODk1NywiZXhwIjoyMTA2NDI0OTU3fQ.p2eUM4u2fHH9RLv0B6kQlt51LzGfSRCMYHRDnd-wHns'); // service role key
(async () => {
  const { data: users, error } = await supabase.auth.admin.listUsers();
  if (error) console.error(error);
  
  users.users.forEach(u => {
    console.log(u.email, u.user_metadata);
  });
})();
