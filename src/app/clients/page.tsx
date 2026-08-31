'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
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
  Sparkles,
  CreditCard,
  ArrowRight,
  ExternalLink
} from 'lucide-react';
import { db } from '@/lib/db';
import { Client, Invoice } from '@/types';
import { formatCurrency } from '@/lib/utils';

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  // Search and filter states
  const [search, setSearch] = useState('');
  const [filterDebit, setFilterDebit] = useState<'all' | 'debit' | 'settled'>('all');

  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [clientForm, setClientForm] = useState({
    name: '',
    slug: '',
    email: '',
    phone: '',
    address: ''
  });
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
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
    setSlugManuallyEdited(false);
    setClientForm({ name: '', slug: '', email: '', phone: '', address: '' });
    setShowModal(true);
  };

  const handleOpenEdit = (client: Client) => {
    setEditingClient(client);
    setSlugManuallyEdited(true);
    setClientForm({
      name: client.name,
      slug: client.slug || '',
      email: client.email || '',
      phone: client.phone || '',
      address: client.address || ''
    });
    setShowModal(true);
  };

  const handleNameChange = (name: string) => {
    setClientForm(prev => {
      const autoSlug = !editingClient && !slugManuallyEdited
        ? name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
        : prev.slug;
      return { ...prev, name, slug: autoSlug };
    });
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

  // Helper for computing client account stats
  const getClientStats = (clientId: string) => {
    const clientInvs = invoices.filter(inv => inv.client_id === clientId);
    const billInvoices = clientInvs.filter(inv => inv.document_type === 'invoice');
    const totalBilled = billInvoices.reduce((sum, inv) => sum + Number(inv.grand_total || 0), 0);
    const totalDebit = billInvoices.reduce((sum, inv) => {
      if (inv.status === 'paid') return sum;
      return sum + Math.max(0, Number(inv.grand_total || 0) - Number(inv.advance_payment || 0));
    }, 0);
    return { totalBilled, totalDebit, docCount: clientInvs.length };
  };

  // Filter list
  const filteredClients = clients.filter(c => {
    const term = search.toLowerCase();
    const matchesSearch = (
      c.name.toLowerCase().includes(term) ||
      (c.email || '').toLowerCase().includes(term) ||
      (c.phone || '').includes(term)
    );
    if (!matchesSearch) return false;

    const stats = getClientStats(c.id);
    if (filterDebit === 'debit') return stats.totalDebit > 0;
    if (filterDebit === 'settled') return stats.totalDebit === 0;
    return true;
  });

  const clientsWithDebitCount = clients.filter(c => getClientStats(c.id).totalDebit > 0).length;
  const settledClientsCount = clients.length - clientsWithDebitCount;

  if (loading) {
    return (
      <div className="flex-1 p-6 lg:p-8 space-y-8 bg-slate-50 animate-pulse">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-200 pb-6">
          <div className="space-y-2">
            <div className="h-8 bg-slate-200 rounded w-48"></div>
            <div className="h-4 bg-slate-200 rounded w-80"></div>
          </div>
          <div className="h-10 bg-slate-200 rounded-xl w-32"></div>
        </div>

        {/* Search Placeholder */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm">
          <div className="h-10 bg-slate-100 rounded-lg w-full md:max-w-md"></div>
        </div>

        {/* Clients Grid Skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => (
            <div key={i} className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm space-y-4">
              <div className="flex items-center space-x-3">
                <div className="h-10 w-10 bg-slate-200 rounded-full"></div>
                <div className="space-y-1.5 flex-1">
                  <div className="h-3.5 bg-slate-200 rounded w-24"></div>
                  <div className="h-2.5 bg-slate-200 rounded w-16"></div>
                </div>
              </div>
              <div className="h-12 bg-slate-100 rounded-xl"></div>
              <div className="h-8 bg-slate-100 rounded-xl"></div>
            </div>
          ))}
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
            Maintain client records, monitor debit balances, and view purchase history.
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

      {/* Search and Filters bar */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-3.5 h-4.5 w-4.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search clients by name, phone, or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-11 pr-4 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-slate-400 font-medium"
            />
          </div>

          {/* Quick Filter Tabs */}
          <div className="flex items-center space-x-1.5 bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setFilterDebit('all')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                filterDebit === 'all'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All ({clients.length})
            </button>
            <button
              onClick={() => setFilterDebit('debit')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center ${
                filterDebit === 'debit'
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'text-rose-600 hover:bg-rose-50'
              }`}
            >
              <span className="h-2 w-2 rounded-full bg-rose-500 mr-1.5 animate-ping"></span>
              Debit Due ({clientsWithDebitCount})
            </button>
            <button
              onClick={() => setFilterDebit('settled')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                filterDebit === 'settled'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-emerald-700 hover:bg-emerald-50'
              }`}
            >
              Settled ({settledClientsCount})
            </button>
          </div>

        </div>
      </div>

      {/* Clients Grid - 5 Columns */}
      {filteredClients.length === 0 ? (
        <div className="bg-white border border-slate-200/80 rounded-2xl p-16 text-center shadow-sm">
          <Users className="h-12 w-12 text-slate-300 mx-auto mb-3.5" />
          <h3 className="text-sm font-bold text-slate-700">No client records found</h3>
          <p className="text-xs text-slate-400 max-w-xs mx-auto mt-1">
            {filterDebit === 'debit' 
              ? 'Great! None of your clients currently have an outstanding debit balance.' 
              : 'Try changing your search or filter options.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {filteredClients.map(client => {
            const { totalBilled, totalDebit, docCount } = getClientStats(client.id);
            const hasDebit = totalDebit > 0;

            return (
              <div 
                key={client.id}
                className={`rounded-2xl p-4 sm:p-5 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between group border ${
                  hasDebit 
                    ? 'bg-gradient-to-b from-rose-50/40 via-white to-rose-50/20 border-rose-300 shadow-rose-500/5 hover:border-rose-400 ring-1 ring-rose-200/70' 
                    : 'bg-white border-slate-200/80 hover:border-slate-300'
                }`}
              >
                <div>
                  {/* Top card block */}
                  <div className="flex items-start justify-between border-b border-slate-100 pb-3 mb-3">
                    <div className="flex-1 min-w-0 pr-2">
                      <div className="flex items-center space-x-1.5">
                        <Link 
                          href={`/clients/${client.slug || client.id}`}
                          className={`text-sm font-black transition-colors truncate block ${
                            hasDebit ? 'text-rose-900 hover:text-rose-600' : 'text-slate-800 hover:text-indigo-600'
                          }`}
                        >
                          {client.name}
                        </Link>
                      </div>
                      <div className="flex items-center gap-1 mt-0.5">
                        {hasDebit ? (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-rose-100 text-rose-700 border border-rose-200">
                            Debit Due
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400 font-mono truncate">
                            {client.slug ? `/clients/${client.slug}` : `ID: ${client.id.substring(0, 6)}...`}
                          </span>
                        )}
                      </div>
                    </div>
                    <Link
                      href={`/clients/${client.slug || client.id}`}
                      className={`p-2 rounded-xl border transition-colors flex-shrink-0 ${
                        hasDebit 
                          ? 'bg-rose-100 border-rose-200 text-rose-700 group-hover:bg-rose-200' 
                          : 'bg-slate-100 border-slate-150 text-indigo-500 group-hover:bg-indigo-50 group-hover:border-indigo-100'
                      }`}
                      title="Open Profile"
                    >
                      <Briefcase className="h-4 w-4" />
                    </Link>
                  </div>

                  {/* Financial Account Badge Box */}
                  <div className={`mb-3 p-2.5 rounded-xl border flex items-center justify-between ${
                    hasDebit 
                      ? 'bg-rose-100/70 border-rose-200' 
                      : 'bg-slate-50 border-slate-200/70'
                  }`}>
                    <div>
                      <span className={`text-[9px] font-extrabold uppercase tracking-wider block ${
                        hasDebit ? 'text-rose-600' : 'text-slate-400'
                      }`}>
                        Debit
                      </span>
                      <span className={`text-xs font-black ${
                        hasDebit ? 'text-rose-700' : 'text-emerald-600'
                      }`}>
                        {formatCurrency(totalDebit)}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400 block">
                        Billed
                      </span>
                      <span className="text-xs font-bold text-slate-700">
                        {formatCurrency(totalBilled)}
                      </span>
                    </div>
                  </div>

                  {/* Body contact details */}
                  <div className="space-y-1.5 text-[11px] text-slate-500 font-medium">
                    {client.phone && (
                      <div className="flex items-center truncate">
                        <Phone className={`h-3 w-3 mr-1.5 flex-shrink-0 ${hasDebit ? 'text-rose-400' : 'text-slate-400'}`} />
                        <span className="truncate">{client.phone}</span>
                      </div>
                    )}
                    {client.email && (
                      <div className="flex items-center truncate">
                        <Mail className={`h-3 w-3 mr-1.5 flex-shrink-0 ${hasDebit ? 'text-rose-400' : 'text-slate-400'}`} />
                        <span className="truncate">{client.email}</span>
                      </div>
                    )}
                    {client.address && (
                      <div className="flex items-start">
                        <MapPin className={`h-3 w-3 mr-1.5 flex-shrink-0 mt-0.5 ${hasDebit ? 'text-rose-400' : 'text-slate-400'}`} />
                        <span className="line-clamp-1">{client.address}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer block: Doc count & Actions */}
                <div className="border-t border-slate-100 pt-3 mt-4 space-y-2.5">
                  <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    <span className="flex items-center truncate">
                      <FileText className={`h-3 w-3 mr-1 ${hasDebit ? 'text-rose-500' : 'text-indigo-500'}`} />
                      {docCount} Docs
                    </span>
                    <div className="flex space-x-1">
                      <button
                        onClick={() => handleOpenEdit(client)}
                        className="p-1 border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 hover:text-indigo-600 rounded-lg transition-colors cursor-pointer"
                        title="Edit Profile"
                      >
                        <Edit3 className="h-3 w-3" />
                      </button>
                      <button
                        onClick={() => handleDelete(client.id)}
                        className="p-1 border border-rose-100 bg-rose-50/50 hover:bg-rose-100 text-rose-500 hover:text-rose-600 rounded-lg transition-colors cursor-pointer"
                        title="Delete client"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>

                  <Link
                    href={`/clients/${client.slug || client.id}`}
                    className={`w-full inline-flex items-center justify-center px-2.5 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                      hasDebit 
                        ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-sm shadow-rose-600/20' 
                        : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-100'
                    }`}
                  >
                    <span>View Profile</span>
                    <ArrowRight className="h-3 w-3 ml-1" />
                  </Link>
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
                ✕
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Client Name *</label>
                <input
                  type="text"
                  required
                  value={clientForm.name}
                  onChange={e => handleNameChange(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-sm text-slate-800 focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Profile URL Slug</label>
                  <span className="text-[11px] text-slate-400 font-mono">/clients/{clientForm.slug || 'slug'}</span>
                </div>
                <div className="flex items-center">
                  <span className="bg-slate-100 border border-r-0 border-slate-200 rounded-l-lg px-2.5 py-1.5 text-xs text-slate-500 font-mono">
                    /clients/
                  </span>
                  <input
                    type="text"
                    placeholder="e.g. markaz"
                    value={clientForm.slug}
                    onChange={e => {
                      setSlugManuallyEdited(true);
                      setClientForm(prev => ({ ...prev, slug: e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, '-') }));
                    }}
                    className="w-full bg-slate-50 border border-slate-200 rounded-r-lg px-3 py-1.5 text-sm text-slate-800 focus:outline-none focus:border-indigo-500 transition-colors font-mono"
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-1">Custom direct shortcut URL for this client profile.</p>
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
