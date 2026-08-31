import { NextResponse } from 'next/server';
import { sql } from '@/lib/neon';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!sql) throw new Error('Database connection missing');
    
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    const rows = isUuid 
      ? await sql`SELECT * FROM clients WHERE id = ${id} OR slug = ${id}`
      : await sql`SELECT * FROM clients WHERE slug = ${id}`;
    
    if (rows.length === 0) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }
    
    return NextResponse.json(rows[0]);
  } catch (err: any) {
    console.error('API client GET error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!sql) throw new Error('Database connection missing');
    const body = await req.json();
    const slug = body.slug ? body.slug.toLowerCase().trim().replace(/[^a-z0-9_-]/g, '-') : null;

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    const result = isUuid
      ? await sql`
          UPDATE clients 
          SET name = ${body.name},
              slug = ${slug},
              company_name = ${body.company_name || null},
              email = ${body.email || null},
              phone = ${body.phone || null},
              address = ${body.address || null}
          WHERE id = ${id}
          RETURNING *
        `
      : await sql`
          UPDATE clients 
          SET name = ${body.name},
              slug = ${slug},
              company_name = ${body.company_name || null},
              email = ${body.email || null},
              phone = ${body.phone || null},
              address = ${body.address || null}
          WHERE slug = ${id}
          RETURNING *
        `;
    
    if (result.length === 0) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }
    
    return NextResponse.json(result[0]);
  } catch (err: any) {
    console.error('API clients PUT error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!sql) throw new Error('Database connection missing');
    
    await sql`
      DELETE FROM clients WHERE id = ${id}
    `;
    
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('API clients DELETE error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
