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
    
    const rentals = await sql`
      SELECT 
        r.*,
        json_build_object(
          'id', a.id,
          'name', a.name,
          'description', a.description,
          'serial_number', a.serial_number,
          'rental_rate', a.rental_rate,
          'status', a.status
        ) as asset,
        json_build_object(
          'id', c.id,
          'name', c.name,
          'company_name', c.company_name,
          'email', c.email,
          'phone', c.phone,
          'address', c.address
        ) as client,
        (
          SELECT json_build_object(
            'id', inv.id,
            'document_number', inv.document_number,
            'status', inv.status,
            'grand_total', inv.grand_total
          )
          FROM invoices inv
          WHERE inv.id = r.invoice_id
        ) as invoice
      FROM rental_records r
      JOIN assets a ON r.asset_id = a.id
      JOIN clients c ON r.client_id = c.id
      ORDER BY r.created_at DESC
    `;
    
    return NextResponse.json(rentals);
  } catch (err: any) {
    console.error('API rentals GET error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await ensureDb();
    if (!sql) throw new Error('Database connection missing');
    const body = await req.json();
    
    // 1. Insert rental record
    const result = await sql`
      INSERT INTO rental_records (asset_id, client_id, checkout_date, expected_return_date, rental_rate_at_checkout, status, notes)
      VALUES (${body.asset_id}, ${body.client_id}, ${body.checkout_date}, ${body.expected_return_date}, ${body.rental_rate_at_checkout}, 'rented', ${body.notes})
      RETURNING *
    `;
    
    // 2. Update asset status to rented
    await sql`
      UPDATE assets 
      SET status = 'rented' 
      WHERE id = ${body.asset_id}
    `;
    
    return NextResponse.json(result[0]);
  } catch (err: any) {
    console.error('API rentals POST error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
