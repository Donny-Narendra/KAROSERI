import express from 'express';
import cors from 'cors';
import { createGzip, createGunzip } from 'zlib';
import { Client } from 'pg';
import multer from 'multer';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const app = express();
app.use(cors());

const upload = multer({ storage: multer.memoryStorage() }); // In-memory storage for zero residue

// Dummy auth validation for owner
const authenticateOwner = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  // In a real scenario, we verify JWT and check role == 'owner'
  // For the sake of this mock/demo, we assume valid
  next();
};

app.get('/api/backup', authenticateOwner, async (req, res) => {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  
  try {
    await client.connect();
    
    // Set headers for file download
    res.setHeader('Content-Type', 'application/gzip');
    res.setHeader('Content-Disposition', `attachment; filename="karoseriops-backup-${new Date().toISOString().replace(/[:.]/g, '-')}.sql.gz"`);
    
    const gzip = createGzip();
    gzip.pipe(res);
    
    // Fetch all tables
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
        
        gzip.write(`INSERT INTO "${table}" (${columns}) VALUES (${values});\n`);
      }
    }
    
    gzip.end();
  } catch (error) {
    console.error('Backup error:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Internal server error during backup' });
    }
  } finally {
    await client.end();
  }
});

app.post('/api/restore', authenticateOwner, upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  const client = new Client({ connectionString: process.env.DATABASE_URL });

  try {
    await client.connect();
    
    // Unzip the buffer in-memory
    const gunzip = createGunzip();
    const sqlChunks: Buffer[] = [];
    
    gunzip.on('data', chunk => sqlChunks.push(chunk));
    gunzip.on('end', async () => {
      const sqlQuery = Buffer.concat(sqlChunks).toString('utf8');
      
      try {
        await client.query('BEGIN');
        await client.query("SET session_replication_role = 'replica'");
        
        // Execute the entire SQL script
        if (sqlQuery.trim()) {
           await client.query(sqlQuery);
        }
        
        await client.query("SET session_replication_role = 'origin'");
        await client.query('COMMIT');
        
        res.status(200).json({ message: 'Restore completed successfully' });
      } catch (err) {
        await client.query('ROLLBACK');
        console.error('Restore SQL error:', err);
        res.status(500).json({ error: 'Restore failed during SQL execution' });
      } finally {
        await client.end();
      }
    });

    gunzip.on('error', err => {
      console.error('Gunzip error:', err);
      res.status(500).json({ error: 'Failed to decompress file' });
    });

    // Write the buffer to the gunzip stream
    gunzip.end(req.file.buffer);
    
  } catch (error) {
    console.error('Restore connection error:', error);
    res.status(500).json({ error: 'Internal server error during restore' });
    await client.end();
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Backup/Restore server running on port ${PORT}`);
});
