import React, { useState, useEffect, useMemo } from 'react';
import { mastersAPI, transactionsAPI } from '../service/api';
import { 
    Save, FileText, ShoppingBag, Calculator, 
    Warehouse, Users, Link, History, Search, 
    Truck, Plus, Trash2, X, RefreshCw,
    ChevronLeft, ChevronRight, Square, CheckSquare, 
    Edit, MapPin, Package, Clock, ShieldCheck,
    Percent, DollarSign, Info, Filter, Database, 
    Calendar, Activity, ArrowRightCircle, AlertCircle
} from 'lucide-react';

const DepotSalesInvoice = () => {
    // --- Initial States ---
    const emptyInvoice = { 
        id: null,
        invoice_no: '', 
        date: new Date().toISOString().split('T')[0], 
        sales_type: 'DEPOT SALES',
        invoice_type: '',
        depot_id: '', 
        party_id: '', 
        address: '',
        credit_days: 0,
        interest_pct: 0,
        transport_id: '',
        lr_no: '',
        lr_date: new Date().toISOString().split('T')[0],
        vehicle_no: '',
        removal_time: new Date().toISOString().slice(0, 16),
        agent_name: '',
        pay_mode: 'IMMEDIATE',
        remarks: '',
        are_no: '',
        form_jj: '',
        // Value Section Fields
        assessable_value: 0, 
        charity: 0, 
        vat_tax: 0,
        cenvat: 0,
        duty: 0,
        cess: 0,
        hs_cess: 0,
        tcs: 0,
        discount: 0,
        pf_amount: 0,
        freight: 0,
        gst: 0, 
        igst: 0,
        sub_total: 0,
        round_off: 0,
        final_invoice_value: 0
    };

    // --- Main States ---
    const [list, setList] = useState([]);
    const [formData, setFormData] = useState(emptyInvoice);
    const [gridRows, setGridRows] = useState([{ order_no: '', product_id: '', packs: 0, packing_type_id: '', total_kgs: 0, rate: 0, amount: 0, avg_content: 0 }]);
    const [loading, setLoading] = useState(false);
    const [submitLoading, setSubmitLoading] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [activeTab, setActiveTab] = useState('head');

    // Master Data
    const [depots, setDepots] = useState([]);
    const [parties, setParties] = useState([]);
    const [orders, setOrders] = useState([]);
    const [products, setProducts] = useState([]);
    const [transports, setTransports] = useState([]);
    const [brokers, setBrokers] = useState([]);
    const [packingTypes, setPackingTypes] = useState([]); // New state for packing types

    // Search & Selection
    const [searchField, setSearchField] = useState('invoice_no');
    const [searchCondition, setSearchCondition] = useState('Like');
    const [searchValue, setSearchValue] = useState('');
    const [isSelectionMode, setIsSelectionMode] = useState(false);
    const [selectedIds, setSelectedIds] = useState([]);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    // --- EFFECT: Automatic Financial Calculation Engine ---
    useEffect(() => {
        // 1. Calculate Assessable Value from Grid
        const totalAssessable = gridRows.reduce((sum, row) => sum + (parseFloat(row.amount) || 0), 0);

        // 2. Sum up all taxes and charges
        const charity = parseFloat(formData.charity) || 0;
        const vat = parseFloat(formData.vat_tax) || 0;
        const cenvat = parseFloat(formData.cenvat) || 0;
        const duty = parseFloat(formData.duty) || 0;
        const cess = parseFloat(formData.cess) || 0;
        const hs_cess = parseFloat(formData.hs_cess) || 0;
        const tcs = parseFloat(formData.tcs) || 0;
        const pf = parseFloat(formData.pf_amount) || 0;
        const gst = parseFloat(formData.gst) || 0;
        const igst = parseFloat(formData.igst) || 0;
        const discount = parseFloat(formData.discount) || 0;
        const freight = parseFloat(formData.freight) || 0;
        const roundOff = parseFloat(formData.round_off) || 0;

        const subTotal = (totalAssessable + charity + vat + cenvat + duty + cess + hs_cess + tcs + pf + gst + igst) - discount;
        const finalValue = subTotal + freight + roundOff;

        setFormData(prev => ({
            ...prev,
            assessable_value: totalAssessable.toFixed(2),
            sub_total: subTotal.toFixed(2),
            final_invoice_value: finalValue.toFixed(2)
        }));
    }, [
        gridRows, 
        formData.charity, formData.vat_tax, formData.cenvat, formData.duty, 
        formData.cess, formData.hs_cess, formData.tcs, formData.pf_amount, 
        formData.gst, formData.igst, formData.discount, formData.freight, formData.round_off
    ]);

    // --- Initialization ---
    useEffect(() => {
        fetchMasters();
        fetchRecords();
    }, []);

    const fetchMasters = async () => {
        try {
            const [dep, par, ord, pro, tra, bro, pack] = await Promise.all([
                mastersAPI.accounts.getAll({ account_group: 'DEPOT' }),
                mastersAPI.accounts.getAll(),
                transactionsAPI.orders.getAll({ status: 'OPEN' }),
                mastersAPI.products.getAll(),
                mastersAPI.transports.getAll(),
                mastersAPI.brokers.getAll(),
                mastersAPI.packingTypes.getAll() // Fetch from tbl_PackingTypes
            ]);
            setDepots(dep.data.data || []);
            setParties(par.data.data || []);
            setOrders(ord.data.data || []);
            setProducts(pro.data.data || []);
            setTransports(tra.data.data || []);
            setBrokers(bro.data.data || []);
            setPackingTypes(pack.data.data || []);
        } catch (err) { console.error("Master Load Error", err); }
    };

    const fetchRecords = async () => {
        setLoading(true);
        try {
            const res = await transactionsAPI.depotSales.getAll();
            setList(res.data.data || []);
        } catch (err) { console.error("Fetch Error", err); }
        finally { setLoading(false); }
    };

    // --- Action Handlers ---
    const handleAddNew = () => {
        const nextId = list.length > 0 ? Math.max(...list.map(o => o.id)) + 1 : 1;
        setFormData({ ...emptyInvoice, invoice_no: nextId.toString() });
        setGridRows([{ order_no: '', product_id: '', packs: 0, packing_type_id: '', total_kgs: 0, rate: 0, amount: 0, avg_content: 0 }]);
        setActiveTab('head');
        setIsModalOpen(true);
    };

    const updateGrid = (index, field, value) => {
        const updated = [...gridRows];
        updated[index][field] = value;
        
        // Auto Calculate Row Math
        const kgs = parseFloat(updated[index].total_kgs) || 0;
        const rate = parseFloat(updated[index].rate) || 0;
        const packs = parseFloat(updated[index].packs) || 0;

        updated[index].amount = (kgs * rate).toFixed(2);
        updated[index].avg_content = packs > 0 ? (kgs / packs).toFixed(3) : 0;

        setGridRows(updated);
    };

    const handleOrderSync = (orderId) => {
        const order = orders.find(o => o.id === parseInt(orderId));
        if (order) {
            setFormData(prev => ({ ...prev, party_id: order.party_id }));
            const newRows = order.OrderDetails.map(d => ({
                order_no: order.order_no,
                product_id: d.product_id,
                packs: 0,
                packing_type_id: '',
                total_kgs: d.qty,
                rate: d.rate_cr || 0,
                amount: (d.qty * (d.rate_cr || 0)).toFixed(2),
                avg_content: 0
            }));
            setGridRows(newRows);
            setActiveTab('detail');
        }
    };

    const handleSave = async () => {
        if (!formData.depot_id || !formData.party_id) return alert("Source and Destination required");
        setSubmitLoading(true);
        try {
            const payload = { ...formData, Details: gridRows };
            if (formData.id) await transactionsAPI.depotSales.update(formData.id, payload);
            else await transactionsAPI.depotSales.create(payload);
            setIsModalOpen(false);
            fetchRecords();
        } catch (err) { alert("Save failed"); }
        finally { setSubmitLoading(false); }
    };

    // --- Dynamic Filtering Logic ---
    const filteredData = useMemo(() => {
        let result = Array.isArray(list) ? [...list] : [];
        if (searchValue.trim()) {
            result = result.filter(item => {
                let itemValue = "";
                if (searchField === 'party_name') itemValue = item.Party?.account_name || "";
                else itemValue = String(item[searchField] || "");
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
                        <Warehouse className="text-blue-600" /> Depot Sales machine
                    </h1>
                    <p className="text-sm text-slate-500">Secondary distribution and warehouse-to-party ledger</p>
                </div>
                <div className="flex gap-2">
                    <button onClick={() => { setIsSelectionMode(!isSelectionMode); setSelectedIds([]); }}
                        className={`px-5 py-2 border rounded-lg font-semibold transition-all ${isSelectionMode ? 'bg-amber-100 border-amber-300 text-amber-700' : 'bg-white border-slate-200 text-blue-600 hover:bg-slate-50'}`}>
                        {isSelectionMode ? 'Cancel' : 'Select'}
                    </button>
                    <button onClick={handleAddNew} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg font-semibold shadow-sm transition-all active:scale-95">
                        <Plus size={18} /> New Entry
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
                            <option value="invoice_no">Invoice No</option>
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
                            <input type="text" placeholder="Search..." value={searchValue} onChange={(e) => setSearchValue(e.target.value)} className="w-full border border-slate-200 pl-10 pr-4 py-2 rounded-lg text-sm outline-none focus:ring-1 focus:ring-blue-500 bg-white" />
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
                                <th className="p-4 text-sm font-semibold uppercase tracking-wider">Inv #</th>
                                <th className="p-4 text-sm font-semibold uppercase tracking-wider">Date</th>
                                <th className="p-4 text-sm font-semibold uppercase tracking-wider">Source Depot</th>
                                <th className="p-4 text-sm font-semibold uppercase tracking-wider">Receiving Party</th>
                                <th className="p-4 text-sm font-semibold uppercase tracking-wider text-right">Net Value (₹)</th>
                                {!isSelectionMode && <th className="p-4 w-10"></th>}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-mono">
                            {currentItems.map((item) => (
                                <tr key={item.id} onClick={() => handleRowClick(item)} className={`transition-all cursor-pointer hover:bg-blue-50/50 ${selectedIds.includes(item.id) ? 'bg-blue-50' : ''}`}>
                                    {isSelectionMode && (
                                        <td className="p-4 text-center" onClick={(e) => {e.stopPropagation(); handleRowClick(item);}}>
                                            {selectedIds.includes(item.id) ? <CheckSquare size={18} className="text-blue-600 mx-auto"/> : <Square size={18} className="text-slate-200 mx-auto"/>}
                                        </td>
                                    )}
                                    <td className="p-4 text-sm font-black text-blue-600">DEP-{item.invoice_no}</td>
                                    <td className="p-4 text-sm text-slate-500 font-sans">{item.date}</td>
                                    <td className="p-4 text-sm font-bold text-slate-700 uppercase font-sans">{item.Depot?.account_name}</td>
                                    <td className="p-4 text-sm font-bold text-slate-500 uppercase font-sans">{item.Party?.account_name}</td>
                                    <td className="p-4 text-sm font-black text-right text-emerald-600 font-mono">₹{parseFloat(item.final_invoice_value).toLocaleString()}</td>
                                    {!isSelectionMode && <td className="p-4"><Edit size={16} className="text-slate-300" /></td>}
                                </tr>
                            ))}
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
                                <div className="p-2 bg-white/20 rounded-lg"><FileText size={20} /></div>
                                <div>
                                    <h2 className="font-bold uppercase tracking-tight">Depot Sales Transaction Entry</h2>
                                    <p className="text-[10px] font-bold text-blue-100 uppercase">Registry Code: DEP-{formData.invoice_no}</p>
                                </div>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="hover:bg-blue-500 p-1 rounded-full"><X size={24}/></button>
                        </div>

                        {/* Navigation Tabs */}
                        <div className="flex bg-slate-50 border-b px-6">
                            <button onClick={() => setActiveTab('head')} className={`py-4 px-6 text-[10px] font-bold uppercase tracking-widest relative ${activeTab === 'head' ? 'text-blue-600' : 'text-slate-400'}`}>
                                01. Transaction Header {activeTab === 'head' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600"/>}
                            </button>
                            <button onClick={() => setActiveTab('detail')} className={`py-4 px-6 text-[10px] font-bold uppercase tracking-widest relative ${activeTab === 'detail' ? 'text-blue-600' : 'text-slate-400'}`}>
                                02. Sales Grid {activeTab === 'detail' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600"/>}
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="flex-1 overflow-y-auto p-6 flex flex-col lg:flex-row gap-6">
                            
                            {/* LEFT SIDE: Entry Form */}
                            <div className="flex-1 space-y-6">
                                {activeTab === 'head' ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        
                                        {/* SECTION A: IDENTITY */}
                                        <div className="bg-slate-50 p-5 rounded-xl space-y-4 border">
                                            <div className="flex items-center gap-2 mb-2 text-slate-400"><Database size={14}/><span className="text-[9px] font-black uppercase">Metadata</span></div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <InputField label="Invoice No" value={formData.invoice_no} readOnly className="font-mono text-blue-600" />
                                                <InputField label="Date" type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} />
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <InputField label="Sales Type" value={formData.sales_type} readOnly />
                                                <InputField label="Invoice Type" value={formData.invoice_type} placeholder="BHIWANDI GST..." onChange={e => setFormData({...formData, invoice_type: e.target.value.toUpperCase()})} />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-bold text-slate-400 uppercase">Depot Name (Source)</label>
                                                <select value={formData.depot_id} onChange={e => setFormData({...formData, depot_id: e.target.value})} className="w-full bg-white border border-slate-200 p-2 rounded-lg text-sm font-bold">
                                                    <option value="">-- Choose Depot --</option>
                                                    {depots.map(d => <option key={d.id} value={d.id}>{d.account_name}</option>)}
                                                </select>
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-bold text-slate-400 uppercase">Party Name (Receiver)</label>
                                                <select value={formData.party_id} onChange={e => setFormData({...formData, party_id: e.target.value})} className="w-full bg-white border border-slate-200 p-2 rounded-lg text-sm font-bold">
                                                    <option value="">-- Choose Party --</option>
                                                    {parties.map(p => <option key={p.id} value={p.id}>{p.account_name}</option>)}
                                                </select>
                                            </div>
                                        </div>

                                        {/* SECTION B: LOGISTICS */}
                                        <div className="bg-slate-50 p-5 rounded-xl space-y-4 border">
                                            <div className="flex items-center gap-2 mb-2 text-slate-400"><Truck size={14}/><span className="text-[9px] font-black uppercase">Fleet & Logistics</span></div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-1">
                                                    <label className="text-[10px] font-bold text-slate-400 uppercase">Transport</label>
                                                    <select value={formData.transport_id} onChange={e => setFormData({...formData, transport_id: e.target.value})} className="w-full bg-white border border-slate-200 p-2 rounded-lg text-sm font-bold">
                                                        <option value="">-- Select --</option>
                                                        {transports.map(t => <option key={t.id} value={t.id}>{t.transport_name}</option>)}
                                                    </select>
                                                </div>
                                                <InputField label="Vehicle No" value={formData.vehicle_no} onChange={e => setFormData({...formData, vehicle_no: e.target.value.toUpperCase()})} />
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <InputField label="LR No" value={formData.lr_no} onChange={e => setFormData({...formData, lr_no: e.target.value})} />
                                                <InputField label="LR Date" type="date" value={formData.lr_date} onChange={e => setFormData({...formData, lr_date: e.target.value})} />
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <InputField label="Removal Time" type="datetime-local" value={formData.removal_time} onChange={e => setFormData({...formData, removal_time: e.target.value})} />
                                                <InputField label="ARE No" value={formData.are_no} onChange={e => setFormData({...formData, are_no: e.target.value})} />
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <InputField label="Form JJ" value={formData.form_jj} onChange={e => setFormData({...formData, form_jj: e.target.value})} />
                                                <div className="space-y-1">
                                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Agent Name</label>
                                                    <select 
                                                        value={formData.agent_name} 
                                                        onChange={e => setFormData({...formData, agent_name: e.target.value})} 
                                                        className="w-full bg-white border border-slate-200 p-2 rounded-lg text-xs font-bold outline-none focus:ring-1 focus:ring-blue-500 appearance-none"
                                                    >
                                                        <option value="">-- Choose Agent --</option>
                                                        {brokers.map(b => <option key={b.id} value={b.broker_name}>{b.broker_name}</option>)}
                                                    </select>
                                                </div>
                                            </div>
                                        </div>

                                        {/* SECTION C: CREDIT TERMS */}
                                        <div className="bg-slate-50 p-5 rounded-xl space-y-4 border md:col-span-2">
                                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                                <div className="space-y-1">
                                                    <label className="text-[10px] font-bold text-slate-400 uppercase">PayMode</label>
                                                    <select value={formData.pay_mode} onChange={e => setFormData({...formData, pay_mode: e.target.value})} className="w-full bg-white border border-slate-200 p-2 rounded-lg text-sm font-bold">
                                                        <option>IMMEDIATE</option>
                                                        <option>CREDIT</option>
                                                    </select>
                                                </div>
                                                <InputField label="Credit Days" type="number" value={formData.credit_days} onChange={e => setFormData({...formData, credit_days: e.target.value})} />
                                                <InputField label="Interest %" type="number" value={formData.interest_pct} onChange={e => setFormData({...formData, interest_pct: e.target.value})} />
                                                <InputField label="Remarks" value={formData.remarks} onChange={e => setFormData({...formData, remarks: e.target.value})} />
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        <div className="bg-blue-600 p-4 rounded-xl text-white flex items-center justify-between shadow-lg">
                                            <div className="flex items-center gap-3"><ShoppingBag size={18} className="text-blue-200" /><span className="text-[10px] font-black uppercase tracking-widest">Order Sync Engine</span></div>
                                            <select className="bg-white/10 border-none p-2 rounded-lg text-[10px] font-bold outline-none cursor-pointer" onChange={(e) => handleOrderSync(e.target.value)}>
                                                <option value="" className="text-slate-900">Pull from booking order...</option>
                                                {orders.map(o => <option className="text-slate-900" key={o.id} value={o.id}>{o.order_no} | {o.Party?.account_name}</option>)}
                                            </select>
                                        </div>
                                        <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm bg-white">
                                            <table className="w-full border-collapse">
                                                <thead className="bg-slate-900 text-white text-[9px] uppercase font-bold tracking-widest">
                                                    <tr>
                                                        <th className="p-3 text-left">Product Selection</th>
                                                        <th className="p-3 text-center">Packs</th>
                                                        <th className="p-3 text-center">Type</th>
                                                        <th className="p-3 text-center">Total Kgs</th>
                                                        <th className="p-3 text-center">Rate</th>
                                                        <th className="p-3 text-center">Avg Content</th>
                                                        <th className="p-3 w-10"></th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100 font-mono">
                                                    {gridRows.map((row, idx) => (
                                                        <tr key={idx} className="hover:bg-slate-50">
                                                            <td className="p-2">
                                                                <select value={row.product_id} onChange={e => updateGrid(idx, 'product_id', e.target.value)} className="w-full p-2 text-xs font-bold outline-none bg-transparent font-sans">
                                                                    <option value="">-- Choose SKU --</option>
                                                                    {products.map(p => <option key={p.id} value={p.id}>{p.product_name}</option>)}
                                                                </select>
                                                            </td>
                                                            <td className="p-2"><input type="number" value={row.packs} onChange={e => updateGrid(idx, 'packs', e.target.value)} className="w-full p-2 text-center text-xs font-bold outline-none" /></td>
                                                            <td className="p-2">
                                                                <select value={row.packing_type_id} onChange={e => updateGrid(idx, 'packing_type_id', e.target.value)} className="w-full p-2 text-[10px] font-bold outline-none bg-transparent">
                                                                    <option value="">-- Select --</option>
                                                                    {packingTypes.map(pt => <option key={pt.id} value={pt.id}>{pt.packing_type}</option>)}
                                                                </select>
                                                            </td>
                                                            <td className="p-2"><input type="number" value={row.total_kgs} onChange={e => updateGrid(idx, 'total_kgs', e.target.value)} className="w-full p-2 text-center text-sm font-bold outline-none" /></td>
                                                            <td className="p-2"><input type="number" value={row.rate} onChange={e => updateGrid(idx, 'rate', e.target.value)} className="w-full p-2 text-center text-sm font-black text-blue-600 outline-none" /></td>
                                                            <td className="p-2 text-center text-xs font-bold text-slate-400">{row.avg_content}</td>
                                                            <td className="p-2">
                                                                <button onClick={() => setGridRows(gridRows.filter((_, i) => i !== idx))} className="text-slate-300 hover:text-red-500"><MinusCircle size={18}/></button>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                            <button onClick={() => setGridRows([...gridRows, { order_no: '', product_id: '', packs: 0, packing_type_id: '', total_kgs: 0, rate: 0, amount: 0, avg_content: 0 }])} className="w-full p-4 bg-slate-50 text-blue-600 text-[10px] font-black uppercase tracking-widest hover:bg-blue-100 transition-all flex justify-center items-center gap-2">+ Append Line</button>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* RIGHT SIDE: Financial Cockpit */}
                            <div className="w-full lg:w-96 bg-slate-900 rounded-2xl p-6 text-white flex flex-col justify-between shadow-2xl">
                                <div className="space-y-4">
                                    <div className="text-center mb-6">
                                        <Activity size={32} className="text-blue-400 mx-auto mb-1" />
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Financial Ledger Dashboard</p>
                                    </div>

                                    <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                                        <LedgerInput label="Assessable Value" value={formData.assessable_value} onChange={val => setFormData({...formData, assessable_value: val})} />
                                        <LedgerInput label="Charity" value={formData.charity} onChange={val => setFormData({...formData, charity: val})} />
                                        <LedgerInput label="VAT Tax" value={formData.vat_tax} onChange={val => setFormData({...formData, vat_tax: val})} />
                                        <LedgerInput label="Cenvat" value={formData.cenvat} onChange={val => setFormData({...formData, cenvat: val})} />
                                        <LedgerInput label="Duty" value={formData.duty} onChange={val => setFormData({...formData, duty: val})} />
                                        <LedgerInput label="Cess" value={formData.cess} onChange={val => setFormData({...formData, cess: val})} />
                                        <LedgerInput label="H.S. Cess" value={formData.hs_cess} onChange={val => setFormData({...formData, hs_cess: val})} />
                                        <LedgerInput label="TCS" value={formData.tcs} onChange={val => setFormData({...formData, tcs: val})} />
                                        <LedgerInput label="Discount" value={formData.discount} onChange={val => setFormData({...formData, discount: val})} />
                                        <LedgerInput label="PF Amount" value={formData.pf_amount} onChange={val => setFormData({...formData, pf_amount: val})} />
                                        <LedgerInput label="Freight" value={formData.freight} onChange={val => setFormData({...formData, freight: val})} />
                                        <LedgerInput label="GST" value={formData.gst} color="text-amber-400" onChange={val => setFormData({...formData, gst: val})} />
                                        <LedgerInput label="IGST" value={formData.igst} color="text-amber-400" onChange={val => setFormData({...formData, igst: val})} />
                                    </div>
                                    
                                    <div className="pt-4 space-y-3 border-t border-white/5 mt-4">
                                        <div className="flex justify-between items-center text-xs font-bold"><span className="text-slate-500 uppercase">Sub Total</span><span className="font-mono tracking-tighter">₹ {formData.sub_total}</span></div>
                                        <div className="flex justify-between items-center text-xs font-bold"><span className="text-slate-500 uppercase">Round off</span><input type="number" step="0.01" className="w-20 bg-transparent border-b border-slate-700 text-right font-mono" value={formData.round_off} onChange={e => setFormData({...formData, round_off: e.target.value})} /></div>
                                    </div>
                                </div>

                                <div className="mt-8 p-6 bg-blue-600/10 rounded-3xl border border-blue-500/20 text-center relative overflow-hidden group">
                                    <Database className="absolute -right-2 -bottom-2 text-white/5 group-hover:scale-110 transition-transform" size={80} />
                                    <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1 relative z-10">Net Document Value</p>
                                    <h3 className="text-3xl font-black text-white font-mono relative z-10">₹ {formData.final_invoice_value}</h3>
                                </div>
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="p-6 bg-slate-50 border-t flex justify-end items-center gap-4">
                            <button onClick={() => setIsModalOpen(false)} className="px-8 py-3 font-bold text-slate-400 hover:text-slate-600 text-xs tracking-widest uppercase transition-colors">Discard</button>
                            <button onClick={handleSave} disabled={submitLoading} className="bg-blue-600 hover:bg-blue-700 text-white px-10 py-3 rounded-xl font-black shadow-xl flex items-center gap-2 active:scale-95 transition-all text-xs tracking-widest uppercase">
                                <Save size={18}/> {submitLoading ? 'SAVING...' : 'FINALIZE & POST'}
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
        <input {...props} className="w-full bg-white border border-slate-200 p-2 rounded-lg text-xs font-bold outline-none focus:ring-1 focus:ring-blue-500" />
    </div>
);

const LedgerInput = ({ label, value, color = "text-white", onChange }) => (
    <div className="space-y-1">
        <label className="text-[8px] font-black text-slate-500 uppercase block tracking-tighter">{label}</label>
        <input type="number" step="0.01" className={`w-full bg-white/5 border border-white/5 rounded-lg p-1.5 text-right text-xs font-bold font-mono outline-none focus:border-blue-500 ${color}`} value={value} onChange={e => onChange(e.target.value)} />
    </div>
);

const MinusCircle = ({ size, className }) => ( <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><circle cx="12" cy="12" r="10"/><line x1="8" y1="12" x2="16" y2="12"/></svg> );

export default DepotSalesInvoice;