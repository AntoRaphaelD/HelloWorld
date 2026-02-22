import React, { useState, useEffect, useMemo } from 'react';
import { mastersAPI } from '../service/api';
import { 
    Plus, Edit, Trash2, X, ChevronLeft, 
    ChevronRight, Loader2, CheckSquare, Square, RefreshCw, 
    Save, CheckCircle2, Phone, MapPin, Building2, Globe, Search,
    Filter, Scale, ArrowRight
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
        id: null, account_code: '', account_group: 'DEBTORS - YARN SALES',
        account_name: '', place: '', address: '', pincode: '', state: '',
        delivery_address: '', tin_no: '', cst_no: '', phone_no: '',
        email: '', fax: '', website: '', bank_account_no: '',
        contact_person: '', cell_no: '', gst_no: '',
        opening_credit: 0, opening_debit: 0
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

    // --- Search Logic (useMemo) ---
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

    // --- Pagination Logic ---
    const totalPages = Math.ceil(filteredData.length / itemsPerPage) || 1;
    const indexOfLastItem = currentPage * itemsPerPage;
    const currentItems = filteredData.slice(indexOfLastItem - itemsPerPage, indexOfLastItem);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchValue, searchField, searchCondition]);

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
        } catch (err) { 
            alert("Error saving record."); 
        } finally { 
            setSubmitLoading(false); 
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 p-6 font-sans">
            
            {/* SUCCESS OVERLAY */}
            {showSuccess && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white p-10 rounded-[2.5rem] shadow-2xl flex flex-col items-center gap-4 scale-110">
                        <CheckCircle2 size={80} className="text-emerald-500 animate-bounce" />
                        <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tight">{successMessage}</h3>
                    </div>
                </div>
            )}

            {/* TOP HEADER */}
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <Building2 className="text-blue-600" /> Account Master
                    </h1>
                    <p className="text-sm text-slate-500 font-semibold">Manage client registry, financial balances and contact details</p>
                </div>
                
                <div className="flex gap-2">
                    <button 
                        onClick={() => {setIsSelectionMode(!isSelectionMode); setSelectedIds([]);}} 
                        className={`px-5 py-2 border-2 rounded-lg font-bold text-sm transition-all ${isSelectionMode ? 'bg-amber-50 border-amber-200 text-amber-600' : 'bg-white border-slate-200 text-blue-600 hover:bg-slate-50'}`}
                    >
                        {isSelectionMode ? 'Cancel Selection' : 'Select'}
                    </button>

                    <button onClick={handleAddNew} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg font-semibold shadow-sm transition-all active:scale-95">
                        <Plus size={18} /> New Account
                    </button>
                    
                    <button onClick={fetchRecords} className="px-5 py-2 border border-slate-200 bg-white text-slate-400 rounded-lg hover:bg-slate-50 transition-all">
                        <RefreshCw size={18} className={loading ? 'animate-spin text-blue-600' : ''} />
                    </button>
                </div>
            </div>

            {/* SEARCH BAR */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm mb-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                    <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Search Field</label>
                        <select value={searchField} onChange={(e) => setSearchField(e.target.value)} className="w-full border border-slate-200 p-2 rounded-lg text-sm outline-none font-semibold">
                            <option value="account_name">Account Name</option>
                            <option value="account_code">Account Code</option>
                            <option value="place">Place / Region</option>
                            <option value="gst_no">GSTIN No.</option>
                        </select>
                    </div>
                    <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Condition</label>
                        <select value={searchCondition} onChange={(e) => setSearchCondition(e.target.value)} className="w-full border border-slate-200 p-2 rounded-lg text-sm outline-none font-semibold">
                            <option value="Like">Like (Contains)</option>
                            <option value="Equal">Equal (Exact)</option>
                        </select>
                    </div>
                    <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Value</label>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                            <input type="text" value={searchValue} onChange={(e) => setSearchValue(e.target.value)} className="w-full border border-slate-200 pl-10 pr-3 py-2 rounded-lg text-sm outline-none font-semibold" placeholder="Search..." />
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={() => setSearchValue('')} className="flex-1 border border-slate-200 py-2 rounded-lg text-sm font-bold hover:bg-slate-50 uppercase text-[10px]">Show All</button>
                        <div className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-[10px] font-bold uppercase flex items-center justify-center gap-2">
                            <Filter size={14}/> {filteredData.length} Records
                        </div>
                    </div>
                </div>
            </div>

            {/* TABLE */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-blue-600 text-white">
                            <tr className="text-sm font-semibold uppercase tracking-wider">
                                {isSelectionMode && <th className="p-4 w-12 text-center">#</th>}
                                <th className="p-4">Code</th>
                                <th className="p-4">Account Name</th>
                                <th className="p-4">Region</th>
                                <th className="p-4 text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr><td colSpan="5" className="p-20 text-center"><Loader2 className="animate-spin mx-auto text-blue-500" size={40} /></td></tr>
                            ) : currentItems.length > 0 ? (
                                currentItems.map((item) => (
                                    <tr 
                                        key={item.id} 
                                        onClick={() => handleEdit(item)} 
                                        className={`hover:bg-blue-50 cursor-pointer transition-colors group ${selectedIds.includes(item.id) ? 'bg-blue-50/80' : ''}`}
                                    >
                                        {isSelectionMode && (
                                            <td className="p-4 text-center" onClick={(e) => e.stopPropagation()}>
                                                {selectedIds.includes(item.id) ? <CheckSquare size={20} className="text-blue-600 mx-auto"/> : <Square size={20} className="text-slate-200 mx-auto"/>}
                                            </td>
                                        )}
                                        <td className="p-4 text-sm font-mono text-slate-500">{item.account_code}</td>
                                        <td className="p-4">
                                            <div className="text-sm font-bold text-slate-700 uppercase">{item.account_name}</div>
                                            <div className="text-[10px] font-bold text-slate-400">{item.account_group}</div>
                                        </td>
                                        <td className="p-4 text-sm font-bold text-slate-500 uppercase italic">{item.place || '---'}</td>
                                        <td className="p-4 text-center" onClick={(e) => e.stopPropagation()}>
                                            <div className="flex justify-center gap-2">
                                                <button onClick={() => handleEdit(item)} className="p-2 text-slate-400 hover:text-blue-600 transition-all"><Edit size={16}/></button>
                                                <button onClick={() => {if(window.confirm("Delete?")) mastersAPI.accounts.delete(item.id).then(fetchRecords); }} className="p-2 text-slate-400 hover:text-red-500 transition-all"><Trash2 size={16}/></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr><td colSpan="5" className="p-24 text-center text-slate-300 font-black uppercase tracking-widest text-xl opacity-40">No Match Found</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* PAGINATION */}
                <div className="p-4 bg-slate-50 border-t flex items-center justify-between">
                    <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider">
                        Records: {Math.min(indexOfLastItem - itemsPerPage + 1, filteredData.length)} - {Math.min(indexOfLastItem, filteredData.length)} of {filteredData.length}
                    </span>
                    <div className="flex gap-2">
                        <button disabled={currentPage === 1} onClick={() => setCurrentPage(prev => prev - 1)} className="p-2 border rounded bg-white hover:bg-slate-50 disabled:opacity-30">
                            <ChevronLeft size={16}/>
                        </button>
                        <div className="flex items-center px-4 text-[10px] font-black text-slate-400">PAGE {currentPage} / {totalPages}</div>
                        <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(prev => prev + 1)} className="p-2 border rounded bg-white hover:bg-slate-50 disabled:opacity-30">
                            <ChevronRight size={16}/>
                        </button>
                    </div>
                </div>
            </div>

            {/* MODAL */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 overflow-y-auto">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl overflow-hidden animate-in fade-in zoom-in duration-200">
                        {/* Modal Header */}
                        <div className="bg-blue-600 p-4 flex justify-between items-center text-white">
                            <h2 className="font-black uppercase tracking-tight flex items-center gap-2">
                                <Building2 size={20} /> {formData.id ? 'Modify Account Record' : 'Add New Account'}
                            </h2>
                            <button onClick={() => setIsModalOpen(false)} className="hover:bg-blue-500 p-1 rounded-full transition-colors"><X size={20}/></button>
                        </div>
                        
                        <form onSubmit={handleSave} className="p-8">
                            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                                
                                {/* Identity & Location (Left Columns) */}
                                <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase">Account Group *</label>
                                        <select value={formData.account_group} onChange={e => setFormData({...formData, account_group: e.target.value})} className="w-full border p-3 rounded-xl font-bold text-sm bg-slate-50">
                                            <option value="DEBTORS - YARN SALES">DEBTORS - YARN SALES</option>
                                            <option value="CREDITORS - RAW MATERIAL">CREDITORS - RAW MATERIAL</option>
                                            <option value="SUNDRY DEBTORS">SUNDRY DEBTORS</option>
                                            <option value="DEPOT">DEPOT</option>
                                        </select>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase">Account Code</label>
                                        <input className="w-full border p-3 rounded-xl bg-slate-100 font-mono text-sm" readOnly value={formData.account_code} />
                                    </div>
                                    <div className="space-y-1 md:col-span-2">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase">Account Name *</label>
                                        <input required className="w-full border p-3 rounded-xl font-black text-slate-700 uppercase focus:ring-2 ring-blue-100 outline-none" value={formData.account_name} onChange={e => setFormData({...formData, account_name: e.target.value.toUpperCase()})} />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase">Place / Region</label>
                                        <input className="w-full border p-3 rounded-xl text-sm font-bold uppercase" value={formData.place} onChange={e => setFormData({...formData, place: e.target.value.toUpperCase()})} />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase">GSTIN Number</label>
                                        <input className="w-full border-2 border-blue-50 p-3 rounded-xl text-sm font-black text-blue-600 bg-blue-50/50 uppercase tracking-widest" value={formData.gst_no} onChange={e => setFormData({...formData, gst_no: e.target.value.toUpperCase()})} placeholder="GST123456789" />
                                    </div>
                                    <div className="space-y-1 md:col-span-2">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase">Full Address</label>
                                        <textarea rows="2" className="w-full border p-3 rounded-xl text-sm font-semibold uppercase resize-none" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value.toUpperCase()})} />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4 md:col-span-2">
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-bold text-slate-400 uppercase">Contact Person</label>
                                            <input className="w-full border p-3 rounded-xl text-sm font-bold uppercase" value={formData.contact_person} onChange={e => setFormData({...formData, contact_person: e.target.value.toUpperCase()})} />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-bold text-slate-400 uppercase">Mobile No.</label>
                                            <input className="w-full border p-3 rounded-xl text-sm font-bold" value={formData.cell_no} onChange={e => setFormData({...formData, cell_no: e.target.value})} />
                                        </div>
                                    </div>
                                </div>

                                {/* Financial Sidebar (Right Column) */}
                                <div className="bg-slate-900 rounded-2xl p-6 text-white flex flex-col gap-6 shadow-xl">
                                    <div className="text-center">
                                        <Scale size={32} className="text-blue-400 mx-auto mb-2" />
                                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Opening Balances</p>
                                    </div>
                                    
                                    <div className="space-y-4">
                                        <div className="bg-emerald-500/10 p-4 rounded-xl border border-emerald-500/20">
                                            <label className="text-[10px] font-black text-emerald-400 uppercase block mb-1">Credit (₹)</label>
                                            <input type="number" value={formData.opening_credit} onChange={e => setFormData({...formData, opening_credit: e.target.value})} className="w-full bg-transparent font-black text-emerald-400 outline-none text-xl" />
                                        </div>
                                        
                                        <div className="bg-rose-500/10 p-4 rounded-xl border border-rose-500/20">
                                            <label className="text-[10px] font-black text-rose-400 uppercase block mb-1">Debit (₹)</label>
                                            <input type="number" value={formData.opening_debit} onChange={e => setFormData({...formData, opening_debit: e.target.value})} className="w-full bg-transparent font-black text-rose-400 outline-none text-xl" />
                                        </div>

                                        <div className="pt-4 border-t border-slate-800">
                                            <label className="text-[10px] font-bold text-slate-500 uppercase block mb-2">Banking Reference</label>
                                            <input placeholder="Bank A/C No." value={formData.bank_account_no} onChange={e => setFormData({...formData, bank_account_no: e.target.value})} className="w-full bg-slate-800 border-none rounded-lg p-3 text-xs font-mono" />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Modal Footer */}
                            <div className="mt-10 pt-6 border-t flex justify-between items-center">
                                {formData.id && (
                                    <button type="button" onClick={() => {if(window.confirm("Delete account?")) mastersAPI.accounts.delete(formData.id).then(() => {fetchRecords(); setIsModalOpen(false);})}} className="flex items-center gap-2 text-red-500 font-bold hover:bg-red-50 px-4 py-2 rounded-xl transition-all">
                                        <Trash2 size={18}/> DELETE RECORD
                                    </button>
                                )}
                                <div className="flex gap-4 ml-auto">
                                    <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-2 font-bold text-slate-400 hover:text-slate-700 uppercase text-xs tracking-widest">Cancel</button>
                                    <button type="submit" disabled={submitLoading} className="bg-blue-600 hover:bg-blue-700 text-white px-10 py-3 rounded-xl font-black shadow-xl flex items-center gap-2 transition-all active:scale-95 uppercase text-xs tracking-widest">
                                        {submitLoading ? <Loader2 className="animate-spin" size={18} /> : <><Save size={18}/> {formData.id ? 'Update Account' : 'Save Account'}</>}
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