import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { Client } from "npm:pg@8.11.3";
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

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) throw new Error('Invalid token');

    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'owner') {
      return new Response(JSON.stringify({ error: 'Forbidden. Owner only.' }), { status: 403, headers: corsHeaders });
    }

    // Process FormData
    const formData = await req.formData();
    const file = formData.get('file') as File;
    if (!file) throw new Error('No file uploaded');

    // Decompress gzip file stream in-memory
    const decompressedStream = file.stream().pipeThrough(new DecompressionStream('gzip'));
    
    // Read string from the decompressed stream
    const reader = decompressedStream.getReader();
    const chunks: Uint8Array[] = [];
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) chunks.push(value);
    }
    
    const totalLength = chunks.reduce((acc, val) => acc + val.length, 0);
    const combined = new Uint8Array(totalLength);
    let offset = 0;
    for (const chunk of chunks) {
      combined.set(chunk, offset);
      offset += chunk.length;
    }
    const sqlQuery = new TextDecoder().decode(combined);

    // Run SQL against Database
    const client = new Client({ connectionString: Deno.env.get('SUPABASE_DB_URL') });
    await client.connect();
    
    try {
      await client.query('BEGIN');
      await client.query("SET session_replication_role = 'replica'");
      
      if (sqlQuery.trim()) {
        await client.query(sqlQuery);
      }
      
      await client.query("SET session_replication_role = 'origin'");
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      await client.end();
    }

    return new Response(JSON.stringify({ message: 'Restore completed successfully' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
