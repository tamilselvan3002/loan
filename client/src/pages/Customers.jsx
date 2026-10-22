import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Search,
  Plus,
  Phone,
  Eye,
  Camera,
  X,
  AlertCircle,
  CheckCircle2,
  FileText,
  Upload,
  Calendar,
  Lock,
  UserCheck,
  MapPin,
  Image as ImageIcon
} from 'lucide-react';
import { api } from '../services/api';
import { formatCurrency, formatDate } from '../utils/formatters';

export default function Customers() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // FORM STATE
  // Step 1: Customer Personal Details
  const [fullName, setFullName] = useState('');
  const [dob, setDob] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [altMobile, setAltMobile] = useState('');

  // Step 2: Customer Address
  const [street, setStreet] = useState('');
  const [villageTown, setVillageTown] = useState('');
  const [district, setDistrict] = useState('');
  const [stateName, setStateName] = useState('Tamil Nadu');
  const [pincode, setPincode] = useState('');

  // Step 3: Customer Photos (up to 4)
  const [photoFiles, setPhotoFiles] = useState([]);
  const [photoPreviews, setPhotoPreviews] = useState([]);

  // Step 4: Customer Aadhaar Documents
  const [aadhaarFront, setAadhaarFront] = useState(null);
  const [aadhaarFrontPreview, setAadhaarFrontPreview] = useState(null);
  const [aadhaarBack, setAadhaarBack] = useState(null);
  const [aadhaarBackPreview, setAadhaarBackPreview] = useState(null);

  // Step 5: Nominee Details & Documents
  const [nomineeName, setNomineeName] = useState('');
  const [nomineeMobile, setNomineeMobile] = useState('');
  const [nomineeRelationship, setNomineeRelationship] = useState('Spouse');
  const [nomineeAddress, setNomineeAddress] = useState('');
  const [nomineeAadhaarFront, setNomineeAadhaarFront] = useState(null);
  const [nomineeAadhaarFrontPreview, setNomineeAadhaarFrontPreview] = useState(null);
  const [nomineeAadhaarBack, setNomineeAadhaarBack] = useState(null);
  const [nomineeAadhaarBackPreview, setNomineeAadhaarBackPreview] = useState(null);

  // Step 6: Internal Notes
  const [notes, setNotes] = useState('');

  // Submission state
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    fetchCustomers();
  }, [statusFilter]);

  async function fetchCustomers(searchTerm = search) {
    try {
      setLoading(true);
      const params = {};
      if (statusFilter !== 'ALL') params.status = statusFilter;
      if (searchTerm.trim()) params.search = searchTerm.trim();
      const res = await api.getCustomers(params);
      setCustomers(res.customers || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const handleMobileChange = (e) => {
    const val = e.target.value.replace(/[^0-9]/g, '').slice(0, 10);
    setMobileNumber(val);
  };

  const handleAltMobileChange = (e) => {
    const val = e.target.value.replace(/[^0-9]/g, '').slice(0, 10);
    setAltMobile(val);
  };

  const handleNomineeMobileChange = (e) => {
    const val = e.target.value.replace(/[^0-9]/g, '').slice(0, 10);
    setNomineeMobile(val);
  };

  // PHOTO SELECTION (Up to 4)
  const handlePhotoUpload = (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;

    const remainingSlots = 4 - photoFiles.length;
    if (remainingSlots <= 0) {
      alert('You can upload a maximum of 4 customer photographs.');
      return;
    }

    const newFiles = files.slice(0, remainingSlots);
    const newPreviews = newFiles.map(f => URL.createObjectURL(f));

    setPhotoFiles(prev => [...prev, ...newFiles]);
    setPhotoPreviews(prev => [...prev, ...newPreviews]);
  };

  const handleRemovePhoto = (index) => {
    setPhotoFiles(prev => prev.filter((_, i) => i !== index));
    setPhotoPreviews(prev => prev.filter((_, i) => i !== index));
  };

  // DOCUMENT HANDLERS
  const handleFilePreview = (file, setFile, setPreview) => {
    if (!file) return;
    setFile(file);
    if (file.type.startsWith('image/')) {
      setPreview(URL.createObjectURL(file));
    } else {
      setPreview('PDF_DOCUMENT');
    }
  };

  const handleClearFile = (setFile, setPreview) => {
    setFile(null);
    setPreview(null);
  };

  // SUBMIT PROFILE CREATION
  const handleCreateCustomer = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!fullName.trim()) {
      setFormError('Customer Full Name is required.');
      return;
    }

    if (!mobileNumber || mobileNumber.length !== 10) {
      setFormError('A valid 10-digit mobile number is required.');
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('full_name', fullName.trim());
      formData.append('mobile_number', mobileNumber.trim());

      if (altMobile) formData.append('alt_mobile', altMobile.trim());
      if (dob) formData.append('dob', dob);

      // Address fields
      if (street) formData.append('street', street.trim());
      if (villageTown) formData.append('village_town', villageTown.trim());
      if (district) formData.append('district', district.trim());
      if (stateName) formData.append('state', stateName.trim());
      if (pincode) formData.append('pincode', pincode.trim());

      // Nominee fields
      if (nomineeName) formData.append('nominee_name', nomineeName.trim());
      if (nomineeMobile) formData.append('nominee_mobile', nomineeMobile.trim());
      if (nomineeRelationship) formData.append('nominee_relationship', nomineeRelationship);
      if (nomineeAddress) formData.append('nominee_address', nomineeAddress.trim());

      // Notes
      if (notes) formData.append('notes', notes.trim());

      // Files: Photos
      photoFiles.forEach(file => {
        formData.append('photos', file);
      });

      // Files: Customer Aadhaar
      if (aadhaarFront) formData.append('aadhaar_front', aadhaarFront);
      if (aadhaarBack) formData.append('aadhaar_back', aadhaarBack);

      // Files: Nominee Aadhaar
      if (nomineeAadhaarFront) formData.append('nominee_aadhaar_front', nomineeAadhaarFront);
      if (nomineeAadhaarBack) formData.append('nominee_aadhaar_back', nomineeAadhaarBack);

      const res = await api.createCustomer(formData);
      setIsModalOpen(false);
      resetForm();
      fetchCustomers();
      navigate(`/customers/${res.customer.id}`);
    } catch (err) {
      setFormError(err.message || 'Failed to create customer profile.');
    } finally {
      setSubmitting(false);
    }
  };

  function resetForm() {
    setFullName('');
    setDob('');
    setMobileNumber('');
    setAltMobile('');
    setStreet('');
    setVillageTown('');
    setDistrict('');
    setStateName('Tamil Nadu');
    setPincode('');
    setPhotoFiles([]);
    setPhotoPreviews([]);
    setAadhaarFront(null);
    setAadhaarFrontPreview(null);
    setAadhaarBack(null);
    setAadhaarBackPreview(null);
    setNomineeName('');
    setNomineeMobile('');
    setNomineeRelationship('Spouse');
    setNomineeAddress('');
    setNomineeAadhaarFront(null);
    setNomineeAadhaarFrontPreview(null);
    setNomineeAadhaarBack(null);
    setNomineeAadhaarBackPreview(null);
    setNotes('');
    setFormError('');
  }

  return (
    <div className="space-y-6">
      {/* Top Banner & Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-blue-50 text-blue-600">
              <Users className="w-5 h-5" />
            </span>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Customer Directory</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Manage customer records, contact info, photo galleries, KYC documents, and nominee details.
          </p>
        </div>

        <button
          onClick={() => {
            resetForm();
            setIsModalOpen(true);
          }}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 text-white font-semibold text-xs hover:bg-blue-700 shadow-md shadow-blue-500/20 transition-all active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>New Customer</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by ID, Name, Mobile, Nominee..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              fetchCustomers(e.target.value);
            }}
            className="w-full pl-10 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs font-semibold text-slate-500">Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs font-semibold px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none"
          >
            <option value="ALL">All Customers</option>
            <option value="ACTIVE">Active</option>
            <option value="ARCHIVED">Archived</option>
            <option value="INACTIVE">Inactive</option>
            <option value="BLACKLISTED">Blacklisted</option>
          </select>
        </div>
      </div>

      {/* Customers Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-400">Loading customers...</div>
        ) : customers.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-400 space-y-2">
            <Users className="w-8 h-8 mx-auto text-slate-300" />
            <p>No customers found matching your criteria.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50 text-slate-400 uppercase font-semibold text-[10px] tracking-wider">
                  <th className="p-3.5 pl-5">Customer ID</th>
                  <th className="p-3.5">Full Name</th>
                  <th className="p-3.5">Mobile Number</th>
                  <th className="p-3.5">Town / City</th>
                  <th className="p-3.5 text-center">Active Loans</th>
                  <th className="p-3.5 text-right">Outstanding</th>
                  <th className="p-3.5 text-center">Status</th>
                  <th className="p-3.5 pr-5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {customers.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="p-3.5 pl-5 font-mono font-bold text-blue-600">{c.id}</td>
                    <td className="p-3.5 font-bold text-slate-800">{c.full_name}</td>
                    <td className="p-3.5 font-mono text-slate-600">
                      <div className="flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        <span>+91 {c.mobile_number}</span>
                      </div>
                    </td>
                    <td className="p-3.5 text-slate-600">
                      {c.village_town || c.district || (
                        <span className="text-slate-400 italic">None</span>
                      )}
                    </td>
                    <td className="p-3.5 text-center font-medium">
                      {c.active_loans > 0 ? (
                        <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                          {c.active_loans} Active
                        </span>
                      ) : (
                        <span className="text-slate-400">0</span>
                      )}
                    </td>
                    <td className="p-3.5 font-mono font-bold text-slate-900 text-right">
                      {formatCurrency(c.total_outstanding)}
                    </td>
                    <td className="p-3.5 text-center">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        c.status === 'ACTIVE'
                          ? 'bg-emerald-100 text-emerald-800'
                          : c.status === 'ARCHIVED'
                          ? 'bg-slate-200 text-slate-700'
                          : c.status === 'BLACKLISTED'
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-slate-100 text-slate-600'
                      }`}>
                        {c.status}
                      </span>
                    </td>
                    <td className="p-3.5 pr-5 text-right">
                      <button
                        onClick={() => navigate(`/customers/${c.id}`)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 font-semibold text-slate-700 transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>View</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* NEW CUSTOMER REGISTRATION MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6">
          <div className="bg-white rounded-3xl max-w-3xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
            
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="font-bold text-sm text-slate-900">New Customer Registration</h3>
                <p className="text-[11px] text-slate-500">Fill in customer personal info, address, photographs, KYC Aadhaar, and nominee details</p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-full hover:bg-slate-200 text-slate-400 hover:text-slate-700 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form Content */}
            <form onSubmit={handleCreateCustomer} className="p-6 overflow-y-auto space-y-6 text-xs">
              
              {formError && (
                <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span className="font-semibold">{formError}</span>
                </div>
              )}

              {/* SECTION 1: Customer Personal Details */}
              <div className="bg-slate-50/70 p-4 rounded-2xl border border-slate-200/80 space-y-3">
                <div className="flex items-center gap-2 font-bold text-slate-800 uppercase tracking-wider text-[11px]">
                  <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px]">1</span>
                  <span>Customer Personal Details</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Full Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Ramesh Kumar S"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Date of Birth</label>
                    <input
                      type="date"
                      value={dob}
                      onChange={(e) => setDob(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Registered Mobile Number (10 digits) <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-mono font-semibold">+91</span>
                      <input
                        type="tel"
                        required
                        placeholder="9876543210"
                        value={mobileNumber}
                        onChange={handleMobileChange}
                        className="w-full pl-12 pr-4 py-2 border border-slate-300 rounded-xl bg-white font-mono font-bold"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Alternate Mobile Number (Optional)</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-mono font-semibold">+91</span>
                      <input
                        type="tel"
                        placeholder="Optional second number"
                        value={altMobile}
                        onChange={handleAltMobileChange}
                        className="w-full pl-12 pr-4 py-2 border border-slate-300 rounded-xl bg-white font-mono"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION 2: Customer Address */}
              <div className="bg-slate-50/70 p-4 rounded-2xl border border-slate-200/80 space-y-3">
                <div className="flex items-center gap-2 font-bold text-slate-800 uppercase tracking-wider text-[11px]">
                  <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px]">2</span>
                  <span>Residential Address</span>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Door No. & Street Address</label>
                    <input
                      type="text"
                      placeholder="e.g. 12/4B, Gandhi Street"
                      value={street}
                      onChange={(e) => setStreet(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white"
                    />
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Village / Town</label>
                      <input
                        type="text"
                        placeholder="Town / City"
                        value={villageTown}
                        onChange={(e) => setVillageTown(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">District</label>
                      <input
                        type="text"
                        placeholder="District"
                        value={district}
                        onChange={(e) => setDistrict(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">State</label>
                      <input
                        type="text"
                        placeholder="State"
                        value={stateName}
                        onChange={(e) => setStateName(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">PIN Code</label>
                      <input
                        type="text"
                        placeholder="600001"
                        maxLength={6}
                        value={pincode}
                        onChange={(e) => setPincode(e.target.value.replace(/[^0-9]/g, ''))}
                        className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white font-mono"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION 3: Customer Photographs (up to 4) */}
              <div className="bg-slate-50/70 p-4 rounded-2xl border border-slate-200/80 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-bold text-slate-800 uppercase tracking-wider text-[11px]">
                    <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px]">3</span>
                    <span>Customer Photographs ({photoFiles.length} / 4)</span>
                  </div>
                  <span className="text-[10px] text-slate-400">Up to 4 photos</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {photoPreviews.map((url, idx) => (
                    <div key={idx} className="relative group rounded-xl overflow-hidden border border-slate-200 aspect-square bg-slate-100">
                      <img src={url} alt={`Upload preview ${idx + 1}`} className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => handleRemovePhoto(idx)}
                        className="absolute top-1 right-1 p-1 rounded-full bg-rose-600 text-white shadow-md opacity-90 hover:opacity-100"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                      <span className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded bg-black/60 text-white text-[9px] font-mono">
                        Photo {idx + 1}
                      </span>
                    </div>
                  ))}

                  {photoFiles.length < 4 && (
                    <label className="flex flex-col items-center justify-center aspect-square rounded-xl border-2 border-dashed border-slate-300 hover:border-blue-500 bg-white hover:bg-blue-50/20 cursor-pointer transition-colors p-2 text-center">
                      <Camera className="w-6 h-6 text-slate-400 mb-1" />
                      <span className="font-semibold text-slate-600 text-[10px]">Add Photo</span>
                      <span className="text-[9px] text-slate-400">Camera / File</span>
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handlePhotoUpload}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
              </div>

              {/* SECTION 4: Customer Aadhaar Documents */}
              <div className="bg-slate-50/70 p-4 rounded-2xl border border-slate-200/80 space-y-3">
                <div className="flex items-center gap-2 font-bold text-slate-800 uppercase tracking-wider text-[11px]">
                  <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px]">4</span>
                  <span>Customer Aadhaar Card Documents</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Aadhaar Front */}
                  <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-2">
                    <p className="font-bold text-slate-700 text-[11px]">Aadhaar Card Front</p>
                    {aadhaarFrontPreview ? (
                      <div className="relative rounded-lg overflow-hidden border border-slate-200 aspect-[16/10] bg-slate-100">
                        {aadhaarFrontPreview === 'PDF_DOCUMENT' ? (
                          <div className="w-full h-full flex flex-col items-center justify-center text-slate-500">
                            <FileText className="w-8 h-8 text-rose-500 mb-1" />
                            <span className="font-mono text-[10px]">{aadhaarFront?.name}</span>
                          </div>
                        ) : (
                          <img src={aadhaarFrontPreview} alt="Aadhaar Front Preview" className="w-full h-full object-cover" />
                        )}
                        <button
                          type="button"
                          onClick={() => handleClearFile(setAadhaarFront, setAadhaarFrontPreview)}
                          className="absolute top-1 right-1 p-1 rounded-full bg-rose-600 text-white shadow-md hover:bg-rose-700"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <label className="flex flex-col items-center justify-center aspect-[16/10] rounded-lg border-2 border-dashed border-slate-300 hover:border-blue-500 hover:bg-blue-50/30 cursor-pointer transition-colors p-3 text-center">
                        <Upload className="w-5 h-5 text-slate-400 mb-1" />
                        <span className="font-semibold text-slate-700 text-[11px]">Upload Front Image / PDF</span>
                        <input
                          type="file"
                          accept="image/*,application/pdf"
                          onChange={(e) => handleFilePreview(e.target.files[0], setAadhaarFront, setAadhaarFrontPreview)}
                          className="hidden"
                        />
                      </label>
                    )}
                  </div>

                  {/* Aadhaar Back */}
                  <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-2">
                    <p className="font-bold text-slate-700 text-[11px]">Aadhaar Card Back</p>
                    {aadhaarBackPreview ? (
                      <div className="relative rounded-lg overflow-hidden border border-slate-200 aspect-[16/10] bg-slate-100">
                        {aadhaarBackPreview === 'PDF_DOCUMENT' ? (
                          <div className="w-full h-full flex flex-col items-center justify-center text-slate-500">
                            <FileText className="w-8 h-8 text-rose-500 mb-1" />
                            <span className="font-mono text-[10px]">{aadhaarBack?.name}</span>
                          </div>
                        ) : (
                          <img src={aadhaarBackPreview} alt="Aadhaar Back Preview" className="w-full h-full object-cover" />
                        )}
                        <button
                          type="button"
                          onClick={() => handleClearFile(setAadhaarBack, setAadhaarBackPreview)}
                          className="absolute top-1 right-1 p-1 rounded-full bg-rose-600 text-white shadow-md hover:bg-rose-700"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <label className="flex flex-col items-center justify-center aspect-[16/10] rounded-lg border-2 border-dashed border-slate-300 hover:border-blue-500 hover:bg-blue-50/30 cursor-pointer transition-colors p-3 text-center">
                        <Upload className="w-5 h-5 text-slate-400 mb-1" />
                        <span className="font-semibold text-slate-700 text-[11px]">Upload Back Image / PDF</span>
                        <input
                          type="file"
                          accept="image/*,application/pdf"
                          onChange={(e) => handleFilePreview(e.target.files[0], setAadhaarBack, setAadhaarBackPreview)}
                          className="hidden"
                        />
                      </label>
                    )}
                  </div>
                </div>
              </div>

              {/* SECTION 5: Nominee Details & Documents */}
              <div className="bg-indigo-50/40 p-4 rounded-2xl border border-indigo-200/80 space-y-3">
                <div className="flex items-center gap-2 font-bold text-slate-800 uppercase tracking-wider text-[11px]">
                  <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px]">5</span>
                  <span>Nominee Details & Nominee Documents</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Nominee Full Name</label>
                    <input
                      type="text"
                      placeholder="Nominee Name"
                      value={nomineeName}
                      onChange={(e) => setNomineeName(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Nominee Mobile Number</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-mono font-semibold">+91</span>
                      <input
                        type="tel"
                        placeholder="9876543210"
                        value={nomineeMobile}
                        onChange={handleNomineeMobileChange}
                        className="w-full pl-12 pr-4 py-2 border border-slate-300 rounded-xl bg-white font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Relationship to Customer</label>
                    <select
                      value={nomineeRelationship}
                      onChange={(e) => setNomineeRelationship(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white"
                    >
                      <option value="Spouse">Spouse</option>
                      <option value="Father">Father</option>
                      <option value="Mother">Mother</option>
                      <option value="Son">Son</option>
                      <option value="Daughter">Daughter</option>
                      <option value="Brother">Brother</option>
                      <option value="Sister">Sister</option>
                      <option value="Relative">Relative</option>
                      <option value="Friend">Friend</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Nominee Residential Address</label>
                  <textarea
                    rows={2}
                    placeholder="Nominee street, door number, town, pincode..."
                    value={nomineeAddress}
                    onChange={(e) => setNomineeAddress(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white"
                  />
                </div>

                {/* Nominee Aadhaar Front & Back */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <div className="p-3 bg-white rounded-xl border border-indigo-200/80 space-y-2">
                    <p className="font-bold text-slate-700 text-[11px]">Nominee Aadhaar Front</p>
                    {nomineeAadhaarFrontPreview ? (
                      <div className="relative rounded-lg overflow-hidden border border-slate-200 aspect-[16/10] bg-slate-100">
                        {nomineeAadhaarFrontPreview === 'PDF_DOCUMENT' ? (
                          <div className="w-full h-full flex flex-col items-center justify-center text-slate-500">
                            <FileText className="w-8 h-8 text-rose-500 mb-1" />
                            <span className="font-mono text-[10px]">{nomineeAadhaarFront?.name}</span>
                          </div>
                        ) : (
                          <img src={nomineeAadhaarFrontPreview} alt="Nominee Aadhaar Front" className="w-full h-full object-cover" />
                        )}
                        <button
                          type="button"
                          onClick={() => handleClearFile(setNomineeAadhaarFront, setNomineeAadhaarFrontPreview)}
                          className="absolute top-1 right-1 p-1 rounded-full bg-rose-600 text-white shadow-md hover:bg-rose-700"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <label className="flex flex-col items-center justify-center aspect-[16/10] rounded-lg border-2 border-dashed border-indigo-300 hover:border-indigo-500 hover:bg-indigo-50/30 cursor-pointer transition-colors p-3 text-center">
                        <Upload className="w-5 h-5 text-indigo-400 mb-1" />
                        <span className="font-semibold text-indigo-900 text-[11px]">Upload Nominee Aadhaar Front</span>
                        <input
                          type="file"
                          accept="image/*,application/pdf"
                          onChange={(e) => handleFilePreview(e.target.files[0], setNomineeAadhaarFront, setNomineeAadhaarFrontPreview)}
                          className="hidden"
                        />
                      </label>
                    )}
                  </div>

                  <div className="p-3 bg-white rounded-xl border border-indigo-200/80 space-y-2">
                    <p className="font-bold text-slate-700 text-[11px]">Nominee Aadhaar Back</p>
                    {nomineeAadhaarBackPreview ? (
                      <div className="relative rounded-lg overflow-hidden border border-slate-200 aspect-[16/10] bg-slate-100">
                        {nomineeAadhaarBackPreview === 'PDF_DOCUMENT' ? (
                          <div className="w-full h-full flex flex-col items-center justify-center text-slate-500">
                            <FileText className="w-8 h-8 text-rose-500 mb-1" />
                            <span className="font-mono text-[10px]">{nomineeAadhaarBack?.name}</span>
                          </div>
                        ) : (
                          <img src={nomineeAadhaarBackPreview} alt="Nominee Aadhaar Back" className="w-full h-full object-cover" />
                        )}
                        <button
                          type="button"
                          onClick={() => handleClearFile(setNomineeAadhaarBack, setNomineeAadhaarBackPreview)}
                          className="absolute top-1 right-1 p-1 rounded-full bg-rose-600 text-white shadow-md hover:bg-rose-700"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <label className="flex flex-col items-center justify-center aspect-[16/10] rounded-lg border-2 border-dashed border-indigo-300 hover:border-indigo-500 hover:bg-indigo-50/30 cursor-pointer transition-colors p-3 text-center">
                        <Upload className="w-5 h-5 text-indigo-400 mb-1" />
                        <span className="font-semibold text-indigo-900 text-[11px]">Upload Nominee Aadhaar Back</span>
                        <input
                          type="file"
                          accept="image/*,application/pdf"
                          onChange={(e) => handleFilePreview(e.target.files[0], setNomineeAadhaarBack, setNomineeAadhaarBackPreview)}
                          className="hidden"
                        />
                      </label>
                    )}
                  </div>
                </div>
              </div>

              {/* SECTION 6: Administrative Notes */}
              <div className="bg-slate-50/70 p-4 rounded-2xl border border-slate-200/80 space-y-3">
                <div className="flex items-center gap-2 font-bold text-slate-800 uppercase tracking-wider text-[11px]">
                  <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px]">6</span>
                  <span>Internal Administrative Notes</span>
                </div>
                <textarea
                  rows={2}
                  placeholder="Record internal business credit notes, guarantor references, or special remarks..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white"
                />
              </div>

              {/* Submit Action */}
              <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 font-semibold hover:bg-slate-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 shadow-lg shadow-blue-500/25 transition-all disabled:opacity-50"
                >
                  {submitting ? 'Creating Profile...' : 'Create Customer Profile'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}
    </div>
  );
}
