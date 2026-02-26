import React, { useState, useEffect, useMemo } from 'react';
import { mastersAPI, transactionsAPI } from '../service/api';
import { 
    Save, Plus, Trash2, X, Search, ShoppingCart, 
    PlusCircle, MinusCircle, MapPin, ClipboardList, 
    RefreshCw, Edit, Square, CheckSquare, Package, 
    User, Calendar, Briefcase, Activity, Filter, 
    Lock, Database, Info, Percent, ChevronLeft, ChevronRight
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
    const [orders, setOrders] = useState([]);
    const [formData, setFormData] = useState(emptyHeader);
    const [gridRows, setGridRows] = useState([]);
    const [loading, setLoading] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [activeTab, setActiveTab] = useState("head");

    // Master Data
    const [parties, setParties] = useState([]);
    const [brokers, setBrokers] = useState([]);
    const [products, setProducts] = useState([]);

    // Filtering & Pagination
    const [searchValue, setSearchValue] = useState("");
    const [searchField, setSearchField] = useState('order_no');
    const [searchCondition, setSearchCondition] = useState('Like');
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
            setOrders(res.data.data || []);
        } catch (err) { console.error("Error fetching orders", err); }
        finally { setLoading(false); }
    };

    // --- Calculated Totals ---
    const totalQty = gridRows.reduce((sum, row) => sum + (parseFloat(row.qty) || 0), 0);
    const totalPacks = gridRows.reduce((sum, row) => sum + (parseInt(row.packs) || 0), 0);

    // --- Action Handlers ---
    const handleAddNew = () => {
        const maxNo = orders.reduce((max, obj) => {
            const num = parseInt(obj.order_no);
            return !isNaN(num) && num > max ? num : max;
        }, 0);

        setFormData({ ...emptyHeader, order_no: String(maxNo + 1) });
        setGridRows([{ ...emptyRow }]);
        setActiveTab("head");
        setIsModalOpen(true);
    };

    const handleEditOrder = (order) => {
        if (isSelectionMode) {
            setSelectedIds(prev => prev.includes(order.id) ? prev.filter(i => i !== order.id) : [...prev, order.id]);
            return;
        }
        setFormData({ ...order });
        setGridRows(order.OrderDetails?.length > 0 ? order.OrderDetails : [{ ...emptyRow }]);
        setActiveTab("head");
        setIsModalOpen(true);
    };

    const updateGrid = (index, field, value) => {
        const updated = [...gridRows];
        
        if (field === 'product_id') {
            const product = products.find(p => p.id === parseInt(value));
            // ONLY Fetch Packing Type. Everything else remains manual.
            updated[index] = {
                ...updated[index],
                product_id: value,
                packing_type: product ? product.packing_type : '',
                // Keep these manual/default
                packs: updated[index].packs || 0,
                rate_cr: updated[index].rate_cr || 0,
                rate_per: updated[index].rate_per || 'Kg',
                qty: updated[index].qty || 0
            };
        } else {
            updated[index][field] = value;
        }
        
        setGridRows(updated);
    };

    const handleSave = async () => {
        if (!formData.party_id) return alert("Please select a Consignee Party");
        const validDetails = gridRows.filter(r => r.product_id !== '');
        if (validDetails.length === 0) return alert("Please add at least one SKU to the grid");

        setLoading(true);
        try {
            // Using OrderDetails as key for Sequelize nested mapping
            const payload = { ...formData, OrderDetails: validDetails };
            if (formData.id) await transactionsAPI.orders.update(formData.id, payload);
            else await transactionsAPI.orders.create(payload);
            setIsModalOpen(false);
            fetchOrders();
            alert("Booking Successfully Recorded");
        } catch (err) { alert("Save Error: Check Registry Logs"); }
        finally { setLoading(false); }
    };

    // --- Search Logic ---
    const filteredOrders = useMemo(() => {
        let result = Array.isArray(orders) ? [...orders] : [];
        if (searchValue.trim()) {
            result = result.filter(item => {
                let val = searchField === 'party_name' ? item.Party?.account_name || "" : String(item[searchField] || "");
                const term = searchValue.toLowerCase().trim();
                return searchCondition === 'Equal' ? val.toLowerCase() === term : val.toLowerCase().includes(term);
            });
        }
        return result.sort((a, b) => b.id - a.id);
    }, [orders, searchValue, searchField, searchCondition]);

    const currentItems = filteredOrders.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
    const totalPages = Math.ceil(filteredOrders.length / itemsPerPage) || 1;

    return (
        <div className="min-h-screen bg-slate-50 p-8 font-sans text-slate-900">
            {/* 1. TOP HEADER */}
            <div className="flex justify-between items-end mb-8">
                <div>
                    <h1 className="text-3xl font-black text-slate-800 flex items-center gap-3">
                        <ShoppingCart className="text-blue-600" size={36}/> SALES ORDER DESK
                    </h1>
                    <p className="text-slate-500 font-medium">Customer Booking Confirmation & Supply Chain Registry</p>
                </div>
                <div className="flex gap-3">
                    <button onClick={handleAddNew} className="bg-slate-900 text-white px-10 py-4 rounded-3xl font-black flex items-center gap-2 hover:bg-blue-600 transition-all shadow-2xl active:scale-95 text-xs uppercase tracking-widest">
                        <Plus size={20}/> New Booking
                    </button>
                    <button onClick={fetchOrders} className="p-4 bg-white border border-slate-200 rounded-3xl shadow-sm hover:bg-slate-50">
                        <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
                    </button>
                </div>
            </div>

            {/* 2. REGISTRY SEARCH */}
            <div className="bg-white p-4 rounded-[2rem] border border-slate-200 shadow-sm flex items-center gap-4 mb-8">
                <Search className="text-slate-400 ml-4" size={20}/>
                <input 
                    type="text" 
                    placeholder="Search by Order No or Party Name..." 
                    className="flex-1 bg-transparent outline-none font-bold text-sm" 
                    value={searchValue} 
                    onChange={e => setSearchValue(e.target.value)} 
                />
                <div className="bg-blue-50 text-blue-600 px-6 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest">Matches: {filteredOrders.length}</div>
            </div>

            {/* 3. REGISTRY TABLE */}
            <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-xl overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-slate-900 text-white text-[10px] font-black uppercase tracking-[0.2em]">
                        <tr>
                            <th className="px-10 py-6">Order No</th>
                            <th className="px-6 py-6">Booking Date</th>
                            <th className="px-6 py-6">Customer / Consignee</th>
                            <th className="px-6 py-6">Place</th>
                            <th className="px-6 py-6 text-right">Status</th>
                            <th className="px-10 py-6 text-center">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {currentItems.map((item) => (
                            <tr key={item.id} onClick={() => handleEditOrder(item)} className="hover:bg-blue-50/30 transition-colors cursor-pointer group">
                                <td className="px-10 py-6 font-mono font-black text-blue-600">#{item.order_no}</td>
                                <td className="px-6 py-6 text-sm text-slate-500 font-bold">{item.date}</td>
                                <td className="px-6 py-6 text-sm font-black text-slate-800 uppercase tracking-tight">{item.Party?.account_name}</td>
                                <td className="px-6 py-6 text-sm font-bold text-slate-400 uppercase">{item.place}</td>
                                <td className="px-6 py-6 text-right">
                                    <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest ${item.is_cancelled ? 'bg-red-100 text-red-600 border border-red-200' : 'bg-emerald-100 text-emerald-600 border border-emerald-200'}`}>
                                        {item.is_cancelled ? 'Cancelled' : 'Open'}
                                    </span>
                                </td>
                                <td className="px-10 py-6 text-center">
                                    <div className="flex justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                        <div className="p-2 bg-white border rounded-xl text-blue-600 shadow-sm"><Edit size={16}/></div>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {/* Pagination */}
                <div className="p-8 bg-slate-50 border-t flex justify-between items-center">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Mill Logistics OS v2.0</span>
                    <div className="flex gap-2">
                        <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} className="p-3 bg-white border rounded-xl hover:bg-blue-50 disabled:opacity-30"><ChevronLeft size={18}/></button>
                        <div className="px-6 flex items-center font-black text-xs">PAGE {currentPage} OF {totalPages}</div>
                        <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)} className="p-3 bg-white border rounded-xl hover:bg-blue-50 disabled:opacity-30"><ChevronRight size={18}/></button>
                    </div>
                </div>
            </div>

            {/* 4. BOOKING MODAL */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 backdrop-blur-lg p-4">
                    <div className="bg-white rounded-[4rem] shadow-2xl w-full max-w-7xl overflow-hidden flex flex-col h-[92vh] animate-in fade-in zoom-in duration-300">
                        
                        {/* Modal Header */}
                        <div className="bg-slate-900 p-8 flex justify-between items-center text-white shrink-0">
                            <div className="flex items-center gap-6">
                                <div className="p-4 bg-blue-600 rounded-[1.5rem] shadow-xl shadow-blue-500/20"><ClipboardList size={28}/></div>
                                <div>
                                    <h2 className="font-black uppercase text-xl tracking-tight">Booking Cockpit</h2>
                                    <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.3em]">Transaction Link: #{formData.order_no}</p>
                                </div>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="text-slate-500 hover:text-white p-2 transition-all"><X size={40}/></button>
                        </div>

                        {/* Modal Tabs */}
                        <div className="flex bg-slate-50 border-b px-12 shrink-0">
                            {['head', 'detail'].map(tab => (
                                <button key={tab} onClick={() => setActiveTab(tab)} className={`py-6 px-12 text-[11px] font-black uppercase tracking-[0.2em] relative transition-all ${activeTab === tab ? 'text-blue-600 bg-white border-b-4 border-blue-600' : 'text-slate-400 hover:text-slate-600'}`}>
                                    {tab === 'head' ? '01. Order Header' : '02. SKU Grid Itemization'}
                                </button>
                            ))}
                        </div>

                        {/* Modal Body */}
                        <div className="flex-1 overflow-hidden flex flex-col lg:flex-row">
                            <div className="flex-1 overflow-y-auto p-12 bg-white">
                                {activeTab === 'head' ? (
                                    <div className="grid grid-cols-2 gap-12">
                                        <div className="space-y-8">
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-slate-400 uppercase ml-2 tracking-widest flex items-center gap-2">Order Identification <Lock size={12}/></label>
                                                <input value={formData.order_no} readOnly className="w-full bg-slate-50 border border-slate-200 p-4 rounded-[1.5rem] text-[12px] font-black text-blue-600 font-mono shadow-inner" />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-slate-400 uppercase ml-2 tracking-widest">Booking Date</label>
                                                <input type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className="w-full border-2 border-slate-100 p-4 rounded-[1.5rem] text-[12px] font-black text-slate-800 outline-none focus:border-blue-500 transition-all shadow-sm" />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-slate-400 uppercase ml-2 tracking-widest">Customer (Party)</label>
                                                <select value={formData.party_id} onChange={e => setFormData({...formData, party_id: e.target.value})} className="w-full border-2 border-slate-100 p-4 rounded-[1.5rem] text-[12px] font-black text-slate-800 outline-none focus:border-blue-500 transition-all shadow-sm appearance-none cursor-pointer">
                                                    <option value="">-- Choose Consignee --</option>
                                                    {parties.map(p => <option key={p.id} value={p.id}>{p.account_name}</option>)}
                                                </select>
                                            </div>
                                        </div>
                                        <div className="space-y-8">
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-slate-400 uppercase ml-2 tracking-widest">Dispatch To (Place)</label>
                                                <div className="relative">
                                                    <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18}/>
                                                    <input value={formData.place} onChange={e => setFormData({...formData, place: e.target.value.toUpperCase()})} placeholder="CITY / STATE" className="w-full pl-12 border-2 border-slate-100 p-4 rounded-[1.5rem] text-[12px] font-black text-slate-800 outline-none focus:border-blue-500 transition-all shadow-sm" />
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-slate-400 uppercase ml-2 tracking-widest">Assigned Broker</label>
                                                <select value={formData.broker_id} onChange={e => setFormData({...formData, broker_id: e.target.value})} className="w-full border-2 border-slate-100 p-4 rounded-[1.5rem] text-[12px] font-black text-slate-800 outline-none focus:border-blue-500 transition-all shadow-sm appearance-none cursor-pointer">
                                                    <option value="">DIRECT (HOUSE ACCOUNT)</option>
                                                    {brokers.map(b => <option key={b.id} value={b.id}>{b.broker_name}</option>)}
                                                </select>
                                            </div>
                                            <div className="pt-6 border-t flex items-center justify-between">
                                                <label className="flex items-center gap-4 cursor-pointer group">
                                                    <input type="checkbox" className="w-6 h-6 accent-red-600 rounded-full transition-all group-hover:scale-110" checked={formData.is_cancelled} onChange={e => setFormData({...formData, is_cancelled: e.target.checked})} />
                                                    <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest group-hover:text-red-500">Void/Cancel Order</span>
                                                </label>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="bg-white rounded-[2rem] border border-slate-200 shadow-xl overflow-hidden">
                                        <table className="w-full">
                                            <thead className="bg-slate-900 text-white text-[9px] font-black uppercase tracking-[0.2em]">
                                                <tr>
                                                    <th className="p-6 text-left">SKU Product Selection</th>
                                                    <th className="p-6 text-center w-32">Type</th>
                                                    <th className="p-6 text-center w-28">Packs</th>
                                                    <th className="p-6 text-center w-32">Rate (CR)</th>
                                                    <th className="p-6 text-center w-28">Per</th>
                                                    <th className="p-6 text-center w-32">Qty (KGs)</th>
                                                    <th className="p-6 w-16 sticky right-0 bg-slate-900"></th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100 font-mono">
                                                {gridRows.map((row, idx) => (
                                                    <tr key={idx} className="hover:bg-blue-50/20 transition-colors group">
                                                        <td className="p-4">
                                                            <select value={row.product_id} onChange={e => updateGrid(idx, 'product_id', e.target.value)} className="w-full p-2.5 bg-transparent text-[11px] font-black uppercase outline-none text-blue-600 cursor-pointer">
                                                                <option value="">-- Choose Item --</option>
                                                                {products.map(p => <option key={p.id} value={p.id}>{p.product_name}</option>)}
                                                            </select>
                                                        </td>
                                                        <td className="p-4 text-center">
                                                            <input readOnly value={row.packing_type} className="w-full text-center text-[10px] font-black text-slate-400 bg-transparent uppercase outline-none" placeholder="FETCHED" />
                                                        </td>
                                                        <td className="p-4">
                                                            <input type="number" placeholder="NOS" value={row.packs} onChange={e => updateGrid(idx, 'packs', e.target.value)} className="w-full p-2.5 text-center text-[11px] font-bold bg-slate-50 rounded-xl border border-transparent focus:border-blue-200 outline-none" />
                                                        </td>
                                                        <td className="p-4">
                                                            <input type="number" placeholder="0.00" value={row.rate_cr} onChange={e => updateGrid(idx, 'rate_cr', e.target.value)} className="w-full p-2.5 text-center text-[11px] font-black text-blue-700 outline-none border-b border-transparent focus:border-blue-600" />
                                                        </td>
                                                        <td className="p-4">
                                                            <input type="text" placeholder="Kg" value={row.rate_per} onChange={e => updateGrid(idx, 'rate_per', e.target.value)} className="w-full p-2.5 text-center text-[11px] font-bold uppercase outline-none" />
                                                        </td>
                                                        <td className="p-4">
                                                            <input type="number" placeholder="0.00" value={row.qty} onChange={e => updateGrid(idx, 'qty', e.target.value)} className="w-full p-2.5 text-center text-[14px] font-black text-emerald-700 outline-none border-b border-transparent focus:border-emerald-600" />
                                                        </td>
                                                        <td className="p-4 text-center sticky right-0 bg-white">
                                                            <button onClick={() => setGridRows(gridRows.filter((_, i) => i !== idx))} className="text-red-200 hover:text-red-500 transition-all active:scale-90"><MinusCircle size={22}/></button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                        <button onClick={() => setGridRows([...gridRows, { ...emptyRow }])} className="w-full p-6 bg-slate-50 text-blue-600 text-[10px] font-black uppercase tracking-[0.4em] hover:bg-blue-600 hover:text-white transition-all">+ Append Booking Row</button>
                                    </div>
                                )}
                            </div>

                            {/* Aggregates Dashboard */}
                            <div className="w-full lg:w-[450px] bg-slate-900 p-12 flex flex-col justify-between shrink-0">
                                <div className="space-y-12">
                                    <div className="text-center">
                                        <Activity size={48} className="text-blue-500 mx-auto mb-4" />
                                        <h3 className="text-[12px] font-black uppercase tracking-[0.4em] text-white">Registry Metrics</h3>
                                    </div>
                                    <div className="space-y-6">
                                        <div className="bg-white/5 p-8 rounded-[2.5rem] border border-white/5 shadow-2xl relative overflow-hidden group">
                                            <Database size={80} className="absolute -right-5 -bottom-5 text-white/5 group-hover:scale-110 transition-transform duration-500" />
                                            <label className="text-[10px] font-black text-slate-500 uppercase block mb-4 tracking-widest">Aggregate Weight</label>
                                            <div className="flex items-baseline gap-3 relative z-10">
                                                <span className="text-5xl font-black text-emerald-400 font-mono tracking-tighter">{totalQty.toFixed(2)}</span>
                                                <span className="text-[12px] font-black text-slate-500 uppercase">KGs</span>
                                            </div>
                                        </div>
                                        <div className="bg-white/5 p-8 rounded-[2.5rem] border border-white/5 shadow-2xl relative overflow-hidden group">
                                            <Package size={80} className="absolute -right-5 -bottom-5 text-white/5 group-hover:scale-110 transition-transform duration-500" />
                                            <label className="text-[10px] font-black text-slate-500 uppercase block mb-4 tracking-widest">Total Pack Units</label>
                                            <div className="flex items-baseline gap-3 relative z-10">
                                                <span className="text-5xl font-black text-amber-400 font-mono tracking-tighter">{totalPacks}</span>
                                                <span className="text-[12px] font-black text-slate-500 uppercase">Units</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className={`p-6 rounded-2xl text-center font-black text-[11px] uppercase tracking-[0.3em] border transition-all ${formData.is_cancelled ? 'bg-red-500/10 border-red-500/20 text-red-500' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500'}`}>
                                    ORDER STATE: {formData.is_cancelled ? 'VOID' : 'OPEN'}
                                </div>
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="p-10 bg-slate-50 border-t flex justify-end gap-5 shrink-0">
                            <button onClick={() => setIsModalOpen(false)} className="px-12 py-5 text-slate-400 font-black uppercase text-[11px] tracking-widest hover:text-slate-600 transition-colors">Discard</button>
                            <button onClick={handleSave} disabled={loading} className="bg-slate-900 text-white px-20 py-6 rounded-2xl font-black text-[14px] uppercase tracking-[0.3em] shadow-2xl hover:bg-blue-600 transition-all flex items-center gap-4 active:scale-95 disabled:opacity-50">
                                <Save size={24}/> {loading ? 'DEPLOYING...' : 'FINALIZE & SAVE'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            
            <style jsx>{`
                input[type='number']::-webkit-inner-spin-button, 
                input[type='number']::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
                ::-webkit-scrollbar { width: 8px; height: 8px; }
                ::-webkit-scrollbar-track { background: #f1f5f9; border-radius: 10px; }
                ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
                ::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
            `}</style>
        </div>
    );
};

export default SalesWithOrder;