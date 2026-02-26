import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useReactToPrint } from 'react-to-print';
import { mastersAPI, transactionsAPI, reportsAPI } from '../service/api';
import TaxInvoiceTemplate from '../print/TaxInvoiceTemplate';
import { 
    Save, FileText, Printer, Search, Calculator, RefreshCw, 
    Truck, Info, X, Plus, Trash2, Database, MinusCircle, 
    CheckCircle2, MapPin, Hash, User, Settings, Layers, Box, 
    Percent, Tag, Clock, ShieldCheck, Lock
} from 'lucide-react';

const InvoicePreparation = () => {
    // --- UI & LOADING STATES ---
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [activeTab, setActiveTab] = useState('head');
    const [loading, setLoading] = useState(false);
    const [searchValue, setSearchValue] = useState('');

    // --- DATA REPOSITORY ---
    const [listData, setListData] = useState({ 
        types: [], parties: [], transports: [], 
        products: [], orders: [], directOrders: [], history: [], loads: [] 
    });

    // --- FORM STATES (InvoiceHeader Model) ---
    const emptyInvoice = {
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

    const [formData, setFormData] = useState(emptyInvoice);
    const [gridRows, setGridRows] = useState([]);

    // --- PRINTING ---
    const [printData, setPrintData] = useState(null);
    const printRef = useRef();
    const handlePrintAction = useReactToPrint({ 
        contentRef: printRef,
        onAfterPrint: () => setPrintData(null)
    });

    // --- FORMULA ENGINE ---
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

    // --- DATA FETCHING ---
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

    // --- AUTO-INCREMENT INVOICE NO ---
    const generateNextInvoiceNo = () => {
        if (!listData.history.length) return "1001";
        const maxId = Math.max(...listData.history.map(h => {
            const num = parseInt(h.invoice_no);
            return isNaN(num) ? 0 : num;
        }));
        return (maxId + 1).toString();
    };

    // --- HANDLERS ---
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
            packs: product?.no_of_cones_per_pack || 0, // Fetch packs from Master
            rate_per: 'Kg'
        };
        setGridRows(runCalculations(updated, formData.invoice_type_id));
    };

    const handleOrderSelection = (orderNo, type) => {

    let order =
        type === 'WITH_ORDER'
            ? listData.orders.find(o => o.order_no === orderNo)
            : listData.directOrders.find(o => o.order_no === orderNo);

    if (!order) return;

    // 🔥 FIX HERE
    const details =
        type === 'WITH_ORDER'
            ? order.OrderDetails || []
            : order.DirectInvoiceDetails || [];

    const newRows = details.map(d => {
        const masterProduct = listData.products.find(p => p.id === d.product_id);

        return {
            order_no: orderNo,
            order_type: type,

            product_id: d.product_id,
            broker_code: order.Broker?.broker_code || '',
            broker_percentage: order.Broker?.commission_pct || 0,

            product_description: masterProduct?.product_name || '',

            packs: d.packs || masterProduct?.no_of_cones_per_pack || 0,
            packing_type: d.packing_type || masterProduct?.packing_type || '',

            total_kgs: d.qty || d.total_kgs || 0,

            rate: d.rate_cr || d.rate || 0,
            rate_per: 'Kg',

            identification_mark: '',
            from_no: '',
            to_no: '',

            resale: false,
            convert_to_hank: false,
            convert_to_cone: false
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
        if (!formData.party_id || !formData.load_id) return alert("Selection Required: Customer and Load Number.");
        setLoading(true);
        try {
            await transactionsAPI.invoices.create({ ...formData, Details: gridRows });
            setIsModalOpen(false); fetchInitialData();
        } catch (e) { alert("Deployment Error"); } finally { setLoading(false); }
    };

    const filteredHistory = useMemo(() => {
        const data = Array.isArray(listData.history) ? listData.history : [];
        return data.filter(h => 
            h.invoice_no?.toLowerCase().includes(searchValue.toLowerCase()) || 
            h.Party?.account_name?.toLowerCase().includes(searchValue.toLowerCase())
        ).sort((a, b) => b.id - a.id);
    }, [listData.history, searchValue]);

    return (
        <div className="min-h-screen bg-slate-50 p-8 font-sans text-slate-900">
            {/* Registry Screen */}
            <div className="flex justify-between items-end mb-8">
                <div>
                    <h1 className="text-3xl font-black text-slate-800 flex items-center gap-3">
                        <FileText className="text-blue-600" size={36}/> INVOICE REGISTRY
                    </h1>
                    <p className="text-slate-500 font-medium">Automatic Sequential Preparation & Stock Sync</p>
                </div>
                <div className="flex gap-3">
                    <button onClick={() => { setFormData({...emptyInvoice, invoice_no: generateNextInvoiceNo()}); setGridRows([]); setIsModalOpen(true); }} className="bg-slate-900 text-white px-10 py-4 rounded-3xl font-black flex items-center gap-2 hover:bg-blue-600 transition-all shadow-xl active:scale-95 text-xs uppercase tracking-widest"><Plus size={20}/> New Preparation</button>
                    <button onClick={fetchInitialData} className="p-4 bg-white border border-slate-200 rounded-3xl shadow-sm"><RefreshCw size={20} className={loading ? 'animate-spin' : ''}/></button>
                </div>
            </div>

            <div className="bg-white rounded-[3rem] border border-slate-200 shadow-2xl overflow-hidden">
                <div className="p-8 border-b bg-slate-50/50 flex justify-between items-center gap-4">
                    <div className="flex items-center gap-4 bg-white border px-6 py-3 rounded-2xl w-full max-w-md shadow-sm">
                        <Search size={18} className="text-slate-400"/>
                        <input type="text" placeholder="Filter invoices..." className="flex-1 outline-none text-sm font-bold bg-transparent" value={searchValue} onChange={e => setSearchValue(e.target.value)} />
                    </div>
                </div>
                <table className="w-full text-left">
                    <thead className="bg-slate-900 text-white text-[10px] font-black uppercase tracking-[0.2em]">
                        <tr>
                            <th className="px-10 py-6">Status</th>
                            <th className="px-6 py-6">Invoice #</th>
                            <th className="px-6 py-6">Date</th>
                            <th className="px-6 py-6">Consignee</th>
                            <th className="px-6 py-6 text-right">Net Value</th>
                            <th className="px-10 py-6 text-center">Operation</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {filteredHistory.map(item => (
                            <tr key={item.id} className="hover:bg-blue-50/30 transition-colors group">
                                <td className="px-10 py-6"><span className={`px-4 py-1.5 rounded-full text-[9px] font-black tracking-widest ${item.is_approved ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' : 'bg-amber-100 text-amber-700 border border-amber-200'}`}>{item.is_approved ? 'APPROVED' : 'PENDING'}</span></td>
                                <td className="px-6 py-6 font-mono font-black text-blue-600">#{item.invoice_no}</td>
                                <td className="px-6 py-6 text-slate-500 font-bold text-xs">{item.date}</td>
                                <td className="px-6 py-6">
                                    <div className="font-black text-slate-800 uppercase tracking-tight text-xs">{item.Party?.account_name}</div>
                                    <div className="text-[10px] text-slate-400 font-bold uppercase">{item.Party?.place}</div>
                                </td>
                                <td className="px-6 py-6 text-right font-black text-slate-950 text-xl">₹{parseFloat(item.net_amount).toLocaleString()}</td>
                                <td className="px-10 py-6">
                                    <div className="flex justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button className="p-3 bg-white border rounded-xl text-slate-400 hover:text-blue-600"><Printer size={16}/></button>
                                        <button className="p-3 bg-white border rounded-xl text-slate-400 hover:text-red-600"><Trash2 size={16}/></button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* PREPARATION MODAL */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4">
                    <div className="bg-white rounded-[4rem] shadow-2xl w-full max-w-[98vw] overflow-hidden flex flex-col h-[96vh] animate-in fade-in zoom-in duration-300">
                        
                        <div className="bg-slate-900 p-8 flex justify-between items-center shrink-0">
                            <div className="flex items-center gap-6">
                                <div className="p-4 bg-blue-600 rounded-3xl text-white shadow-xl"><Calculator size={32}/></div>
                                <div>
                                    <h2 className="text-white font-black text-xl tracking-tight uppercase">Invoice Cockpit</h2>
                                    <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.3em]">Sequential Protocol v2.4</p>
                                </div>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="text-slate-500 hover:text-white p-2 transition-all"><X size={40}/></button>
                        </div>

                        <div className="flex border-b px-16 bg-slate-50 shrink-0">
                            <button onClick={() => setActiveTab('head')} className={`py-8 px-12 flex items-center gap-3 text-[11px] font-black uppercase tracking-[0.2em] transition-all border-b-4 ${activeTab === 'head' ? 'text-blue-600 border-blue-600 bg-white' : 'text-slate-400 border-transparent hover:text-slate-600'}`}><Box size={16}/> 01 Head Configuration</button>
                            <button onClick={() => setActiveTab('detail')} className={`py-8 px-12 flex items-center gap-3 text-[11px] font-black uppercase tracking-[0.2em] transition-all border-b-4 ${activeTab === 'detail' ? 'text-blue-600 border-blue-600 bg-white' : 'text-slate-400 border-transparent hover:text-slate-600'}`}><Layers size={16}/> 02 Detailed Itemization</button>
                        </div>

                        <div className="flex-1 overflow-hidden flex">
                            {/* TAB 01: HEAD */}
                            <div className={`flex-1 overflow-y-auto p-16 bg-white ${activeTab === 'head' ? 'block' : 'hidden'}`}>
                                <div className="grid grid-cols-4 gap-x-12 gap-y-10">
                                    <div className="space-y-8">
                                        <SectionHeader icon={Tag} title="Core Identifiers"/>
                                        <InputField label="Next Sequential Invoice #" value={formData.invoice_no} readOnly icon={Lock} />
                                        <InputField label="Document Date" type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} />
                                        <SelectField label="Sales Category" value={formData.sales_type} options={[{value:'GST SALES', label:'GST SALES'},{value:'CST SALES', label:'CST SALES'}]} onChange={e => setFormData({...formData, sales_type: e.target.value})} />
                                        <SelectField label="Invoice Engine" value={formData.invoice_type_id} options={listData.types.map(t => ({value: t.id, label: t.type_name}))} onChange={e => { setFormData({...formData, invoice_type_id: e.target.value}); setGridRows(runCalculations(gridRows, e.target.value)); }} />
                                    </div>

                                    <div className="space-y-8">
                                        <SectionHeader icon={User} title="Party & Snapshot"/>
                                        <SelectField label="Consignee (Party ID)" value={formData.party_id} options={listData.parties.map(p => ({value: p.id, label: p.account_name}))} onChange={e => handlePartyChange(e.target.value)} />
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Address Snapshot</label>
                                            <textarea readOnly value={formData.address} className="w-full h-24 bg-slate-50 border-2 border-slate-100 p-4 rounded-3xl text-[11px] font-bold text-slate-500 resize-none outline-none" placeholder="FETCHED FROM ACCOUNT MASTER"/>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <InputField label="Credit Days" type="number" value={formData.credit_days} onChange={e => setFormData({...formData, credit_days: e.target.value})} />
                                            <InputField label="Interest %" type="number" value={formData.interest_percentage} onChange={e => setFormData({...formData, interest_percentage: e.target.value})} />
                                        </div>
                                        <SelectField label="Payment Mode" value={formData.pay_mode} options={[{value:'Cash', label:'Cash'},{value:'Credit', label:'Credit'}]} onChange={e => setFormData({...formData, pay_mode: e.target.value})} />
                                    </div>

                                    <div className="space-y-8">
                                        <SectionHeader icon={Truck} title="Logistics Data (Locked)"/>
                                        <SelectField label="Load Number Link" value={formData.load_id} options={listData.loads.map(l => ({value: l.id, label: `Load #${l.load_no} | ${l.vehicle_no}`}))} onChange={e => handleLoadChange(e.target.value)} />
                                        <SelectField label="Transport Carrier" value={formData.transport_id} readOnly options={listData.transports.map(t => ({value: t.id, label: t.transport_name}))} />
                                        <InputField label="Vehicle Registration" value={formData.vehicle_no} readOnly icon={Lock} />
                                        <InputField label="Delivery Destination" value={formData.delivery} readOnly icon={Lock} />
                                        <div className="grid grid-cols-2 gap-4">
                                            <InputField label="LR Number" value={formData.lr_no} readOnly icon={Lock} />
                                            <InputField label="LR Date" type="date" value={formData.lr_date} readOnly icon={Lock} />
                                        </div>
                                    </div>

                                    <div className="space-y-8">
                                        <SectionHeader icon={ShieldCheck} title="Regulatory & Times"/>
                                        <InputField label="E-Way Bill Number" value={formData.ebill_no} onChange={e => setFormData({...formData, ebill_no: e.target.value})} />
                                        <div className="grid grid-cols-2 gap-4">
                                            <InputField label="Prepare Time" type="time" value={formData.prepare_time} onChange={e => setFormData({...formData, prepare_time: e.target.value})} />
                                            <InputField label="Removal Time" type="time" value={formData.removal_time} onChange={e => setFormData({...formData, removal_time: e.target.value})} />
                                        </div>
                                        <InputField label="Sales Against (Form)" value={formData.sales_against} onChange={e => setFormData({...formData, sales_against: e.target.value})} />
                                        <InputField label="EPCG Reg No" value={formData.epcg_no} onChange={e => setFormData({...formData, epcg_no: e.target.value})} />
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Internal Remarks</label>
                                            <textarea value={formData.remarks} onChange={e => setFormData({...formData, remarks: e.target.value})} className="w-full h-24 bg-slate-50 border-2 border-slate-100 p-4 rounded-3xl text-[11px] font-bold outline-none focus:ring-1 focus:ring-blue-500 resize-none"/>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* TAB 02: DETAILS */}
                            <div className={`flex-1 overflow-hidden flex flex-col p-12 bg-white ${activeTab === 'detail' ? 'block' : 'hidden'}`}>
                                <div className="flex gap-4 p-6 bg-blue-50 rounded-[2.5rem] border border-blue-100 items-end mb-8 shrink-0">
                                    <div className="flex-1"><SelectField label="Import Order Items (Registry)" options={[...listData.orders.map(o => ({ value: `WITH|${o.order_no}`, label: `Sales Order: ${o.order_no} | ${o.Party?.account_name}` })), ...listData.directOrders.map(o => ({ value: `DIRECT|${o.order_no}`, label: `Direct Order: ${o.order_no}` }))]} onChange={e => { const [t, n] = e.target.value.split('|'); handleOrderSelection(n, t === 'WITH' ? 'WITH_ORDER' : 'WITHOUT_ORDER'); }} /></div>
                                    <div className="text-[10px] font-black text-blue-400 w-64 uppercase tracking-widest italic pb-3 leading-tight">Selecting an order locks the product specs for integrity.</div>
                                </div>

                                <div className="flex-1 overflow-x-auto border rounded-[3rem] bg-slate-50 shadow-inner relative">
                                    <table className="min-w-[3800px] text-left text-xs bg-white">
                                        <thead className="bg-slate-900 text-white text-[9px] font-black uppercase tracking-[0.2em] sticky top-0 z-20">
                                            <tr>
                                                <th className="p-6 w-64">Product SKU</th><th className="p-6 w-32 text-center">Packs (Fetched)</th><th className="p-6 w-32 text-center">Type</th><th className="p-6 w-32 text-center">Kgs (Net)</th>
                                                <th className="p-6 w-32 text-center">Avg Cont</th><th className="p-6 w-32 text-center">Rate</th><th className="p-6 w-28 text-center">Per</th><th className="p-6 w-48 text-center">ID Mark</th>
                                                <th className="p-6 w-32 text-center">From</th><th className="p-6 w-32 text-center">To</th><th className="p-6 w-24 text-center">Hank</th><th className="p-6 w-24 text-center">Cone</th>
                                                <th className="p-6 w-40 text-center bg-blue-950/40">Assessable</th><th className="p-6 w-32 text-center bg-blue-950/40">Tax (IGST)</th><th className="p-6 w-48 text-center bg-emerald-950/40 text-emerald-400">Final Row</th>
                                                <th className="p-6 w-40 text-center">Broker</th><th className="p-6 w-28 text-center">Br %</th><th className="p-6 w-20 sticky right-0 bg-slate-900"></th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y font-mono">
                                            {gridRows.map((row, idx) => (
                                                <tr key={idx} className="hover:bg-blue-50/20 transition-colors">
                                                    <td className="p-4"><select disabled={!!row.order_no} className="w-full p-3 bg-slate-50 rounded-xl outline-none font-sans font-bold text-[11px] disabled:opacity-70" value={row.product_id} onChange={e => handleProductSelectInGrid(idx, e.target.value)}><option value="">CHOOSE SKU...</option>{listData.products.map(p => <option key={p.id} value={p.id}>{p.product_name}</option>)}</select></td>
                                                    <td className="p-4"><input type="number" readOnly={!!row.order_no} className="w-full p-2 border-b text-center outline-none bg-transparent" value={row.packs} onChange={e => updateGrid(idx, 'packs', e.target.value)} /></td>
                                                    <td className="p-4"><input type="text" readOnly={!!row.order_no} className="w-full p-2 border-b text-center outline-none uppercase bg-transparent" value={row.packing_type} onChange={e => updateGrid(idx, 'packing_type', e.target.value)} /></td>
                                                    <td className="p-4"><input type="number" readOnly={!!row.order_no} className="w-full p-2 border-b text-center outline-none font-black text-blue-600 bg-transparent disabled:opacity-50" value={row.total_kgs} onChange={e => updateGrid(idx, 'total_kgs', e.target.value)} /></td>
                                                    <td className="p-4"><input type="number" className="w-full p-2 border-b text-center outline-none bg-transparent" value={row.avg_content} onChange={e => updateGrid(idx, 'avg_content', e.target.value)} /></td>
                                                    <td className="p-4"><input type="number" readOnly={!!row.order_no} className="w-full p-2 border-b text-center outline-none font-black text-blue-600 bg-transparent" value={row.rate} onChange={e => updateGrid(idx, 'rate', e.target.value)} /></td>
                                                    <td className="p-4"><input type="text" className="w-full p-2 border-b text-center outline-none bg-transparent" value={row.rate_per} onChange={e => updateGrid(idx, 'rate_per', e.target.value)} /></td>
                                                    <td className="p-4"><input type="text" className="w-full p-2 border-b text-center outline-none uppercase bg-transparent" value={row.identification_mark} onChange={e => updateGrid(idx, 'identification_mark', e.target.value)} /></td>
                                                    <td className="p-4"><input type="text" className="w-full p-2 border-b text-center outline-none bg-transparent" value={row.from_no} onChange={e => updateGrid(idx, 'from_no', e.target.value)} /></td>
                                                    <td className="p-4"><input type="text" className="w-full p-2 border-b text-center outline-none bg-transparent" value={row.to_no} onChange={e => updateGrid(idx, 'to_no', e.target.value)} /></td>
                                                    <td className="p-4 text-center"><input type="checkbox" checked={row.convert_to_hank} onChange={e => updateGrid(idx, 'convert_to_hank', e.target.checked)} /></td>
                                                    <td className="p-4 text-center"><input type="checkbox" checked={row.convert_to_cone} onChange={e => updateGrid(idx, 'convert_to_cone', e.target.checked)} /></td>
                                                    <td className="p-4 text-center font-bold text-slate-500 bg-slate-50">₹{parseFloat(row.assessable_value || 0).toLocaleString()}</td>
                                                    <td className="p-4 text-center font-bold text-slate-500 bg-slate-50">₹{parseFloat(row.igst_amt || 0).toLocaleString()}</td>
                                                    <td className="p-4 text-center font-black text-slate-900 bg-emerald-50 text-base">₹{parseFloat(row.final_value || 0).toLocaleString()}</td>
                                                    <td className="p-4"><input type="text" readOnly={!!row.order_no} className="w-full p-2 border-b text-center outline-none bg-transparent" value={row.broker_code} onChange={e => updateGrid(idx, 'broker_code', e.target.value)} /></td>
                                                    <td className="p-4"><input type="number" readOnly={!!row.order_no} className="w-full p-2 border-b text-center outline-none bg-transparent" value={row.broker_percentage} onChange={e => updateGrid(idx, 'broker_percentage', e.target.value)} /></td>
                                                    <td className="p-4 sticky right-0 bg-white"><button onClick={() => setGridRows(gridRows.filter((_, i) => i !== idx))} className="text-red-300 hover:text-red-600 transition-all active:scale-90"><MinusCircle size={28}/></button></td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                    <button onClick={() => setGridRows([...gridRows, { product_id: '', packs: 0, packing_type: '', total_kgs: 0, avg_content: 0, rate: 0, rate_per: 'Kg', identification_mark: '', from_no: '', to_no: '', resale: false, convert_to_hank: false, convert_to_cone: false, assessable_value: 0, charity_amt: 0, igst_amt: 0, final_value: 0 }])} className="sticky left-0 w-full p-8 bg-slate-900 text-white font-black text-[12px] uppercase tracking-[0.4em] hover:bg-blue-600 transition-all">+ Add Blank Entry</button>
                                </div>
                            </div>

                            {/* Aggregates Sidebar */}
                            <div className="w-[550px] bg-slate-900 p-16 flex flex-col justify-between shrink-0">
                                <div className="space-y-8">
                                    <div className="flex items-center gap-3 text-blue-500 mb-10"><Layers size={24}/><h4 className="text-[12px] font-black uppercase tracking-[0.3em]">Financial Matrix</h4></div>
                                    <div className="space-y-4">
                                        <LedgerRow label="Assessable Value" value={formData.total_assessable} />
                                        <LedgerRow label="Charity Collection" value={formData.total_charity} />
                                        <LedgerRow label="Taxation (IGST)" value={formData.total_igst} color="text-emerald-400" />
                                        <LedgerRow label="Manual Round Off" value={formData.round_off} />
                                        <div className="pt-4 border-t border-white/10"><LedgerRow label="Sub Total [I]" value={formData.sub_total} color="text-blue-400" /></div>
                                    </div>
                                </div>
                                <div className="bg-blue-600 p-12 rounded-[4rem] shadow-2xl mt-12 relative overflow-hidden group">
                                    <Database className="absolute -right-10 -bottom-10 text-white/10 group-hover:scale-125 transition-transform duration-700" size={180}/>
                                    <p className="text-[12px] font-black text-blue-100 uppercase tracking-widest mb-4 relative z-10">Net Document Amount</p>
                                    <h2 className="text-6xl font-black text-white font-mono tracking-tighter relative z-10">₹{parseFloat(formData.net_amount).toLocaleString()}</h2>
                                </div>
                            </div>
                        </div>

                        <div className="p-12 bg-slate-50 border-t flex justify-end gap-5 shrink-0">
                            <button onClick={() => setIsModalOpen(false)} className="px-12 py-5 text-slate-400 font-black uppercase text-[11px] tracking-widest hover:text-slate-600">Discard</button>
                            <button onClick={handleSave} disabled={loading || gridRows.length === 0} className="bg-slate-900 text-white px-20 py-6 rounded-[2rem] font-black text-[14px] uppercase tracking-[0.3em] shadow-2xl hover:bg-blue-600 transition-all flex items-center gap-4 active:scale-95 disabled:opacity-50"><Save size={24}/> {loading ? 'DEPLOYING...' : 'FINALIZE & DEPLOY'}</button>
                        </div>
                    </div>
                </div>
            )}

            <div style={{ position: "absolute", top: "-9999px" }}><TaxInvoiceTemplate ref={printRef} data={printData} /></div>

            <style jsx>{`
                input[type='number']::-webkit-inner-spin-button, input[type='number']::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
                .overflow-x-auto::-webkit-scrollbar { height: 16px; }
                .overflow-x-auto::-webkit-scrollbar-track { background: #f1f5f9; border-radius: 10px; }
                .overflow-x-auto::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; border: 4px solid #f1f5f9; }
            `}</style>
        </div>
    );
};

// UI Components
const SectionHeader = ({ icon: Icon, title }) => (<h4 className="text-blue-600 font-black text-[11px] uppercase tracking-[0.2em] border-b-2 border-blue-100 pb-3 flex items-center gap-3"><Icon size={16}/> {title}</h4>);
const LedgerRow = ({ label, value, color = "text-slate-400" }) => (
    <div className="flex justify-between items-center border-b border-white/5 pb-3"><span className="text-[11px] font-black text-slate-500 uppercase tracking-widest">{label}</span><span className={`font-mono text-sm font-bold ${color}`}>₹{parseFloat(value || 0).toLocaleString()}</span></div>
);
const InputField = ({ label, icon: Icon, ...props }) => (
    <div className="space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{label}</label>
        <div className="relative"><input {...props} className="w-full bg-slate-50 border-2 border-slate-200 p-4 rounded-[1.5rem] text-[12px] font-black text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none transition-all shadow-sm disabled:bg-slate-100 disabled:text-slate-500" />
        {Icon && <Icon className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300" size={14}/>}</div>
    </div>
);
const SelectField = ({ label, options, ...props }) => (
    <div className="space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{label}</label>
        <select {...props} className="w-full bg-slate-50 border-2 border-slate-200 p-4 rounded-[1.5rem] text-[12px] font-black text-slate-800 outline-none cursor-pointer hover:border-blue-400 transition-colors shadow-sm disabled:bg-slate-100 disabled:text-slate-500">
            <option value="">-- SELECTION --</option>
            {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
    </div>
);

export default InvoicePreparation;