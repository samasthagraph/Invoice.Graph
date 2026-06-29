import { neon } from '@neondatabase/serverless';

const databaseUrl = process.env.DATABASE_URL;

export const sql = databaseUrl ? neon(databaseUrl) : null;

// Self-healing migrations that run once on serverless invocation
export async function runAutoMigrations() {
  if (!sql) return;
  try {
    // Enable UUID extension just in case
    await sql`CREATE EXTENSION IF NOT EXISTS "pgcrypto";`;
    
    // 1. Create clients table
    await sql`
      CREATE TABLE IF NOT EXISTS clients (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        company_name TEXT,
        email TEXT,
        phone TEXT,
        address TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
      );
    `;
    
    // 2. Create invoices table
    await sql`
      CREATE TABLE IF NOT EXISTS invoices (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        document_type TEXT NOT NULL,
        document_number TEXT NOT NULL UNIQUE,
        client_id UUID REFERENCES clients(id) ON DELETE RESTRICT NOT NULL,
        issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
        due_date DATE NOT NULL,
        status TEXT NOT NULL DEFAULT 'draft',
        subtotal NUMERIC(12,2) NOT NULL DEFAULT 0.00,
        tax_total NUMERIC(12,2) NOT NULL DEFAULT 0.00,
        discount_total NUMERIC(12,2) NOT NULL DEFAULT 0.00,
        grand_total NUMERIC(12,2) NOT NULL DEFAULT 0.00,
        advance_payment NUMERIC(12,2) NOT NULL DEFAULT 0.00,
        project_description TEXT,
        notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
      );
    `;
    
    // 3. Create invoice_items table
    await sql`
      CREATE TABLE IF NOT EXISTS invoice_items (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE NOT NULL,
        description TEXT NOT NULL,
        quantity NUMERIC(12,2) NOT NULL,
        unit_price NUMERIC(12,2) NOT NULL,
        tax_rate NUMERIC(12,2) NOT NULL DEFAULT 0.00,
        discount_rate NUMERIC(12,2) NOT NULL DEFAULT 0.00,
        total NUMERIC(12,2) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
      );
    `;
    
    // 4. Create company_settings table
    await sql`
      CREATE TABLE IF NOT EXISTS company_settings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        company_name TEXT NOT NULL,
        company_email TEXT,
        company_phone TEXT,
        company_address TEXT,
        tax_id TEXT,
        logo_url TEXT,
        bank_name TEXT,
        bank_account_no TEXT,
        bank_ifsc TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
      );
    `;

    // 5. Run column sync migrations for existing databases
    await sql`ALTER TABLE invoices ADD COLUMN IF NOT EXISTS project_description TEXT;`;
    await sql`ALTER TABLE invoices ADD COLUMN IF NOT EXISTS advance_payment NUMERIC(12,2) NOT NULL DEFAULT 0.00;`;
    
    console.log('Neon DB auto-migrations executed successfully.');
  } catch (err) {
    console.error('Neon DB migration failed:', err);
  }
}
