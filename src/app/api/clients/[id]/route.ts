import { NextResponse } from 'next/server';
import { sql } from '@/lib/neon';

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!sql) throw new Error('Database connection missing');
    const body = await req.json();
    
    const result = await sql`
      UPDATE clients 
      SET name = ${body.name},
          company_name = ${body.company_name},
          email = ${body.email},
          phone = ${body.phone},
          address = ${body.address}
      WHERE id = ${id}
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
