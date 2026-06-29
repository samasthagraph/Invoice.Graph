import { NextResponse } from 'next/server';
import { sql } from '@/lib/neon';

export async function GET() {
  try {
    if (!sql) throw new Error('Database connection missing');
    const data = await sql`
      SELECT description, unit_price, tax_rate, discount_rate 
      FROM invoice_items 
      ORDER BY description
    `;
    
    const unique = new Map<string, any>();
    data.forEach(item => {
      const desc = item.description?.trim();
      if (desc && !unique.has(desc)) {
        unique.set(desc, {
          description: desc,
          unit_price: Number(item.unit_price),
          tax_rate: Number(item.tax_rate),
          discount_rate: Number(item.discount_rate)
        });
      }
    });
    return NextResponse.json(Array.from(unique.values()));
  } catch (err: any) {
    console.error('API catalog GET error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
