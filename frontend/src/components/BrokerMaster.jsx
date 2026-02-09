import React, { useState, useEffect, useMemo } from 'react';
import { mastersAPI } from '../service/api';
import { 
    Plus, Search, Edit, Trash2, X, ChevronLeft, 
    ChevronRight, Briefcase, Save, CheckSquare, Square, 
    Percent, CircleDollarSign, Info, RefreshCw 
} from 'lucide-react';

const BrokerMaster = () => {
    // --- Initial State ---
    const emptyState = { 
        id: null,
        broker_code: '', 
        broker_name: '', 
        address: '', 
        commission_pct: 0, 
        is_comm_per_kg: false 
    };

    // --- Main States ---
    const [list, setList] = useState([]);
    const [formData, setFormData] = useState(emptyState);
    const [loading, setLoading] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);

    // --- Selection & Bulk Action States ---
    const [isSelectionMode, setIsSelectionMode] = useState(false);
    const [selectedIds, setSelectedIds] = useState([]);

    // --- Search, Sort & Pagination States ---
    const [searchField, setSearchField] = useState('broker_name');
    const [searchCondition, setSearchCondition] = useState('Like');
    const [searchValue, setSearchValue] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(10);
    const [sortConfig, setSortConfig] = useState({ key: 'broker_name', direction: 'asc' });

    // --- API Integration ---
    useEffect(() => { 
        fetchRecords(); 
    }, []);

    const fetchRecords = async () => {
        setLoading(true);
        try {
            const res = await mastersAPI.brokers.getAll();
            const data = res.data?.data || res.data || [];
            setList(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error("Fetch error:", err);
            setList([]);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        if (!formData.broker_name) return alert("Broker Name is required");
        setLoading(true);
        try {
            if (formData.id) {
                await mastersAPI.brokers.update(formData.id, formData);
            } else {
                await mastersAPI.brokers.create(formData);
            }
            setIsModalOpen(false);
            fetchRecords();
        } catch (err) {
            alert("Error saving broker record.");
        } finally {
            setLoading(false);
        }
    };

    const handleBulkDelete = async () => {
        if (selectedIds.length === 0) return;
        if (window.confirm(`Are you sure you want to delete ${selectedIds.length} selected brokers?`)) {
            setLoading(true);
            try {
                await Promise.all(selectedIds.map(id => mastersAPI.brokers.delete(id)));
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

    // --- UI Logic Helpers ---
    const handleAddNew = () => {
        const nextId = list.length > 0 ? Math.max(...list.map(i => i.id || 0)) + 1 : 1;
        setFormData({ ...emptyState, broker_code: String(nextId) });
        setIsModalOpen(true);
    };

    const handleRowClick = (item) => {
        if (isSelectionMode) {
            setSelectedIds(prev => prev.includes(item.id) ? prev.filter(i => i !== item.id) : [...prev, item.id]);
            return;
        }
        setFormData(item);
        setIsModalOpen(true);
    };

    // --- Logic: Search, Sort & Pagination ---
    const processedData = useMemo(() => {
        let result = [...list];
        // 1. Filtering
        if (searchValue) {
            result = result.filter(item => {
                const val = String(item[searchField] || '').toLowerCase();
                const search = searchValue.toLowerCase();
                return searchCondition === 'Like' ? val.includes(search) : val === search;
            });
        }
        // 2. Sorting
        if (sortConfig.key) {
            result.sort((a, b) => {
                const aVal = String(a[sortConfig.key] || '');
                const bVal = String(b[sortConfig.key] || '');
                return sortConfig.direction === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
            });
        }
        return result;
    }, [list, searchValue, searchField, searchCondition, sortConfig]);

    const currentItems = processedData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
    const totalPages = Math.ceil(processedData.length / itemsPerPage) || 1;

    return (
        <div className="min-h-screen bg-[#f8fafc] p-6 font-sans select-none">
            
            {/* 1. TOP HEADER & PRIMARY ACTIONS */}
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
                        <Briefcase className="text-blue-600" /> Broker Master
                    </h1>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Commission and Contact management system</p>
                </div>
                
                <div className="flex gap-2">
                    <button onClick={handleAddNew} className="flex items-center gap-2 bg-[#2563eb] hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-bold shadow-md transition-all active:scale-95">
                        <Plus size={18} /> New
                    </button>
                    
                    <button 
                        onClick={() => { setIsSelectionMode(!isSelectionMode); setSelectedIds([]); }}
                        className={`px-6 py-2 border rounded-lg font-bold transition-all ${isSelectionMode ? 'bg-amber-100 border-amber-300 text-amber-700' : 'bg-white border-slate-200 text-blue-600 hover:bg-slate-50'}`}
                    >
                        {isSelectionMode ? 'Cancel Select' : 'Select'}
                    </button>

                    <button 
                        onClick={handleBulkDelete}
                        disabled={selectedIds.length === 0}
                        className={`px-6 py-2 border rounded-lg font-bold flex items-center gap-2 transition-all ${selectedIds.length > 0 ? 'bg-red-50 border-red-200 text-red-600 hover:bg-red-100 shadow-sm' : 'bg-white border-slate-100 text-slate-300 cursor-not-allowed'}`}
                    >
                        <Trash2 size={18} /> Delete {selectedIds.length > 0 && `(${selectedIds.length})`}
                    </button>
                    <button onClick={fetchRecords} className="p-2 border rounded-lg bg-white text-slate-400 hover:text-blue-600 transition-colors">
                        <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                    </button>
                </div>
            </div>

            {/* 2. SEARCH BAR */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm mb-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                    <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase mb-1 block ml-1">Search Field</label>
                        <select value={searchField} onChange={(e) => setSearchField(e.target.value)} className="w-full border border-slate-200 p-2.5 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all">
                            <option value="broker_name">Broker Name</option>
                            <option value="broker_code">Broker Code</option>
                            <option value="address">Address</option>
                        </select>
                    </div>
                    <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase mb-1 block ml-1">Condition</label>
                        <select value={searchCondition} onChange={(e) => setSearchCondition(e.target.value)} className="w-full border border-slate-200 p-2.5 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500">
                            <option value="Like">Like</option>
                            <option value="Equal">Equal</option>
                        </select>
                    </div>
                    <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase mb-1 block ml-1">Value</label>
                        <input type="text" placeholder="Enter search value..." value={searchValue} onChange={(e) => setSearchValue(e.target.value)} className="w-full border border-slate-200 p-2.5 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div className="flex gap-2">
                        <button className="flex-1 bg-[#2563eb] text-white py-2.5 rounded-lg text-sm font-bold hover:bg-blue-700 transition-all active:scale-95 shadow-lg shadow-blue-100">Search</button>
                        <button onClick={() => {setSearchValue(''); fetchRecords();}} className="flex-1 border border-slate-200 py-2.5 rounded-lg text-sm font-bold hover:bg-slate-50 transition-all active:scale-95">Show All</button>
                    </div>
                </div>
            </div>

            {/* 3. BLUE HEADER DATA TABLE */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-md overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-[#2563eb] text-white">
                            <tr>
                                {isSelectionMode && <th className="p-4 w-12 text-center"><Square size={20} className="mx-auto" /></th>}
                                <th onClick={() => setSortConfig({key:'broker_code', direction: sortConfig.direction === 'asc' ? 'desc' : 'asc'})} className="p-4 text-xs font-black uppercase tracking-widest cursor-pointer hover:bg-blue-700">Broker Code</th>
                                <th onClick={() => setSortConfig({key:'broker_name', direction: sortConfig.direction === 'asc' ? 'desc' : 'asc'})} className="p-4 text-xs font-black uppercase tracking-widest cursor-pointer hover:bg-blue-700">Broker Name</th>
                                <th className="p-4 text-xs font-black uppercase tracking-widest">Commission Rate</th>
                                <th className="p-4 text-xs font-black uppercase tracking-widest">Calculation Type</th>
                                <th className="p-4 text-xs font-black uppercase tracking-widest text-center w-20">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {currentItems.length > 0 ? currentItems.map((item) => (
                                <tr key={item.id} onClick={() => handleRowClick(item)} className={`transition-colors cursor-pointer ${selectedIds.includes(item.id) ? 'bg-blue-50' : 'hover:bg-slate-50'}`}>
                                    {isSelectionMode && (
                                        <td className="p-4 text-center">
                                            {selectedIds.includes(item.id) ? <CheckSquare size={20} className="text-blue-600 mx-auto"/> : <Square size={20} className="text-slate-200 mx-auto"/>}
                                        </td>
                                    )}
                                    <td className="p-4 text-sm font-bold text-slate-400 font-mono uppercase">{item.broker_code}</td>
                                    <td className="p-4 text-sm font-bold text-slate-700 uppercase">{item.broker_name}</td>
                                    <td className="p-4 text-sm font-black text-emerald-600">
                                        {item.commission_pct}{item.is_comm_per_kg ? ' fixed' : '%'}
                                    </td>
                                    <td className="p-4 text-sm text-slate-500 font-semibold italic">
                                        {item.is_comm_per_kg ? 'Per Net KG' : 'Percentage of Invoice'}
                                    </td>
                                    <td className="p-4 text-center">
                                        <button className="p-2 text-slate-300 hover:text-blue-600 transition-colors"><Edit size={16}/></button>
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan={isSelectionMode ? 6 : 5} className="p-24 text-center">
                                        <div className="flex flex-col items-center opacity-10">
                                            <Briefcase size={64} className="mb-2" />
                                            <p className="text-lg font-black uppercase tracking-widest">No Brokers Displayed</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* 4. PAGINATION FOOTER */}
                <div className="p-4 bg-[#f8fafc] border-t flex items-center justify-between">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, processedData.length)} of {processedData.length} Records
                    </p>
                    <div className="flex gap-2">
                        <button disabled={currentPage === 1} onClick={() => setCurrentPage(prev => prev - 1)} className="p-2 border rounded-lg bg-white hover:bg-slate-50 disabled:opacity-30 transition-all shadow-sm active:scale-95">
                            <ChevronLeft size={18}/>
                        </button>
                        <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(prev => prev + 1)} className="p-2 border rounded-lg bg-white hover:bg-slate-50 disabled:opacity-30 transition-all shadow-sm active:scale-95">
                            <ChevronRight size={18}/>
                        </button>
                    </div>
                </div>
            </div>

            {/* 5. MODAL FORM POPUP (Add/Edit) */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden animate-in fade-in zoom-in duration-200">
                        {/* Modal Header */}
                        <div className="bg-[#2563eb] p-5 flex justify-between items-center text-white">
                            <div>
                                <h2 className="font-black uppercase tracking-tight text-lg">{formData.id ? 'Modify Broker Profile' : 'New Broker Registration'}</h2>
                                <p className="text-[10px] font-bold text-blue-200 uppercase tracking-widest mt-1">Management Console</p>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="hover:bg-blue-500 p-1 rounded-full transition-colors"><X size={24}/></button>
                        </div>
                        
                        {/* Modal Body */}
                        <form onSubmit={handleSave} className="p-8 space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-1 md:col-span-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Broker Full Name *</label>
                                    <input required className="w-full border-b-2 border-slate-100 p-2 text-lg font-bold text-slate-700 outline-none focus:border-blue-500 transition-colors uppercase" value={formData.broker_name} onChange={e => setFormData({...formData, broker_name: e.target.value})} placeholder="Paramount Textiles" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Internal Code</label>
                                    <input className="w-full border-b-2 border-slate-100 p-2 font-mono font-bold text-blue-600 bg-slate-50 outline-none" readOnly value={formData.broker_code} />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Commission Rate</label>
                                    <div className="relative">
                                        <div className="absolute left-1 top-2.5 text-slate-300">
                                            {formData.is_comm_per_kg ? <CircleDollarSign size={18}/> : <Percent size={18}/>}
                                        </div>
                                        <input type="number" step="0.01" className="w-full pl-7 border-b-2 border-slate-100 p-2 font-black text-emerald-600 outline-none focus:border-emerald-500" value={formData.commission_pct} onChange={e => setFormData({...formData, commission_pct: e.target.value})} />
                                    </div>
                                </div>
                            </div>

                            <div className="bg-slate-50 p-4 rounded-xl border border-dashed border-slate-200 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-lg ${formData.is_comm_per_kg ? 'bg-amber-100 text-amber-600' : 'bg-blue-100 text-blue-600'}`}>
                                        <Info size={18} />
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-slate-700">Commission is calculated {formData.is_comm_per_kg ? 'per net KG' : 'as percentage (%)'}</p>
                                        <p className="text-[10px] text-slate-400 uppercase font-bold">Switch calculation mode</p>
                                    </div>
                                </div>
                                <div className="relative inline-flex items-center cursor-pointer" onClick={() => setFormData({...formData, is_comm_per_kg: !formData.is_comm_per_kg})}>
                                    <div className={`w-11 h-6 rounded-full transition-colors ${formData.is_comm_per_kg ? 'bg-emerald-500' : 'bg-slate-300'}`}>
                                        <div className={`absolute top-[2px] left-[2px] bg-white w-5 h-5 rounded-full shadow-sm transition-transform ${formData.is_comm_per_kg ? 'translate-x-5' : 'translate-x-0'}`} />
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Office Address</label>
                                <textarea className="w-full border-b-2 border-slate-100 p-2 font-semibold text-slate-600 outline-none focus:border-blue-500 transition-colors" rows="3" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} placeholder="Complete mailing address..." />
                            </div>

                            <div className="pt-8 border-t flex justify-between items-center">
                                {formData.id && (
                                    <button 
                                        type="button" 
                                        onClick={() => { if(window.confirm("Delete record?")) { mastersAPI.brokers.delete(formData.id); setIsModalOpen(false); fetchRecords(); }}} 
                                        className="text-red-400 hover:text-red-600 font-bold flex items-center gap-1 text-[10px] tracking-tighter"
                                    >
                                        <Trash2 size={14}/> REMOVE FROM SYSTEM
                                    </button>
                                )}
                                <div className="flex gap-4 ml-auto">
                                    <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-2 font-bold text-slate-400 hover:text-slate-600 text-xs tracking-widest">CANCEL</button>
                                    <button type="submit" disabled={loading} className="bg-[#2563eb] hover:bg-blue-700 text-white px-10 py-3 rounded-xl font-black shadow-lg shadow-blue-100 flex items-center gap-2 active:scale-95 transition-all text-xs tracking-widest">
                                        <Save size={16}/> {loading ? 'SAVING...' : 'SAVE BROKER'}
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <style jsx>{`
                ::-webkit-scrollbar { width: 6px; }
                ::-webkit-scrollbar-track { background: transparent; }
                ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
                ::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
            `}</style>
        </div>
    );
};

export default BrokerMaster;