'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, Database, Sparkles, Sliders } from 'lucide-react';
import Link from 'next/link';
import InvoiceForm from '@/components/InvoiceForm';
import InvoicePreview from '@/components/InvoicePreview';
import { db } from '@/lib/db';
import { Client, CompanySettings, InvoiceStatus } from '@/types';

export default function EditDocument() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [settings, setSettings] = useState<CompanySettings | null>(null);
  const [clients, setClients] = useState<Client[]>([]);

  // Form State
  const [formData, setFormData] = useState({
    document_type: 'invoice',
    document_number: '',
    client_id: '',
    issue_date: '',
    due_date: '',
    status: 'draft',
    subtotal: 0,
    tax_total: 0,
    discount_total: 0,
    grand_total: 0,
    advance_payment: 0,
    project_description: '',
    notes: '',
    items: [
      { description: '', quantity: 1, unit_price: 0, tax_rate: 18, discount_rate: 0, total: 0 }
    ]
  });

  // Load settings, clients, and document data on mount
  useEffect(() => {
    async function init() {
      try {
        setLoading(true);
        const compSettings = await db.getSettings();
        const clientList = await db.getClients();
        const doc = await db.getInvoiceById(id);

        if (!doc) {
          router.push('/documents');
          return;
        }

        setSettings(compSettings);
        setClients(clientList);
        setFormData({
          document_type: doc.document_type,
          document_number: doc.document_number,
          client_id: doc.client_id,
          issue_date: doc.issue_date,
          due_date: doc.due_date,
          status: doc.status,
          subtotal: Number(doc.subtotal),
          tax_total: Number(doc.tax_total),
          discount_total: Number(doc.discount_total),
          grand_total: Number(doc.grand_total),
          advance_payment: Number(doc.advance_payment || 0),
          project_description: doc.project_description || '',
          notes: doc.notes || '',
          items: doc.items ? doc.items.map(item => ({
            description: item.description,
            quantity: Number(item.quantity),
            unit_price: Number(item.unit_price),
            tax_rate: Number(item.tax_rate),
            discount_rate: Number(item.discount_rate),
            total: Number(item.total)
          })) : [{ description: '', quantity: 1, unit_price: 0, tax_rate: 18, discount_rate: 0, total: 0 }]
        });
      } catch (err) {
        console.error('Failed to load document data for editing', err);
      } finally {
        setLoading(false);
      }
    }
    if (id) init();
  }, [id, router]);

  // Find selected client details for live preview
  const selectedClient = clients.find(c => c.id === formData.client_id);

  // Handle Save
  const handleSave = async (status: InvoiceStatus) => {
    if (!formData.client_id) {
      alert('Please select a client before saving.');
      return;
    }
    
    const emptyItems = formData.items.some(item => !item.description.trim());
    if (emptyItems) {
      alert('Please fill out descriptions for all line items.');
      return;
    }

    try {
      setIsSaving(true);
      await db.updateInvoice(id, {
        ...formData,
        status
      } as any);

      // Redirect to detail page
      router.push(`/documents/${id}`);
    } catch (err: any) {
      console.error('Failed to update document', err);
      alert('Failed to update document: ' + (err?.message || err || 'Please check your inputs or database.'));
    } finally {
      setIsSaving(false);
    }
  };

  if (loading || !settings) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 bg-slate-50">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
          <p className="text-slate-500 font-medium text-sm">Loading Invoice Canvas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-slate-50">
      {/* Top sticky navigation bar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 px-6 py-4.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center space-x-3.5">
          <Link
            href={`/documents/${id}`}
            className="p-2 border border-slate-200 hover:bg-slate-50 rounded-xl text-slate-600 transition-colors cursor-pointer"
          >
            <ArrowLeft className="h-4.5 w-4.5" />
          </Link>
          <div>
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center">
              Edit Document Builder
              <Sparkles className="h-4 w-4 text-indigo-500 ml-2 animate-bounce" />
            </h1>
            <p className="text-xs text-slate-400 font-medium mt-0.5">
              Modifying {formData.document_type} {formData.document_number}.
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2 bg-slate-100 p-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-500">
          <Database className="h-3.5 w-3.5 text-indigo-500 mr-1" />
          <span>Active Client Database Mode</span>
        </div>
      </header>

      {/* Main Split Interface Area */}
      <div className="flex-1 p-6 lg:p-8 grid grid-cols-1 lg:grid-cols-2 gap-8 items-start max-w-[1800px] w-full mx-auto">
        
        {/* Left Side: Form */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-extrabold text-slate-500 uppercase tracking-widest">Document Editor</h2>
            <Link 
              href="/settings"
              className="text-xs text-indigo-600 hover:text-indigo-700 font-bold inline-flex items-center cursor-pointer"
            >
              <Sliders className="h-3.5 w-3.5 mr-1" />
              Configure Default Terms
            </Link>
          </div>
          <InvoiceForm
            formData={formData as any}
            setFormData={setFormData}
            onSave={handleSave}
            isSaving={isSaving}
          />
        </div>

        {/* Right Side: A4 Preview */}
        <div className="space-y-6 lg:sticky lg:top-[90px]">
          <h2 className="text-sm font-extrabold text-slate-500 uppercase tracking-widest">A4 PDF Preview</h2>
          <InvoicePreview
            formData={formData as any}
            settings={settings}
            selectedClient={selectedClient}
          />
        </div>

      </div>
    </div>
  );
}
