import React, { useState, useEffect, useMemo } from 'react';
import { mastersAPI, transactionsAPI } from '../service/api';
import { 
    Save, Plus, Trash2, X, Search, ShoppingCart, 
    PlusCircle, MinusCircle, MapPin, ClipboardList, 
    RefreshCw, ChevronLeft, ChevronRight, Edit,
    Square, CheckSquare, Package, User, Calendar, 
    Briefcase, ArrowRight, Calculator, AlertCircle,
    Info, Activity, Filter, Hash, Database
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

    // --- Main States ---
    const [orders, setOrders] = useState([]);
    const [formData, setFormData] = useState(emptyHeader);
    const [gridRows, setGridRows] = useState([{ product_id: '', rate_cr: 0, rate_imm: 0, qty: 0 }]);
    const [loading, setLoading] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [activeTab, setActiveTab] = useState("head");

    // Master Data
    const [parties, setParties] = useState([]);
    const [brokers, setBrokers] = useState([]);
    const [products, setProducts] = useState([]);

    // --- DYNAMIC FILTERING STATE ---
    const [searchField, setSearchField] = useState('order_no');
    const [searchCondition, setSearchCondition] = useState('Like');
    const [searchValue, setSearchValue] = useState("");
    const [isSelectionMode, setIsSelectionMode] = useState(false);
    const [selectedIds, setSelectedIds] = useState([]);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    // --- Initialization ---
    useEffect(() => {
        fetchMasters();
        fetchOrders();
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
        } catch (err) { console.error("Error fetching masters", err); }
    };

    const fetchOrders = async () => {
        setLoading(true);
        try {
            const res = await transactionsAPI.orders.getAll();
            const data = res.data.data || []; 
            setOrders(data);
        } catch (err) { console.error("Error", err); }
        finally { setLoading(false); }
    };

    // --- Dynamic Filtering Logic ---
    const filteredOrders = useMemo(() => {
        let result = Array.isArray(orders) ? [...orders] : [];
        if (searchValue.trim()) {
            result = result.filter(item => {
                let itemValue = "";
                if (searchField === 'party_name') itemValue = item.Party?.account_name || "";
                else itemValue = String(item[searchField] || "");

                const term = searchValue.toLowerCase().trim();
                return searchCondition === 'Equal' 
                    ? itemValue.toLowerCase() === term 
                    : itemValue.toLowerCase().includes(term);
            });
        }
        return result.sort((a, b) => b.id - a.id);
    }, [orders, searchValue, searchField, searchCondition]);

    const currentItems = filteredOrders.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
    const totalPages = Math.ceil(filteredOrders.length / itemsPerPage) || 1;

    // --- Action Handlers ---
    const handleAddNew = () => {
        const nextId = orders.length > 0 ? Math.max(...orders.map(o => o.id)) + 1 : 1;
        setFormData({ ...emptyHeader, order_no: `${nextId}` });
        setGridRows([{ product_id: '', rate_cr: 0, rate_imm: 0, qty: 0 }]);
        setActiveTab("head");
        setIsModalOpen(true);
    };

    const handleEditOrder = (order) => {
        if (isSelectionMode) {
            setSelectedIds(prev => prev.includes(order.id) ? prev.filter(i => i !== item.id) : [...prev, order.id]);
            return;
        }
        setFormData({ ...order });
        setGridRows(order.OrderDetails?.length > 0 ? order.OrderDetails : [{ product_id: '', rate_cr: 0, rate_imm: 0, qty: 0 }]);
        setActiveTab("head");
        setIsModalOpen(true);
    };

    const handleSave = async () => {
        if (!formData.party_id) return alert("Please select a Party/Customer");
        if (gridRows.length === 0 || !gridRows[0].product_id) return alert("Please add at least one product");
        
        setLoading(true);
        const payload = { ...formData, Details: gridRows };
        try {
            if (formData.id) await transactionsAPI.orders.update(formData.id, payload);
            else await transactionsAPI.orders.create(payload);
            setIsModalOpen(false);
            fetchOrders();
        } catch (err) { alert("Error saving order"); }
        finally { setLoading(false); }
    };

    const handleBulkDelete = async () => {
        if (!window.confirm(`Delete ${selectedIds.length} orders permanently?`)) return;
        setLoading(true);
        try {
            await Promise.all(selectedIds.map(id => transactionsAPI.orders.delete(id)));
            setSelectedIds([]);
            setIsSelectionMode(false);
            fetchOrders();
        } catch (err) { alert("Delete failed"); }
        finally { setLoading(false); }
    };

    const updateGrid = (index, field, value) => {
        const updated = [...gridRows];
        updated[index][field] = value;
        setGridRows(updated);
    };

    const totalQty = gridRows.reduce((sum, row) => sum + (parseFloat(row.qty) || 0), 0);

    return (
        <div className="min-h-screen bg-slate-50 p-6 font-sans text-slate-900">
            
            {/* 1. TOP HEADER */}
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <ShoppingCart className="text-blue-600" /> Sales Order Machine
                    </h1>
                    <p className="text-sm text-slate-500">Registry of customer confirmations and booking logs</p>
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
                            onClick={handleBulkDelete}
                            disabled={selectedIds.length === 0}
                            className={`px-5 py-2 border rounded-lg flex items-center gap-2 transition-all ${selectedIds.length > 0 ? 'bg-white border-red-200 text-red-600' : 'bg-white border-slate-100 text-slate-300 cursor-not-allowed'}`}
                        >
                            <Trash2 size={18} /> Delete {selectedIds.length > 0 && `(${selectedIds.length})`}
                        </button>
                    ) : (
                        <button onClick={handleAddNew} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg font-semibold shadow-sm transition-all active:scale-95">
                            <Plus size={18} /> New Confirmation
                        </button>
                    )}

                    <button onClick={fetchOrders} className="p-2 border border-slate-200 rounded-lg bg-white text-slate-400 hover:text-blue-600 transition-colors">
                        <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
                    </button>
                </div>
            </div>

            {/* 2. DYNAMIC FILTER BAR */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm mb-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                    <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block ml-1">Search Field</label>
                        <select value={searchField} onChange={(e) => setSearchField(e.target.value)} className="w-full border border-slate-200 p-2 rounded-lg text-sm outline-none focus:ring-1 focus:ring-blue-500">
                            <option value="order_no">Order No</option>
                            <option value="party_name">Party Name</option>
                            <option value="place">Destination Place</option>
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
                            <input type="text" placeholder="Type to filter..." value={searchValue} onChange={(e) => setSearchValue(e.target.value)} className="w-full border border-slate-200 pl-10 pr-4 py-2 rounded-lg text-sm outline-none focus:ring-1 focus:ring-blue-500" />
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={() => setSearchValue('')} className="flex-1 border border-slate-200 py-2 rounded-lg text-sm font-bold hover:bg-slate-50 transition-all">Clear All</button>
                        <div className="flex-1 bg-blue-50 text-blue-600 border border-blue-100 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2">
                            <Filter size={14}/> {filteredOrders.length} Records
                        </div>
                    </div>
                </div>
            </div>

            {/* 3. MAIN DATA TABLE */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-blue-600 text-white">
                            <tr>
                                {isSelectionMode && <th className="p-4 w-12 text-center"><Square size={18} className="mx-auto" /></th>}
                                <th className="p-4 text-sm font-semibold">Order #</th>
                                <th className="p-4 text-sm font-semibold">Date</th>
                                <th className="p-4 text-sm font-semibold">Party / Customer</th>
                                <th className="p-4 text-sm font-semibold">Broker</th>
                                <th className="p-4 text-sm font-semibold">Destination</th>
                                <th className="p-4 text-sm font-semibold text-center">Status</th>
                                {!isSelectionMode && <th className="p-4 w-10"></th>}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {currentItems.length > 0 ? currentItems.map((item) => (
                                <tr key={item.id} onClick={() => handleEditOrder(item)} className={`transition-colors cursor-pointer ${selectedIds.includes(item.id) ? 'bg-blue-50' : 'hover:bg-blue-50'}`}>
                                    {isSelectionMode && (
                                        <td className="p-4 text-center" onClick={(e) => {e.stopPropagation(); handleEditOrder(item);}}>
                                            {selectedIds.includes(item.id) ? <CheckSquare size={18} className="text-blue-600 mx-auto"/> : <Square size={18} className="text-slate-200 mx-auto"/>}
                                        </td>
                                    )}
                                    <td className="p-4 text-sm font-bold text-slate-800 font-mono">#{item.order_no}</td>
                                    <td className="p-4 text-sm text-slate-500">{item.date}</td>
                                    <td className="p-4 text-sm font-bold text-slate-700 uppercase">{item.Party?.account_name}</td>
                                    <td className="p-4 text-xs font-bold text-slate-400 uppercase">{item.Broker?.broker_name || 'Direct'}</td>
                                    <td className="p-4 text-xs font-bold text-slate-500 flex items-center gap-1 mt-1"><MapPin size={12}/> {item.place}</td>
                                    <td className="p-4 text-center">
                                        <span className={`text-[10px] px-2 py-1 rounded font-bold uppercase tracking-wider ${item.is_cancelled ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'}`}>
                                            {item.is_cancelled ? 'Cancelled' : 'Open'}
                                        </span>
                                    </td>
                                    {!isSelectionMode && (
                                        <td className="p-4 text-right">
                                            <Edit size={16} className="text-slate-300 group-hover:text-blue-600" />
                                        </td>
                                    )}
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan={8} className="p-20 text-center opacity-20">
                                        <ShoppingCart size={48} className="mx-auto mb-2"/>
                                        <p className="font-bold uppercase tracking-widest text-xl">No Matching Orders Found</p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* 4. PAGINATION FOOTER */}
                <div className="p-4 bg-slate-50 border-t flex items-center justify-between">
                    <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider">
                        Page {currentPage} of {totalPages} ({filteredOrders.length} Total)
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

            {/* 5. FORM MODAL OVERLAY */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in duration-200">
                        
                        {/* Modal Header */}
                        <div className="bg-blue-600 p-4 flex justify-between items-center text-white">
                            <div className="flex items-center gap-4">
                                <div className="p-2 bg-white/20 rounded-lg"><ClipboardList size={20} /></div>
                                <div>
                                    <h2 className="font-bold uppercase tracking-tight text-lg">{formData.id ? 'Modify Sales Record' : 'New Sales Transaction'}</h2>
                                    <p className="text-[10px] font-bold text-blue-100 uppercase tracking-widest">Order Ref: #{formData.order_no}</p>
                                </div>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="hover:bg-blue-500 p-1 rounded-full transition-colors"><X size={24}/></button>
                        </div>

                        {/* Navigation Tabs */}
                        <div className="flex bg-slate-50 border-b px-6">
                            <button onClick={() => setActiveTab('head')} className={`py-4 px-6 text-[10px] font-bold uppercase tracking-widest relative ${activeTab === 'head' ? 'text-blue-600' : 'text-slate-400'}`}>
                                01. General Header {activeTab === 'head' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600"/>}
                            </button>
                            <button onClick={() => setActiveTab('detail')} className={`py-4 px-6 text-[10px] font-bold uppercase tracking-widest relative ${activeTab === 'detail' ? 'text-blue-600' : 'text-slate-400'}`}>
                                02. Item Selection {activeTab === 'detail' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600"/>}
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="flex-1 overflow-y-auto flex flex-col lg:flex-row">
                            
                            {/* LEFT SIDE: Content */}
                            <div className="flex-1 p-8">
                                {activeTab === 'head' ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        <div className="space-y-6">
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Confirmation Date</label>
                                                <div className="relative">
                                                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16}/>
                                                    <input type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold focus:ring-1 focus:ring-blue-500 outline-none" />
                                                </div>
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Customer / Party Selection</label>
                                                <div className="relative">
                                                    <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16}/>
                                                    <select value={formData.party_id} onChange={e => setFormData({...formData, party_id: e.target.value})} className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold focus:ring-1 focus:ring-blue-500 outline-none">
                                                        <option value="">-- Choose Customer --</option>
                                                        {parties.map(p => <option key={p.id} value={p.id}>{p.account_name}</option>)}
                                                    </select>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="space-y-6">
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Dispatch Destination</label>
                                                <div className="relative">
                                                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16}/>
                                                    <input value={formData.place} onChange={e => setFormData({...formData, place: e.target.value.toUpperCase()})} placeholder="CITY, STATE" className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold focus:ring-1 focus:ring-blue-500 outline-none" />
                                                </div>
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Assigned Agent / Broker</label>
                                                <div className="relative">
                                                    <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16}/>
                                                    <select value={formData.broker_id} onChange={e => setFormData({...formData, broker_id: e.target.value})} className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold focus:ring-1 focus:ring-blue-500 outline-none">
                                                        <option value="">DIRECT (NO BROKER)</option>
                                                        {brokers.map(b => <option key={b.id} value={b.id}>{b.broker_name}</option>)}
                                                    </select>
                                                </div>
                                            </div>
                                            <label className="flex items-center gap-3 pt-4 border-t cursor-pointer group">
                                                <input type="checkbox" className="w-5 h-5 accent-red-600" checked={formData.is_cancelled} onChange={e => setFormData({...formData, is_cancelled: e.target.checked})} />
                                                <span className="text-xs font-bold text-slate-400 group-hover:text-red-500 uppercase tracking-widest transition-colors">Void Confirmation / Cancel Order</span>
                                            </label>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        <div className="flex justify-between items-center px-1">
                                            <div className="flex items-center gap-2 text-blue-600">
                                                <Calculator size={18} />
                                                <h3 className="text-xs font-bold uppercase tracking-widest">Transaction Items</h3>
                                            </div>
                                            <button onClick={() => setGridRows([...gridRows, { product_id: '', rate_cr: 0, rate_imm: 0, qty: 0 }])} className="flex items-center gap-2 bg-blue-50 text-blue-600 px-4 py-2 rounded-lg text-[10px] font-bold uppercase hover:bg-blue-100 transition-colors">
                                                <PlusCircle size={14} /> Append SKU
                                            </button>
                                        </div>
                                        <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm bg-white">
                                            <table className="w-full border-collapse">
                                                <thead className="bg-slate-900 text-white text-[9px] uppercase font-bold tracking-widest">
                                                    <tr>
                                                        <th className="p-3 text-left">SKU Product Selection</th>
                                                        <th className="p-3 text-center">Rate (CR)</th>
                                                        <th className="p-3 text-center">Rate (IMM)</th>
                                                        <th className="p-3 text-center">Quantity (KGs)</th>
                                                        <th className="p-3 w-10"></th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100 font-mono">
                                                    {gridRows.map((row, index) => (
                                                        <tr key={index} className="hover:bg-slate-50 transition-colors">
                                                            <td className="p-2">
                                                                <select value={row.product_id} onChange={e => updateGrid(index, 'product_id', e.target.value)} className="w-full p-2 bg-transparent text-sm font-bold outline-none border-b border-transparent focus:border-blue-300">
                                                                    <option value="">-- SELECT SKU --</option>
                                                                    {products.map(p => <option key={p.id} value={p.id}>{p.product_name}</option>)}
                                                                </select>
                                                            </td>
                                                            <td className="p-2"><input type="number" value={row.rate_cr} onChange={e => updateGrid(index, 'rate_cr', e.target.value)} className="w-full p-2 text-center text-sm font-bold bg-transparent outline-none" /></td>
                                                            <td className="p-2"><input type="number" value={row.rate_imm} onChange={e => updateGrid(index, 'rate_imm', e.target.value)} className="w-full p-2 text-center text-sm font-bold bg-transparent outline-none" /></td>
                                                            <td className="p-2"><input type="number" value={row.qty} onChange={e => updateGrid(index, 'qty', e.target.value)} className="w-full p-2 text-center text-sm font-black text-blue-600 bg-blue-50/50 rounded-lg outline-none" /></td>
                                                            <td className="p-2">
                                                                <button onClick={() => setGridRows(gridRows.filter((_, i) => i !== index))} className="p-1 text-slate-300 hover:text-red-500"><MinusCircle size={18}/></button>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* RIGHT SIDE: Dark Sidebar Dashboard */}
                            <div className="w-full lg:w-80 bg-slate-900 p-8 text-white flex flex-col justify-between">
                                <div className="space-y-8">
                                    <div className="text-center">
                                        <Activity size={40} className="text-blue-400 mx-auto mb-2" />
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Order Summary</p>
                                    </div>

                                    <div className="space-y-4">
                                        <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-800">
                                            <label className="text-[9px] font-bold text-slate-500 uppercase block mb-1">Total Weight Load</label>
                                            <div className="flex items-baseline gap-2">
                                                <span className="text-3xl font-black text-emerald-400">{totalQty.toFixed(2)}</span>
                                                <span className="text-xs font-bold text-slate-500">KGs</span>
                                            </div>
                                        </div>

                                        <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-800">
                                            <label className="text-[9px] font-bold text-slate-500 uppercase block mb-1">Active SKUs</label>
                                            <div className="flex items-center gap-2">
                                                <Package size={14} className="text-blue-400" />
                                                <span className="text-xl font-bold">{gridRows.filter(r => r.product_id).length} Products</span>
                                            </div>
                                        </div>

                                        <div className="bg-blue-500/10 p-4 rounded-xl border border-blue-500/20 flex gap-3">
                                            <Info size={16} className="text-blue-400 shrink-0" />
                                            <p className="text-[9px] leading-tight text-slate-400">
                                                This sales confirmation acts as a booking log. Final billing will be calculated at the time of invoicing.
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className={`p-6 rounded-2xl text-center border mt-8 ${formData.is_cancelled ? 'bg-red-500/10 border-red-500/30' : 'bg-emerald-500/10 border-emerald-500/30'}`}>
                                    <p className="text-[10px] font-black uppercase tracking-widest mb-1 opacity-50">Current Status</p>
                                    <h3 className={`text-xl font-black ${formData.is_cancelled ? 'text-red-500' : 'text-emerald-500'}`}>
                                        {formData.is_cancelled ? 'VOID' : 'ACTIVE'}
                                    </h3>
                                </div>
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="p-6 bg-slate-50 border-t flex justify-end items-center gap-4">
                            <button onClick={() => setIsModalOpen(false)} className="px-8 py-3 font-bold text-slate-400 hover:text-slate-600 text-xs tracking-widest uppercase transition-colors">Discard</button>
                            <button onClick={handleSave} disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white px-10 py-3 rounded-xl font-black shadow-xl flex items-center gap-2 active:scale-95 transition-all text-xs tracking-widest uppercase">
                                <Save size={18}/> {loading ? 'SAVING...' : 'FINALIZE & POST'}
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

export default SalesWithOrder;