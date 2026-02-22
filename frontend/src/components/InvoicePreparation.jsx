import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useReactToPrint } from 'react-to-print';
import { mastersAPI, transactionsAPI, reportsAPI } from '../service/api';
import TaxInvoiceTemplate from '../print/TaxInvoiceTemplate';

import { 
    Save, FileText, Printer, Search, ChevronRight, 
    ShoppingBag, Landmark, Database, MinusCircle, 
    PlusCircle, Calculator, RefreshCw, Truck, Info,
    CheckCircle2, X, Plus, Trash2, Edit, Square, 
    CheckSquare, ChevronLeft, Calendar, Filter, Hash, MapPin, Activity
} from 'lucide-react';

const InvoicePreparation = () => {
    // --- UI & MODAL STATES ---
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [activeTab, setActiveTab] = useState('head');
    const [loading, setLoading] = useState(false);
    
    // --- DYNAMIC FILTERING STATE ---
    const [searchField, setSearchField] = useState('invoice_no');
    const [searchCondition, setSearchCondition] = useState('Like');
    const [searchValue, setSearchValue] = useState('');
    const [isSelectionMode, setIsSelectionMode] = useState(false);
    const [selectedIds, setSelectedIds] = useState([]);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    // --- DATA STATES ---
    const [listData, setListData] = useState({ 
        types: [], parties: [], transports: [], 
        products: [], orders: [], history: [] 
    });

    // --- FORM STATES ---
    const emptyInvoice = {
        id: null,
        invoice_no: '', 
        date: new Date().toISOString().split('T')[0], 
        sales_type: 'Local',
        party_id: '', 
        transport_id: '', 
        vehicle_no: '', 
        delivery: '',
        remarks: '',
        assessable_value: 0, 
        final_invoice_value: 0
    };
    const [formData, setFormData] = useState(emptyInvoice);
    const [gridRows, setGridRows] = useState([{ product_id: '', packs: 0, total_kgs: 0, rate: 0, available_stock: 0 }]);

    // --- PRINTING LOGIC ---
    const [printData, setPrintData] = useState(null);
    const printRef = useRef();
    const handlePrintAction = useReactToPrint({ 
        contentRef: printRef,
        onAfterPrint: () => setPrintData(null)
    });

    // --- INITIALIZATION ---
    useEffect(() => { fetchInitialData(); }, []);

    const fetchInitialData = async () => {
        setLoading(true);
        try {
            const [invT, acc, tra, pro, ord, his] = await Promise.all([
                mastersAPI.invoiceTypes.getAll().catch(() => ({ data: { data: [] } })),
                mastersAPI.accounts.getAll().catch(() => ({ data: { data: [] } })),
                mastersAPI.transports.getAll().catch(() => ({ data: { data: [] } })),
                mastersAPI.products.getAll().catch(() => ({ data: { data: [] } })),
                transactionsAPI.orders.getAll().catch(() => ({ data: { data: [] } })),
                transactionsAPI.invoices.getAll().catch(() => ({ data: { data: [] } }))
            ]);

            setListData({ 
                types: invT.data?.data || [], 
                parties: acc.data?.data || [], 
                transports: tra.data?.data || [], 
                products: pro.data?.data || [], 
                orders: ord.data?.data || ord.data || [], 
                history: his.data?.data || his.data || [] 
            });
        } catch (error) { 
            console.error("Critical Load error", error); 
        } finally { setLoading(false); }
    };

    // --- Dynamic Filtering Logic ---
    const processedData = useMemo(() => {
        let result = Array.isArray(listData.history) ? [...listData.history] : [];
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
    }, [listData.history, searchValue, searchField, searchCondition]);

    const currentItems = processedData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
    const totalPages = Math.ceil(processedData.length / itemsPerPage) || 1;

    // --- ACTION HANDLERS ---
    const handleAddNew = () => {
        const maxId = listData.history.length > 0 ? Math.max(...listData.history.map(i => i.id)) : 0;
        setFormData({ ...emptyInvoice, invoice_no: (maxId + 1).toString() });
        setGridRows([{ product_id: '', packs: 0, total_kgs: 0, rate: 0, available_stock: 0 }]);
        setActiveTab('head');
        setIsModalOpen(true);
    };

    const handleOrderPull = (orderId) => {
        if (!orderId) return;
        const order = listData.orders.find(o => o.id === parseInt(orderId));
        if (order) {
            setFormData(prev => ({ ...prev, party_id: order.party_id, delivery: order.place }));
            if (order.OrderDetails) {
                const newRows = order.OrderDetails.map(d => ({
                    product_id: d.product_id,
                    packs: d.qty,
                    total_kgs: d.qty,
                    rate: d.rate_cr,
                    available_stock: d.Product?.mill_stock || 0
                }));
                setGridRows(newRows);
                calculateFinalTotals(newRows);
            }
            setActiveTab('detail');
        }
    };

    const updateGrid = (idx, field, val) => {
        const updated = [...gridRows];
        updated[idx][field] = val;
        if (field === 'product_id') {
            const product = listData.products.find(x => x.id === parseInt(val));
            updated[idx].available_stock = product ? product.mill_stock : 0;
        }
        setGridRows(updated);
        calculateFinalTotals(updated);
    };

    const calculateFinalTotals = (rows) => {
        const total = rows.reduce((sum, r) => sum + ((parseFloat(r.total_kgs) || 0) * (parseFloat(r.rate) || 0)), 0);
        setFormData(prev => ({ ...prev, assessable_value: total.toFixed(2), final_invoice_value: total.toFixed(2) }));
    };

    const handleSave = async () => {
        if (!formData.party_id) return alert("Required: Please select a Party");
        setLoading(true);
        try {
            await transactionsAPI.invoices.create({ ...formData, Details: gridRows });
            setIsModalOpen(false);
            fetchInitialData();
        } catch (e) { alert("❌ Save failed"); }
        finally { setLoading(false); }
    };

    const triggerPrint = async (invoiceNo) => {
        setLoading(true);
        try {
            const res = await reportsAPI.getInvoicePrint(invoiceNo.toString());
            if (res.data.success) {
                setPrintData(res.data.data);
                setTimeout(() => { handlePrintAction(); }, 500);
            } else {
                alert("Invoice data not found");
            }
        } catch (err) {
            alert("Print Error: " + err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 p-6 font-sans text-slate-900">
            
            {/* 1. TOP HEADER */}
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <FileText className="text-blue-600" /> Invoice Machine Master
                    </h1>
                    <p className="text-sm text-slate-500">Tax Invoice Preparation and Registry of Dispatched Goods</p>
                </div>
                
                <div className="flex gap-2">
                    <button 
                        onClick={() => { setIsSelectionMode(!isSelectionMode); setSelectedIds([]); }}
                        className={`px-5 py-2 border rounded-lg font-semibold transition-all ${isSelectionMode ? 'bg-amber-100 border-amber-300 text-amber-700' : 'bg-white border-slate-200 text-blue-600 hover:bg-slate-50'}`}
                    >
                        {isSelectionMode ? 'Cancel' : 'Select'}
                    </button>

                    {!isSelectionMode && (
                        <button onClick={handleAddNew} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg font-semibold shadow-sm transition-all active:scale-95">
                            <Plus size={18} /> New Invoice
                        </button>
                    )}

                    <button onClick={fetchInitialData} className="p-2 border border-slate-200 rounded-lg bg-white text-slate-400 hover:text-blue-600 transition-colors">
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
                            <option value="invoice_no">Invoice No</option>
                            <option value="party_name">Customer Name</option>
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
                            <input type="text" placeholder="Search registry..." value={searchValue} onChange={(e) => setSearchValue(e.target.value)} className="w-full border border-slate-200 pl-10 pr-4 py-2 rounded-lg text-sm outline-none focus:ring-1 focus:ring-blue-500 bg-white" />
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={() => setSearchValue('')} className="flex-1 border border-slate-200 py-2 rounded-lg text-sm font-bold hover:bg-slate-50 transition-all">Clear Filters</button>
                        <div className="flex-1 bg-blue-50 text-blue-600 border border-blue-100 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2">
                            <Filter size={14}/> {processedData.length} Matches
                        </div>
                    </div>
                </div>
            </div>

            {/* 3. DATA TABLE */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-blue-600 text-white">
                                {isSelectionMode && (
                                    <th className="p-4 w-12 text-center">
                                        <button onClick={() => setSelectedIds(selectedIds.length === processedData.length ? [] : processedData.map(i => i.id))}>
                                            {selectedIds.length === processedData.length && processedData.length > 0 ? <CheckSquare size={18} /> : <Square size={18} />}
                                        </button>
                                    </th>
                                )}
                                <th className="p-4 text-sm font-semibold uppercase tracking-wider">Inv #</th>
                                <th className="p-4 text-sm font-semibold uppercase tracking-wider">Date</th>
                                <th className="p-4 text-sm font-semibold uppercase tracking-wider">Customer / Ledger</th>
                                <th className="p-4 text-sm font-semibold uppercase tracking-wider">Destination</th>
                                <th className="p-4 text-sm font-semibold uppercase tracking-wider text-right">Value (₹)</th>
                                <th className="p-4 text-sm font-semibold uppercase tracking-wider text-center w-24">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-mono">
                            {currentItems.length > 0 ? currentItems.map((item) => (
                                <tr key={item.id} className={`transition-colors cursor-pointer group ${selectedIds.includes(item.id) ? 'bg-blue-50' : 'hover:bg-blue-50/50'}`}>
                                    {isSelectionMode && (
                                        <td className="p-4 text-center" onClick={() => setSelectedIds(prev => prev.includes(item.id) ? prev.filter(i => i !== item.id) : [...prev, item.id])}>
                                            {selectedIds.includes(item.id) ? <CheckSquare size={18} className="text-blue-600 mx-auto"/> : <Square size={18} className="text-slate-200 mx-auto"/>}
                                        </td>
                                    )}
                                    <td className="p-4 text-sm font-bold text-blue-600">#{item.invoice_no}</td>
                                    <td className="p-4 text-sm text-slate-500 font-sans">{item.date}</td>
                                    <td className="p-4 text-sm font-bold text-slate-700 uppercase font-sans">{item.Party?.account_name}</td>
                                    <td className="p-4 text-sm text-slate-500 italic font-sans truncate max-w-[150px]">
                                        <div className="flex items-center gap-1"><MapPin size={12}/> {item.delivery || 'N/A'}</div>
                                    </td>
                                    <td className="p-4 text-sm font-black text-right text-emerald-600 font-mono">
                                        ₹{parseFloat(item.final_invoice_value).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                    </td>
                                    <td className="p-4 text-center">
                                        <div className="flex justify-center gap-2">
                                            <button onClick={() => triggerPrint(item.invoice_no)} className="p-1.5 text-slate-300 hover:text-blue-600 transition-colors"><Printer size={16}/></button>
                                            <button className="p-1.5 text-slate-300 hover:text-blue-600 transition-colors"><Edit size={16}/></button>
                                        </div>
                                    </td>
                                </tr>
                            )) : (
                                <tr><td colSpan={7} className="p-20 text-center text-slate-400 font-bold uppercase tracking-widest opacity-20 text-xl italic">No Invoices Found</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* 4. PAGINATION FOOTER */}
                <div className="p-4 bg-slate-50 border-t flex items-center justify-between">
                    <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider">
                        Page {currentPage} of {totalPages} ({processedData.length} records)
                    </span>
                    <div className="flex gap-2">
                        <button disabled={currentPage === 1} onClick={() => setCurrentPage(prev => prev - 1)} className="p-2 border rounded bg-white hover:bg-blue-50 disabled:opacity-30 transition-all shadow-sm">
                            <ChevronLeft size={16}/>
                        </button>
                        <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(prev => prev + 1)} className="p-2 border rounded bg-white hover:bg-blue-50 disabled:opacity-30 transition-all shadow-sm">
                            <ChevronRight size={16}/>
                        </button>
                    </div>
                </div>
            </div>

            {/* 5. PREPARATION COCKPIT MODAL */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-6xl overflow-hidden flex flex-col max-h-[95vh] animate-in zoom-in duration-200">
                        {/* Modal Header */}
                        <div className="bg-blue-600 p-4 flex justify-between items-center text-white">
                            <div className="flex items-center gap-4">
                                <div className="p-2 bg-white/20 rounded-lg"><Calculator size={20} /></div>
                                <div>
                                    <h2 className="font-bold uppercase tracking-tight text-lg">Tax Invoice Preparation</h2>
                                    <p className="text-[10px] font-bold text-blue-100 uppercase tracking-widest">Document No: #{formData.invoice_no}</p>
                                </div>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="hover:bg-blue-500 p-1 rounded-full transition-colors"><X size={24}/></button>
                        </div>

                        {/* Navigation Tabs */}
                        <div className="flex bg-slate-50 border-b px-6">
                            <button onClick={() => setActiveTab('head')} className={`py-4 px-6 text-[10px] font-bold uppercase tracking-widest relative ${activeTab === 'head' ? 'text-blue-600' : 'text-slate-400'}`}>
                                01. Party Identity {activeTab === 'head' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600"/>}
                            </button>
                            <button onClick={() => setActiveTab('detail')} className={`py-4 px-6 text-[10px] font-bold uppercase tracking-widest relative ${activeTab === 'detail' ? 'text-blue-600' : 'text-slate-400'}`}>
                                02. Item Composition {activeTab === 'detail' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600"/>}
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="flex-1 overflow-y-auto p-8 flex flex-col lg:flex-row gap-8">
                            
                            {/* LEFT SIDE: Form/Grid */}
                            <div className="flex-1 space-y-8">
                                {activeTab === 'head' ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        <div className="bg-slate-50 p-6 rounded-2xl space-y-5 border border-slate-100">
                                            <InputField label="Invoice Date" type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} />
                                            <SelectField label="Customer / Client Entity" value={formData.party_id} options={listData.parties.map(p => ({value: p.id, label: p.account_name}))} isObject onChange={e => setFormData({...formData, party_id: e.target.value})} />
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Narration / Special Instructions</label>
                                                <textarea value={formData.remarks} onChange={e => setFormData({...formData, remarks: e.target.value})} rows="4" className="w-full p-4 bg-white border border-slate-200 rounded-xl font-bold text-sm outline-none focus:ring-1 focus:ring-blue-500" placeholder="Special delivery or billing notes..."/>
                                            </div>
                                        </div>
                                        <div className="bg-slate-50 p-6 rounded-2xl space-y-5 border border-slate-100">
                                            <InputField label="Vehicle Registration No" value={formData.vehicle_no} onChange={e => setFormData({...formData, vehicle_no: e.target.value.toUpperCase()})} placeholder="UP-14-AX-0000" />
                                            <SelectField label="Logistics Provider" value={formData.transport_id} options={listData.transports.map(t => ({value: t.id, label: t.transport_name}))} isObject onChange={e => setFormData({...formData, transport_id: e.target.value})} />
                                            <InputField label="Unloading Point / Destination" value={formData.delivery} onChange={e => setFormData({...formData, delivery: e.target.value.toUpperCase()})} placeholder="CITY/PLACE" />
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        <div className="bg-blue-600 p-4 rounded-xl text-white flex items-center justify-between shadow-lg">
                                            <div className="flex items-center gap-3"><ShoppingBag size={18} className="text-blue-200" /><span className="text-[10px] font-black uppercase tracking-widest">Order Import Engine</span></div>
                                            <select className="bg-white/10 border-none p-2 rounded-lg text-[10px] font-bold outline-none cursor-pointer" onChange={(e) => handleOrderPull(e.target.value)}>
                                                <option value="" className="text-slate-900">Select Sales Confirmation...</option>
                                                {listData.orders.map(o => <option className="text-slate-900" key={o.id} value={o.id}>{o.order_no} | {o.Party?.account_name}</option>)}
                                            </select>
                                        </div>
                                        <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm bg-white">
                                            <table className="w-full border-collapse">
                                                <thead className="bg-slate-900 text-white text-[9px] uppercase font-bold tracking-widest">
                                                    <tr>
                                                        <th className="p-3 text-left">SKU / Item Description</th>
                                                        <th className="p-3 text-center">Kgs</th>
                                                        <th className="p-3 text-center">Rate</th>
                                                        <th className="p-3 text-center">Amount</th>
                                                        <th className="p-3 w-10"></th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100 font-mono">
                                                    {gridRows.map((row, idx) => (
                                                        <tr key={idx} className="hover:bg-slate-50 transition-colors">
                                                            <td className="p-2">
                                                                <select value={row.product_id} onChange={e => updateGrid(idx, 'product_id', e.target.value)} className="w-full p-2 text-xs font-bold outline-none bg-transparent font-sans">
                                                                    <option value="">-- Product Selection --</option>
                                                                    {listData.products.map(p => <option key={p.id} value={p.id}>{p.product_name}</option>)}
                                                                </select>
                                                                {row.available_stock !== undefined && (
                                                                    <div className="text-[9px] font-bold text-emerald-500 pl-2 italic">Mill Balance: {row.available_stock} KG</div>
                                                                )}
                                                            </td>
                                                            <td className="p-2"><input type="number" value={row.total_kgs} onChange={e => updateGrid(idx, 'total_kgs', e.target.value)} className="w-full p-2 text-center text-xs font-bold outline-none" /></td>
                                                            <td className="p-2"><input type="number" value={row.rate} onChange={e => updateGrid(idx, 'rate', e.target.value)} className="w-full p-2 text-center text-xs font-black text-blue-600 outline-none" /></td>
                                                            <td className="p-2 text-center text-xs font-black text-slate-700">₹{(row.total_kgs * row.rate).toFixed(2)}</td>
                                                            <td className="p-2">
                                                                <button onClick={() => setGridRows(gridRows.filter((_, i) => i !== idx))} className="text-slate-300 hover:text-red-500 transition-colors"><MinusCircle size={18}/></button>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                            <button onClick={() => setGridRows([...gridRows, { product_id: '', packs: 0, total_kgs: 0, rate: 0, available_stock: 0 }])} className="w-full p-4 bg-slate-50 text-blue-600 text-[10px] font-black uppercase tracking-widest hover:bg-blue-100 transition-all flex justify-center items-center gap-2">
                                                <PlusCircle size={16} /> Append Item Line
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* RIGHT SIDE: FINANCIAL SUMMARY SIDEBAR */}
                            <div className="w-full lg:w-80 bg-slate-900 rounded-2xl p-6 text-white flex flex-col justify-between shadow-xl">
                                <div className="space-y-8">
                                    <div className="text-center">
                                        <Activity size={40} className="text-blue-400 mx-auto mb-2" />
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Financial Ledger</p>
                                    </div>

                                    <div className="space-y-6">
                                        <div className="border-b border-white/5 pb-4 space-y-4">
                                            <div className="flex justify-between items-center text-xs font-bold">
                                                <span className="text-slate-500 uppercase tracking-tighter">Gross Value</span>
                                                <span className="font-mono">₹ {formData.assessable_value}</span>
                                            </div>
                                            <div className="flex justify-between items-center text-xs font-bold">
                                                <span className="text-slate-500 uppercase tracking-tighter">Tax / GST (0%)</span>
                                                <span className="font-mono">₹ 0.00</span>
                                            </div>
                                        </div>

                                        <div className="bg-white/5 p-4 rounded-xl border border-white/10 flex gap-3">
                                            <Info size={16} className="text-blue-400 shrink-0" />
                                            <p className="text-[9px] leading-tight text-slate-400 italic font-medium">
                                                Posting this invoice will automatically deduct quantities from mill stock and update the client ledger.
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-8 p-6 bg-blue-600/10 rounded-3xl border border-blue-500/20 text-center relative overflow-hidden group">
                                    <Database className="absolute -right-2 -bottom-2 text-white/5 group-hover:scale-110 transition-transform" size={80} />
                                    <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1 relative z-10">Net Document Value</p>
                                    <h3 className="text-2xl font-black text-white font-mono relative z-10">₹ {formData.final_invoice_value}</h3>
                                </div>
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="p-6 bg-slate-50 border-t flex justify-end items-center gap-4">
                            <button onClick={() => setIsModalOpen(false)} className="px-8 py-3 font-bold text-slate-400 hover:text-slate-600 text-xs tracking-widest uppercase transition-colors">Discard</button>
                            <button onClick={handleSave} disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white px-12 py-4 rounded-xl font-black shadow-xl flex items-center gap-2 active:scale-95 transition-all text-xs tracking-widest uppercase">
                                <Save size={18}/> {loading ? 'POSTING...' : 'FINALIZE & POST'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* HIDDEN PRINT COMPONENT */}
            <div style={{ position: "absolute", top: "-9999px" }}>
                <TaxInvoiceTemplate ref={printRef} data={printData} />
            </div>

            <style jsx>{`
                input[type='number']::-webkit-inner-spin-button, 
                input[type='number']::-webkit-outer-spin-button { 
                    -webkit-appearance: none; margin: 0; 
                }
                ::-webkit-scrollbar { width: 5px; height: 5px; }
                ::-webkit-scrollbar-track { background: transparent; }
                ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
            `}</style>
        </div>
    );
};

// HELPER COMPONENTS
const InputField = ({ label, ...props }) => (
    <div className="space-y-1">
        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">{label}</label>
        <input {...props} className="w-full bg-white border border-slate-200 p-3 rounded-xl text-sm font-bold outline-none focus:ring-1 focus:ring-blue-500 transition-all" />
    </div>
);

const SelectField = ({ label, options, isObject, ...props }) => (
    <div className="space-y-1">
        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">{label}</label>
        <select {...props} className="w-full bg-white border border-slate-200 p-3 rounded-xl text-sm font-black outline-none focus:ring-1 focus:ring-blue-500 appearance-none cursor-pointer">
            <option value="">-- Choose Option --</option>
            {options.map(opt => isObject ? <option key={opt.value} value={opt.value}>{opt.label}</option> : <option key={opt} value={opt}>{opt}</option>)}
        </select>
    </div>
);

export default InvoicePreparation;