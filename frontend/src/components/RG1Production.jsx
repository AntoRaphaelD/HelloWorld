import React, { useState, useEffect, useMemo } from 'react';
import { mastersAPI, transactionsAPI } from '../service/api';
import { 
    Save, Factory, Search, Plus, Trash2, X, RefreshCw,
    ChevronLeft, ChevronRight, Square, CheckSquare, 
    Edit, MapPin, Package, Info, Filter, Database, 
    Activity, Calculator, Scale, Box, Calendar, 
    History, TrendingUp, Lock, ArrowRightCircle
} from 'lucide-react';

const RG1Production = () => {
    // --- Initial States (Preserved) ---
    const emptyState = { 
        id: '',
        date: new Date().toISOString().split('T')[0], 
        product_id: '',
        packing_type_id: '',
        weight_per_bag: 0,
        production_kgs: 0, 
        prev_closing_kgs: 0,
        invoice_kgs: 0, 
        stock_kgs: 0,
        stock_bags: 0,
        stock_loose_kgs: 0
    };

    // --- Main States ---
    const [list, setList] = useState([]);
    const [formData, setFormData] = useState(emptyState);
    const [loading, setLoading] = useState(false);
    const [submitLoading, setSubmitLoading] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [activeTab, setActiveTab] = useState('head');

    // Master Data
    const [products, setProducts] = useState([]);
    const [packingTypes, setPackingTypes] = useState([]);

    // Search & Selection
    const [searchField, setSearchField] = useState('product_name');
    const [searchCondition, setSearchCondition] = useState('Like');
    const [searchValue, setSearchValue] = useState('');
    const [isSelectionMode, setIsSelectionMode] = useState(false);
    const [selectedIds, setSelectedIds] = useState([]);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    // --- EFFECT: Automatic Stock Logic Engine (Preserved) ---
    useEffect(() => {
        const prod = parseFloat(formData.production_kgs) || 0;
        const prev = parseFloat(formData.prev_closing_kgs) || 0;
        const inv = parseFloat(formData.invoice_kgs) || 0;
        const bagWt = parseFloat(formData.weight_per_bag) || 0;

        const closingKgs = (prev + prod) - inv;
        const bags = bagWt > 0 ? Math.floor(closingKgs / bagWt) : 0;
        const loose = bagWt > 0 ? (closingKgs % bagWt) : closingKgs;
        
        setFormData(prevForm => ({
            ...prevForm,
            stock_kgs: closingKgs.toFixed(3),
            stock_bags: bags,
            stock_loose_kgs: loose.toFixed(3)
        }));
    }, [formData.production_kgs, formData.prev_closing_kgs, formData.invoice_kgs, formData.weight_per_bag]);

    // --- Initialization ---
    useEffect(() => {
        fetchMasters();
        fetchRecords();
    }, []);

    const fetchMasters = async () => {
        try {
            const [productsRes, packingRes] = await Promise.all([
                mastersAPI.products.getAll(),
                mastersAPI.packingTypes.getAll()
            ]);
            setProducts(productsRes.data.data || []);
            setPackingTypes(packingRes.data.data || []);
        } catch (err) { console.error("Master Load Error", err); }
    };

    const fetchRecords = async () => {
        setLoading(true);
        try {
            const res = await transactionsAPI.production.getAll();
            setList(res.data.data || []);
        } catch (err) { console.error("Fetch Error", err); }
        finally { setLoading(false); }
    };

    // --- Action Handlers ---
    const handleAddNew = () => {
        const nextId = list.length > 0 ? Math.max(...list.map(i => parseInt(i.id) || 0)) + 1 : 1001;
        setFormData({ ...emptyState, id: String(nextId) });
        setActiveTab('head');
        setIsModalOpen(true);
    };

    const onProductChange = (productId) => {
        const product = products.find(p => p.id === parseInt(productId));
        if (!product) return;
        const pType = packingTypes.find(t => t.packing_type === product.packing_type);

        setFormData(prev => ({
            ...prev,
            product_id: productId,
            packing_type_id: pType ? pType.id : '',
            weight_per_bag: product.pack_nett_wt || 0,
            prev_closing_kgs: product.mill_stock || 0
        }));
    };

    const handleSave = async () => {
        if (!formData.product_id) return alert("Product SKU required");
        setSubmitLoading(true);
        try {
            if (formData.id && list.find(i => i.id === formData.id)) {
                await transactionsAPI.production.update(formData.id, formData);
            } else {
                await transactionsAPI.production.create(formData);
            }
            setIsModalOpen(false);
            fetchRecords();
            fetchMasters(); // Refresh Mill Stocks
        } catch (err) { alert("Save failed"); }
        finally { setSubmitLoading(false); }
    };

    const handleRowClick = (item) => {
        if (isSelectionMode) {
            setSelectedIds(prev =>
                prev.includes(item.id) ? prev.filter(id => id !== item.id) : [...prev, item.id]
            );
            return;
        }
        setFormData({
            ...item,
            product_id: item.product_id?.toString() || '',
            packing_type_id: item.packing_type_id?.toString() || ''
        });
        setActiveTab('head');
        setIsModalOpen(true);
    };

    // --- Dynamic Filtering Logic ---
    const filteredData = useMemo(() => {
        let result = Array.isArray(list) ? [...list] : [];
        if (searchValue.trim()) {
            result = result.filter(item => {
                let itemValue = "";
                if (searchField === 'product_name') itemValue = item.Product?.product_name || "";
                else itemValue = String(item[searchField] || "");
                const term = searchValue.toLowerCase().trim();
                return searchCondition === 'Equal' ? itemValue.toLowerCase() === term : itemValue.toLowerCase().includes(term);
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
                        <Factory className="text-blue-600" /> RG1 Production Ledger
                    </h1>
                    <p className="text-sm text-slate-500">Daily mill production and stock reconciliation unit</p>
                </div>
                <div className="flex gap-2">
                    <button onClick={() => { setIsSelectionMode(!isSelectionMode); setSelectedIds([]); }}
                        className={`px-5 py-2 border rounded-lg font-semibold transition-all ${isSelectionMode ? 'bg-amber-100 border-amber-300 text-amber-700' : 'bg-white border-slate-200 text-blue-600 hover:bg-slate-50'}`}>
                        {isSelectionMode ? 'Cancel' : 'Select'}
                    </button>
                    <button onClick={handleAddNew} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg font-semibold shadow-sm transition-all active:scale-95">
                        <Plus size={18} /> New Log Entry
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
                            <option value="product_name">Product SKU</option>
                            <option value="id">Log ID</option>
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
                            <input type="text" placeholder="Search logs..." value={searchValue} onChange={(e) => setSearchValue(e.target.value)} className="w-full border border-slate-200 pl-10 pr-4 py-2 rounded-lg text-sm outline-none focus:ring-1 focus:ring-blue-500 bg-white" />
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
                                <th className="p-4 text-sm font-semibold uppercase tracking-wider">Log #</th>
                                <th className="p-4 text-sm font-semibold uppercase tracking-wider">Date</th>
                                <th className="p-4 text-sm font-semibold uppercase tracking-wider">Product SKU</th>
                                <th className="p-4 text-sm font-semibold uppercase tracking-wider text-right">Daily Prod (KG)</th>
                                <th className="p-4 text-sm font-semibold uppercase tracking-wider text-right">Closing Stock</th>
                                {!isSelectionMode && <th className="p-4 w-10"></th>}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-mono">
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="py-24 text-center">
                                        <RefreshCw size={48} className="animate-spin text-blue-500 mx-auto mb-4" />
                                        <p className="text-slate-500 font-medium">Syncing production records...</p>
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
                                        <td className="p-4 text-sm font-black text-blue-600">#{item.id}</td>
                                        <td className="p-4 text-sm text-slate-500 font-sans">{item.date}</td>
                                        <td className="p-4 text-sm font-bold text-slate-700 uppercase font-sans">
                                            {item.Product?.product_name}
                                            <div className="text-[10px] text-slate-400 font-normal">{item.PackingType?.packing_type}</div>
                                        </td>
                                        <td className="p-4 text-sm font-black text-right text-blue-600 font-mono">{item.production_kgs} KG</td>
                                        <td className="p-4 text-sm font-black text-right text-emerald-600 font-mono">{item.stock_kgs} KG</td>
                                        {!isSelectionMode && <td className="p-4 text-right"><Edit size={16} className="text-slate-300" /></td>}
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={6} className="py-28 text-center">
                                        <div className="flex flex-col items-center justify-center">
                                            <div className="w-24 h-24 bg-slate-100 rounded-3xl flex items-center justify-center mb-8 shadow-inner">
                                                {searchValue.trim() ? <Search size={56} className="text-amber-400" /> : <Factory size={56} className="text-slate-300" />}
                                            </div>
                                            <h3 className="text-2xl font-semibold text-slate-800 mb-3 tracking-tight">
                                                {searchValue.trim() ? "No matching logs" : "Production ledger empty"}
                                            </h3>
                                            <p className="text-slate-500 max-w-md text-[15px]">Daily mill production entries and reconciled stock totals will appear here.</p>
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
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-7xl overflow-hidden flex flex-col max-h-[95vh] animate-in zoom-in duration-200">
                        
                        {/* Modal Header */}
                        <div className="bg-blue-600 p-4 flex justify-between items-center text-white shadow-lg shrink-0">
                            <div className="flex items-center gap-4">
                                <div className="p-2 bg-white/20 rounded-lg"><Box size={20} /></div>
                                <div>
                                    <h2 className="font-bold uppercase tracking-tight">RG1 Production Deployment</h2>
                                    <p className="text-[10px] font-bold text-blue-100 uppercase">Registry Code: LOG-{formData.id}</p>
                                </div>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="hover:bg-blue-500 p-1 rounded-full transition-all"><X size={24}/></button>
                        </div>

                        {/* Modal Body */}
                        <div className="flex-1 overflow-y-auto p-6 flex flex-col lg:flex-row gap-6 bg-slate-50/50">
                            
                            {/* LEFT SIDE: Entry Form */}
                            <div className="flex-1 space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    
                                    {/* SECTION A: IDENTITY */}
                                    <div className="bg-white p-5 rounded-xl space-y-4 border shadow-sm">
                                        <div className="flex items-center gap-2 mb-2 text-slate-400"><Database size={14}/><span className="text-[9px] font-black uppercase">Metadata</span></div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <InputField label="Log ID" value={formData.id} readOnly className="font-mono text-blue-600" />
                                            <InputField label="Log Date" type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Target Product SKU</label>
                                            <select value={formData.product_id} onChange={e => onProductChange(e.target.value)} className="w-full bg-white border border-slate-200 p-2 rounded-lg text-sm font-bold shadow-inner outline-none focus:ring-1 focus:ring-blue-500">
                                                <option value="">-- Choose SKU --</option>
                                                {products.map(p => <option key={p.id} value={p.id}>{p.product_name}</option>)}
                                            </select>
                                        </div>
                                    </div>

                                    {/* SECTION B: DAILY WORKFLOW */}
                                    <div className="bg-white p-5 rounded-xl space-y-4 border shadow-sm">
                                        <div className="flex items-center gap-2 mb-2 text-blue-600"><TrendingUp size={14}/><span className="text-[9px] font-black uppercase">Daily Operations</span></div>
                                        <div className="grid grid-cols-1 gap-4">
                                            <InputField label="Daily Production (+)" type="number" step="0.001" placeholder="Enter KGs" value={formData.production_kgs} onChange={e => setFormData({...formData, production_kgs: e.target.value})} className="font-mono text-lg text-blue-600" />
                                            <InputField label="Daily Invoiced (-)" type="number" step="0.001" placeholder="Enter KGs" value={formData.invoice_kgs} onChange={e => setFormData({...formData, invoice_kgs: e.target.value})} className="font-mono text-lg text-rose-600" />
                                        </div>
                                    </div>

                                    {/* SECTION C: SNAPSHOT (Locked) */}
                                    <div className="bg-blue-50/50 p-5 rounded-xl space-y-4 border border-blue-100 border-dashed md:col-span-2">
                                        <div className="flex items-center gap-2 mb-2 text-slate-400"><Lock size={14}/><span className="text-[9px] font-black uppercase">System Records (Read Only)</span></div>
                                        <div className="grid grid-cols-3 gap-6">
                                            <InputField label="Opening Balance" value={formData.prev_closing_kgs} readOnly className="bg-white/50 font-mono" />
                                            <InputField label="Weight Per Bag" value={formData.weight_per_bag} readOnly className="bg-white/50 font-mono" />
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Packing Type</label>
                                                <div className="bg-white/50 border border-slate-200 p-2 rounded-lg text-xs font-bold text-slate-500 uppercase h-[37px] flex items-center">
                                                    {packingTypes.find(t => t.id == formData.packing_type_id)?.packing_type || 'N/A'}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* RIGHT SIDE: Financial Cockpit (Stock Metrics) */}
                            <div className="w-full lg:w-96 bg-slate-900 rounded-2xl p-6 text-white flex flex-col justify-between shadow-2xl">
                                <div className="space-y-4">
                                    <div className="text-center mb-6">
                                        <Activity size={32} className="text-blue-400 mx-auto mb-1" />
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Live Stock Reconciliation</p>
                                    </div>

                                    <div className="space-y-4">
                                        <div className="bg-white/5 p-4 rounded-2xl border border-white/5 shadow-inner">
                                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Total Net Stock</p>
                                            <div className="flex items-baseline gap-2">
                                                <h3 className="text-3xl font-black text-emerald-400 font-mono tracking-tighter">{formData.stock_kgs}</h3>
                                                <span className="text-[10px] font-bold text-slate-600 uppercase">KG</span>
                                            </div>
                                        </div>

                                        <div className="bg-white/5 p-4 rounded-2xl border border-white/5 shadow-inner">
                                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Pack Units</p>
                                            <div className="flex items-baseline gap-2">
                                                <h3 className="text-3xl font-black text-blue-400 font-mono tracking-tighter">{formData.stock_bags}</h3>
                                                <span className="text-[10px] font-bold text-slate-600 uppercase">BAGS</span>
                                            </div>
                                        </div>

                                        <div className="bg-white/5 p-4 rounded-2xl border border-white/5 shadow-inner">
                                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Loose / Remainder</p>
                                            <div className="flex items-baseline gap-2">
                                                <h3 className="text-3xl font-black text-amber-400 font-mono tracking-tighter">{formData.stock_loose_kgs}</h3>
                                                <span className="text-[10px] font-bold text-slate-600 uppercase">KG</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-8 p-6 bg-blue-600/10 rounded-3xl border border-blue-500/20 text-center relative overflow-hidden group">
                                    <Scale className="absolute -right-2 -bottom-2 text-white/5 group-hover:scale-110 transition-transform" size={80} />
                                    <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1 relative z-10">System Integrity</p>
                                    <h3 className="text-xl font-black text-white uppercase relative z-10">RECONCILED</h3>
                                </div>
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="p-6 bg-slate-50 border-t flex justify-end items-center gap-4 shrink-0">
                            <button onClick={() => setIsModalOpen(false)} className="px-8 py-3 font-bold text-slate-400 hover:text-slate-600 text-xs tracking-widest uppercase transition-colors">Discard</button>
                            <button onClick={handleSave} disabled={submitLoading} className="bg-blue-600 hover:bg-blue-700 text-white px-10 py-3 rounded-xl font-black shadow-xl flex items-center gap-2 active:scale-95 transition-all text-xs tracking-widest uppercase">
                                <Save size={18}/> {submitLoading ? 'TRANSMITTING...' : 'FINALIZE LOG'}
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
        <input {...props} className="w-full bg-white border border-slate-200 p-2 rounded-lg text-xs font-bold outline-none focus:ring-1 focus:ring-blue-500 shadow-inner" />
    </div>
);

export default RG1Production;