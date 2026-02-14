import React, { useState, useEffect, useMemo } from 'react';
import { mastersAPI, transactionsAPI } from '../service/api';
import { 
    Database, Save, Package, Search, History, ChevronRight, 
    Warehouse, Calendar, Scale, Boxes, AlertTriangle, 
    CheckCircle2, Info, Plus, Trash2, X, RefreshCw, 
    ChevronLeft, Edit, Square, CheckSquare, Activity
} from 'lucide-react';

export const DepotOpeningStock = () => {
    // --- Initial States ---
    const emptyState = {
        id: null,
        depot_id: '',
        date: new Date().toISOString().split('T')[0],
        product_id: '',
        total_kgs: '',
        total_bags: ''
    };

    // --- Main States ---
    const [list, setList] = useState([]);
    const [formData, setFormData] = useState(emptyState);
    const [loading, setLoading] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);

    // --- Master Data ---
    const [depots, setDepots] = useState([]);
    const [products, setProducts] = useState([]);

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
            const [dep, pro] = await Promise.all([
                mastersAPI.accounts.getAll({ account_group: 'Depot' }),
                mastersAPI.products.getAll()
            ]);
            setDepots(dep.data.data || dep.data || []);
            setProducts(pro.data.data || pro.data || []);
        } catch (err) { console.error("Master Data Error", err); }
    };

    const fetchRecords = async () => {
        setLoading(true);
        try {
            // Fetching opening stock logs
            const res = await transactionsAPI.depotReceived.getAll();
            const data = Array.isArray(res.data) ? res.data : (res.data.data || []);
            setList(data.filter(item => item.type === 'OPENING' || item.is_opening === true));
        } catch (err) { console.error("Fetch Error", err); }
        finally { setLoading(false); }
    };

    // --- Logic: Search & Pagination ---
    const processedData = useMemo(() => {
        let result = [...list];
        if (searchValue) {
            result = result.filter(item => {
                const searchStr = searchValue.toLowerCase();
                if (searchField === 'depot_name') return String(item.Depot?.account_name || '').toLowerCase().includes(searchStr);
                if (searchField === 'product_name') return String(item.Product?.product_name || '').toLowerCase().includes(searchStr);
                return String(item[searchField] || '').toLowerCase().includes(searchStr);
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
            depot_id: item.depot_id?.toString(),
            product_id: item.product_id?.toString()
        });
        setIsModalOpen(true);
    };

    const handleInitialize = async (e) => {
        if (e) e.preventDefault();
        if (!formData.depot_id || !formData.product_id) return alert("Depot and Product selection required.");
        
        setLoading(true);
        try {
            if (formData.id) await transactionsAPI.depotReceived.update(formData.id, { ...formData, type: 'OPENING' });
            else await transactionsAPI.depotReceived.create({ ...formData, type: 'OPENING' });
            
            setIsModalOpen(false);
            fetchRecords();
        } catch (err) { alert("Initialization failed"); }
        finally { setLoading(false); }
    };

    const handleBulkDelete = async () => {
        if (selectedIds.length === 0) return;
        if (window.confirm(`Delete ${selectedIds.length} opening baseline logs? This will affect current inventory calculations.`)) {
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
                        <Database className="text-indigo-600" size={32} /> Opening Stock Registry
                    </h1>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Depot Inventory Baseline & Ledger Setup</p>
                </div>
                
                <div className="flex gap-2">
                    <button onClick={handleAddNew} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg font-bold shadow-md transition-all active:scale-95">
                        <Plus size={18} /> Initialize Stock
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
                    <label className="text-[10px] font-black text-slate-400 uppercase mb-1 block ml-1">Search Registry</label>
                    <div className="flex gap-2">
                        <select value={searchField} onChange={(e) => setSearchField(e.target.value)} className="border border-slate-200 p-2.5 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500">
                            <option value="depot_name">Depot Name</option>
                            <option value="product_name">Product SKU</option>
                        </select>
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-3 text-slate-400" size={16}/>
                            <input type="text" placeholder="Filter baseline history..." value={searchValue} onChange={(e) => setSearchValue(e.target.value)} className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500" />
                        </div>
                    </div>
                </div>
                <button onClick={() => setSearchValue('')} className="px-6 py-2.5 text-sm font-bold text-slate-500 hover:bg-slate-100 rounded-lg transition-all">Show All</button>
            </div>

            {/* 3. DATA TABLE */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-md overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-900 text-white">
                            <tr>
                                {isSelectionMode && <th className="p-4 w-12 text-center"><Square size={20} className="mx-auto" /></th>}
                                <th className="p-4 text-[10px] font-black uppercase tracking-[0.2em]">Log ID</th>
                                <th className="p-4 text-[10px] font-black uppercase tracking-[0.2em]">Baseline Date</th>
                                <th className="p-4 text-[10px] font-black uppercase tracking-[0.2em]">Depot Location</th>
                                <th className="p-4 text-[10px] font-black uppercase tracking-[0.2em]">Product SKU</th>
                                <th className="p-4 text-[10px] font-black uppercase tracking-[0.2em] text-center">Weight (KG)</th>
                                <th className="p-4 text-[10px] font-black uppercase tracking-[0.2em] text-center">Bags</th>
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
                                    <td className="p-4 text-sm font-bold text-indigo-600 font-mono">INIT-{item.id}</td>
                                    <td className="p-4 text-sm text-slate-500">{item.date}</td>
                                    <td className="p-4 text-sm font-black text-slate-700 uppercase">{item.Depot?.account_name}</td>
                                    <td className="p-4 text-sm font-bold text-slate-600 uppercase italic">{item.Product?.product_name || `ID: ${item.product_id}`}</td>
                                    <td className="p-4 text-sm text-center font-black text-emerald-600">{item.total_kgs} KG</td>
                                    <td className="p-4 text-sm text-center font-bold text-slate-500">{item.total_bags}</td>
                                    <td className="p-4 text-center">
                                        <button className="p-2 text-slate-300 hover:text-indigo-600 transition-colors"><Edit size={16}/></button>
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan={8} className="p-20 text-center opacity-20">
                                        <Database size={48} className="mx-auto mb-2"/>
                                        <p className="font-black uppercase tracking-widest">No Baseline Records Found</p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* 4. PAGINATION FOOTER */}
                <div className="p-4 bg-slate-50 border-t flex items-center justify-between">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        Showing {currentItems.length} of {processedData.length} Initialization Logs
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

            {/* 5. INITIALIZATION MODAL */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-5xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in duration-200">
                        {/* Modal Header */}
                        <div className="bg-indigo-600 p-6 flex justify-between items-center text-white">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-white/20 rounded-xl"><Database /></div>
                                <div>
                                    <h2 className="font-black uppercase tracking-widest text-xl">{formData.id ? 'Modify Opening Baseline' : 'Stock Setup Console'}</h2>
                                    <p className="text-[10px] font-bold text-indigo-200 uppercase tracking-widest">Master Ledger Initializer</p>
                                </div>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="hover:bg-indigo-500 p-2 rounded-full transition-colors"><X size={24}/></button>
                        </div>

                        {/* Modal Body */}
                        <div className="flex-1 overflow-y-auto p-8 space-y-8">
                            
                            {/* WARNING BANNER */}
                            <div className="bg-amber-50 border border-amber-100 p-4 rounded-2xl flex items-start gap-3">
                                <AlertTriangle className="text-amber-500 shrink-0" size={24} />
                                <div>
                                    <h4 className="text-[10px] font-black text-amber-900 uppercase tracking-widest leading-none">Critical Baseline Operation</h4>
                                    <p className="text-[11px] text-amber-700 font-medium leading-relaxed mt-1">
                                        Initializing opening stock is a fundamental accounting step. Ensure physical counts match these values exactly before committing to the ledger.
                                    </p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                                {/* LEFT COLUMN: IDENTITY */}
                                <div className="space-y-6">
                                    <div className="flex items-center gap-2 text-indigo-500 font-black text-[10px] uppercase tracking-[0.2em]">
                                        <Warehouse size={16} /> Location & Timeline
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Target Depot</label>
                                        <select 
                                            value={formData.depot_id} 
                                            onChange={e => setFormData({...formData, depot_id: e.target.value})} 
                                            className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-indigo-500 appearance-none"
                                        >
                                            <option value="">-- Choose Target Location --</option>
                                            {depots.map(d => <option key={d.id} value={d.id}>{d.account_name}</option>)}
                                        </select>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Baseline Date</label>
                                        <div className="relative">
                                            <Calendar className="absolute left-3 top-3.5 text-slate-300" size={18} />
                                            <input type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className="w-full pl-10 p-3.5 bg-slate-50 border border-slate-100 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-indigo-500" />
                                        </div>
                                    </div>
                                </div>

                                {/* RIGHT COLUMN: METRICS CARD */}
                                <div className="bg-indigo-900 rounded-[2.5rem] p-8 text-white shadow-2xl relative border border-slate-800 space-y-8">
                                    <Activity className="absolute top-6 right-6 text-white/5" size={100} />
                                    
                                    <div className="flex items-center gap-2 text-indigo-300 font-black text-[10px] uppercase tracking-[0.2em]">
                                        <Package size={16} /> Inventory Baseline
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest ml-1">Finished Good / SKU</label>
                                        <select 
                                            value={formData.product_id} 
                                            onChange={e => setFormData({...formData, product_id: e.target.value})} 
                                            className="w-full bg-white/5 border-b-2 border-white/10 p-4 font-black text-white outline-none focus:border-indigo-400 appearance-none"
                                        >
                                            <option className="bg-slate-900" value="">-- Select SKU --</option>
                                            {products.map(p => <option className="bg-slate-900" key={p.id} value={p.id}>{p.product_name}</option>)}
                                        </select>
                                    </div>

                                    <div className="grid grid-cols-2 gap-8">
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest flex items-center gap-1"><Scale size={14}/> Total Weight (KG)</label>
                                            <input 
                                                type="number" step="0.01" value={formData.total_kgs} 
                                                onChange={e => setFormData({...formData, total_kgs: e.target.value})} 
                                                className="w-full bg-transparent border-b-2 border-white/10 p-2 text-3xl font-black text-white outline-none focus:border-emerald-400 transition-colors" 
                                                placeholder="0.00"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest flex items-center gap-1"><Boxes size={14}/> Total Bags</label>
                                            <input 
                                                type="number" value={formData.total_bags} 
                                                onChange={e => setFormData({...formData, total_bags: e.target.value})} 
                                                className="w-full bg-transparent border-b-2 border-white/10 p-2 text-3xl font-black text-white outline-none focus:border-emerald-400 transition-colors" 
                                                placeholder="0"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="p-6 bg-slate-50 border-t flex justify-end items-center gap-4">
                            <button onClick={() => setIsModalOpen(false)} className="px-8 py-3 font-bold text-slate-400 hover:text-slate-600 text-xs tracking-widest uppercase">Discard</button>
                            <button onClick={handleInitialize} disabled={loading} className="bg-indigo-600 hover:bg-indigo-700 text-white px-10 py-3 rounded-xl font-black shadow-lg shadow-indigo-100 flex items-center gap-2 active:scale-95 transition-all text-xs tracking-widest uppercase">
                                <Save size={18}/> {loading ? 'Committing...' : formData.id ? 'Update Baseline' : 'Initialize Ledger'}
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

export default DepotOpeningStock;