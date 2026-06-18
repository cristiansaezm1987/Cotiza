import { createClient } from "@libsql/client";
import path from 'path';

let db = null;

export async function openDB() {
  if (db) {
    return db;
  }
  
  const url = process.env.TURSO_DATABASE_URL || `file:${path.resolve(process.cwd(), 'tenders.db')}`;
  const authToken = process.env.TURSO_AUTH_TOKEN || "";
  
  const client = createClient({
    url,
    authToken
  });

  // Monkey-patch to maintain exact compatibility with the old "sqlite" wrapper
  db = {
      client,
      async exec(sql) {
          await client.executeMultiple(sql);
      },
      async run(sql, params = []) {
          await client.execute({ sql, args: params });
      },
      async get(sql, params = []) {
          const res = await client.execute({ sql, args: params });
          return res.rows[0] || null;
      },
      async all(sql, params = []) {
          const res = await client.execute({ sql, args: params });
          return res.rows;
      }
  };

  await db.exec(`
    CREATE TABLE IF NOT EXISTS tenders (
      id TEXT PRIMARY KEY,
      name TEXT,
      status TEXT,
      statusName TEXT,
      date TEXT,
      price REAL,
      organization TEXT,
      region TEXT,
      closeDate TEXT,
      deliveryDays TEXT,
      callNumber INTEGER,
      lastUpdated TEXT
    );
  `);

  return db;
}
