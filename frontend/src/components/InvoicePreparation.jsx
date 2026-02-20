import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useReactToPrint } from 'react-to-print';
import { mastersAPI, transactionsAPI, reportsAPI } from '../service/api';
import TaxInvoiceTemplate from '../print/TaxInvoiceTemplate';

import { 
    Save, FileText, Printer, Search, ChevronRight, 
    ShoppingBag, Landmark, Database, MinusCircle, 
    PlusCircle, Calculator, RefreshCw, Truck, Info,
    CheckCircle2, X, Plus, Trash2, Edit, Square, 
    CheckSquare, ChevronLeft, Calendar
} from 'lucide-react';

const InvoicePreparation = () => {
    // --- UI & MODAL STATES ---
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [activeTab, setActiveTab] = useState('head');
    const [loading, setLoading] = useState(false);
    
    // --- REGISTRY STATES (Search/Sort/Selection) ---
    const [isSelectionMode, setIsSelectionMode] = useState(false);
    const [selectedIds, setSelectedIds] = useState([]);
    const [searchField, setSearchField] = useState('invoice_no');
    const [searchValue, setSearchValue] = useState('');
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
    // --- SEARCH & PAGINATION LOGIC ---
    const processedData = useMemo(() => {
        let result = [...listData.history];
        if (searchValue) {
            result = result.filter(item => {
                const val = searchField === 'party_name' 
                    ? String(item.Party?.account_name || '').toLowerCase()
                    : String(item[searchField] || '').toLowerCase();
                return val.includes(searchValue.toLowerCase());
            });
        }
        return result.sort((a, b) => b.id - a.id);
    }, [listData.history, searchValue, searchField]);

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

    const handleRowClick = (item) => {
        if (isSelectionMode) {
            setSelectedIds(prev => prev.includes(item.id) ? prev.filter(i => i !== item.id) : [...prev, item.id]);
            return;
        }
        // Logic for viewing/editing could go here, for now we focus on print or prep
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
        if (!formData.party_id) return alert("Please select a Party");
        setLoading(true);
        try {
            await transactionsAPI.invoices.create({ ...formData, Details: gridRows });
            setIsModalOpen(false);
            fetchInitialData();
            alert("✅ Invoice Prepared!");
        } catch (e) { alert("❌ Save failed"); }
        finally { setLoading(false); }
    };

    const triggerPrint = async (invoiceNo) => {
        setLoading(true);
        try {
            const res = await reportsAPI.getInvoicePrintData(invoiceNo.toString());
            if (res.data.success) {
                setPrintData(res.data.data);
                setTimeout(() => handlePrintAction(), 700);
            }
        } catch (err) { alert("Print Error"); }
        finally { setLoading(false); }
    };

    return (
        <div className="min-h-screen bg-[#f8fafc] p-6 font-sans">
            
            {/* 1. TOP HEADER */}
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
                        <FileText className="text-blue-600" size={28} /> Billing Registry
                    </h1>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Tax Invoice & Mill Inventory Management</p>
                </div>
                
                <div className="flex gap-2">
                    <button onClick={handleAddNew} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-bold shadow-md transition-all active:scale-95">
                        <Plus size={18} /> New Invoice
                    </button>
                    
                    <button 
                        onClick={() => { setIsSelectionMode(!isSelectionMode); setSelectedIds([]); }}
                        className={`px-6 py-2 border rounded-lg font-bold transition-all ${isSelectionMode ? 'bg-amber-100 border-amber-300 text-amber-700' : 'bg-white border-slate-200 text-blue-600 hover:bg-slate-50'}`}
                    >
                        {isSelectionMode ? 'Cancel' : 'Select'}
                    </button>

                    <button onClick={fetchInitialData} className="p-2 border rounded-lg bg-white text-slate-400 hover:text-blue-600 transition-colors">
                        <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                    </button>
                </div>
            </div>

            {/* 2. SEARCH BAR */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm mb-6 flex flex-wrap gap-4 items-end">
                <div className="flex-1 min-w-[200px]">
                    <label className="text-[10px] font-black text-slate-400 uppercase mb-1 block ml-1">Search Property</label>
                    <div className="flex gap-2">
                        <select value={searchField} onChange={(e) => setSearchField(e.target.value)} className="border border-slate-200 p-2.5 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500">
                            <option value="invoice_no">Invoice No</option>
                            <option value="party_name">Customer Name</option>
                        </select>
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-3 text-slate-400" size={16}/>
                            <input type="text" placeholder="Search invoices..." value={searchValue} onChange={(e) => setSearchValue(e.target.value)} className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500" />
                        </div>
                    </div>
                </div>
                <button onClick={() => setSearchValue('')} className="px-6 py-2.5 text-sm font-bold text-slate-500 hover:bg-slate-100 rounded-lg transition-all">Clear</button>
            </div>

            {/* 3. DATA TABLE */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-md overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-blue-600 text-white">
                            <tr>
                                {isSelectionMode && <th className="p-4 w-12 text-center"><Square size={20} className="mx-auto" /></th>}
                                <th className="p-4 text-[10px] font-black uppercase tracking-[0.2em]">Inv #</th>
                                <th className="p-4 text-[10px] font-black uppercase tracking-[0.2em]">Date</th>
                                <th className="p-4 text-[10px] font-black uppercase tracking-[0.2em]">Customer / Ledger</th>
                                <th className="p-4 text-[10px] font-black uppercase tracking-[0.2em]">Destination</th>
                                <th className="p-4 text-[10px] font-black uppercase tracking-[0.2em] text-right">Value (₹)</th>
                                <th className="p-4 text-[10px] font-black uppercase tracking-[0.2em] text-center w-24">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {currentItems.length > 0 ? currentItems.map((item) => (
                                <tr key={item.id} onClick={() => handleRowClick(item)} className={`transition-colors cursor-pointer ${selectedIds.includes(item.id) ? 'bg-blue-50' : 'hover:bg-slate-50'}`}>
                                    {isSelectionMode && (
                                        <td className="p-4 text-center">
                                            {selectedIds.includes(item.id) ? <CheckSquare size={20} className="text-blue-600 mx-auto"/> : <Square size={20} className="text-slate-200 mx-auto"/>}
                                        </td>
                                    )}
                                    <td className="p-4 text-sm font-bold text-blue-600 font-mono">#{item.invoice_no}</td>
                                    <td className="p-4 text-sm text-slate-500">{item.date}</td>
                                    <td className="p-4 text-sm font-bold text-slate-700 uppercase">{item.Party?.account_name}</td>
                                    <td className="p-4 text-sm text-slate-500 italic"><MapPin size={12} className="inline mr-1"/>{item.delivery || 'N/A'}</td>
                                    <td className="p-4 text-sm font-black text-right text-emerald-600">₹{parseFloat(item.final_invoice_value).toLocaleString()}</td>
                                    <td className="p-4 text-center flex justify-center gap-2">
                                        <button onClick={(e) => { e.stopPropagation(); triggerPrint(item.invoice_no); }} className="p-2 text-slate-300 hover:text-blue-600 transition-colors"><Printer size={16}/></button>
                                        <button className="p-2 text-slate-300 hover:text-blue-600 transition-colors"><Edit size={16}/></button>
                                    </td>
                                </tr>
                            )) : (
                                <tr><td colSpan={7} className="p-20 text-center opacity-20"><FileText size={48} className="mx-auto mb-2"/><p className="font-black uppercase tracking-widest">No Invoices Found</p></td></tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* 4. PAGINATION FOOTER */}
                <div className="p-4 bg-slate-50 border-t flex items-center justify-between">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Page {currentPage} of {totalPages}</p>
                    <div className="flex gap-2">
                        <button disabled={currentPage === 1} onClick={() => setCurrentPage(prev => prev - 1)} className="p-2 border rounded-lg bg-white disabled:opacity-30 active:scale-95 transition-all"><ChevronLeft size={18}/></button>
                        <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(prev => prev + 1)} className="p-2 border rounded-lg bg-white disabled:opacity-30 active:scale-95 transition-all"><ChevronRight size={18}/></button>
                    </div>
                </div>
            </div>

            {/* 5. PREPARATION MODAL */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-6xl overflow-hidden flex flex-col max-h-[95vh] animate-in fade-in zoom-in duration-200">
                        {/* Modal Header */}
                        <div className="bg-blue-600 p-6 flex justify-between items-center text-white">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-white/20 rounded-xl"><Calculator /></div>
                                <div>
                                    <h2 className="font-black uppercase tracking-widest text-xl">Invoice Preparation</h2>
                                    <p className="text-[10px] font-bold text-blue-200 uppercase">System Ref: #{formData.invoice_no}</p>
                                </div>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="hover:bg-blue-500 p-2 rounded-full transition-colors"><X size={24}/></button>
                        </div>

                        {/* Modal Tabs */}
                        <div className="flex bg-slate-50 border-b px-8">
                            <button onClick={() => setActiveTab('head')} className={`py-4 px-6 text-[10px] font-black uppercase tracking-widest relative ${activeTab === 'head' ? 'text-blue-600' : 'text-slate-400'}`}>
                                01. Party Identity {activeTab === 'head' && <div className="absolute bottom-0 left-0 w-full h-1 bg-blue-600 rounded-t-full"/>}
                            </button>
                            <button onClick={() => setActiveTab('detail')} className={`py-4 px-6 text-[10px] font-black uppercase tracking-widest relative ${activeTab === 'detail' ? 'text-blue-600' : 'text-slate-400'}`}>
                                02. Item Composition {activeTab === 'detail' && <div className="absolute bottom-0 left-0 w-full h-1 bg-blue-600 rounded-t-full"/>}
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="flex-1 overflow-y-auto p-8 flex flex-col md:flex-row gap-8">
                            <div className="flex-1 space-y-6">
                                {activeTab === 'head' ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        <div className="bg-slate-50 p-6 rounded-2xl space-y-4 border border-slate-100">
                                            <InputField label="Invoice Date" type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} />
                                            <SelectField label="Party / Client" value={formData.party_id} options={listData.parties.map(p => ({value: p.id, label: p.account_name}))} isObject onChange={e => setFormData({...formData, party_id: e.target.value})} />
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Narration / Remarks</label>
                                                <textarea value={formData.remarks} onChange={e => setFormData({...formData, remarks: e.target.value})} rows="3" className="w-full p-3 bg-white border border-slate-200 rounded-xl font-bold text-xs outline-none" placeholder="Enter special instructions..."/>
                                            </div>
                                        </div>
                                        <div className="bg-slate-50 p-6 rounded-2xl space-y-4 border border-slate-100">
                                            <InputField label="Vehicle Number" value={formData.vehicle_no} onChange={e => setFormData({...formData, vehicle_no: e.target.value})} />
                                            <SelectField label="Transporter" value={formData.transport_id} options={listData.transports.map(t => ({value: t.id, label: t.transport_name}))} isObject onChange={e => setFormData({...formData, transport_id: e.target.value})} />
                                            <InputField label="Delivery Place" value={formData.delivery} onChange={e => setFormData({...formData, delivery: e.target.value})} />
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        <div className="bg-blue-600 p-4 rounded-2xl text-white flex items-center justify-between shadow-lg">
                                            <div className="flex items-center gap-3"><ShoppingBag size={20} className="text-blue-200" /><span className="text-xs font-black uppercase tracking-widest">Order Puller</span></div>
                                            <select className="bg-white/10 border-none p-2 rounded-lg text-[10px] font-bold outline-none cursor-pointer" onChange={(e) => handleOrderPull(e.target.value)}>
                                                <option value="" className="text-slate-900">Select Sales Confirmation...</option>
                                                {listData.orders.map(o => <option className="text-slate-900" key={o.id} value={o.id}>{o.order_no} | {o.Party?.account_name}</option>)}
                                            </select>
                                        </div>
                                        <div className="border border-slate-200 rounded-2xl overflow-hidden">
                                            <table className="w-full text-left">
                                                <thead className="bg-slate-800 text-white text-[9px] uppercase font-black">
                                                    <tr><th className="p-4">SKU / Product</th><th className="p-4 text-center">Qty (Kgs)</th><th className="p-4 text-center">Rate</th><th className="p-4 text-center">Value</th><th className="p-4 w-10"></th></tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100">
                                                    {gridRows.map((row, idx) => (
                                                        <tr key={idx}>
                                                            <td className="p-2">
                                                                <select value={row.product_id} onChange={e => updateGrid(idx, 'product_id', e.target.value)} className="w-full p-2 text-xs font-bold outline-none bg-transparent">
                                                                    <option value="">Choose Item...</option>
                                                                    {listData.products.map(p => <option key={p.id} value={p.id}>{p.product_name}</option>)}
                                                                </select>
                                                                {row.available_stock !== undefined && <div className="text-[9px] font-bold text-emerald-500 mt-1 pl-2 italic">Stock: {row.available_stock} KG</div>}
                                                            </td>
                                                            <td className="p-2"><input type="number" value={row.total_kgs} onChange={e => updateGrid(idx, 'total_kgs', e.target.value)} className="w-full p-2 text-center text-xs font-bold outline-none" /></td>
                                                            <td className="p-2"><input type="number" value={row.rate} onChange={e => updateGrid(idx, 'rate', e.target.value)} className="w-full p-2 text-center text-xs font-black text-blue-600 outline-none" /></td>
                                                            <td className="p-2 text-center text-xs font-black">₹{(row.total_kgs * row.rate).toFixed(2)}</td>
                                                            <td className="p-2"><button onClick={() => removeRow(idx)} className="text-red-300 hover:text-red-500"><MinusCircle size={18}/></button></td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                            <button onClick={() => setGridRows([...gridRows, { product_id: '', packs: 0, total_kgs: 0, rate: 0, available_stock: 0 }])} className="w-full p-4 bg-slate-50 text-blue-600 text-[10px] font-black uppercase tracking-widest hover:bg-slate-100 transition-all">+ Add Item Row</button>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* FINANCIAL SUMMARY SIDEBAR */}
                            <div className="w-full md:w-80 space-y-4">
                                <div className="bg-slate-900 rounded-[2rem] p-8 text-white shadow-2xl relative overflow-hidden flex flex-col border border-slate-800">
                                    <Calculator className="absolute top-4 right-4 text-blue-500/10" size={100} />
                                    <h3 className="font-black text-blue-400 text-[10px] uppercase tracking-widest mb-10 border-b border-white/5 pb-4">Financial Ledger</h3>
                                    <div className="space-y-6">
                                        <LedgerRow label="Assessable Value" value={formData.assessable_value} />
                                        <LedgerRow label="Tax / GST (0%)" value="0.00" color="text-slate-500" />
                                        <div className="pt-8 mt-4 border-t border-white/10 text-center">
                                            <p className="text-[10px] font-black text-blue-400 uppercase mb-2 block tracking-widest">Net Payable</p>
                                            <h4 className="text-4xl font-black font-mono">₹ {formData.final_invoice_value}</h4>
                                        </div>
                                    </div>
                                </div>
                                <div className="bg-blue-50 border border-blue-100 p-4 rounded-2xl flex items-start gap-3">
                                    <CheckCircle2 size={18} className="text-emerald-500 shrink-0 mt-0.5" />
                                    <p className="text-[10px] text-slate-500 font-bold uppercase leading-relaxed">Inventory will be automatically updated upon posting.</p>
                                </div>
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="p-6 bg-slate-50 border-t flex justify-end items-center gap-4">
                            <button onClick={() => setIsModalOpen(false)} className="px-8 py-3 font-bold text-slate-400 hover:text-slate-600 text-xs tracking-widest uppercase">Discard</button>
                            <button onClick={handleSave} disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white px-10 py-3 rounded-xl font-black shadow-lg shadow-blue-100 flex items-center gap-2 active:scale-95 transition-all text-xs tracking-widest uppercase">
                                <Save size={18}/> {loading ? 'POSTING...' : 'POST INVOICE'}
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
                ::-webkit-scrollbar { width: 5px; height: 5px; }
                ::-webkit-scrollbar-track { background: transparent; }
                ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
            `}</style>
        </div>
    );
};

// HELPER COMPONENTS
const InputField = ({ label, ...props }) => (
    <div className="space-y-1"><label className="text-[9px] font-black text-slate-400 uppercase ml-1">{label}</label>
    <input {...props} className="w-full bg-white border border-slate-200 p-3 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500" /></div>
);
const SelectField = ({ label, options, isObject, ...props }) => (
    <div className="space-y-1"><label className="text-[9px] font-black text-slate-400 uppercase ml-1">{label}</label>
    <select {...props} className="w-full bg-white border border-slate-200 p-3 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500 appearance-none">
        <option value="">Choose...</option>
        {options.map(opt => isObject ? <option key={opt.value} value={opt.value}>{opt.label}</option> : <option key={opt} value={opt}>{opt}</option>)}
    </select></div>
);
const LedgerRow = ({ label, value, color = "text-white" }) => (
    <div className="flex justify-between items-center text-xs font-bold"><span className="text-slate-400 font-black uppercase">{label}</span><span className={`${color} font-mono`}>₹ {value}</span></div>
);
const MapPin = ({ size, className }) => ( <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg> );

export default InvoicePreparation;