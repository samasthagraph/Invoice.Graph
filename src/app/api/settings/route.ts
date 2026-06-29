import { NextResponse } from 'next/server';
import { sql } from '@/lib/neon';

export async function GET() {
  try {
    if (!sql) throw new Error('Database connection missing');
    
    const rows = await sql`
      SELECT * FROM company_settings LIMIT 1
    `;
    
    if (rows.length === 0) {
      return NextResponse.json(null);
    }
    
    return NextResponse.json(rows[0]);
  } catch (err: any) {
    console.error('API settings GET error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    if (!sql) throw new Error('Database connection missing');
    const body = await req.json();
    
    const rows = await sql`
      SELECT id FROM company_settings LIMIT 1
    `;
    
    let result;
    if (rows.length > 0) {
      // Update existing settings record
      result = await sql`
        UPDATE company_settings
        SET 
          company_name = ${body.company_name},
          company_email = ${body.company_email},
          company_phone = ${body.company_phone},
          company_address = ${body.company_address},
          tax_id = ${body.tax_id},
          logo_url = ${body.logo_url},
          bank_name = ${body.bank_name},
          bank_account_no = ${body.bank_account_no},
          bank_ifsc = ${body.bank_ifsc}
        WHERE id = ${rows[0].id}
        RETURNING *
      `;
    } else {
      // Create new settings record
      result = await sql`
        INSERT INTO company_settings (
          company_name, 
          company_email, 
          company_phone, 
          company_address, 
          tax_id, 
          logo_url, 
          bank_name, 
          bank_account_no, 
          bank_ifsc
        )
        VALUES (
          ${body.company_name}, 
          ${body.company_email}, 
          ${body.company_phone}, 
          ${body.company_address}, 
          ${body.tax_id}, 
          ${body.logo_url}, 
          ${body.bank_name}, 
          ${body.bank_account_no}, 
          ${body.bank_ifsc}
        )
        RETURNING *
      `;
    }
    
    return NextResponse.json(result[0]);
  } catch (err: any) {
    console.error('API settings POST error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
