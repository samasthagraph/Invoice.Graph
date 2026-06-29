import { supabase, isSupabaseConfigured } from './supabase';
import { Client, Invoice, InvoiceItem, CompanySettings, InvoiceStatus } from '@/types';

const usePostgres = typeof window !== 'undefined' && process.env.NEXT_PUBLIC_USE_POSTGRES === 'true';

async function fetchAPI(url: string, options?: RequestInit) {
  const res = await fetch(url, options);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `HTTP error! status: ${res.status}`);
  }
  return res.json();
}

// ==========================================
// MOCK DATA SEEDING (FOR LOCAL STORAGE FALLBACK)
// ==========================================

const DEFAULT_SETTINGS: CompanySettings = {
  id: '00000000-0000-0000-0000-000000000001',
  company_name: 'Acme Innovations',
  company_email: 'billing@acme.com',
  company_phone: '+1 (555) 019-2834',
  company_address: '123 Business Rd, Suite 100, Tech City, TC 10101',
  tax_id: 'GSTIN1234567890',
  bank_name: 'Standard Chartered Bank',
  bank_account_no: '987654321098',
  bank_ifsc: 'SCBL0000123'
};

const DEFAULT_CLIENTS: Client[] = [
  {
    id: 'c1',
    name: 'Sarah Connor',
    company_name: 'Cyberdyne Systems',
    email: 'sconnor@cyberdyne.com',
    phone: '+1 (555) 901-2345',
    address: '4242 Skynet Way, Sunnyvale, CA 94089',
    created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'c2',
    name: 'Tony Stark',
    company_name: 'Stark Industries',
    email: 'tony@stark.com',
    phone: '+1 (555) 300-3000',
    address: '10880 Malibu Point, Malibu, CA 90265',
    created_at: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'c3',
    name: 'Bruce Wayne',
    company_name: 'Wayne Enterprises',
    email: 'bruce@wayne.com',
    phone: '+1 (555) 777-8888',
    address: '1007 Mountain Drive, Gotham City, NJ 07001',
    created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
  }
];

const DEFAULT_INVOICES: Invoice[] = [
  {
    id: 'inv-1',
    document_type: 'invoice',
    document_number: 'INV-2026-0001',
    client_id: 'c2',
    issue_date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    due_date: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    status: 'paid',
    subtotal: 15000.00,
    tax_total: 2700.00,
    discount_total: 500.00,
    grand_total: 17200.00,
    notes: 'Payment received with thanks. AR Arc Reactor repairs.',
    created_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    items: [
      { id: 'item-1', invoice_id: 'inv-1', description: 'Arc Reactor Core Calibration Service', quantity: 1, unit_price: 10000.00, tax_rate: 18, discount_rate: 5, total: 11210.00 },
      { id: 'item-2', invoice_id: 'inv-1', description: 'Vibranium-Alloy Shield Polish & Buffing', quantity: 1, unit_price: 5000.00, tax_rate: 18, discount_rate: 0, total: 5900.00 }
    ]
  },
  {
    id: 'inv-2',
    document_type: 'invoice',
    document_number: 'INV-2026-0002',
    client_id: 'c1',
    issue_date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    due_date: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    status: 'unpaid',
    subtotal: 8500.00,
    tax_total: 1530.00,
    discount_total: 0.00,
    grand_total: 10030.00,
    notes: 'Net 15 terms apply. Consulting on Neural Net processors.',
    created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    items: [
      { id: 'item-3', invoice_id: 'inv-2', description: 'Advanced AI Threat Modeling Consulting', quantity: 10, unit_price: 850.00, tax_rate: 18, discount_rate: 0, total: 10030.00 }
    ]
  },
  {
    id: 'q-1',
    document_type: 'quotation',
    document_number: 'QTN-2026-0001',
    client_id: 'c3',
    issue_date: new Date().toISOString().split('T')[0],
    due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    status: 'draft',
    subtotal: 45000.00,
    tax_total: 8100.00,
    discount_total: 2000.00,
    grand_total: 51100.00,
    notes: 'Quotation valid for 30 days. Custom graphite composite bat-suit.',
    created_at: new Date().toISOString(),
    items: [
      { id: 'item-4', invoice_id: 'q-1', description: 'Reinforced Graphite Defense Suit Prototype', quantity: 1, unit_price: 40000.00, tax_rate: 18, discount_rate: 5, total: 44840.00 },
      { id: 'item-5', invoice_id: 'q-1', description: 'Custom Kevlar Utility Belt Attachments', quantity: 5, unit_price: 1000.00, tax_rate: 18, discount_rate: 0, total: 5900.00 }
    ]
  }
];

