import React, { useState, useEffect, useMemo } from 'react';
import { mastersAPI } from '../service/api';
import { 
    Plus, Edit, Trash2, X, ChevronLeft, 
    ChevronRight, Loader2, CheckSquare, Square, RefreshCw, 
    Save, CheckCircle2, Truck, MapPin, Hash, Search, Filter,
    Info, Database
} from 'lucide-react';

const TransportMaster = () => {
    // --- State Management ---
    const [list, setList] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [submitLoading, setSubmitLoading] = useState(false);
    
    // Selection & Bulk Actions
    const [isSelectionMode, setIsSelectionMode] = useState(false);
    const [selectedIds, setSelectedIds] = useState([]);
    
    // Success Animation
    const [showSuccess, setShowSuccess] = useState(false);
    const [successMessage, setSuccessMessage] = useState("");
    
    // --- DYNAMIC FILTERING STATE ---
    const [searchField, setSearchField] = useState('transport_name');
    const [searchCondition, setSearchCondition] = useState('Like');
    const [searchValue, setSearchValue] = useState('');

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(10);

    const initialState = () => ({
        id: null,
        transport_code: '',
        transport_name: '',
        place: '',
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
            const res = await mastersAPI.transports.getAll();
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

    // --- DYNAMIC FILTERING LOGIC (useMemo) ---
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
            const currentCode = parseInt(item.transport_code, 10);
            return !isNaN(currentCode) && currentCode > max ? currentCode : max;
        }, 0);
        setFormData({ ...initialState(), transport_code: (maxCode + 1).toString() });
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
            if (isUpdate) await mastersAPI.transports.update(formData.id, formData);
            else await mastersAPI.transports.create(formData);
            
            fetchRecords();
            setIsModalOpen(false);
            triggerSuccess(isUpdate ? "Transport Updated!" : "Transport Created!");
        } catch (err) { 
            alert("Error saving record."); 
        } finally { 
            setSubmitLoading(false); 
        }
    };

    const handleBulkDelete = async () => {
        if (selectedIds.length === 0) return;
        if (window.confirm(`Delete ${selectedIds.length} transport records?`)) {
            setLoading(true);
            try {
                await Promise.all(selectedIds.map(id => mastersAPI.transports.delete(id)));
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
                        <Truck className="text-blue-600" /> Transport Machine Master
                    </h1>
                    <p className="text-sm text-slate-500">Manage logistics providers and hub locations</p>
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
                            <option value="transport_name">Transport Name</option>
                            <option value="transport_code">Transport Code</option>
                            <option value="place">Hub / Place</option>
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
                                placeholder="Filter transports..." 
                            />
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={() => setSearchValue('')} className="flex-1 border border-slate-200 py-2 rounded-lg text-sm font-bold hover:bg-slate-50 transition-colors">Show All</button>
                        <div className="flex-1 bg-blue-50 text-blue-600 border border-blue-100 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2">
                            <Filter size={14}/> {filteredData.length} Matches
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
                                <th className="p-4 text-sm font-semibold">Transport Name</th>
                                <th className="p-4 text-sm font-semibold">Base Hub</th>
                                <th className="p-4 text-sm font-semibold">Status</th>
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
                                        <td className="p-4 text-sm font-mono text-slate-500">#{item.transport_code}</td>
                                        <td className="p-4 text-sm font-bold text-slate-700 uppercase">{item.transport_name}</td>
                                        <td className="p-4 text-sm font-bold text-slate-400 uppercase tracking-tight">{item.place || 'Local'}</td>
                                        <td className="p-4">
                                            <span className="bg-emerald-50 text-emerald-600 text-[10px] px-2 py-1 rounded font-bold uppercase tracking-wider">Active</span>
                                        </td>
                                        {!isSelectionMode && (
                                            <td className="p-4 text-right">
                                                <Edit size={16} className="text-slate-200 group-hover:text-blue-600 transition-colors" />
                                            </td>
                                        )}
                                    </tr>
                                ))
                            ) : (
                                <tr><td colSpan="6" className="p-20 text-center text-slate-400 font-bold uppercase tracking-widest opacity-20 text-xl italic">No Match Found</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* PAGINATION FOOTER */}
                <div className="p-4 bg-slate-50 border-t flex items-center justify-between">
                    <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider">
                        Total {filteredData.length} entries found
                    </span>
                    <div className="flex gap-2">
                        <button disabled={currentPage === 1} onClick={() => setCurrentPage(prev => prev - 1)} className="p-2 border rounded bg-white hover:bg-blue-50 disabled:opacity-30 transition-all shadow-sm">
                            <ChevronLeft size={16}/>
                        </button>
                        <div className="px-3 flex items-center text-xs font-bold text-slate-600">Page {currentPage} / {totalPages}</div>
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
                            <h2 className="font-black uppercase tracking-tight">{formData.id ? 'Modify Transport Record' : 'Add New Transport'}</h2>
                            <button onClick={() => setIsModalOpen(false)} className="hover:bg-blue-500 p-1 rounded-full transition-colors"><X size={20}/></button>
                        </div>
                        
                        <form onSubmit={handleSave} className="p-8">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                
                                {/* LEFT COLUMN: Profile Info */}
                                <div className="md:col-span-2 space-y-6">
                                    <div className="grid grid-cols-2 gap-6">
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-bold text-slate-400 uppercase">Transport Code</label>
                                            <input readOnly value={formData.transport_code} className="w-full border border-slate-100 p-3 rounded-xl text-sm font-mono bg-slate-50 text-blue-600" />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-bold text-slate-400 uppercase">Transport Name *</label>
                                            <input required value={formData.transport_name} onChange={e => setFormData({...formData, transport_name: e.target.value.toUpperCase()})} className="w-full border border-slate-200 p-3 rounded-xl text-sm font-black uppercase focus:ring-1 focus:ring-blue-500 outline-none transition-all" placeholder="LOGISTICS CO. NAME..." />
                                        </div>
                                    </div>
                                    
                                    <div className="grid grid-cols-2 gap-6">
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-bold text-slate-400 uppercase">Primary Place / Hub</label>
                                            <input value={formData.place} onChange={e => setFormData({...formData, place: e.target.value.toUpperCase()})} className="w-full border border-slate-200 p-3 rounded-xl text-sm font-bold uppercase outline-none focus:ring-1 focus:ring-blue-500" placeholder="CITY NAME..." />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-bold text-slate-400 uppercase">Category</label>
                                            <select className="w-full border border-slate-200 p-3 rounded-xl text-sm font-bold outline-none">
                                                <option>SURFACE TRANSPORT</option>
                                                <option>EXPRESS CARGO</option>
                                                <option>LOCAL DELIVERY</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase">Full Address</label>
                                        <textarea value={formData.address} onChange={e => setFormData({...formData, address: e.target.value.toUpperCase()})} rows="3" className="w-full border border-slate-200 p-4 rounded-xl text-sm font-bold bg-white outline-none focus:ring-1 focus:ring-blue-500 transition-all resize-none" placeholder="ENTER OFFICE ADDRESS..." />
                                    </div>
                                </div>

                                {/* RIGHT COLUMN: System Sidebar (Matched to ProductMaster) */}
                                <div className="bg-slate-900 rounded-2xl p-6 text-white flex flex-col justify-center gap-6">
                                    <div className="text-center">
                                        <Database size={40} className="text-blue-400 mx-auto mb-2" />
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Metadata Config</p>
                                    </div>

                                    <div className="space-y-4">
                                        <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-800">
                                            <label className="text-[9px] font-bold text-slate-500 uppercase block mb-1">System Reference</label>
                                            <div className="flex items-center gap-2">
                                                <Hash size={14} className="text-blue-400" />
                                                <span className="text-sm font-mono font-bold tracking-widest">{formData.transport_code || '---'}</span>
                                            </div>
                                        </div>

                                        <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-800">
                                            <label className="text-[9px] font-bold text-slate-500 uppercase block mb-1">Location Hub</label>
                                            <div className="flex items-center gap-2">
                                                <MapPin size={14} className="text-emerald-400" />
                                                <span className="text-xs font-bold tracking-wider">{formData.place || 'UNSPECIFIED'}</span>
                                            </div>
                                        </div>

                                        <div className="flex gap-2 bg-blue-500/10 p-4 rounded-lg border border-blue-500/20">
                                            <Info size={16} className="text-blue-400 shrink-0" />
                                            <p className="text-[9px] leading-tight text-slate-400">
                                                Registering this transport provider allows it to be selected in Invoicing and Despatch modules.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* MODAL FOOTER */}
                            <div className="mt-10 pt-6 border-t flex justify-between items-center">
                                {formData.id && (
                                    <button type="button" onClick={() => {if(window.confirm('Delete this record?')) mastersAPI.transports.delete(formData.id).then(fetchRecords); setIsModalOpen(false);}} className="flex items-center gap-2 text-red-500 font-bold hover:bg-red-50 px-4 py-2 rounded-xl transition-all">
                                        <Trash2 size={18}/> DELETE
                                    </button>
                                )}
                                <div className="flex gap-4 ml-auto">
                                    <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-2 font-bold text-slate-500 hover:text-slate-800 transition-colors uppercase text-xs tracking-widest">Cancel</button>
                                    <button type="submit" disabled={submitLoading} className="bg-blue-600 hover:bg-blue-700 text-white px-10 py-3 rounded-xl font-black shadow-xl flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50">
                                        <Save size={18}/> {submitLoading ? 'SAVING...' : 'SAVE TRANSPORT'}
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

export default TransportMaster;