import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import pg from "npm:pg@8.11.3";
const { Client } = pg;
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });
    }

    // Verify token and role
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );
    const token = authHeader.replace('Bearer ', '').trim();
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    if (!user || authError) throw new Error(`Invalid token: ${authError?.message || 'unknown'}`);

    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'owner') {
      return new Response(JSON.stringify({ error: 'Forbidden. Owner only.' }), { status: 403, headers: corsHeaders });
    }

    // Gunakan SUPABASE_DB_URL otomatis dari environment
    const client = new Client({ connectionString: Deno.env.get('SUPABASE_DB_URL') });
    await client.connect();

    let controller: ReadableStreamDefaultController;
    const body = new ReadableStream({
      start(c) {
        controller = c;
      }
    });

    const compressedStream = body.pipeThrough(new CompressionStream('gzip'));

    (async () => {
      try {
        const encoder = new TextEncoder();
        const tablesRes = await client.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'");
        const tables = tablesRes.rows.map(r => r.table_name);
        
        for (const table of tables) {
          const { rows } = await client.query(`SELECT * FROM "${table}"`);
          if (rows.length === 0) continue;
          
          const columns = Object.keys(rows[0]).map(c => `"${c}"`).join(', ');
          
          for (const row of rows) {
            const values = Object.values(row).map(val => {
              if (val === null) return 'NULL';
              if (typeof val === 'string') return `'${val.replace(/'/g, "''")}'`;
              if (typeof val === 'object') return `'${JSON.stringify(val).replace(/'/g, "''")}'`;
              return val;
            }).join(', ');
            
            controller.enqueue(encoder.encode(`INSERT INTO "${table}" (${columns}) VALUES (${values});\n`));
          }
        }
      } catch (err) {
        console.error('SQL Backup Error:', err);
      } finally {
        controller.close();
        await client.end();
      }
    })();

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    return new Response(compressedStream, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/gzip',
        'Content-Disposition': `attachment; filename="karoseriops-backup-${timestamp}.sql.gz"`,
      },
    });

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
