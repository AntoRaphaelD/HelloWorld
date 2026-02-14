import React, { useState, useEffect, useMemo } from 'react';
import { mastersAPI, transactionsAPI } from '../service/api';
import { 
    Download, Save, History, Search, ChevronRight, Hash, 
    Calendar, Warehouse, ArrowRight, FileText, LayoutGrid,
    Plus, Trash2, X, RefreshCw, ChevronLeft, Edit,
    Square, CheckSquare, Info, Activity, PackageCheck
} from 'lucide-react';

const DepotStockReceived = () => {
    // --- Initial States ---
    const emptyState = { 
        id: null,
        code: '', 
        date: new Date().toISOString().split('T')[0], 
        depot_id: '', 
        received_inv_from: '', 
        received_inv_to: '' 
    };

    // --- Main States ---
    const [list, setList] = useState([]);
    const [depots, setDepots] = useState([]);
    const [formData, setFormData] = useState(emptyState);
    const [loading, setLoading] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);

    // --- Search, Sort & Selection States ---
    const [isSelectionMode, setIsSelectionMode] = useState(false);
    const [selectedIds, setSelectedIds] = useState([]);
    const [searchField, setSearchField] = useState('depot_name');
    const [searchValue, setSearchValue] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    // --- Initialization ---
    useEffect(() => {
        fetchMasters();
        fetchRecords();
    }, []);

    const fetchMasters = async () => {
        try {
            const res = await mastersAPI.accounts.getAll();
            const all = res.data.data || res.data || [];
            setDepots(all.filter(a => a.account_group === 'Depot'));
        } catch (err) { console.error("Master fetch error", err); }
    };

    const fetchRecords = async () => {
        setLoading(true);
        try {
            const res = await transactionsAPI.depotReceived.getAll();
            const data = Array.isArray(res.data) ? res.data : (res.data.data || []);
            setList(data);
        } catch (err) { console.error("Records fetch error", err); }
        finally { setLoading(false); }
    };

    // --- Logic: Search & Pagination ---
    const processedData = useMemo(() => {
        let result = [...list];
        if (searchValue) {
            result = result.filter(item => {
                const val = searchField === 'depot_name' 
                    ? String(item.Depot?.account_name || '').toLowerCase()
                    : String(item[searchField] || '').toLowerCase();
                return val.includes(searchValue.toLowerCase());
            });
        }
        return result.sort((a, b) => b.id - a.id);
    }, [list, searchValue, searchField]);

    const currentItems = processedData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
    const totalPages = Math.ceil(processedData.length / itemsPerPage) || 1;

    // --- Action Handlers ---
    const handleAddNew = () => {
        setFormData(emptyState);
        setIsModalOpen(true);
    };

    const handleRowClick = (item) => {
        if (isSelectionMode) {
            setSelectedIds(prev => prev.includes(item.id) ? prev.filter(i => i !== item.id) : [...prev, item.id]);
            return;
        }
        setFormData({
            ...item,
            depot_id: item.depot_id?.toString()
        });
        setIsModalOpen(true);
    };

    const handleSave = async (e) => {
        if (e) e.preventDefault();
        if (!formData.depot_id) return alert("Please select a Receiving Warehouse");
        
        setLoading(true);
        try {
            if (formData.id) await transactionsAPI.depotReceived.update(formData.id, formData);
            else await transactionsAPI.depotReceived.create(formData);
            
            setIsModalOpen(false);
            fetchRecords();
        } catch (err) { alert("Error verifying inbound shipment"); }
        finally { setLoading(false); }
    };

    const handleBulkDelete = async () => {
        if (selectedIds.length === 0) return;
        if (window.confirm(`Delete ${selectedIds.length} inbound logs permanently?`)) {
            setLoading(true);
            try {
                await Promise.all(selectedIds.map(id => transactionsAPI.depotReceived.delete(id)));
                setSelectedIds([]);
                setIsSelectionMode(false);
                fetchRecords();
            } catch (err) { alert("Delete failed"); }
            finally { setLoading(false); }
        }
    };

    return (
        <div className="min-h-screen bg-[#f8fafc] p-6 font-sans">
            
            {/* 1. TOP HEADER */}
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
                        <Download className="text-indigo-600" size={28} /> Depot Inbound Registry
                    </h1>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Inward Manifest and Shipment Verification</p>
                </div>
                
                <div className="flex gap-2">
                    <button onClick={handleAddNew} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg font-bold shadow-md transition-all active:scale-95">
                        <Plus size={18} /> New Inward
                    </button>
                    
                    <button 
                        onClick={() => { setIsSelectionMode(!isSelectionMode); setSelectedIds([]); }}
                        className={`px-6 py-2 border rounded-lg font-bold transition-all ${isSelectionMode ? 'bg-amber-100 border-amber-300 text-amber-700' : 'bg-white border-slate-200 text-indigo-600 hover:bg-slate-50'}`}
                    >
                        {isSelectionMode ? 'Cancel' : 'Select'}
                    </button>

                    <button 
                        onClick={handleBulkDelete}
                        disabled={selectedIds.length === 0}
                        className={`px-6 py-2 border rounded-lg font-bold flex items-center gap-2 transition-all ${selectedIds.length > 0 ? 'bg-red-50 border-red-200 text-red-600 shadow-sm' : 'bg-white border-slate-100 text-slate-300 cursor-not-allowed'}`}
                    >
                        <Trash2 size={18} /> Delete {selectedIds.length > 0 && `(${selectedIds.length})`}
                    </button>
                    <button onClick={fetchRecords} className="p-2 border rounded-lg bg-white text-slate-400 hover:text-indigo-600 transition-colors">
                        <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                    </button>
                </div>
            </div>

            {/* 2. SEARCH BAR */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm mb-6 flex flex-wrap gap-4 items-end">
                <div className="flex-1 min-w-[200px]">
                    <label className="text-[10px] font-black text-slate-400 uppercase mb-1 block ml-1">Search Property</label>
                    <div className="flex gap-2">
                        <select value={searchField} onChange={(e) => setSearchField(e.target.value)} className="border border-slate-200 p-2.5 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500">
                            <option value="depot_name">Depot / Warehouse</option>
                            <option value="received_inv_from">Inv Number</option>
                        </select>
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-3 text-slate-400" size={16}/>
                            <input type="text" placeholder="Filter inbound history..." value={searchValue} onChange={(e) => setSearchValue(e.target.value)} className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500" />
                        </div>
                    </div>
                </div>
                <button onClick={() => setSearchValue('')} className="px-6 py-2.5 text-sm font-bold text-slate-500 hover:bg-slate-100 rounded-lg transition-all">Show All</button>
            </div>

            {/* 3. DATA TABLE */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-md overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-indigo-950 text-white">
                            <tr>
                                {isSelectionMode && <th className="p-4 w-12 text-center"><Square size={20} className="mx-auto" /></th>}
                                <th className="p-4 text-[10px] font-black uppercase tracking-[0.2em]">Ref ID</th>
                                <th className="p-4 text-[10px] font-black uppercase tracking-[0.2em]">Arrival Date</th>
                                <th className="p-4 text-[10px] font-black uppercase tracking-[0.2em]">Receiving Warehouse</th>
                                <th className="p-4 text-[10px] font-black uppercase tracking-[0.2em]">Invoice Sequence Batch</th>
                                <th className="p-4 text-[10px] font-black uppercase tracking-[0.2em] text-center w-20">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {currentItems.length > 0 ? currentItems.map((item) => (
                                <tr key={item.id} onClick={() => handleRowClick(item)} className={`transition-colors cursor-pointer ${selectedIds.includes(item.id) ? 'bg-indigo-50' : 'hover:bg-slate-50'}`}>
                                    {isSelectionMode && (
                                        <td className="p-4 text-center">
                                            {selectedIds.includes(item.id) ? <CheckSquare size={20} className="text-indigo-600 mx-auto"/> : <Square size={20} className="text-slate-200 mx-auto"/>}
                                        </td>
                                    )}
                                    <td className="p-4 text-sm font-bold text-indigo-600 font-mono">#{item.id}</td>
                                    <td className="p-4 text-sm text-slate-500">{item.date}</td>
                                    <td className="p-4 text-sm font-black text-slate-700 uppercase">{item.Depot?.account_name}</td>
                                    <td className="p-4">
                                        <div className="flex items-center gap-3 text-[11px] font-black text-slate-500 bg-slate-50 w-fit px-4 py-1.5 rounded-full border border-dashed">
                                            <span>INV {item.received_inv_from}</span>
                                            <ArrowRight size={14} className="text-indigo-300"/>
                                            <span>INV {item.received_inv_to}</span>
                                        </div>
                                    </td>
                                    <td className="p-4 text-center">
                                        <button className="p-2 text-slate-300 hover:text-indigo-600 transition-colors"><Edit size={16}/></button>
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan={6} className="p-20 text-center opacity-20">
                                        <Download size={48} className="mx-auto mb-2"/>
                                        <p className="font-black uppercase tracking-widest">No Manifest Logs Found</p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* 4. PAGINATION FOOTER */}
                <div className="p-4 bg-slate-50 border-t flex items-center justify-between">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        Showing {currentItems.length} of {processedData.length} Logs
                    </p>
                    <div className="flex gap-2">
                        <button disabled={currentPage === 1} onClick={() => setCurrentPage(prev => prev - 1)} className="p-2 border rounded-lg bg-white disabled:opacity-30 hover:bg-slate-100 transition-all shadow-sm active:scale-95">
                            <ChevronLeft size={18}/>
                        </button>
                        <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(prev => prev + 1)} className="p-2 border rounded-lg bg-white disabled:opacity-30 hover:bg-slate-100 transition-all shadow-sm active:scale-95">
                            <ChevronRight size={18}/>
                        </button>
                    </div>
                </div>
            </div>

            {/* 5. MODAL FORM POPUP */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-5xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in duration-200">
                        {/* Modal Header */}
                        <div className="bg-indigo-950 p-6 flex justify-between items-center text-white">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-indigo-500 rounded-xl text-indigo-950"><PackageCheck /></div>
                                <div>
                                    <h2 className="font-black uppercase tracking-widest text-xl">{formData.id ? 'Modify Inbound Log' : 'Shipment Verification'}</h2>
                                    <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">Depot Registry Console</p>
                                </div>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="hover:bg-white/10 p-2 rounded-full transition-colors"><X size={24}/></button>
                        </div>

                        {/* Modal Body */}
                        <div className="flex-1 overflow-y-auto p-8 grid grid-cols-1 lg:grid-cols-2 gap-10">
                            
                            {/* LEFT COLUMN: IDENTITY */}
                            <div className="space-y-6">
                                <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100 space-y-6">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Arrival Date</label>
                                        <div className="relative">
                                            <Calendar className="absolute left-3 top-3.5 text-slate-300" size={18} />
                                            <input type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className="w-full pl-10 p-3 bg-white border border-slate-200 rounded-xl font-bold font-mono outline-none focus:ring-2 focus:ring-indigo-500" />
                                        </div>
                                    </div>
                                    
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Receiving Warehouse (Depot)</label>
                                        <div className="relative">
                                            <Warehouse className="absolute left-3 top-3.5 text-slate-300" size={18} />
                                            <select 
                                                value={formData.depot_id} 
                                                onChange={e => setFormData({...formData, depot_id: e.target.value})} 
                                                className="w-full pl-10 p-3 bg-white border border-slate-200 rounded-xl font-black outline-none focus:ring-2 focus:ring-indigo-500 appearance-none"
                                            >
                                                <option value="">-- Choose Depot --</option>
                                                {depots.map(p => <option key={p.id} value={p.id}>{p.account_name}</option>)}
                                            </select>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-blue-50 p-6 rounded-3xl border border-blue-100 flex items-start gap-4">
                                    <Info className="text-blue-500 mt-1 shrink-0" size={20} />
                                    <div>
                                        <h4 className="text-[10px] font-black text-blue-900 uppercase">Verification Tip</h4>
                                        <p className="text-xs text-blue-700 font-medium leading-relaxed">Ensure the invoice sequence matches the physical manifest received at the warehouse gate.</p>
                                    </div>
                                </div>
                            </div>

                            {/* RIGHT COLUMN: SEQUENCE BATCH CARD */}
                            <div className="bg-indigo-950 rounded-[2.5rem] p-10 text-white flex flex-col justify-between shadow-2xl relative border border-slate-800">
                                <Activity className="absolute top-6 right-6 text-indigo-500/20" size={80} />
                                
                                <div className="space-y-12 relative">
                                    <div className="flex items-center gap-3 font-black text-[10px] uppercase text-indigo-400 tracking-[0.2em] mb-4">
                                        <FileText size={16}/> Sequence Registry Batch
                                    </div>

                                    <div className="space-y-8">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">Invoices Starting From</label>
                                            <input 
                                                className="w-full bg-indigo-900/40 border-b-4 border-indigo-500/30 p-4 text-5xl font-black text-white outline-none focus:border-indigo-400 transition-colors" 
                                                placeholder="000"
                                                value={formData.received_inv_from} 
                                                onChange={e => setFormData({...formData, received_inv_from: e.target.value})} 
                                            />
                                        </div>

                                        <div className="flex justify-center">
                                            <div className="h-10 w-1 bg-indigo-800 rounded-full" />
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">Ending At</label>
                                            <div className="flex items-center gap-4">
                                                <ArrowRight className="text-indigo-600 shrink-0" size={32}/>
                                                <input 
                                                    className="w-full bg-indigo-900/40 border-b-4 border-indigo-500/30 p-4 text-5xl font-black text-white outline-none focus:border-indigo-400 transition-colors" 
                                                    placeholder="000"
                                                    value={formData.received_inv_to} 
                                                    onChange={e => setFormData({...formData, received_inv_to: e.target.value})} 
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-12 bg-white/5 p-4 rounded-2xl border border-white/10 text-center">
                                    <p className="text-[9px] font-black text-indigo-300 uppercase tracking-widest">Manifest Reference ID</p>
                                    <h3 className="text-xl font-black text-white">{formData.id ? `LOG-${formData.id}` : 'NEW_LOG'}</h3>
                                </div>
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="p-6 bg-slate-50 border-t flex justify-end items-center gap-4">
                            <button onClick={() => setIsModalOpen(false)} className="px-8 py-3 font-bold text-slate-400 hover:text-slate-600 text-xs tracking-widest uppercase">Discard</button>
                            <button onClick={handleSave} disabled={loading} className="bg-indigo-600 hover:bg-indigo-700 text-white px-10 py-3 rounded-xl font-black shadow-lg shadow-indigo-100 flex items-center gap-2 active:scale-95 transition-all text-xs tracking-widest uppercase">
                                <Save size={18}/> {loading ? 'Committing...' : 'Commit Shipment'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <style jsx>{`
                ::-webkit-scrollbar { width: 5px; height: 5px; }
                ::-webkit-scrollbar-track { background: transparent; }
                ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
            `}</style>
        </div>
    );
};

export default DepotStockReceived;