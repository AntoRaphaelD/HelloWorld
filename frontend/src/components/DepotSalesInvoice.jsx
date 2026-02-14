import React, { useState, useEffect, useMemo } from 'react';
import { mastersAPI, transactionsAPI } from '../service/api';
import { 
    Save, FileText, ShoppingBag, Percent, 
    Warehouse, Users, Link, Calculator, 
    ArrowRightCircle, History, Search, ChevronRight,
    Truck, BadgePercent, Plus, Trash2, X, RefreshCw,
    ChevronLeft, Square, CheckSquare, Edit, MapPin, Package
} from 'lucide-react';

const DepotSalesInvoice = () => {
    // --- Initial States ---
    const emptyInvoice = { 
        id: null,
        invoice_no: '', 
        date: new Date().toISOString().split('T')[0], 
        depot_id: '', 
        party_id: '', 
        assessable_value: 0, 
        charity: 0, 
        gst: 0, 
        freight: 0,
        final_value: 0
    };

    // --- Main States ---
    const [list, setList] = useState([]);
    const [formData, setFormData] = useState(emptyInvoice);
    const [gridRows, setGridRows] = useState([{ product_id: '', qty: 0, rate: 0, amount: 0 }]);
    const [loading, setLoading] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [activeTab, setActiveTab] = useState('head');

    // --- Master Data ---
    const [depots, setDepots] = useState([]);
    const [parties, setParties] = useState([]);
    const [orders, setOrders] = useState([]);
    const [products, setProducts] = useState([]);

    // --- Search, Sort & Selection ---
    const [isSelectionMode, setIsSelectionMode] = useState(false);
    const [selectedIds, setSelectedIds] = useState([]);
    const [searchField, setSearchField] = useState('invoice_no');
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
            const [dep, par, ord, pro] = await Promise.all([
                mastersAPI.accounts.getAll({ account_group: 'Depot' }),
                mastersAPI.accounts.getAll(),
                transactionsAPI.orders.getAll({ status: 'OPEN' }),
                mastersAPI.products.getAll()
            ]);
            setDepots(dep.data.data || dep.data || []);
            setParties(par.data.data || par.data || []);
            setOrders(ord.data.data || ord.data || []);
            setProducts(pro.data.data || pro.data || []);
        } catch (err) { console.error("Master Data Error", err); }
    };

    const fetchRecords = async () => {
        setLoading(true);
        try {
            const res = await transactionsAPI.invoices.getAll({ type: 'Depot' });
            const data = Array.isArray(res.data) ? res.data : (res.data.data || []);
            setList(data);
        } catch (err) { console.error("Fetch Error", err); }
        finally { setLoading(false); }
    };

    // --- Logic: Search & Pagination ---
    const processedData = useMemo(() => {
        let result = [...list];
        if (searchValue) {
            result = result.filter(item => {
                const val = searchField === 'party_name' 
                    ? String(item.Party?.account_name || '').toLowerCase()
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
        const nextId = list.length > 0 ? Math.max(...list.map(o => o.id)) + 1 : 1;
        setFormData({ ...emptyInvoice, invoice_no: nextId.toString() });
        setGridRows([{ product_id: '', qty: 0, rate: 0, amount: 0 }]);
        setActiveTab('head');
        setIsModalOpen(true);
    };

    const handleRowClick = (item) => {
        if (isSelectionMode) {
            setSelectedIds(prev => prev.includes(item.id) ? prev.filter(i => i !== item.id) : [...prev, item.id]);
            return;
        }
        setFormData(item);
        setGridRows(item.InvoiceDetails || [{ product_id: '', qty: 0, rate: 0, amount: 0 }]);
        setIsModalOpen(true);
    };

    const handleOrderSync = (orderId) => {
        const order = orders.find(o => o.id === parseInt(orderId));
        if (order) {
            setFormData(prev => ({ ...prev, party_id: order.party_id }));
            if (order.OrderDetails) {
                const newRows = order.OrderDetails.map(d => ({
                    product_id: d.product_id,
                    qty: d.qty,
                    rate: d.rate_cr,
                    amount: (d.qty * d.rate_cr)
                }));
                setGridRows(newRows);
                calculateMath(newRows, formData.freight);
            }
            setActiveTab('detail');
        }
    };

    const updateGrid = (index, field, value) => {
        const updated = [...gridRows];
        updated[index][field] = value;
        if (field === 'qty' || field === 'rate') {
            updated[index].amount = (parseFloat(updated[index].qty) || 0) * (parseFloat(updated[index].rate) || 0);
        }
        setGridRows(updated);
        calculateMath(updated, formData.freight);
    };

    const calculateMath = (rows, freightVal) => {
        const assessable = rows.reduce((sum, r) => sum + (parseFloat(r.amount) || 0), 0);
        const freight = parseFloat(freightVal) || 0;
        const gst = assessable * 0.05; // Mock 5% GST
        setFormData(prev => ({
            ...prev,
            assessable_value: assessable.toFixed(2),
            gst: gst.toFixed(2),
            freight: freight,
            final_value: (assessable + gst + freight).toFixed(2)
        }));
    };

    const handleSave = async () => {
        if (!formData.depot_id || !formData.party_id) return alert("Source and Destination required");
        setLoading(true);
        try {
            if (formData.id) await transactionsAPI.invoices.update(formData.id, { ...formData, Details: gridRows, invoice_type: 'Depot' });
            else await transactionsAPI.invoices.create({ ...formData, Details: gridRows, invoice_type: 'Depot' });
            setIsModalOpen(false);
            fetchRecords();
        } catch (err) { alert("Save failed"); }
        finally { setLoading(false); }
    };

    return (
        <div className="min-h-screen bg-[#f8fafc] p-6 font-sans">
            
            {/* 1. TOP HEADER */}
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
                        <Warehouse className="text-amber-500" size={32} /> Depot Sales Registry
                    </h1>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Secondary Distribution & Depot Ledger Management</p>
                </div>
                
                <div className="flex gap-2">
                    <button onClick={handleAddNew} className="flex items-center gap-2 bg-slate-900 hover:bg-black text-amber-500 px-6 py-2 rounded-lg font-bold shadow-md transition-all active:scale-95">
                        <Plus size={18} /> New Depot Invoice
                    </button>
                    
                    <button 
                        onClick={() => { setIsSelectionMode(!isSelectionMode); setSelectedIds([]); }}
                        className={`px-6 py-2 border rounded-lg font-bold transition-all ${isSelectionMode ? 'bg-amber-100 border-amber-300 text-amber-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                    >
                        {isSelectionMode ? 'Cancel' : 'Select'}
                    </button>

                    <button onClick={fetchRecords} className="p-2 border rounded-lg bg-white text-slate-400 hover:text-amber-600 transition-colors">
                        <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                    </button>
                </div>
            </div>

            {/* 2. SEARCH BAR */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm mb-6 flex flex-wrap gap-4 items-end">
                <div className="flex-1 min-w-[200px]">
                    <label className="text-[10px] font-black text-slate-400 uppercase mb-1 block ml-1">Search Registry</label>
                    <div className="flex gap-2">
                        <select value={searchField} onChange={(e) => setSearchField(e.target.value)} className="border border-slate-200 p-2.5 rounded-lg text-sm outline-none focus:ring-2 focus:ring-amber-500">
                            <option value="invoice_no">Invoice No</option>
                            <option value="party_name">Party Name</option>
                        </select>
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-3 text-slate-400" size={16}/>
                            <input type="text" placeholder="Search depot transactions..." value={searchValue} onChange={(e) => setSearchValue(e.target.value)} className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-amber-500" />
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
                                <th className="p-4 text-[10px] font-black uppercase tracking-[0.2em]">Inv #</th>
                                <th className="p-4 text-[10px] font-black uppercase tracking-[0.2em]">Date</th>
                                <th className="p-4 text-[10px] font-black uppercase tracking-[0.2em]">Source Depot</th>
                                <th className="p-4 text-[10px] font-black uppercase tracking-[0.2em]">Receiving Party</th>
                                <th className="p-4 text-[10px] font-black uppercase tracking-[0.2em] text-right">Net Value (₹)</th>
                                <th className="p-4 text-[10px] font-black uppercase tracking-[0.2em] text-center w-20">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {currentItems.length > 0 ? currentItems.map((item) => (
                                <tr key={item.id} onClick={() => handleRowClick(item)} className={`transition-colors cursor-pointer ${selectedIds.includes(item.id) ? 'bg-amber-50' : 'hover:bg-slate-50'}`}>
                                    {isSelectionMode && (
                                        <td className="p-4 text-center">
                                            {selectedIds.includes(item.id) ? <CheckSquare size={20} className="text-amber-600 mx-auto"/> : <Square size={20} className="text-slate-200 mx-auto"/>}
                                        </td>
                                    )}
                                    <td className="p-4 text-sm font-bold text-amber-600 font-mono">DEP-{item.invoice_no}</td>
                                    <td className="p-4 text-sm text-slate-500">{item.date}</td>
                                    <td className="p-4 text-sm font-bold text-slate-700 uppercase">{item.Depot?.account_name || 'Main Hub'}</td>
                                    <td className="p-4 text-sm text-slate-500 font-medium italic"><Users size={12} className="inline mr-1"/> {item.Party?.account_name}</td>
                                    <td className="p-4 text-sm font-black text-right text-slate-900">₹{parseFloat(item.final_value).toLocaleString()}</td>
                                    <td className="p-4 text-center">
                                        <button className="p-2 text-slate-300 hover:text-amber-600 transition-colors"><Edit size={16}/></button>
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan={7} className="p-20 text-center opacity-20">
                                        <Warehouse size={48} className="mx-auto mb-2"/>
                                        <p className="font-black uppercase tracking-widest">No Depot Transactions Found</p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* 4. PAGINATION FOOTER */}
                <div className="p-4 bg-slate-50 border-t flex items-center justify-between">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        Page {currentPage} of {totalPages} ({processedData.length} Records)
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

            {/* 5. PREPARATION MODAL */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-6xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in duration-200">
                        {/* Modal Header */}
                        <div className="bg-slate-900 p-6 flex justify-between items-center text-white">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-amber-500 rounded-xl text-slate-900"><ShoppingBag /></div>
                                <div>
                                    <h2 className="font-black uppercase tracking-widest text-xl">Depot Sales Entry</h2>
                                    <p className="text-[10px] font-bold text-amber-500 uppercase tracking-widest">System Reference: DEP-{formData.invoice_no}</p>
                                </div>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="hover:bg-white/10 p-2 rounded-full transition-colors"><X size={24}/></button>
                        </div>

                        {/* Modal Tabs */}
                        <div className="flex bg-slate-50 border-b px-8">
                            <button onClick={() => setActiveTab('head')} className={`py-4 px-6 text-[10px] font-black uppercase tracking-widest relative ${activeTab === 'head' ? 'text-amber-600' : 'text-slate-400'}`}>
                                01. Source & Identity {activeTab === 'head' && <div className="absolute bottom-0 left-0 w-full h-1 bg-amber-500 rounded-t-full"/>}
                            </button>
                            <button onClick={() => setActiveTab('detail')} className={`py-4 px-6 text-[10px] font-black uppercase tracking-widest relative ${activeTab === 'detail' ? 'text-amber-600' : 'text-slate-400'}`}>
                                02. Product Grid {activeTab === 'detail' && <div className="absolute bottom-0 left-0 w-full h-1 bg-amber-500 rounded-t-full"/>}
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="flex-1 overflow-y-auto p-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
                            
                            {/* LEFT COLUMN: FORM / GRID */}
                            <div className="lg:col-span-2 space-y-6">
                                {activeTab === 'head' ? (
                                    <div className="space-y-6">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Dispatching Depot (Source)</label>
                                                <select value={formData.depot_id} onChange={e => setFormData({...formData, depot_id: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-amber-500 appearance-none">
                                                    <option value="">-- Choose Depot --</option>
                                                    {depots.map(d => <option key={d.id} value={d.id}>{d.account_name}</option>)}
                                                </select>
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Receiving Party (Destination)</label>
                                                <select value={formData.party_id} onChange={e => setFormData({...formData, party_id: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-amber-500 appearance-none">
                                                    <option value="">-- Choose Party --</option>
                                                    {parties.map(p => <option key={p.id} value={p.id}>{p.account_name}</option>)}
                                                </select>
                                            </div>
                                        </div>

                                        <div className="bg-amber-500 p-6 rounded-3xl text-slate-900 shadow-lg relative overflow-hidden">
                                            <Link size={80} className="absolute right-[-10px] top-[-10px] opacity-10" />
                                            <div className="flex items-center gap-2 mb-4">
                                                <History size={16} />
                                                <span className="text-[10px] font-black uppercase tracking-widest">Order Puller Integration</span>
                                            </div>
                                            <select className="w-full bg-white border-none p-4 rounded-2xl font-bold text-sm outline-none" onChange={(e) => handleOrderSync(e.target.value)}>
                                                <option value="">Pull from Open Sales Confirmation...</option>
                                                {orders.map(o => <option key={o.id} value={o.id}>{o.order_no} | {o.Party?.account_name}</option>)}
                                            </select>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                                        <table className="w-full text-left">
                                            <thead className="bg-slate-800 text-white text-[9px] uppercase font-black">
                                                <tr>
                                                    <th className="p-4">SKU / Product Description</th>
                                                    <th className="p-4 text-center">Quantity</th>
                                                    <th className="p-4 text-center">Rate</th>
                                                    <th className="p-4 text-center">Subtotal</th>
                                                    <th className="p-4 w-12"></th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                                // ... (continuing from the gridRows.map inside the table body)
                                                {gridRows.map((row, index) => (
                                                    <tr key={index} className="hover:bg-amber-50/20 transition-all">
                                                        <td className="p-2">
                                                            <select 
                                                                value={row.product_id} 
                                                                onChange={e => updateGrid(index, 'product_id', e.target.value)} 
                                                                className="w-full p-2 text-xs font-bold outline-none bg-transparent"
                                                            >
                                                                <option value="">Choose SKU...</option>
                                                                {products.map(p => (
                                                                    <option key={p.id} value={p.id}>{p.product_name}</option>
                                                                ))}
                                                            </select>
                                                        </td>
                                                        <td className="p-2">
                                                            <input 
                                                                type="number" 
                                                                value={row.qty} 
                                                                onChange={e => updateGrid(index, 'qty', e.target.value)} 
                                                                className="w-full p-2 text-center text-xs font-bold outline-none"
                                                                placeholder="0"
                                                            />
                                                        </td>
                                                        <td className="p-2">
                                                            <input 
                                                                type="number" 
                                                                value={row.rate} 
                                                                onChange={e => updateGrid(index, 'rate', e.target.value)} 
                                                                className="w-full p-2 text-center text-xs font-black text-amber-600 outline-none"
                                                                placeholder="0.00"
                                                            />
                                                        </td>
                                                        <td className="p-4 text-center text-xs font-black text-slate-700">
                                                            ₹{parseFloat(row.amount || 0).toFixed(2)}
                                                        </td>
                                                        <td className="p-2 text-center">
                                                            <button 
                                                                onClick={() => {
                                                                    if(gridRows.length > 1) setGridRows(gridRows.filter((_, i) => i !== index));
                                                                }} 
                                                                className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                                                            >
                                                                <MinusCircle size={18}/>
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                        <button 
                                            onClick={() => setGridRows([...gridRows, { product_id: '', qty: 0, rate: 0, amount: 0 }])} 
                                            className="w-full p-4 bg-slate-50 text-amber-600 text-[10px] font-black uppercase tracking-widest hover:bg-amber-100 transition-all flex items-center justify-center gap-2"
                                        >
                                            <Plus size={14}/> Add Line Item Row
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* RIGHT COLUMN: FINANCIAL SUMMARY */}
                            <div className="space-y-6">
                                <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white shadow-2xl relative overflow-hidden flex flex-col border border-slate-800">
                                    <div className="absolute top-0 right-0 p-4 opacity-5"><Calculator size={120} /></div>
                                    <h3 className="font-black text-amber-400 text-[10px] uppercase tracking-[0.3em] mb-10 border-b border-white/5 pb-4">Financial Ledger</h3>
                                    
                                    <div className="space-y-6 relative z-10">
                                        <ValueRow label="Assessable Value" value={formData.assessable_value} />
                                        <ValueRow label="Taxation (GST 5%)" value={formData.gst} color="text-amber-400" />
                                        
                                        <div className="space-y-1">
                                            <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Freight Charges</label>
                                            <div className="flex items-center gap-3 bg-white/5 p-3 rounded-xl border border-white/5">
                                                <Truck size={16} className="text-slate-500" />
                                                <input 
                                                    type="number" 
                                                    className="bg-transparent border-none text-xl font-black w-full outline-none font-mono text-white" 
                                                    value={formData.freight}
                                                    onChange={(e) => calculateMath(gridRows, e.target.value)}
                                                    placeholder="0.00" 
                                                />
                                            </div>
                                        </div>

                                        <div className="pt-8 mt-4 border-t border-white/10 text-center">
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Total Payable</span>
                                            <div className="flex items-center justify-center gap-2">
                                                <span className="text-4xl font-black text-white font-mono tracking-tighter">₹ {formData.final_value}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-white border border-slate-200 p-6 rounded-[2rem] flex items-center gap-4 shadow-sm">
                                    <div className="h-10 w-10 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center shrink-0">
                                        <History size={20} />
                                    </div>
                                    <div>
                                        <h4 className="text-[10px] font-black text-slate-900 uppercase">Ledger Sync</h4>
                                        <p className="text-[11px] text-slate-500 font-medium">Secondary distribution entry will auto-update depot inventory.</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="p-6 bg-slate-50 border-t flex justify-end items-center gap-4">
                            <button 
                                onClick={() => setIsModalOpen(false)} 
                                className="px-8 py-3 font-bold text-slate-400 hover:text-slate-600 text-xs tracking-widest uppercase"
                            >
                                Discard
                            </button>
                            <button 
                                onClick={handleSave} 
                                disabled={loading} 
                                className="bg-slate-900 hover:bg-black text-amber-500 px-10 py-3 rounded-xl font-black shadow-lg shadow-amber-500/10 flex items-center gap-2 active:scale-95 transition-all text-xs tracking-widest uppercase"
                            >
                                <Save size={18}/> {loading ? 'POSTING...' : 'POST DEPOT INVOICE'}
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

// Reusable Value Row Component for the Financial Sidebar
const ValueRow = ({ label, value, color = "text-white" }) => (
    <div className="flex justify-between items-center text-xs font-bold">
        <span className="text-slate-500 font-black uppercase tracking-tighter">{label}</span>
        <span className={`${color} font-mono italic`}>₹ {value}</span>
    </div>
);

// Icon component for MinusCircle if not already imported
const MinusCircle = ({ size, className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <circle cx="12" cy="12" r="10"/><line x1="8" y1="12" x2="16" y2="12"/>
    </svg>
);

export default DepotSalesInvoice;