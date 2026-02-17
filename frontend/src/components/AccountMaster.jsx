import React, { useState, useEffect, useMemo } from 'react';
import { mastersAPI } from '../service/api';
import { 
    Plus, Edit, Trash2, X, ChevronLeft, 
    ChevronRight, Loader2, CheckSquare, Square, RefreshCw, 
    Save, CheckCircle2, Phone, MapPin, Building2, Globe
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
    
    // Search & Filter
    const [searchField, setSearchField] = useState('account_name');
    const [searchValue, setSearchValue] = useState('');
    const [activeFilter, setActiveFilter] = useState({ field: 'account_name', value: '' });

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(10);

    const initialState = () => ({
        id: null, account_code: '', account_group: 'DEBTORS - YARN SALES',
        account_name: '', place: '', address: '', pincode: '', state: '',
        delivery_address: '', tin_no: '', cst_no: '', phone_no: '',
        email: '', fax: '', website: '', bank_account_no: '',
        contact_person: '', cell_no: '', gst_no: '',
        opening_credit: 0, opening_debit: 0
    });

    const [formData, setFormData] = useState(initialState());

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

    // --- Actions ---
    const handleAddNew = () => {
        const safeList = Array.isArray(list) ? list : [];
        const maxCode = safeList.reduce((max, item) => {
            const currentCode = parseInt(item.account_code, 10);
            return !isNaN(currentCode) && currentCode > max ? currentCode : max;
        }, 0);
        setFormData({ ...initialState(), account_code: (maxCode + 1).toString() });
        setIsModalOpen(true);
    };

    const handleEdit = (item) => {
        if (isSelectionMode) {
            toggleSelection(item.id);
            return;
        }
        setFormData({ ...item });
        setIsModalOpen(true);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setSubmitLoading(true);
        try {
            const payload = {
                ...formData,
                opening_credit: Number(formData.opening_credit) || 0,
                opening_debit: Number(formData.opening_debit) || 0
            };
            const isUpdate = !!formData.id;
            if (isUpdate) {
                await mastersAPI.accounts.update(formData.id, payload);
            } else {
                await mastersAPI.accounts.create(payload);
            }
            fetchRecords();
            setIsModalOpen(false);
            triggerSuccess(isUpdate ? "Account Updated!" : "Account Created!");
        } catch (err) { 
            alert("Error saving record."); 
        } finally { 
            setSubmitLoading(false); 
        }
    };

    const handleBulkDelete = async () => {
        if (selectedIds.length === 0) return;
        if (window.confirm(`Are you sure you want to delete ${selectedIds.length} records?`)) {
            setLoading(true);
            try {
                await mastersAPI.accounts.bulkDelete(selectedIds);
                triggerSuccess(`${selectedIds.length} Records Deleted!`);
                setSelectedIds([]);
                setIsSelectionMode(false);
                fetchRecords();
            } catch (err) {
                alert("Bulk delete failed.");
            } finally {
                setLoading(false);
            }
        }
    };

    // --- Selection Logic ---
    const toggleSelection = (id) => {
        setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
    };

    const toggleSelectAll = () => {
        if (selectedIds.length === currentItems.length) setSelectedIds([]);
        else setSelectedIds(currentItems.map(item => item.id));
    };

    // --- Logic: Search & Pagination ---
    const processedData = useMemo(() => {
        const safeList = Array.isArray(list) ? list : [];
        if (!activeFilter.value) return safeList;
        
        return safeList.filter(item => {
            const fieldValue = item[activeFilter.field];
            return String(fieldValue || '').toLowerCase().includes(activeFilter.value.toLowerCase());
        });
    }, [list, activeFilter]);

    const totalPages = Math.ceil(processedData.length / itemsPerPage) || 1;
    const currentItems = processedData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    return (
        <div className="min-h-screen bg-slate-100 p-4 md:p-8 font-sans text-slate-900">
            
            {/* SUCCESS OVERLAY */}
            {showSuccess && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/20 backdrop-blur-sm transition-all">
                    <div className="bg-white p-10 rounded-3xl shadow-2xl flex flex-col items-center gap-4">
                        <CheckCircle2 size={80} className="text-green-500 animate-bounce" />
                        <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tight">{successMessage}</h3>
                    </div>
                </div>
            )}

            {/* HEADER */}
            <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">Account Master</h1>
                    <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">Registry Control Panel</p>
                </div>
                
                <div className="flex gap-3">
                    {/* SELECTION ACTIONS */}
                    {!isSelectionMode ? (
                        <button onClick={() => setIsSelectionMode(true)} className="px-6 py-3 border-2 border-slate-200 bg-white rounded-xl font-black text-xs hover:bg-slate-50 transition-all active:scale-95">
                            SELECT
                        </button>
                    ) : (
                        <div className="flex gap-2">
                             <button onClick={() => {setIsSelectionMode(false); setSelectedIds([]);}} className="px-6 py-3 bg-slate-800 text-white rounded-xl font-black text-xs transition-all active:scale-95">
                                CANCEL
                            </button>
                            <button 
                                onClick={handleBulkDelete}
                                disabled={selectedIds.length === 0}
                                className={`flex items-center gap-2 px-6 py-3 rounded-xl font-black text-xs transition-all shadow-lg active:scale-95 ${selectedIds.length > 0 ? 'bg-red-600 text-white shadow-red-100' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}
                            >
                                <Trash2 size={16}/> DELETE SELECTED ({selectedIds.length})
                            </button>
                        </div>
                    )}

                    <button onClick={handleAddNew} className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl font-black shadow-lg flex items-center gap-2 transition-all active:scale-95">
                        <Plus size={20} /> NEW ACCOUNT
                    </button>
                    
                    <button onClick={fetchRecords} className="p-3 border-2 border-slate-200 rounded-xl bg-white text-slate-400 hover:text-blue-600 transition-all">
                        <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
                    </button>
                </div>
            </div>

            {/* SEARCH */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm mb-8 flex flex-wrap gap-4 items-end">
                <div className="flex-1 min-w-[200px]">
                    <label className="text-[10px] font-black text-slate-400 uppercase mb-1 block">Category</label>
                    <select value={searchField} onChange={(e) => setSearchField(e.target.value)} className="w-full border-2 border-slate-50 p-2.5 rounded-xl text-sm font-bold bg-slate-50 outline-none focus:border-blue-500">
                        <option value="account_name">Account Name</option>
                        <option value="account_code">Account Code</option>
                        <option value="place">Place</option>
                    </select>
                </div>
                <div className="flex-[2] min-w-[300px]">
                    <label className="text-[10px] font-black text-slate-400 uppercase mb-1 block">Search Value</label>
                    <input type="text" value={searchValue} onChange={(e) => setSearchValue(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && setActiveFilter({ field: searchField, value: searchValue })} className="w-full border-2 border-slate-50 p-2.5 rounded-xl text-sm outline-none focus:border-blue-500 font-semibold" placeholder="Search records..." />
                </div>
                <button onClick={() => setActiveFilter({ field: searchField, value: searchValue })} className="bg-slate-900 text-white px-8 py-2.5 rounded-xl text-xs font-black uppercase hover:bg-black transition-all">Apply Filter</button>
            </div>

            {/* TABLE */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-blue-500 border-b border-slate-100 text-[10px] uppercase text-white tracking-widest font-bold">
                            <tr>
                                {isSelectionMode && (
                                    <th className="p-5 w-16 text-center">
                                        <button onClick={toggleSelectAll}>
                                            {selectedIds.length === currentItems.length && currentItems.length > 0 ? <CheckSquare size={20} /> : <Square size={20} />}
                                        </button>
                                    </th>
                                )}
                                <th className="p-5">Code</th>
                                <th className="p-5">Account Name</th>
                                <th className="p-5">Region</th>
                                {!isSelectionMode && <th className="p-5 text-center">Actions</th>}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {loading ? (
                                <tr><td colSpan="5" className="p-20 text-center"><Loader2 className="animate-spin mx-auto text-blue-500" size={40} /></td></tr>
                            ) : currentItems.length > 0 ? (
                                currentItems.map((item) => (
                                    <tr 
                                        key={item.id} 
                                        onClick={() => handleEdit(item)} 
                                        className={`transition-all cursor-pointer ${selectedIds.includes(item.id) ? 'bg-blue-50' : 'hover:bg-blue-50/30'}`}
                                    >
                                        {isSelectionMode && (
                                            <td className="p-5 text-center" onClick={(e) => {e.stopPropagation(); toggleSelection(item.id);}}>
                                                {selectedIds.includes(item.id) ? <CheckSquare size={20} className="text-blue-600 mx-auto"/> : <Square size={20} className="text-slate-200 mx-auto"/>}
                                            </td>
                                        )}
                                        <td className="p-5 text-sm font-black text-blue-600 font-mono">{item.account_code}</td>
                                        <td className="p-5 text-sm font-black text-slate-800 uppercase">{item.account_name}</td>
                                        <td className="p-5 text-sm font-bold text-slate-500 uppercase italic">{item.place || '---'}</td>
                                        {!isSelectionMode && (
                                            <td className="p-5 text-center" onClick={(e) => e.stopPropagation()}>
                                                <div className="flex justify-center gap-2">
                                                    <button onClick={() => handleEdit(item)} className="p-2 bg-slate-50 rounded-lg hover:bg-blue-600 hover:text-white transition-all"><Edit size={16}/></button>
                                                    <button onClick={() => {if(window.confirm("Delete?")) mastersAPI.accounts.delete(item.id).then(() => {fetchRecords(); triggerSuccess("Deleted!");}); }} className="p-2 bg-slate-50 rounded-lg hover:bg-red-600 hover:text-white transition-all"><Trash2 size={16}/></button>
                                                </div>
                                            </td>
                                        )}
                                    </tr>
                                ))
                            ) : (
                                <tr><td colSpan="5" className="p-24 text-center text-slate-400 font-black uppercase tracking-widest opacity-20 text-2xl">No Data Found</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* PAGINATION */}
                <div className="p-6 bg-slate-50/50 border-t flex items-center justify-between">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        Showing {currentItems.length} of {processedData.length} Records
                    </p>
                    <div className="flex gap-2">
                        <button disabled={currentPage === 1} onClick={() => setCurrentPage(prev => prev - 1)} className="p-2 border rounded-xl bg-white hover:bg-blue-50 disabled:opacity-30 transition-all shadow-sm">
                            <ChevronLeft size={20}/>
                        </button>
                        <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(prev => prev + 1)} className="p-2 border rounded-xl bg-white hover:bg-blue-50 disabled:opacity-30 transition-all shadow-sm">
                            <ChevronRight size={20}/>
                        </button>
                    </div>
                </div>
            </div>

            {/* MODAL */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-md p-4 overflow-y-auto">
                    <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-6xl overflow-hidden animate-in zoom-in duration-300">
                        {/* Header */}
                        <div className="bg-white border-b border-slate-100 p-8 flex justify-between items-center px-10">
                            <div className="flex items-center gap-4">
                                <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-200">
                                    <Building2 size={28} />
                                </div>
                                <div>
                                    <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">{formData.id ? 'Modify Account' : 'New Account Registry'}</h2>
                                    <p className="text-[10px] font-bold text-blue-600 font-mono uppercase tracking-widest mt-1">CODE: #{formData.account_code}</p>
                                </div>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="text-slate-300 hover:text-red-500 transition-all"><X size={32}/></button>
                        </div>
                        
                        <form onSubmit={handleSave} className="p-10">
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                                
                                {/* Column 1 */}
                                <div className="space-y-6">
                                    <div className="flex items-center gap-2 mb-2">
                                        <MapPin size={14} className="text-blue-600" />
                                        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Location & Identity</h3>
                                    </div>
                                    <div className="space-y-4">
                                        <div>
                                            <label className="text-[10px] font-black text-slate-400 uppercase block mb-1 ml-2">Account Group</label>
                                            <select value={formData.account_group} onChange={e => setFormData({...formData, account_group: e.target.value})} className="w-full border-2 border-slate-50 p-4 rounded-2xl text-xs font-bold bg-slate-50 outline-none focus:border-blue-500">
                                                <option value="DEBTORS - YARN SALES">DEBTORS - YARN SALES</option>
                                                <option value="CREDITORS - RAW MATERIAL">CREDITORS - RAW MATERIAL</option>
                                                <option value="SUNDRY DEBTORS">SUNDRY DEBTORS</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-black text-slate-400 uppercase block mb-1 ml-2">Account Name *</label>
                                            <input required value={formData.account_name} onChange={e => setFormData({...formData, account_name: e.target.value.toUpperCase()})} className="w-full border-2 border-slate-50 p-4 rounded-2xl text-sm font-black bg-slate-50 outline-none uppercase focus:border-blue-500" placeholder="ENTER NAME..." />
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <input placeholder="Place" value={formData.place} onChange={e => setFormData({...formData, place: e.target.value.toUpperCase()})} className="w-full border-2 border-slate-50 p-4 rounded-2xl text-xs font-bold bg-slate-50 outline-none" />
                                            <input placeholder="State" value={formData.state} onChange={e => setFormData({...formData, state: e.target.value.toUpperCase()})} className="w-full border-2 border-slate-50 p-4 rounded-2xl text-xs font-bold bg-slate-50 outline-none" />
                                        </div>
                                        <textarea placeholder="Address" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value.toUpperCase()})} rows="3" className="w-full border-2 border-slate-50 p-4 rounded-2xl text-xs font-bold bg-slate-50 outline-none resize-none" />
                                    </div>
                                </div>

                                {/* Column 2 */}
                                <div className="space-y-6">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Phone size={14} className="text-blue-600" />
                                        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Communication</h3>
                                    </div>
                                    <div className="space-y-4">
                                        <input placeholder="Mobile No." value={formData.cell_no} onChange={e => setFormData({...formData, cell_no: e.target.value})} className="w-full border-2 border-slate-50 p-4 rounded-2xl text-xs font-bold bg-slate-50" />
                                        <input placeholder="Phone No." value={formData.phone_no} onChange={e => setFormData({...formData, phone_no: e.target.value})} className="w-full border-2 border-slate-50 p-4 rounded-2xl text-xs font-bold bg-slate-50" />
                                        <input placeholder="Email Address" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full border-2 border-slate-50 p-4 rounded-2xl text-xs font-bold bg-slate-50" />
                                        <input placeholder="Contact Person" value={formData.contact_person} onChange={e => setFormData({...formData, contact_person: e.target.value.toUpperCase()})} className="w-full border-2 border-slate-50 p-4 rounded-2xl text-sm font-black bg-slate-50" />
                                    </div>
                                </div>

                                {/* Column 3 */}
                                <div className="space-y-6">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Globe size={14} className="text-blue-600" />
                                        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Financials</h3>
                                    </div>
                                    <div className="space-y-4">
                                        <input placeholder="GSTIN No." value={formData.gst_no} onChange={e => setFormData({...formData, gst_no: e.target.value.toUpperCase()})} className="w-full border-2 border-blue-100 p-4 rounded-2xl text-sm font-black bg-blue-50 outline-none tracking-widest text-blue-600" />
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="bg-emerald-50 p-4 rounded-3xl border border-emerald-100">
                                                <label className="text-[10px] font-black text-emerald-600 uppercase block mb-1 ml-1">Credit Bal</label>
                                                <input type="number" value={formData.opening_credit} onChange={e => setFormData({...formData, opening_credit: e.target.value})} className="w-full bg-transparent font-black text-emerald-700 outline-none text-lg" />
                                            </div>
                                            <div className="bg-rose-50 p-4 rounded-3xl border border-rose-100">
                                                <label className="text-[10px] font-black text-rose-600 uppercase block mb-1 ml-1">Debit Bal</label>
                                                <input type="number" value={formData.opening_debit} onChange={e => setFormData({...formData, opening_debit: e.target.value})} className="w-full bg-transparent font-black text-rose-700 outline-none text-lg" />
                                            </div>
                                        </div>
                                        <input placeholder="Bank A/C No." value={formData.bank_account_no} onChange={e => setFormData({...formData, bank_account_no: e.target.value})} className="w-full border-2 border-slate-50 p-4 rounded-2xl text-xs font-bold bg-slate-50" />
                                    </div>
                                </div>
                            </div>

                            <div className="mt-12 flex justify-end gap-4 border-t border-slate-100 pt-10">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-10 py-4 rounded-2xl text-xs font-black text-slate-400 hover:text-slate-600 uppercase tracking-widest">Cancel</button>
                                <button type="submit" disabled={submitLoading} className="bg-blue-600 hover:bg-blue-700 text-white px-14 py-4 rounded-2xl font-black shadow-xl shadow-blue-100 flex items-center gap-2 uppercase text-xs tracking-widest transition-all active:scale-95">
                                    {submitLoading ? <Loader2 className="animate-spin" size={18} /> : <><Save size={18} /> {formData.id ? 'UPDATE ACCOUNT' : 'SAVE ACCOUNT'}</>}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AccountMaster;