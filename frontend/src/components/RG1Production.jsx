import React, { useState, useEffect, useMemo } from 'react';
import { mastersAPI, transactionsAPI } from '../service/api';
import { 
    Factory, Save, History, TrendingUp, Search, 
    ChevronRight, Activity, Scale, ArrowDownToLine, Database,
    Plus, Trash2, X, RefreshCw, ChevronLeft, Edit,
    Square, CheckSquare, Info, Calculator, Package, 
    Calendar, ArrowRight, AlertCircle, Box
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

    // --- Search & Selection ---
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

    return (
        <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans text-slate-900">
            
            {/* HEADER SECTION */}
            <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                <div>
                    <div className="flex items-center gap-3 mb-1">
                        <div className="p-2 bg-emerald-600 rounded-lg text-white">
                            <Factory size={24} />
                        </div>
                        <h1 className="text-2xl font-black tracking-tight text-slate-800">RG1 Production</h1>
                    </div>
                    <p className="text-slate-500 text-sm font-medium">Daily Finished Goods Stock & Mill Balance Registry</p>
                </div>
                
                <div className="flex items-center gap-2 w-full md:w-auto">
                    <button onClick={handleAddNew} className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 rounded-xl font-bold transition-all shadow-lg active:scale-95">
                        <Plus size={18} /> New Entry
                    </button>
                    <button onClick={fetchRecords} className="p-2.5 border border-slate-200 bg-white rounded-xl text-slate-600 hover:bg-slate-50 transition-all">
                        <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
                    </button>
                </div>
            </div>

            {/* MAIN TABLE CARD */}
            <div className="max-w-7xl mx-auto bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                {/* TABLE CONTROLS */}
                <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row gap-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input 
                            type="text" 
                            placeholder="Search by SKU or date..." 
                            className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                            value={searchValue}
                            onChange={(e) => setSearchValue(e.target.value)}
                        />
                    </div>
                    <div className="flex gap-2">
                        <button 
                            onClick={() => { setIsSelectionMode(!isSelectionMode); setSelectedIds([]); }}
                            className={`px-4 py-2 rounded-xl font-bold text-sm transition-all ${isSelectionMode ? 'bg-amber-100 text-amber-700 border border-amber-200' : 'bg-white border border-slate-200 text-slate-600'}`}
                        >
                            {isSelectionMode ? 'Cancel Selection' : 'Bulk Action'}
                        </button>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 text-slate-500">
                                {isSelectionMode && <th className="p-4 w-10"></th>}
                                <th className="p-4 text-[11px] font-black uppercase tracking-wider">Log Date</th>
                                <th className="p-4 text-[11px] font-black uppercase tracking-wider">Product Description</th>
                                <th className="p-4 text-[11px] font-black uppercase tracking-wider text-right">Opening</th>
                                <th className="p-4 text-[11px] font-black uppercase tracking-wider text-right text-emerald-600">Produced</th>
                                <th className="p-4 text-[11px] font-black uppercase tracking-wider text-right text-orange-600">Invoiced</th>
                                <th className="p-4 text-[11px] font-black uppercase tracking-wider text-right">Closing Stock</th>
                                <th className="p-4 w-10"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {currentItems.map(item => (
                                <tr key={item.id} onClick={() => handleRowClick(item)} className="group hover:bg-slate-50/80 cursor-pointer transition-colors">
                                    {isSelectionMode && (
                                        <td className="p-4">
                                            {selectedIds.includes(item.id) ? <CheckSquare className="text-emerald-600" size={18}/> : <Square className="text-slate-300" size={18}/>}
                                        </td>
                                    )}
                                    <td className="p-4 text-sm font-semibold text-slate-600">{item.date}</td>
                                    <td className="p-4">
                                        <div className="font-bold text-slate-800">{item.Product?.product_name}</div>
                                        <div className="text-[10px] text-slate-400 uppercase font-bold tracking-tight">ID: {item.product_id}</div>
                                    </td>
                                    <td className="p-4 text-sm text-right font-medium text-slate-500">{item.prev_closing_kgs}</td>
                                    <td className="p-4 text-sm text-right font-bold text-emerald-600">+{item.production_kgs}</td>
                                    <td className="p-4 text-sm text-right font-bold text-orange-600">-{item.invoice_kgs}</td>
                                    <td className="p-4 text-sm text-right">
                                        <span className="bg-slate-100 px-2 py-1 rounded-md font-bold text-slate-700">{item.stock_kgs} KG</span>
                                    </td>
                                    <td className="p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Edit size={16} className="text-slate-400" />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* --- REFINED PROFESSIONAL MODAL --- */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-md transition-opacity" onClick={() => setIsModalOpen(false)} />
                    
                    {/* Modal Content */}
                    <div className="relative bg-white w-full max-w-5xl rounded-[2rem] shadow-2xl overflow-hidden flex flex-col max-h-[95vh] animate-in zoom-in duration-200">
                        
                        {/* 1. Modal Header */}
                        <div className="flex items-center justify-between p-6 border-b border-slate-100">
                            <div className="flex items-center gap-4">
                                <div className={`p-3 rounded-2xl ${formData.id ? 'bg-amber-100 text-amber-600' : 'bg-emerald-100 text-emerald-600'}`}>
                                    {formData.id ? <Edit size={24} /> : <Plus size={24} />}
                                </div>
                                <div>
                                    <h2 className="text-xl font-black text-slate-800 tracking-tight">
                                        {formData.id ? 'Update Production Record' : 'Create Production Log'}
                                    </h2>
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">RG1 Ledger / Transaction Entry</p>
                                </div>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 transition-colors">
                                <X size={24} />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto flex flex-col lg:flex-row">
                            
                            {/* 2. Left Column: Input Form */}
                            <div className="flex-1 p-8 space-y-8">
                                
                                {/* Section A: Identity */}
                                <div>
                                    <div className="flex items-center gap-2 mb-4 text-slate-400">
                                        <Calendar size={14} />
                                        <span className="text-[10px] font-black uppercase tracking-[0.2em]">Record Identity</span>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-bold text-slate-500 ml-1 uppercase">Production Date</label>
                                            <input 
                                                type="date" 
                                                value={formData.date}
                                                onChange={e => setFormData({...formData, date: e.target.value})}
                                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-bold text-slate-500 ml-1 uppercase">Finished Good SKU</label>
                                            <select 
                                                value={formData.product_id}
                                                onChange={e => onProductChange(e.target.value)}
                                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                                            >
                                                <option value="">Select Product</option>
                                                {products.map(p => <option key={p.id} value={p.id}>{p.product_name}</option>)}
                                            </select>
                                        </div>
                                    </div>
                                </div>

                                {/* Section B: Movement Metrics */}
                                <div>
                                    <div className="flex items-center gap-2 mb-4 text-slate-400">
                                        <TrendingUp size={14} />
                                        <span className="text-[10px] font-black uppercase tracking-[0.2em]">Stock Movement (KG)</span>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-bold text-slate-500 ml-1 uppercase">Opening Stock</label>
                                            <input 
                                                type="number" 
                                                value={formData.prev_closing_kgs}
                                                onChange={e => setFormData({...formData, prev_closing_kgs: e.target.value})}
                                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-500"
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-bold text-emerald-600 ml-1 uppercase">Produced (+)</label>
                                            <input 
                                                type="number" 
                                                value={formData.production_kgs}
                                                onChange={e => setFormData({...formData, production_kgs: e.target.value})}
                                                className="w-full px-4 py-3 bg-emerald-50 border border-emerald-100 text-emerald-700 rounded-xl font-black focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                                                placeholder="0.00"
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-bold text-orange-600 ml-1 uppercase">Invoiced (-)</label>
                                            <input 
                                                type="number" 
                                                value={formData.invoice_kgs}
                                                onChange={e => setFormData({...formData, invoice_kgs: e.target.value})}
                                                className="w-full px-4 py-3 bg-orange-50 border border-orange-100 text-orange-700 rounded-xl font-black focus:ring-2 focus:ring-orange-500 outline-none transition-all"
                                                placeholder="0.00"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Section C: Packaging Details */}
                                <div>
                                    <div className="flex items-center gap-2 mb-4 text-slate-400">
                                        <Package size={14} />
                                        <span className="text-[10px] font-black uppercase tracking-[0.2em]">Physical Packaging</span>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-5 border border-dashed border-slate-200 rounded-2xl">
                                        <div className="space-y-3">
                                            <div className="flex justify-between items-center">
                                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">Packing Type</label>
                                                <select 
                                                    value={formData.packing_type_id}
                                                    onChange={e => setFormData({...formData, packing_type_id: e.target.value})}
                                                    className="text-xs font-bold text-slate-800 outline-none bg-transparent underline decoration-slate-200"
                                                >
                                                    <option value="">Select...</option>
                                                    {packingTypes.map(pt => <option key={pt.id} value={pt.id}>{pt.packing_type}</option>)}
                                                </select>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">Wt per Bag (KG)</label>
                                                <input 
                                                    type="number" 
                                                    className="w-20 text-right text-xs font-bold p-1 bg-slate-100 rounded" 
                                                    value={formData.weight_per_bag}
                                                    onChange={e => setFormData({...formData, weight_per_bag: e.target.value})}
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-3">
                                            <div className="flex justify-between items-center">
                                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">Total Bags</label>
                                                <input 
                                                    type="number" 
                                                    className="w-20 text-right text-xs font-bold p-1 bg-slate-100 rounded" 
                                                    value={formData.stock_bags}
                                                    onChange={e => setFormData({...formData, stock_bags: e.target.value})}
                                                />
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">Loose Stock (KG)</label>
                                                <input 
                                                    type="number" 
                                                    className="w-20 text-right text-xs font-bold p-1 bg-slate-100 rounded" 
                                                    value={formData.stock_loose_kgs}
                                                    onChange={e => setFormData({...formData, stock_loose_kgs: e.target.value})}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* 3. Right Column: Live Calculation Summary */}
                            <div className="w-full lg:w-80 bg-slate-900 text-white p-8 flex flex-col">
                                <div className="flex items-center gap-2 mb-8">
                                    <Calculator size={18} className="text-emerald-400" />
                                    <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Ledger Summary</h3>
                                </div>

                                <div className="space-y-6 flex-1">
                                    <div className="group">
                                        <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">Opening Balance</p>
                                        <p className="text-xl font-bold tracking-tight">{formData.prev_closing_kgs} <span className="text-xs text-slate-500">KG</span></p>
                                    </div>

                                    <div className="flex items-center gap-4 text-emerald-400">
                                        <div className="h-px flex-1 bg-slate-800" />
                                        <Plus size={14} />
                                        <div className="h-px flex-1 bg-slate-800" />
                                    </div>

                                    <div>
                                        <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">Day Production</p>
                                        <p className="text-xl font-bold text-emerald-400">+{formData.production_kgs || 0} <span className="text-xs opacity-60">KG</span></p>
                                    </div>

                                    <div className="flex items-center gap-4 text-orange-400">
                                        <div className="h-px flex-1 bg-slate-800" />
                                        <ArrowDownToLine size={14} />
                                        <div className="h-px flex-1 bg-slate-800" />
                                    </div>

                                    <div>
                                        <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">Dispatched/Invoiced</p>
                                        <p className="text-xl font-bold text-orange-400">-{formData.invoice_kgs || 0} <span className="text-xs opacity-60">KG</span></p>
                                    </div>
                                </div>

                                <div className="mt-12 p-6 bg-white/5 rounded-3xl border border-white/10 relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:scale-110 transition-transform">
                                        <Database size={48} />
                                    </div>
                                    <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-2">Final Mill Stock</p>
                                    <div className="flex items-baseline gap-2">
                                        <span className="text-4xl font-black tracking-tighter">{formData.stock_kgs}</span>
                                        <span className="text-sm font-bold text-slate-500">KG</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 4. Modal Footer */}
                        <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-between items-center">
                            <div className="flex items-center gap-2 text-slate-400 text-xs font-bold italic">
                                <Info size={14} />
                                <span>Double check all weights before committing.</span>
                            </div>
                            <div className="flex gap-3">
                                <button 
                                    onClick={() => setIsModalOpen(false)}
                                    className="px-6 py-3 text-xs font-black uppercase tracking-widest text-slate-400 hover:text-slate-600 transition-colors"
                                >
                                    Discard
                                </button>
                                <button 
                                    onClick={handleSave}
                                    disabled={loading}
                                    className="px-8 py-3 bg-slate-900 hover:bg-black text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-slate-200 flex items-center gap-2 active:scale-95 transition-all disabled:opacity-50"
                                >
                                    <Save size={16} />
                                    {loading ? 'Processing...' : 'Commit to Stock'}
                                </button>
                            </div>
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