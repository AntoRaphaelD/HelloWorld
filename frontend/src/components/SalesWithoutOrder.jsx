import React, { useState, useEffect, useMemo } from 'react';
import { mastersAPI, transactionsAPI } from '../service/api';
import { 
    Save, Plus, Trash2, X, Search, Zap, 
    PlusCircle, MinusCircle, LayoutGrid, Calendar, 
    MapPin, User, Hash, ClipboardList, Info, 
    CheckCircle, ChevronRight, Package, RefreshCw,
    ChevronLeft, Edit, Square, CheckSquare, Filter,
    Activity, Calculator, Database
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

    // --- Main States ---
    const [list, setList] = useState([]);
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

    // --- Dynamic Filtering Logic ---
    const filteredData = useMemo(() => {
        let result = Array.isArray(list) ? [...list] : [];
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
    }, [list, searchValue, searchField, searchCondition]);

    const currentItems = filteredData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
    const totalPages = Math.ceil(filteredData.length / itemsPerPage) || 1;

    // --- Action Handlers ---
    const handleAddNew = () => {
        const nextId = list.length > 0 ? Math.max(...list.map(o => o.id)) + 1 : 1;
        setFormData({ ...emptyHeader, order_no: `${nextId}` });
        setGridRows([{ product_id: '', rate_cr: 0, rate_imm: 0, qty: 0 }]);
        setActiveTab("head");
        setIsModalOpen(true);
    };

    const handleEditRow = (item) => {
        if (isSelectionMode) {
            setSelectedIds(prev => prev.includes(item.id) ? prev.filter(i => i !== item.id) : [...prev, item.id]);
            return;
        }
        setFormData(item);
        setGridRows(item.OrderDetails || [{ product_id: '', rate_cr: 0, rate_imm: 0, qty: 0 }]);
        setActiveTab("head");
        setIsModalOpen(true);
    };

    const handleSave = async () => {
        if (!formData.party_id) return alert("Required: Please select a Party Name");
        if (gridRows.length === 0 || !gridRows[0].product_id) return alert("Required: Add line items");
        
        setLoading(true);
        const payload = { ...formData, Details: gridRows };
        try {
            if (formData.id) await transactionsAPI.directInvoices.update(formData.id, payload);
            else await transactionsAPI.directInvoices.create(payload);
            setIsModalOpen(false);
            fetchRecords();
        } catch (err) { alert("Save failed"); }
        finally { setLoading(false); }
    };

    const handleBulkDelete = async () => {
        if (!window.confirm(`Delete ${selectedIds.length} direct entries?`)) return;
        setLoading(true);
        try {
            await Promise.all(selectedIds.map(id => transactionsAPI.directInvoices.delete(id)));
            setSelectedIds([]);
            setIsSelectionMode(false);
            fetchRecords();
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
                        <Zap className="text-blue-600 fill-blue-600" size={28} /> Direct Billing Machine
                    </h1>
                    <p className="text-sm text-slate-500">Instant sales registry for non-booked dispatches</p>
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
                            <Plus size={18} /> New Direct Bill
                        </button>
                    )}
                    
                    <button onClick={fetchRecords} className="p-2 border border-slate-200 rounded-lg bg-white text-slate-400 hover:text-blue-600 transition-colors">
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
                            <option value="party_name">Party Name</option>
                            <option value="order_no">Ref Number</option>
                            <option value="place">Dispatch Place</option>
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
                            <input type="text" placeholder="Start typing..." value={searchValue} onChange={(e) => setSearchValue(e.target.value)} className="w-full border border-slate-200 pl-10 pr-4 py-2 rounded-lg text-sm outline-none focus:ring-1 focus:ring-blue-500 bg-white" />
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={() => setSearchValue('')} className="flex-1 border border-slate-200 py-2 rounded-lg text-sm font-bold hover:bg-slate-50 transition-all">Clear Filters</button>
                        <div className="flex-1 bg-blue-50 text-blue-600 border border-blue-100 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2">
                            <Filter size={14}/> {filteredData.length} Found
                        </div>
                    </div>
                </div>
            </div>

            {/* 3. DATA TABLE */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-blue-600 text-white">
                            <tr>
                                {isSelectionMode && <th className="p-4 w-12 text-center"><Square size={18} className="mx-auto" /></th>}
                                <th className="p-4 text-sm font-semibold">Ref #</th>
                                <th className="p-4 text-sm font-semibold">Date</th>
                                <th className="p-4 text-sm font-semibold">Party / Ledger</th>
                                <th className="p-4 text-sm font-semibold">Dispatch Hub</th>
                                <th className="p-4 text-sm font-semibold">Agent</th>
                                {!isSelectionMode && <th className="p-4 w-10"></th>}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {currentItems.length > 0 ? currentItems.map((item) => (
                                <tr key={item.id} onClick={() => handleEditRow(item)} className={`transition-colors cursor-pointer ${selectedIds.includes(item.id) ? 'bg-blue-50' : 'hover:bg-blue-50'}`}>
                                    {isSelectionMode && (
                                        <td className="p-4 text-center" onClick={(e) => {e.stopPropagation(); handleEditRow(item);}}>
                                            {selectedIds.includes(item.id) ? <CheckSquare size={18} className="text-blue-600 mx-auto"/> : <Square size={18} className="text-slate-200 mx-auto"/>}
                                        </td>
                                    )}
                                    <td className="p-4 text-sm font-bold text-blue-600 font-mono">DIR-{item.order_no}</td>
                                    <td className="p-4 text-sm text-slate-500">{item.date}</td>
                                    <td className="p-4 text-sm font-bold text-slate-700 uppercase">{item.Party?.account_name}</td>
                                    <td className="p-4 text-xs font-bold text-slate-400 uppercase flex items-center gap-1 mt-1"><MapPin size={12}/> {item.place || 'Local'}</td>
                                    <td className="p-4">
                                        <span className="text-[10px] font-black text-slate-400 bg-slate-100 px-2 py-1 rounded">
                                            {item.Broker?.broker_name || 'DIRECT'}
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
                                    <td colSpan={7} className="p-20 text-center opacity-20">
                                        <Zap size={48} className="mx-auto mb-2"/>
                                        <p className="font-bold uppercase tracking-widest text-xl">No Direct Billings Found</p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* 4. PAGINATION FOOTER */}
                <div className="p-4 bg-slate-50 border-t flex items-center justify-between">
                    <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider">
                        Page {currentPage} of {totalPages} ({filteredData.length} Total)
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

            {/* 5. ERP COCKPIT MODAL */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in duration-200">
                        
                        {/* Modal Header */}
                        <div className="bg-blue-600 p-4 flex justify-between items-center text-white">
                            <div className="flex items-center gap-4">
                                <div className="p-2 bg-white/20 rounded-lg"><Zap size={20} /></div>
                                <div>
                                    <h2 className="font-bold uppercase tracking-tight text-lg">{formData.id ? 'Modify Direct Entry' : 'New Direct Billing'}</h2>
                                    <p className="text-[10px] font-bold text-blue-100 uppercase tracking-widest">System Reference: #{formData.order_no}</p>
                                </div>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="hover:bg-blue-500 p-1 rounded-full transition-colors"><X size={24}/></button>
                        </div>

                        {/* Navigation Tabs */}
                        <div className="flex bg-slate-50 border-b px-6">
                            <button onClick={() => setActiveTab('head')} className={`py-4 px-6 text-[10px] font-bold uppercase tracking-widest relative ${activeTab === 'head' ? 'text-blue-600' : 'text-slate-400'}`}>
                                01. Client & Dispatch {activeTab === 'head' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600"/>}
                            </button>
                            <button onClick={() => setActiveTab('detail')} className={`py-4 px-6 text-[10px] font-bold uppercase tracking-widest relative ${activeTab === 'detail' ? 'text-blue-600' : 'text-slate-400'}`}>
                                02. Product Inventory {activeTab === 'detail' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600"/>}
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="flex-1 overflow-y-auto flex flex-col lg:flex-row">
                            
                            {/* LEFT SIDE: Entry Form */}
                            <div className="flex-1 p-8">
                                {activeTab === 'head' ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        <div className="space-y-6">
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Ref Date</label>
                                                <div className="relative">
                                                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16}/>
                                                    <input type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold focus:ring-1 focus:ring-blue-500 outline-none transition-all" />
                                                </div>
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Customer / Party Name</label>
                                                <div className="relative">
                                                    <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16}/>
                                                    <select value={formData.party_id} onChange={e => setFormData({...formData, party_id: e.target.value})} className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold focus:ring-1 focus:ring-blue-500 outline-none">
                                                        <option value="">-- Choose Party --</option>
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
                                                    <input value={formData.place} onChange={e => setFormData({...formData, place: e.target.value.toUpperCase()})} placeholder="CITY, HUB" className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold focus:ring-1 focus:ring-blue-500 outline-none transition-all" />
                                                </div>
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Commission Agent</label>
                                                <div className="relative">
                                                    <Database className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16}/>
                                                    <select value={formData.broker_id} onChange={e => setFormData({...formData, broker_id: e.target.value})} className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold focus:ring-1 focus:ring-blue-500 outline-none">
                                                        <option value="">DIRECT SALE</option>
                                                        {brokers.map(b => <option key={b.id} value={b.id}>{b.broker_name}</option>)}
                                                    </select>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        <div className="flex justify-between items-center px-1">
                                            <div className="flex items-center gap-2 text-blue-600">
                                                <Calculator size={18} />
                                                <h3 className="text-xs font-bold uppercase tracking-widest">Inventory List</h3>
                                            </div>
                                            <button onClick={() => setGridRows([...gridRows, { product_id: '', rate_cr: 0, rate_imm: 0, qty: 0 }])} className="flex items-center gap-2 bg-blue-50 text-blue-600 px-4 py-2 rounded-lg text-[10px] font-bold uppercase hover:bg-blue-100 transition-colors">
                                                <PlusCircle size={14} /> Append SKU
                                            </button>
                                        </div>
                                        <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm bg-white">
                                            <table className="w-full border-collapse">
                                                <thead className="bg-slate-900 text-white text-[9px] uppercase font-bold tracking-widest">
                                                    <tr>
                                                        <th className="p-3 text-left">SKU Description</th>
                                                        <th className="p-3 text-center">Rate (CR)</th>
                                                        <th className="p-3 text-center">Rate (IMM)</th>
                                                        <th className="p-3 text-center">Quantity</th>
                                                        <th className="p-3 w-10"></th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100 font-mono">
                                                    {gridRows.map((row, index) => (
                                                        <tr key={index} className="hover:bg-slate-50 transition-colors">
                                                            <td className="p-2">
                                                                <select value={row.product_id} onChange={e => updateGrid(index, 'product_id', e.target.value)} className="w-full p-2 bg-transparent text-sm font-bold outline-none border-b border-transparent focus:border-blue-300">
                                                                    <option value="">-- SELECT PRODUCT --</option>
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

                            {/* RIGHT SIDE: Sidebar Summary */}
                            <div className="w-full lg:w-80 bg-slate-900 p-8 text-white flex flex-col justify-between">
                                <div className="space-y-8">
                                    <div className="text-center">
                                        <Activity size={40} className="text-blue-400 mx-auto mb-2" />
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Billing Summary</p>
                                    </div>

                                    <div className="space-y-4">
                                        <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-800">
                                            <label className="text-[9px] font-bold text-slate-500 uppercase block mb-1">Live Quantity Sum</label>
                                            <div className="flex items-baseline gap-2">
                                                <span className="text-3xl font-black text-emerald-400">{totalQty.toFixed(2)}</span>
                                                <span className="text-xs font-bold text-slate-500">UNIT</span>
                                            </div>
                                        </div>

                                        <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-800">
                                            <label className="text-[9px] font-bold text-slate-500 uppercase block mb-1">Item Count</label>
                                            <div className="flex items-center gap-2">
                                                <Package size={14} className="text-blue-400" />
                                                <span className="text-xl font-bold">{gridRows.filter(r => r.product_id).length} Line Items</span>
                                            </div>
                                        </div>

                                        <div className="bg-blue-500/10 p-4 rounded-xl border border-blue-500/20 flex gap-3">
                                            <Info size={16} className="text-blue-400 shrink-0" />
                                            <p className="text-[9px] leading-tight text-slate-400 italic">
                                                Direct billing removes the need for a prior booking order. Stock will be adjusted immediately upon save.
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="p-6 bg-blue-600 rounded-2xl text-center shadow-2xl relative overflow-hidden group mt-8">
                                    <Zap className="absolute -right-2 -bottom-2 text-white/10 group-hover:scale-125 transition-transform" size={80} />
                                    <p className="text-[10px] font-black uppercase tracking-widest mb-1 opacity-60">Status Assessment</p>
                                    <h3 className="text-xl font-black uppercase tracking-tighter">IMMEDIATE</h3>
                                </div>
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="p-6 bg-slate-50 border-t flex justify-end items-center gap-4">
                            <button onClick={() => setIsModalOpen(false)} className="px-8 py-3 font-bold text-slate-400 hover:text-slate-600 text-xs tracking-widest uppercase transition-colors">Discard</button>
                            <button onClick={handleSave} disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white px-10 py-3 rounded-xl font-black shadow-xl flex items-center gap-2 active:scale-95 transition-all text-xs tracking-widest uppercase">
                                <Save size={18}/> {loading ? 'PROCESSING...' : 'FINALIZE & POST'}
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

export default SalesWithoutOrder;