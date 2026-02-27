import React, { useState, useEffect, useMemo } from 'react';
import { mastersAPI } from '../service/api';
import { 
    Save, Truck, Search, Plus, Trash2, X, RefreshCw,
    ChevronLeft, ChevronRight, Square, CheckSquare, 
    Edit, MapPin, Package, Info, Filter, Database, 
    Activity, Building2, Map, Globe, ShieldCheck
} from 'lucide-react';

const TransportMaster = () => {
    // --- Initial States (Preserved Original Fields) ---
    const emptyTransport = {
        id: null,
        transport_code: '',
        transport_name: '',
        place: '',
        address: ''
    };

    // --- Main States ---
    const [list, setList] = useState([]);
    const [formData, setFormData] = useState(emptyTransport);
    const [loading, setLoading] = useState(false);
    const [submitLoading, setSubmitLoading] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [activeTab, setActiveTab] = useState('general');

    // Search & Selection
    const [searchField, setSearchField] = useState('transport_name');
    const [searchCondition, setSearchCondition] = useState('Like');
    const [searchValue, setSearchValue] = useState('');
    const [isSelectionMode, setIsSelectionMode] = useState(false);
    const [selectedIds, setSelectedIds] = useState([]);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    // --- API Integration ---
    useEffect(() => {
        fetchRecords();
    }, []);

    const fetchRecords = async () => {
        setLoading(true);
        try {
            const res = await mastersAPI.transports.getAll();
            const data = res?.data?.data || res?.data || [];
            setList(Array.isArray(data) ? data : []);
        } catch (err) { 
            console.error("Fetch Error", err);
            setList([]);
        } finally { 
            setLoading(false); 
        }
    };

    // --- Action Handlers ---
    const handleAddNew = () => {
        const safeList = Array.isArray(list) ? list : [];
        const maxCode = safeList.reduce((max, item) => {
            const num = parseInt(item.transport_code, 10);
            return !isNaN(num) ? Math.max(max, num) : max;
        }, 0);
        setFormData({ ...emptyTransport, transport_code: (maxCode + 1).toString() });
        setActiveTab('general');
        setIsModalOpen(true);
    };

    const handleSave = async () => {
        if (!formData.transport_name) return alert("Transport Name is required");
        setSubmitLoading(true);
        try {
            if (formData.id) await mastersAPI.transports.update(formData.id, formData);
            else await mastersAPI.transports.create(formData);
            setIsModalOpen(false);
            fetchRecords();
        } catch (err) { 
            alert("Save failed"); 
        } finally { 
            setSubmitLoading(false); 
        }
    };

    const handleRowClick = (item) => {
        if (isSelectionMode) {
            setSelectedIds(prev =>
                prev.includes(item.id)
                    ? prev.filter(id => id !== item.id)
                    : [...prev, item.id]
            );
            return;
        }
        setFormData({ ...item });
        setActiveTab('general');
        setIsModalOpen(true);
    };

    // --- Dynamic Filtering Logic ---
    const filteredData = useMemo(() => {
        let result = Array.isArray(list) ? [...list] : [];
        if (searchValue.trim()) {
            result = result.filter(item => {
                const itemValue = String(item[searchField] || "").toLowerCase();
                const term = searchValue.toLowerCase().trim();
                return searchCondition === 'Equal' ? itemValue === term : itemValue.includes(term);
            });
        }
        return result.sort((a, b) => b.id - a.id);
    }, [list, searchValue, searchField, searchCondition]);

    const currentItems = filteredData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
    const totalPages = Math.ceil(filteredData.length / itemsPerPage) || 1;

    return (
        <div className="min-h-screen bg-slate-50 p-6 font-sans text-slate-900">
            
            {/* 1. HEADER SECTION */}
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <Truck className="text-blue-600" /> Transport Master
                    </h1>
                    <p className="text-sm text-slate-500">Logistics partners, freight agencies and distribution registry</p>
                </div>
                <div className="flex gap-2">
                    <button onClick={() => { setIsSelectionMode(!isSelectionMode); setSelectedIds([]); }}
                        className={`px-5 py-2 border rounded-lg font-semibold transition-all ${isSelectionMode ? 'bg-amber-100 border-amber-300 text-amber-700' : 'bg-white border-slate-200 text-blue-600 hover:bg-slate-50'}`}>
                        {isSelectionMode ? 'Cancel' : 'Select'}
                    </button>
                    <button onClick={handleAddNew} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg font-semibold shadow-sm transition-all active:scale-95">
                        <Plus size={18} /> New Transport
                    </button>
                    <button onClick={fetchRecords} className="p-2 border border-slate-200 rounded-lg bg-white text-slate-400 hover:text-blue-600 transition-colors">
                        <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
                    </button>
                </div>
            </div>

            {/* 2. FILTER BAR */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm mb-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                    <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block ml-1">Search Field</label>
                        <select value={searchField} onChange={(e) => setSearchField(e.target.value)} className="w-full border border-slate-200 p-2 rounded-lg text-sm outline-none focus:ring-1 focus:ring-blue-500">
                            <option value="transport_name">Transport Name</option>
                            <option value="place">Place / City</option>
                            <option value="transport_code">Agency Code</option>
                        </select>
                    </div>
                    <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block ml-1">Condition</label>
                        <select value={searchCondition} onChange={(e) => setSearchCondition(e.target.value)} className="w-full border border-slate-200 p-2 rounded-lg text-sm outline-none focus:ring-1 focus:ring-blue-500">
                            <option value="Like">Contains</option>
                            <option value="Equal">Exact</option>
                        </select>
                    </div>
                    <div className="md:col-span-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block ml-1">Value</label>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                            <input type="text" placeholder="Search agencies..." value={searchValue} onChange={(e) => setSearchValue(e.target.value)} className="w-full border border-slate-200 pl-10 pr-4 py-2 rounded-lg text-sm outline-none focus:ring-1 focus:ring-blue-500 bg-white" />
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={() => setSearchValue('')} className="flex-1 border border-slate-200 py-2 rounded-lg text-sm font-bold hover:bg-slate-50 transition-all">Clear</button>
                        <div className="flex-1 bg-blue-50 text-blue-600 border border-blue-100 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2">
                            <Filter size={14}/> {filteredData.length} Matches
                        </div>
                    </div>
                </div>
            </div>

            {/* 3. DATA TABLE */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-blue-600 text-white font-mono">
                                {isSelectionMode && <th className="p-4 w-12 text-center"><Square size={18} className="mx-auto" /></th>}
                                <th className="p-4 text-sm font-semibold uppercase tracking-wider">Agency Code</th>
                                <th className="p-4 text-sm font-semibold uppercase tracking-wider">Transport Name</th>
                                <th className="p-4 text-sm font-semibold uppercase tracking-wider">Place / Hub</th>
                                <th className="p-4 text-sm font-semibold uppercase tracking-wider">Full Address</th>
                                {!isSelectionMode && <th className="p-4 w-10"></th>}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-mono">
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="py-24">
                                        <div className="flex flex-col items-center justify-center">
                                            <RefreshCw size={48} className="animate-spin text-blue-500 mb-4" />
                                            <p className="text-slate-500 font-medium">Accessing logistics data...</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : currentItems.length > 0 ? (
                                currentItems.map((item) => (
                                    <tr 
                                        key={item.id} 
                                        onClick={() => handleRowClick(item)} 
                                        className={`transition-all cursor-pointer hover:bg-blue-50/50 ${selectedIds.includes(item.id) ? 'bg-blue-50' : ''}`}
                                    >
                                        {isSelectionMode && (
                                            <td className="p-4 text-center" onClick={(e) => {e.stopPropagation(); handleRowClick(item);}}>
                                                {selectedIds.includes(item.id) ? <CheckSquare size={18} className="text-blue-600 mx-auto"/> : <Square size={18} className="text-slate-200 mx-auto"/>}
                                            </td>
                                        )}
                                        <td className="p-4 text-sm font-black text-blue-600">{item.transport_code || '---'}</td>
                                        <td className="p-4 text-sm font-bold text-slate-700 uppercase font-sans">{item.transport_name}</td>
                                        <td className="p-4 text-sm font-bold text-blue-500 uppercase font-sans">
                                            <div className="flex items-center gap-1"><MapPin size={12} className="text-slate-300"/> {item.place || 'LOCAL'}</div>
                                        </td>
                                        <td className="p-4 text-xs font-bold text-slate-500 uppercase font-sans truncate max-w-[400px]">
                                            {item.address || '---'}
                                        </td>
                                        {!isSelectionMode && <td className="p-4"><Edit size={16} className="text-slate-300" /></td>}
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={6} className="py-28 text-center">
                                        <div className="flex flex-col items-center justify-center">
                                            <Truck size={56} className="text-slate-200 mb-4" />
                                            <h3 className="text-xl font-bold text-slate-400 uppercase">No Agencies Found</h3>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
                {/* Pagination */}
                <div className="p-4 bg-slate-50 border-t flex items-center justify-between">
                    <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Page {currentPage} of {totalPages}</span>
                    <div className="flex gap-1">
                        <button disabled={currentPage === 1} onClick={() => setCurrentPage(prev => prev - 1)} className="p-2 border rounded-lg bg-white disabled:opacity-30"><ChevronLeft size={16}/></button>
                        <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(prev => prev + 1)} className="p-2 border rounded-lg bg-white disabled:opacity-30"><ChevronRight size={16}/></button>
                    </div>
                </div>
            </div>

            {/* 4. MODAL COCKPIT */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl overflow-hidden flex flex-col max-h-[95vh] animate-in zoom-in duration-200">
                        
                        {/* Modal Header */}
                        <div className="bg-blue-600 p-4 flex justify-between items-center text-white shadow-lg">
                            <div className="flex items-center gap-4">
                                <div className="p-2 bg-white/20 rounded-lg"><Truck size={20} /></div>
                                <div>
                                    <h2 className="font-bold uppercase tracking-tight">Logistics Agency Entry</h2>
                                    <p className="text-[10px] font-bold text-blue-100 uppercase">Agency ID: #{formData.transport_code}</p>
                                </div>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="hover:bg-blue-500 p-1 rounded-full"><X size={24}/></button>
                        </div>

                        {/* Modal Body */}
                        <div className="flex-1 overflow-y-auto p-6 flex flex-col lg:flex-row gap-6 bg-slate-50/50">
                            
                            {/* LEFT SIDE: Entry Form */}
                            <div className="flex-1 space-y-6">
                                <div className="bg-white p-6 rounded-2xl space-y-4 border shadow-sm">
                                    <div className="flex items-center gap-2 mb-2 text-slate-400">
                                        <Database size={14}/><span className="text-[9px] font-black uppercase">Technical Metadata</span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <InputField label="Transport Code" value={formData.transport_code} readOnly className="font-mono text-blue-600" />
                                        <InputField label="Transport Name *" value={formData.transport_name} onChange={e => setFormData({...formData, transport_name: e.target.value.toUpperCase()})} />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Operating Hub / Place</label>
                                        <div className="relative">
                                            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                                            <input value={formData.place} onChange={e => setFormData({...formData, place: e.target.value.toUpperCase()})} className="w-full bg-white border border-slate-200 pl-10 p-2 rounded-lg text-sm font-bold outline-none focus:ring-1 focus:ring-blue-500 uppercase" placeholder="e.g. BHIWANDI" />
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Registered Office Address</label>
                                        <textarea 
                                            value={formData.address} 
                                            onChange={e => setFormData({...formData, address: e.target.value.toUpperCase()})} 
                                            rows={5}
                                            className="w-full bg-white border border-slate-200 p-3 rounded-xl text-xs font-bold outline-none focus:ring-1 focus:ring-blue-500 shadow-inner resize-none uppercase"
                                            placeholder="ENTER COMPLETE TRANSPORT OFFICE ADDRESS..."
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* RIGHT SIDE: Logistics Cockpit */}
                            <div className="w-full lg:w-80 bg-slate-900 rounded-2xl p-6 text-white flex flex-col justify-between shadow-2xl">
                                <div className="space-y-6">
                                    <div className="text-center mb-6">
                                        <Activity size={32} className="text-blue-400 mx-auto mb-1" />
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Agency Status Dashboard</p>
                                    </div>

                                    <div className="space-y-4">
                                        <div className="p-4 bg-white/5 rounded-xl border border-white/5 space-y-3">
                                            <div className="flex justify-between items-center text-[10px] font-bold text-slate-500 uppercase">
                                                <span>Agency Rating</span>
                                                <span className="text-blue-400">Verified Partner</span>
                                            </div>
                                            <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                                <div className="w-full h-full bg-blue-500"></div>
                                            </div>
                                        </div>
                                        
                                        <div className="p-4 bg-emerald-600/10 rounded-xl border border-emerald-500/20 flex items-center gap-3">
                                            <ShieldCheck size={20} className="text-emerald-500" />
                                            <p className="text-[10px] font-bold text-emerald-400 leading-tight uppercase">
                                                LR & Tracking compliance verified for logistics.
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-8 p-6 bg-blue-600/10 rounded-3xl border border-blue-500/20 text-center relative overflow-hidden group">
                                    <Building2 className="absolute -right-2 -bottom-2 text-white/5 group-hover:scale-110 transition-transform" size={80} />
                                    <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1 relative z-10">Network Hub</p>
                                    <h3 className="text-xl font-black text-white uppercase relative z-10">{formData.place || 'GLOBAL HUB'}</h3>
                                </div>
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="p-6 bg-slate-50 border-t flex justify-end items-center gap-4">
                            {formData.id && (
                                <button 
                                    onClick={() => { if(window.confirm("Purge agency record?")) mastersAPI.transports.delete(formData.id).then(fetchRecords).then(() => setIsModalOpen(false)); }}
                                    className="mr-auto text-rose-500 text-[10px] font-bold uppercase tracking-widest hover:bg-rose-50 px-4 py-2 rounded-lg transition-all"
                                >
                                    Purge Record
                                </button>
                            )}
                            <button onClick={() => setIsModalOpen(false)} className="px-8 py-3 font-bold text-slate-400 hover:text-slate-700 text-xs tracking-widest uppercase transition-colors">Discard</button>
                            <button onClick={handleSave} disabled={submitLoading} className="bg-blue-600 hover:bg-blue-700 text-white px-10 py-3 rounded-xl font-black shadow-xl flex items-center gap-2 active:scale-95 transition-all text-xs tracking-widest uppercase">
                                <Save size={18}/> {submitLoading ? 'SAVING...' : 'SAVE TRANSPORT'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <style jsx>{`
                input[type='number']::-webkit-inner-spin-button, 
                input[type='number']::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
                ::-webkit-scrollbar { width: 5px; height: 5px; }
                ::-webkit-scrollbar-track { background: transparent; }
                ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
            `}</style>
        </div>
    );
};

// HELPER COMPONENTS
const InputField = ({ label, className = "", ...props }) => (
    <div className={`space-y-1 ${className}`}>
        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">{label}</label>
        <input {...props} className="w-full bg-white border border-slate-200 p-2 rounded-lg text-xs font-bold outline-none focus:ring-1 focus:ring-blue-500" />
    </div>
);

export default TransportMaster;