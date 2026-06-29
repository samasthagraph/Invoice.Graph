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
    const clients = await sql`
      SELECT * FROM clients ORDER BY name ASC
    `;
    return NextResponse.json(clients);
  } catch (err: any) {
    console.error('API clients GET error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await ensureDb();
    if (!sql) throw new Error('Database connection missing');
    const body = await req.json();
    
    const result = await sql`
      INSERT INTO clients (name, company_name, email, phone, address)
      VALUES (${body.name}, ${body.company_name}, ${body.email}, ${body.phone}, ${body.address})
      RETURNING *
    `;
    
    return NextResponse.json(result[0]);
  } catch (err: any) {
    console.error('API clients POST error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
