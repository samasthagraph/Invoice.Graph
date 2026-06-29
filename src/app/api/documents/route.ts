import { NextResponse } from 'next/server';
import { sql } from '@/lib/neon';

export async function GET() {
  try {
    if (!sql) throw new Error('Database connection missing');
    
    // Select invoices joined with clients info
    const rows = await sql`
      SELECT 
        i.*,
        c.name as client_name,
        c.company_name as client_company_name,
        c.email as client_email,
        c.phone as client_phone,
        c.address as client_address
      FROM invoices i
      LEFT JOIN clients c ON i.client_id = c.id
      ORDER BY i.created_at DESC
    `;
    
    // Format to match client-side Invoice interface
    const invoices = rows.map(row => ({
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
      project_description: row.project_description,
      notes: row.notes,
      created_at: row.created_at,
      client: {
        id: row.client_id,
        name: row.client_name,
        company_name: row.client_company_name,
        email: row.client_email,
        phone: row.client_phone,
        address: row.client_address
      }
    }));
    
    return NextResponse.json(invoices);
  } catch (err: any) {
    console.error('API documents GET error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    if (!sql) throw new Error('Database connection missing');
    const body = await req.json();
    
    // 1. Insert Invoice Header
    const invResult = await sql`
      INSERT INTO invoices (
        document_type, 
        document_number, 
        client_id, 
        issue_date, 
        due_date, 
        status, 
        subtotal, 
        tax_total, 
        discount_total, 
        grand_total, 
        project_description, 
        notes
      )
      VALUES (
        ${body.document_type}, 
        ${body.document_number}, 
        ${body.client_id}, 
        ${body.issue_date}, 
        ${body.due_date}, 
        ${body.status}, 
        ${body.subtotal}, 
        ${body.tax_total}, 
        ${body.discount_total}, 
        ${body.grand_total}, 
        ${body.project_description}, 
        ${body.notes}
      )
      RETURNING *
    `;
    
    const newInvoice = invResult[0];
    
    // 2. Insert Invoice Items
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
            ${newInvoice.id}, 
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
      ...newInvoice,
      subtotal: Number(newInvoice.subtotal),
      tax_total: Number(newInvoice.tax_total),
      discount_total: Number(newInvoice.discount_total),
      grand_total: Number(newInvoice.grand_total),
      items: insertedItems
    });
  } catch (err: any) {
    console.error('API documents POST error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
