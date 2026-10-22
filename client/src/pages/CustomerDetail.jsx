import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Users,
  CreditCard,
  Banknote,
  Calendar,
  FileText,
  Upload,
  Trash2,
  ExternalLink,
  PlusCircle,
  Phone,
  MapPin,
  Clock,
  Receipt,
  CheckCircle2,
  AlertCircle,
  X,
  Edit,
  Save,
  Eye,
  EyeOff,
  Camera,
  Maximize2,
  Download,
  ShieldAlert,
  Archive,
  RefreshCw,
  Building2,
  UserCheck,
  User,
  ShieldCheck,
  AlertTriangle,
  ArrowRight
} from 'lucide-react';
import { api } from '../services/api';
import { formatCurrency, formatDate, formatDateTime } from '../utils/formatters';
import ReceiptModal from '../components/ReceiptModal';
import ConfirmationModal from '../components/ConfirmationModal';

export default function CustomerDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview'); // 'overview', 'loans', 'schedule', 'payments'
  const [receiptData, setReceiptData] = useState(null);

  // Lightbox Zoom Modal
  const [zoomItem, setZoomItem] = useState(null); // { title, url, isPdf, filename }

  // Document Replace State
  const [replacingDocType, setReplacingDocType] = useState(null);
  const [replacingDocTitle, setReplacingDocTitle] = useState('');
  const [replaceFile, setReplaceFile] = useState(null);
  const [uploadingReplace, setUploadingReplace] = useState(false);

  // Photo Upload State
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  // Edit Mode State
  const [isEditing, setIsEditing] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editForm, setEditForm] = useState({
    full_name: '',
    mobile_number: '',
    alt_mobile: '',
    dob: '',
    street: '',
    village_town: '',
    district: '',
    state: '',
    pincode: '',
    nominee_name: '',
    nominee_mobile: '',
    nominee_relationship: 'Spouse',
    nominee_address: '',
    notes: '',
    status: 'ACTIVE'
  });

  // Delete & Archive Modal State
  const [deleteModalState, setDeleteModalState] = useState(null); 
  // null | { mode: 'CONFIRM_PERM_DELETE' } | { mode: 'FINANCIAL_LOCK', lockDetails: ... }

  useEffect(() => {
    loadCustomer();
  }, [id]);

  async function loadCustomer() {
    try {
      setLoading(true);
      const res = await api.getCustomerById(id);
      setData(res);

      // Populate edit form
      const c = res.customer;
      setEditForm({
        full_name: c.full_name || '',
        mobile_number: c.mobile_number || '',
        alt_mobile: c.alt_mobile || '',
        dob: c.dob || '',
        street: c.street || '',
        village_town: c.village_town || '',
        district: c.district || '',
        state: c.state || 'Tamil Nadu',
        pincode: c.pincode || '',
        nominee_name: c.nominee_name || '',
        nominee_mobile: c.nominee_mobile || '',
        nominee_relationship: c.nominee_relationship || 'Spouse',
        nominee_address: c.nominee_address || '',
        notes: c.notes || '',
        status: c.status || 'ACTIVE'
      });
    } catch (err) {
      alert(`Customer error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }

  // Handle Edit Save
  async function handleSaveEdit(e) {
    e.preventDefault();
    setSavingEdit(true);
    try {
      const formData = new FormData();
      Object.keys(editForm).forEach(key => {
        if (editForm[key] !== null && editForm[key] !== undefined) {
          formData.append(key, editForm[key]);
        }
      });
      await api.updateCustomer(id, formData);
      setIsEditing(false);
      loadCustomer();
    } catch (err) {
      alert(`Update failed: ${err.message}`);
    } finally {
      setSavingEdit(false);
    }
  }

  // Handle Photo Upload
  async function handleUploadExtraPhotos(e) {
    const files = Array.from(e.target.files);
    if (!files.length) return;

    setUploadingPhoto(true);
    try {
      const formData = new FormData();
      files.forEach(f => formData.append('photos', f));
      await api.uploadCustomerPhotos(id, formData);
      loadCustomer();
    } catch (err) {
      alert(`Photo upload failed: ${err.message}`);
    } finally {
      setUploadingPhoto(false);
    }
  }

  // Handle Photo Deletion
  async function handleDeletePhoto(filename) {
    if (!window.confirm('Delete this photograph?')) return;
    try {
      await api.deleteCustomerPhoto(id, filename);
      loadCustomer();
    } catch (err) {
      alert(`Failed to delete photo: ${err.message}`);
    }
  }

  // Handle Document Replace
  async function handleExecuteDocReplace(e) {
    e.preventDefault();
    if (!replaceFile) {
      alert('Please select a file.');
      return;
    }

    setUploadingReplace(true);
    try {
      const formData = new FormData();
      formData.append('document_type', replacingDocType);
      formData.append('document', replaceFile);
      await api.upsertCustomerDocument(id, formData);
      setReplacingDocType(null);
      setReplaceFile(null);
      loadCustomer();
    } catch (err) {
      alert(`Document replace failed: ${err.message}`);
    } finally {
      setUploadingReplace(false);
    }
  }

  // Handle Document Remove
  async function handleRemoveDocument(docId, docTitle) {
    if (!window.confirm(`Are you sure you want to remove ${docTitle}?`)) return;
    try {
      await api.deleteDocument(docId);
      loadCustomer();
    } catch (err) {
      alert(`Failed to delete document: ${err.message}`);
    }
  }

  // SMART DELETE & ARCHIVE HANDLERS
  async function handleDeleteCustomerClick() {
    try {
      // First attempt delete to test financial locks
      await api.deleteCustomer(id);
      alert('Customer successfully deleted.');
      navigate('/customers');
    } catch (err) {
      if (err.status === 409 && err.data?.locked) {
        // Locked due to financial records
        setDeleteModalState({
          mode: 'FINANCIAL_LOCK',
          errorMsg: err.data.error,
          details: err.data.details
        });
      } else {
        // Prompt for permanent delete confirmation
        setDeleteModalState({
          mode: 'CONFIRM_PERM_DELETE'
        });
      }
    }
  }

  async function handleConfirmPermanentDelete() {
    try {
      await api.deleteCustomer(id);
      alert('Customer permanently deleted.');
      navigate('/customers');
    } catch (err) {
      alert(`Deletion failed: ${err.message}`);
      setDeleteModalState(null);
    }
  }

  async function handleArchiveCustomer() {
    try {
      await api.archiveCustomer(id);
      alert('Customer profile archived successfully.');
      setDeleteModalState(null);
      loadCustomer();
    } catch (err) {
      alert(`Archival failed: ${err.message}`);
    }
  }

  // Helper for Age calculation
  const calculateAge = (dobString) => {
    if (!dobString) return null;
    const birthDate = new Date(dobString);
    const diffMs = Date.now() - birthDate.getTime();
    const ageDt = new Date(diffMs);
    return Math.abs(ageDt.getUTCFullYear() - 1970);
  };

  if (loading || !data) {
    return (
      <div className="p-12 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
        <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <span>Loading customer profile...</span>
      </div>
    );
  }

  const { customer, loans, payments, upcomingDue, segregatedDocuments, summary } = data;
  const photos = customer.photos || [];

  return (
    <div className="space-y-6 max-w-6xl">
      
      {/* Top Header Card */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          {photos.length > 0 ? (
            <img
              src={api.getCustomerPhotoUrl(customer.id, photos[0])}
              alt={customer.full_name}
              className="w-16 h-16 rounded-2xl object-cover border-2 border-slate-200 shadow-sm"
            />
          ) : (
            <div className="w-16 h-16 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center font-black text-xl">
              {customer.full_name.charAt(0)}
            </div>
          )}
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-100">
                {customer.id}
              </span>
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                customer.status === 'ACTIVE'
                  ? 'bg-emerald-100 text-emerald-800'
                  : customer.status === 'ARCHIVED'
                  ? 'bg-slate-200 text-slate-700'
                  : customer.status === 'BLACKLISTED'
                  ? 'bg-rose-100 text-rose-800'
                  : 'bg-slate-100 text-slate-600'
              }`}>
                {customer.status}
              </span>
            </div>
            <h2 className="text-xl font-black text-slate-900 tracking-tight mt-1">{customer.full_name}</h2>
            <div className="flex items-center gap-3 text-xs text-slate-500 font-medium mt-0.5">
              <a href={`tel:${customer.mobile_number}`} className="flex items-center gap-1 hover:text-blue-600 font-mono">
                <Phone className="w-3.5 h-3.5 text-slate-400" />
                <span>+91 {customer.mobile_number}</span>
              </a>
              {customer.dob && (
                <span>• Age: {calculateAge(customer.dob)} yrs</span>
              )}
            </div>
          </div>
        </div>

        {/* Header Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {!isEditing ? (
            <>
              <button
                onClick={() => setIsEditing(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 font-semibold text-slate-700 text-xs shadow-sm transition-all"
              >
                <Edit className="w-3.5 h-3.5" />
                <span>Edit Profile</span>
              </button>
              <button
                onClick={() => navigate(`/loans/new?customer_id=${customer.id}`)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-md shadow-blue-500/20 transition-all"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>Issue New Loan</span>
              </button>
              <button
                onClick={handleDeleteCustomerClick}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 font-semibold text-xs transition-all"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete / Archive</span>
              </button>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 font-semibold text-slate-600 text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveEdit}
                disabled={savingEdit}
                className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition-all disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{savingEdit ? 'Saving...' : 'Save Changes'}</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* SECTION 10: Total Outstanding Balance Banner (Prominent Financial Hero) */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl p-6 text-white shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-6 border border-slate-800">
        <div>
          <p className="text-xs uppercase font-semibold text-slate-400 tracking-wider">Total Outstanding Balance</p>
          <p className="text-3xl font-black font-mono text-white mt-1">
            {formatCurrency(summary.total_outstanding)}
          </p>
          <div className="flex items-center gap-4 mt-2 text-xs text-slate-300">
            <span>Total Borrowed: <strong className="text-white font-mono">{formatCurrency(summary.total_borrowed)}</strong></span>
            <span>•</span>
            <span>Total Repaid: <strong className="text-emerald-400 font-mono">{formatCurrency(summary.total_repaid)}</strong></span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(`/repayments?customer_id=${customer.id}`)}
            className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20 transition-all"
          >
            <Banknote className="w-4 h-4" />
            <span>Collect Repayment</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-200 gap-2 overflow-x-auto">
        {[
          { key: 'overview', label: 'Profile & Documents' },
          { key: 'loans', label: `Loan History (${loans.length})` },
          { key: 'schedule', label: `Repayment Schedule (${upcomingDue.length} Due)` },
          { key: 'payments', label: `Payment History (${payments.length})` }
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-3 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap ${
              activeTab === tab.key
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB 1: OVERVIEW & PROFILE SECTIONS */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          
          {/* Grid Layout: Personal + Address */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* SECTION 1: Personal Details */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-wider text-slate-800">
                  <User className="w-4 h-4 text-blue-600" />
                  <span>Personal Details</span>
                </div>
              </div>

              {!isEditing ? (
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <p className="text-[10px] text-slate-400 font-semibold uppercase">Full Name</p>
                    <p className="font-bold text-slate-900 mt-0.5">{customer.full_name}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 font-semibold uppercase">Customer ID</p>
                    <p className="font-mono font-bold text-blue-600 mt-0.5">{customer.id}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 font-semibold uppercase">Primary Mobile</p>
                    <p className="font-mono font-bold text-slate-900 mt-0.5">+91 {customer.mobile_number}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 font-semibold uppercase">Alternate Mobile</p>
                    <p className="font-mono text-slate-700 mt-0.5">{customer.alt_mobile || '—'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 font-semibold uppercase">Date of Birth</p>
                    <p className="text-slate-700 mt-0.5">{customer.dob ? formatDate(customer.dob) : '—'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 font-semibold uppercase">Registration Date</p>
                    <p className="text-slate-700 mt-0.5">{formatDate(customer.created_at)}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-[10px] text-slate-400 font-semibold uppercase">Notes / Remarks</p>
                    <p className="text-slate-700 mt-0.5 italic">{customer.notes || 'No remarks recorded.'}</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3 text-xs">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Full Name</label>
                    <input
                      type="text"
                      value={editForm.full_name}
                      onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Primary Mobile</label>
                      <input
                        type="text"
                        value={editForm.mobile_number}
                        onChange={(e) => setEditForm({ ...editForm, mobile_number: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Alternate Mobile</label>
                      <input
                        type="text"
                        value={editForm.alt_mobile}
                        onChange={(e) => setEditForm({ ...editForm, alt_mobile: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Date of Birth</label>
                      <input
                        type="date"
                        value={editForm.dob}
                        onChange={(e) => setEditForm({ ...editForm, dob: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Status</label>
                      <select
                        value={editForm.status}
                        onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-slate-50"
                      >
                        <option value="ACTIVE">ACTIVE</option>
                        <option value="INACTIVE">INACTIVE</option>
                        <option value="ARCHIVED">ARCHIVED</option>
                        <option value="BLACKLISTED">BLACKLISTED</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Notes</label>
                    <textarea
                      rows={2}
                      value={editForm.notes}
                      onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* SECTION 3: Full Address */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-wider text-slate-800">
                  <MapPin className="w-4 h-4 text-emerald-600" />
                  <span>Full Residential Address</span>
                </div>
                {!isEditing && (
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(`${customer.street || ''}, ${customer.village_town || ''}, ${customer.district || ''}, ${customer.state || ''} - ${customer.pincode || ''}`);
                      alert('Address copied to clipboard!');
                    }}
                    className="text-[11px] text-blue-600 font-semibold hover:underline"
                  >
                    Copy Address
                  </button>
                )}
              </div>

              {!isEditing ? (
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="col-span-2">
                    <p className="text-[10px] text-slate-400 font-semibold uppercase">Street / Door No.</p>
                    <p className="font-semibold text-slate-900 mt-0.5">{customer.street || '—'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 font-semibold uppercase">Village / Town / City</p>
                    <p className="font-semibold text-slate-900 mt-0.5">{customer.village_town || '—'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 font-semibold uppercase">District</p>
                    <p className="font-semibold text-slate-900 mt-0.5">{customer.district || '—'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 font-semibold uppercase">State</p>
                    <p className="font-semibold text-slate-900 mt-0.5">{customer.state || '—'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 font-semibold uppercase">PIN Code</p>
                    <p className="font-mono font-bold text-slate-900 mt-0.5">{customer.pincode || '—'}</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3 text-xs">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Door & Street</label>
                    <input
                      type="text"
                      value={editForm.street}
                      onChange={(e) => setEditForm({ ...editForm, street: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Village / Town</label>
                      <input
                        type="text"
                        value={editForm.village_town}
                        onChange={(e) => setEditForm({ ...editForm, village_town: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">District</label>
                      <input
                        type="text"
                        value={editForm.district}
                        onChange={(e) => setEditForm({ ...editForm, district: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">State</label>
                      <input
                        type="text"
                        value={editForm.state}
                        onChange={(e) => setEditForm({ ...editForm, state: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">PIN Code</label>
                      <input
                        type="text"
                        value={editForm.pincode}
                        onChange={(e) => setEditForm({ ...editForm, pincode: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

          </div>

          {/* SECTION 2: Customer Photographs Gallery (Up to 4) */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-wider text-slate-800">
                <Camera className="w-4 h-4 text-purple-600" />
                <span>Customer Photographs ({photos.length} / 4)</span>
              </div>
              {photos.length < 4 && (
                <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-50 text-purple-700 border border-purple-200 cursor-pointer hover:bg-purple-100 font-semibold text-[11px] transition-all">
                  <Upload className="w-3.5 h-3.5" />
                  <span>{uploadingPhoto ? 'Uploading...' : 'Add Photo'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    disabled={uploadingPhoto}
                    onChange={handleUploadExtraPhotos}
                    className="hidden"
                  />
                </label>
              )}
            </div>

            {photos.length === 0 ? (
              <p className="text-xs text-slate-400 italic">No photographs uploaded for this customer yet.</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {photos.map((filename, idx) => {
                  const photoUrl = api.getCustomerPhotoUrl(customer.id, filename);
                  return (
                    <div key={idx} className="relative group rounded-2xl overflow-hidden border border-slate-200 aspect-square bg-slate-100 shadow-sm">
                      <img src={photoUrl} alt={`Photo ${idx + 1}`} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => setZoomItem({ title: `Customer Photo #${idx + 1}`, url: photoUrl })}
                          className="p-2 rounded-full bg-white text-slate-900 hover:bg-blue-50 hover:text-blue-600 shadow"
                          title="Zoom"
                        >
                          <Maximize2 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeletePhoto(filename)}
                          className="p-2 rounded-full bg-white text-rose-600 hover:bg-rose-50 shadow"
                          title="Delete Photo"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded-md bg-slate-900/70 text-white font-mono text-[10px]">
                        #{idx + 1}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* SECTION 4: Customer Aadhaar Documents (Dedicated Front & Back) */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100 font-bold text-xs uppercase tracking-wider text-slate-800">
              <ShieldCheck className="w-4 h-4 text-blue-600" />
              <span>Customer Aadhaar Card Documents</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Aadhaar Front */}
              <DocumentCard
                title="Aadhaar Front Side"
                doc={segregatedDocuments.aadhaar_front}
                docType="AADHAAR_FRONT"
                onZoom={(url, name) => setZoomItem({ title: 'Aadhaar Front', url, filename: name })}
                onReplace={(type, title) => { setReplacingDocType(type); setReplacingDocTitle(title); }}
                onRemove={(docId) => handleRemoveDocument(docId, 'Aadhaar Front')}
              />

              {/* Aadhaar Back */}
              <DocumentCard
                title="Aadhaar Back Side"
                doc={segregatedDocuments.aadhaar_back}
                docType="AADHAAR_BACK"
                onZoom={(url, name) => setZoomItem({ title: 'Aadhaar Back', url, filename: name })}
                onReplace={(type, title) => { setReplacingDocType(type); setReplacingDocTitle(title); }}
                onRemove={(docId) => handleRemoveDocument(docId, 'Aadhaar Back')}
              />
            </div>
          </div>

          {/* SECTION 5: Nominee Details & Nominee Aadhaar (Segregated) */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100 font-bold text-xs uppercase tracking-wider text-slate-800">
              <UserCheck className="w-4 h-4 text-indigo-600" />
              <span>Nominee Details & Nominee Documents</span>
            </div>

            {!isEditing ? (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100">
                <div>
                  <p className="text-[10px] text-slate-400 font-semibold uppercase">Nominee Full Name</p>
                  <p className="font-bold text-slate-900 mt-0.5">{customer.nominee_name || '—'}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 font-semibold uppercase">Nominee Mobile</p>
                  <p className="font-mono font-bold text-slate-900 mt-0.5">
                    {customer.nominee_mobile ? `+91 ${customer.nominee_mobile}` : '—'}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 font-semibold uppercase">Relationship</p>
                  <span className="inline-block mt-0.5 px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-100 text-indigo-800">
                    {customer.nominee_relationship || 'Nominee'}
                  </span>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 font-semibold uppercase">Residential Address</p>
                  <p className="text-slate-800 mt-0.5">{customer.nominee_address || '—'}</p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Nominee Full Name</label>
                  <input
                    type="text"
                    value={editForm.nominee_name}
                    onChange={(e) => setEditForm({ ...editForm, nominee_name: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Nominee Mobile Number</label>
                  <input
                    type="text"
                    value={editForm.nominee_mobile}
                    onChange={(e) => setEditForm({ ...editForm, nominee_mobile: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Relationship</label>
                  <select
                    value={editForm.nominee_relationship}
                    onChange={(e) => setEditForm({ ...editForm, nominee_relationship: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-slate-50"
                  >
                    <option value="Spouse">Spouse</option>
                    <option value="Father">Father</option>
                    <option value="Mother">Mother</option>
                    <option value="Brother">Brother</option>
                    <option value="Sister">Sister</option>
                    <option value="Son">Son</option>
                    <option value="Daughter">Daughter</option>
                    <option value="Friend">Friend</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div className="sm:col-span-3">
                  <label className="block font-semibold text-slate-700 mb-1">Nominee Residential Address</label>
                  <input
                    type="text"
                    value={editForm.nominee_address}
                    onChange={(e) => setEditForm({ ...editForm, nominee_address: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                  />
                </div>
              </div>
            )}

            {/* Nominee Aadhaar Front & Back Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <DocumentCard
                title="Nominee Aadhaar Front"
                doc={segregatedDocuments.nominee_aadhaar_front}
                docType="NOMINEE_AADHAAR_FRONT"
                onZoom={(url, name) => setZoomItem({ title: 'Nominee Aadhaar Front', url, filename: name })}
                onReplace={(type, title) => { setReplacingDocType(type); setReplacingDocTitle(title); }}
                onRemove={(docId) => handleRemoveDocument(docId, 'Nominee Aadhaar Front')}
              />

              <DocumentCard
                title="Nominee Aadhaar Back"
                doc={segregatedDocuments.nominee_aadhaar_back}
                docType="NOMINEE_AADHAAR_BACK"
                onZoom={(url, name) => setZoomItem({ title: 'Nominee Aadhaar Back', url, filename: name })}
                onReplace={(type, title) => { setReplacingDocType(type); setReplacingDocTitle(title); }}
                onRemove={(docId) => handleRemoveDocument(docId, 'Nominee Aadhaar Back')}
              />
            </div>
          </div>

        </div>
      )}

      {/* TAB 2: LOANS & LOAN HISTORY (SECTION 7 & SECTION 8) */}
      {activeTab === 'loans' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-800">
              Loan Portfolio Accounts ({loans.length})
            </h3>
            <button
              onClick={() => navigate(`/loans/new?customer_id=${customer.id}`)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Issue New Loan</span>
            </button>
          </div>

          {loans.length === 0 ? (
            <div className="p-12 text-center text-xs text-slate-400 bg-white rounded-3xl border border-slate-200">
              No loans issued to this customer yet. Click "Issue New Loan" above.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6">
              {loans.map((l) => {
                const totalDue = Number(l.expected_total_repayment || (l.principal_amount + (l.expected_total_interest || 0)));
                const paidAmt = Number(l.total_paid_amount || 0);
                const percentPaid = totalDue > 0 ? Math.min(100, Math.round((paidAmt / totalDue) * 100)) : 0;
                const isOverdue = (l.overdue_amount || 0) > 0 || l.status === 'OVERDUE';

                return (
                  <div key={l.id} className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-sm space-y-5 hover:shadow-md transition-shadow">
                    
                    {/* Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-2xl bg-blue-50 text-blue-600 border border-blue-100 shadow-sm">
                          <CreditCard className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-sm font-extrabold text-blue-600">{l.id}</span>
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                              l.status === 'ACTIVE'
                                ? 'bg-blue-100 text-blue-800'
                                : l.status === 'COMPLETED'
                                ? 'bg-emerald-100 text-emerald-800'
                                : l.status === 'OVERDUE'
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-slate-100 text-slate-600'
                            }`}>
                              {l.status}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            Issued on {formatDate(l.issue_date)} • Maturity Date: {formatDate(l.maturity_date)}
                          </p>
                        </div>
                      </div>

                      {/* Quick Action Buttons */}
                      <div className="flex items-center gap-2">
                        {l.outstanding_balance > 0 && (
                          <button
                            onClick={() => navigate(`/repayments?loan_id=${l.id}`)}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm shadow-emerald-500/20 transition-colors"
                          >
                            <Banknote className="w-3.5 h-3.5" />
                            <span>Collect Payment</span>
                          </button>
                        )}
                        <button
                          onClick={() => navigate(`/loans/${l.id}`)}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors"
                        >
                          <span>Full Schedule & Ledger</span>
                          <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
                        </button>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-500 font-medium">Repayment Progress: <strong className="text-slate-800 font-bold">{percentPaid}% Paid</strong></span>
                        <span className="font-mono text-slate-600">
                          {formatCurrency(l.total_paid_amount)} of {formatCurrency(l.expected_total_repayment)}
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            l.status === 'COMPLETED' ? 'bg-emerald-500' : isOverdue ? 'bg-amber-500' : 'bg-blue-600'
                          }`}
                          style={{ width: `${percentPaid}%` }}
                        />
                      </div>
                    </div>

                    {/* 11 Required Metrics Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 pt-2 text-xs">
                      
                      {/* 1. Original Loan Amount */}
                      <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                        <p className="text-[10px] text-slate-400 uppercase font-semibold tracking-wider">Original Loan Amount</p>
                        <p className="font-mono text-sm font-bold text-slate-900 mt-1">{formatCurrency(l.principal_amount)}</p>
                      </div>

                      {/* 2. Interest Rate & Total Interest */}
                      <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                        <p className="text-[10px] text-slate-400 uppercase font-semibold tracking-wider">Interest Rate & Total</p>
                        <p className="font-mono text-sm font-bold text-amber-600 mt-1">
                          {l.interest_rate_percent}% <span className="text-[11px] font-medium text-slate-500">({formatCurrency(l.expected_total_interest)})</span>
                        </p>
                      </div>

                      {/* 3. Total Repayment Amount */}
                      <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                        <p className="text-[10px] text-slate-400 uppercase font-semibold tracking-wider">Total Repayment Amount</p>
                        <p className="font-mono text-sm font-bold text-slate-900 mt-1">{formatCurrency(l.expected_total_repayment)}</p>
                      </div>

                      {/* 4. Total Number of Installments */}
                      <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                        <p className="text-[10px] text-slate-400 uppercase font-semibold tracking-wider">Total Installments</p>
                        <p className="font-mono text-sm font-bold text-slate-800 mt-1">
                          {l.total_installments} <span className="text-[11px] font-normal text-slate-500">({l.repayment_frequency || 'WEEKLY'})</span>
                        </p>
                      </div>

                      {/* 5. Installments Paid */}
                      <div className="p-3 bg-emerald-50/60 rounded-2xl border border-emerald-100">
                        <p className="text-[10px] text-emerald-700 uppercase font-semibold tracking-wider">Installments Paid</p>
                        <p className="font-mono text-sm font-bold text-emerald-700 mt-1">
                          {l.installments_paid || 0} <span className="text-[11px] font-normal text-emerald-600">EMIs</span>
                        </p>
                      </div>

                      {/* 6. Installments Remaining */}
                      <div className="p-3 bg-blue-50/60 rounded-2xl border border-blue-100">
                        <p className="text-[10px] text-blue-700 uppercase font-semibold tracking-wider">Installments Remaining</p>
                        <p className="font-mono text-sm font-bold text-blue-700 mt-1">
                          {l.installments_remaining ?? (l.total_installments - (l.installments_paid || 0))} <span className="text-[11px] font-normal text-blue-600">EMIs</span>
                        </p>
                      </div>

                      {/* 7. Total Amount Paid */}
                      <div className="p-3 bg-emerald-50/60 rounded-2xl border border-emerald-100">
                        <p className="text-[10px] text-emerald-700 uppercase font-semibold tracking-wider">Total Amount Paid</p>
                        <p className="font-mono text-sm font-bold text-emerald-700 mt-1">{formatCurrency(l.total_paid_amount)}</p>
                      </div>

                      {/* 8. Outstanding Balance */}
                      <div className="p-3 bg-rose-50/60 rounded-2xl border border-rose-100">
                        <p className="text-[10px] text-rose-700 uppercase font-semibold tracking-wider">Outstanding Balance</p>
                        <p className="font-mono text-sm font-bold text-rose-700 mt-1">{formatCurrency(l.outstanding_balance)}</p>
                      </div>

                      {/* 9. Overdue Amount */}
                      <div className={`p-3 rounded-2xl border ${isOverdue ? 'bg-rose-100/70 border-rose-200' : 'bg-slate-50 border-slate-100'}`}>
                        <p className={`text-[10px] uppercase font-semibold tracking-wider ${isOverdue ? 'text-rose-800' : 'text-slate-400'}`}>Overdue Amount</p>
                        <p className={`font-mono text-sm font-bold mt-1 ${isOverdue ? 'text-rose-700' : 'text-slate-500'}`}>
                          {formatCurrency(l.overdue_amount || 0)}
                        </p>
                      </div>

                      {/* 10. Next Installment Amount */}
                      <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                        <p className="text-[10px] text-slate-400 uppercase font-semibold tracking-wider">Next Installment Amount</p>
                        <p className="font-mono text-sm font-bold text-slate-800 mt-1">
                          {l.outstanding_balance > 0 ? formatCurrency(l.next_installment_amount || 0) : '₹0 (Closed)'}
                        </p>
                      </div>

                      {/* 11. Next Payment Due Date */}
                      <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 sm:col-span-2">
                        <p className="text-[10px] text-slate-400 uppercase font-semibold tracking-wider">Next Payment Due Date</p>
                        <p className="font-medium text-sm text-slate-800 mt-1 flex items-center gap-1.5">
                          <Calendar className="w-4 h-4 text-slate-400" />
                          <span>{l.next_payment_due_date ? formatDate(l.next_payment_due_date) : 'No Upcoming Dues (Fully Repaid)'}</span>
                        </p>
                      </div>

                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: REPAYMENT SCHEDULE (SECTION 9) */}
      {activeTab === 'schedule' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden space-y-4 p-5">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-800">
              Active Repayment Installments ({upcomingDue.length})
            </h3>
          </div>

          {upcomingDue.length === 0 ? (
            <p className="text-xs text-slate-400 italic">No upcoming installments due.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-100">
                  <tr>
                    <th className="p-3 pl-4">Loan ID</th>
                    <th className="p-3 text-center">Inst #</th>
                    <th className="p-3">Due Date</th>
                    <th className="p-3 font-mono text-right">Scheduled</th>
                    <th className="p-3 font-mono text-right text-emerald-600">Paid</th>
                    <th className="p-3 font-mono text-right text-amber-600 font-bold">Remaining</th>
                    <th className="p-3 text-center pr-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {upcomingDue.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/70">
                      <td className="p-3 pl-4 font-mono font-bold text-blue-600">{item.loan_id}</td>
                      <td className="p-3 text-center font-mono">#{item.installment_number}</td>
                      <td className="p-3 font-medium text-slate-800">{formatDate(item.due_date)}</td>
                      <td className="p-3 font-mono text-right font-medium">{formatCurrency(item.scheduled_amount)}</td>
                      <td className="p-3 font-mono text-right text-emerald-600">{formatCurrency(item.amount_paid)}</td>
                      <td className="p-3 font-mono text-right font-bold text-slate-900">{formatCurrency(item.remaining_balance)}</td>
                      <td className="p-3 text-center pr-4">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          item.status === 'PAID'
                            ? 'bg-emerald-100 text-emerald-800'
                            : item.status === 'OVERDUE'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}>
                          {item.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: PAYMENT HISTORY (SECTION 10) */}
      {activeTab === 'payments' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden p-5 space-y-4">
          <h3 className="font-bold text-xs uppercase tracking-wider text-slate-800">
            Payment Receipts & Ledger ({payments.length})
          </h3>

          {payments.length === 0 ? (
            <p className="text-xs text-slate-400 italic">No payments recorded for this customer yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-100">
                  <tr>
                    <th className="p-3 pl-4">Receipt #</th>
                    <th className="p-3">Loan ID</th>
                    <th className="p-3">Payment Date</th>
                    <th className="p-3 font-mono text-right font-bold text-emerald-600">Amount Paid</th>
                    <th className="p-3 text-center">Method</th>
                    <th className="p-3 pr-4 text-right">Receipt</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {payments.map((pt) => (
                    <tr key={pt.id} className="hover:bg-slate-50/70">
                      <td className="p-3 pl-4 font-mono font-bold text-blue-600">{pt.receipt_number}</td>
                      <td className="p-3 font-mono text-slate-700">{pt.loan_id}</td>
                      <td className="p-3 text-slate-700">{formatDate(pt.payment_date)}</td>
                      <td className="p-3 font-mono font-bold text-right text-emerald-600">{formatCurrency(pt.amount_paid)}</td>
                      <td className="p-3 text-center">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                          {pt.payment_method}
                        </span>
                      </td>
                      <td className="p-3 pr-4 text-right">
                        <button
                          onClick={async () => {
                            try {
                              const r = await api.getReceipt(pt.receipt_number);
                              setReceiptData(r);
                            } catch (e) {
                              alert(`Receipt error: ${e.message}`);
                            }
                          }}
                          className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:text-blue-700"
                        >
                          <Receipt className="w-3.5 h-3.5" />
                          <span>View Receipt</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* LIGHTBOX ZOOM MODAL */}
      {zoomItem && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <span className="font-bold text-xs text-slate-800">{zoomItem.title}</span>
              <div className="flex items-center gap-2">
                <a
                  href={zoomItem.url}
                  download={zoomItem.filename || 'document'}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 text-xs font-semibold"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download</span>
                </a>
                <button
                  onClick={() => setZoomItem(null)}
                  className="p-1 rounded-full text-slate-400 hover:text-slate-700"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="p-4 flex-1 flex items-center justify-center overflow-auto bg-slate-900/10">
              {zoomItem.url?.endsWith('.pdf') ? (
                <iframe src={zoomItem.url} className="w-full h-[70vh] rounded-xl" title={zoomItem.title} />
              ) : (
                <img src={zoomItem.url} alt={zoomItem.title} className="max-h-[75vh] max-w-full object-contain rounded-xl shadow" />
              )}
            </div>
          </div>
        </div>
      )}

      {/* DOCUMENT REPLACE MODAL */}
      {replacingDocType && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h4 className="font-bold text-xs text-slate-800 uppercase tracking-wider">
                Upload / Replace: {replacingDocTitle}
              </h4>
              <button onClick={() => setReplacingDocType(null)} className="text-slate-400 hover:text-slate-700">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleExecuteDocReplace} className="space-y-4 text-xs">
              <div className="p-4 border-2 border-dashed border-slate-300 rounded-2xl bg-slate-50 text-center">
                <input
                  type="file"
                  required
                  accept="image/*,application/pdf"
                  onChange={(e) => setReplaceFile(e.target.files[0])}
                  className="w-full text-xs"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setReplacingDocType(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploadingReplace || !replaceFile}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold transition-all disabled:opacity-50"
                >
                  {uploadingReplace ? 'Uploading...' : 'Save Document'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE / ARCHIVE MODAL (SMART DELETION) */}
      {deleteModalState && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            {deleteModalState.mode === 'CONFIRM_PERM_DELETE' ? (
              <>
                <div className="flex items-center gap-3 text-rose-600 pb-2 border-b border-slate-100">
                  <AlertTriangle className="w-6 h-6 shrink-0" />
                  <div>
                    <h4 className="font-bold text-sm text-slate-900">Permanent Profile Deletion</h4>
                    <p className="text-[11px] text-slate-500">Zero active loans or repayments detected</p>
                  </div>
                </div>
                <p className="text-xs text-slate-700 leading-relaxed">
                  Are you sure you want to permanently delete customer account{' '}
                  <strong className="text-slate-900">{customer.full_name} ({customer.id})</strong>? 
                  This action is irreversible and will permanently delete all uploaded KYC files and photographs from the disk.
                </p>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    onClick={() => setDeleteModalState(null)}
                    className="px-4 py-2 rounded-xl border border-slate-200 font-semibold text-slate-600 text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleConfirmPermanentDelete}
                    className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md"
                  >
                    Permanently Delete
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center gap-3 text-amber-600 pb-2 border-b border-slate-100">
                  <ShieldAlert className="w-6 h-6 shrink-0" />
                  <div>
                    <h4 className="font-bold text-sm text-slate-900">Financial Ledger Lock</h4>
                    <p className="text-[11px] text-amber-700 font-semibold">Hard deletion blocked</p>
                  </div>
                </div>
                <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200 text-amber-900 text-xs space-y-1.5">
                  <p className="font-semibold">{deleteModalState.errorMsg}</p>
                </div>
                <p className="text-xs text-slate-600">
                  To safeguard financial reconciliation and audit history, customer records with issued loans or payments cannot be deleted. You can safely <strong>Archive / Deactivate</strong> this customer to prevent new loans while preserving all historical records.
                </p>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    onClick={() => setDeleteModalState(null)}
                    className="px-4 py-2 rounded-xl border border-slate-200 font-semibold text-slate-600 text-xs"
                  >
                    Close
                  </button>
                  <button
                    onClick={handleArchiveCustomer}
                    className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-md"
                  >
                    <Archive className="w-3.5 h-3.5" />
                    <span>Archive Customer</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Receipt Modal */}
      {receiptData && (
        <ReceiptModal
          receiptData={receiptData}
          onClose={() => setReceiptData(null)}
        />
      )}

    </div>
  );
}

// REUSABLE DOCUMENT CARD COMPONENT
function DocumentCard({ title, doc, docType, onZoom, onReplace, onRemove }) {
  const docUrl = doc ? api.getDocumentFileUrl(doc.id) : null;
  const isPdf = doc?.mime_type === 'application/pdf';

  return (
    <div className="p-4 bg-slate-50/70 rounded-2xl border border-slate-200/80 space-y-3">
      <div className="flex items-center justify-between">
        <span className="font-bold text-xs text-slate-800">{title}</span>
        {doc ? (
          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
            Uploaded
          </span>
        ) : (
          <span className="text-[10px] text-slate-400 italic">Not Uploaded</span>
        )}
      </div>

      {doc ? (
        <div className="relative group rounded-xl overflow-hidden border border-slate-200 bg-white h-32 flex items-center justify-center shadow-sm">
          {isPdf ? (
            <div className="flex flex-col items-center gap-1 text-slate-500">
              <FileText className="w-8 h-8 text-rose-500" />
              <span className="font-mono text-[10px] truncate max-w-[200px]">{doc.original_name}</span>
            </div>
          ) : (
            <img src={docUrl} alt={title} className="w-full h-full object-cover" />
          )}

          {/* Action Overlay */}
          <div className="absolute inset-0 bg-slate-950/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => onZoom(docUrl, doc.original_name)}
              className="p-2 rounded-full bg-white text-slate-900 hover:text-blue-600 shadow"
              title="Zoom & View"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
            <a
              href={docUrl}
              download={doc.original_name}
              className="p-2 rounded-full bg-white text-slate-900 hover:text-emerald-600 shadow"
              title="Download File"
            >
              <Download className="w-4 h-4" />
            </a>
            <button
              type="button"
              onClick={() => onReplace(docType, title)}
              className="p-2 rounded-full bg-white text-slate-900 hover:text-amber-600 shadow"
              title="Replace File"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => onRemove(doc.id)}
              className="p-2 rounded-full bg-white text-rose-600 hover:bg-rose-50 shadow"
              title="Remove File"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : (
        <div
          onClick={() => onReplace(docType, title)}
          className="h-32 rounded-xl border-2 border-dashed border-slate-300 hover:border-blue-400 bg-white flex flex-col items-center justify-center cursor-pointer transition-colors p-2 text-center"
        >
          <Upload className="w-5 h-5 text-slate-400 mb-1" />
          <span className="text-[11px] font-semibold text-slate-600">Upload {title}</span>
          <span className="text-[9px] text-slate-400">JPG, PNG, or PDF</span>
        </div>
      )}
    </div>
  );
}
