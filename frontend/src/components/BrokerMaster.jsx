import React, { useState, useEffect, useMemo } from 'react';
import { mastersAPI } from '../service/api';
import { 
    Plus, Edit, Trash2, X, ChevronLeft, 
    ChevronRight, Loader2, CheckSquare, Square, RefreshCw, 
    Save, CheckCircle2, Briefcase, MapPin, Search, Filter,
    Percent, CircleDollarSign, Info, Hash
} from 'lucide-react';

const BrokerMaster = () => {
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
    
    // Dynamic Filtering State
    const [searchField, setSearchField] = useState('broker_name');
    const [searchCondition, setSearchCondition] = useState('Like');
    const [searchValue, setSearchValue] = useState('');

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(10);

    const initialState = () => ({
        id: null,
        broker_code: '',
        broker_name: '',
        commission_pct: 0,
        is_comm_per_kg: false,
        address: ''
    });

    const [formData, setFormData] = useState(initialState());

    // --- API Integration ---
    useEffect(() => {
        fetchRecords();
    }, []);

    const fetchRecords = async () => {
        setLoading(true);
        try {
            const res = await mastersAPI.brokers.getAll();
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

    // --- Dynamic Filtering Logic ---
    const filteredData = useMemo(() => {
        let result = Array.isArray(list) ? [...list] : [];

        if (searchValue.trim()) {
            result = result.filter(item => {
                const itemValue = String(item[searchField] || '').toLowerCase();
                const filterValue = searchValue.toLowerCase().trim();

                if (searchCondition === 'Equal') {
                    return itemValue === filterValue;
                } else {
                    return itemValue.includes(filterValue);
                }
            });
        }
        return result;
    }, [list, searchValue, searchField, searchCondition]);

    // --- Pagination Logic ---
    const totalPages = Math.ceil(filteredData.length / itemsPerPage) || 1;
    const currentItems = filteredData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    // Reset pagination on filter change
    useEffect(() => {
        setCurrentPage(1);
    }, [searchValue, searchField, searchCondition]);

    // --- Actions ---
    const handleAddNew = () => {
        const safeList = Array.isArray(list) ? list : [];
        const maxCode = safeList.reduce((max, item) => {
            const currentCode = parseInt(item.broker_code, 10);
            return !isNaN(currentCode) && currentCode > max ? currentCode : max;
        }, 0);
        setFormData({ ...initialState(), broker_code: (maxCode + 1).toString() });
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
            if (isUpdate) await mastersAPI.brokers.update(formData.id, formData);
            else await mastersAPI.brokers.create(formData);
            
            fetchRecords();
            setIsModalOpen(false);
            triggerSuccess(isUpdate ? "Broker Updated!" : "Broker Created!");
        } catch (err) { 
            alert("Error saving record."); 
        } finally { 
            setSubmitLoading(false); 
        }
    };

    const handleBulkDelete = async () => {
        if (selectedIds.length === 0) return;
        if (window.confirm(`Delete ${selectedIds.length} brokers?`)) {
            setLoading(true);
            try {
                await Promise.all(selectedIds.map(id => mastersAPI.brokers.delete(id)));
                triggerSuccess("Records Deleted!");
                setSelectedIds([]);
                setIsSelectionMode(false);
                fetchRecords();
            } catch (err) { alert("Bulk delete failed."); } 
            finally { setLoading(false); }
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 p-6 font-sans text-slate-900">
            
            {/* SUCCESS OVERLAY */}
            {showSuccess && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/20 backdrop-blur-sm transition-all">
                    <div className="bg-white p-8 rounded-2xl shadow-2xl flex flex-col items-center gap-3 animate-in zoom-in duration-300">
                        <CheckCircle2 size={60} className="text-emerald-500" />
                        <h3 className="text-xl font-bold text-slate-800 uppercase tracking-tight">{successMessage}</h3>
                    </div>
                </div>
            )}

            {/* HEADER SECTION */}
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <Briefcase className="text-blue-600" /> Broker Machine Master
                    </h1>
                    <p className="text-sm text-slate-500">Manage agency commissions and broker information</p>
                </div>
                
                <div className="flex gap-2">
                    <button 
                        onClick={() => {setIsSelectionMode(!isSelectionMode); setSelectedIds([]);}} 
                        className={`px-5 py-2 border rounded-lg font-semibold transition-all ${isSelectionMode ? 'bg-amber-100 border-amber-300 text-amber-700' : 'bg-white border-slate-200 text-blue-600 hover:bg-slate-50'}`}
                    >
                        {isSelectionMode ? 'Cancel' : 'Select'}
                    </button>

                    {isSelectionMode ? (
                        <button 
                            onClick={handleBulkDelete}
                            disabled={selectedIds.length === 0}
                            className={`px-5 py-2 border rounded-lg flex items-center gap-2 transition-all ${selectedIds.length > 0 ? 'bg-white border-red-200 text-red-600' : 'bg-white border-slate-100 text-slate-300 cursor-not-allowed'}`}
                        >
                            <Trash2 size={18}/> Delete {selectedIds.length > 0 && `(${selectedIds.length})`}
                        </button>
                    ) : (
                        <button onClick={handleAddNew} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg font-semibold shadow-sm transition-all">
                            <Plus size={18} /> New
                        </button>
                    )}
                    
                    <button onClick={fetchRecords} className="p-2 border border-slate-200 rounded-lg bg-white text-slate-400 hover:text-blue-600 transition-colors">
                        <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
                    </button>
                </div>
            </div>

            {/* DYNAMIC FILTER BAR */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm mb-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                    <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Search Field</label>
                        <select 
                            value={searchField} 
                            onChange={(e) => setSearchField(e.target.value)} 
                            className="w-full border border-slate-200 p-2 rounded-lg text-sm outline-none focus:ring-1 focus:ring-blue-500"
                        >
                            <option value="broker_name">Broker Name</option>
                            <option value="broker_code">Broker Code</option>
                            <option value="address">Address</option>
                        </select>
                    </div>
                    <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Condition</label>
                        <select 
                            value={searchCondition} 
                            onChange={(e) => setSearchCondition(e.target.value)} 
                            className="w-full border border-slate-200 p-2 rounded-lg text-sm outline-none focus:ring-1 focus:ring-blue-500"
                        >
                            <option value="Like">Like</option>
                            <option value="Equal">Equal</option>
                        </select>
                    </div>
                    <div className="relative">
                        <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Value</label>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                            <input 
                                type="text" 
                                value={searchValue} 
                                onChange={(e) => setSearchValue(e.target.value)} 
                                className="w-full border border-slate-200 pl-10 pr-4 py-2 rounded-lg text-sm outline-none focus:ring-1 focus:ring-blue-500 bg-white" 
                                placeholder="Enter search value..." 
                            />
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={() => setSearchValue('')} className="flex-1 border border-slate-200 py-2 rounded-lg text-sm font-bold hover:bg-slate-50 transition-colors">Show All</button>
                        <div className="flex-1 bg-blue-50 text-blue-600 border border-blue-100 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2">
                            <Filter size={14}/> {filteredData.length} Found
                        </div>
                    </div>
                </div>
            </div>

            {/* DATA TABLE */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-blue-600 text-white">
                                {isSelectionMode && (
                                    <th className="p-4 w-12 text-center">
                                        <button onClick={() => setSelectedIds(selectedIds.length === currentItems.length ? [] : currentItems.map(i => i.id))}>
                                            {selectedIds.length === currentItems.length && currentItems.length > 0 ? <CheckSquare size={18} /> : <Square size={18} />}
                                        </button>
                                    </th>
                                )}
                                <th className="p-4 text-sm font-semibold">Code</th>
                                <th className="p-4 text-sm font-semibold">Broker Name</th>
                                <th className="p-4 text-sm font-semibold">Commission</th>
                                <th className="p-4 text-sm font-semibold">Method</th>
                                {!isSelectionMode && <th className="p-4 w-10"></th>}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr><td colSpan="6" className="p-20 text-center"><Loader2 className="animate-spin mx-auto text-blue-600" size={40} /></td></tr>
                            ) : currentItems.length > 0 ? (
                                currentItems.map((item) => (
                                    <tr 
                                        key={item.id} 
                                        onClick={() => handleEdit(item)} 
                                        className={`transition-all group cursor-pointer ${selectedIds.includes(item.id) ? 'bg-blue-50' : 'hover:bg-blue-50'}`}
                                    >
                                        {isSelectionMode && (
                                            <td className="p-4 text-center" onClick={(e) => {e.stopPropagation(); handleEdit(item);}}>
                                                {selectedIds.includes(item.id) ? <CheckSquare size={18} className="text-blue-600 mx-auto"/> : <Square size={18} className="text-slate-200 mx-auto"/>}
                                            </td>
                                        )}
                                        <td className="p-4 text-sm font-mono text-slate-500">#{item.broker_code}</td>
                                        <td className="p-4 text-sm font-bold text-slate-700 uppercase">{item.broker_name}</td>
                                        <td className="p-4 text-sm font-black text-emerald-600">{item.commission_pct}</td>
                                        <td className="p-4 text-xs font-bold text-slate-400 uppercase tracking-tight italic">
                                            {item.is_comm_per_kg ? 'Flat (per kg)' : 'Percentage (%)'}
                                        </td>
                                        {!isSelectionMode && (
                                            <td className="p-4 text-right">
                                                <Edit size={16} className="text-slate-200 group-hover:text-blue-600 transition-colors" />
                                            </td>
                                        )}
                                    </tr>
                                ))
                            ) : (
                                <tr><td colSpan="6" className="p-20 text-center text-slate-400 font-black uppercase tracking-widest opacity-20 text-xl italic">No Match Found</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* PAGINATION FOOTER */}
                <div className="p-4 bg-slate-50 border-t flex items-center justify-between">
                    <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider">
                        Records: {filteredData.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0} - {Math.min(currentPage * itemsPerPage, filteredData.length)} of {filteredData.length}
                    </span>
                    <div className="flex gap-2">
                        <button disabled={currentPage === 1} onClick={() => setCurrentPage(prev => prev - 1)} className="p-2 border rounded bg-white hover:bg-blue-50 disabled:opacity-30 transition-all shadow-sm">
                            <ChevronLeft size={16}/>
                        </button>
                        <div className="px-3 flex items-center text-xs font-bold text-slate-600">Page {currentPage} of {totalPages}</div>
                        <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(prev => prev + 1)} className="p-2 border rounded bg-white hover:bg-blue-50 disabled:opacity-30 transition-all shadow-sm">
                            <ChevronRight size={16}/>
                        </button>
                    </div>
                </div>
            </div>

            {/* MODAL WINDOW (Matched to ProductMaster Sidebar Design) */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden animate-in fade-in zoom-in duration-200">
                        {/* Modal Header */}
                        <div className="bg-blue-600 p-4 flex justify-between items-center text-white">
                            <h2 className="font-black uppercase tracking-tight">{formData.id ? 'Modify Broker Record' : 'Add New Broker'}</h2>
                            <button onClick={() => setIsModalOpen(false)} className="hover:bg-blue-500 p-1 rounded-full"><X size={20}/></button>
                        </div>
                        
                        <form onSubmit={handleSave} className="p-8">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                
                                {/* LEFT COLUMN: Profile Info */}
                                <div className="md:col-span-2 space-y-6">
                                    <div className="grid grid-cols-2 gap-6">
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-bold text-slate-400 uppercase">Broker Code</label>
                                            <input readOnly value={formData.broker_code} className="w-full border border-slate-100 p-3 rounded-xl text-sm font-mono bg-slate-50 text-blue-600" />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-bold text-slate-400 uppercase">Broker Name *</label>
                                            <input required value={formData.broker_name} onChange={e => setFormData({...formData, broker_name: e.target.value.toUpperCase()})} className="w-full border border-slate-200 p-3 rounded-xl text-sm font-black uppercase focus:ring-1 focus:ring-blue-500 outline-none transition-all" placeholder="AGENCY NAME..." />
                                        </div>
                                    </div>
                                    
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase">Full Address</label>
                                        <textarea value={formData.address} onChange={e => setFormData({...formData, address: e.target.value.toUpperCase()})} rows="5" className="w-full border border-slate-200 p-4 rounded-xl text-sm font-bold bg-white outline-none focus:ring-1 focus:ring-blue-500 transition-all resize-none" placeholder="ENTER OFFICE ADDRESS..." />
                                    </div>
                                </div>

                                {/* RIGHT COLUMN: Financial Sidebar (Matched to ProductMaster) */}
                                <div className="bg-slate-900 rounded-2xl p-6 text-white flex flex-col justify-center gap-6">
                                    <div className="text-center">
                                        <CircleDollarSign size={40} className="text-blue-400 mx-auto mb-2" />
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Brokerage Config</p>
                                    </div>

                                    <div className="space-y-4">
                                        <div className="space-y-1">
                                            <label className="text-[9px] font-bold text-slate-500 uppercase">Commission Rate</label>
                                            <div className="relative">
                                                <input 
                                                    type="number" 
                                                    step="0.01" 
                                                    value={formData.commission_pct} 
                                                    onChange={e => setFormData({...formData, commission_pct: e.target.value})} 
                                                    className="w-full bg-slate-800 border-none rounded-lg p-3 text-center text-lg font-black text-emerald-400 outline-none focus:ring-1 focus:ring-emerald-500" 
                                                />
                                                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
                                                    {formData.is_comm_per_kg ? 'KG' : '%'}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between bg-slate-800/50 p-3 rounded-xl border border-slate-800">
                                            <div className="flex items-center gap-2">
                                                <Hash size={14} className="text-blue-400" />
                                                <span className="text-[10px] font-bold text-slate-300 uppercase">Rate per KG</span>
                                            </div>
                                            <input 
                                                type="checkbox" 
                                                checked={formData.is_comm_per_kg} 
                                                onChange={e => setFormData({...formData, is_comm_per_kg: e.target.checked})} 
                                                className="w-5 h-5 rounded accent-blue-500 cursor-pointer" 
                                            />
                                        </div>

                                        <div className="flex gap-2 bg-blue-500/10 p-3 rounded-lg border border-blue-500/20">
                                            <Info size={14} className="text-blue-400 shrink-0" />
                                            <p className="text-[9px] leading-tight text-slate-400">
                                                {formData.is_comm_per_kg 
                                                    ? 'Commission will be calculated as Fixed Amount × Total KG sold.' 
                                                    : 'Commission will be calculated as % of the Total Net Sale value.'}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* MODAL FOOTER */}
                            <div className="mt-10 pt-6 border-t flex justify-between items-center">
                                {formData.id && (
                                    <button type="button" onClick={() => {if(window.confirm('Delete this broker?')) mastersAPI.brokers.delete(formData.id).then(fetchRecords); setIsModalOpen(false);}} className="flex items-center gap-2 text-red-500 font-bold hover:bg-red-50 px-4 py-2 rounded-xl transition-all">
                                        <Trash2 size={18}/> DELETE
                                    </button>
                                )}
                                <div className="flex gap-4 ml-auto">
                                    <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-2 font-bold text-slate-500 hover:text-slate-800 transition-colors uppercase text-xs tracking-widest">Cancel</button>
                                    <button type="submit" disabled={submitLoading} className="bg-blue-600 hover:bg-blue-700 text-white px-10 py-3 rounded-xl font-black shadow-xl flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50">
                                        <Save size={18}/> {submitLoading ? 'SAVING...' : 'SAVE BROKER'}
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

export default BrokerMaster;