// Helper to initialize local storage data if empty
function initializeLocalStorage() {
  if (typeof window === 'undefined') return;

  if (!localStorage.getItem('invoice_generator_settings')) {
    localStorage.setItem('invoice_generator_settings', JSON.stringify(DEFAULT_SETTINGS));
  }
  if (!localStorage.getItem('invoice_generator_clients')) {
    localStorage.setItem('invoice_generator_clients', JSON.stringify(DEFAULT_CLIENTS));
  }
  if (!localStorage.getItem('invoice_generator_invoices')) {
    localStorage.setItem('invoice_generator_invoices', JSON.stringify(DEFAULT_INVOICES));
  }
}

// Helper to fetch local storage data
function getLocalData<T>(key: string): T {
  initializeLocalStorage();
  const data = localStorage.getItem(key);
  return data ? JSON.parse(data) : ([] as unknown as T);
}

// Helper to save local storage data
function setLocalData<T>(key: string, data: T) {
  localStorage.setItem(key, JSON.stringify(data));
}

// ==========================================
// DB SERVICE METHODS
// ==========================================

export const db = {
  // CLIENTS
  async getClients(): Promise<Client[]> {
    if (usePostgres) {
      return fetchAPI('/api/clients');
    }
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .order('name');
      if (error) throw error;
      return data || [];
    } else {
      return getLocalData<Client[]>('invoice_generator_clients');
    }
  },

  async saveClient(client: Omit<Client, 'id'>): Promise<Client> {
    if (usePostgres) {
      return fetchAPI('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(client)
      });
    }
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('clients')
        .insert(client)
        .select()
        .single();
      if (error) throw error;
      return data;
    } else {
      const clients = getLocalData<Client[]>('invoice_generator_clients');
      const newClient: Client = {
        ...client,
        id: 'c-' + Math.random().toString(36).substr(2, 9),
        created_at: new Date().toISOString()
      };
      clients.push(newClient);
      setLocalData('invoice_generator_clients', clients);
      return newClient;
    }
  },

  async updateClient(id: string, clientUpdates: Partial<Client>): Promise<Client> {
    if (usePostgres) {
      return fetchAPI(`/api/clients/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(clientUpdates)
      });
    }
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('clients')
        .update(clientUpdates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    } else {
      const clients = getLocalData<Client[]>('invoice_generator_clients');
      const index = clients.findIndex(c => c.id === id);
      if (index === -1) throw new Error('Client not found');
      clients[index] = { ...clients[index], ...clientUpdates };
      setLocalData('invoice_generator_clients', clients);
      return clients[index];
    }
  },

  async deleteClient(id: string): Promise<void> {
    if (usePostgres) {
      return fetchAPI(`/api/clients/${id}`, {
        method: 'DELETE'
      });
    }
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase.from('clients').delete().eq('id', id);
      if (error) throw error;
    } else {
      const clients = getLocalData<Client[]>('invoice_generator_clients');
      const filtered = clients.filter(c => c.id !== id);
      setLocalData('invoice_generator_clients', filtered);
    }
  },

  // INVOICES & QUOTATIONS
  async getInvoices(): Promise<Invoice[]> {
    if (usePostgres) {
      return fetchAPI('/api/documents');
    }
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('invoices')
        .select(`
          *,
          client:clients(*)
        `)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    } else {
      const invoices = getLocalData<Invoice[]>('invoice_generator_invoices');
      const clients = getLocalData<Client[]>('invoice_generator_clients');
      return invoices.map(invoice => ({
        ...invoice,
        client: clients.find(c => c.id === invoice.client_id)
      })).sort((a, b) => new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime());
    }
  },

  async getInvoiceById(id: string): Promise<Invoice | null> {
    if (usePostgres) {
      try {
        return await fetchAPI(`/api/documents/${id}`);
      } catch (err) {
        console.error(err);
        return null;
      }
    }
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('invoices')
        .select(`
          *,
          client:clients(*),
          items:invoice_items(*)
        `)
        .eq('id', id)
        .single();
      if (error) return null;
      return data;
    } else {
      const invoices = getLocalData<Invoice[]>('invoice_generator_invoices');
      const invoice = invoices.find(inv => inv.id === id);
      if (!invoice) return null;
      const clients = getLocalData<Client[]>('invoice_generator_clients');
      return {
        ...invoice,
        client: clients.find(c => c.id === invoice.client_id)
      };
    }
  },

  async saveInvoice(
    invoice: Omit<Invoice, 'id' | 'items' | 'created_at'> & { items: Omit<InvoiceItem, 'id' | 'invoice_id'>[] }
  ): Promise<Invoice> {
    if (usePostgres) {
      return fetchAPI('/api/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invoice)
      });
    }
    if (isSupabaseConfigured && supabase) {
      // 1. Insert Invoice
      const { data: invData, error: invError } = await supabase
        .from('invoices')
        .insert({
          document_type: invoice.document_type,
          document_number: invoice.document_number,
          client_id: invoice.client_id,
          issue_date: invoice.issue_date,
          due_date: invoice.due_date,
          status: invoice.status,
          subtotal: invoice.subtotal,
          tax_total: invoice.tax_total,
          discount_total: invoice.discount_total,
          grand_total: invoice.grand_total,
          project_description: invoice.project_description,
          notes: invoice.notes
        })
        .select()
        .single();

      if (invError) throw invError;

      // 2. Insert Items
      const itemsToInsert = invoice.items.map(item => ({
        invoice_id: invData.id,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price,
        tax_rate: item.tax_rate,
        discount_rate: item.discount_rate,
        total: item.total
      }));

      const { data: itemsData, error: itemsError } = await supabase
        .from('invoice_items')
        .insert(itemsToInsert)
        .select();

      if (itemsError) throw itemsError;

      return {
        ...invData,
        items: itemsData
      };
    } else {
      const invoices = getLocalData<Invoice[]>('invoice_generator_invoices');
      const invoiceId = 'inv-' + Math.random().toString(36).substr(2, 9);
      const newItems = invoice.items.map(item => ({
        ...item,
        id: 'item-' + Math.random().toString(36).substr(2, 9),
        invoice_id: invoiceId
      }));

      const newInvoice: Invoice = {
        ...invoice,
        id: invoiceId,
        created_at: new Date().toISOString(),
        items: newItems
      };

      invoices.push(newInvoice);
      setLocalData('invoice_generator_invoices', invoices);
      return newInvoice;
    }
  },

  async updateInvoice(
    id: string,
    invoice: Omit<Invoice, 'id' | 'items' | 'created_at'> & { items: Omit<InvoiceItem, 'id' | 'invoice_id'>[] }
  ): Promise<Invoice> {
    if (usePostgres) {
      return fetchAPI(`/api/documents/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invoice)
      });
    }
    if (isSupabaseConfigured && supabase) {
      // 1. Update Invoice Details
      const { data: invData, error: invError } = await supabase
        .from('invoices')
        .update({
          document_type: invoice.document_type,
          document_number: invoice.document_number,
          client_id: invoice.client_id,
          issue_date: invoice.issue_date,
          due_date: invoice.due_date,
          status: invoice.status,
          subtotal: invoice.subtotal,
          tax_total: invoice.tax_total,
          discount_total: invoice.discount_total,
          grand_total: invoice.grand_total,
          project_description: invoice.project_description,
          notes: invoice.notes
        })
        .eq('id', id)
        .select()
        .single();

      if (invError) throw invError;

      // 2. Delete Existing Items
      const { error: deleteError } = await supabase
        .from('invoice_items')
        .delete()
        .eq('invoice_id', id);

      if (deleteError) throw deleteError;

      // 3. Insert New Items
      const itemsToInsert = invoice.items.map(item => ({
        invoice_id: id,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price,
        tax_rate: item.tax_rate,
        discount_rate: item.discount_rate,
        total: item.total
      }));

      const { data: itemsData, error: itemsError } = await supabase
        .from('invoice_items')
        .insert(itemsToInsert)
        .select();

      if (itemsError) throw itemsError;

      return {
        ...invData,
        items: itemsData
      };
    } else {
      const invoices = getLocalData<Invoice[]>('invoice_generator_invoices');
      const index = invoices.findIndex(inv => inv.id === id);
      if (index === -1) throw new Error('Invoice not found');

      const newItems = invoice.items.map(item => ({
        ...item,
        id: 'item-' + Math.random().toString(36).substr(2, 9),
        invoice_id: id
      }));

      const updatedInvoice: Invoice = {
        ...invoices[index],
        ...invoice,
        items: newItems
      };

      invoices[index] = updatedInvoice;
      setLocalData('invoice_generator_invoices', invoices);
      return updatedInvoice;
    }
  },

  async updateInvoiceStatus(id: string, status: InvoiceStatus): Promise<void> {
    if (usePostgres) {
      return fetchAPI(`/api/documents/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
    }
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase
        .from('invoices')
        .update({ status })
        .eq('id', id);
      if (error) throw error;
    } else {
      const invoices = getLocalData<Invoice[]>('invoice_generator_invoices');
      const index = invoices.findIndex(inv => inv.id === id);
      if (index !== -1) {
        invoices[index].status = status;
        setLocalData('invoice_generator_invoices', invoices);
      }
    }
  },

  async deleteInvoice(id: string): Promise<void> {
    if (usePostgres) {
      return fetchAPI(`/api/documents/${id}`, {
        method: 'DELETE'
      });
    }
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase.from('invoices').delete().eq('id', id);
      if (error) throw error;
    } else {
      const invoices = getLocalData<Invoice[]>('invoice_generator_invoices');
      const filtered = invoices.filter(inv => inv.id !== id);
      setLocalData('invoice_generator_invoices', filtered);
    }
  },

  async getCatalogItems(): Promise<{ description: string, unit_price: number, tax_rate: number, discount_rate: number }[]> {
    if (usePostgres) {
      return fetchAPI('/api/catalog');
    }
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('invoice_items')
        .select('description, unit_price, tax_rate, discount_rate')
        .order('description');
      if (error) throw error;
      
      const unique = new Map<string, any>();
      data?.forEach(item => {
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
      return Array.from(unique.values());
    } else {
      const invoices = getLocalData<Invoice[]>('invoice_generator_invoices');
      const unique = new Map<string, any>();
      invoices.forEach(inv => {
        inv.items?.forEach(item => {
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
      });
      return Array.from(unique.values());
    }
  },

  // SETTINGS
  async getSettings(): Promise<CompanySettings> {
    if (usePostgres) {
      return fetchAPI('/api/settings').then(res => res || DEFAULT_SETTINGS);
    }
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('company_settings')
        .select('*')
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      if (!data) {
        // Return default if empty
        return DEFAULT_SETTINGS;
      }
      return data;
    } else {
      return getLocalData<CompanySettings>('invoice_generator_settings') || DEFAULT_SETTINGS;
    }
  },

  async saveSettings(settings: Omit<CompanySettings, 'id'>): Promise<CompanySettings> {
    if (usePostgres) {
      return fetchAPI('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });
    }
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('company_settings')
        .upsert({
          id: '00000000-0000-0000-0000-000000000001', // Lock to single settings row
          ...settings,
          updated_at: new Date().toISOString()
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    } else {
      const updatedSettings = {
        id: '00000000-0000-0000-0000-000000000001',
        ...settings
      };
      setLocalData('invoice_generator_settings', updatedSettings);
      return updatedSettings;
    }
  }
};
