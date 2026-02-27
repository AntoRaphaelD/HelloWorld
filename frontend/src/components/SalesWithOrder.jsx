import React, { useState, useEffect, useMemo } from 'react';
import { mastersAPI, transactionsAPI } from '../service/api';
import { 
    Save, FileText, ShoppingCart, Calculator, 
    Warehouse, Users, Link, History, Search, 
    Truck, Plus, Trash2, X, RefreshCw,
    ChevronLeft, ChevronRight, Square, CheckSquare, 
    Edit, MapPin, Package, Clock, ShieldCheck,
    Percent, DollarSign, Info, Filter, Database, 
    Calendar, Activity, ArrowRightCircle, AlertCircle,
    PlusCircle, MinusCircle, ClipboardList, Briefcase
} from 'lucide-react';

const SalesWithOrder = () => {
    // --- Initial States ---
    const emptyHeader = {
        id: null,
        order_no: '',
        date: new Date().toISOString().split('T')[0],
        party_id: '', 
        broker_id: '', 
        place: '', 
        is_cancelled: false,
        status: 'OPEN'
    };

    const emptyRow = { 
        product_id: '', 
        packing_type: '', 
        packs: 0, 
        rate_cr: 0, 
        rate_per: 'Kg', 
        qty: 0 
    };

    // --- Main States ---
    const [list, setList] = useState([]);
    const [formData, setFormData] = useState(emptyHeader);
    const [gridRows, setGridRows] = useState([]);
    const [loading, setLoading] = useState(false);
    const [submitLoading, setSubmitLoading] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [activeTab, setActiveTab] = useState('head');

    // Master Data
    const [parties, setParties] = useState([]);
    const [brokers, setBrokers] = useState([]);
    const [products, setProducts] = useState([]);

    // Search & Selection
    const [searchField, setSearchField] = useState('order_no');
    const [searchCondition, setSearchCondition] = useState('Like');
    const [searchValue, setSearchValue] = useState('');
    const [isSelectionMode, setIsSelectionMode] = useState(false);
    const [selectedIds, setSelectedIds] = useState([]);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    // --- Aggregates ---
    const totalQty = useMemo(() => gridRows.reduce((sum, row) => sum + (parseFloat(row.qty) || 0), 0), [gridRows]);
    const totalPacks = useMemo(() => gridRows.reduce((sum, row) => sum + (parseInt(row.packs) || 0), 0), [gridRows]);

    // --- Initialization ---
    useEffect(() => {
        fetchMasters();
        fetchRecords();
    }, []);

    const fetchMasters = async () => {
        try {
            const [p, b, pr] = await Promise.all([
                mastersAPI.accounts.getAll(),
                mastersAPI.brokers.getAll(),
                mastersAPI.products.getAll()
            ]);
            setParties(p.data.data || []);
            setBrokers(b.data.data || []);
            setProducts(pr.data.data || []);
        } catch (err) { console.error("Master Load Error", err); }
    };

    const fetchRecords = async () => {
        setLoading(true);
        try {
            const res = await transactionsAPI.orders.getAll();
            setList(res.data.data || []);
        } catch (err) { console.error("Fetch Error", err); }
        finally { setLoading(false); }
    };

    // --- Action Handlers ---
    const handleAddNew = () => {
        const nextNo = list.length > 0 ? Math.max(...list.map(o => parseInt(o.order_no) || 0)) + 1 : 1;
        setFormData({ ...emptyHeader, order_no: String(nextNo) });
        setGridRows([{ ...emptyRow }]);
        setActiveTab('head');
        setIsModalOpen(true);
    };

    const updateGrid = (index, field, value) => {
        const updated = [...gridRows];
        if (field === 'product_id') {
            const product = products.find(p => p.id === parseInt(value));
            updated[index] = {
                ...updated[index],
                product_id: value,
                packing_type: product ? product.packing_type : '',
            };
        } else {
            updated[index][field] = value;
        }
        setGridRows(updated);
    };

    const handleSave = async () => {
        if (!formData.party_id) return alert("Consignee Party required");
        const validDetails = gridRows.filter(r => r.product_id !== '');
        if (validDetails.length === 0) return alert("Add at least one item");

        setSubmitLoading(true);
        try {
            const payload = { ...formData, OrderDetails: validDetails };
            if (formData.id) await transactionsAPI.orders.update(formData.id, payload);
            else await transactionsAPI.orders.create(payload);
            setIsModalOpen(false);
            fetchRecords();
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
        setFormData({ ...item });
        setGridRows(item.OrderDetails?.length > 0 ? item.OrderDetails.map(d => ({ ...d })) : [{ ...emptyRow }]);
        setActiveTab('head');
        setIsModalOpen(true);
    };

    // --- Filtering Logic ---
    const filteredData = useMemo(() => {
        let result = Array.isArray(list) ? [...list] : [];
        if (searchValue.trim()) {
            result = result.filter(item => {
                let itemValue = searchField === 'party_name' ? item.Party?.account_name || "" : String(item[searchField] || "");
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
                        <ShoppingCart className="text-blue-600" /> Sales Order Desk
                    </h1>
                    <p className="text-sm text-slate-500">Customer booking confirmation and supply chain registry</p>
                </div>
                <div className="flex gap-2">
                    <button onClick={() => { setIsSelectionMode(!isSelectionMode); setSelectedIds([]); }}
                        className={`px-5 py-2 border rounded-lg font-semibold transition-all ${isSelectionMode ? 'bg-amber-100 border-amber-300 text-amber-700' : 'bg-white border-slate-200 text-blue-600 hover:bg-slate-50'}`}>
                        {isSelectionMode ? 'Cancel' : 'Select'}
                    </button>
                    <button onClick={handleAddNew} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg font-semibold shadow-sm transition-all active:scale-95">
                        <Plus size={18} /> New Booking
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
                            <option value="order_no">Order No</option>
                            <option value="party_name">Party Name</option>
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
                            <input type="text" placeholder="Search bookings..." value={searchValue} onChange={(e) => setSearchValue(e.target.value)} className="w-full border border-slate-200 pl-10 pr-4 py-2 rounded-lg text-sm outline-none focus:ring-1 focus:ring-blue-500 bg-white" />
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
                                <th className="p-4 text-sm font-semibold uppercase tracking-wider">Order #</th>
                                <th className="p-4 text-sm font-semibold uppercase tracking-wider">Date</th>
                                <th className="p-4 text-sm font-semibold uppercase tracking-wider">Customer / Consignee</th>
                                <th className="p-4 text-sm font-semibold uppercase tracking-wider">Place</th>
                                <th className="p-4 text-sm font-semibold uppercase tracking-wider text-right">Status</th>
                                {!isSelectionMode && <th className="p-4 w-10"></th>}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-mono">
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="py-24 text-center">
                                        <RefreshCw size={48} className="animate-spin text-blue-500 mx-auto mb-4" />
                                        <p className="text-slate-500 font-medium">Syncing booking registry...</p>
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
                                        <td className="p-4 text-sm font-black text-blue-600">#{item.order_no}</td>
                                        <td className="p-4 text-sm text-slate-500 font-sans">{item.date}</td>
                                        <td className="p-4 text-sm font-bold text-slate-700 uppercase font-sans">{item.Party?.account_name}</td>
                                        <td className="p-4 text-sm font-bold text-slate-400 uppercase font-sans">{item.place}</td>
                                        <td className="p-4 text-right">
                                            <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest ${item.is_cancelled ? 'bg-red-100 text-red-600 border border-red-200' : 'bg-emerald-100 text-emerald-600 border border-emerald-200'}`}>
                                                {item.is_cancelled ? 'Cancelled' : 'Open'}
                                            </span>
                                        </td>
                                        {!isSelectionMode && <td className="p-4"><Edit size={16} className="text-slate-300" /></td>}
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={6} className="py-28 text-center">
                                        <div className="flex flex-col items-center justify-center">
                                            <div className="w-24 h-24 bg-slate-100 rounded-3xl flex items-center justify-center mb-8 shadow-inner">
                                                {searchValue.trim() ? <Search size={56} className="text-amber-400" /> : <ClipboardList size={56} className="text-slate-300" />}
                                            </div>
                                            <h3 className="text-2xl font-semibold text-slate-800 mb-3 tracking-tight">
                                                {searchValue.trim() ? "No matching orders found" : "No active bookings"}
                                            </h3>
                                            <p className="text-slate-500 max-w-md text-[15px]">
                                                {searchValue.trim() ? `We couldn't find any orders matching "${searchValue}".` : "Start by creating a new customer booking confirmation."}
                                            </p>
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
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-7xl overflow-hidden flex flex-col max-h-[95vh] animate-in zoom-in duration-200">
                        
                        {/* Modal Header */}
                        <div className="bg-blue-600 p-4 flex justify-between items-center text-white shadow-lg">
                            <div className="flex items-center gap-4">
                                <div className="p-2 bg-white/20 rounded-lg"><ClipboardList size={20} /></div>
                                <div>
                                    <h2 className="font-bold uppercase tracking-tight">Sales Order Booking</h2>
                                    <p className="text-[10px] font-bold text-blue-100 uppercase">Registry Link: #{formData.order_no}</p>
                                </div>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="hover:bg-blue-500 p-1 rounded-full"><X size={24}/></button>
                        </div>

                        {/* Navigation Tabs */}
                        <div className="flex bg-slate-50 border-b px-6">
                            <button onClick={() => setActiveTab('head')} className={`py-4 px-6 text-[10px] font-bold uppercase tracking-widest relative ${activeTab === 'head' ? 'text-blue-600' : 'text-slate-400'}`}>
                                01. Order Header {activeTab === 'head' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600"/>}
                            </button>
                            <button onClick={() => setActiveTab('detail')} className={`py-4 px-6 text-[10px] font-bold uppercase tracking-widest relative ${activeTab === 'detail' ? 'text-blue-600' : 'text-slate-400'}`}>
                                02. Itemization Grid {activeTab === 'detail' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600"/>}
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="flex-1 overflow-y-auto p-6 flex flex-col lg:flex-row gap-6">
                            
                            {/* LEFT SIDE: Entry Form */}
                            <div className="flex-1 space-y-6">
                                {activeTab === 'head' ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="bg-slate-50 p-5 rounded-xl space-y-4 border">
                                            <div className="flex items-center gap-2 mb-2 text-slate-400"><Database size={14}/><span className="text-[9px] font-black uppercase">Metadata</span></div>
                                            <InputField label="Order No" value={formData.order_no} readOnly className="font-mono text-blue-600" />
                                            <InputField label="Booking Date" type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} />
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-bold text-slate-400 uppercase">Customer (Party)</label>
                                                <select value={formData.party_id} onChange={e => setFormData({...formData, party_id: e.target.value})} className="w-full bg-white border border-slate-200 p-2 rounded-lg text-sm font-bold shadow-inner">
                                                    <option value="">-- Choose Party --</option>
                                                    {parties.map(p => <option key={p.id} value={p.id}>{p.account_name}</option>)}
                                                </select>
                                            </div>
                                        </div>

                                        <div className="bg-slate-50 p-5 rounded-xl space-y-4 border">
                                            <div className="flex items-center gap-2 mb-2 text-slate-400"><MapPin size={14}/><span className="text-[9px] font-black uppercase">Logistics</span></div>
                                            <InputField label="Dispatch To (Place)" value={formData.place} onChange={e => setFormData({...formData, place: e.target.value.toUpperCase()})} />
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-bold text-slate-400 uppercase">Agent / Broker</label>
                                                <select value={formData.broker_id} onChange={e => setFormData({...formData, broker_id: e.target.value})} className="w-full bg-white border border-slate-200 p-2 rounded-lg text-sm font-bold shadow-inner">
                                                    <option value="">DIRECT (HOUSE ACCOUNT)</option>
                                                    {brokers.map(b => <option key={b.id} value={b.id}>{b.broker_name}</option>)}
                                                </select>
                                            </div>
                                            <div className="pt-4 border-t">
                                                <label className="flex items-center gap-3 cursor-pointer group">
                                                    <input type="checkbox" className="w-5 h-5 accent-red-600 rounded" checked={formData.is_cancelled} onChange={e => setFormData({...formData, is_cancelled: e.target.checked})} />
                                                    <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest group-hover:text-red-500">Void Order</span>
                                                </label>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                                        <table className="w-full">
                                            <thead className="bg-slate-900 text-white text-[9px] font-black uppercase tracking-widest">
                                                <tr>
                                                    <th className="p-4 text-left">SKU Product</th>
                                                    <th className="p-4 text-center w-24">Packs</th>
                                                    <th className="p-4 text-center w-28">Rate (CR)</th>
                                                    <th className="p-4 text-center w-20">Per</th>
                                                    <th className="p-4 text-center w-32">Qty (KG)</th>
                                                    <th className="p-4 w-10"></th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100 font-mono">
                                                {gridRows.map((row, idx) => (
                                                    <tr key={idx} className="hover:bg-blue-50/30 transition-colors">
                                                        <td className="p-2">
                                                            <select value={row.product_id} onChange={e => updateGrid(idx, 'product_id', e.target.value)} className="w-full bg-transparent p-2 text-[11px] font-black uppercase outline-none text-blue-600">
                                                                <option value="">-- Select SKU --</option>
                                                                {products.map(p => <option key={p.id} value={p.id}>{p.product_name}</option>)}
                                                            </select>
                                                        </td>
                                                        <td className="p-2">
                                                            <input type="number" value={row.packs} onChange={e => updateGrid(idx, 'packs', e.target.value)} className="w-full p-2 text-center text-xs font-bold bg-slate-50 rounded-lg outline-none" />
                                                        </td>
                                                        <td className="p-2">
                                                            <input type="number" value={row.rate_cr} onChange={e => updateGrid(idx, 'rate_cr', e.target.value)} className="w-full p-2 text-center text-xs font-black text-blue-700 outline-none border-b border-transparent focus:border-blue-500" />
                                                        </td>
                                                        <td className="p-2">
                                                            <input type="text" value={row.rate_per} onChange={e => updateGrid(idx, 'rate_per', e.target.value)} className="w-full p-2 text-center text-[10px] font-black uppercase outline-none" />
                                                        </td>
                                                        <td className="p-2">
                                                            <input type="number" value={row.qty} onChange={e => updateGrid(idx, 'qty', e.target.value)} className="w-full p-2 text-center text-sm font-black text-emerald-700 outline-none border-b border-transparent focus:border-emerald-500" />
                                                        </td>
                                                        <td className="p-2 text-center">
                                                            <button onClick={() => setGridRows(gridRows.filter((_, i) => i !== idx))} className="text-slate-300 hover:text-red-500"><MinusCircle size={18}/></button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                        <button onClick={() => setGridRows([...gridRows, { ...emptyRow }])} className="w-full p-4 bg-slate-50 text-blue-600 text-[10px] font-black uppercase tracking-widest hover:bg-blue-100 transition-all">+ Add Booking Line</button>
                                    </div>
                                )}
                            </div>

                            {/* RIGHT SIDE: Financial Cockpit */}
                            <div className="w-full lg:w-96 bg-slate-900 rounded-2xl p-6 text-white flex flex-col justify-between shadow-2xl">
                                <div className="space-y-4">
                                    <div className="text-center mb-6">
                                        <Activity size={32} className="text-blue-400 mx-auto mb-1" />
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Order Aggregate Metrics</p>
                                    </div>

                                    <div className="space-y-6">
                                        <div className="bg-white/5 p-6 rounded-2xl border border-white/5 shadow-inner">
                                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Total Weight (Net)</p>
                                            <div className="flex items-baseline gap-2">
                                                <h3 className="text-4xl font-black text-emerald-400 font-mono tracking-tighter">{totalQty.toFixed(2)}</h3>
                                                <span className="text-xs font-bold text-slate-600 uppercase">KGs</span>
                                            </div>
                                        </div>

                                        <div className="bg-white/5 p-6 rounded-2xl border border-white/5 shadow-inner">
                                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Total Pack Units</p>
                                            <div className="flex items-baseline gap-2">
                                                <h3 className="text-4xl font-black text-amber-400 font-mono tracking-tighter">{totalPacks}</h3>
                                                <span className="text-xs font-bold text-slate-600 uppercase">Units</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className={`mt-8 p-6 rounded-3xl border text-center transition-all ${formData.is_cancelled ? 'bg-red-500/10 border-red-500/20 text-red-500' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500'}`}>
                                    <p className="text-[10px] font-black uppercase tracking-widest">Booking Status</p>
                                    <h3 className="text-lg font-black">{formData.is_cancelled ? 'VOID / CANCELLED' : 'ACTIVE / OPEN'}</h3>
                                </div>
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="p-6 bg-slate-50 border-t flex justify-end items-center gap-4">
                            <button onClick={() => setIsModalOpen(false)} className="px-8 py-3 font-bold text-slate-400 hover:text-slate-600 text-xs tracking-widest uppercase transition-colors">Discard</button>
                            <button onClick={handleSave} disabled={submitLoading} className="bg-blue-600 hover:bg-blue-700 text-white px-10 py-3 rounded-xl font-black shadow-xl flex items-center gap-2 active:scale-95 transition-all text-xs tracking-widest uppercase">
                                <Save size={18}/> {submitLoading ? 'DEPLOYING...' : 'FINALIZE BOOKING'}
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

export default SalesWithOrder;