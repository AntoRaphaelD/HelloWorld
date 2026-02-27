import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useReactToPrint } from 'react-to-print';
import { mastersAPI, transactionsAPI } from '../service/api';
import TaxInvoiceTemplate from '../print/TaxInvoiceTemplate';
import { 
    Save, FileText, Printer, Search, Calculator, RefreshCw, 
    Truck, Info, X, Plus, Trash2, Database, MinusCircle, 
    CheckCircle2, MapPin, Hash, User, Settings, Layers, Box, 
    Percent, Tag, Clock, ShieldCheck, Lock, Activity, 
    Filter, ChevronLeft, ChevronRight, Square, CheckSquare,
    CreditCard, Calendar, Timer, DollarSign, ArrowRightCircle
} from 'lucide-react';

const InvoicePreparation = () => {
    // --- Initial States (Preserving all fields) ---
    const emptyInvoice = {
        id: null,
        invoice_no: '', 
        date: new Date().toISOString().split('T')[0], 
        sales_type: 'GST SALES', 
        load_id: '', 
        invoice_type_id: '',
        party_id: '', 
        transport_id: '', 
        vehicle_no: '', 
        delivery: '',
        address: '', 
        credit_days: 0, 
        interest_percentage: 0, 
        lr_no: '',
        lr_date: '', 
        ebill_no: '', 
        removal_time: '', 
        prepare_time: '',
        pay_mode: 'Credit', 
        form_j: '', 
        sales_against: '', 
        epcg_no: '', 
        remarks: '',
        // Calculation aggregates
        total_assessable: 0, total_charity: 0, total_vat: 0, total_cenvat: 0,
        total_duty: 0, total_cess: 0, total_hr_sec_cess: 0, total_tcs: 0,
        total_sgst: 0, total_cgst: 0, total_igst: 0, total_other: 0,
        sub_total: 0, freight_charges: 0, round_off: 0, net_amount: 0,
        is_approved: false
    };

    // --- Main States ---
    const [listData, setListData] = useState({ 
        types: [], parties: [], transports: [], 
        products: [], orders: [], directOrders: [], history: [], loads: [] 
    });
    const [formData, setFormData] = useState(emptyInvoice);
    const [gridRows, setGridRows] = useState([]);
    const [loading, setLoading] = useState(false);
    const [submitLoading, setSubmitLoading] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [activeTab, setActiveTab] = useState('head');

    // Search & Selection
    const [searchValue, setSearchValue] = useState('');
    const [searchField, setSearchField] = useState('invoice_no');
    const [isSelectionMode, setIsSelectionMode] = useState(false);
    const [selectedIds, setSelectedIds] = useState([]);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    // --- Printing ---
    const [printData, setPrintData] = useState(null);
    const printRef = useRef();
    const handlePrintAction = useReactToPrint({ 
        contentRef: printRef,
        onAfterPrint: () => setPrintData(null)
    });

    // --- Formula Engine (Preserved Logic) ---
    const evaluateFormula = (formula, context) => {
        if (!formula || formula === '-' || formula === '') return 0;
        try {
            let processed = formula;
            Object.keys(context).forEach(key => {
                const regex = new RegExp(`\\[${key}\\]`, 'g');
                processed = processed.replace(regex, context[key] || 0);
            });
            processed = processed.replace(/Round\(/gi, 'Math.round(');
            const result = eval(processed);
            return isNaN(result) ? 0 : parseFloat(result.toFixed(2));
        } catch { return 0; }
    };

    const runCalculations = (rows, typeId, freightVal = formData.freight_charges) => {
        const config = listData.types.find(t => t.id === parseInt(typeId));
        if (!config) return rows;

        let hTotals = { assess: 0, charity: 0, igst: 0, sgst: 0, cgst: 0, sub: 0, net: 0 };

        const updatedRows = rows.map(item => {
            const product = listData.products.find(p => p.id === parseInt(item.product_id));
            const ctx = {
                "Rate / Kg": parseFloat(item.rate) || 0,
                "Total Kgs": parseFloat(item.total_kgs) || 0,
                "H": (parseFloat(item.rate) || 0) * (parseFloat(item.total_kgs) || 0),
                "CharityRs": product ? parseFloat(product.charity_rs || 0) : 0,
                "Lorryfright": parseFloat(freightVal || 0),
                "igstper": parseFloat(config.igst_percentage || 0),
                "sgstper": parseFloat(config.sgst_percentage || 0),
                "cgstper": parseFloat(config.cgst_percentage || 0),
            };

            const charity = config.charity_checked ? evaluateFormula(config.charity_formula, ctx) : 0;
            const igst = config.igst_checked ? evaluateFormula(config.igst_formula, ctx) : 0;
            const sgst = config.gst_checked ? evaluateFormula(config.sgst_formula, ctx) : 0;
            const cgst = config.gst_checked ? evaluateFormula(config.cgst_formula, ctx) : 0;

            ctx["Charity"] = charity; ctx["igstamt"] = igst; ctx["sgstamt"] = sgst; ctx["cgstamt"] = cgst;

            const assess = config.assess_checked ? evaluateFormula(config.assess_formula, ctx) : ctx["H"];
            ctx["A"] = assess;
            const sub = evaluateFormula(config.sub_total_formula, ctx); 
            ctx["I"] = sub;
            const final = evaluateFormula(config.total_value_formula, ctx);

            hTotals.assess += assess; hTotals.charity += charity; hTotals.igst += igst; 
            hTotals.sgst += sgst; hTotals.cgst += cgst; hTotals.sub += sub; hTotals.net += final;

            return { 
                ...item, assessable_value: assess.toFixed(2), charity_amt: charity.toFixed(2), 
                igst_amt: igst.toFixed(2), sgst_amt: sgst.toFixed(2), cgst_amt: cgst.toFixed(2),
                sub_total: sub.toFixed(2), final_value: final.toFixed(2) 
            };
        });

        setFormData(prev => ({ 
            ...prev, total_assessable: hTotals.assess.toFixed(2), total_charity: hTotals.charity.toFixed(2), 
            total_igst: hTotals.igst.toFixed(2), total_sgst: hTotals.sgst.toFixed(2),
            total_cgst: hTotals.cgst.toFixed(2), sub_total: hTotals.sub.toFixed(2), 
            net_amount: hTotals.net.toFixed(2) 
        }));
        return updatedRows;
    };

    // --- Data Fetching ---
    const fetchInitialData = async () => {
        setLoading(true);
        try {
            const [invT, acc, tra, pro, ord, dor, his, lod] = await Promise.all([
                mastersAPI.invoiceTypes.getAll(), mastersAPI.accounts.getAll(),
                mastersAPI.transports.getAll(), mastersAPI.products.getAll(),
                transactionsAPI.orders.getAll(), transactionsAPI.directInvoices.getAll(),
                transactionsAPI.invoices.getAll(), transactionsAPI.despatch.getAll()
            ]);
            setListData({ 
                types: invT.data.data, parties: acc.data.data, transports: tra.data.data, 
                products: pro.data.data, orders: ord.data.data, directOrders: dor.data.data,
                history: his.data.data, loads: lod.data.data
            });
        } catch (e) { console.error("Sync Error", e); } finally { setLoading(false); }
    };

    useEffect(() => { fetchInitialData(); }, []);

    // --- Action Handlers ---
    const handleAddNew = () => {
        const nextId = listData.history.length > 0 ? Math.max(...listData.history.map(h => parseInt(h.invoice_no) || 0)) + 1 : 1001;
        setFormData({ ...emptyInvoice, invoice_no: String(nextId) });
        setGridRows([]);
        setActiveTab('head');
        setIsModalOpen(true);
    };

    const handleRowClick = (item) => {
        if (isSelectionMode) {
            setSelectedIds(prev => prev.includes(item.id) ? prev.filter(id => id !== item.id) : [...prev, item.id]);
            return;
        }
        setFormData({ ...item });
        setGridRows(item.Details || []);
        setActiveTab('head');
        setIsModalOpen(true);
    };

    const handleLoadChange = (loadId) => {
        const load = listData.loads.find(l => l.id === parseInt(loadId));
        if (load) {
            setFormData(prev => ({
                ...prev, load_id: loadId, transport_id: load.transport_id,
                vehicle_no: load.vehicle_no, delivery: load.delivery, 
                freight_charges: load.freight || 0, lr_no: load.lr_no || '', lr_date: load.lr_date || ''
            }));
            setGridRows(prev => runCalculations(prev, formData.invoice_type_id, load.freight));
        }
    };

    const handlePartyChange = (partyId) => {
        const party = listData.parties.find(p => p.id === parseInt(partyId));
        if(party) setFormData(prev => ({ ...prev, party_id: partyId, address: party.address }));
    };

    const handleProductSelectInGrid = (idx, productId) => {
        const product = listData.products.find(p => p.id === parseInt(productId));
        const updated = [...gridRows];
        updated[idx] = {
            ...updated[idx],
            product_id: productId,
            product_description: product?.product_name || '',
            packing_type: product?.packing_type || '',
            packs: product?.no_of_cones_per_pack || 0,
            rate_per: 'Kg'
        };
        setGridRows(runCalculations(updated, formData.invoice_type_id));
    };

    const handleOrderSelection = (orderNo, type) => {
        let order = type === 'WITH_ORDER' ? listData.orders.find(o => o.order_no === orderNo) : listData.directOrders.find(o => o.order_no === orderNo);
        if (!order) return;
        const details = type === 'WITH_ORDER' ? order.OrderDetails || [] : order.DirectInvoiceDetails || [];
        const newRows = details.map(d => {
            const masterProduct = listData.products.find(p => p.id === d.product_id);
            return {
                order_no: orderNo, order_type: type, product_id: d.product_id,
                broker_code: order.Broker?.broker_code || '', broker_percentage: order.Broker?.commission_pct || 0,
                product_description: masterProduct?.product_name || '',
                packs: d.packs || masterProduct?.no_of_cones_per_pack || 0,
                packing_type: d.packing_type || masterProduct?.packing_type || '',
                total_kgs: d.qty || d.total_kgs || 0, rate: d.rate_cr || d.rate || 0, rate_per: 'Kg',
                identification_mark: '', from_no: '', to_no: '', resale: false, convert_to_hank: false, convert_to_cone: false
            };
        });
        setGridRows(runCalculations(newRows, formData.invoice_type_id));
    };

    const updateGrid = (idx, field, val) => {
        const updated = [...gridRows];
        updated[idx][field] = val;
        setGridRows(runCalculations(updated, formData.invoice_type_id));
    };

    const handleSave = async () => {
        if (!formData.party_id || !formData.load_id) return alert("Consignee and Load Link required.");
        setSubmitLoading(true);
        try {
            if (formData.id) await transactionsAPI.invoices.update(formData.id, { ...formData, Details: gridRows });
            else await transactionsAPI.invoices.create({ ...formData, Details: gridRows });
            setIsModalOpen(false); fetchInitialData();
        } catch (e) { alert("Deployment Error"); } finally { setSubmitLoading(false); }
    };

    // --- Filtering Logic ---
    const filteredHistory = useMemo(() => {
        const data = Array.isArray(listData.history) ? listData.history : [];
        return data.filter(h => 
            h.invoice_no?.toLowerCase().includes(searchValue.toLowerCase()) || 
            h.Party?.account_name?.toLowerCase().includes(searchValue.toLowerCase())
        ).sort((a, b) => b.id - a.id);
    }, [listData.history, searchValue]);

    const currentItems = filteredHistory.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
    const totalPages = Math.ceil(filteredHistory.length / itemsPerPage) || 1;

    return (
        <div className="min-h-screen bg-slate-50 p-6 font-sans text-slate-900">
            
            {/* 1. HEADER SECTION */}
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <FileText className="text-blue-600" /> Invoice Preparation
                    </h1>
                    <p className="text-sm text-slate-500">Sequential document generation and stock reconciliation registry</p>
                </div>
                <div className="flex gap-2">
                    <button onClick={() => { setIsSelectionMode(!isSelectionMode); setSelectedIds([]); }}
                        className={`px-5 py-2 border rounded-lg font-semibold transition-all ${isSelectionMode ? 'bg-amber-100 border-amber-300 text-amber-700' : 'bg-white border-slate-200 text-blue-600 hover:bg-slate-50'}`}>
                        {isSelectionMode ? 'Cancel' : 'Select'}
                    </button>
                    <button onClick={handleAddNew} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg font-semibold shadow-sm transition-all active:scale-95">
                        <Plus size={18} /> New Preparation
                    </button>
                    <button onClick={fetchInitialData} className="p-2 border border-slate-200 rounded-lg bg-white text-slate-400 hover:text-blue-600 transition-colors shadow-sm">
                        <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
                    </button>
                </div>
            </div>

            {/* 2. FILTER BAR */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm mb-6 flex flex-col md:flex-row gap-4 items-center">
                <div className="flex-1 relative w-full">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input type="text" placeholder="Filter by Invoice No or Party Name..." className="w-full border border-slate-200 pl-10 pr-4 py-2 rounded-lg text-sm outline-none focus:ring-1 focus:ring-blue-500 transition-all shadow-inner" value={searchValue} onChange={e => setSearchValue(e.target.value)} />
                </div>
                <div className="flex bg-blue-50 text-blue-600 border border-blue-100 px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest gap-2">
                    <Filter size={14}/> {filteredHistory.length} Total Invoices
                </div>
            </div>

            {/* 3. DATA TABLE */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-blue-600 text-white font-mono">
                                {isSelectionMode && <th className="p-4 w-12 text-center"><Square size={18} className="mx-auto" /></th>}
                                <th className="p-4 text-sm font-semibold uppercase tracking-wider">Doc #</th>
                                <th className="p-4 text-sm font-semibold uppercase tracking-wider">Date</th>
                                <th className="p-4 text-sm font-semibold uppercase tracking-wider">Consignee</th>
                                <th className="p-4 text-sm font-semibold uppercase tracking-wider text-right">Net Value (₹)</th>
                                <th className="p-4 text-sm font-semibold uppercase tracking-wider text-center">Status</th>
                                {!isSelectionMode && <th className="p-4 w-10"></th>}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-mono">
                            {loading ? (
                                <tr><td colSpan={7} className="py-24 text-center"><RefreshCw size={40} className="animate-spin text-blue-500 mx-auto mb-4" /><p className="text-slate-500 font-bold uppercase text-[10px]">Syncing Document Registry...</p></td></tr>
                            ) : currentItems.length > 0 ? (
                                currentItems.map((item) => (
                                    <tr key={item.id} onClick={() => handleRowClick(item)} className={`transition-all cursor-pointer hover:bg-blue-50/50 ${selectedIds.includes(item.id) ? 'bg-blue-50' : ''}`}>
                                        {isSelectionMode && (
                                            <td className="p-4 text-center" onClick={(e) => {e.stopPropagation(); handleRowClick(item);}}>
                                                {selectedIds.includes(item.id) ? <CheckSquare size={18} className="text-blue-600 mx-auto"/> : <Square size={18} className="text-slate-200 mx-auto"/>}
                                            </td>
                                        )}
                                        <td className="p-4 text-sm font-black text-blue-600">#{item.invoice_no}</td>
                                        <td className="p-4 text-sm text-slate-500 font-sans">{item.date}</td>
                                        <td className="p-4">
                                            <div className="text-sm font-bold text-slate-700 uppercase font-sans">{item.Party?.account_name}</div>
                                            <div className="text-[10px] text-slate-400 font-normal uppercase font-sans">{item.Party?.place}</div>
                                        </td>
                                        <td className="p-4 text-sm font-black text-right text-slate-900">₹{parseFloat(item.net_amount).toLocaleString()}</td>
                                        <td className="p-4 text-center">
                                            <span className={`px-4 py-1 rounded-full text-[9px] font-black tracking-widest ${item.is_approved ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{item.is_approved ? 'APPROVED' : 'PENDING'}</span>
                                        </td>
                                        {!isSelectionMode && <td className="p-4 text-right"><ArrowRightCircle size={18} className="text-slate-300" /></td>}
                                    </tr>
                                ))
                            ) : (
                                <tr><td colSpan={7} className="py-28 text-center"><div className="flex flex-col items-center opacity-20"><Database size={60}/><p className="mt-4 font-black uppercase tracking-[0.2em]">Registry History Empty</p></div></td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
                {/* Pagination */}
                <div className="p-4 bg-slate-50 border-t flex items-center justify-between">
                    <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Page {currentPage} of {totalPages}</span>
                    <div className="flex gap-1">
                        <button disabled={currentPage === 1} onClick={() => setCurrentPage(prev => prev - 1)} className="p-2 border rounded-lg bg-white disabled:opacity-30"><ChevronLeft size={16}/></button>
                        <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(prev => prev + 1)} className="p-2 border rounded-lg bg-white disabled:opacity-30"><ChevronRight size={16}/></button>
                    </div>
                </div>
            </div>

            {/* 4. MODAL COCKPIT */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[98vw] overflow-hidden flex flex-col h-[96vh] animate-in zoom-in duration-200">
                        
                        {/* Modal Header */}
                        <div className="bg-slate-900 p-4 flex justify-between items-center text-white shadow-lg shrink-0">
                            <div className="flex items-center gap-4">
                                <div className="p-2 bg-blue-600 rounded-lg shadow-lg"><Calculator size={24}/></div>
                                <div>
                                    <h2 className="font-bold uppercase tracking-tight">Invoice Cockpit Registry</h2>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase">Preparation ID: #{formData.invoice_no}</p>
                                </div>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="hover:bg-white/10 p-1 rounded-full"><X size={24}/></button>
                        </div>

                        {/* Navigation Tabs */}
                        <div className="flex bg-slate-50 border-b px-6 shrink-0">
                            <button onClick={() => setActiveTab('head')} className={`py-4 px-6 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest relative transition-colors ${activeTab === 'head' ? 'text-blue-600' : 'text-slate-400'}`}>
                                <Box size={14}/> 01. Head Configuration {activeTab === 'head' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600"/>}
                            </button>
                            <button onClick={() => setActiveTab('detail')} className={`py-4 px-6 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest relative transition-colors ${activeTab === 'detail' ? 'text-blue-600' : 'text-slate-400'}`}>
                                <Layers size={14}/> 02. Itemization Grid {activeTab === 'detail' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600"/>}
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="flex-1 overflow-y-auto p-6 flex flex-col lg:flex-row gap-6 bg-slate-50/50">
                            
                            {/* LEFT SIDE: Entry Grid */}
                            <div className="flex-1 space-y-6">
                                {activeTab === 'head' ? (
                                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                                        {/* COL 1: Identity */}
                                        <div className="bg-white p-5 rounded-xl border shadow-sm space-y-4">
                                            <div className="flex items-center gap-2 mb-2 text-slate-400"><Tag size={14}/><span className="text-[9px] font-black uppercase">Core Identifiers</span></div>
                                            <InputField label="Sequential Invoice #" value={formData.invoice_no} readOnly icon={Lock} />
                                            <InputField label="Document Date" type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} />
                                            <SelectField label="Sales Category" value={formData.sales_type} options={[{value:'GST SALES', label:'GST SALES'},{value:'CST SALES', label:'CST SALES'}]} onChange={e => setFormData({...formData, sales_type: e.target.value})} />
                                            <SelectField label="Invoice Engine" value={formData.invoice_type_id} options={listData.types.map(t => ({value: t.id, label: t.type_name}))} onChange={e => { setFormData({...formData, invoice_type_id: e.target.value}); setGridRows(runCalculations(gridRows, e.target.value)); }} />
                                        </div>

                                        {/* COL 2: Party */}
                                        <div className="bg-white p-5 rounded-xl border shadow-sm space-y-4">
                                            <div className="flex items-center gap-2 mb-2 text-slate-400"><User size={14}/><span className="text-[9px] font-black uppercase">Party Snapshot</span></div>
                                            <SelectField label="Consignee (Party)" value={formData.party_id} options={listData.parties.map(p => ({value: p.id, label: p.account_name}))} onChange={e => handlePartyChange(e.target.value)} />
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Master Address</label>
                                                <textarea readOnly value={formData.address} className="w-full h-20 bg-slate-50 border border-slate-200 p-2 rounded-lg text-[10px] font-bold text-slate-500 resize-none outline-none" placeholder="FETCHED FROM MASTER"/>
                                            </div>
                                            <div className="grid grid-cols-2 gap-2">
                                                <InputField label="Credit Days" type="number" value={formData.credit_days} onChange={e => setFormData({...formData, credit_days: e.target.value})} />
                                                <InputField label="Interest %" type="number" value={formData.interest_percentage} onChange={e => setFormData({...formData, interest_percentage: e.target.value})} />
                                            </div>
                                            <SelectField label="Pay Mode" value={formData.pay_mode} options={[{value:'Cash', label:'Cash'},{value:'Credit', label:'Credit'}]} onChange={e => setFormData({...formData, pay_mode: e.target.value})} />
                                        </div>

                                        {/* COL 3: Logistics */}
                                        <div className="bg-white p-5 rounded-xl border shadow-sm space-y-4">
                                            <div className="flex items-center gap-2 mb-2 text-slate-400"><Truck size={14}/><span className="text-[9px] font-black uppercase">Logistics (Locked)</span></div>
                                            <SelectField label="Load Number Link" value={formData.load_id} options={listData.loads.map(l => ({value: l.id, label: `Load #${l.load_no} | ${l.vehicle_no}`}))} onChange={e => handleLoadChange(e.target.value)} />
                                            <SelectField label="Carrier" value={formData.transport_id} readOnly options={listData.transports.map(t => ({value: t.id, label: t.transport_name}))} />
                                            <InputField label="Vehicle Registration" value={formData.vehicle_no} readOnly icon={Lock} />
                                            <InputField label="Delivery Place" value={formData.delivery} readOnly icon={Lock} />
                                            <div className="grid grid-cols-2 gap-2">
                                                <InputField label="LR No" value={formData.lr_no} readOnly icon={Lock} />
                                                <InputField label="LR Date" type="date" value={formData.lr_date} readOnly icon={Lock} />
                                            </div>
                                        </div>

                                        {/* COL 4: Regulatory */}
                                        <div className="bg-white p-5 rounded-xl border shadow-sm space-y-4">
                                            <div className="flex items-center gap-2 mb-2 text-slate-400"><ShieldCheck size={14}/><span className="text-[9px] font-black uppercase">Regulatory & Remarks</span></div>
                                            <InputField label="E-Way Bill #" value={formData.ebill_no} onChange={e => setFormData({...formData, ebill_no: e.target.value})} />
                                            <div className="grid grid-cols-2 gap-2">
                                                <InputField label="Prep. Time" type="time" value={formData.prepare_time} onChange={e => setFormData({...formData, prepare_time: e.target.value})} />
                                                <InputField label="Rem. Time" type="time" value={formData.removal_time} onChange={e => setFormData({...formData, removal_time: e.target.value})} />
                                            </div>
                                            <InputField label="Sales Against (Form)" value={formData.sales_against} onChange={e => setFormData({...formData, sales_against: e.target.value})} />
                                            <InputField label="EPCG Reg No" value={formData.epcg_no} onChange={e => setFormData({...formData, epcg_no: e.target.value})} />
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Internal Remarks</label>
                                                <textarea value={formData.remarks} onChange={e => setFormData({...formData, remarks: e.target.value})} className="w-full h-16 bg-white border border-slate-200 p-2 rounded-lg text-[10px] font-bold outline-none focus:ring-1 focus:ring-blue-500 resize-none shadow-inner"/>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex flex-col h-full space-y-4">
                                        <div className="bg-blue-600 p-4 rounded-xl text-white flex items-center justify-between shadow-lg">
                                            <div className="flex items-center gap-3"><ShoppingCart size={18} className="text-blue-200" /><span className="text-[10px] font-black uppercase tracking-widest">Order Sync Registry</span></div>
                                            <select className="bg-white/10 border-none p-2 rounded-lg text-[10px] font-bold outline-none cursor-pointer" onChange={e => { const [t, n] = e.target.value.split('|'); handleOrderSelection(n, t === 'WITH' ? 'WITH_ORDER' : 'WITHOUT_ORDER'); }}>
                                                <option value="" className="text-slate-900">Pull from booking registry...</option>
                                                {listData.orders.map(o => <option className="text-slate-900" key={o.id} value={`WITH|${o.order_no}`}>Sales Order: {o.order_no} | {o.Party?.account_name}</option>)}
                                                {listData.directOrders.map(o => <option className="text-slate-900" key={o.id} value={`DIRECT|${o.order_no}`}>Direct Bill: {o.order_no}</option>)}
                                            </select>
                                        </div>
                                        
                                        <div className="flex-1 overflow-x-auto border rounded-xl bg-white shadow-sm">
                                            <table className="min-w-[3200px] text-left border-collapse">
                                                <thead className="bg-slate-900 text-white text-[9px] font-black uppercase tracking-widest sticky top-0 z-10">
                                                    <tr>
                                                        <th className="p-4 w-60">Product SKU</th>
                                                        <th className="p-4 w-28 text-center">Packs</th>
                                                        <th className="p-4 w-28 text-center">Type</th>
                                                        <th className="p-4 w-32 text-center">Net Kgs</th>
                                                        <th className="p-4 w-28 text-center">Avg Cont</th>
                                                        <th className="p-4 w-28 text-center">Rate</th>
                                                        <th className="p-4 w-24 text-center">Per</th>
                                                        <th className="p-4 w-40 text-center">ID Mark</th>
                                                        <th className="p-4 w-24 text-center">From</th>
                                                        <th className="p-4 w-24 text-center">To</th>
                                                        <th className="p-4 w-20 text-center">Hank</th>
                                                        <th className="p-4 w-20 text-center">Cone</th>
                                                        <th className="p-4 w-32 text-center bg-blue-950/40">Assessable</th>
                                                        <th className="p-4 w-28 text-center bg-blue-950/40">Tax (IGST)</th>
                                                        <th className="p-4 w-40 text-center bg-emerald-950/40 text-emerald-400">Net Row</th>
                                                        <th className="p-4 w-40 text-center">Broker</th>
                                                        <th className="p-4 w-24 text-center">Br %</th>
                                                        <th className="p-4 w-12 sticky right-0 bg-slate-900"></th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100 font-mono">
                                                    {gridRows.map((row, idx) => (
                                                        <tr key={idx} className="hover:bg-blue-50/20 transition-colors">
                                                            <td className="p-2"><select disabled={!!row.order_no} className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-[11px] font-bold outline-none" value={row.product_id} onChange={e => handleProductSelectInGrid(idx, e.target.value)}><option value="">-- Choose SKU --</option>{listData.products.map(p => <option key={p.id} value={p.id}>{p.product_name}</option>)}</select></td>
                                                            <td className="p-2"><input type="number" className="w-full p-2 text-center text-xs font-bold outline-none" value={row.packs} onChange={e => updateGrid(idx, 'packs', e.target.value)} /></td>
                                                            <td className="p-2"><input type="text" className="w-full p-2 text-center text-[10px] font-bold uppercase outline-none" value={row.packing_type} onChange={e => updateGrid(idx, 'packing_type', e.target.value)} /></td>
                                                            <td className="p-2"><input type="number" className="w-full p-2 text-center text-xs font-black text-blue-600 outline-none" value={row.total_kgs} onChange={e => updateGrid(idx, 'total_kgs', e.target.value)} /></td>
                                                            <td className="p-2"><input type="number" className="w-full p-2 text-center text-xs outline-none" value={row.avg_content} onChange={e => updateGrid(idx, 'avg_content', e.target.value)} /></td>
                                                            <td className="p-2"><input type="number" className="w-full p-2 text-center text-xs font-black text-blue-600 outline-none" value={row.rate} onChange={e => updateGrid(idx, 'rate', e.target.value)} /></td>
                                                            <td className="p-2"><input type="text" className="w-full p-2 text-center text-[10px] uppercase outline-none" value={row.rate_per} onChange={e => updateGrid(idx, 'rate_per', e.target.value)} /></td>
                                                            <td className="p-2"><input type="text" className="w-full p-2 text-center text-[10px] uppercase outline-none" value={row.identification_mark} onChange={e => updateGrid(idx, 'identification_mark', e.target.value)} /></td>
                                                            <td className="p-2"><input type="text" className="w-full p-2 text-center text-[10px] outline-none" value={row.from_no} onChange={e => updateGrid(idx, 'from_no', e.target.value)} /></td>
                                                            <td className="p-2"><input type="text" className="w-full p-2 text-center text-[10px] outline-none" value={row.to_no} onChange={e => updateGrid(idx, 'to_no', e.target.value)} /></td>
                                                            <td className="p-2 text-center"><input type="checkbox" checked={row.convert_to_hank} onChange={e => updateGrid(idx, 'convert_to_hank', e.target.checked)} /></td>
                                                            <td className="p-2 text-center"><input type="checkbox" checked={row.convert_to_cone} onChange={e => updateGrid(idx, 'convert_to_cone', e.target.checked)} /></td>
                                                            <td className="p-2 text-center font-bold text-slate-500 bg-slate-50">₹{parseFloat(row.assessable_value || 0).toLocaleString()}</td>
                                                            <td className="p-2 text-center font-bold text-slate-500 bg-slate-50">₹{parseFloat(row.igst_amt || 0).toLocaleString()}</td>
                                                            <td className="p-2 text-center font-black text-slate-900 bg-emerald-50 text-base">₹{parseFloat(row.final_value || 0).toLocaleString()}</td>
                                                            <td className="p-2"><input type="text" className="w-full p-2 text-center text-[10px] outline-none" value={row.broker_code} onChange={e => updateGrid(idx, 'broker_code', e.target.value)} /></td>
                                                            <td className="p-2"><input type="number" className="w-full p-2 text-center text-[10px] outline-none" value={row.broker_percentage} onChange={e => updateGrid(idx, 'broker_percentage', e.target.value)} /></td>
                                                            <td className="p-2 sticky right-0 bg-white"><button onClick={() => setGridRows(gridRows.filter((_, i) => i !== idx))} className="text-slate-300 hover:text-red-500"><MinusCircle size={18}/></button></td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                        <button onClick={() => setGridRows([...gridRows, { product_id: '', packs: 0, packing_type: '', total_kgs: 0, avg_content: 0, rate: 0, rate_per: 'Kg', identification_mark: '', from_no: '', to_no: '', resale: false, convert_to_hank: false, convert_to_cone: false, assessable_value: 0, charity_amt: 0, igst_amt: 0, final_value: 0 }])} className="w-full p-4 bg-slate-100 text-blue-600 text-[10px] font-black uppercase tracking-widest hover:bg-blue-100 transition-all">+ Add Empty Specification Row</button>
                                    </div>
                                )}
                            </div>

                            {/* RIGHT SIDE: Financial Cockpit */}
                            <div className="w-full lg:w-96 bg-slate-900 rounded-2xl p-6 text-white flex flex-col justify-between shadow-2xl shrink-0">
                                <div className="space-y-4">
                                    <div className="text-center mb-6">
                                        <Activity size={32} className="text-blue-400 mx-auto mb-1" />
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Financial Ledger Dashboard</p>
                                    </div>

                                    <div className="space-y-3">
                                        <LedgerRow label="Assessable Value" value={formData.total_assessable} />
                                        <LedgerRow label="Charity Collection" value={formData.total_charity} />
                                        <LedgerRow label="Taxation (IGST)" value={formData.total_igst} color="text-emerald-400" />
                                        <div className="space-y-1">
                                            <label className="text-[8px] font-black text-slate-500 uppercase block tracking-tighter">Manual Round Off</label>
                                            <input type="number" step="0.01" className="w-full bg-white/5 border border-white/5 rounded-lg p-2 text-right text-xs font-bold font-mono outline-none focus:border-blue-500" value={formData.round_off} onChange={e => setFormData({...formData, round_off: e.target.value})} />
                                        </div>
                                        <div className="pt-3 border-t border-white/5">
                                            <LedgerRow label="Sub Total [I]" value={formData.sub_total} color="text-blue-400" />
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-8 p-6 bg-blue-600/10 rounded-3xl border border-blue-500/20 text-center relative overflow-hidden group">
                                    <Database className="absolute -right-2 -bottom-2 text-white/5 group-hover:scale-110 transition-transform" size={80} />
                                    <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1 relative z-10">Net Document Value</p>
                                    <h3 className="text-3xl font-black text-white font-mono relative z-10">₹ {parseFloat(formData.net_amount).toLocaleString()}</h3>
                                </div>
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="p-6 bg-slate-50 border-t flex justify-end items-center gap-4 shrink-0">
                            <button onClick={() => setIsModalOpen(false)} className="px-8 py-3 font-bold text-slate-400 hover:text-slate-600 text-xs tracking-widest uppercase transition-colors">Discard</button>
                            <button onClick={handleSave} disabled={submitLoading || gridRows.length === 0} className="bg-blue-600 hover:bg-blue-700 text-white px-10 py-3 rounded-xl font-black shadow-xl flex items-center gap-2 active:scale-95 transition-all text-xs tracking-widest uppercase">
                                <Save size={18}/> {submitLoading ? 'DEPLOYING...' : 'FINALIZE & POST'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Hidden Print Template */}
            <div style={{ position: "absolute", top: "-9999px" }}>
                <TaxInvoiceTemplate ref={printRef} data={printData} />
            </div>

            <style jsx>{`
                input[type='number']::-webkit-inner-spin-button, 
                input[type='number']::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
                ::-webkit-scrollbar { width: 5px; height: 5px; }
                ::-webkit-scrollbar-track { background: transparent; }
                ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
                .overflow-x-auto::-webkit-scrollbar { height: 12px; }
            `}</style>
        </div>
    );
};

// HELPER COMPONENTS
const SectionHeader = ({ icon: Icon, title }) => (
    <h4 className="text-blue-600 font-black text-[11px] uppercase tracking-[0.2em] border-b border-blue-50 pb-2 flex items-center gap-2">
        <Icon size={14}/> {title}
    </h4>
);

const LedgerRow = ({ label, value, color = "text-slate-400" }) => (
    <div className="flex justify-between items-center border-b border-white/5 pb-2">
        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{label}</span>
        <span className={`font-mono text-sm font-bold ${color}`}>₹{parseFloat(value || 0).toLocaleString()}</span>
    </div>
);

const InputField = ({ label, icon: Icon, className = "", ...props }) => (
    <div className={`space-y-1 ${className}`}>
        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">{label}</label>
        <div className="relative">
            <input {...props} className="w-full bg-white border border-slate-200 p-2 rounded-lg text-xs font-bold outline-none focus:ring-1 focus:ring-blue-500 shadow-inner" />
            {Icon && <Icon className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300" size={14}/>}
        </div>
    </div>
);

const SelectField = ({ label, options, ...props }) => (
    <div className="space-y-1">
        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">{label}</label>
        <select {...props} className="w-full bg-white border border-slate-200 p-2 rounded-lg text-xs font-bold outline-none shadow-inner cursor-pointer hover:border-blue-300 transition-colors">
            <option value="">-- SELECTION --</option>
            {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
    </div>
);

export default InvoicePreparation;