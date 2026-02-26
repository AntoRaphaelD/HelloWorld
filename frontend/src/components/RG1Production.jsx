import React, { useState, useEffect, useMemo } from 'react';
import { mastersAPI, transactionsAPI } from '../service/api';
import { 
    Factory, Save, History, TrendingUp, Search, 
    ChevronRight, Activity, Scale, ArrowDownToLine, Database,
    Plus, Trash2, X, RefreshCw, ChevronLeft, Edit,
    Square, CheckSquare, Info, Calculator, Package, 
    Calendar, ArrowRight, AlertCircle, Box, Filter, Hash, Lock
} from 'lucide-react';

const RG1Production = () => {
    // --- Initial State Template ---
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
    const [products, setProducts] = useState([]);
    const [packingTypes, setPackingTypes] = useState([]);
    const [formData, setFormData] = useState(emptyState);
    const [loading, setLoading] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);

    // --- Selection & Pagination ---
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

    // EFFECT: Automatic Stock Logic Engine
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
            setList(res.data.data || []);
        } catch (err) { console.error("Records fetch error", err); }
        finally { setLoading(false); }
    };

    const getNextCode = () => {
        if (!list.length) return 1001;
        const lastId = Math.max(...list.map(i => i.id));
        return lastId + 1;
    };

    // --- Handlers ---
    const handleAddNew = () => {
        setFormData({ ...emptyState, id: getNextCode() });
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
        if (!product) return;

        // Find matching packing type ID from the string name in product table
        const pType = packingTypes.find(t => t.packing_type === product.packing_type);

        setFormData(prev => ({
            ...prev,
            product_id: productId,
            packing_type_id: pType ? pType.id : '',
            weight_per_bag: product.pack_nett_wt || 0,
            prev_closing_kgs: product.mill_stock || 0
        }));
    };

    const handleSave = async (e) => {
        if (e) e.preventDefault();
        if (!formData.product_id) return alert("Selection Required: Product SKU");
        
        setLoading(true);
        try {
            if (formData.id && list.find(i => i.id === formData.id)) {
                await transactionsAPI.production.update(formData.id, formData);
            } else {
                await transactionsAPI.production.create(formData);
            }
            setIsModalOpen(false);
            fetchRecords();
            fetchMasters();
        } catch (err) { alert("Deployment Error: Check Stock Integrity"); }
        finally { setLoading(false); }
    };

    // --- UI Helpers ---
    const filteredData = useMemo(() => {
        return list.filter(item => 
            (item.Product?.product_name || "").toLowerCase().includes(searchValue.toLowerCase())
        ).sort((a, b) => b.id - a.id);
    }, [list, searchValue]);

    const currentItems = filteredData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
    const totalPages = Math.ceil(filteredData.length / itemsPerPage) || 1;

    return (
        <div className="min-h-screen bg-slate-100 p-8 font-sans text-slate-900">
            
            {/* SCREEN HEADER */}
            <div className="flex justify-between items-end mb-8">
                <div>
                    <h1 className="text-3xl font-black text-slate-800 flex items-center gap-3">
                        <Factory className="text-blue-600" size={36}/> RG1 PRODUCTION LEDGER
                    </h1>
                    <p className="text-slate-500 font-medium tracking-tight">Daily Mill Production & Stock Reconciliation Unit</p>
                </div>
                <div className="flex gap-3">
                    <button onClick={handleAddNew} className="bg-slate-900 text-white px-10 py-4 rounded-3xl font-black flex items-center gap-2 hover:bg-blue-600 transition-all shadow-2xl active:scale-95 text-xs uppercase tracking-widest">
                        <Plus size={20}/> New Log Entry
                    </button>
                    <button onClick={fetchRecords} className="p-4 bg-white border border-slate-200 rounded-3xl shadow-sm hover:bg-slate-50">
                        <RefreshCw size={20} className={loading ? 'animate-spin' : ''}/>
                    </button>
                </div>
            </div>

            {/* SEARCH BAR */}
            <div className="bg-white p-4 rounded-[2rem] border border-slate-200 shadow-sm flex items-center gap-4 mb-8">
                <Search className="text-slate-400 ml-4" size={20}/>
                <input 
                    type="text" 
                    placeholder="Quick search by Product SKU..." 
                    className="flex-1 bg-transparent outline-none font-bold text-sm" 
                    value={searchValue} 
                    onChange={e => setSearchValue(e.target.value)} 
                />
                <div className="bg-blue-50 text-blue-600 px-6 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest">Registry Count: {filteredData.length}</div>
            </div>

            {/* DATA TABLE */}
            <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-xl overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-slate-900 text-white text-[10px] font-black uppercase tracking-[0.2em]">
                        <tr>
                            <th className="px-10 py-6">Log Date</th>
                            <th className="px-6 py-6">SKU Nomenclature</th>
                            <th className="px-6 py-6 text-right">Bag Wt</th>
                            <th className="px-6 py-6">Type</th>
                            <th className="px-6 py-6 text-right">Closing Bags</th>
                            <th className="px-6 py-6 text-right">Loose (KG)</th>
                            <th className="px-10 py-6 text-right">Daily Prod (KG)</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {currentItems.map(item => (
                            <tr key={item.id} onClick={() => handleRowClick(item)} className="hover:bg-blue-50/30 transition-colors cursor-pointer group">
                                <td className="px-10 py-6 font-mono font-bold text-blue-600">{item.date}</td>
                                <td className="px-6 py-6">
                                    <div className="font-black text-slate-800 uppercase text-xs">{item.Product?.product_name}</div>
                                    <div className="text-[10px] text-slate-400 font-bold uppercase">Log ID: #{item.id}</div>
                                </td>
                                <td className="px-6 py-6 text-right font-mono font-bold text-slate-500">{item.weight_per_bag} KG</td>
                                <td className="px-6 py-6 text-[10px] font-black uppercase text-slate-400">{item.PackingType?.packing_type}</td>
                                <td className="px-6 py-6 text-right font-black text-slate-900">{item.stock_bags}</td>
                                <td className="px-6 py-6 text-right font-mono font-bold text-slate-500">{item.stock_loose_kgs}</td>
                                <td className="px-10 py-6 text-right"><span className="bg-blue-100 text-blue-700 px-4 py-1.5 rounded-full font-black font-mono text-xs">{item.production_kgs}</span></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                <div className="p-8 bg-slate-50 border-t flex justify-between items-center">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Inventory Management System v2.0</span>
                    <div className="flex gap-2">
                        <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} className="p-3 bg-white border rounded-xl hover:bg-blue-50 disabled:opacity-30"><ChevronLeft size={18}/></button>
                        <div className="px-6 flex items-center font-black text-xs">PAGE {currentPage} / {totalPages}</div>
                        <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)} className="p-3 bg-white border rounded-xl hover:bg-blue-50 disabled:opacity-30"><ChevronRight size={18}/></button>
                    </div>
                </div>
            </div>

            {/* ENTRY MODAL */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 backdrop-blur-lg p-4">
                    <div className="bg-white w-full max-w-6xl rounded-[3.5rem] shadow-2xl overflow-hidden flex flex-col h-[90vh] animate-in fade-in zoom-in duration-300">
                        
                        {/* Header */}
                        <div className="bg-slate-900 p-8 flex justify-between items-center shrink-0">
                            <div className="flex items-center gap-6">
                                <div className="p-4 bg-blue-600 rounded-[1.5rem] text-white shadow-2xl shadow-blue-500/30"><Factory size={32}/></div>
                                <div>
                                    <h2 className="text-white font-black text-xl tracking-tight uppercase">Mill Stock Deployment</h2>
                                    <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.3em]">Sequential Reference ID: #{formData.id}</p>
                                </div>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="text-slate-500 hover:text-white transition-colors"><X size={40}/></button>
                        </div>

                        <div className="flex-1 overflow-hidden flex flex-col lg:flex-row">
                            
                            {/* Input Form */}
                            <div className="flex-1 overflow-y-auto p-12 space-y-10">
                                
                                {/* Section 1: Selection */}
                                <div className="grid grid-cols-2 gap-8">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Production Date</label>
                                        <div className="relative">
                                            <input type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className="w-full bg-slate-50 border-2 border-slate-100 p-4 rounded-3xl font-black text-sm outline-none focus:border-blue-500 transition-all" />
                                            <Calendar className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300" size={18}/>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Target Product SKU</label>
                                        <select value={formData.product_id} onChange={e => onProductChange(e.target.value)} className="w-full bg-slate-50 border-2 border-slate-100 p-4 rounded-3xl font-black text-sm outline-none focus:border-blue-500 transition-all appearance-none cursor-pointer">
                                            <option value="">-- SELECT FROM MASTER --</option>
                                            {products.map(p => <option key={p.id} value={p.id}>{p.product_name}</option>)}
                                        </select>
                                    </div>
                                </div>

                                {/* Section 2: Daily Workflow (Editable) */}
                                <div className="grid grid-cols-2 gap-8 p-10 bg-blue-50/50 rounded-[3rem] border border-blue-100 border-dashed">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-blue-600 uppercase tracking-widest ml-1">Daily Production (+)</label>
                                        <input type="number" placeholder="Enter Kgs" value={formData.production_kgs} onChange={e => setFormData({...formData, production_kgs: e.target.value})} className="w-full bg-white border-2 border-blue-200 p-6 rounded-[2rem] font-mono text-2xl font-black text-blue-700 outline-none focus:ring-4 focus:ring-blue-100 transition-all shadow-inner" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-orange-600 uppercase tracking-widest ml-1">Daily Invoiced (-)</label>
                                        <input type="number" placeholder="Enter Kgs" value={formData.invoice_kgs} onChange={e => setFormData({...formData, invoice_kgs: e.target.value})} className="w-full bg-white border-2 border-orange-200 p-6 rounded-[2rem] font-mono text-2xl font-black text-orange-700 outline-none focus:ring-4 focus:ring-orange-100 transition-all shadow-inner" />
                                    </div>
                                </div>

                                {/* Section 3: Master Snapshot (Read-Only) */}
                                <div className="space-y-6">
                                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><Lock size={12}/> Locked Master Records</h4>
                                    <div className="grid grid-cols-3 gap-6">
                                        <InputField label="Opening Balance" value={formData.prev_closing_kgs} readOnly icon={Database} />
                                        <InputField label="Bag Weight (KG)" value={formData.weight_per_bag} readOnly icon={Scale} />
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Packing Configuration</label>
                                            <div className="bg-slate-50 p-4 rounded-3xl border border-slate-100 font-bold text-xs text-slate-500 h-[58px] flex items-center">
                                                {packingTypes.find(t => t.id == formData.packing_type_id)?.packing_type || 'N/A'}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Aggregates Sidebar */}
                            <div className="w-full lg:w-96 bg-slate-900 p-12 flex flex-col justify-between shrink-0 border-l border-white/5">
                                <div className="space-y-8 text-center">
                                    <Calculator size={48} className="text-blue-500 mx-auto" />
                                    <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Live Stock Assessment</h3>
                                    
                                    <div className="space-y-6">
                                        <div className="p-6 bg-white/5 rounded-3xl border border-white/5">
                                            <p className="text-[9px] font-black text-slate-500 uppercase mb-2 tracking-widest">Total Net Stock</p>
                                            <p className="text-3xl font-mono font-black text-emerald-400">{formData.stock_kgs} <span className="text-xs text-slate-600 uppercase">Kg</span></p>
                                        </div>
                                        <div className="p-6 bg-white/5 rounded-3xl border border-white/5">
                                            <p className="text-[9px] font-black text-slate-500 uppercase mb-2 tracking-widest">Pack Count (Bags)</p>
                                            <p className="text-3xl font-mono font-black text-blue-400">{formData.stock_bags} <span className="text-xs text-slate-600 uppercase">Units</span></p>
                                        </div>
                                        <div className="p-6 bg-white/5 rounded-3xl border border-white/5">
                                            <p className="text-[9px] font-black text-slate-500 uppercase mb-2 tracking-widest">Loose Weight</p>
                                            <p className="text-3xl font-mono font-black text-amber-400">{formData.stock_loose_kgs} <span className="text-xs text-slate-600 uppercase">Kg</span></p>
                                        </div>
                                    </div>
                                </div>

                                <button onClick={handleSave} disabled={loading} className="w-full bg-blue-600 text-white py-6 rounded-[2rem] font-black text-[13px] uppercase tracking-[0.3em] shadow-2xl shadow-blue-500/40 hover:bg-blue-500 transition-all flex items-center justify-center gap-3 active:scale-95 disabled:opacity-50">
                                    <Save size={20}/> {loading ? 'Transmitting...' : 'Finalize Log'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <style jsx>{`
                input[type='number']::-webkit-inner-spin-button, input[type='number']::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
            `}</style>
        </div>
    );
};

// UI Atoms
const InputField = ({ label, icon: Icon, ...props }) => (
    <div className="space-y-2">
        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{label}</label>
        <div className="relative">
            <input {...props} className="w-full bg-slate-50 border border-slate-200 p-4 rounded-[1.5rem] text-[12px] font-black text-slate-500 outline-none transition-all shadow-sm" />
            {Icon && <Icon className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-200" size={14}/>}
        </div>
    </div>
);

export default RG1Production;