import React, { useState, useEffect, useMemo } from 'react';
import { mastersAPI, transactionsAPI } from '../service/api';
import { 
    Save, Plus, Trash2, X, Search, Zap, 
    PlusCircle, MinusCircle, LayoutGrid, Calendar, 
    MapPin, User, Hash, ClipboardList, Info, 
    CheckCircle, ChevronRight, Package, RefreshCw,
    ChevronLeft, Edit, Square, CheckSquare
} from 'lucide-react';

const SalesWithoutOrder = () => {
    // --- Initial State ---
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
    const [gridRows, setGridRows] = useState([{ product_id: '', rate_cr: 0, rate_imm: 0, rate_per: 0, qty: 0, bag_wt: 0 }]);
    const [loading, setLoading] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [activeTab, setActiveTab] = useState("head");

    // Master Data
    const [parties, setParties] = useState([]);
    const [brokers, setBrokers] = useState([]);
    const [products, setProducts] = useState([]);

    // --- Search, Sort & Selection States ---
    const [isSelectionMode, setIsSelectionMode] = useState(false);
    const [selectedIds, setSelectedIds] = useState([]);
    const [searchField, setSearchField] = useState('party_name');
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
            const res = await transactionsAPI.orders.getAll();
            const data = Array.isArray(res.data) ? res.data : (res.data.data || []);
            // Filter only Direct Sales (Without Order)
            setList(data.filter(o => o.is_with_order === false));
        } catch (err) { console.error("Fetch error:", err); }
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
        setFormData({ ...emptyHeader, order_no: `${nextId}` });
        setGridRows([{ product_id: '', rate_cr: 0, rate_imm: 0, rate_per: 0, qty: 0, bag_wt: 0 }]);
        setActiveTab("head");
        setIsModalOpen(true);
    };

    const handleRowClick = (item) => {
        if (isSelectionMode) {
            setSelectedIds(prev => prev.includes(item.id) ? prev.filter(i => i !== item.id) : [...prev, item.id]);
            return;
        }
        setFormData(item);
        setGridRows(item.OrderDetails || [{ product_id: '', rate_cr: 0, rate_imm: 0, rate_per: 0, qty: 0, bag_wt: 0 }]);
        setIsModalOpen(true);
    };

    const handleSave = async (e) => {
        if (e) e.preventDefault();
        if (!formData.party_id) return alert("Required: Please select a Party Name");
        if (gridRows.length === 0 || !gridRows[0].product_id) return alert("Required: Add at least one item");
        
        setLoading(true);
        const payload = { ...formData, Details: gridRows };
        try {
            if (formData.id) await transactionsAPI.orders.update(formData.id, payload);
            else await transactionsAPI.orders.create(payload);
            setIsModalOpen(false);
            fetchRecords();
        } catch (err) { alert("Save failed"); }
        finally { setLoading(false); }
    };

    const handleBulkDelete = async () => {
        if (selectedIds.length === 0) return;
        if (window.confirm(`Delete ${selectedIds.length} direct entries permanently?`)) {
            setLoading(true);
            try {
                await Promise.all(selectedIds.map(id => transactionsAPI.orders.delete(id)));
                setSelectedIds([]);
                setIsSelectionMode(false);
                fetchRecords();
            } catch (err) { alert("Delete failed"); }
            finally { setLoading(false); }
        }
    };

    // --- Grid Logic ---
    const updateGrid = (index, field, value) => {
        const updated = [...gridRows];
        updated[index][field] = value;
        setGridRows(updated);
    };
    const totalQty = gridRows.reduce((sum, row) => sum + (parseFloat(row.qty) || 0), 0);

    return (
        <div className="min-h-screen bg-[#f8fafc] p-6 font-sans">
            
            {/* 1. TOP HEADER */}
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
                        <Zap className="text-orange-600 fill-orange-600" size={28} /> Direct Billing Registry
                    </h1>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Instant Sales and Dispatch Management</p>
                </div>
                
                <div className="flex gap-2">
                    <button onClick={handleAddNew} className="flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white px-6 py-2 rounded-lg font-bold shadow-md transition-all active:scale-95">
                        <Plus size={18} /> New Entry
                    </button>
                    
                    <button 
                        onClick={() => { setIsSelectionMode(!isSelectionMode); setSelectedIds([]); }}
                        className={`px-6 py-2 border rounded-lg font-bold transition-all ${isSelectionMode ? 'bg-amber-100 border-amber-300 text-amber-700' : 'bg-white border-slate-200 text-orange-600 hover:bg-slate-50'}`}
                    >
                        {isSelectionMode ? 'Cancel' : 'Select'}
                    </button>

                    <button 
                        onClick={handleBulkDelete}
                        disabled={selectedIds.length === 0}
                        className={`px-6 py-2 border rounded-lg font-bold flex items-center gap-2 transition-all ${selectedIds.length > 0 ? 'bg-red-50 border-red-200 text-red-600 shadow-sm' : 'bg-white border-slate-100 text-slate-300 cursor-not-allowed'}`}
                    >
                        <Trash2 size={18} /> Delete {selectedIds.length > 0 && `(${selectedIds.length})`}
                    </button>
                    <button onClick={fetchRecords} className="p-2 border rounded-lg bg-white text-slate-400 hover:text-orange-600 transition-colors">
                        <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                    </button>
                </div>
            </div>

            {/* 2. SEARCH BAR */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm mb-6 flex flex-wrap gap-4 items-end">
                <div className="flex-1 min-w-[200px]">
                    <label className="text-[10px] font-black text-slate-400 uppercase mb-1 block ml-1">Search Property</label>
                    <div className="flex gap-2">
                        <select value={searchField} onChange={(e) => setSearchField(e.target.value)} className="border border-slate-200 p-2.5 rounded-lg text-sm outline-none focus:ring-2 focus:ring-orange-500">
                            <option value="party_name">Customer Name</option>
                            <option value="order_no">Ref Number</option>
                            <option value="place">Dispatch Place</option>
                        </select>
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-3 text-slate-400" size={16}/>
                            <input type="text" placeholder="Search..." value={searchValue} onChange={(e) => setSearchValue(e.target.value)} className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-orange-500" />
                        </div>
                    </div>
                </div>
                <button onClick={() => setSearchValue('')} className="px-6 py-2.5 text-sm font-bold text-slate-500 hover:bg-slate-100 rounded-lg transition-all">Clear Filters</button>
            </div>

            {/* 3. DATA TABLE */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-md overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-900 text-white">
                            <tr>
                                {isSelectionMode && <th className="p-4 w-12 text-center"><Square size={20} className="mx-auto" /></th>}
                                <th className="p-4 text-[10px] font-black uppercase tracking-[0.2em]">Ref #</th>
                                <th className="p-4 text-[10px] font-black uppercase tracking-[0.2em]">Date</th>
                                <th className="p-4 text-[10px] font-black uppercase tracking-[0.2em]">Party / Ledger</th>
                                <th className="p-4 text-[10px] font-black uppercase tracking-[0.2em]">Dispatch</th>
                                <th className="p-4 text-[10px] font-black uppercase tracking-[0.2em]">Brokerage</th>
                                <th className="p-4 text-[10px] font-black uppercase tracking-[0.2em] text-center w-20">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {currentItems.length > 0 ? currentItems.map((item) => (
                                <tr key={item.id} onClick={() => handleRowClick(item)} className={`transition-colors cursor-pointer ${selectedIds.includes(item.id) ? 'bg-orange-50' : 'hover:bg-slate-50'}`}>
                                    {isSelectionMode && (
                                        <td className="p-4 text-center">
                                            {selectedIds.includes(item.id) ? <CheckSquare size={20} className="text-orange-600 mx-auto"/> : <Square size={20} className="text-slate-200 mx-auto"/>}
                                        </td>
                                    )}
                                    <td className="p-4 text-sm font-bold text-orange-600 font-mono">REF-{item.order_no}</td>
                                    <td className="p-4 text-sm text-slate-500">{item.date}</td>
                                    <td className="p-4 text-sm font-bold text-slate-700 uppercase">{item.Party?.account_name || 'Walking Customer'}</td>
                                    <td className="p-4 text-sm text-slate-500 italic"><MapPin size={12} className="inline mr-1"/>{item.place || 'Local'}</td>
                                    <td className="p-4">
                                        <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded">
                                            {item.Broker?.broker_name || 'DIRECT'}
                                        </span>
                                    </td>
                                    <td className="p-4 text-center">
                                        <button className="p-2 text-slate-300 hover:text-orange-600 transition-colors"><Edit size={16}/></button>
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan={7} className="p-20 text-center opacity-20">
                                        <Zap size={48} className="mx-auto mb-2"/>
                                        <p className="font-black uppercase tracking-widest">No Direct Entries Found</p>
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
                        <button disabled={currentPage === 1} onClick={() => setCurrentPage(prev => prev - 1)} className="p-2 border rounded-lg bg-white disabled:opacity-30 hover:bg-slate-100 transition-all">
                            <ChevronLeft size={18}/>
                        </button>
                        <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(prev => prev + 1)} className="p-2 border rounded-lg bg-white disabled:opacity-30 hover:bg-slate-100 transition-all">
                            <ChevronRight size={18}/>
                        </button>
                    </div>
                </div>
            </div>

            {/* 5. MODAL FORM POPUP */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-5xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in duration-200">
                        {/* Modal Header */}
                        <div className="bg-orange-600 p-6 flex justify-between items-center text-white">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-white/20 rounded-xl"><Zap /></div>
                                <div>
                                    <h2 className="font-black uppercase tracking-widest text-xl">{formData.id ? 'Modify Direct Entry' : 'New Direct Billing'}</h2>
                                    <p className="text-[10px] font-bold text-orange-200 uppercase tracking-widest">Reference No: {formData.order_no}</p>
                                </div>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="hover:bg-orange-500 p-2 rounded-full transition-colors"><X size={24}/></button>
                        </div>

                        {/* Modal Tabs */}
                        <div className="flex bg-slate-50 border-b px-8">
                            <button onClick={() => setActiveTab('head')} className={`py-4 px-6 text-[10px] font-black uppercase tracking-widest relative ${activeTab === 'head' ? 'text-orange-600' : 'text-slate-400'}`}>
                                01. Client & Dispatch {activeTab === 'head' && <div className="absolute bottom-0 left-0 w-full h-1 bg-orange-600 rounded-t-full"/>}
                            </button>
                            <button onClick={() => setActiveTab('detail')} className={`py-4 px-6 text-[10px] font-black uppercase tracking-widest relative ${activeTab === 'detail' ? 'text-orange-600' : 'text-slate-400'}`}>
                                02. Product Inventory {activeTab === 'detail' && <div className="absolute bottom-0 left-0 w-full h-1 bg-orange-600 rounded-t-full"/>}
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="flex-1 overflow-y-auto p-8">
                            {activeTab === 'head' ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="bg-slate-50 p-6 rounded-2xl space-y-4 border border-slate-100">
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Ref Date</label>
                                            <input type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className="w-full p-3 bg-white border border-slate-200 rounded-xl font-bold outline-none focus:ring-2 focus:ring-orange-500" />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Customer / Party Name</label>
                                            <select value={formData.party_id} onChange={e => setFormData({...formData, party_id: e.target.value})} className="w-full p-3 bg-white border border-slate-200 rounded-xl font-bold outline-none focus:ring-2 focus:ring-orange-500 appearance-none">
                                                <option value="">-- Select Party --</option>
                                                {parties.map(p => <option key={p.id} value={p.id}>{p.account_name}</option>)}
                                            </select>
                                        </div>
                                    </div>
                                    <div className="bg-slate-50 p-6 rounded-2xl space-y-4 border border-slate-100">
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Dispatch Destination</label>
                                            <input value={formData.place} onChange={e => setFormData({...formData, place: e.target.value})} placeholder="Location/City" className="w-full p-3 bg-white border border-slate-200 rounded-xl font-bold outline-none focus:ring-2 focus:ring-orange-500" />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Commission Agent</label>
                                            <select value={formData.broker_id} onChange={e => setFormData({...formData, broker_id: e.target.value})} className="w-full p-3 bg-white border border-slate-200 rounded-xl font-bold outline-none focus:ring-2 focus:ring-orange-500 appearance-none">
                                                <option value="">Direct Sale</option>
                                                {brokers.map(b => <option key={b.id} value={b.id}>{b.broker_name}</option>)}
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="border border-slate-200 rounded-2xl overflow-hidden">
                                    <table className="w-full text-left">
                                        <thead className="bg-slate-800 text-white text-[9px] uppercase font-black">
                                            <tr>
                                                <th className="p-4">SKU Description</th>
                                                <th className="p-4 text-center">Rate (CR)</th>
                                                <th className="p-4 text-center">Rate (IMM)</th>
                                                <th className="p-4 text-center">Quantity</th>
                                                <th className="p-4 w-12"></th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {gridRows.map((row, index) => (
                                                <tr key={index}>
                                                    <td className="p-2">
                                                        <select value={row.product_id} onChange={e => updateGrid(index, 'product_id', e.target.value)} className="w-full p-2 text-sm font-bold outline-none bg-transparent">
                                                            <option value="">Choose Item...</option>
                                                            {products.map(p => <option key={p.id} value={p.id}>{p.product_name}</option>)}
                                                        </select>
                                                    </td>
                                                    <td className="p-2"><input type="number" value={row.rate_cr} onChange={e => updateGrid(index, 'rate_cr', e.target.value)} className="w-full p-2 text-center text-sm font-bold outline-none" /></td>
                                                    <td className="p-2"><input type="number" value={row.rate_imm} onChange={e => updateGrid(index, 'rate_imm', e.target.value)} className="w-full p-2 text-center text-sm font-bold outline-none" /></td>
                                                    <td className="p-2"><input type="number" value={row.qty} onChange={e => updateGrid(index, 'qty', e.target.value)} className="w-full p-2 text-center text-sm font-black text-orange-600 bg-orange-50 rounded-lg outline-none" /></td>
                                                    <td className="p-2">
                                                        <button onClick={() => setGridRows(gridRows.filter((_, i) => i !== index))} className="p-2 text-slate-300 hover:text-red-500"><MinusCircle size={18}/></button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                    <button onClick={() => setGridRows([...gridRows, { product_id: '', rate_cr: 0, rate_imm: 0, rate_per: 0, qty: 0, bag_wt: 0 }])} className="w-full p-4 bg-slate-50 text-orange-600 font-black text-[10px] uppercase tracking-widest hover:bg-slate-100 transition-all flex justify-center items-center gap-2">
                                        <PlusCircle size={16}/> Add New Item Row
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Modal Footer */}
                        <div className="p-6 bg-slate-50 border-t flex justify-between items-center">
                            <div className="flex gap-10">
                                <div>
                                    <p className="text-[9px] font-black text-slate-400 uppercase">Total Quantity</p>
                                    <p className="text-xl font-black text-slate-800">{totalQty.toFixed(2)}</p>
                                </div>
                                <div>
                                    <p className="text-[9px] font-black text-slate-400 uppercase">Line Items</p>
                                    <p className="text-xl font-black text-orange-600">{gridRows.filter(r => r.product_id).length}</p>
                                </div>
                            </div>
                            <div className="flex gap-3">
                                <button onClick={() => setIsModalOpen(false)} className="px-8 py-3 font-bold text-slate-400 hover:text-slate-600 text-xs tracking-widest uppercase">Discard</button>
                                <button onClick={handleSave} disabled={loading} className="bg-orange-600 hover:bg-orange-700 text-white px-10 py-3 rounded-xl font-black shadow-lg shadow-orange-100 flex items-center gap-2 active:scale-95 transition-all text-xs tracking-widest">
                                    <Save size={18}/> {loading ? 'SAVING...' : 'FINALIZE BILL'}
                                </button>
                            </div>
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