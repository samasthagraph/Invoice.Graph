-- Database schema for custom Invoice and Quotation Generator

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. CLIENTS TABLE
CREATE TABLE IF NOT EXISTS clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    company_name TEXT,
    email TEXT,
    phone TEXT,
    address TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Index for client searches
CREATE INDEX IF NOT EXISTS idx_clients_name ON clients(name);
CREATE INDEX IF NOT EXISTS idx_clients_company ON clients(company_name);

-- 2. INVOICES TABLE
CREATE TABLE IF NOT EXISTS invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_type TEXT NOT NULL CHECK (document_type IN ('invoice', 'quotation')),
    document_number TEXT NOT NULL UNIQUE,
    client_id UUID REFERENCES clients(id) ON DELETE RESTRICT NOT NULL,
    issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date DATE NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'paid', 'unpaid', 'expired', 'accepted', 'rejected')),
    subtotal NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    tax_total NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    discount_total NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    grand_total NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    advance_payment NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    project_description TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Index for filtering and searching invoices
CREATE INDEX IF NOT EXISTS idx_invoices_client ON invoices(client_id);
CREATE INDEX IF NOT EXISTS idx_invoices_type_status ON invoices(document_type, status);
CREATE INDEX IF NOT EXISTS idx_invoices_issue_date ON invoices(issue_date);

-- 3. INVOICE ITEMS TABLE
CREATE TABLE IF NOT EXISTS invoice_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE NOT NULL,
    description TEXT NOT NULL,
    quantity NUMERIC(10,2) NOT NULL DEFAULT 1.00,
    unit_price NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    tax_rate NUMERIC(5,2) NOT NULL DEFAULT 0.00, -- tax percentage (e.g. 18.00 for 18% GST)
    discount_rate NUMERIC(5,2) NOT NULL DEFAULT 0.00, -- discount percentage (e.g. 10.00 for 10% off)
    total NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Index for invoice items query
CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice ON invoice_items(invoice_id);

-- 4. COMPANY SETTINGS TABLE (For managing pre-filled personal company details)
CREATE TABLE IF NOT EXISTS company_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_name TEXT NOT NULL DEFAULT 'My Company',
    company_email TEXT,
    company_phone TEXT,
    company_address TEXT,
    tax_id TEXT, -- e.g., GSTIN / VAT
    logo_url TEXT,
    bank_name TEXT,
    bank_account_no TEXT,
    bank_ifsc TEXT, -- or IBAN / BIC
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Insert a default row for company settings that can be updated later
INSERT INTO company_settings (id, company_name, company_email, company_phone, company_address, tax_id, bank_name, bank_account_no, bank_ifsc)
VALUES (
    '00000000-0000-0000-0000-000000000001'::uuid,
    'Acme Innovations',
    'billing@acme.com',
    '+1 (555) 019-2834',
    '123 Business Rd, Suite 100, Tech City, TC 10101',
    'GSTIN1234567890',
    'Standard Chartered Bank',
    '987654321098',
    'SCBL0000123'
)
ON CONFLICT (id) DO NOTHING;

-- 5. ASSETS TABLE
CREATE TABLE IF NOT EXISTS assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    serial_number TEXT,
    rental_rate NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'rented', 'maintenance')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Index for asset search
CREATE INDEX IF NOT EXISTS idx_assets_name ON assets(name);

-- 6. RENTAL RECORDS TABLE
CREATE TABLE IF NOT EXISTS rental_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    asset_id UUID REFERENCES assets(id) ON DELETE CASCADE NOT NULL,
    client_id UUID REFERENCES clients(id) ON DELETE RESTRICT NOT NULL,
    checkout_date DATE NOT NULL,
    expected_return_date DATE,
    actual_return_date DATE,
    rental_rate_at_checkout NUMERIC(12,2) NOT NULL,
    status TEXT NOT NULL DEFAULT 'rented' CHECK (status IN ('rented', 'returned', 'overdue')),
    notes TEXT,
    invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Indexes for rentals
CREATE INDEX IF NOT EXISTS idx_rentals_asset ON rental_records(asset_id);
CREATE INDEX IF NOT EXISTS idx_rentals_client ON rental_records(client_id);
CREATE INDEX IF NOT EXISTS idx_rentals_status ON rental_records(status);
CREATE INDEX IF NOT EXISTS idx_rentals_invoice ON rental_records(invoice_id);
