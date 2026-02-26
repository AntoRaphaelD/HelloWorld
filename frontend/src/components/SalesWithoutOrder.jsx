import React, { useState, useEffect, useMemo } from 'react';
import { mastersAPI, transactionsAPI } from '../service/api';
import { 
    Save, Plus, Trash2, X, Search, Zap, 
    PlusCircle, MinusCircle, MapPin, User, 
    RefreshCw, ChevronLeft, ChevronRight, Edit,
    Square, CheckSquare, Package, Filter,
    Activity, Calculator, Database, Lock, ClipboardList
} from 'lucide-react';

const SalesWithoutOrder = () => {
    // --- Initial States ---
    const emptyHeader = {
        id: null,
        order_no: '',
        date: new Date().toISOString().split('T')[0],
        party_id: '', 
        broker_id: '', 
        place: '', 
        is_cancelled: false,
        is_with_order: false, 
        status: 'OPEN'
    };

    const emptyRow = { 
        product_id: '', 
        packing_type: '', 
        packs: 0, 
        rate_cr: 0, 
        rate_imm: 0, 
        qty: 0,
        rate_per: 'Kg'
    };

    // --- Main States ---
    const [list, setList] = useState([]);
    const [formData, setFormData] = useState(emptyHeader);
    const [gridRows, setGridRows] = useState([]);
    const [loading, setLoading] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [activeTab, setActiveTab] = useState("head");

    // Master Data
    const [parties, setParties] = useState([]);
    const [brokers, setBrokers] = useState([]);
    const [products, setProducts] = useState([]);

    // --- Filtering State ---
    const [searchField, setSearchField] = useState('party_name');
    const [searchCondition, setSearchCondition] = useState('Like');
    const [searchValue, setSearchValue] = useState('');
    const [isSelectionMode, setIsSelectionMode] = useState(false);
    const [selectedIds, setSelectedIds] = useState([]);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

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
        } catch (err) { console.error("Error fetching masters", err); }
    };

    const fetchRecords = async () => {
        setLoading(true);
        try {
            const res = await transactionsAPI.directInvoices.getAll();
            setList(res.data.data || []);
        } catch (err) { console.error("Fetch error:", err); }
        finally { setLoading(false); }
    };

    // --- Totals Calculation ---
    const totalQty = gridRows.reduce((sum, row) => sum + (parseFloat(row.qty) || 0), 0);
    const totalPacks = gridRows.reduce((sum, row) => sum + (parseInt(row.packs) || 0), 0);

    // --- Action Handlers ---
    const handleAddNew = () => {
        const nextId = list.length > 0 ? Math.max(...list.map(o => parseInt(o.order_no) || 0)) + 1 : 1;
        setFormData({ ...emptyHeader, order_no: `${nextId}` });
        setGridRows([{ ...emptyRow }]);
        setActiveTab("head");
        setIsModalOpen(true);
    };

    const handleEditRow = (item) => {
        if (isSelectionMode) {
            setSelectedIds(prev => prev.includes(item.id) ? prev.filter(i => i !== item.id) : [...prev, item.id]);
            return;
        }
        setFormData(item);
        // Map backend details (DirectInvoiceDetails) to gridRows
        setGridRows(item.DirectInvoiceDetails?.length > 0 
            ? item.DirectInvoiceDetails 
            : [{ ...emptyRow }]);
        setActiveTab("head");
        setIsModalOpen(true);
    };

    const handleSave = async () => {
        if (!formData.party_id) return alert("Required: Please select a Party Name");
        const validDetails = gridRows.filter(r => r.product_id !== '');
        if (validDetails.length === 0) return alert("Required: Add line items");
        
        setLoading(true);
        // Ensure payload uses "Details" key which the backend custom controller maps to DirectInvoiceDetails
        const payload = { ...formData, Details: validDetails };
        try {
            if (formData.id) await transactionsAPI.directInvoices.update(formData.id, payload);
            else await transactionsAPI.directInvoices.create(payload);
            setIsModalOpen(false);
            fetchRecords();
            alert("Direct Bill Saved Successfully");
        } catch (err) { alert("Save failed"); }
        finally { setLoading(false); }
    };

    const updateGrid = (index, field, value) => {
        const updated = [...gridRows];
        if (field === 'product_id') {
            const product = products.find(p => p.id === parseInt(value));
            updated[index] = {
                ...updated[index],
                product_id: value,
                packing_type: product ? product.packing_type : '',
                rate_per: 'Kg' // Default
            };
        } else {
            updated[index][field] = value;
        }
        setGridRows(updated);
    };

    // --- Search Logic ---
    const filteredData = useMemo(() => {
        let result = Array.isArray(list) ? [...list] : [];
        if (searchValue.trim()) {
            result = result.filter(item => {
                let val = searchField === 'party_name' ? item.Party?.account_name || "" : String(item[searchField] || "");
                const term = searchValue.toLowerCase().trim();
                return searchCondition === 'Equal' ? val.toLowerCase() === term : val.toLowerCase().includes(term);
            });
        }
        return result.sort((a, b) => b.id - a.id);
    }, [list, searchValue, searchField, searchCondition]);

    const currentItems = filteredData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
    const totalPages = Math.ceil(filteredData.length / itemsPerPage) || 1;

    return (
        <div className="min-h-screen bg-slate-50 p-6 font-sans text-slate-900">
            {/* Header Section */}
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <Zap className="text-blue-600 fill-blue-600" size={28} /> Direct Billing Machine
                    </h1>
                    <p className="text-sm text-slate-500 font-medium tracking-tight">Instant sales registry for non-booked dispatches</p>
                </div>
                <div className="flex gap-2">
                    <button onClick={() => { setIsSelectionMode(!isSelectionMode); setSelectedIds([]); }}
                        className={`px-5 py-2 border rounded-xl font-bold transition-all text-xs tracking-widest uppercase ${isSelectionMode ? 'bg-amber-100 border-amber-300 text-amber-700' : 'bg-white border-slate-200 text-blue-600 hover:bg-slate-50'}`}>
                        {isSelectionMode ? 'Cancel' : 'Select'}
                    </button>
                    <button onClick={handleAddNew} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl font-black shadow-lg shadow-blue-100 transition-all active:scale-95 text-xs uppercase tracking-widest">
                        <Plus size={18} /> New Direct Bill
                    </button>
                    <button onClick={fetchRecords} className="p-2.5 border border-slate-200 rounded-xl bg-white text-slate-400 hover:text-blue-600 shadow-sm transition-colors">
                        <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
                    </button>
                </div>
            </div>

            {/* Filter Bar */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm mb-6 flex gap-4 items-end">
                <div className="flex-1 grid grid-cols-3 gap-4">
                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase ml-1 tracking-widest">Category</label>
                        <select value={searchField} onChange={(e) => setSearchField(e.target.value)} className="w-full border border-slate-200 p-2 rounded-lg text-xs font-bold bg-slate-50 outline-none">
                            <option value="party_name">Party Name</option>
                            <option value="order_no">Ref Number</option>
                            <option value="place">Place</option>
                        </select>
                    </div>
                    <div className="col-span-2 space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase ml-1 tracking-widest">Keyword Search</label>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={14} />
                            <input type="text" placeholder="Start typing to filter..." value={searchValue} onChange={(e) => setSearchValue(e.target.value)} className="w-full border border-slate-200 pl-9 pr-4 py-2 rounded-lg text-xs font-bold outline-none focus:ring-1 focus:ring-blue-500 bg-slate-50/50" />
                        </div>
                    </div>
                </div>
                <div className="bg-blue-50 text-blue-600 px-6 py-2 rounded-lg text-[10px] font-black flex items-center gap-2 border border-blue-100 uppercase tracking-widest">
                    <Filter size={14}/> {filteredData.length} Matches Found
                </div>
            </div>

            {/* Registry Table */}
            <div className="bg-white rounded-[2rem] border border-slate-200 shadow-xl shadow-slate-200/50 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-900 text-white">
                            <tr>
                                {isSelectionMode && <th className="p-5 w-12 text-center"><Square size={18} className="mx-auto" /></th>}
                                <th className="p-5 text-[10px] font-black uppercase tracking-[0.2em]">Reference #</th>
                                <th className="p-5 text-[10px] font-black uppercase tracking-[0.2em]">Billing Date</th>
                                <th className="p-5 text-[10px] font-black uppercase tracking-[0.2em]">Party Destination</th>
                                <th className="p-5 text-[10px] font-black uppercase tracking-[0.2em]">Agent</th>
                                <th className="p-5 w-20"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {currentItems.length > 0 ? currentItems.map((item) => (
                                <tr key={item.id} onClick={() => handleEditRow(item)} className={`transition-all cursor-pointer group hover:bg-blue-50/50 ${selectedIds.includes(item.id) ? 'bg-blue-50' : ''}`}>
                                    {isSelectionMode && (
                                        <td className="p-5 text-center" onClick={(e) => {e.stopPropagation(); handleEditRow(item);}}>
                                            {selectedIds.includes(item.id) ? <CheckSquare size={18} className="text-blue-600 mx-auto"/> : <Square size={18} className="text-slate-200 mx-auto"/>}
                                        </td>
                                    )}
                                    <td className="p-5 text-sm font-black text-blue-600 font-mono">#{item.order_no}</td>
                                    <td className="p-5 text-sm text-slate-500">{item.date}</td>
                                    <td className="p-5 text-sm font-bold text-slate-700 uppercase">{item.Party?.account_name}</td>
                                    <td className="p-5">
                                        <span className="text-[10px] font-black text-slate-400 bg-slate-100 px-2 py-1 rounded">
                                            {item.Broker?.broker_name || 'DIRECT'}
                                        </span>
                                    </td>
                                    {!isSelectionMode && (
                                        <td className="p-5 text-right">
                                            <Edit size={16} className="text-slate-200 group-hover:text-blue-500 transition-colors" />
                                        </td>
                                    )}
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan={6} className="p-32 text-center opacity-20">
                                        <Zap size={64} className="mx-auto mb-4" />
                                        <p className="font-black uppercase tracking-[0.3em] text-xl text-slate-900">No Registry Found</p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                <div className="p-6 bg-slate-50 border-t flex items-center justify-between">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        Page {currentPage} of {totalPages} — {filteredData.length} Entries
                    </span>
                    <div className="flex gap-2">
                        <button disabled={currentPage === 1} onClick={() => setCurrentPage(prev => prev - 1)} className="p-2 border rounded-xl bg-white disabled:opacity-30 hover:bg-blue-50 transition-all shadow-sm">
                            <ChevronLeft size={16}/>
                        </button>
                        <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(prev => prev + 1)} className="p-2 border rounded-xl bg-white disabled:opacity-30 hover:bg-blue-50 transition-all shadow-sm">
                            <ChevronRight size={16}/>
                        </button>
                    </div>
                </div>
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4">
                    <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-6xl overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200">
                        
                        {/* Header */}
                        <div className="bg-slate-900 p-6 flex justify-between items-center text-white">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-blue-600 rounded-2xl shadow-inner"><Zap size={24} /></div>
                                <div>
                                    <h2 className="font-black uppercase text-sm tracking-widest">{formData.id ? 'Modify Direct Billing' : 'New Instant Invoice'}</h2>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-tight">Ref: #{formData.order_no}</p>
                                </div>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="hover:bg-white/10 p-2 rounded-full transition-colors"><X size={28}/></button>
                        </div>

                        {/* Tabs */}
                        <div className="flex bg-slate-50 border-b px-8">
                            <button onClick={() => setActiveTab('head')} className={`py-5 px-8 text-[10px] font-black uppercase tracking-[0.2em] relative transition-all ${activeTab === 'head' ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}>
                                01. Client Details {activeTab === 'head' && <div className="absolute bottom-0 left-0 w-full h-1 bg-blue-600 rounded-t-full"/>}
                            </button>
                            <button onClick={() => setActiveTab('detail')} className={`py-5 px-8 text-[10px] font-black uppercase tracking-[0.2em] relative transition-all ${activeTab === 'detail' ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}>
                                02. SKU Grid Logic {activeTab === 'detail' && <div className="absolute bottom-0 left-0 w-full h-1 bg-blue-600 rounded-t-full"/>}
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto flex flex-col lg:flex-row bg-slate-50/30">
                            <div className="flex-1 p-10">
                                {activeTab === 'head' ? (
                                    <div className="grid grid-cols-2 gap-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                        <div className="space-y-6 bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm">
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-black text-slate-400 uppercase ml-2 tracking-widest flex items-center gap-2">Reference ID <Lock size={12}/></label>
                                                <input value={formData.order_no} readOnly className="w-full bg-slate-50 border border-slate-200 p-3 rounded-2xl text-xs font-black text-blue-600 font-mono outline-none" />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-black text-slate-400 uppercase ml-2 tracking-widest">Entry Date</label>
                                                <input type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className="w-full border border-slate-200 p-3 rounded-2xl text-xs font-bold outline-none focus:ring-2 focus:ring-blue-100 transition-all" />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-black text-slate-400 uppercase ml-2 tracking-widest">Customer Party</label>
                                                <select value={formData.party_id} onChange={e => setFormData({...formData, party_id: e.target.value})} className="w-full border border-slate-200 p-3 rounded-2xl text-xs font-bold outline-none focus:ring-2 focus:ring-blue-100 transition-all">
                                                    <option value="">-- Choose Party --</option>
                                                    {parties.map(p => <option key={p.id} value={p.id}>{p.account_name}</option>)}
                                                </select>
                                            </div>
                                        </div>

                                        <div className="space-y-6 bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm">
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-black text-slate-400 uppercase ml-2 tracking-widest">Dispatch Hub</label>
                                                <div className="relative">
                                                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={16}/>
                                                    <input value={formData.place} onChange={e => setFormData({...formData, place: e.target.value.toUpperCase()})} placeholder="CITY, STATE" className="w-full pl-10 border border-slate-200 p-3 rounded-2xl text-xs font-bold outline-none focus:ring-2 focus:ring-blue-100 transition-all" />
                                                </div>
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-black text-slate-400 uppercase ml-2 tracking-widest">Assigned Broker</label>
                                                <select value={formData.broker_id} onChange={e => setFormData({...formData, broker_id: e.target.value})} className="w-full border border-slate-200 p-3 rounded-2xl text-xs font-bold outline-none">
                                                    <option value="">DIRECT BILLING</option>
                                                    {brokers.map(b => <option key={b.id} value={b.id}>{b.broker_name}</option>)}
                                                </select>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                        <div className="flex justify-between items-center mb-2 px-1">
                                            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-600 flex items-center gap-2">
                                                <ClipboardList size={16}/> SKUs for Immediate Dispatch
                                            </h3>
                                            <button onClick={() => setGridRows([...gridRows, { ...emptyRow }])} className="text-blue-600 px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-600 hover:text-white transition-all flex items-center gap-2 bg-blue-50 border border-blue-100">
                                                <PlusCircle size={14} /> Append SKU
                                            </button>
                                        </div>
                                        <div className="bg-white rounded-[2rem] border border-slate-200 shadow-xl overflow-hidden">
                                            <table className="w-full border-collapse">
                                                <thead className="bg-slate-900 text-white text-[9px] font-black uppercase tracking-widest">
                                                    <tr>
                                                        <th className="p-5 text-left">Product / SKU</th>
                                                        <th className="p-5 text-center w-28">Type</th>
                                                        <th className="p-5 text-center w-28">Packs</th>
                                                        <th className="p-5 text-center w-32">Rate (CR)</th>
                                                        <th className="p-5 text-center w-28">Per</th>
                                                        <th className="p-5 text-center w-32">Qty (KGs)</th>
                                                        <th className="p-5 w-16"></th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100 font-mono">
                                                    {gridRows.length > 0 ? gridRows.map((row, index) => (
                                                        <tr key={index} className="hover:bg-blue-50/20 transition-colors group">
                                                            <td className="p-3">
                                                                <select value={row.product_id} onChange={e => updateGrid(index, 'product_id', e.target.value)} className="w-full p-2 bg-transparent text-xs font-black uppercase outline-none text-blue-600 cursor-pointer">
                                                                    <option value="">-- Choose SKU --</option>
                                                                    {products.map(p => <option key={p.id} value={p.id}>{p.product_name}</option>)}
                                                                </select>
                                                            </td>
                                                            <td className="p-3">
                                                                <input readOnly value={row.packing_type} className="w-full text-center text-[10px] font-black text-slate-400 bg-transparent uppercase outline-none" placeholder="FETCH" />
                                                            </td>
                                                            <td className="p-3">
                                                                <input type="number" value={row.packs} onChange={e => updateGrid(index, 'packs', parseInt(e.target.value) || 0)} className="w-full p-2 text-center text-xs font-bold bg-slate-50 rounded-xl border border-transparent focus:border-blue-200 outline-none" />
                                                            </td>
                                                            <td className="p-3"><input type="number" value={row.rate_cr} onChange={e => updateGrid(index, 'rate_cr', e.target.value)} className="w-full p-2 text-center text-xs font-bold outline-none" /></td>
                                                            <td className="p-3"><input type="text" value={row.rate_per} onChange={e => updateGrid(index, 'rate_per', e.target.value)} className="w-full p-2 text-center text-[11px] font-bold uppercase outline-none" /></td>
                                                            <td className="p-3"><input type="number" value={row.qty} onChange={e => updateGrid(index, 'qty', e.target.value)} className="w-full p-2 text-center text-sm font-black text-blue-600 bg-blue-50/30 rounded-xl outline-none" /></td>
                                                            <td className="p-3 text-center">
                                                                <button onClick={() => setGridRows(gridRows.filter((_, i) => i !== index))} className="text-red-200 hover:text-red-500 transition-colors active:scale-90"><MinusCircle size={22}/></button>
                                                            </td>
                                                        </tr>
                                                    )) : (
                                                        <tr>
                                                            <td colSpan="7" className="p-16 text-center opacity-20">
                                                                <Package size={40} className="mx-auto mb-2" />
                                                                <p className="text-[10px] font-black uppercase tracking-widest">No Items in Current Transaction</p>
                                                            </td>
                                                        </tr>
                                                    )}
                                                </tbody>
                                            </table>
                                            <button onClick={() => setGridRows([...gridRows, { ...emptyRow }])} className="w-full p-6 bg-slate-50 text-blue-600 text-[10px] font-black uppercase tracking-[0.4em] hover:bg-blue-600 hover:text-white transition-all">+ Add New Entry Row</button>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Sidebar Dashboard */}
                            <div className="w-full lg:w-80 bg-slate-900 p-10 text-white flex flex-col shadow-2xl relative overflow-hidden group shrink-0">
                                <Activity size={150} className="absolute -right-10 -bottom-10 opacity-5 group-hover:scale-110 transition-transform duration-700" />
                                <div className="space-y-10 relative z-10">
                                    <div className="text-center">
                                        <Activity size={32} className="text-blue-500 mx-auto mb-2" />
                                        <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.3em]">Billing Metrics</p>
                                    </div>

                                    <div className="space-y-4">
                                        <div className="bg-white/5 p-6 rounded-[2rem] border border-white/5 shadow-inner">
                                            <label className="text-[9px] font-black text-slate-500 uppercase block mb-2 tracking-widest">Gross Weight</label>
                                            <div className="flex items-baseline gap-2">
                                                <span className="text-3xl font-black text-emerald-400 font-mono">{totalQty.toFixed(2)}</span>
                                                <span className="text-[10px] font-black text-slate-500 uppercase">KGs</span>
                                            </div>
                                        </div>

                                        <div className="bg-white/5 p-6 rounded-[2rem] border border-white/5 shadow-inner">
                                            <label className="text-[9px] font-black text-slate-500 uppercase block mb-2 tracking-widest">Total Packs</label>
                                            <div className="flex items-center gap-3">
                                                <Package size={20} className="text-amber-400" />
                                                <span className="text-2xl font-black font-mono">{totalPacks}</span>
                                                <span className="text-[10px] font-black text-slate-500 uppercase font-bold">Units</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-auto p-6 bg-blue-600 rounded-[2rem] text-center shadow-xl relative overflow-hidden group/btn z-10">
                                    <Zap className="absolute -right-2 -bottom-2 text-white/20 group-hover/btn:scale-150 transition-transform" size={60} />
                                    <p className="text-[10px] font-black uppercase tracking-widest mb-1 opacity-70">Posting Protocol</p>
                                    <h3 className="text-lg font-black uppercase tracking-tight tracking-[0.1em]">IMMEDIATE</h3>
                                </div>
                            </div>
                        </div>

                        <div className="p-10 bg-slate-50 border-t flex justify-end items-center gap-5 shrink-0">
                            <button onClick={() => setIsModalOpen(false)} className="px-10 py-4 font-black text-slate-400 text-[10px] uppercase tracking-widest hover:text-slate-600 transition-colors">Discard</button>
                            <button onClick={handleSave} disabled={loading} className="bg-slate-900 text-white px-16 py-5 rounded-[1.5rem] font-black shadow-2xl shadow-slate-200 flex items-center gap-4 uppercase text-[12px] tracking-[0.3em] transition-all active:scale-95 hover:bg-blue-600 disabled:opacity-50">
                                <Save size={20}/> {loading ? 'POSTING...' : 'FINALIZE & DEPLOY'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            
            <style>{`
                input[type='number']::-webkit-inner-spin-button, 
                input[type='number']::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
                ::-webkit-scrollbar { width: 6px; height: 6px; }
                ::-webkit-scrollbar-track { background: transparent; }
                ::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
                ::-webkit-scrollbar-thumb:hover { background: #cbd5e1; }
            `}</style>
        </div>
    );
};

export default SalesWithoutOrder;