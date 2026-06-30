'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Plus, 
  Search, 
  Trash2, 
  Edit3, 
  Boxes, 
  Calendar, 
  DollarSign, 
  User, 
  FileText, 
  ArrowUpRight, 
  CheckCircle, 
  HelpCircle,
  Clock, 
  AlertCircle,
  PackageCheck,
  RotateCcw,
  X
} from 'lucide-react';
import { db } from '@/lib/db';
import { Asset, RentalRecord, Client, AssetStatus, RentalStatus } from '@/types';
import { formatCurrency, formatDate } from '@/lib/utils';

export default function AssetsPage() {
  const router = useRouter();
  
  // Data State
  const [assets, setAssets] = useState<Asset[]>([]);
  const [rentals, setRentals] = useState<RentalRecord[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);

  // Tabs: 'inventory' | 'rentals'
  const [activeTab, setActiveTab] = useState<'inventory' | 'rentals'>('inventory');

  // Search & Filter State
  const [assetSearch, setAssetSearch] = useState('');
  const [assetStatusFilter, setAssetStatusFilter] = useState<'all' | AssetStatus>('all');
  const [rentalSearch, setRentalSearch] = useState('');
  const [rentalStatusFilter, setRentalStatusFilter] = useState<'all' | RentalStatus | 'overdue'>('all');

  // Modal Control States
  const [showAssetModal, setShowAssetModal] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [checkoutAsset, setCheckoutAsset] = useState<Asset | null>(null);

  const [showCheckinModal, setShowCheckinModal] = useState(false);
  const [activeCheckinRental, setActiveCheckinRental] = useState<RentalRecord | null>(null);

  // Asset Form State
  const [assetForm, setAssetForm] = useState({
    name: '',
    serial_number: '',
    rental_rate: 0,
    status: 'available' as AssetStatus,
    description: ''
  });

  // Checkout Form State
  const [checkoutForm, setCheckoutForm] = useState({
    client_id: '',
    checkout_date: new Date().toISOString().split('T')[0],
    expected_return_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    rental_rate_at_checkout: 0,
    notes: ''
  });

  // Checkin Form State
  const [checkinForm, setCheckinForm] = useState({
    actual_return_date: new Date().toISOString().split('T')[0],
    notes: ''
  });

  // Fetch all data
  async function loadData() {
    try {
      setLoading(true);
      const [assetsList, rentalsList, clientsList] = await Promise.all([
        db.getAssets(),
        db.getRentalRecords(),
        db.getClients()
      ]);
      setAssets(assetsList);
      setRentals(rentalsList);
      setClients(clientsList);
    } catch (err) {
      console.error('Failed to load asset page data:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  // Set checkout price default when checkout asset changes
  useEffect(() => {
    if (checkoutAsset) {
      setCheckoutForm(prev => ({
        ...prev,
        rental_rate_at_checkout: checkoutAsset.rental_rate
      }));
    }
  }, [checkoutAsset]);

  // Handle asset save (new/edit)
  const handleSaveAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assetForm.name.trim()) return alert('Please enter asset name.');
    if (assetForm.rental_rate <= 0) return alert('Rental rate must be greater than 0.');

    try {
      if (selectedAsset) {
        // Update
        const updated = await db.updateAsset(selectedAsset.id, assetForm);
        setAssets(prev => prev.map(a => a.id === selectedAsset.id ? updated : a));
      } else {
        // Create
        const created = await db.saveAsset(assetForm);
        setAssets(prev => [...prev, created]);
      }
      setShowAssetModal(false);
      resetAssetForm();
    } catch (err) {
      console.error('Failed to save asset:', err);
      alert('Failed to save asset.');
    }
  };

  // Handle Delete Asset
  const handleDeleteAsset = async (id: string) => {
    if (!confirm('Are you sure you want to delete this asset? All associated rentals will be deleted.')) return;
    try {
      await db.deleteAsset(id);
      setAssets(prev => prev.filter(a => a.id !== id));
      setRentals(prev => prev.filter(r => r.asset_id !== id));
    } catch (err) {
      console.error('Failed to delete asset:', err);
      alert('Failed to delete asset.');
    }
  };

  // Handle Checkout Submit
  const handleCheckoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkoutAsset) return;
    if (!checkoutForm.client_id) return alert('Please select a client.');
    if (!checkoutForm.checkout_date) return alert('Please enter checkout date.');
    if (checkoutForm.rental_rate_at_checkout <= 0) return alert('Rental rate must be greater than 0.');

    try {
      const rentalData = {
        asset_id: checkoutAsset.id,
        client_id: checkoutForm.client_id,
        checkout_date: checkoutForm.checkout_date,
        expected_return_date: checkoutForm.expected_return_date || null,
        actual_return_date: null,
        rental_rate_at_checkout: checkoutForm.rental_rate_at_checkout,
        status: 'rented' as RentalStatus,
        notes: checkoutForm.notes || null,
        invoice_id: null
      };

      await db.saveRentalRecord(rentalData);
      
      // Update local asset status
      setAssets(prev => prev.map(a => a.id === checkoutAsset.id ? { ...a, status: 'rented' } : a));
      
      setShowCheckoutModal(false);
      resetCheckoutForm();
      loadData(); // reload to get fully joined object
    } catch (err) {
      console.error('Checkout failed:', err);
      alert('Checkout failed.');
    }
  };

  // Handle Checkin Submit
  const handleCheckinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCheckinRental) return;
    if (!checkinForm.actual_return_date) return alert('Please enter return date.');

    try {
      const checkoutDate = new Date(activeCheckinRental.checkout_date);
      const returnDate = new Date(checkinForm.actual_return_date);
      
      let status: RentalStatus = 'returned';
      if (activeCheckinRental.expected_return_date) {
        const expectedDate = new Date(activeCheckinRental.expected_return_date);
        if (returnDate > expectedDate) {
          // overdue could be tracked, but let's label it returned
        }
      }

      await db.updateRentalRecord(activeCheckinRental.id, {
        actual_return_date: checkinForm.actual_return_date,
        status,
        notes: checkinForm.notes || activeCheckinRental.notes
      });

      // Update local asset status
      setAssets(prev => prev.map(a => a.id === activeCheckinRental.asset_id ? { ...a, status: 'available' } : a));

      setShowCheckinModal(false);
      resetCheckinForm();
      loadData(); // reload
    } catch (err) {
      console.error('Checkin failed:', err);
      alert('Checkin failed.');
    }
  };

  // Handle Delete Rental Record
  const handleDeleteRental = async (id: string) => {
    if (!confirm('Are you sure you want to delete this rental record?')) return;
    try {
      await db.deleteRentalRecord(id);
      setRentals(prev => prev.filter(r => r.id !== id));
      loadData(); // reload to update statuses
    } catch (err) {
      console.error('Failed to delete rental record:', err);
      alert('Failed to delete rental record.');
    }
  };

  // Reset Forms
  const resetAssetForm = () => {
    setSelectedAsset(null);
    setAssetForm({
      name: '',
      serial_number: '',
      rental_rate: 0,
      status: 'available',
      description: ''
    });
  };

  const resetCheckoutForm = () => {
    setCheckoutAsset(null);
    setCheckoutForm({
      client_id: '',
      checkout_date: new Date().toISOString().split('T')[0],
      expected_return_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      rental_rate_at_checkout: 0,
      notes: ''
    });
  };

  const resetCheckinForm = () => {
    setActiveCheckinRental(null);
    setCheckinForm({
      actual_return_date: new Date().toISOString().split('T')[0],
      notes: ''
    });
  };

  // Open Edit Asset Modal
  const openEditAsset = (asset: Asset) => {
    setSelectedAsset(asset);
    setAssetForm({
      name: asset.name,
      serial_number: asset.serial_number || '',
      rental_rate: asset.rental_rate,
      status: asset.status,
      description: asset.description || ''
    });
    setShowAssetModal(true);
  };

  // Check if a rental record is overdue
  const isOverdue = (rental: RentalRecord) => {
    if (rental.status === 'returned' || rental.actual_return_date) return false;
    if (!rental.expected_return_date) return false;
    const expected = new Date(rental.expected_return_date);
    const today = new Date();
    // Reset hours for accurate date comparison
    expected.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    return today > expected;
  };

  // Calculate rental calculations
  const calculateRentalBilling = (rental: RentalRecord) => {
    const start = new Date(rental.checkout_date);
    const end = rental.actual_return_date ? new Date(rental.actual_return_date) : new Date();
    
    // Reset hours
    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);
    
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1; // Minimum 1 day
    
    const totalAmount = diffDays * rental.rental_rate_at_checkout;
    return {
      days: diffDays,
      rate: rental.rental_rate_at_checkout,
      total: totalAmount
    };
  };

  // Trigger invoice generation routing
  const handleGenerateBill = (rental: RentalRecord) => {
    const billing = calculateRentalBilling(rental);
    const assetName = rental.asset?.name || 'Asset';
    const serialSuffix = rental.asset?.serial_number ? ` (Serial: ${rental.asset.serial_number})` : '';
    
    const dateRange = `from ${rental.checkout_date} to ${rental.actual_return_date || new Date().toISOString().split('T')[0]}`;
    const description = `Rental of ${assetName}${serialSuffix} ${dateRange} (${billing.days} days)`;
    
    // Redirect to doc builder page
    const query = new URLSearchParams({
      client_id: rental.client_id,
      rental_id: rental.id,
      description,
      quantity: billing.days.toString(),
      unit_price: billing.rate.toString()
    });
    
    router.push(`/documents/create?${query.toString()}`);
  };

  // Filter Assets
  const filteredAssets = assets.filter(a => {
    const matchesSearch = 
      a.name.toLowerCase().includes(assetSearch.toLowerCase()) || 
      (a.serial_number || '').toLowerCase().includes(assetSearch.toLowerCase()) ||
      (a.description || '').toLowerCase().includes(assetSearch.toLowerCase());
    const matchesStatus = assetStatusFilter === 'all' || a.status === assetStatusFilter;
    return matchesSearch && matchesStatus;
  });

  // Filter Rentals
  const filteredRentals = rentals.filter(r => {
    const assetName = r.asset?.name || '';
    const clientName = r.client?.name || '';
    const clientCompany = r.client?.company_name || '';
    
    const matchesSearch = 
      assetName.toLowerCase().includes(rentalSearch.toLowerCase()) || 
      clientName.toLowerCase().includes(rentalSearch.toLowerCase()) ||
      clientCompany.toLowerCase().includes(rentalSearch.toLowerCase()) ||
      (r.notes || '').toLowerCase().includes(rentalSearch.toLowerCase());

    let matchesStatus = true;
    if (rentalStatusFilter !== 'all') {
      if (rentalStatusFilter === 'overdue') {
        matchesStatus = isOverdue(r);
      } else {
        matchesStatus = r.status === rentalStatusFilter;
      }
    }
    
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <div className="flex-1 p-6 lg:p-8 space-y-8 bg-slate-50 animate-pulse">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-200 pb-6">
          <div className="space-y-2">
            <div className="h-8 bg-slate-200 rounded w-48 animate-pulse"></div>
            <div className="h-4 bg-slate-200 rounded w-80 animate-pulse"></div>
          </div>
          <div className="h-10 bg-slate-200 rounded-xl w-36 animate-pulse"></div>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
          <div className="flex gap-4 border-b border-slate-100 pb-3">
            <div className="h-8 bg-slate-200 rounded w-32 animate-pulse"></div>
            <div className="h-8 bg-slate-200 rounded w-32 animate-pulse"></div>
          </div>
          <div className="h-10 bg-slate-100 rounded-lg w-full max-w-md animate-pulse"></div>
          <div className="divide-y divide-slate-100">
            {[1, 2, 3].map((i) => (
              <div key={i} className="py-4 flex justify-between">
                <div className="space-y-2">
                  <div className="h-4 bg-slate-200 rounded w-40 animate-pulse"></div>
                  <div className="h-3 bg-slate-200 rounded w-28 animate-pulse"></div>
                </div>
                <div className="h-8 bg-slate-200 rounded-lg w-20 animate-pulse"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-6 lg:p-8 space-y-8 bg-slate-50 min-h-screen">
      
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <h1 className="text-2xl lg:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center">
            Assets & Rentals Management
            <Boxes className="h-6 w-6 text-indigo-500 ml-2.5" />
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Track equipment inventory, record rentals checkouts/returns, and generate client rent invoices.
          </p>
        </div>
        <button
          onClick={() => {
            resetAssetForm();
            setShowAssetModal(true);
          }}
          className="inline-flex items-center justify-center px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl transition-all shadow-md shadow-indigo-600/10 hover:shadow-indigo-600/20 hover:-translate-y-0.5 cursor-pointer"
        >
          <Plus className="mr-1.5 h-4 w-4" />
          Add New Asset
        </button>
      </div>

      {/* Main Dashboard Panel */}
      <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-sm">
        
        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-100 bg-slate-50/50 px-6 pt-3">
          <button
            onClick={() => setActiveTab('inventory')}
            className={`pb-3 text-sm font-bold tracking-wide transition-all border-b-2 mr-6 ${
              activeTab === 'inventory'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            Assets Inventory ({assets.length})
          </button>
          <button
            onClick={() => setActiveTab('rentals')}
            className={`pb-3 text-sm font-bold tracking-wide transition-all border-b-2 ${
              activeTab === 'rentals'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            Rental Records ({rentals.length})
          </button>
        </div>

        {/* Tab 1: Asset Inventory */}
        {activeTab === 'inventory' && (
          <div className="p-6 space-y-6">
            
            {/* Search & Filter Controls */}
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
              <div className="relative w-full md:max-w-md">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search assets name, serial, desc..."
                  value={assetSearch}
                  onChange={(e) => setAssetSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all placeholder:text-slate-400"
                />
              </div>
              <div className="flex items-center space-x-3 w-full md:w-auto">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Filter status</span>
                <select
                  value={assetStatusFilter}
                  onChange={(e) => setAssetStatusFilter(e.target.value as any)}
                  className="bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-600 focus:outline-none focus:border-indigo-500 cursor-pointer"
                >
                  <option value="all">All Assets</option>
                  <option value="available">Available</option>
                  <option value="rented">Rented</option>
                  <option value="maintenance">Maintenance</option>
                </select>
              </div>
            </div>

            {/* Table list */}
            {filteredAssets.length === 0 ? (
              <div className="text-center py-12 px-4 border border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
                <Boxes className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                <h3 className="text-sm font-bold text-slate-700">No assets found</h3>
                <p className="text-xs text-slate-400 mt-1">Try refining your search or add a new asset to get started.</p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-100 shadow-inner bg-white">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/50 text-[10px] font-extrabold uppercase text-slate-400 border-b border-slate-100">
                      <th className="px-6 py-4">Asset Details</th>
                      <th className="px-6 py-4">Serial Number</th>
                      <th className="px-6 py-4">Daily Rental Rate</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {filteredAssets.map((asset) => (
                      <tr key={asset.id} className="hover:bg-slate-50/30 transition-colors group">
                        <td className="px-6 py-4.5">
                          <div className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                            {asset.name}
                          </div>
                          {asset.description && (
                            <div className="text-xs text-slate-400 mt-0.5 line-clamp-1 max-w-sm">
                              {asset.description}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4.5 font-mono text-xs text-slate-500 font-bold">
                          {asset.serial_number || '—'}
                        </td>
                        <td className="px-6 py-4.5 font-bold text-slate-800">
                          {formatCurrency(asset.rental_rate)}
                          <span className="text-[10px] text-slate-400 font-medium ml-1">/ day</span>
                        </td>
                        <td className="px-6 py-4.5">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold ${
                            asset.status === 'available'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                              : asset.status === 'rented'
                              ? 'bg-blue-50 text-blue-700 border border-blue-100'
                              : 'bg-amber-50 text-amber-700 border border-amber-100'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                              asset.status === 'available'
                                ? 'bg-emerald-500'
                                : asset.status === 'rented'
                                ? 'bg-blue-500'
                                : 'bg-amber-500'
                            }`} />
                            {asset.status.toUpperCase()}
                          </span>
                        </td>
                        <td className="px-6 py-4.5 text-right">
                          <div className="flex items-center justify-end space-x-1.5">
                            {asset.status === 'available' ? (
                              <button
                                onClick={() => {
                                  setCheckoutAsset(asset);
                                  setShowCheckoutModal(true);
                                }}
                                className="px-2.5 py-1 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-all cursor-pointer"
                              >
                                Check Out
                              </button>
                            ) : asset.status === 'rented' ? (
                              <button
                                onClick={() => {
                                  // Find the active rented record
                                  const activeRental = rentals.find(r => r.asset_id === asset.id && !r.actual_return_date);
                                  if (activeRental) {
                                    setActiveCheckinRental(activeRental);
                                    setShowCheckinModal(true);
                                  } else {
                                    alert('Rental record not found.');
                                  }
                                }}
                                className="px-2.5 py-1 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-100 rounded-lg transition-all cursor-pointer"
                              >
                                Check In
                              </button>
                            ) : null}
                            <button
                              onClick={() => openEditAsset(asset)}
                              className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-all cursor-pointer"
                              title="Edit Asset"
                            >
                              <Edit3 className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteAsset(asset.id)}
                              className="p-1 hover:bg-red-50 rounded-lg text-slate-400 hover:text-red-500 transition-all cursor-pointer"
                              title="Delete Asset"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Rental Records */}
        {activeTab === 'rentals' && (
          <div className="p-6 space-y-6">
            
            {/* Search & Filter Controls */}
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
              <div className="relative w-full md:max-w-md">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search client name, company, notes..."
                  value={rentalSearch}
                  onChange={(e) => setRentalSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all placeholder:text-slate-400"
                />
              </div>
              <div className="flex items-center space-x-3 w-full md:w-auto">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Filter rental status</span>
                <select
                  value={rentalStatusFilter}
                  onChange={(e) => setRentalStatusFilter(e.target.value as any)}
                  className="bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-600 focus:outline-none focus:border-indigo-500 cursor-pointer"
                >
                  <option value="all">All Records</option>
                  <option value="rented">Active Rented</option>
                  <option value="returned">Returned</option>
                  <option value="overdue">Overdue</option>
                </select>
              </div>
            </div>

            {/* Table list */}
            {filteredRentals.length === 0 ? (
              <div className="text-center py-12 px-4 border border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
                <PackageCheck className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                <h3 className="text-sm font-bold text-slate-700">No rental records found</h3>
                <p className="text-xs text-slate-400 mt-1">Rent records show up here when you check out assets to clients.</p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-100 shadow-inner bg-white">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/50 text-[10px] font-extrabold uppercase text-slate-400 border-b border-slate-100">
                      <th className="px-6 py-4">Asset</th>
                      <th className="px-6 py-4">Client</th>
                      <th className="px-6 py-4">Out Date</th>
                      <th className="px-6 py-4">In Date</th>
                      <th className="px-6 py-4">Rental Rate</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4">Bill Status</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {filteredRentals.map((rental) => {
                      const isRentalOverdue = isOverdue(rental);
                      const billing = calculateRentalBilling(rental);
                      return (
                        <tr key={rental.id} className="hover:bg-slate-50/30 transition-colors group">
                          <td className="px-6 py-4.5 font-bold text-slate-900">
                            {rental.asset?.name || 'Deleted Asset'}
                            {rental.asset?.serial_number && (
                              <span className="block font-mono text-[10px] text-slate-400 font-semibold mt-0.5">
                                Serial: {rental.asset.serial_number}
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4.5">
                            <div className="font-bold text-slate-800">{rental.client?.name || 'Deleted Client'}</div>
                            {rental.client?.company_name && (
                              <div className="text-xs text-slate-400 mt-0.5">{rental.client.company_name}</div>
                            )}
                          </td>
                          <td className="px-6 py-4.5 font-semibold text-slate-600">
                            {formatDate(rental.checkout_date)}
                          </td>
                          <td className="px-6 py-4.5">
                            {rental.actual_return_date ? (
                              <span className="font-semibold text-slate-600">{formatDate(rental.actual_return_date)}</span>
                            ) : (
                              <div className="space-y-0.5">
                                <span className="font-medium text-slate-400 block text-xs">
                                  Expected: {rental.expected_return_date ? formatDate(rental.expected_return_date) : 'N/A'}
                                </span>
                                {isRentalOverdue && (
                                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-extrabold bg-red-50 text-red-600 border border-red-100 animate-pulse">
                                    <Clock className="w-2.5 h-2.5 mr-0.5" /> OVERDUE
                                  </span>
                                )}
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4.5">
                            <span className="font-bold text-slate-800">{formatCurrency(rental.rental_rate_at_checkout)}</span>
                            <span className="text-[10px] text-slate-400 block font-medium">rate / day</span>
                          </td>
                          <td className="px-6 py-4.5">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold ${
                              rental.status === 'returned' || rental.actual_return_date
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                                : isRentalOverdue
                                ? 'bg-red-50 text-red-700 border border-red-100'
                                : 'bg-blue-50 text-blue-700 border border-blue-100'
                            }`}>
                              {rental.actual_return_date || rental.status === 'returned' ? 'RETURNED' : isRentalOverdue ? 'OVERDUE' : 'RENTED'}
                            </span>
                          </td>
                          <td className="px-6 py-4.5">
                            {rental.invoice_id ? (
                              <span 
                                onClick={() => router.push(`/documents/${rental.invoice_id}`)}
                                className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-100 shadow-sm cursor-pointer transition-all hover:scale-105"
                              >
                                <FileText className="w-3 h-3 mr-1" />
                                {rental.invoice?.document_number || 'Billed'}
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-400 border border-slate-200">
                                Unbilled
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4.5 text-right">
                            <div className="flex items-center justify-end space-x-1">
                              {!rental.actual_return_date && (
                                <button
                                  onClick={() => {
                                    setActiveCheckinRental(rental);
                                    setShowCheckinModal(true);
                                  }}
                                  className="px-2.5 py-1 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-100 rounded-lg transition-all cursor-pointer"
                                >
                                  Check In
                                </button>
                              )}
                              {!rental.invoice_id && (
                                <button
                                  onClick={() => handleGenerateBill(rental)}
                                  className="px-2.5 py-1 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm transition-all cursor-pointer inline-flex items-center"
                                  title={`Calculate rent (${billing.days} days x ${billing.rate}/day = ${billing.total})`}
                                >
                                  Bill Client
                                  <ArrowUpRight className="ml-0.5 w-3 h-3" />
                                </button>
                              )}
                              <button
                                onClick={() => handleDeleteRental(rental.id)}
                                className="p-1 hover:bg-red-50 rounded-lg text-slate-400 hover:text-red-500 transition-all cursor-pointer"
                                title="Delete Record"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ========================================== */}
      {/* MODAL 1: ADD / EDIT ASSET */}
      {/* ========================================== */}
      {showAssetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h2 className="font-extrabold text-slate-900 tracking-tight text-lg">
                {selectedAsset ? 'Modify Asset Details' : 'Add Equipment Asset'}
              </h2>
              <button
                onClick={() => setShowAssetModal(false)}
                className="p-1.5 hover:bg-slate-200/50 text-slate-400 hover:text-slate-600 rounded-lg transition-all cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleSaveAsset} className="p-6 space-y-4.5">
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Asset Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Caterpillar Excavator 320"
                    value={assetForm.name}
                    onChange={(e) => setAssetForm(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all placeholder:text-slate-400"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                      Serial Number
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. CAT-8821"
                      value={assetForm.serial_number}
                      onChange={(e) => setAssetForm(prev => ({ ...prev, serial_number: e.target.value }))}
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all placeholder:text-slate-400"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                      Daily Rental Rate (₹) *
                    </label>
                    <input
                      type="number"
                      required
                      min="1"
                      placeholder="e.g. 250"
                      value={assetForm.rental_rate || ''}
                      onChange={(e) => setAssetForm(prev => ({ ...prev, rental_rate: Number(e.target.value) || 0 }))}
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all placeholder:text-slate-400"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Asset Condition Status
                  </label>
                  <select
                    value={assetForm.status}
                    onChange={(e) => setAssetForm(prev => ({ ...prev, status: e.target.value as any }))}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all cursor-pointer"
                  >
                    <option value="available">Available (Ready for Rent)</option>
                    <option value="rented">Rented (Currently checked out)</option>
                    <option value="maintenance">Maintenance (In repairs)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Description / Specifications
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Enter details, model, accessories included..."
                    value={assetForm.description}
                    onChange={(e) => setAssetForm(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all placeholder:text-slate-400"
                  />
                </div>
              </div>
              <div className="pt-4 border-t border-slate-100 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowAssetModal(false)}
                  className="px-4 py-2 text-sm font-bold text-slate-500 hover:bg-slate-50 rounded-xl transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md shadow-indigo-600/10 hover:shadow-indigo-600/20 transition-all cursor-pointer"
                >
                  Save Asset
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* MODAL 2: CHECK OUT ASSET */}
      {/* ========================================== */}
      {showCheckoutModal && checkoutAsset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div>
                <h2 className="font-extrabold text-slate-900 tracking-tight text-lg">Check Out Asset</h2>
                <p className="text-xs text-indigo-600 font-bold mt-0.5">Renting: {checkoutAsset.name}</p>
              </div>
              <button
                onClick={() => setShowCheckoutModal(false)}
                className="p-1.5 hover:bg-slate-200/50 text-slate-400 hover:text-slate-600 rounded-lg transition-all cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleCheckoutSubmit} className="p-6 space-y-4.5">
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Select Client *
                  </label>
                  {clients.length === 0 ? (
                    <div className="text-xs text-amber-600 font-medium">
                      No clients found. Please create a client on the{' '}
                      <span onClick={() => router.push('/clients')} className="underline hover:text-indigo-600 cursor-pointer">
                        Clients Page
                      </span>{' '}
                      first.
                    </div>
                  ) : (
                    <select
                      required
                      value={checkoutForm.client_id}
                      onChange={(e) => setCheckoutForm(prev => ({ ...prev, client_id: e.target.value }))}
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all cursor-pointer"
                    >
                      <option value="">-- Choose Client --</option>
                      {clients.map(c => (
                        <option key={c.id} value={c.id}>
                          {c.name} {c.company_name ? `(${c.company_name})` : ''}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                      Checkout Date *
                    </label>
                    <input
                      type="date"
                      required
                      value={checkoutForm.checkout_date}
                      onChange={(e) => setCheckoutForm(prev => ({ ...prev, checkout_date: e.target.value }))}
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all cursor-pointer"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                      Expected Return Date
                    </label>
                    <input
                      type="date"
                      value={checkoutForm.expected_return_date}
                      onChange={(e) => setCheckoutForm(prev => ({ ...prev, expected_return_date: e.target.value }))}
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all cursor-pointer"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Rental Rate (₹/day) *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={checkoutForm.rental_rate_at_checkout}
                    onChange={(e) => setCheckoutForm(prev => ({ ...prev, rental_rate_at_checkout: Number(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                  />
                  <p className="text-[10px] text-slate-400 mt-1 font-medium">Standard rate is loaded by default. You can adjust it for this rent record.</p>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Checkout Notes
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Enter any initial condition notes, rental terms, or reference..."
                    value={checkoutForm.notes}
                    onChange={(e) => setCheckoutForm(prev => ({ ...prev, notes: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all placeholder:text-slate-400"
                  />
                </div>
              </div>
              <div className="pt-4 border-t border-slate-100 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowCheckoutModal(false)}
                  className="px-4 py-2 text-sm font-bold text-slate-500 hover:bg-slate-50 rounded-xl transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={clients.length === 0}
                  className="px-4 py-2 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md shadow-indigo-600/10 hover:shadow-indigo-600/20 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Confirm Checkout
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* MODAL 3: CHECK IN / RETURN ASSET */}
      {/* ========================================== */}
      {showCheckinModal && activeCheckinRental && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div>
                <h2 className="font-extrabold text-slate-900 tracking-tight text-lg">Check In / Return Equipment</h2>
                <p className="text-xs text-indigo-600 font-bold mt-0.5">Asset: {activeCheckinRental.asset?.name}</p>
              </div>
              <button
                onClick={() => setShowCheckinModal(false)}
                className="p-1.5 hover:bg-slate-200/50 text-slate-400 hover:text-slate-600 rounded-lg transition-all cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleCheckinSubmit} className="p-6 space-y-4.5">
              <div className="space-y-4">
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-150 space-y-2">
                  <div className="flex justify-between text-xs font-bold text-slate-500">
                    <span>Rent Client:</span>
                    <span className="text-slate-800">{activeCheckinRental.client?.name}</span>
                  </div>
                  <div className="flex justify-between text-xs font-bold text-slate-500">
                    <span>Checkout Date:</span>
                    <span className="text-slate-800">{formatDate(activeCheckinRental.checkout_date)}</span>
                  </div>
                  <div className="flex justify-between text-xs font-bold text-slate-500">
                    <span>Expected Return Date:</span>
                    <span className="text-slate-800">
                      {activeCheckinRental.expected_return_date ? formatDate(activeCheckinRental.expected_return_date) : 'N/A'}
                    </span>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Actual Return Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={checkinForm.actual_return_date}
                    onChange={(e) => setCheckinForm(prev => ({ ...prev, actual_return_date: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all cursor-pointer"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Return Condition Notes
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Enter any damage reports, fuel usage, or condition checks upon receipt..."
                    value={checkinForm.notes}
                    onChange={(e) => setCheckinForm(prev => ({ ...prev, notes: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all placeholder:text-slate-400"
                  />
                </div>
              </div>
              <div className="pt-4 border-t border-slate-100 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowCheckinModal(false)}
                  className="px-4 py-2 text-sm font-bold text-slate-500 hover:bg-slate-50 rounded-xl transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md shadow-indigo-600/10 hover:shadow-indigo-600/20 transition-all cursor-pointer"
                >
                  Record Return
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
