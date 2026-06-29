import { NextResponse } from 'next/server';
import { sql } from '@/lib/neon';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!sql) throw new Error('Database connection missing');
    
    // 1. Fetch invoice joined with client info
    const invRows = await sql`
      SELECT 
        i.*,
        c.name as client_name,
        c.company_name as client_company_name,
        c.email as client_email,
        c.phone as client_phone,
        c.address as client_address
      FROM invoices i
      LEFT JOIN clients c ON i.client_id = c.id
      WHERE i.id = ${id}
    `;
    
    if (invRows.length === 0) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }
    
    const row = invRows[0];
    
    // 2. Fetch invoice items
    const itemRows = await sql`
      SELECT * FROM invoice_items WHERE invoice_id = ${id}
    `;
    
    const formattedItems = itemRows.map(item => ({
      id: item.id,
      invoice_id: item.invoice_id,
      description: item.description,
      quantity: Number(item.quantity),
      unit_price: Number(item.unit_price),
      tax_rate: Number(item.tax_rate),
      discount_rate: Number(item.discount_rate),
      total: Number(item.total)
    }));
    
    const invoice = {
      id: row.id,
      document_type: row.document_type,
      document_number: row.document_number,
      client_id: row.client_id,
      issue_date: row.issue_date,
      due_date: row.due_date,
      status: row.status,
      subtotal: Number(row.subtotal),
      tax_total: Number(row.tax_total),
      discount_total: Number(row.discount_total),
      grand_total: Number(row.grand_total),
      advance_payment: Number(row.advance_payment || 0),
      project_description: row.project_description,
      notes: row.notes,
      created_at: row.created_at,
      items: formattedItems,
      client: {
        id: row.client_id,
        name: row.client_name,
        company_name: row.client_company_name,
        email: row.client_email,
        phone: row.client_phone,
        address: row.client_address
      }
    };
    
    return NextResponse.json(invoice);
  } catch (err: any) {
    console.error('API document GET error:', err);
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
    
    // 1. Update Invoice Details
    const invResult = await sql`
      UPDATE invoices
      SET 
        document_type = ${body.document_type},
        document_number = ${body.document_number},
        client_id = ${body.client_id},
        issue_date = ${body.issue_date},
        due_date = ${body.due_date},
        status = ${body.status},
        subtotal = ${body.subtotal},
        tax_total = ${body.tax_total},
        discount_total = ${body.discount_total},
        grand_total = ${body.grand_total},
        advance_payment = ${Number(body.advance_payment || 0)},
        project_description = ${body.project_description},
        notes = ${body.notes}
      WHERE id = ${id}
      RETURNING *
    `;
    
    if (invResult.length === 0) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }
    
    const updatedInvoice = invResult[0];
    
    // 2. Delete Existing Items
    await sql`
      DELETE FROM invoice_items WHERE invoice_id = ${id}
    `;
    
    // 3. Insert New Items
    const insertedItems = [];
    if (body.items && Array.isArray(body.items)) {
      for (const item of body.items) {
        const itemResult = await sql`
          INSERT INTO invoice_items (
            invoice_id, 
            description, 
            quantity, 
            unit_price, 
            tax_rate, 
            discount_rate, 
            total
          )
          VALUES (
            ${id}, 
            ${item.description}, 
            ${Number(item.quantity)}, 
            ${Number(item.unit_price)}, 
            ${Number(item.tax_rate)}, 
            ${Number(item.discount_rate)}, 
            ${Number(item.total)}
          )
          RETURNING *
        `;
        insertedItems.push({
          ...itemResult[0],
          quantity: Number(itemResult[0].quantity),
          unit_price: Number(itemResult[0].unit_price),
          tax_rate: Number(itemResult[0].tax_rate),
          discount_rate: Number(itemResult[0].discount_rate),
          total: Number(itemResult[0].total)
        });
      }
    }
    
    return NextResponse.json({
      ...updatedInvoice,
      subtotal: Number(updatedInvoice.subtotal),
      tax_total: Number(updatedInvoice.tax_total),
      discount_total: Number(updatedInvoice.discount_total),
      grand_total: Number(updatedInvoice.grand_total),
      advance_payment: Number(updatedInvoice.advance_payment || 0),
      items: insertedItems
    });
  } catch (err: any) {
    console.error('API document PUT error:', err);
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
      DELETE FROM invoices WHERE id = ${id}
    `;
    
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('API document DELETE error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!sql) throw new Error('Database connection missing');
    const body = await req.json();
    
    if (body.status) {
      await sql`
        UPDATE invoices SET status = ${body.status} WHERE id = ${id}
      `;
    }
    
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('API document PATCH error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
