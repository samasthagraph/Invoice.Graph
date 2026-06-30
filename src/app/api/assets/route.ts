import { NextResponse } from 'next/server';
import { sql, runAutoMigrations } from '@/lib/neon';

let migrated = false;
async function ensureDb() {
  if (!migrated) {
    await runAutoMigrations();
    migrated = true;
  }
}

export async function GET() {
  try {
    await ensureDb();
    if (!sql) throw new Error('Database connection missing');
    const assets = await sql`
      SELECT * FROM assets ORDER BY name ASC
    `;
    return NextResponse.json(assets);
  } catch (err: any) {
    console.error('API assets GET error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await ensureDb();
    if (!sql) throw new Error('Database connection missing');
    const body = await req.json();
    
    const result = await sql`
      INSERT INTO assets (name, description, serial_number, rental_rate, status)
      VALUES (${body.name}, ${body.description}, ${body.serial_number}, ${body.rental_rate}, ${body.status || 'available'})
      RETURNING *
    `;
    
    return NextResponse.json(result[0]);
  } catch (err: any) {
    console.error('API assets POST error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
