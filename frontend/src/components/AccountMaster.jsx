import React, { useState, useEffect, useMemo } from 'react';
import { mastersAPI } from '../service/api';
import { 
    Plus, Edit, Trash2, X, ChevronLeft, 
    ChevronRight, Loader2, CheckSquare, Square, RefreshCw, 
    Save, CheckCircle2, Phone, MapPin, Building2, Search,
    Filter, Scale, Mail, Layers, Boxes, LayoutGrid
} from 'lucide-react';

const AccountMaster = () => {
    // --- State Management ---
    const [list, setList] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [submitLoading, setSubmitLoading] = useState(false);
    
    // Selection & Bulk Actions
    const [isSelectionMode, setIsSelectionMode] = useState(false);
    const [selectedIds, setSelectedIds] = useState([]);
    
    // Success Animation State
    const [showSuccess, setShowSuccess] = useState(false);
    const [successMessage, setSuccessMessage] = useState("");
    
    // Search & Filtering
    const [searchField, setSearchField] = useState('account_name');
    const [searchCondition, setSearchCondition] = useState('Like');
    const [searchValue, setSearchValue] = useState('');

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(10);

    const emptyState = {
        id: null, 
        account_code: '', 
        account_name: '', 
        sub_group: '', // New Field
        group: 'DEBTORS', // New Field
        main_group: 'ASSETS', // New Field
        place: '', 
        phone_no: '', 
        email: '',
        address: '', 
        pincode: '', 
        state: '',
        delivery_address: '', 
        tin_no: '', 
        cst_no: '', 
        fax: '', 
        website: '', 
        bank_account_no: '',
        contact_person: '', 
        cell_no: '', 
        gst_no: '',
        opening_credit: 0, 
        opening_debit: 0
    };

    const [formData, setFormData] = useState(emptyState);

    // --- API Integration ---
    useEffect(() => {
        fetchRecords();
    }, []);

    const fetchRecords = async () => {
        setLoading(true);
        try {
            const res = await mastersAPI.accounts.getAll();
            const rawData = res?.data?.data || res?.data || [];
            setList(Array.isArray(rawData) ? rawData : []);
        } catch (err) { 
            console.error("Fetch error:", err); 
            setList([]);
        } finally { 
            setLoading(false); 
        }
    };

    const triggerSuccess = (msg) => {
        setSuccessMessage(msg);
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 2000);
    };

    // --- Search Logic ---
    const filteredData = useMemo(() => {
        let result = Array.isArray(list) ? [...list] : [];
        if (searchValue.trim()) {
            result = result.filter(item => {
                const itemValue = String(item[searchField] || '').toLowerCase();
                const filterValue = searchValue.toLowerCase().trim();
                return searchCondition === 'Equal' ? itemValue === filterValue : itemValue.includes(filterValue);
            });
        }
        return result;
    }, [list, searchValue, searchField, searchCondition]);

    const totalPages = Math.ceil(filteredData.length / itemsPerPage) || 1;
    const currentItems = filteredData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    useEffect(() => { setCurrentPage(1); }, [searchValue, searchField]);

    // --- Actions ---
    const handleAddNew = () => {
        const safeList = Array.isArray(list) ? list : [];
        const maxCode = safeList.reduce((max, item) => {
            const currentCode = parseInt(item.account_code, 10);
            return !isNaN(currentCode) && currentCode > max ? currentCode : max;
        }, 0);
        setFormData({ ...emptyState, account_code: (maxCode + 1).toString() });
        setIsModalOpen(true);
    };

    const handleEdit = (item) => {
        if (isSelectionMode) {
            setSelectedIds(prev => prev.includes(item.id) ? prev.filter(i => i !== item.id) : [...prev, item.id]);
            return;
        }
        setFormData({ ...item });
        setIsModalOpen(true);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setSubmitLoading(true);
        try {
            const isUpdate = !!formData.id;
            if (isUpdate) await mastersAPI.accounts.update(formData.id, formData);
            else await mastersAPI.accounts.create(formData);
            fetchRecords();
            setIsModalOpen(false);
            triggerSuccess(isUpdate ? "Account Updated!" : "Account Created!");
        } catch (err) { alert("Error saving record."); } 
        finally { setSubmitLoading(false); }
    };

    return (
        <div className="min-h-screen bg-slate-50 p-6 font-sans text-slate-900">
            {/* SUCCESS OVERLAY */}
            {showSuccess && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white p-10 rounded-[2.5rem] shadow-2xl flex flex-col items-center gap-4 scale-110">
                        <CheckCircle2 size={80} className="text-emerald-500 animate-bounce" />
                        <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tight">{successMessage}</h3>
                    </div>
                </div>
            )}

            {/* HEADER */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <Building2 className="text-blue-600" /> Account Master
                    </h1>
                    <p className="text-sm text-slate-500 font-semibold tracking-tight text-slate-400">Manage organizational accounts, grouping hierarchy, and contact registry</p>
                </div>
                <div className="flex gap-2 w-full md:w-auto">
                    <button onClick={() => {setIsSelectionMode(!isSelectionMode); setSelectedIds([]);}} className={`flex-1 md:flex-none px-5 py-2 border-2 rounded-lg font-bold text-sm transition-all ${isSelectionMode ? 'bg-amber-50 border-amber-200 text-amber-600' : 'bg-white border-slate-200 text-blue-600 hover:bg-slate-50'}`}>
                        {isSelectionMode ? 'Cancel' : 'Select'}
                    </button>
                    <button onClick={handleAddNew} className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg font-semibold shadow-sm transition-all active:scale-95">
                        <Plus size={18} /> New Account
                    </button>
                    <button onClick={fetchRecords} className="p-2 border border-slate-200 bg-white text-slate-400 rounded-lg hover:bg-slate-50 transition-all">
                        <RefreshCw size={18} className={loading ? 'animate-spin text-blue-600' : ''} />
                    </button>
                </div>
            </div>

            {/* SEARCH */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm mb-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Search Field</label>
                        <select value={searchField} onChange={(e) => setSearchField(e.target.value)} className="w-full border border-slate-200 p-2 rounded-lg text-sm outline-none font-semibold bg-slate-50">
                            <option value="account_name">Account Name</option>
                            <option value="account_code">Account Code</option>
                            <option value="place">Place / Region</option>
                            <option value="gst_no">GSTIN No.</option>
                        </select>
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Condition</label>
                        <select value={searchCondition} onChange={(e) => setSearchCondition(e.target.value)} className="w-full border border-slate-200 p-2 rounded-lg text-sm outline-none font-semibold bg-slate-50">
                            <option value="Like">Contains</option>
                            <option value="Equal">Exact</option>
                        </select>
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Search Value</label>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                            <input type="text" value={searchValue} onChange={(e) => setSearchValue(e.target.value)} className="w-full border border-slate-200 pl-10 pr-3 py-2 rounded-lg text-sm outline-none font-semibold" placeholder="Start typing..." />
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={() => setSearchValue('')} className="flex-1 border border-slate-200 py-2 rounded-lg text-[10px] font-black hover:bg-slate-50 uppercase tracking-widest">Clear</button>
                        <div className="flex-[2] bg-blue-600 text-white py-2 rounded-lg text-[10px] font-black uppercase flex items-center justify-center gap-2 shadow-md shadow-blue-100">
                            <Filter size={14}/> {filteredData.length} Records
                        </div>
                    </div>
                </div>
            </div>

            {/* SCROLLABLE TABLE CONTAINER */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[1200px]">
                        <thead>
                            <tr className="bg-slate-900 text-slate-200 text-[11px] font-black uppercase tracking-widest">
                                {isSelectionMode && <th className="p-4 w-12 text-center sticky left-0 bg-slate-900 z-10 border-r border-slate-800">#</th>}
                                <th className="p-4 border-r border-slate-800">Code</th>
                                <th className="p-4 border-r border-slate-800">Account Name</th>
                                <th className="p-4 border-r border-slate-800">Sub Group</th>
                                <th className="p-4 border-r border-slate-800">Group</th>
                                <th className="p-4 border-r border-slate-800">Main</th>
                                <th className="p-4 border-r border-slate-800">Place</th>
                                <th className="p-4 border-r border-slate-800">Phone No</th>
                                <th className="p-4 border-r border-slate-800">Email Address</th>
                                <th className="p-4 text-center sticky right-0 bg-slate-900 z-10 border-l border-slate-800">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr><td colSpan="10" className="p-20 text-center"><Loader2 className="animate-spin mx-auto text-blue-500" size={40} /></td></tr>
                            ) : currentItems.length > 0 ? (
                                currentItems.map((item) => (
                                    <tr key={item.id} onClick={() => handleEdit(item)} className={`hover:bg-blue-50/50 cursor-pointer transition-colors group ${selectedIds.includes(item.id) ? 'bg-blue-50' : ''}`}>
                                        {isSelectionMode && (
                                            <td className="p-4 text-center sticky left-0 bg-white group-hover:bg-blue-50 z-10 border-r" onClick={(e) => e.stopPropagation()}>
                                                {selectedIds.includes(item.id) ? <CheckSquare size={18} className="text-blue-600 mx-auto"/> : <Square size={18} className="text-slate-200 mx-auto"/>}
                                            </td>
                                        )}
                                        <td className="p-4 text-xs font-mono font-bold text-blue-600 bg-slate-50/30">{item.account_code}</td>
                                        <td className="p-4">
                                            <div className="text-sm font-black text-slate-700 uppercase leading-none mb-1">{item.account_name}</div>
                                            <div className="text-[9px] text-slate-400 font-bold tracking-tighter">{item.gst_no || 'NO GST'}</div>
                                        </td>
                                        <td className="p-4 text-[11px] font-bold text-slate-600 uppercase italic">{item.sub_group || '---'}</td>
                                        <td className="p-4">
                                            <span className="px-2 py-1 bg-blue-50 text-blue-600 rounded text-[10px] font-black uppercase">{item.group || 'GENERAL'}</span>
                                        </td>
                                        <td className="p-4 text-[11px] font-black text-slate-400 uppercase">{item.main_group || 'ASSET'}</td>
                                        <td className="p-4">
                                            <div className="flex items-center gap-1 text-[11px] font-bold text-slate-600 uppercase">
                                                <MapPin size={12} className="text-slate-300" /> {item.place || 'LOCAL'}
                                            </div>
                                        </td>
                                        <td className="p-4 text-xs font-bold text-slate-600 whitespace-nowrap">
                                            <div className="flex items-center gap-2"><Phone size={12} className="text-emerald-500"/> {item.phone_no || item.cell_no || 'N/A'}</div>
                                        </td>
                                        <td className="p-4 text-[11px] text-slate-500 font-medium">
                                            <div className="flex items-center gap-2"><Mail size={12} className="text-blue-400"/> {item.email || 'N/A'}</div>
                                        </td>
                                        <td className="p-4 text-center sticky right-0 bg-white group-hover:bg-blue-50 z-10 border-l" onClick={(e) => e.stopPropagation()}>
                                            <div className="flex justify-center gap-1">
                                                <button onClick={() => handleEdit(item)} className="p-2 text-slate-400 hover:text-blue-600 transition-all"><Edit size={16}/></button>
                                                <button onClick={() => {if(window.confirm("Delete?")) mastersAPI.accounts.delete(item.id).then(fetchRecords); }} className="p-2 text-slate-400 hover:text-red-500 transition-all"><Trash2 size={16}/></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr><td colSpan="10" className="p-24 text-center text-slate-300 font-black uppercase tracking-widest text-xl opacity-20">Data Not Found</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* PAGINATION */}
                <div className="p-4 bg-slate-50 border-t flex items-center justify-between">
                    <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest">
                        Showing {currentItems.length} of {filteredData.length}
                    </span>
                    <div className="flex items-center gap-4">
                        <div className="flex gap-1">
                            <button disabled={currentPage === 1} onClick={() => setCurrentPage(prev => prev - 1)} className="p-2 border rounded-lg bg-white hover:bg-slate-50 disabled:opacity-30 transition-all">
                                <ChevronLeft size={16}/>
                            </button>
                            <div className="flex items-center px-4 text-[11px] font-black text-slate-600 bg-white border rounded-lg">
                                {currentPage} / {totalPages}
                            </div>
                            <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(prev => prev + 1)} className="p-2 border rounded-lg bg-white hover:bg-slate-50 disabled:opacity-30 transition-all">
                                <ChevronRight size={16}/>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* MODAL */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-6xl overflow-hidden animate-in fade-in zoom-in duration-300 my-8 border border-white/20">
                        <div className="bg-blue-600 p-5 flex justify-between items-center text-white">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-white/20 rounded-xl"><Building2 size={24} /></div>
                                <div>
                                    <h2 className="font-black uppercase tracking-tight text-lg leading-none">{formData.id ? 'Modify Account' : 'New Account Registry'}</h2>
                                    <p className="text-[10px] font-bold text-blue-200 mt-1 uppercase tracking-widest opacity-80">Financial Year 2025-26</p>
                                </div>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="hover:bg-white/10 p-2 rounded-full transition-colors"><X size={24}/></button>
                        </div>
                        
                        <form onSubmit={handleSave} className="p-8">
                            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                                {/* LEFT SECTION: Identity & Contact */}
                                <div className="lg:col-span-8 space-y-8">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-1 md:col-span-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Account Name *</label>
                                            <input required className="w-full border-2 border-slate-100 p-4 rounded-2xl font-black text-slate-700 uppercase focus:border-blue-500 outline-none transition-all text-lg shadow-sm" value={formData.account_name} onChange={e => setFormData({...formData, account_name: e.target.value.toUpperCase()})} placeholder="e.g. TEXTILE SOLUTIONS PVT LTD" />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Account Code</label>
                                            <div className="relative">
                                                <input className="w-full border-2 border-slate-100 p-3 rounded-xl bg-slate-50 font-mono text-blue-600 font-bold" readOnly value={formData.account_code} />
                                            </div>
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black text-slate-400 uppercase ml-1">GSTIN Number</label>
                                            <input className="w-full border-2 border-blue-50 p-3 rounded-xl text-sm font-black text-blue-600 bg-blue-50/30 uppercase tracking-widest" value={formData.gst_no} onChange={e => setFormData({...formData, gst_no: e.target.value.toUpperCase()})} placeholder="22AAAAA0000A1Z5" />
                                        </div>
                                    </div>

                                    {/* HIERARCHY SECTION */}
                                    <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                                        <div className="flex items-center gap-2 mb-4 border-b border-slate-200 pb-2">
                                            <Layers size={16} className="text-blue-500" />
                                            <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Grouping Hierarchy</h3>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-black text-slate-400 uppercase block ml-1">Main Group</label>
                                                <div className="relative">
                                                    <LayoutGrid size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" />
                                                    <select value={formData.main_group} onChange={e => setFormData({...formData, main_group: e.target.value})} className="w-full border-2 border-white pl-9 p-3 rounded-xl font-bold text-xs shadow-sm bg-white">
                                                        <option value="ASSETS">ASSETS</option>
                                                        <option value="LIABILITIES">LIABILITIES</option>
                                                        <option value="INCOME">INCOME</option>
                                                        <option value="EXPENSE">EXPENSE</option>
                                                    </select>
                                                </div>
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-black text-slate-400 uppercase block ml-1">Primary Group</label>
                                                <div className="relative">
                                                    <Boxes size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" />
                                                    <input className="w-full border-2 border-white pl-9 p-3 rounded-xl font-bold text-xs shadow-sm bg-white uppercase" value={formData.group} onChange={e => setFormData({...formData, group: e.target.value.toUpperCase()})} />
                                                </div>
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-black text-slate-400 uppercase block ml-1">Sub Group</label>
                                                <input className="w-full border-2 border-white p-3 rounded-xl font-bold text-xs shadow-sm bg-white uppercase" value={formData.sub_group} onChange={e => setFormData({...formData, sub_group: e.target.value.toUpperCase()})} />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Place / City</label>
                                            <input className="w-full border-2 border-slate-100 p-3 rounded-xl text-sm font-bold uppercase" value={formData.place} onChange={e => setFormData({...formData, place: e.target.value.toUpperCase()})} />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Email Address</label>
                                            <input type="email" className="w-full border-2 border-slate-100 p-3 rounded-xl text-sm font-bold" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value.toLowerCase()})} />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Mobile No</label>
                                            <input className="w-full border-2 border-slate-100 p-3 rounded-xl text-sm font-bold" value={formData.phone_no} onChange={e => setFormData({...formData, phone_no: e.target.value})} />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Contact Person</label>
                                            <input className="w-full border-2 border-slate-100 p-3 rounded-xl text-sm font-bold uppercase" value={formData.contact_person} onChange={e => setFormData({...formData, contact_person: e.target.value.toUpperCase()})} />
                                        </div>
                                    </div>
                                </div>

                                {/* RIGHT SECTION: Financials */}
                                <div className="lg:col-span-4 bg-slate-900 rounded-[2.5rem] p-8 text-white flex flex-col gap-8 shadow-2xl h-fit">
                                    <div className="text-center">
                                        <Scale size={32} className="text-blue-400 mx-auto mb-3" />
                                        <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Opening Balance Sheet</p>
                                    </div>
                                    
                                    <div className="space-y-5">
                                        <div className="bg-emerald-500/10 p-5 rounded-3xl border border-emerald-500/20 group hover:border-emerald-500/50 transition-all">
                                            <label className="text-[10px] font-black text-emerald-400 uppercase block mb-2 opacity-70">Credit Amount (₹)</label>
                                            <input type="number" value={formData.opening_credit} onChange={e => setFormData({...formData, opening_credit: e.target.value})} className="w-full bg-transparent font-black text-emerald-400 outline-none text-2xl" />
                                        </div>
                                        
                                        <div className="bg-rose-500/10 p-5 rounded-3xl border border-rose-500/20 group hover:border-rose-500/50 transition-all">
                                            <label className="text-[10px] font-black text-rose-400 uppercase block mb-2 opacity-70">Debit Amount (₹)</label>
                                            <input type="number" value={formData.opening_debit} onChange={e => setFormData({...formData, opening_debit: e.target.value})} className="w-full bg-transparent font-black text-rose-400 outline-none text-2xl" />
                                        </div>

                                        <div className="pt-6 border-t border-slate-800 space-y-4">
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-bold text-slate-500 uppercase block ml-1">Bank Account</label>
                                                <input placeholder="A/C Number" value={formData.bank_account_no} onChange={e => setFormData({...formData, bank_account_no: e.target.value})} className="w-full bg-slate-800 border-none rounded-xl p-3 text-xs font-mono text-blue-200 placeholder:text-slate-600" />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-4 p-4 bg-blue-500/10 rounded-2xl border border-blue-500/20">
                                        <p className="text-[9px] text-blue-300 font-bold uppercase leading-relaxed text-center">Ensure all balances match the audited ledger of previous FY.</p>
                                    </div>
                                </div>
                            </div>

                            {/* FOOTER */}
                            <div className="mt-12 pt-8 border-t border-slate-100 flex justify-between items-center">
                                {formData.id && (
                                    <button type="button" onClick={() => {if(window.confirm("Archive this record?")) mastersAPI.accounts.delete(formData.id).then(() => {fetchRecords(); setIsModalOpen(false);})}} className="flex items-center gap-2 text-rose-500 font-black hover:bg-rose-50 px-5 py-3 rounded-2xl transition-all text-[11px] uppercase tracking-widest">
                                        <Trash2 size={18}/> Delete Record
                                    </button>
                                )}
                                <div className="flex gap-4 ml-auto">
                                    <button type="button" onClick={() => setIsModalOpen(false)} className="px-8 py-3 font-black text-slate-400 hover:text-slate-700 uppercase text-[11px] tracking-widest transition-all">Cancel</button>
                                    <button type="submit" disabled={submitLoading} className="bg-blue-600 hover:bg-blue-700 text-white px-12 py-4 rounded-2xl font-black shadow-xl shadow-blue-200 flex items-center gap-3 transition-all active:scale-95 uppercase text-[11px] tracking-widest">
                                        {submitLoading ? <Loader2 className="animate-spin" size={20} /> : <><Save size={20}/> {formData.id ? 'Apply Updates' : 'Secure Save'}</>}
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AccountMaster;