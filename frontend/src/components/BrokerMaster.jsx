import React, { useState, useEffect, useMemo } from 'react';
import { mastersAPI } from '../service/api';
import { 
    Save, FileText, Briefcase, Calculator, 
    Search, Plus, Trash2, X, RefreshCw,
    ChevronLeft, ChevronRight, Square, CheckSquare, 
    Edit, MapPin, Package, Clock, ShieldCheck,
    Percent, DollarSign, Info, Filter, Database, 
    Activity, ArrowRightCircle, AlertCircle, CircleDollarSign
} from 'lucide-react';

const BrokerMaster = () => {
    // --- Initial States ---
    const emptyBroker = { 
        id: null,
        broker_code: '',
        broker_name: '',
        commission_pct: 0,
        address: ''
    };

    // --- Main States ---
    const [list, setList] = useState([]);
    const [formData, setFormData] = useState(emptyBroker);
    const [loading, setLoading] = useState(false);
    const [submitLoading, setSubmitLoading] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [activeTab, setActiveTab] = useState('head');

    // Search & Selection
    const [searchField, setSearchField] = useState('broker_name');
    const [searchCondition, setSearchCondition] = useState('Like');
    const [searchValue, setSearchValue] = useState('');
    const [isSelectionMode, setIsSelectionMode] = useState(false);
    const [selectedIds, setSelectedIds] = useState([]);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    // --- Initialization ---
    useEffect(() => {
        fetchRecords();
    }, []);

    const fetchRecords = async () => {
        setLoading(true);
        try {
            const res = await mastersAPI.brokers.getAll();
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
            const num = parseInt(item.broker_code, 10);
            return !isNaN(num) ? Math.max(max, num) : max;
        }, 0);
        setFormData({ ...emptyBroker, broker_code: (maxCode + 1).toString() });
        setActiveTab('head');
        setIsModalOpen(true);
    };

    const handleSave = async () => {
        if (!formData.broker_name) return alert("Broker Name is required");
        setSubmitLoading(true);
        try {
            if (formData.id) await mastersAPI.brokers.update(formData.id, formData);
            else await mastersAPI.brokers.create(formData);
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

        // Edit mode
        setFormData({ ...item });
        setActiveTab('head');
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
                        <Briefcase className="text-blue-600" /> Broker Master
                    </h1>
                    <p className="text-sm text-slate-500">Agent registry, commission logic and contact mapping</p>
                </div>
                <div className="flex gap-2">
                    <button onClick={() => { setIsSelectionMode(!isSelectionMode); setSelectedIds([]); }}
                        className={`px-5 py-2 border rounded-lg font-semibold transition-all ${isSelectionMode ? 'bg-amber-100 border-amber-300 text-amber-700' : 'bg-white border-slate-200 text-blue-600 hover:bg-slate-50'}`}>
                        {isSelectionMode ? 'Cancel' : 'Select'}
                    </button>
                    <button onClick={handleAddNew} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg font-semibold shadow-sm transition-all active:scale-95">
                        <Plus size={18} /> New Entry
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
                            <option value="broker_name">Broker Name</option>
                            <option value="broker_code">Broker Code</option>
                        </select>
                    </div>
                    <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block ml-1">Condition</label>
                        <select value={searchCondition} onChange={(e) => setSearchCondition(e.target.value)} className="w-full border border-slate-200 p-2 rounded-lg text-sm outline-none focus:ring-1 focus:ring-blue-500">
                            <option value="Like">Like</option>
                            <option value="Equal">Equal</option>
                        </select>
                    </div>
                    <div className="md:col-span-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block ml-1">Value</label>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                            <input type="text" placeholder="Search..." value={searchValue} onChange={(e) => setSearchValue(e.target.value)} className="w-full border border-slate-200 pl-10 pr-4 py-2 rounded-lg text-sm outline-none focus:ring-1 focus:ring-blue-500 bg-white" />
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
                            <tr className="bg-blue-600 text-white">
                                {isSelectionMode && <th className="p-4 w-12 text-center"><Square size={18} className="mx-auto" /></th>}
                                <th className="p-4 text-sm font-semibold uppercase tracking-wider">Code</th>
                                <th className="p-4 text-sm font-semibold uppercase tracking-wider">Broker Name</th>
                                <th className="p-4 text-sm font-semibold uppercase tracking-wider">Address</th>
                                <th className="p-4 text-sm font-semibold uppercase tracking-wider text-right">Commission (%)</th>
                                {!isSelectionMode && <th className="p-4 w-10"></th>}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-mono">
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="py-24">
                                        <div className="flex flex-col items-center justify-center">
                                            <RefreshCw size={48} className="animate-spin text-blue-500 mb-4" />
                                            <p className="text-slate-500 font-medium">Loading broker records...</p>
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
                                        <td className="p-4 text-sm font-black text-blue-600">{item.broker_code}</td>
                                        <td className="p-4 text-sm font-bold text-slate-700 uppercase font-sans">{item.broker_name}</td>
                                        <td className="p-4 text-xs font-bold text-slate-500 uppercase font-sans truncate max-w-[300px]">{item.address || '---'}</td>
                                        <td className="p-4 text-sm font-black text-right text-emerald-600 font-mono">{item.commission_pct}%</td>
                                        {!isSelectionMode && <td className="p-4"><Edit size={16} className="text-slate-300" /></td>}
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={6} className="py-28">
                                        <div className="flex flex-col items-center justify-center text-center">
                                            <div className="w-24 h-24 bg-slate-100 rounded-3xl flex items-center justify-center mb-8 shadow-inner">
                                                {searchValue.trim() ? (
                                                    <Search size={56} className="text-amber-400" />
                                                ) : (
                                                    <Briefcase size={56} className="text-slate-300" />
                                                )}
                                            </div>
                                            
                                            <h3 className="text-2xl font-semibold text-slate-800 mb-3 tracking-tight">
                                                {searchValue.trim() ? "No matching brokers found" : "No brokers registered yet"}
                                            </h3>
                                            
                                            <p className="text-slate-500 max-w-md text-[15px]">
                                                {searchValue.trim() 
                                                    ? `We couldn't find any broker records matching "${searchValue}".`
                                                    : "Your agent and broker master records will appear here. Ready to start commission management?"
                                                }
                                            </p>

                                            {searchValue.trim() ? (
                                                <button 
                                                    onClick={() => setSearchValue('')}
                                                    className="mt-8 px-6 py-3 bg-white border border-slate-300 hover:border-slate-400 rounded-2xl text-sm font-medium text-slate-700 transition-colors flex items-center gap-2"
                                                >
                                                    <RefreshCw size={18} /> Clear search
                                                </button>
                                            ) : (
                                                <button 
                                                    onClick={handleAddNew}
                                                    className="mt-8 flex items-center gap-3 bg-blue-600 hover:bg-blue-700 text-white px-8 py-3.5 rounded-2xl font-semibold shadow-sm active:scale-[0.97] transition-all"
                                                >
                                                    <Plus size={20} /> Create First Broker
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* 4. MODAL COCKPIT */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl overflow-hidden flex flex-col max-h-[95vh] animate-in zoom-in duration-200">
                        
                        {/* Modal Header */}
                        <div className="bg-blue-600 p-4 flex justify-between items-center text-white shadow-lg">
                            <div className="flex items-center gap-4">
                                <div className="p-2 bg-white/20 rounded-lg"><Briefcase size={20} /></div>
                                <div>
                                    <h2 className="font-bold uppercase tracking-tight">Broker Registry Entry</h2>
                                    <p className="text-[10px] font-bold text-blue-100 uppercase">System Code: BRK-{formData.broker_code}</p>
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
                                        <Database size={14}/><span className="text-[9px] font-black uppercase">Metadata</span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <InputField label="Broker Code" value={formData.broker_code} readOnly className="font-mono text-blue-600" />
                                        <InputField label="Broker Name *" value={formData.broker_name} onChange={e => setFormData({...formData, broker_name: e.target.value.toUpperCase()})} />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Registered Address</label>
                                        <textarea 
                                            value={formData.address} 
                                            onChange={e => setFormData({...formData, address: e.target.value.toUpperCase()})} 
                                            rows={4}
                                            className="w-full bg-white border border-slate-200 p-3 rounded-xl text-xs font-bold outline-none focus:ring-1 focus:ring-blue-500 shadow-inner resize-none"
                                            placeholder="ENTER FULL COMMUNICATION ADDRESS..."
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* RIGHT SIDE: Financial Cockpit */}
                            <div className="w-full lg:w-80 bg-slate-900 rounded-2xl p-6 text-white flex flex-col justify-between shadow-2xl">
                                <div className="space-y-6">
                                    <div className="text-center mb-6">
                                        <Activity size={32} className="text-blue-400 mx-auto mb-1" />
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Commission Logic</p>
                                    </div>

                                    <div className="space-y-4">
                                        <div className="space-y-1">
                                            <label className="text-[9px] font-black text-slate-500 uppercase block tracking-tighter mb-1">Standard Commission %</label>
                                            <div className="relative">
                                                <Percent className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                                                <input 
                                                    type="number" 
                                                    step="0.01" 
                                                    className="w-full bg-white/5 border border-white/10 rounded-xl p-4 pl-10 text-right text-2xl font-black font-mono outline-none focus:border-blue-500 text-white" 
                                                    value={formData.commission_pct} 
                                                    onChange={e => setFormData({...formData, commission_pct: e.target.value})} 
                                                />
                                            </div>
                                        </div>
                                        <div className="p-4 bg-blue-600/10 rounded-xl border border-blue-500/20">
                                            <p className="text-[10px] text-slate-400 leading-relaxed uppercase font-bold text-center italic">
                                                Commission is auto-calculated on the net invoice value during sales transactions.
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-8 p-6 bg-blue-600/10 rounded-3xl border border-blue-500/20 text-center relative overflow-hidden group">
                                    <CircleDollarSign className="absolute -right-2 -bottom-2 text-white/5 group-hover:scale-110 transition-transform" size={80} />
                                    <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1 relative z-10">Registry Status</p>
                                    <h3 className="text-xl font-black text-white uppercase relative z-10">{formData.id ? 'ACTIVE AGENT' : 'NEW REGISTRY'}</h3>
                                </div>
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="p-6 bg-slate-50 border-t flex justify-end items-center gap-4">
                            {formData.id && (
                                <button 
                                    onClick={() => { if(window.confirm("Purge broker record?")) mastersAPI.brokers.delete(formData.id).then(fetchRecords).then(() => setIsModalOpen(false)); }}
                                    className="mr-auto text-rose-500 text-[10px] font-bold uppercase tracking-widest hover:bg-rose-50 px-4 py-2 rounded-lg transition-all"
                                >
                                    Purge Record
                                </button>
                            )}
                            <button onClick={() => setIsModalOpen(false)} className="px-8 py-3 font-bold text-slate-400 hover:text-slate-700 text-xs tracking-widest uppercase transition-colors">Discard</button>
                            <button onClick={handleSave} disabled={submitLoading} className="bg-blue-600 hover:bg-blue-700 text-white px-10 py-3 rounded-xl font-black shadow-xl flex items-center gap-2 active:scale-95 transition-all text-xs tracking-widest uppercase">
                                <Save size={18}/> {submitLoading ? 'SAVING...' : 'FINALIZE ENTRY'}
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

export default BrokerMaster;