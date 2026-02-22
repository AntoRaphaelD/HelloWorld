import React, { useState, useEffect, useMemo } from 'react';
import { mastersAPI, transactionsAPI } from '../service/api';
import { 
    Factory, Save, History, TrendingUp, Search, 
    ChevronRight, Activity, Scale, ArrowDownToLine, Database,
    Plus, Trash2, X, RefreshCw, ChevronLeft, Edit,
    Square, CheckSquare, Info, Calculator, Package, 
    Calendar, ArrowRight, AlertCircle, Box, Filter, Hash
} from 'lucide-react';

const RG1Production = () => {
    // --- Initial State ---
    const emptyState = { 
        id: null,
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
    const [products, setProducts] = useState([]);
    const [packingTypes, setPackingTypes] = useState([]);
    const [formData, setFormData] = useState(emptyState);
    const [loading, setLoading] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);

    // --- DYNAMIC FILTERING STATE ---
    const [searchField, setSearchField] = useState('product_name');
    const [searchCondition, setSearchCondition] = useState('Like');
    const [searchValue, setSearchValue] = useState('');
    const [isSelectionMode, setIsSelectionMode] = useState(false);
    const [selectedIds, setSelectedIds] = useState([]);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    // --- Initialization ---
    useEffect(() => {
        fetchMasters();
        fetchRecords();
    }, []);

    // EFFECT: Real-time stock calculation
    useEffect(() => {
        const prod = parseFloat(formData.production_kgs) || 0;
        const prev = parseFloat(formData.prev_closing_kgs) || 0;
        const inv = parseFloat(formData.invoice_kgs) || 0;
        const closing = (prev + prod) - inv;
        
        setFormData(prevForm => ({
            ...prevForm,
            stock_kgs: closing.toFixed(2)
        }));
    }, [formData.production_kgs, formData.prev_closing_kgs, formData.invoice_kgs]);

    const fetchMasters = async () => {
        try {
            const [productsRes, packingRes] = await Promise.all([
                mastersAPI.products.getAll(),
                mastersAPI.packingTypes.getAll()
            ]);
            setProducts(productsRes.data.data || []);
            setPackingTypes(packingRes.data.data || []);
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

    // --- Handlers ---
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
            product_id: item.product_id?.toString() || '',
            packing_type_id: item.packing_type_id?.toString() || ''
        });
        setIsModalOpen(true);
    };

    const onProductChange = (productId) => {
        const product = products.find(p => p.id === parseInt(productId));
        setFormData(prev => ({
            ...prev,
            product_id: productId,
            prev_closing_kgs: product ? product.mill_stock : 0
        }));
    };

    const handleSave = async (e) => {
        if (e) e.preventDefault();
        if (!formData.product_id) return alert("Please select a Product SKU");
        
        setLoading(true);
        try {
            if (formData.id) await transactionsAPI.production.update(formData.id, formData);
            else await transactionsAPI.production.create(formData);
            setIsModalOpen(false);
            fetchRecords();
            fetchMasters();
        } catch (err) { alert("Error saving record"); }
        finally { setLoading(false); }
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
                return searchCondition === 'Equal' 
                    ? itemValue.toLowerCase() === term 
                    : itemValue.toLowerCase().includes(term);
            });
        }
        return result.sort((a, b) => b.id - a.id);
    }, [list, searchValue, searchField, searchCondition]);

    const currentItems = filteredData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
    const totalPages = Math.ceil(filteredData.length / itemsPerPage) || 1;

    return (
        <div className="min-h-screen bg-slate-50 p-6 font-sans text-slate-900">
            
            {/* HEADER SECTION */}
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <Factory className="text-blue-600" /> RG1 Mill Ledger
                    </h1>
                    <p className="text-sm text-slate-500">Daily Production, Dispatches and Closing Mill Stock Registry</p>
                </div>
                
                <div className="flex gap-2">
                    <button 
                        onClick={() => { setIsSelectionMode(!isSelectionMode); setSelectedIds([]); }}
                        className={`px-5 py-2 border rounded-lg font-semibold transition-all ${isSelectionMode ? 'bg-amber-100 border-amber-300 text-amber-700' : 'bg-white border-slate-200 text-blue-600 hover:bg-slate-50'}`}
                    >
                        {isSelectionMode ? 'Cancel' : 'Select'}
                    </button>

                    {isSelectionMode ? (
                        <button 
                            disabled={selectedIds.length === 0}
                            className={`px-5 py-2 border rounded-lg flex items-center gap-2 transition-all ${selectedIds.length > 0 ? 'bg-white border-red-200 text-red-600' : 'bg-white border-slate-100 text-slate-300 cursor-not-allowed'}`}
                        >
                            <Trash2 size={18}/> Delete {selectedIds.length > 0 && `(${selectedIds.length})`}
                        </button>
                    ) : (
                        <button onClick={handleAddNew} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg font-semibold shadow-sm transition-all active:scale-95">
                            <Plus size={18} /> New Log
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
                        <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block ml-1">Search Field</label>
                        <select value={searchField} onChange={(e) => setSearchField(e.target.value)} className="w-full border border-slate-200 p-2 rounded-lg text-sm outline-none focus:ring-1 focus:ring-blue-500">
                            <option value="product_name">SKU / Product</option>
                            <option value="date">Log Date (YYYY-MM-DD)</option>
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
                            <input type="text" placeholder="Start typing..." value={searchValue} onChange={(e) => setSearchValue(e.target.value)} className="w-full border border-slate-200 pl-10 pr-4 py-2 rounded-lg text-sm outline-none focus:ring-1 focus:ring-blue-500 bg-white" />
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={() => setSearchValue('')} className="flex-1 border border-slate-200 py-2 rounded-lg text-sm font-bold hover:bg-slate-50 transition-all">Clear Filters</button>
                        <div className="flex-1 bg-blue-50 text-blue-600 border border-blue-100 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2">
                            <Filter size={14}/> {filteredData.length} Logs
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
                                <th className="p-4 text-sm font-semibold uppercase tracking-wider">Date</th>
                                <th className="p-4 text-sm font-semibold uppercase tracking-wider">Finished SKU</th>
                                <th className="p-4 text-sm font-semibold uppercase tracking-wider text-right">Opening</th>
                                <th className="p-4 text-sm font-semibold uppercase tracking-wider text-right text-blue-200">Produced (+)</th>
                                <th className="p-4 text-sm font-semibold uppercase tracking-wider text-right text-orange-200">Invoiced (-)</th>
                                <th className="p-4 text-sm font-semibold uppercase tracking-wider text-right">Final Stock</th>
                                {!isSelectionMode && <th className="p-4 w-10"></th>}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {currentItems.map(item => (
                                <tr key={item.id} onClick={() => handleRowClick(item)} className="group hover:bg-blue-50/50 cursor-pointer transition-colors">
                                    {isSelectionMode && (
                                        <td className="p-4 text-center" onClick={(e) => {e.stopPropagation(); handleRowClick(item);}}>
                                            {selectedIds.includes(item.id) ? <CheckSquare size={18} className="text-blue-600 mx-auto"/> : <Square size={18} className="text-slate-300 mx-auto"/>}
                                        </td>
                                    )}
                                    <td className="p-4 text-sm font-mono text-slate-600">{item.date}</td>
                                    <td className="p-4">
                                        <div className="font-bold text-slate-800 uppercase">{item.Product?.product_name}</div>
                                        <div className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">System ID: {item.id}</div>
                                    </td>
                                    <td className="p-4 text-sm text-right font-medium text-slate-500 font-mono">{item.prev_closing_kgs}</td>
                                    <td className="p-4 text-sm text-right font-bold text-blue-600 font-mono">+{item.production_kgs}</td>
                                    <td className="p-4 text-sm text-right font-bold text-orange-600 font-mono">-{item.invoice_kgs}</td>
                                    <td className="p-4 text-sm text-right">
                                        <span className="bg-slate-100 px-2 py-1 rounded-md font-black text-slate-800 font-mono">{item.stock_kgs} KG</span>
                                    </td>
                                    {!isSelectionMode && (
                                        <td className="p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Edit size={16} className="text-blue-600" />
                                        </td>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* PAGINATION FOOTER */}
                <div className="p-4 bg-slate-50 border-t flex items-center justify-between">
                    <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider">
                        Page {currentPage} of {totalPages} ({filteredData.length} records)
                    </span>
                    <div className="flex gap-2">
                        <button disabled={currentPage === 1} onClick={() => setCurrentPage(prev => prev - 1)} className="p-2 border rounded bg-white disabled:opacity-30 hover:bg-blue-50 transition-all shadow-sm">
                            <ChevronLeft size={16}/>
                        </button>
                        <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(prev => prev + 1)} className="p-2 border rounded bg-white disabled:opacity-30 hover:bg-blue-50 transition-all shadow-sm">
                            <ChevronRight size={16}/>
                        </button>
                    </div>
                </div>
            </div>

            {/* --- REFINED ERP STOCK MODAL --- */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
                    
                    <div className="relative bg-white w-full max-w-5xl rounded-[2rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in duration-200">
                        
                        {/* 1. Modal Header */}
                        <div className="flex items-center justify-between p-4 bg-blue-600 text-white">
                            <div className="flex items-center gap-4">
                                <div className="p-2 bg-white/20 rounded-lg">
                                    <Activity size={24} />
                                </div>
                                <div>
                                    <h2 className="text-lg font-black uppercase tracking-tight">
                                        {formData.id ? 'Modify Mill Registry' : 'New Stock Entry Log'}
                                    </h2>
                                    <p className="text-[10px] font-bold text-blue-100 uppercase tracking-widest">Transaction Ref: #{formData.id || 'NEW'}</p>
                                </div>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-blue-500 rounded-full transition-colors">
                                <X size={24} />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto flex flex-col lg:flex-row">
                            
                            {/* 2. Left Column: Input Form */}
                            <div className="flex-1 p-8 space-y-8">
                                
                                {/* Section A: Metadata */}
                                <div>
                                    <div className="flex items-center gap-2 mb-4 text-slate-400">
                                        <Calendar size={14} />
                                        <span className="text-[10px] font-black uppercase tracking-[0.2em]">Log Reference</span>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-bold text-slate-500 ml-1 uppercase">Production Date</label>
                                            <input 
                                                type="date" 
                                                value={formData.date}
                                                onChange={e => setFormData({...formData, date: e.target.value})}
                                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-bold text-slate-500 ml-1 uppercase">Finished Product SKU</label>
                                            <select 
                                                value={formData.product_id}
                                                onChange={e => onProductChange(e.target.value)}
                                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-black focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                                            >
                                                <option value="">-- SELECT SKU --</option>
                                                {products.map(p => <option key={p.id} value={p.id}>{p.product_name}</option>)}
                                            </select>
                                        </div>
                                    </div>
                                </div>

                                {/* Section B: Flow Metrics */}
                                <div>
                                    <div className="flex items-center gap-2 mb-4 text-slate-400">
                                        <TrendingUp size={14} />
                                        <span className="text-[10px] font-black uppercase tracking-[0.2em]">Registry Quantities (KG)</span>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-bold text-slate-500 ml-1 uppercase tracking-tighter">Opening Balance</label>
                                            <input 
                                                type="number" 
                                                value={formData.prev_closing_kgs}
                                                onChange={e => setFormData({...formData, prev_closing_kgs: e.target.value})}
                                                className="w-full px-4 py-3 bg-slate-100 border border-slate-200 rounded-xl font-bold text-slate-600 font-mono"
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-bold text-blue-600 ml-1 uppercase tracking-tighter">Produced (+)</label>
                                            <input 
                                                type="number" 
                                                value={formData.production_kgs}
                                                onChange={e => setFormData({...formData, production_kgs: e.target.value})}
                                                className="w-full px-4 py-3 bg-blue-50 border border-blue-100 text-blue-700 rounded-xl font-black focus:ring-1 focus:ring-blue-500 outline-none transition-all font-mono"
                                                placeholder="0.00"
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-bold text-orange-600 ml-1 uppercase tracking-tighter">Invoiced (-)</label>
                                            <input 
                                                type="number" 
                                                value={formData.invoice_kgs}
                                                onChange={e => setFormData({...formData, invoice_kgs: e.target.value})}
                                                className="w-full px-4 py-3 bg-orange-50 border border-orange-100 text-orange-700 rounded-xl font-black focus:ring-1 focus:ring-orange-500 outline-none transition-all font-mono"
                                                placeholder="0.00"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Section C: Packaging Details */}
                                <div>
                                    <div className="flex items-center gap-2 mb-4 text-slate-400">
                                        <Package size={14} />
                                        <span className="text-[10px] font-black uppercase tracking-[0.2em]">Physical Count Details</span>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-5 bg-slate-50 border border-slate-200 rounded-2xl">
                                        <div className="space-y-3">
                                            <div className="flex justify-between items-center">
                                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">Packing Type</label>
                                                <select 
                                                    value={formData.packing_type_id}
                                                    onChange={e => setFormData({...formData, packing_type_id: e.target.value})}
                                                    className="text-xs font-black text-blue-600 outline-none bg-transparent"
                                                >
                                                    <option value="">Select...</option>
                                                    {packingTypes.map(pt => <option key={pt.id} value={pt.id}>{pt.packing_type}</option>)}
                                                </select>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">Wt per Bag (KG)</label>
                                                <input 
                                                    type="number" 
                                                    className="w-20 text-right text-xs font-black p-1 bg-white border rounded" 
                                                    value={formData.weight_per_bag}
                                                    onChange={e => setFormData({...formData, weight_per_bag: e.target.value})}
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-3">
                                            <div className="flex justify-between items-center">
                                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">Bags in Stock</label>
                                                <input 
                                                    type="number" 
                                                    className="w-20 text-right text-xs font-black p-1 bg-white border rounded" 
                                                    value={formData.stock_bags}
                                                    onChange={e => setFormData({...formData, stock_bags: e.target.value})}
                                                />
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">Loose Stock (KG)</label>
                                                <input 
                                                    type="number" 
                                                    className="w-20 text-right text-xs font-black p-1 bg-white border rounded" 
                                                    value={formData.stock_loose_kgs}
                                                    onChange={e => setFormData({...formData, stock_loose_kgs: e.target.value})}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* 3. Right Column: Dark Summary Cockpit */}
                            <div className="w-full lg:w-80 bg-slate-900 text-white p-8 flex flex-col justify-between">
                                <div className="space-y-8">
                                    <div className="text-center">
                                        <Calculator size={40} className="text-blue-400 mx-auto mb-2" />
                                        <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Balance Assessment</h3>
                                    </div>

                                    <div className="space-y-6">
                                        <div className="group border-b border-white/5 pb-2">
                                            <p className="text-[9px] font-bold text-slate-500 uppercase mb-1">Opening Stock</p>
                                            <p className="text-xl font-mono">{formData.prev_closing_kgs} <span className="text-xs text-slate-600">KG</span></p>
                                        </div>

                                        <div className="flex items-center gap-4 text-blue-400">
                                            <div className="h-px flex-1 bg-slate-800" />
                                            <Plus size={14} />
                                            <div className="h-px flex-1 bg-slate-800" />
                                        </div>

                                        <div className="border-b border-white/5 pb-2">
                                            <p className="text-[9px] font-bold text-slate-500 uppercase mb-1">Total Produced</p>
                                            <p className="text-xl font-mono text-blue-400">+{formData.production_kgs || 0} <span className="text-xs opacity-50">KG</span></p>
                                        </div>

                                        <div className="flex items-center gap-4 text-orange-400">
                                            <div className="h-px flex-1 bg-slate-800" />
                                            <ArrowDownToLine size={14} />
                                            <div className="h-px flex-1 bg-slate-800" />
                                        </div>

                                        <div className="border-b border-white/5 pb-2">
                                            <p className="text-[9px] font-bold text-slate-500 uppercase mb-1">Total Invoiced</p>
                                            <p className="text-xl font-mono text-orange-400">-{formData.invoice_kgs || 0} <span className="text-xs opacity-50">KG</span></p>
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-12 p-6 bg-white/5 rounded-3xl border border-white/10 relative overflow-hidden group text-center">
                                    <div className="absolute top-0 right-0 p-2 opacity-5">
                                        <Database size={64} />
                                    </div>
                                    <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-2">Projected Mill Stock</p>
                                    <div className="flex items-baseline justify-center gap-1">
                                        <span className="text-4xl font-black font-mono tracking-tighter">{formData.stock_kgs}</span>
                                        <span className="text-sm font-bold text-slate-500">KG</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 4. Modal Footer */}
                        <div className="p-6 bg-slate-50 border-t flex justify-end items-center gap-4">
                            <button 
                                onClick={() => setIsModalOpen(false)}
                                className="px-6 py-2 text-xs font-black uppercase tracking-widest text-slate-400 hover:text-slate-600 transition-colors"
                            >
                                Discard
                            </button>
                            <button 
                                onClick={handleSave}
                                disabled={loading}
                                className="px-10 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-xl flex items-center gap-2 active:scale-95 transition-all disabled:opacity-50"
                            >
                                <Save size={18} />
                                {loading ? 'Committing...' : 'Commit to Registry'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <style jsx>{`
                input[type='number']::-webkit-inner-spin-button, 
                input[type='number']::-webkit-outer-spin-button { 
                    -webkit-appearance: none; margin: 0; 
                }
            `}</style>
        </div>
    );
};

export default RG1Production;