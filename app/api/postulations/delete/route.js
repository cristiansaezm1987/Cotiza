import { NextResponse } from 'next/server';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';

async function openDb() {
  return open({
    filename: path.join(process.cwd(), 'database.sqlite'),
    driver: sqlite3.Database
  });
}

export async function POST(request) {
  try {
    const { id } = await request.json();
    if (!id) return NextResponse.json({ success: false, error: 'ID required' }, { status: 400 });

    const db = await openDb();
    await db.run('DELETE FROM postulations WHERE id = ?', [id]);
    await db.close();

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Error deleting postulation:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
