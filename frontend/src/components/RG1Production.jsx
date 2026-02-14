import React, { useState, useEffect, useMemo } from 'react';
import { mastersAPI, transactionsAPI } from '../service/api';
import { 
    Factory, Save, History, TrendingUp, Search, 
    ChevronRight, Activity, Scale, ArrowDownToLine, Database,
    Plus, Trash2, X, RefreshCw, ChevronLeft, Edit,
    Square, CheckSquare, Info
} from 'lucide-react';

const RG1Production = () => {
    // --- Initial State ---
    const emptyState = { 
        id: null,
        date: new Date().toISOString().split('T')[0], 
        product_id: '', 
        production_kgs: 0, 
        prv_day_closing: 0,
        invoice_kgs: 0, 
        stock_kgs: 0
    };

    // --- Main States ---
    const [list, setList] = useState([]);
    const [products, setProducts] = useState([]);
    const [formData, setFormData] = useState(emptyState);
    const [loading, setLoading] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);

    // --- Search, Sort & Selection States ---
    const [isSelectionMode, setIsSelectionMode] = useState(false);
    const [selectedIds, setSelectedIds] = useState([]);
    const [searchField, setSearchField] = useState('product_name');
    const [searchValue, setSearchValue] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    // --- Initialization ---
    useEffect(() => {
        fetchMasters();
        fetchRecords();
    }, []);

    // EFFECT: Handle Automatic stock calculation when inputs change
    useEffect(() => {
        const prod = parseFloat(formData.production_kgs) || 0;
        const prev = parseFloat(formData.prv_day_closing) || 0;
        const inv = parseFloat(formData.invoice_kgs) || 0;
        const closing = (prev + prod) - inv;
        
        setFormData(prevForm => ({
            ...prevForm,
            stock_kgs: closing.toFixed(2)
        }));
    }, [formData.production_kgs, formData.prv_day_closing, formData.invoice_kgs]);

    const fetchMasters = async () => {
        try {
            const res = await mastersAPI.products.getAll();
            setProducts(res.data.data || []);
        } catch (err) { console.error("Master fetch error", err); }
    };

    const fetchRecords = async () => {
        setLoading(true);
        try {
            const res = await transactionsAPI.production.getAll();
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
                const val = searchField === 'product_name' 
                    ? String(item.Product?.product_name || '').toLowerCase()
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
            product_id: item.product_id?.toString()
        });
        setIsModalOpen(true);
    };

    const onProductChange = (productId) => {
        const product = products.find(p => p.id === parseInt(productId));
        setFormData(prev => ({
            ...prev,
            product_id: productId,
            prv_day_closing: product ? product.mill_stock : 0
        }));
    };

    const handleSave = async (e) => {
        if (e) e.preventDefault();
        if (!formData.product_id) return alert("Please select a Finished Good SKU");
        
        setLoading(true);
        try {
            if (formData.id) await transactionsAPI.production.update(formData.id, formData);
            else await transactionsAPI.production.create(formData);
            
            setIsModalOpen(false);
            fetchRecords();
            fetchMasters(); // Refresh product mill_stock
        } catch (err) { alert("Error committing to stock"); }
        finally { setLoading(false); }
    };

    const handleBulkDelete = async () => {
        if (selectedIds.length === 0) return;
        if (window.confirm(`Delete ${selectedIds.length} production logs permanently?`)) {
            setLoading(true);
            try {
                await Promise.all(selectedIds.map(id => transactionsAPI.production.delete(id)));
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
                        <Factory className="text-emerald-600" size={28} /> RG1 Production Registry
                    </h1>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Daily Finished Goods Stock & Mill Balance</p>
                </div>
                
                <div className="flex gap-2">
                    <button onClick={handleAddNew} className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2 rounded-lg font-bold shadow-md transition-all active:scale-95">
                        <Plus size={18} /> New Log
                    </button>
                    
                    <button 
                        onClick={() => { setIsSelectionMode(!isSelectionMode); setSelectedIds([]); }}
                        className={`px-6 py-2 border rounded-lg font-bold transition-all ${isSelectionMode ? 'bg-amber-100 border-amber-300 text-amber-700' : 'bg-white border-slate-200 text-emerald-600 hover:bg-slate-50'}`}
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
                    <button onClick={fetchRecords} className="p-2 border rounded-lg bg-white text-slate-400 hover:text-emerald-600 transition-colors">
                        <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                    </button>
                </div>
            </div>

            {/* 2. SEARCH BAR */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm mb-6 flex flex-wrap gap-4 items-end">
                <div className="flex-1 min-w-[200px]">
                    <label className="text-[10px] font-black text-slate-400 uppercase mb-1 block ml-1">Search Logs</label>
                    <div className="flex gap-2">
                        <select value={searchField} onChange={(e) => setSearchField(e.target.value)} className="border border-slate-200 p-2.5 rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500">
                            <option value="product_name">SKU / Product</option>
                            <option value="date">Date (YYYY-MM-DD)</option>
                        </select>
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-3 text-slate-400" size={16}/>
                            <input type="text" placeholder="Filter production history..." value={searchValue} onChange={(e) => setSearchValue(e.target.value)} className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500" />
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
                                <th className="p-4 text-[10px] font-black uppercase tracking-[0.2em]">Log Date</th>
                                <th className="p-4 text-[10px] font-black uppercase tracking-[0.2em]">Product SKU</th>
                                <th className="p-4 text-[10px] font-black uppercase tracking-[0.2em] text-center">Prev. Closing</th>
                                <th className="p-4 text-[10px] font-black uppercase tracking-[0.2em] text-center text-emerald-400">Produced (+)</th>
                                <th className="p-4 text-[10px] font-black uppercase tracking-[0.2em] text-center text-orange-400">Invoiced (-)</th>
                                <th className="p-4 text-[10px] font-black uppercase tracking-[0.2em] text-center">Final Stock</th>
                                <th className="p-4 text-[10px] font-black uppercase tracking-[0.2em] text-center w-20">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {currentItems.length > 0 ? currentItems.map((item) => (
                                <tr key={item.id} onClick={() => handleRowClick(item)} className={`transition-colors cursor-pointer ${selectedIds.includes(item.id) ? 'bg-emerald-50' : 'hover:bg-slate-50'}`}>
                                    {isSelectionMode && (
                                        <td className="p-4 text-center">
                                            {selectedIds.includes(item.id) ? <CheckSquare size={20} className="text-emerald-600 mx-auto"/> : <Square size={20} className="text-slate-200 mx-auto"/>}
                                        </td>
                                    )}
                                    <td className="p-4 text-sm font-bold text-slate-500 font-mono">{item.date}</td>
                                    <td className="p-4 text-sm font-black text-slate-700 uppercase">{item.Product?.product_name}</td>
                                    <td className="p-4 text-sm text-center font-bold text-slate-400">{item.prv_day_closing}</td>
                                    <td className="p-4 text-sm text-center font-black text-emerald-600">+{item.production_kgs}</td>
                                    <td className="p-4 text-sm text-center font-black text-orange-600">-{item.invoice_kgs}</td>
                                    <td className="p-4 text-sm text-center font-black bg-slate-50">{item.stock_kgs} KG</td>
                                    <td className="p-4 text-center">
                                        <button className="p-2 text-slate-300 hover:text-emerald-600 transition-colors"><Edit size={16}/></button>
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan={8} className="p-20 text-center opacity-20">
                                        <Factory size={48} className="mx-auto mb-2"/>
                                        <p className="font-black uppercase tracking-widest">No Production Records</p>
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
                        <div className="bg-emerald-600 p-6 flex justify-between items-center text-white">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-white/20 rounded-xl"><Activity /></div>
                                <div>
                                    <h2 className="font-black uppercase tracking-widest text-xl">{formData.id ? 'Modify Production Log' : 'New Stock Entry'}</h2>
                                    <p className="text-[10px] font-bold text-emerald-200 uppercase tracking-widest">Mill Registry Console</p>
                                </div>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="hover:bg-emerald-500 p-2 rounded-full transition-colors"><X size={24}/></button>
                        </div>

                        {/* Modal Body */}
                        <div className="flex-1 overflow-y-auto p-8 grid grid-cols-1 md:grid-cols-2 gap-10">
                            
                            {/* LEFT COLUMN: INPUTS */}
                            <div className="space-y-6">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Production Date</label>
                                    <input type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold font-mono outline-none focus:ring-2 focus:ring-emerald-500" />
                                </div>
                                
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Select Finished Good SKU</label>
                                    <select 
                                        value={formData.product_id} 
                                        onChange={e => onProductChange(e.target.value)} 
                                        className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-black outline-none focus:ring-2 focus:ring-emerald-500 appearance-none"
                                    >
                                        <option value="">-- Choose Product --</option>
                                        {products.map(p => <option key={p.id} value={p.id}>{p.product_name} (Current: {p.mill_stock})</option>)}
                                    </select>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black text-emerald-600 uppercase tracking-widest ml-1">Production (KG) (+)</label>
                                        <input type="number" step="0.01" value={formData.production_kgs} onChange={e => setFormData({...formData, production_kgs: e.target.value})} className="w-full p-4 bg-emerald-50 text-emerald-700 border-none rounded-2xl font-black text-xl outline-none" />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black text-orange-600 uppercase tracking-widest ml-1">Invoice (KG) (-)</label>
                                        <input type="number" step="0.01" value={formData.invoice_kgs} onChange={e => setFormData({...formData, invoice_kgs: e.target.value})} className="w-full p-4 bg-orange-50 text-orange-700 border-none rounded-2xl font-black text-xl outline-none" />
                                    </div>
                                </div>
                            </div>

                            {/* RIGHT COLUMN: CALCULATION SUMMARY CARD */}
                            <div className="bg-slate-900 rounded-[2rem] p-8 text-white flex flex-col justify-between shadow-2xl relative border border-slate-800">
                                <Activity className="absolute top-6 right-6 text-emerald-500/20" size={80} />
                                
                                <div className="space-y-6 relative">
                                    <div className="border-b border-white/10 pb-4">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Opening Balance</p>
                                        <div className="flex items-center gap-2">
                                            <input 
                                                type="number" 
                                                className="bg-transparent border-none text-4xl font-black text-white w-full outline-none" 
                                                value={formData.prv_day_closing}
                                                onChange={e => setFormData({...formData, prv_day_closing: e.target.value})}
                                            />
                                            <span className="text-slate-500 font-bold">KG</span>
                                        </div>
                                        <p className="text-[9px] text-emerald-500 font-bold italic mt-1 uppercase">* Auto-linked from Mill Ledger</p>
                                    </div>

                                    <div className="space-y-4 pt-4">
                                        <div className="flex justify-between items-center text-sm font-bold border-b border-white/5 pb-2">
                                            <span className="text-slate-400">Total Produced</span>
                                            <span className="text-emerald-400">+{formData.production_kgs} KG</span>
                                        </div>
                                        <div className="flex justify-between items-center text-sm font-bold border-b border-white/5 pb-2">
                                            <span className="text-slate-400">Dispatch/Invoice</span>
                                            <span className="text-orange-400">-{formData.invoice_kgs} KG</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-12 bg-white/5 p-6 rounded-2xl border border-white/10 text-center">
                                    <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-2">Projected Stock Closing</p>
                                    <h3 className="text-6xl font-black text-white">{formData.stock_kgs} <span className="text-xl text-slate-500">KG</span></h3>
                                </div>
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="p-6 bg-slate-50 border-t flex justify-end items-center gap-4">
                            <button onClick={() => setIsModalOpen(false)} className="px-8 py-3 font-bold text-slate-400 hover:text-slate-600 text-xs tracking-widest uppercase">Discard</button>
                            <button onClick={handleSave} disabled={loading} className="bg-emerald-600 hover:bg-emerald-700 text-white px-10 py-3 rounded-xl font-black shadow-lg shadow-emerald-100 flex items-center gap-2 active:scale-95 transition-all text-xs tracking-widest uppercase">
                                <Save size={18}/> {loading ? 'Committing...' : 'Commit to Stock'}
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

export default RG1Production;