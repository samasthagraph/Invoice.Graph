export type DocumentType = 'invoice' | 'quotation';

export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'unpaid' | 'expired' | 'accepted' | 'rejected';

export interface Client {
  id: string;
  name: string;
  company_name?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  created_at?: string;
}

export interface InvoiceItem {
  id: string;
  invoice_id?: string;
  description: string;
  quantity: number;
  unit_price: number;
  tax_rate: number; // percentage, e.g. 18 for 18% GST
  discount_rate: number; // percentage, e.g. 10 for 10% discount
  total: number;
}

export interface Invoice {
  id: string;
  document_type: DocumentType;
  document_number: string;
  client_id: string;
  client?: Client;
  issue_date: string;
  due_date: string;
  status: InvoiceStatus;
  subtotal: number;
  tax_total: number;
  discount_total: number;
  grand_total: number;
  advance_payment?: number;
  project_description?: string | null;
  notes?: string | null;
  created_at?: string;
  items?: InvoiceItem[];
}

export interface CompanySettings {
  id: string;
  company_name: string;
  company_email?: string | null;
  company_phone?: string | null;
  company_address?: string | null;
  tax_id?: string | null; // e.g. GSTIN / VAT
  logo_url?: string | null;
  bank_name?: string | null;
  bank_account_no?: string | null;
  bank_ifsc?: string | null; // or IBAN / Routing Code
}

export type AssetStatus = 'available' | 'rented' | 'maintenance';
export type RentalStatus = 'rented' | 'returned' | 'overdue';

export interface Asset {
  id: string;
  name: string;
  description?: string | null;
  serial_number?: string | null;
  rental_rate: number;
  status: AssetStatus;
  created_at?: string;
}

export interface RentalRecord {
  id: string;
  asset_id: string;
  asset?: Asset;
  client_id: string;
  client?: Client;
  checkout_date: string;
  expected_return_date?: string | null;
  actual_return_date?: string | null;
  rental_rate_at_checkout: number;
  status: RentalStatus;
  notes?: string | null;
  invoice_id?: string | null;
  invoice?: Invoice | null;
  created_at?: string;
}
