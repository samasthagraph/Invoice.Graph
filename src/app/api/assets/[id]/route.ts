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

    // 1. Fetch the existing asset record to allow partial updates
    const existing = await sql`
      SELECT * FROM assets WHERE id = ${id}
    `;
    if (existing.length === 0) {
      return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
    }

    // 2. Merge existing data with updates
    const name = body.name !== undefined ? body.name : existing[0].name;
    const description = body.description !== undefined ? body.description : existing[0].description;
    const serial_number = body.serial_number !== undefined ? body.serial_number : existing[0].serial_number;
    const rental_rate = body.rental_rate !== undefined ? body.rental_rate : existing[0].rental_rate;
    const status = body.status !== undefined ? body.status : existing[0].status;

    // 3. Update the record
    const result = await sql`
      UPDATE assets 
      SET name = ${name},
          description = ${description},
          serial_number = ${serial_number},
          rental_rate = ${rental_rate},
          status = ${status}
      WHERE id = ${id}
      RETURNING *
    `;
    
    return NextResponse.json(result[0]);
  } catch (err: any) {
    console.error('API assets PUT error:', err);
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
      DELETE FROM assets WHERE id = ${id}
    `;
    
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('API assets DELETE error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
