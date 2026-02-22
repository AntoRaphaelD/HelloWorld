import React, { useState, useEffect, useMemo } from 'react';
import { mastersAPI, transactionsAPI } from '../service/api';
import { 
    Truck, ArrowRightLeft, Warehouse, Send, AlertCircle, 
    Calendar, Plus, Trash2, X, Search, RefreshCw, 
    ChevronLeft, ChevronRight, Edit, Square, CheckSquare,
    Activity, ClipboardList, Package, Layers, Info
} from 'lucide-react';

export const DepotTransfer = () => {
    // --- Initial States ---
    const emptyState = {
        id: null,
        from_depot_id: '',
        to_depot_id: '',
        vehicle_no: '',
        remarks: '',
        transfer_date: new Date().toISOString().split('T')[0],
        items: [] // Products to be moved
    };

    // --- Main States ---
    const [list, setList] = useState([]);
    const [depots, setDepots] = useState([]);
    const [sourceInventory, setSourceInventory] = useState([]); // Stock available at selected source
    const [formData, setFormData] = useState(emptyState);
    const [loading, setLoading] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isFetchingStock, setIsFetchingStock] = useState(false);

    // --- Search & Pagination ---
    const [searchValue, setSearchValue] = useState('');
    const [searchField, setSearchField] = useState('vehicle_no');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    // --- Initialization ---
    useEffect(() => {
        fetchDepots();
        fetchRecords();
    }, []);

    // --- Trigger: Fetch Source Stock when "From Depot" Changes ---
    useEffect(() => {
        if (formData.from_depot_id) {
            fetchSourceStock(formData.from_depot_id);
        } else {
            setSourceInventory([]);
        }
    }, [formData.from_depot_id]);

    const fetchDepots = async () => {
        try {
            const res = await mastersAPI.accounts.getAll();
            const all = res.data.data || res.data || [];
            setDepots(all.filter(acc => (acc.account_group || "").toUpperCase().trim() === 'DEPOT'));
        } catch (err) { console.error("Error fetching depots:", err); }
    };

    const fetchRecords = async () => {
        setLoading(true);
        try {
            const res = await transactionsAPI.depotSales.getAll(); // Using Depot Sales as base or specific transfer API
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

    // --- Grid Actions ---
    const addProductRow = () => {
        setFormData({
            ...formData,
            items: [...formData.items, { product_id: '', qty: '', available: 0, product_name: '' }]
        });
    };

    const removeProductRow = (index) => {
        const newItems = formData.items.filter((_, i) => i !== index);
        setFormData({ ...formData, items: newItems });
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

    // --- Execution ---
    const handleExecuteTransfer = async (e) => {
        if (e) e.preventDefault();
        
        if (!formData.from_depot_id || !formData.to_depot_id) return alert("Select Source and Destination Depots");
        if (formData.from_depot_id === formData.to_depot_id) return alert("Source and Destination cannot be the same");
        if (formData.items.length === 0) return alert("Add at least one product to transfer");

        // Validate quantities
        const hasError = formData.items.some(item => !item.product_id || parseFloat(item.qty || 0) <= 0);
        if (hasError) return alert("Ensure all rows have a product and a quantity greater than 0");

        const overStock = formData.items.some(item => parseFloat(item.qty) > parseFloat(item.available));
        if (overStock) return alert("One or more items exceed available source stock!");

        setLoading(true);
        try {
            const payload = {
                ...formData,
                sales_type: 'DEPOT TRANSFER',
                depot_id: formData.from_depot_id, // Sender
                party_id: formData.to_depot_id,   // Receiver
                date: formData.transfer_date
            };

            await transactionsAPI.depotSales.create(payload);
            
            // 🔥 Refresh UI
            window.dispatchEvent(new Event("depotStockUpdated"));
            setIsModalOpen(false);
            fetchRecords();
            alert("Inter-Depot Transfer Executed Successfully!");
        } catch (err) { 
            alert("Transfer Failed: " + (err.response?.data?.error || err.message)); 
        } finally { setLoading(false); }
    };

    // --- Search Logic ---
    const filteredData = useMemo(() => {
        return list.filter(item => 
            String(item.vehicle_no || '').toLowerCase().includes(searchValue.toLowerCase())
        ).sort((a, b) => b.id - a.id);
    }, [list, searchValue]);

    const currentItems = filteredData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    return (
        <div className="min-h-screen bg-[#f8fafc] p-6 font-sans">
            
            {/* 1. TOP HEADER */}
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
                        <ArrowRightLeft className="text-amber-500" size={32} /> Stock Movement Engine
                    </h1>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Inter-Depot Transfer & Logistics</p>
                </div>
                
                <div className="flex gap-2">
                    <button onClick={() => { setFormData(emptyState); setIsModalOpen(true); }} className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white px-6 py-2 rounded-xl font-bold shadow-lg transition-all active:scale-95">
                        <Plus size={18} /> New Transfer
                    </button>
                    <button onClick={fetchRecords} className="p-2 border rounded-lg bg-white text-slate-400 hover:text-amber-600 transition-colors">
                        <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                    </button>
                </div>
            </div>

            {/* 2. MAIN TABLE */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-slate-900 text-white">
                        <tr>
                            <th className="p-4 text-[10px] font-black uppercase tracking-widest">Date</th>
                            <th className="p-4 text-[10px] font-black uppercase tracking-widest">Source</th>
                            <th className="p-4 text-[10px] font-black uppercase tracking-widest text-amber-400">Target Depot</th>
                            <th className="p-4 text-[10px] font-black uppercase tracking-widest text-center">Vehicle No</th>
                            <th className="p-4 text-[10px] font-black uppercase tracking-widest text-center">Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {currentItems.length > 0 ? currentItems.map((item) => (
                            <tr key={item.id} className="hover:bg-slate-50 transition-colors border-b border-slate-50">
                                <td className="p-4 text-sm font-bold text-slate-500">{item.date}</td>
                                <td className="p-4 text-sm font-black text-slate-700 uppercase">{item.Depot?.account_name}</td>
                                <td className="p-4 text-sm font-black text-amber-600 uppercase italic">→ {item.Party?.account_name}</td>
                                <td className="p-4 text-sm font-mono text-center font-bold text-slate-400">{item.vehicle_no || 'N/A'}</td>
                                <td className="p-4 text-center">
                                    <span className="bg-emerald-50 text-emerald-600 text-[10px] px-3 py-1 rounded-full font-black uppercase border border-emerald-100">Transferred</span>
                                </td>
                            </tr>
                        )) : (
                            <tr><td colSpan={5} className="p-20 text-center opacity-20 font-black uppercase">No Transfers Recorded</td></tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* 3. TRANSFER ENGINE MODAL */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-md p-4">
                    <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-6xl overflow-hidden flex flex-col max-h-[95vh] animate-in zoom-in duration-200">
                        
                        {/* Modal Header */}
                        <div className="bg-amber-500 p-6 flex justify-between items-center text-white">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-white/20 rounded-xl"><Layers /></div>
                                <div>
                                    <h2 className="font-black uppercase tracking-widest text-xl">Create Stock Movement</h2>
                                    <p className="text-[10px] font-bold text-amber-100 uppercase tracking-widest">Movement Authorization Portal</p>
                                </div>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="hover:bg-white/10 p-2 rounded-full transition-colors"><X size={24}/></button>
                        </div>

                        {/* Modal Body */}
                        <div className="flex-1 overflow-y-auto p-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
                            
                            {/* LEFT: LOCATION SELECTION */}
                            <div className="space-y-6">
                                <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100 space-y-4">
                                    <h3 className="text-xs font-black text-indigo-600 uppercase tracking-widest flex items-center gap-2">
                                        <Warehouse size={16}/> Routing
                                    </h3>
                                    
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black text-slate-400 uppercase">From (Source)</label>
                                        <select 
                                            value={formData.from_depot_id}
                                            onChange={e => setFormData({...formData, from_depot_id: e.target.value, items: []})}
                                            className="w-full p-3 bg-white border border-slate-200 rounded-xl font-bold outline-none focus:ring-2 focus:ring-amber-500"
                                        >
                                            <option value="">Select Source...</option>
                                            {depots.map(d => <option key={d.id} value={d.id}>{d.account_name}</option>)}
                                        </select>
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black text-slate-400 uppercase">To (Destination)</label>
                                        <select 
                                            value={formData.to_depot_id}
                                            onChange={e => setFormData({...formData, to_depot_id: e.target.value})}
                                            className="w-full p-3 bg-white border border-slate-200 rounded-xl font-bold outline-none focus:ring-2 focus:ring-amber-500"
                                        >
                                            <option value="">Select Destination...</option>
                                            {depots.map(d => <option key={d.id} value={d.id}>{d.account_name}</option>)}
                                        </select>
                                    </div>
                                </div>

                                <div className="p-6 bg-slate-900 rounded-3xl text-white space-y-4">
                                    <h3 className="text-xs font-black text-amber-500 uppercase tracking-widest flex items-center gap-2">
                                        <Truck size={16}/> Logistics
                                    </h3>
                                    <input 
                                        type="text" 
                                        placeholder="Vehicle Number" 
                                        value={formData.vehicle_no}
                                        onChange={e => setFormData({...formData, vehicle_no: e.target.value.toUpperCase()})}
                                        className="w-full bg-white/10 border-b border-white/20 p-2 outline-none font-bold uppercase"
                                    />
                                    <input 
                                        type="date" 
                                        value={formData.transfer_date}
                                        onChange={e => setFormData({...formData, transfer_date: e.target.value})}
                                        className="w-full bg-white/10 border-b border-white/20 p-2 outline-none font-bold"
                                    />
                                </div>
                            </div>

                            {/* RIGHT: PRODUCT GRID */}
                            <div className="lg:col-span-2 flex flex-col">
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Movement Items</h3>
                                    <button 
                                        onClick={addProductRow}
                                        disabled={!formData.from_depot_id}
                                        className="bg-indigo-50 text-indigo-600 px-4 py-2 rounded-xl text-[10px] font-black uppercase hover:bg-indigo-100 disabled:opacity-30"
                                    >
                                        <Plus size={14} className="inline mr-1" /> Add Product
                                    </button>
                                </div>

                                <div className="flex-1 space-y-3 overflow-y-auto pr-2 custom-scrollbar">
                                    {!formData.from_depot_id ? (
                                        <div className="h-full flex flex-col items-center justify-center border-2 border-dashed border-slate-100 rounded-[2rem] opacity-30 text-center p-10">
                                            <Info size={40} className="mb-2"/>
                                            <p className="text-xs font-black uppercase tracking-widest">Select a Source Depot first<br/>to load its inventory</p>
                                        </div>
                                    ) : formData.items.map((row, idx) => (
                                        <div key={idx} className="grid grid-cols-12 gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100 items-end">
                                            <div className="col-span-6">
                                                <label className="text-[9px] font-black text-slate-400 uppercase">Product</label>
                                                <select 
                                                    value={row.product_id}
                                                    onChange={e => updateProductRow(idx, 'product_id', e.target.value)}
                                                    className="w-full bg-transparent font-bold text-sm outline-none"
                                                >
                                                    <option value="">Select Item...</option>
                                                    {sourceInventory.map(p => (
                                                        <option key={p.id} value={p.id}>{p.product_name} ({p.depot_stock} KG)</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div className="col-span-4 relative">
                                                <label className="text-[9px] font-black text-slate-400 uppercase">Transfer Qty (KG)</label>
                                                <input 
                                                    type="number"
                                                    value={row.qty}
                                                    onChange={e => updateProductRow(idx, 'qty', e.target.value)}
                                                    className={`w-full bg-transparent font-black text-lg outline-none ${parseFloat(row.qty) > row.available ? 'text-red-500' : 'text-indigo-600'}`}
                                                    placeholder="0.00"
                                                />
                                                {parseFloat(row.qty) > row.available && <p className="absolute -bottom-4 left-0 text-[8px] font-bold text-red-500 uppercase">Over Stock!</p>}
                                            </div>
                                            <div className="col-span-2 text-right">
                                                <button onClick={() => removeProductRow(idx)} className="p-2 text-slate-300 hover:text-red-500 transition-colors"><Trash2 size={18}/></button>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div className="mt-6 pt-6 border-t border-slate-100 flex justify-end gap-4">
                                    <button onClick={() => setIsModalOpen(false)} className="px-8 py-3 font-bold text-slate-400 text-xs uppercase tracking-widest">Discard</button>
                                    <button 
                                        onClick={handleExecuteTransfer}
                                        disabled={loading || formData.items.length === 0}
                                        className="bg-amber-500 text-slate-900 px-10 py-3 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-amber-100 flex items-center gap-2 hover:bg-amber-600 active:scale-95 transition-all disabled:opacity-30"
                                    >
                                        <Send size={18}/> {loading ? 'Executing...' : 'Execute Transfer'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            
            <style jsx>{`
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
            `}</style>
        </div>
    );
};

export default DepotTransfer;