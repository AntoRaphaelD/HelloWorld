import React, { useState, useEffect, useMemo } from 'react';
import { mastersAPI, transactionsAPI } from '../service/api';
import { 
    Save, Plus, Trash2, X, Search, ShoppingCart, 
    PlusCircle, MinusCircle, ChevronRight, Calendar, 
    MapPin, User, Hash, ClipboardList, Info, CheckCircle, 
    Clock, AlertTriangle, LayoutGrid, ChevronLeft, Edit,
    Square, CheckSquare, RefreshCw, Filter
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
        is_with_order: true, 
        status: 'OPEN'
    };

    // --- Main States ---
    const [orders, setOrders] = useState([]);
    const [formData, setFormData] = useState(emptyHeader);
    const [gridRows, setGridRows] = useState([{ product_id: '', rate_cr: 0, rate_imm: 0, rate_per: 0, qty: 0, bag_wt: 0 }]);
    const [loading, setLoading] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [activeTab, setActiveTab] = useState("head");

    // Master Data
    const [parties, setParties] = useState([]);
    const [brokers, setBrokers] = useState([]);
    const [products, setProducts] = useState([]);

    // --- Search, Sort & Selection States ---
    const [searchValue, setSearchValue] = useState("");
    const [searchField, setSearchField] = useState("order_no");
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
            const data = Array.isArray(res.data) ? res.data : (res.data.data || []);
            setOrders(data.filter(o => o.is_with_order === true));
        } catch (err) { console.error("Error fetching orders", err); }
        finally { setLoading(false); }
    };

    // --- Search & Pagination Logic ---
    const processedData = useMemo(() => {
        let result = [...orders];
        if (searchValue) {
            result = result.filter(item => {
                const val = searchField === 'party_name' 
                    ? String(item.Party?.account_name || '').toLowerCase()
                    : String(item[searchField] || '').toLowerCase();
                return val.includes(searchValue.toLowerCase());
            });
        }
        return result.sort((a, b) => b.id - a.id);
    }, [orders, searchValue, searchField]);

    const currentItems = processedData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
    const totalPages = Math.ceil(processedData.length / itemsPerPage) || 1;

    // --- Action Handlers ---
    const handleAddNew = () => {
        const nextId = orders.length > 0 ? Math.max(...orders.map(o => o.id)) + 1 : 1;
        setFormData({ ...emptyHeader, order_no: `${nextId}` });
        setGridRows([{ product_id: '', rate_cr: 0, rate_imm: 0, rate_per: 0, qty: 0, bag_wt: 0 }]);
        setActiveTab("head");
        setIsModalOpen(true);
    };

    const handleEditOrder = (order) => {
        if (isSelectionMode) {
            setSelectedIds(prev => prev.includes(order.id) ? prev.filter(i => i !== order.id) : [...prev, order.id]);
            return;
        }
        setFormData({ ...order });
        setGridRows(order.OrderDetails?.length > 0 ? order.OrderDetails : [{ product_id: '', rate_cr: 0, rate_imm: 0, rate_per: 0, qty: 0, bag_wt: 0 }]);
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
        } catch (err) { alert("Error saving order: " + err.message); }
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

    // --- Grid Helpers ---
    const updateGrid = (index, field, value) => {
        const updated = [...gridRows];
        updated[index][field] = value;
        setGridRows(updated);
    };
    const totalQty = gridRows.reduce((sum, row) => sum + (parseFloat(row.qty) || 0), 0);

    return (
        <div className="min-h-screen bg-[#f8fafc] p-6 font-sans">
            
            {/* 1. TOP HEADER & PRIMARY ACTIONS */}
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
                        <ShoppingCart className="text-indigo-600" /> Sales Order Registry
                    </h1>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Order Processing & Confirmation System</p>
                </div>
                
                <div className="flex gap-2">
                    <button onClick={handleAddNew} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg font-bold shadow-md transition-all active:scale-95">
                        <Plus size={18} /> New Order
                    </button>
                    
                    <button 
                        onClick={() => { setIsSelectionMode(!isSelectionMode); setSelectedIds([]); }}
                        className={`px-6 py-2 border rounded-lg font-bold transition-all ${isSelectionMode ? 'bg-amber-100 border-amber-300 text-amber-700' : 'bg-white border-slate-200 text-indigo-600 hover:bg-slate-50'}`}
                    >
                        {isSelectionMode ? 'Cancel Select' : 'Select'}
                    </button>

                    {isSelectionMode && (
                        <button 
                            onClick={handleBulkDelete}
                            disabled={selectedIds.length === 0}
                            className={`px-6 py-2 border rounded-lg font-bold flex items-center gap-2 transition-all ${selectedIds.length > 0 ? 'bg-red-50 border-red-200 text-red-600 hover:bg-red-100' : 'bg-white border-slate-100 text-slate-300 cursor-not-allowed'}`}
                        >
                            <Trash2 size={18} /> Delete ({selectedIds.length})
                        </button>
                    )}

                    <button onClick={fetchOrders} className="p-2 border rounded-lg bg-white text-slate-400 hover:text-indigo-600 transition-colors">
                        <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                    </button>
                </div>
            </div>

            {/* 2. FILTER BAR */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm mb-6 flex flex-wrap gap-4 items-end">
                <div className="flex-1 min-w-[200px]">
                    <label className="text-[10px] font-black text-slate-400 uppercase mb-1 block ml-1">Search By</label>
                    <div className="flex gap-2">
                        <select value={searchField} onChange={(e) => setSearchField(e.target.value)} className="border border-slate-200 p-2 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500">
                            <option value="order_no">Order No</option>
                            <option value="party_name">Party Name</option>
                            <option value="place">Place</option>
                        </select>
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-2.5 text-slate-400" size={16}/>
                            <input 
                                type="text" 
                                placeholder="Start typing to filter..." 
                                value={searchValue} 
                                onChange={(e) => setSearchValue(e.target.value)} 
                                className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500" 
                            />
                        </div>
                    </div>
                </div>
                <button onClick={() => setSearchValue('')} className="px-4 py-2 text-sm font-bold text-slate-500 hover:bg-slate-100 rounded-lg transition-all">Reset</button>
            </div>

            {/* 3. MAIN DATA TABLE */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-md overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-indigo-600 text-white">
                            <tr>
                                {isSelectionMode && <th className="p-4 w-12 text-center"><Square size={20} className="mx-auto" /></th>}
                                <th className="p-4 text-[10px] font-black uppercase tracking-widest">Order #</th>
                                <th className="p-4 text-[10px] font-black uppercase tracking-widest">Date</th>
                                <th className="p-4 text-[10px] font-black uppercase tracking-widest">Party / Customer</th>
                                <th className="p-4 text-[10px] font-black uppercase tracking-widest">Broker</th>
                                <th className="p-4 text-[10px] font-black uppercase tracking-widest">Destination</th>
                                <th className="p-4 text-[10px] font-black uppercase tracking-widest">Status</th>
                                <th className="p-4 text-[10px] font-black uppercase tracking-widest text-center w-20">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {currentItems.length > 0 ? currentItems.map((item) => (
                                <tr key={item.id} onClick={() => handleEditOrder(item)} className={`transition-colors cursor-pointer ${selectedIds.includes(item.id) ? 'bg-indigo-50' : 'hover:bg-slate-50'}`}>
                                    {isSelectionMode && (
                                        <td className="p-4 text-center">
                                            {selectedIds.includes(item.id) ? <CheckSquare size={20} className="text-indigo-600 mx-auto"/> : <Square size={20} className="text-slate-200 mx-auto"/>}
                                        </td>
                                    )}
                                    <td className="p-4 text-sm font-bold text-slate-800">#{item.order_no}</td>
                                    <td className="p-4 text-sm text-slate-500">{item.date}</td>
                                    <td className="p-4 text-sm font-bold text-slate-700 uppercase">{item.Party?.account_name}</td>
                                    <td className="p-4 text-sm text-slate-500">{item.Broker?.broker_name || 'Direct'}</td>
                                    <td className="p-4 text-sm text-slate-500 font-medium flex items-center gap-1"><MapPin size={12}/> {item.place}</td>
                                    <td className="p-4">
                                        <span className={`text-[9px] px-2 py-1 rounded-full font-black uppercase tracking-tighter ${item.is_cancelled ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-600'}`}>
                                            {item.is_cancelled ? 'Cancelled' : 'Open'}
                                        </span>
                                    </td>
                                    <td className="p-4 text-center">
                                        <button className="p-2 text-slate-300 hover:text-indigo-600 transition-colors"><Edit size={16}/></button>
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan={8} className="p-20 text-center opacity-20">
                                        <ShoppingCart size={48} className="mx-auto mb-2"/>
                                        <p className="font-black uppercase tracking-[0.2em]">No Transactional Records</p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* 4. PAGINATION FOOTER */}
                <div className="p-4 bg-slate-50 border-t flex items-center justify-between">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        Page {currentPage} of {totalPages} ({processedData.length} Total Records)
                    </p>
                    <div className="flex gap-2">
                        <button disabled={currentPage === 1} onClick={() => setCurrentPage(prev => prev - 1)} className="p-2 border rounded-lg bg-white disabled:opacity-30 active:scale-95 transition-all shadow-sm">
                            <ChevronLeft size={18}/>
                        </button>
                        <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(prev => prev + 1)} className="p-2 border rounded-lg bg-white disabled:opacity-30 active:scale-95 transition-all shadow-sm">
                            <ChevronRight size={18}/>
                        </button>
                    </div>
                </div>
            </div>

            {/* 5. FORM MODAL OVERLAY */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-6xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in duration-200">
                        {/* Modal Header */}
                        <div className="bg-indigo-600 p-6 flex justify-between items-center text-white">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-white/20 rounded-xl"><ClipboardList /></div>
                                <div>
                                    <h2 className="font-black uppercase tracking-widest text-xl">{formData.id ? 'Modify Sales Confirmation' : 'New Sales Transaction'}</h2>
                                    <p className="text-[10px] font-bold text-indigo-200 uppercase tracking-[0.3em]">Order #{formData.order_no}</p>
                                </div>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="hover:bg-white/10 p-2 rounded-full transition-colors"><X size={28}/></button>
                        </div>

                        {/* Modal Tabs */}
                        <div className="flex bg-slate-50 border-b px-8">
                            <button onClick={() => setActiveTab('head')} className={`py-4 px-6 text-[10px] font-black uppercase tracking-widest relative ${activeTab === 'head' ? 'text-indigo-600' : 'text-slate-400'}`}>
                                01. General Info {activeTab === 'head' && <div className="absolute bottom-0 left-0 w-full h-1 bg-indigo-600 rounded-t-full"/>}
                            </button>
                            <button onClick={() => setActiveTab('detail')} className={`py-4 px-6 text-[10px] font-black uppercase tracking-widest relative ${activeTab === 'detail' ? 'text-indigo-600' : 'text-slate-400'}`}>
                                02. Item Selection {activeTab === 'detail' && <div className="absolute bottom-0 left-0 w-full h-1 bg-indigo-600 rounded-t-full"/>}
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="flex-1 overflow-y-auto p-8">
                            {activeTab === 'head' ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="space-y-6 bg-slate-50/50 p-6 rounded-2xl border border-slate-100">
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Order Date</label>
                                            <input type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className="w-full p-3 bg-white border border-slate-200 rounded-xl font-bold outline-none focus:ring-2 focus:ring-indigo-500" />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Party / Customer Selection</label>
                                            <select value={formData.party_id} onChange={e => setFormData({...formData, party_id: e.target.value})} className="w-full p-3 bg-white border border-slate-200 rounded-xl font-bold outline-none focus:ring-2 focus:ring-indigo-500 appearance-none">
                                                <option value="">-- Choose Customer --</option>
                                                {parties.map(p => <option key={p.id} value={p.id}>{p.account_name}</option>)}
                                            </select>
                                        </div>
                                    </div>
                                    <div className="space-y-6 bg-slate-50/50 p-6 rounded-2xl border border-slate-100">
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Destination Place</label>
                                            <input value={formData.place} onChange={e => setFormData({...formData, place: e.target.value})} placeholder="City, State" className="w-full p-3 bg-white border border-slate-200 rounded-xl font-bold outline-none focus:ring-2 focus:ring-indigo-500" />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Assigned Broker</label>
                                            <select value={formData.broker_id} onChange={e => setFormData({...formData, broker_id: e.target.value})} className="w-full p-3 bg-white border border-slate-200 rounded-xl font-bold outline-none focus:ring-2 focus:ring-indigo-500 appearance-none">
                                                <option value="">Direct (No Broker)</option>
                                                {brokers.map(b => <option key={b.id} value={b.id}>{b.broker_name}</option>)}
                                            </select>
                                        </div>
                                        <label className="flex items-center gap-3 pt-4 border-t cursor-pointer">
                                            <input type="checkbox" className="w-5 h-5 accent-red-600" checked={formData.is_cancelled} onChange={e => setFormData({...formData, is_cancelled: e.target.checked})} />
                                            <span className="text-xs font-black text-slate-500 uppercase tracking-widest">Mark Order as Cancelled</span>
                                        </label>
                                    </div>
                                </div>
                            ) : (
                                <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-inner">
                                    <table className="w-full border-collapse">
                                        <thead className="bg-slate-800 text-white text-[9px] uppercase font-black">
                                            <tr>
                                                <th className="p-4 text-left">SKU Product</th>
                                                <th className="p-4 text-center">Rate (CR)</th>
                                                <th className="p-4 text-center">Rate (IMM)</th>
                                                <th className="p-4 text-center">Qty</th>
                                                <th className="p-4 text-center w-12"></th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {gridRows.map((row, index) => (
                                                <tr key={index} className="border-b border-slate-100 hover:bg-slate-50">
                                                    <td className="p-2">
                                                        <select value={row.product_id} onChange={e => updateGrid(index, 'product_id', e.target.value)} className="w-full p-2 bg-transparent text-sm font-bold outline-none">
                                                            <option value="">Select SKU</option>
                                                            {products.map(p => <option key={p.id} value={p.id}>{p.product_name}</option>)}
                                                        </select>
                                                    </td>
                                                    <td className="p-2"><input type="number" value={row.rate_cr} onChange={e => updateGrid(index, 'rate_cr', e.target.value)} className="w-full p-2 text-center text-sm font-bold bg-transparent outline-none" /></td>
                                                    <td className="p-2"><input type="number" value={row.rate_imm} onChange={e => updateGrid(index, 'rate_imm', e.target.value)} className="w-full p-2 text-center text-sm font-bold bg-transparent outline-none" /></td>
                                                    <td className="p-2"><input type="number" value={row.qty} onChange={e => updateGrid(index, 'qty', e.target.value)} className="w-full p-2 text-center text-sm font-black text-indigo-600 bg-indigo-50/50 rounded-lg outline-none" /></td>
                                                    <td className="p-2">
                                                        <button onClick={() => setGridRows(gridRows.filter((_, i) => i !== index))} className="p-2 text-slate-300 hover:text-red-500"><MinusCircle size={18}/></button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                    <button onClick={() => setGridRows([...gridRows, { product_id: '', rate_cr: 0, rate_imm: 0, rate_per: 0, qty: 0, bag_wt: 0 }])} className="w-full p-4 bg-slate-50 text-indigo-600 font-black text-[10px] uppercase tracking-widest flex justify-center items-center gap-2 hover:bg-slate-100 transition-all">
                                        <PlusCircle size={16}/> Append Item Row
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Modal Footer */}
                        <div className="p-6 bg-slate-50 border-t flex justify-between items-center">
                            <div className="flex gap-10">
                                <div>
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Calculated Load</p>
                                    <p className="text-xl font-black text-slate-800">{totalQty.toFixed(2)} <span className="text-[10px] text-slate-400">UNIT</span></p>
                                </div>
                                <div>
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Active SKUs</p>
                                    <p className="text-xl font-black text-indigo-600">{gridRows.filter(r => r.product_id).length}</p>
                                </div>
                            </div>
                            <div className="flex gap-4">
                                <button onClick={() => setIsModalOpen(false)} className="px-8 py-3 font-bold text-slate-400 hover:text-slate-600 text-xs tracking-widest uppercase">Discard</button>
                                <button onClick={handleSave} disabled={loading} className="bg-indigo-600 hover:bg-indigo-700 text-white px-10 py-3 rounded-2xl font-black shadow-xl shadow-indigo-100 flex items-center gap-2 active:scale-95 transition-all text-xs tracking-widest">
                                    <Save size={18}/> {loading ? 'SAVING...' : 'FINALIZE ORDER'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <style jsx>{`
                ::-webkit-scrollbar { width: 5px; height: 5px; }
                ::-webkit-scrollbar-track { background: transparent; }
                ::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
                ::-webkit-scrollbar-thumb:hover { background: #cbd5e1; }
            `}</style>
        </div>
    );
};

export default SalesWithOrder;