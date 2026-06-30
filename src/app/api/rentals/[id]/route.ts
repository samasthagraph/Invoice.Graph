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
    
    // 1. Fetch the existing rental record to get data before updating
    const existing = await sql`
      SELECT * FROM rental_records WHERE id = ${id}
    `;
    if (existing.length === 0) {
      return NextResponse.json({ error: 'Rental record not found' }, { status: 404 });
    }
    const record = existing[0];
    const { asset_id, status: oldStatus } = record;

    // 2. Merge existing data with updates
    const checkout_date = body.checkout_date !== undefined ? body.checkout_date : record.checkout_date;
    const expected_return_date = body.expected_return_date !== undefined ? body.expected_return_date : record.expected_return_date;
    const actual_return_date = body.actual_return_date !== undefined ? body.actual_return_date : record.actual_return_date;
    const rental_rate_at_checkout = body.rental_rate_at_checkout !== undefined ? body.rental_rate_at_checkout : record.rental_rate_at_checkout;
    const status = body.status !== undefined ? body.status : record.status;
    const notes = body.notes !== undefined ? body.notes : record.notes;
    const invoice_id = body.invoice_id !== undefined ? body.invoice_id : record.invoice_id;

    // 3. Update the record
    const result = await sql`
      UPDATE rental_records 
      SET checkout_date = ${checkout_date},
          expected_return_date = ${expected_return_date},
          actual_return_date = ${actual_return_date},
          rental_rate_at_checkout = ${rental_rate_at_checkout},
          status = ${status},
          notes = ${notes},
          invoice_id = ${invoice_id}
      WHERE id = ${id}
      RETURNING *
    `;
    
    // 4. If checking in (actual_return_date provided and status changed to returned), set asset to available
    if (body.actual_return_date && body.status === 'returned' && oldStatus !== 'returned') {
      await sql`
        UPDATE assets 
        SET status = 'available' 
        WHERE id = ${asset_id}
      `;
    }

    return NextResponse.json(result[0]);
  } catch (err: any) {
    console.error('API rentals PUT error:', err);
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
    
    // Fetch rental to know if we should free the asset
    const existing = await sql`
      SELECT asset_id, status FROM rental_records WHERE id = ${id}
    `;
    
    if (existing.length > 0) {
      const { asset_id, status } = existing[0];
      
      // Delete record
      await sql`
        DELETE FROM rental_records WHERE id = ${id}
      `;
      
      // If was rented, free the asset
      if (status === 'rented') {
        await sql`
          UPDATE assets 
          SET status = 'available' 
          WHERE id = ${asset_id}
        `;
      }
    }
    
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('API rentals DELETE error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
