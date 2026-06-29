'use client';

import React, { useEffect, useState } from 'react';
import { 
  Plus, 
  Search, 
  Users, 
  Mail, 
  Phone, 
  MapPin, 
  Edit3, 
  Trash2, 
  FileText,
  Building,
  Briefcase,
  Sparkles
} from 'lucide-react';
import { db } from '@/lib/db';
import { Client, Invoice } from '@/types';

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  // Search state
  const [search, setSearch] = useState('');

  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [clientForm, setClientForm] = useState({
    name: '',
    company_name: '',
    email: '',
    phone: '',
    address: ''
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const clientList = await db.getClients();
        const invoiceList = await db.getInvoices();
        setClients(clientList);
        setInvoices(invoiceList);
      } catch (err) {
        console.error('Error fetching clients data', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const handleOpenAdd = () => {
    setEditingClient(null);
    setClientForm({ name: '', company_name: '', email: '', phone: '', address: '' });
    setShowModal(true);
  };

  const handleOpenEdit = (client: Client) => {
    setEditingClient(client);
    setClientForm({
      name: client.name,
      company_name: client.company_name || '',
      email: client.email || '',
      phone: client.phone || '',
      address: client.address || ''
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    // Check if client has active documents
    const associatedInvs = invoices.filter(inv => inv.client_id === id);
    if (associatedInvs.length > 0) {
      alert(`Cannot delete this client. There are ${associatedInvs.length} invoices/quotations associated with them.`);
      return;
    }

    if (!confirm('Are you sure you want to delete this client?')) return;

    try {
      await db.deleteClient(id);
      setClients(prev => prev.filter(c => c.id !== id));
    } catch (err) {
      console.error('Failed to delete client', err);
      alert('Failed to delete client.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientForm.name.trim()) return;

    try {
      setSubmitting(true);
      if (editingClient) {
        // Edit mode
        const updated = await db.updateClient(editingClient.id, clientForm);
        setClients(prev => prev.map(c => c.id === editingClient.id ? updated : c));
      } else {
        // Add mode
        const created = await db.saveClient(clientForm);
        setClients(prev => [...prev, created]);
      }
      setShowModal(false);
    } catch (err) {
      console.error('Failed to save client', err);
      alert('Failed to save client. Please check your network or DB.');
    } finally {
      setSubmitting(false);
    }
  };

  // Filter list
  const filteredClients = clients.filter(c => {
    const term = search.toLowerCase();
    return (
      c.name.toLowerCase().includes(term) ||
      (c.company_name || '').toLowerCase().includes(term) ||
      (c.email || '').toLowerCase().includes(term)
    );
  });

  // Helper to count documents per client
  const getDocumentCount = (clientId: string) => {
    return invoices.filter(inv => inv.client_id === clientId).length;
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 bg-slate-50">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
          <p className="text-slate-500 font-medium text-sm">Accessing client registry...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-6 lg:p-8 space-y-8 bg-slate-50">
      
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <h1 className="text-2xl lg:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center">
            Clients Management
            <Sparkles className="h-5 w-5 text-indigo-500 ml-2.5 animate-pulse" />
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Maintain client records, billing details, and view purchase history.
          </p>
        </div>
        <button
          onClick={handleOpenAdd}
          className="inline-flex items-center justify-center px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl transition-all shadow-md shadow-indigo-600/10 hover:shadow-indigo-600/20 hover:-translate-y-0.5 cursor-pointer"
        >
          <Plus className="mr-1.5 h-4 w-4" />
          Add Client
        </button>
      </div>

      {/* Search Input bar */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm">
        <div className="relative">
          <Search className="absolute left-3.5 top-3.5 h-4.5 w-4.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search clients by name, company, or email address..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-11 pr-4 py-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-slate-400 font-medium"
          />
        </div>
      </div>

      {/* Clients Grid */}
      {filteredClients.length === 0 ? (
        <div className="bg-white border border-slate-200/80 rounded-2xl p-16 text-center shadow-sm">
          <Users className="h-12 w-12 text-slate-300 mx-auto mb-3.5" />
          <h3 className="text-sm font-bold text-slate-700">No client records</h3>
          <p className="text-xs text-slate-400 max-w-xs mx-auto mt-1">
            Create your first client record to start building custom invoices or estimations.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredClients.map(client => {
            const docCount = getDocumentCount(client.id);
            return (
              <div 
                key={client.id}
                className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between"
              >
                <div>
                  {/* Top card block */}
                  <div className="flex items-start justify-between border-b border-slate-50 pb-4 mb-4.5">
                    <div className="flex-1 min-w-0 pr-3">
                      <h3 className="text-base font-extrabold text-slate-800 truncate">{client.name}</h3>
                      {client.company_name && (
                        <div className="flex items-center text-xs text-slate-500 font-semibold mt-1">
                          <Building className="h-3.5 w-3.5 mr-1 text-slate-400" />
                          <span className="truncate">{client.company_name}</span>
                        </div>
                      )}
                    </div>
                    <div className="bg-slate-100 p-2.5 rounded-xl border border-slate-150">
                      <Briefcase className="h-5 w-5 text-indigo-500" />
                    </div>
                  </div>

                  {/* Body contact details */}
                  <div className="space-y-3.5 text-xs text-slate-500 font-medium">
                    {client.email && (
                      <div className="flex items-center">
                        <Mail className="h-4 w-4 mr-2.5 text-slate-400 flex-shrink-0" />
                        <span className="truncate">{client.email}</span>
                      </div>
                    )}
                    {client.phone && (
                      <div className="flex items-center">
                        <Phone className="h-4 w-4 mr-2.5 text-slate-400 flex-shrink-0" />
                        <span>{client.phone}</span>
                      </div>
                    )}
                    {client.address && (
                      <div className="flex items-start">
                        <MapPin className="h-4 w-4 mr-2.5 text-slate-400 flex-shrink-0 mt-0.5" />
                        <span className="line-clamp-2 leading-relaxed">{client.address}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer block: Doc count & Actions */}
                <div className="border-t border-slate-100 pt-4.5 mt-5 flex items-center justify-between">
                  <div className="flex items-center text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    <FileText className="h-4 w-4 mr-1 text-indigo-500" />
                    <span>{docCount} Documents</span>
                  </div>
                  <div className="flex space-x-1.5">
                    <button
                      onClick={() => handleOpenEdit(client)}
                      className="p-1.5 border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 hover:text-indigo-600 rounded-lg transition-colors cursor-pointer"
                      title="Edit Profile"
                    >
                      <Edit3 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(client.id)}
                      className="p-1.5 border border-rose-100 bg-rose-50/50 hover:bg-rose-100 text-rose-500 hover:text-rose-600 rounded-lg transition-colors cursor-pointer"
                      title="Delete client"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <span className="font-extrabold text-sm uppercase tracking-wider">
                {editingClient ? 'Edit Client Profile' : 'Create New Client Record'}
              </span>
              <button 
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-white p-1 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Contact Name *</label>
                <input
                  type="text"
                  required
                  value={clientForm.name}
                  onChange={e => setClientForm(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-sm text-slate-800 focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Company / Organization</label>
                <input
                  type="text"
                  value={clientForm.company_name}
                  onChange={e => setClientForm(prev => ({ ...prev, company_name: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-sm text-slate-800 focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Email Address</label>
                  <input
                    type="email"
                    value={clientForm.email}
                    onChange={e => setClientForm(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-sm text-slate-800 focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={clientForm.phone}
                    onChange={e => setClientForm(prev => ({ ...prev, phone: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-sm text-slate-800 focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Billing Address</label>
                <textarea
                  rows={2.5}
                  value={clientForm.address}
                  onChange={e => setClientForm(prev => ({ ...prev, address: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-sm text-slate-800 focus:outline-none focus:border-indigo-500 transition-colors resize-none"
                ></textarea>
              </div>
              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-slate-200 bg-white text-slate-600 text-sm font-semibold rounded-lg hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
