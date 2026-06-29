'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Trash2, UserPlus, Info, Save, Settings as SettingsIcon } from 'lucide-react';
import { Client, Invoice, InvoiceItem, DocumentType, InvoiceStatus } from '@/types';
import { db } from '@/lib/db';
import { calculateTotals } from '@/lib/utils';
import Link from 'next/link';

interface InvoiceFormProps {
  formData: Omit<Invoice, 'id' | 'created_at'> & { items: Omit<InvoiceItem, 'id' | 'invoice_id'>[] };
  setFormData: React.Dispatch<React.SetStateAction<any>>;
  onSave: (status: InvoiceStatus) => Promise<void>;
  isSaving: boolean;
}

export default function InvoiceForm({ formData, setFormData, onSave, isSaving }: InvoiceFormProps) {
  const [clients, setClients] = useState<Client[]>([]);
  const [showAddClientModal, setShowAddClientModal] = useState(false);
  const [newClient, setNewClient] = useState({
    name: '',
    company_name: '',
    email: '',
    phone: '',
    address: ''
  });
  const [creatingClient, setCreatingClient] = useState(false);

  const [catalogItems, setCatalogItems] = useState<{ description: string, unit_price: number, tax_rate: number, discount_rate: number }[]>([]);
  const [focusedRowIdx, setFocusedRowIdx] = useState<number | null>(null);

  // Load clients and catalog on mount
  useEffect(() => {
    async function loadData() {
      try {
        const clientList = await db.getClients();
        setClients(clientList);
        const catalogList = await db.getCatalogItems();
        setCatalogItems(catalogList);
      } catch (err) {
        console.error('Failed to load clients or catalog items', err);
      }
    }
    loadData();
  }, []);

  // Update totals whenever items change
  useEffect(() => {
    const { items, subtotal, tax_total, discount_total, grand_total } = calculateTotals(formData.items);
    
    // Simple check to prevent infinite loop
    const totalsMatch = 
      formData.subtotal === subtotal &&
      formData.tax_total === tax_total &&
      formData.discount_total === discount_total &&
      formData.grand_total === grand_total;

    if (!totalsMatch) {
      setFormData((prev: any) => ({
        ...prev,
        subtotal,
        tax_total,
        discount_total,
        grand_total
      }));
    }
  }, [formData.items, setFormData, formData.subtotal, formData.tax_total, formData.discount_total, formData.grand_total]);

  // Handle document type toggle
  const handleDocTypeChange = (type: DocumentType) => {
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    const prefix = type === 'invoice' ? 'INV' : 'QTN';
    const year = new Date().getFullYear();
    const docNumber = `${prefix}-${year}-${randomNum}`;
    
    // set due date default (30 days for invoice, 15 days for quote)
    const offsetDays = type === 'invoice' ? 30 : 15;
    const due = new Date(Date.now() + offsetDays * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    setFormData((prev: any) => ({
      ...prev,
      document_type: type,
      document_number: docNumber,
      due_date: due
    }));
  };

  // Handle client selection
  const handleClientChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFormData((prev: any) => ({
      ...prev,
      client_id: e.target.value
    }));
  };

  // Add new item row
  const addItem = () => {
    setFormData((prev: any) => ({
      ...prev,
      items: [
        ...prev.items,
        { description: '', quantity: 1, unit_price: 0, tax_rate: 18, discount_rate: 0, total: 0 }
      ]
    }));
  };

  // Remove item row
  const removeItem = (index: number) => {
    if (formData.items.length === 1) return; // Keep at least one
    const updated = [...formData.items];
    updated.splice(index, 1);
    setFormData((prev: any) => ({
      ...prev,
      items: updated
    }));
  };

  // Handle item input change
  const handleItemChange = (index: number, field: keyof Omit<InvoiceItem, 'id' | 'invoice_id'>, value: any) => {
    const updated = [...formData.items];
    
    // Type casting depending on fields
    if (field === 'description') {
      updated[index][field] = value;
    } else {
      updated[index][field] = Number(value) || 0;
    }

    // Calculate item total
    const item = updated[index];
    const qty = Number(item.quantity) || 0;
    const price = Number(item.unit_price) || 0;
    const tax = Number(item.tax_rate) || 0;
    const disc = Number(item.discount_rate) || 0;

    const baseAmount = qty * price;
    const discountAmount = baseAmount * (disc / 100);
    const taxableAmount = baseAmount - discountAmount;
    const taxAmount = taxableAmount * (tax / 100);
    const total = taxableAmount + taxAmount;
    
    updated[index].total = Number(total.toFixed(2));

    setFormData((prev: any) => ({
      ...prev,
      items: updated
    }));
  };

  // Save new client
  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClient.name.trim()) return;

    try {
      setCreatingClient(true);
      const savedClient = await db.saveClient(newClient);
      setClients(prev => [...prev, savedClient]);
      setFormData((prev: any) => ({
        ...prev,
        client_id: savedClient.id
      }));
      setShowAddClientModal(false);
      setNewClient({ name: '', company_name: '', email: '', phone: '', address: '' });
    } catch (err) {
      console.error('Failed to create client', err);
    } finally {
      setCreatingClient(false);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 space-y-6">
      
      {/* 1. Document Toggle */}
      <div>
        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2.5">Document Type</label>
        <div className="grid grid-cols-2 gap-4">
          <button
            type="button"
            onClick={() => handleDocTypeChange('invoice')}
            className={`py-3 px-4 rounded-xl border text-sm font-bold flex flex-col items-center justify-center transition-all cursor-pointer ${
              formData.document_type === 'invoice'
                ? 'bg-indigo-50 border-indigo-500 text-indigo-700 shadow-sm shadow-indigo-500/10'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <span className="text-base">Tax Invoice</span>
            <span className="text-[10px] opacity-75 font-semibold mt-0.5">Generate bill for payment</span>
          </button>
          <button
            type="button"
            onClick={() => handleDocTypeChange('quotation')}
            className={`py-3 px-4 rounded-xl border text-sm font-bold flex flex-col items-center justify-center transition-all cursor-pointer ${
              formData.document_type === 'quotation'
                ? 'bg-amber-50 border-amber-500 text-amber-700 shadow-sm shadow-amber-500/10'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <span className="text-base">Quotation / Estimate</span>
            <span className="text-[10px] opacity-75 font-semibold mt-0.5">Price quote for bidding</span>
          </button>
        </div>
      </div>

      {/* 2. Metadata: Doc Number & Dates */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-slate-100 pt-5">
        <div>
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Document Number</label>
          <input
            type="text"
            value={formData.document_number}
            onChange={(e) => setFormData((prev: any) => ({ ...prev, document_number: e.target.value }))}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-sm text-slate-800 font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
          />
        </div>
        <div>
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Issue Date</label>
          <input
            type="date"
            value={formData.issue_date}
            onChange={(e) => setFormData((prev: any) => ({ ...prev, issue_date: e.target.value }))}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-sm text-slate-700 font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
          />
        </div>
        <div>
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
            {formData.document_type === 'invoice' ? 'Due Date' : 'Valid Until'}
          </label>
          <input
            type="date"
            value={formData.due_date}
            onChange={(e) => setFormData((prev: any) => ({ ...prev, due_date: e.target.value }))}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-sm text-slate-700 font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
          />
        </div>
      </div>

      {/* 3. Client Selector section */}
      <div className="border-t border-slate-100 pt-5">
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Client Details</label>
          <button
            type="button"
            onClick={() => setShowAddClientModal(true)}
            className="inline-flex items-center text-xs text-indigo-600 hover:text-indigo-700 font-bold transition-colors cursor-pointer"
          >
            <UserPlus className="h-3.5 w-3.5 mr-1" />
            Create Client
          </button>
        </div>
        <select
          value={formData.client_id}
          onChange={handleClientChange}
          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-700 font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
        >
          <option value="">-- Choose a Client --</option>
          {clients.map(client => (
            <option key={client.id} value={client.id}>
              {client.company_name ? `${client.company_name} (${client.name})` : client.name}
            </option>
          ))}
        </select>
      </div>

      {/* Program / Project Description section */}
      <div className="border-t border-slate-100 pt-5">
        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Program / Project Description</label>
        <textarea
          rows={2}
          placeholder="e.g. Scope of deliverables, coaching package duration, or project billing summary..."
          value={formData.project_description || ''}
          onChange={(e) => setFormData((prev: any) => ({ ...prev, project_description: e.target.value }))}
          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all resize-none"
        />
      </div>

      {/* 4. Dynamic Itemized List */}
      <div className="border-t border-slate-100 pt-5 space-y-4">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Line Items</label>
          <button
            type="button"
            onClick={addItem}
            className="inline-flex items-center px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition-colors cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            Add Row
          </button>
        </div>

        {/* Items Table container */}
        <div className="space-y-4.5">
          {formData.items.map((item, idx) => (
            <div 
              key={idx} 
              className="bg-slate-50 border border-slate-150 rounded-xl p-4.5 space-y-3 relative group"
            >
              <button
                type="button"
                onClick={() => removeItem(idx)}
                disabled={formData.items.length === 1}
                className="absolute top-4 right-4 text-slate-400 hover:text-rose-600 disabled:opacity-30 disabled:hover:text-slate-400 p-1 rounded-md hover:bg-rose-50/50 transition-all cursor-pointer"
              >
                <Trash2 className="h-4.5 w-4.5" />
              </button>

              {/* Row description & Autofill Autocomplete */}
              <div className="space-y-1.5 relative">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Item Description</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Detailed consulting services, branding designs, custom development milestones..."
                  value={item.description}
                  onChange={(e) => handleItemChange(idx, 'description', e.target.value)}
                  onFocus={() => setFocusedRowIdx(idx)}
                  onBlur={() => setTimeout(() => setFocusedRowIdx(null), 250)}
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-sm text-slate-800 font-semibold focus:outline-none focus:border-indigo-500 transition-all resize-none"
                />
                
                {/* Floating Autocomplete Suggestions Dropdown */}
                {focusedRowIdx === idx && catalogItems.length > 0 && (
                  <div className="absolute left-0 right-0 top-[100%] mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-50 max-h-48 overflow-y-auto divide-y divide-slate-100 animate-in fade-in duration-100">
                    {catalogItems
                      .filter(c => {
                        const q = item.description.trim().toLowerCase();
                        if (!q) return true; // Show all if empty
                        return c.description.toLowerCase().includes(q);
                      })
                      .slice(0, 6) // Show top 6 matches
                      .map((s, sidx) => (
                        <div
                          key={sidx}
                          onMouseDown={() => {
                            handleItemChange(idx, 'description', s.description);
                            handleItemChange(idx, 'unit_price', s.unit_price);
                            handleItemChange(idx, 'tax_rate', s.tax_rate);
                            handleItemChange(idx, 'discount_rate', s.discount_rate);
                            setFocusedRowIdx(null);
                          }}
                          className="w-full text-left px-4 py-2.5 hover:bg-slate-50 text-xs text-slate-700 font-semibold flex items-center justify-between cursor-pointer transition-all"
                        >
                          <span className="truncate pr-4">{s.description}</span>
                          <span className="text-indigo-600 font-extrabold flex-shrink-0">
                            ₹{s.unit_price.toFixed(2)}
                          </span>
                        </div>
                      ))}
                    {catalogItems.filter(c => c.description.toLowerCase().includes(item.description.trim().toLowerCase())).length === 0 && (
                      <div className="px-4 py-2.5 text-[10px] text-slate-400 font-bold bg-slate-50 italic">
                        New item. Continue typing to save.
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Grid values */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Quantity</label>
                  <input
                    type="number"
                    min="1"
                    step="any"
                    value={item.quantity === 0 ? '' : item.quantity}
                    onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-sm text-slate-800 font-bold focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Unit Price</label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={item.unit_price === 0 ? '' : item.unit_price}
                    onChange={(e) => handleItemChange(idx, 'unit_price', e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-sm text-slate-800 font-bold focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Tax (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={item.tax_rate}
                    onChange={(e) => handleItemChange(idx, 'tax_rate', e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-sm text-slate-800 font-bold focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Discount (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={item.discount_rate}
                    onChange={(e) => handleItemChange(idx, 'discount_rate', e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-sm text-slate-800 font-bold focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 5. Notes & Terms */}
      <div className="border-t border-slate-100 pt-5">
        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Notes & Payment Instructions</label>
        <textarea
          rows={3}
          placeholder="e.g. Bank Account details, UPI, project description, standard delivery terms..."
          value={formData.notes || ''}
          onChange={(e) => setFormData((prev: any) => ({ ...prev, notes: e.target.value }))}
          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all resize-none"
        ></textarea>
      </div>

      {/* 6. Form Footer Actions */}
      <div className="border-t border-slate-100 pt-5 flex items-center justify-between">
        <span className="text-xs text-slate-400 font-medium inline-flex items-center">
          <Info className="h-4 w-4 mr-1 text-slate-400" />
          Real-time preview updates active
        </span>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => onSave('draft')}
            disabled={isSaving || !formData.client_id}
            className="px-4 py-2.5 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-sm font-bold rounded-xl transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Save Draft
          </button>
          <button
            type="button"
            onClick={() => onSave(formData.document_type === 'invoice' ? 'unpaid' : 'sent')}
            disabled={isSaving || !formData.client_id}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl transition-all flex items-center shadow-md shadow-indigo-600/10 hover:shadow-indigo-600/20 hover:-translate-y-0.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:shadow-none"
          >
            <Save className="h-4 w-4 mr-1.5" />
            {isSaving ? 'Saving...' : 'Finalize & Save'}
          </button>
        </div>
      </div>

      {/* Add Client Modal */}
      {showAddClientModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <span className="font-extrabold text-sm uppercase tracking-wider">Create New Client Record</span>
              <button 
                type="button"
                onClick={() => setShowAddClientModal(false)}
                className="text-slate-400 hover:text-white p-1 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
            <form onSubmit={handleCreateClient} className="p-6 space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Contact Name *</label>
                <input
                  type="text"
                  required
                  value={newClient.name}
                  onChange={e => setNewClient(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-sm text-slate-850 focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Company / Organization</label>
                <input
                  type="text"
                  value={newClient.company_name}
                  onChange={e => setNewClient(prev => ({ ...prev, company_name: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-sm text-slate-850 focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Email Address</label>
                  <input
                    type="email"
                    value={newClient.email}
                    onChange={e => setNewClient(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-sm text-slate-850 focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={newClient.phone}
                    onChange={e => setNewClient(prev => ({ ...prev, phone: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-sm text-slate-850 focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Billing Address</label>
                <textarea
                  rows={2.5}
                  value={newClient.address}
                  onChange={e => setNewClient(prev => ({ ...prev, address: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-sm text-slate-850 focus:outline-none focus:border-indigo-500 transition-colors resize-none"
                ></textarea>
              </div>
              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddClientModal(false)}
                  className="px-4 py-2 border border-slate-200 bg-white text-slate-600 text-sm font-semibold rounded-lg hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingClient}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {creatingClient ? 'Adding...' : 'Save Client'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
