import React, { useState, useEffect, useMemo } from 'react';
import { mastersAPI, transactionsAPI } from '../service/api';
import { 
    Truck, ArrowRightLeft, Warehouse, Send, AlertCircle, 
    Calendar, Plus, Trash2, X, Search, RefreshCw, 
    ChevronLeft, ChevronRight, Square, CheckSquare, 
    Edit, MapPin, Package, Clock, ShieldCheck,
    Percent, DollarSign, Info, Filter, Database, 
    Activity, ArrowRightCircle, Layers, ClipboardList, Box
} from 'lucide-react';

export const DepotTransfer = () => {
    // --- Initial States (Preserved) ---
    const emptyState = {
        id: null,
        from_depot_id: '',
        to_depot_id: '',
        vehicle_no: '',
        remarks: '',
        transfer_date: new Date().toISOString().split('T')[0],
        items: [] 
    };

    // --- Main States ---
    const [list, setList] = useState([]);
    const [depots, setDepots] = useState([]);
    const [sourceInventory, setSourceInventory] = useState([]); 
    const [formData, setFormData] = useState(emptyState);
    const [loading, setLoading] = useState(false);
    const [submitLoading, setSubmitLoading] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isFetchingStock, setIsFetchingStock] = useState(false);
    const [activeTab, setActiveTab] = useState('route');

    // Search & Selection
    const [searchField, setSearchField] = useState('vehicle_no');
    const [searchCondition, setSearchCondition] = useState('Like');
    const [searchValue, setSearchValue] = useState('');
    const [isSelectionMode, setIsSelectionMode] = useState(false);
    const [selectedIds, setSelectedIds] = useState([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [viewMode, setViewMode] = useState(false);
    const itemsPerPage = 10;

    // --- Aggregates ---
    const totalMovementKg = useMemo(() => {
        return formData.items.reduce((sum, item) => sum + (parseFloat(item.qty) || 0), 0);
    }, [formData.items]);

    // --- Initialization ---
    useEffect(() => {
        fetchDepots();
        fetchRecords();
    }, []);

    useEffect(() => {
        if (formData.from_depot_id) fetchSourceStock(formData.from_depot_id);
        else setSourceInventory([]);
    }, [formData.from_depot_id]);

    const fetchDepots = async () => {
        try {
            const res = await mastersAPI.accounts.getAll();
            const all = res.data.data || res.data || [];
            setDepots(all.filter(acc => (acc.account_group?.includes('DEPOT') || (acc.account_name || '').toUpperCase().includes('DEPOT'))));
        } catch (err) { console.error("Error fetching depots:", err); }
    };

    const fetchRecords = async () => {
        setLoading(true);
        try {
            const res = await transactionsAPI.depotSales.getAll();
            const data = Array.isArray(res.data) ? res.data : (res.data.data || []);
            setList(data.filter(inv => inv.sales_type === 'DEPOT TRANSFER'));
        } catch (err) { console.error("Fetch records error:", err); }
        finally { setLoading(false); }
    };

    const fetchSourceStock = async (depotId) => {
        setIsFetchingStock(true);
        try {
            const res = await transactionsAPI.depotStock.getInventory(depotId);
            setSourceInventory(res.data.data || []);
        } catch (err) { console.error("Source stock fetch error"); }
        finally { setIsFetchingStock(false); }
    };

    const handleAddNew = () => {
        setViewMode(false);
        setFormData({ ...emptyState, items: [{ product_id: '', qty: '', available: 0, product_name: '' }] });
        setActiveTab('route');
        setIsModalOpen(true);
    };

    const updateProductRow = (index, field, value) => {
        const newItems = [...formData.items];
        if (field === 'product_id') {
            const selectedProd = sourceInventory.find(p => String(p.id) === String(value));
            newItems[index] = {
                ...newItems[index],
                product_id: value,
                product_name: selectedProd?.product_name || '',
                available: selectedProd?.depot_stock || 0
            };
        } else {
            newItems[index][field] = value;
        }
        setFormData({ ...formData, items: newItems });
    };

    const handleExecuteTransfer = async () => {
        if (!formData.from_depot_id || !formData.to_depot_id) return alert("Select Source and Destination Depots");
        if (formData.from_depot_id === formData.to_depot_id) return alert("Source and Destination cannot be the same");
        
        const hasError = formData.items.some(item => !item.product_id || parseFloat(item.qty || 0) <= 0);
        if (hasError) return alert("Ensure all rows have a product and valid quantity");

        setSubmitLoading(true);
        try {
            const payload = {
                sales_type: 'DEPOT TRANSFER',
                depot_id: formData.from_depot_id,
                party_id: formData.to_depot_id,
                vehicle_no: formData.vehicle_no,
                remarks: formData.remarks,
                date: formData.transfer_date,
                Details: formData.items.map(item => ({
                    product_id: item.product_id,
                    total_kgs: parseFloat(item.qty),
                    rate: 0,
                    order_type: 'TRANSFER'
                }))
            };

            await transactionsAPI.depotSales.create(payload);
            
            alert("Stock Transfer Authorized Successfully!");
            setIsModalOpen(false);
            fetchRecords();
            window.dispatchEvent(new Event("depotStockUpdated"));
        } catch (err) { 
            alert("Transfer Failed: " + (err.response?.data?.error || err.message)); 
        } finally { setSubmitLoading(false); }
    };

    const handleRowClick = async (item) => {
        try {
            setViewMode(true);
            const res = await transactionsAPI.depotSales.getOne(item.id);
            const record = res.data.data;

            await fetchSourceStock(record.depot_id);

            setFormData({
                id: record.id,
                from_depot_id: record.depot_id,
                to_depot_id: record.party_id,
                vehicle_no: record.vehicle_no,
                remarks: record.remarks,
                transfer_date: record.date,
                items: (record.DepotSalesDetails || []).map(d => {
                    const stock = sourceInventory.find(p => String(p.id) === String(d.product_id));
                    return {
                        product_id: d.product_id,
                        qty: Number(d.total_kgs || 0),
                        available: stock?.depot_stock || 0,
                        product_name: d.Product?.product_name || ''
                    };
                })
            });

            setIsModalOpen(true);
        } catch (err) {
            console.error(err);
        }
    };

    const filteredData = useMemo(() => {
        let result = Array.isArray(list) ? [...list] : [];
        if (searchValue.trim()) {
            result = result.filter(item => {
                let itemValue = "";
                if (searchField === 'from_depot') itemValue = item.Depot?.account_name || "";
                else if (searchField === 'to_depot') itemValue = item.Party?.account_name || "";
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
            
            {/* HEADER */}
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-3">
                        <ArrowRightLeft className="text-blue-600" size={28} /> Stock Movement Engine
                    </h1>
                    <p className="text-sm text-slate-600 mt-1">Inter-depot stock transfer authorization & logistics registry</p>
                </div>
                <div className="flex gap-3">
                    <button 
                        onClick={() => { setIsSelectionMode(!isSelectionMode); setSelectedIds([]); }}
                        className={`px-6 py-2.5 border rounded-lg font-semibold transition-all ${isSelectionMode ? 'bg-amber-100 border-amber-300 text-amber-800' : 'bg-white border-slate-300 text-blue-700 hover:bg-slate-50'}`}>
                        {isSelectionMode ? 'Cancel Selection' : 'Select Mode'}
                    </button>
                    <button onClick={handleAddNew} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg font-semibold shadow-md transition-all active:scale-95">
                        <Plus size={20} /> New Transfer
                    </button>
                    <button onClick={fetchRecords} className="p-3 border border-slate-300 rounded-lg bg-white text-slate-500 hover:text-blue-700 transition-colors">
                        <RefreshCw size={22} className={loading ? 'animate-spin' : ''} />
                    </button>
                </div>
            </div>

            {/* FILTER BAR */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm mb-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-5 items-end">
                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase mb-1.5 block ml-1">Search Field</label>
                        <select value={searchField} onChange={e => setSearchField(e.target.value)} className="w-full border border-slate-300 p-2.5 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-400">
                            <option value="vehicle_no">Vehicle No</option>
                            <option value="from_depot">Source Depot</option>
                            <option value="to_depot">Target Depot</option>
                        </select>
                    </div>
                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase mb-1.5 block ml-1">Condition</label>
                        <select value={searchCondition} onChange={e => setSearchCondition(e.target.value)} className="w-full border border-slate-300 p-2.5 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-400">
                            <option value="Like">Like</option>
                            <option value="Equal">Equal</option>
                        </select>
                    </div>
                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase mb-1.5 block ml-1">Value</label>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input 
                                type="text" 
                                placeholder="Search movements..." 
                                value={searchValue} 
                                onChange={e => setSearchValue(e.target.value)} 
                                className="w-full border border-slate-300 pl-10 pr-4 py-2.5 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-400" 
                            />
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <button onClick={() => setSearchValue('')} className="flex-1 border border-slate-300 py-2.5 rounded-lg text-sm font-semibold hover:bg-slate-50 transition-all">Clear</button>
                        <div className="flex-1 bg-blue-50 text-blue-700 border border-blue-200 py-2.5 rounded-lg text-sm font-semibold flex items-center justify-center gap-2">
                            <Filter size={16}/> {filteredData.length} Matches
                        </div>
                    </div>
                </div>
            </div>

            {/* TABLE */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-blue-700 text-white">
                                {isSelectionMode && <th className="p-4 w-12 text-center"><Square size={20} className="mx-auto" /></th>}
                                <th className="p-4 text-sm font-semibold uppercase tracking-wider">Date</th>
                                <th className="p-4 text-sm font-semibold uppercase tracking-wider">Source Depot</th>
                                <th className="p-4 text-sm font-semibold uppercase tracking-wider">Target Depot</th>
                                <th className="p-4 text-sm font-semibold uppercase tracking-wider text-center">Vehicle No</th>
                                <th className="p-4 text-sm font-semibold uppercase tracking-wider text-center">Status</th>
                                {!isSelectionMode && <th className="p-4 w-12"></th>}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr><td colSpan={6} className="py-32 text-center"><RefreshCw size={56} className="animate-spin text-blue-600 mx-auto mb-5" /><p className="text-slate-600 font-medium">Loading movement records...</p></td></tr>
                            ) : currentItems.length > 0 ? (
                                currentItems.map((item) => (
                                    <tr 
                                        key={item.id} 
                                        onClick={() => handleRowClick(item)} 
                                        className={`transition-colors cursor-pointer hover:bg-blue-50/60 ${selectedIds.includes(item.id) ? 'bg-blue-50' : ''}`}
                                    >
                                        {isSelectionMode && (
                                            <td className="p-4 text-center" onClick={e => { e.stopPropagation(); }}>
                                                {selectedIds.includes(item.id) ? <CheckSquare size={20} className="text-blue-600 mx-auto"/> : <Square size={20} className="text-slate-300 mx-auto"/>}
                                            </td>
                                        )}
                                        <td className="p-4 text-sm text-slate-600">{item.date}</td>
                                        <td className="p-4 text-sm font-semibold text-slate-800">{item.Depot?.account_name}</td>
                                        <td className="p-4 text-sm font-bold text-blue-700">→ {item.Party?.account_name}</td>
                                        <td className="p-4 text-sm font-medium text-center text-slate-700">{item.vehicle_no || '—'}</td>
                                        <td className="p-4 text-center">
                                            <span className="bg-emerald-100 text-emerald-800 text-xs px-4 py-1 rounded-full font-semibold border border-emerald-200">Authorized</span>
                                        </td>
                                        {!isSelectionMode && <td className="p-4 text-right"><ArrowRightCircle size={20} className="text-slate-400" /></td>}
                                    </tr>
                                ))
                            ) : (
                                <tr><td colSpan={6} className="py-32 text-center opacity-40">
                                    <Warehouse size={72} className="mx-auto mb-5 text-slate-400"/>
                                    <p className="text-lg font-semibold uppercase tracking-wide">No transfer records found</p>
                                </td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
                <div className="p-5 bg-slate-50 border-t flex items-center justify-between">
                    <span className="text-xs text-slate-500 font-medium">Page {currentPage} of {totalPages}</span>
                    <div className="flex gap-2">
                        <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} className="p-2.5 border rounded-lg bg-white disabled:opacity-40 hover:bg-slate-50">
                            <ChevronLeft size={18}/>
                        </button>
                        <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)} className="p-2.5 border rounded-lg bg-white disabled:opacity-40 hover:bg-slate-50">
                            <ChevronRight size={18}/>
                        </button>
                    </div>
                </div>
            </div>

            {/* ──────────────────────────────────────────────── */}
            {/*                  MODAL (larger text version)     */}
            {/* ──────────────────────────────────────────────── */}

            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-7xl max-h-[96vh] overflow-hidden flex flex-col animate-in zoom-in duration-200">
                        
                        <div className="bg-blue-700 p-5 flex justify-between items-center text-white shadow-lg shrink-0">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-white/20 rounded-xl"><ArrowRightLeft size={24} /></div>
                                <div>
                                    <h2 className="text-xl font-bold uppercase tracking-tight">Stock Movement Authorization</h2>
                                    <p className="text-sm text-blue-100 mt-0.5">Ref: {formData.vehicle_no || 'NEW'}</p>
                                </div>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="hover:bg-blue-600 p-2 rounded-full transition-all"><X size={28}/></button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 lg:p-8 flex flex-col lg:flex-row gap-8 bg-slate-50/60">
                            
                            {/* LEFT PANEL */}
                            <div className="flex-1 space-y-8">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="bg-white p-7 rounded-2xl border shadow-md space-y-5">
                                        <div className="flex items-center gap-3 text-slate-500"><MapPin size={18}/><span className="text-xs font-bold uppercase tracking-wider">Routing</span></div>
                                        <div className="space-y-4">
                                            <div>
                                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">From Depot (Source)</label>
                                                <select 
                                                    value={formData.from_depot_id}
                                                    onChange={e => setFormData({...formData, from_depot_id: e.target.value, items: [{ product_id: '', qty: '', available: 0, product_name: '' }]})} 
                                                    className="w-full border border-slate-300 p-3 rounded-lg text-base font-medium outline-none focus:ring-2 focus:ring-blue-400"
                                                >
                                                    <option value="">— Select Origin Depot —</option>
                                                    {depots.map(d => <option key={d.id} value={d.id}>{d.account_name}</option>)}
                                                </select>
                                            </div>
                                            <div>
                                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">To Depot (Destination)</label>
                                                <select 
                                                    value={formData.to_depot_id}
                                                    onChange={e => setFormData({...formData, to_depot_id: e.target.value})}
                                                    className="w-full border border-slate-300 p-3 rounded-lg text-base font-medium outline-none focus:ring-2 focus:ring-blue-400"
                                                >
                                                    <option value="">— Select Target Depot —</option>
                                                    {depots.map(d => <option key={d.id} value={d.id}>{d.account_name}</option>)}
                                                </select>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bg-white p-7 rounded-2xl border shadow-md space-y-5">
                                        <div className="flex items-center gap-3 text-slate-500"><Truck size={18}/><span className="text-xs font-bold uppercase tracking-wider">Logistics</span></div>
                                        <div className="grid grid-cols-1 gap-5">
                                            <div>
                                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Vehicle Number</label>
                                                <input 
                                                    value={formData.vehicle_no} 
                                                    onChange={e => setFormData({...formData, vehicle_no: e.target.value.toUpperCase()})} 
                                                    placeholder="TN-00-XX-0000" 
                                                    className="w-full border border-slate-300 p-3 rounded-lg text-base font-medium uppercase outline-none focus:ring-2 focus:ring-blue-400" 
                                                />
                                            </div>
                                            <div>
                                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Transfer Date</label>
                                                <input 
                                                    type="date" 
                                                    value={formData.transfer_date} 
                                                    onChange={e => setFormData({...formData, transfer_date: e.target.value})} 
                                                    className="w-full border border-slate-300 p-3 rounded-lg text-base font-medium outline-none focus:ring-2 focus:ring-blue-400" 
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* ITEMS SECTION */}
                                <div className="bg-white rounded-2xl border shadow-md overflow-hidden flex flex-col">
                                    <div className="bg-slate-900 p-5 flex justify-between items-center">
                                        <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-3"><Layers size={18}/> Transfer Items</h3>
                                        <button 
                                            onClick={() => setFormData({...formData, items: [...formData.items, { product_id: '', qty: '', available: 0, product_name: '' }]})}
                                            disabled={!formData.from_depot_id}
                                            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg text-sm font-bold uppercase disabled:opacity-40 transition-all"
                                        >
                                            + Add Item
                                        </button>
                                    </div>
                                    <div className="p-6 space-y-4">
                                        {!formData.from_depot_id ? (
                                            <div className="py-16 text-center opacity-50">
                                                <Info size={40} className="mx-auto mb-4"/>
                                                <p className="text-base font-semibold uppercase tracking-wide">Select source depot to view available stock</p>
                                            </div>
                                        ) : formData.items.map((row, idx) => (
                                            <div key={idx} className="grid grid-cols-12 gap-5 p-4 bg-slate-50 border rounded-xl items-end group relative">
                                                <div className="col-span-7 lg:col-span-6">
                                                    <label className="text-xs font-bold text-slate-500 uppercase block mb-1.5">Product</label>
                                                    <select 
                                                        value={row.product_id}
                                                        onChange={e => updateProductRow(idx, 'product_id', e.target.value)}
                                                        className="w-full border border-slate-300 p-3 rounded-lg text-base font-medium outline-none focus:ring-2 focus:ring-blue-400"
                                                    >
                                                        <option value="">— Select Product —</option>
                                                        {sourceInventory.map(p => (
                                                            <option key={p.id} value={p.id}>
                                                                {p.product_name} ({p.depot_stock} kg)
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>
                                                <div className="col-span-4 lg:col-span-5">
                                                    <label className="text-xs font-bold text-slate-500 uppercase block mb-1.5">Quantity (kg)</label>
                                                    <input 
                                                        type="number"
                                                        value={row.qty}
                                                        onChange={e => updateProductRow(idx, 'qty', e.target.value)}
                                                        className={`w-full border border-slate-300 p-3 rounded-lg text-lg font-bold outline-none focus:ring-2 focus:ring-blue-400 ${parseFloat(row.qty) > row.available ? 'text-rose-700 border-rose-400' : 'text-blue-700'}`}
                                                        placeholder="0.00"
                                                    />
                                                </div>
                                                <div className="col-span-1 flex justify-end">
                                                    <button onClick={() => setFormData({...formData, items: formData.items.filter((_, i) => i !== idx)})} className="p-3 text-slate-400 hover:text-rose-600 transition-colors">
                                                        <Trash2 size={20}/>
                                                    </button>
                                                </div>

                                                {parseFloat(row.qty) > row.available && (
                                                    <div className="absolute -top-3 left-5 bg-rose-600 text-white text-xs px-3 py-1 rounded-full font-bold uppercase flex items-center gap-1.5 shadow-md">
                                                        <AlertCircle size={14}/> Over limit ({row.available} kg available)
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* RIGHT COCKPIT –– larger & clearer */}
                            <div className="w-full lg:w-96 bg-slate-900 rounded-2xl p-7 text-white flex flex-col justify-between shadow-2xl shrink-0">
                                <div className="space-y-8">
                                    <div className="text-center">
                                        <Activity size={40} className="text-blue-400 mx-auto mb-3" />
                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Movement Summary</p>
                                    </div>

                                    <div className="space-y-6">
                                        <div className="bg-white/8 p-6 rounded-2xl border border-white/10">
                                            <p className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-2">Total Weight</p>
                                            <div className="flex items-baseline gap-3">
                                                <h3 className="text-4xl lg:text-5xl font-black text-emerald-400 tracking-tight">{totalMovementKg.toFixed(2)}</h3>
                                                <span className="text-lg font-bold text-slate-300">KG</span>
                                            </div>
                                        </div>

                                        <div className="bg-white/8 p-6 rounded-2xl border border-white/10">
                                            <p className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-2">Items</p>
                                            <div className="flex items-center gap-4">
                                                <Package size={28} className="text-blue-400" />
                                                <span className="text-3xl font-black">{formData.items.length}</span>
                                                <span className="text-base font-medium text-slate-300">line{formData.items.length !== 1 ? 's' : ''}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="p-5 bg-blue-700/10 rounded-xl border border-blue-500/20">
                                        <textarea 
                                            value={formData.remarks} 
                                            onChange={e => setFormData({...formData, remarks: e.target.value.toUpperCase()})}
                                            className="w-full bg-transparent text-sm font-medium text-blue-100 placeholder:text-blue-300 outline-none h-24 resize-none" 
                                            placeholder="Remarks / special instructions / notes..."
                                        />
                                    </div>
                                </div>

                                <div className="mt-10 p-6 bg-blue-700/15 rounded-2xl border border-blue-500/20 text-center relative overflow-hidden">
                                    <Send className="absolute -right-4 -bottom-4 text-white/5 group-hover:scale-125 transition-transform" size={100} />
                                    <p className="text-xs font-bold text-blue-300 uppercase tracking-widest mb-2 relative z-10">Status</p>
                                    <h3 className="text-2xl font-black text-white uppercase relative z-10">
                                        {submitLoading ? 'PROCESSING...' : 'READY TO EXECUTE'}
                                    </h3>
                                </div>
                            </div>
                        </div>

                        <div className="p-6 bg-slate-100 border-t flex justify-end items-center gap-5 shrink-0">
                            <button onClick={() => setIsModalOpen(false)} className="px-10 py-3.5 font-semibold text-slate-500 hover:text-slate-700 text-sm tracking-wide uppercase transition-colors">Cancel</button>
                            <button 
                                onClick={handleExecuteTransfer} 
                                disabled={submitLoading || formData.items.length === 0} 
                                className="bg-blue-700 hover:bg-blue-800 text-white px-12 py-3.5 rounded-xl font-bold shadow-lg flex items-center gap-3 active:scale-95 transition-all text-base disabled:opacity-50"
                            >
                                <Send size={20}/> {submitLoading ? 'EXECUTING...' : 'EXECUTE TRANSFER'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <style jsx>{`
                input[type='number']::-webkit-inner-spin-button, 
                input[type='number']::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
                ::-webkit-scrollbar { width: 6px; height: 6px; }
                ::-webkit-scrollbar-track { background: transparent; }
                ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
            `}</style>
        </div>
    );
};

export default DepotTransfer;