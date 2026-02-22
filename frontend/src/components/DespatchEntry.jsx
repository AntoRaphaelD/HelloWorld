import React, { useState, useEffect, useMemo } from 'react';
import { mastersAPI, transactionsAPI } from '../service/api';
import { 
    Truck, Save, Clock, MapPin, Plus, Trash2, X, Search, 
    RefreshCw, ChevronLeft, ChevronRight, Edit, Square, 
    CheckSquare, Calendar, Navigation, DollarSign, Package,
    Info, Activity, Filter, Hash, Database, ArrowRight
} from 'lucide-react';

const DespatchEntry = () => {
    // --- Initial State ---
    const emptyState = { 
        id: null,
        load_no: '', 
        load_date: new Date().toISOString().split('T')[0], 
        transport_id: '', 
        lr_no: '', 
        lr_date: new Date().toISOString().split('T')[0], 
        vehicle_no: '', 
        delivery_place: '', 
        in_time: '', 
        out_time: '', 
        no_of_bags: 0, 
        freight: 0, 
        freight_per_bag: 0 
    };

    // --- Main States ---
    const [list, setList] = useState([]);
    const [transports, setTransports] = useState([]);
    const [formData, setFormData] = useState(emptyState);
    const [loading, setLoading] = useState(false);
    const [submitLoading, setSubmitLoading] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);

    // --- DYNAMIC FILTERING STATE ---
    const [searchField, setSearchField] = useState('vehicle_no');
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
            const res = await mastersAPI.transports.getAll();
            setTransports(res.data.data || []);
        } catch (err) { console.error("Master fetch error", err); }
    };

    const fetchRecords = async () => {
        setLoading(true);
        try {
            const res = await transactionsAPI.despatch.getAll();
            const data = Array.isArray(res.data) ? res.data : (res.data.data || []);
            setList(data);
        } catch (err) { console.error("Fetch error:", err); }
        finally { setLoading(false); }
    };

    // --- Dynamic Filtering Logic (Corrected Name) ---
    const filteredData = useMemo(() => {
        let result = Array.isArray(list) ? [...list] : [];
        if (searchValue.trim()) {
            result = result.filter(item => {
                let itemValue = "";
                if (searchField === 'transport_name') itemValue = item.Transport?.transport_name || "";
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

    // Reset pagination on filter change
    useEffect(() => {
        setCurrentPage(1);
    }, [searchValue, searchField, searchCondition]);

    // --- Action Handlers ---
    const handleAddNew = () => {
        const nextId = list.length > 0 ? Math.max(...list.map(o => o.id)) + 1 : 1;
        setFormData({ ...emptyState, load_no: `LD-${nextId}` });
        setIsModalOpen(true);
    };

    const handleRowClick = (item) => {
        if (isSelectionMode) {
            setSelectedIds(prev => prev.includes(item.id) ? prev.filter(i => i !== item.id) : [...prev, item.id]);
            return;
        }
        setFormData({
            ...item,
            transport_id: item.transport_id?.toString() || ''
        });
        setIsModalOpen(true);
    };

    const handleSave = async (e) => {
        if (e) e.preventDefault();
        if (!formData.vehicle_no) return alert("Vehicle Number is required");
        
        setSubmitLoading(true);
        const cleanedData = {
            ...formData,
            transport_id: formData.transport_id === '' ? null : parseInt(formData.transport_id),
            no_of_bags: parseFloat(formData.no_of_bags) || 0,
            freight: parseFloat(formData.freight) || 0
        };

        try {
            if (formData.id) await transactionsAPI.despatch.update(formData.id, cleanedData);
            else await transactionsAPI.despatch.create(cleanedData);
            setIsModalOpen(false);
            fetchRecords();
        } catch (err) { alert("Error saving despatch record"); }
        finally { setSubmitLoading(false); }
    };

    const handleBulkDelete = async () => {
        if (selectedIds.length === 0) return;
        if (window.confirm(`Delete ${selectedIds.length} logs permanently?`)) {
            setLoading(true);
            try {
                await Promise.all(selectedIds.map(id => transactionsAPI.despatch.delete(id)));
                setSelectedIds([]);
                setIsSelectionMode(false);
                fetchRecords();
            } catch (err) { alert("Delete failed"); }
            finally { setLoading(false); }
        }
    };

    const freightPerBag = useMemo(() => {
        const bags = parseFloat(formData.no_of_bags) || 0;
        const total = parseFloat(formData.freight) || 0;
        return bags > 0 ? (total / bags).toFixed(2) : '0.00';
    }, [formData.no_of_bags, formData.freight]);

    return (
        <div className="min-h-screen bg-slate-50 p-6 font-sans text-slate-900">
            
            {/* 1. TOP HEADER */}
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <Truck className="text-blue-600" /> Despatch Machine Master
                    </h1>
                    <p className="text-sm text-slate-500 tracking-tight">Fleet logistics, vehicle manifests, and freight ledger</p>
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
                            <Plus size={18} /> New Load
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
                            <option value="vehicle_no">Vehicle No</option>
                            <option value="load_no">Load No</option>
                            <option value="delivery_place">Destination</option>
                            <option value="transport_name">Transport Agency</option>
                        </select>
                    </div>
                    <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Condition</label>
                        <select value={searchCondition} onChange={(e) => setSearchCondition(e.target.value)} className="w-full border border-slate-200 p-2 rounded-lg text-sm outline-none focus:ring-1 focus:ring-blue-500">
                            <option value="Like">Like</option>
                            <option value="Equal">Equal</option>
                        </select>
                    </div>
                    <div className="md:col-span-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Value</label>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                            <input type="text" placeholder="Search loads..." value={searchValue} onChange={(e) => setSearchValue(e.target.value)} className="w-full border border-slate-200 pl-10 pr-4 py-2 rounded-lg text-sm outline-none focus:ring-1 focus:ring-blue-500 bg-white" />
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={() => setSearchValue('')} className="flex-1 border border-slate-200 py-2 rounded-lg text-sm font-bold hover:bg-slate-50 transition-colors">Clear All</button>
                        <div className="flex-1 bg-blue-50 text-blue-600 border border-blue-100 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2">
                            <Filter size={14}/> {filteredData.length} Matches
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
                                        <button onClick={() => setSelectedIds(selectedIds.length === currentItems.length ? [] : currentItems.map(i => i.id))}>
                                            {selectedIds.length === currentItems.length && currentItems.length > 0 ? <CheckSquare size={18} /> : <Square size={18} />}
                                        </button>
                                    </th>
                                )}
                                <th className="p-4 text-sm font-semibold uppercase tracking-wider">Load #</th>
                                <th className="p-4 text-sm font-semibold uppercase tracking-wider">Date</th>
                                <th className="p-4 text-sm font-semibold uppercase tracking-wider">Vehicle Details</th>
                                <th className="p-4 text-sm font-semibold uppercase tracking-wider">Destination</th>
                                <th className="p-4 text-sm font-semibold uppercase tracking-wider text-right">Freight (₹)</th>
                                {!isSelectionMode && <th className="p-4 w-10"></th>}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-mono">
                            {currentItems.length > 0 ? currentItems.map((item) => (
                                <tr key={item.id} onClick={() => handleRowClick(item)} className={`transition-colors cursor-pointer ${selectedIds.includes(item.id) ? 'bg-blue-50' : 'hover:bg-blue-50/50'}`}>
                                    {isSelectionMode && (
                                        <td className="p-4 text-center" onClick={(e) => {e.stopPropagation(); handleRowClick(item);}}>
                                            {selectedIds.includes(item.id) ? <CheckSquare size={18} className="text-blue-600 mx-auto"/> : <Square size={18} className="text-slate-200 mx-auto"/>}
                                        </td>
                                    )}
                                    <td className="p-4 text-sm font-bold text-blue-600">{item.load_no}</td>
                                    <td className="p-4 text-sm text-slate-500">{item.load_date}</td>
                                    <td className="p-4 font-sans">
                                        <p className="text-sm font-black text-slate-700 uppercase">{item.vehicle_no}</p>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase">{item.Transport?.transport_name || 'Direct Delivery'}</p>
                                    </td>
                                    <td className="p-4 text-sm text-slate-600 font-medium italic font-sans">
                                        <div className="flex items-center gap-1"><MapPin size={12} className="text-slate-400"/> {item.delivery_place}</div>
                                    </td>
                                    <td className="p-4 text-sm text-right font-black text-emerald-600">
                                        ₹{parseFloat(item.freight).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                    </td>
                                    {!isSelectionMode && (
                                        <td className="p-4 text-right">
                                            <Edit size={16} className="text-slate-300 group-hover:text-blue-600" />
                                        </td>
                                    )}
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan={7} className="p-20 text-center text-slate-400 font-bold uppercase tracking-widest opacity-20 text-xl italic">No History Found</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* 4. PAGINATION FOOTER */}
                <div className="p-4 bg-slate-50 border-t flex items-center justify-between">
                    <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider">
                        Manifest Count: {filteredData.length} records
                    </span>
                    <div className="flex gap-2">
                        <button disabled={currentPage === 1} onClick={() => setCurrentPage(prev => prev - 1)} className="p-2 border rounded bg-white hover:bg-blue-50 disabled:opacity-30 transition-all shadow-sm active:scale-95">
                            <ChevronLeft size={16}/>
                        </button>
                        <div className="px-3 flex items-center text-xs font-bold text-slate-600">Page {currentPage} of {totalPages}</div>
                        <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(prev => prev + 1)} className="p-2 border rounded bg-white disabled:opacity-30 hover:bg-blue-50 transition-all shadow-sm active:scale-95">
                            <ChevronRight size={16}/>
                        </button>
                    </div>
                </div>
            </div>

            {/* 5. ERP LOGISTICS MODAL */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in duration-200">
                        {/* Modal Header */}
                        <div className="bg-blue-600 p-4 flex justify-between items-center text-white">
                            <div className="flex items-center gap-4">
                                <div className="p-2 bg-white/20 rounded-lg"><Navigation size={20} /></div>
                                <div>
                                    <h2 className="font-bold uppercase tracking-tight text-lg">{formData.id ? 'Modify Manifest Record' : 'Create New Despatch Entry'}</h2>
                                    <p className="text-[10px] font-bold text-blue-100 uppercase tracking-widest">Load Ref: {formData.load_no}</p>
                                </div>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="hover:bg-blue-500 p-1 rounded-full transition-colors"><X size={24}/></button>
                        </div>

                        {/* Modal Body */}
                        <div className="flex-1 overflow-y-auto p-8 flex flex-col lg:flex-row gap-8">
                            
                            {/* LEFT COLUMN: Logistics Form */}
                            <div className="flex-1 space-y-8">
                                <div>
                                    <div className="flex items-center gap-2 mb-4 text-slate-400">
                                        <Truck size={14} />
                                        <span className="text-[10px] font-black uppercase tracking-[0.2em]">Vehicle & Logistics info</span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-6">
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Load Date</label>
                                            <input type="date" value={formData.load_date} onChange={e => setFormData({...formData, load_date: e.target.value})} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold focus:ring-1 focus:ring-blue-500 outline-none" />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Vehicle Number *</label>
                                            <input value={formData.vehicle_no} onChange={e => setFormData({...formData, vehicle_no: e.target.value.toUpperCase()})} placeholder="UP-14-AB-1234" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-black text-blue-600 uppercase focus:ring-1 focus:ring-blue-500 outline-none" />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Transport Agency</label>
                                            <select value={formData.transport_id} onChange={e => setFormData({...formData, transport_id: e.target.value})} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold focus:ring-1 focus:ring-blue-500 outline-none">
                                                <option value="">-- Direct Delivery --</option>
                                                {transports.map(t => <option key={t.id} value={t.id}>{t.transport_name}</option>)}
                                            </select>
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Unloading Hub / Place</label>
                                            <input value={formData.delivery_place} onChange={e => setFormData({...formData, delivery_place: e.target.value.toUpperCase()})} placeholder="CITY/LOCATION" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold focus:ring-1 focus:ring-blue-500 outline-none" />
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-blue-50/50 p-6 rounded-2xl border border-blue-100 grid grid-cols-2 gap-8">
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-2 text-[10px] font-black text-blue-900 uppercase tracking-widest"><Database size={14}/> Manifest (LR)</div>
                                        <input placeholder="LR NUMBER" value={formData.lr_no} onChange={e => setFormData({...formData, lr_no: e.target.value.toUpperCase()})} className="w-full p-3 bg-white border border-blue-200 rounded-xl text-sm font-bold outline-none" />
                                        <input type="date" value={formData.lr_date} onChange={e => setFormData({...formData, lr_date: e.target.value})} className="w-full p-3 bg-white border border-blue-200 rounded-xl text-sm font-bold outline-none" />
                                    </div>
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-2 text-[10px] font-black text-blue-900 uppercase tracking-widest"><Clock size={14}/> Gateway Timestamps</div>
                                        <div className="grid grid-cols-2 gap-2">
                                            <div className="space-y-1">
                                                <span className="text-[9px] font-bold text-slate-400 uppercase">In-Time</span>
                                                <input type="time" value={formData.in_time} onChange={e => setFormData({...formData, in_time: e.target.value})} className="w-full p-2 bg-white border border-blue-200 rounded-lg text-sm font-bold outline-none" />
                                            </div>
                                            <div className="space-y-1">
                                                <span className="text-[9px] font-bold text-slate-400 uppercase">Out-Time</span>
                                                <input type="time" value={formData.out_time} onChange={e => setFormData({...formData, out_time: e.target.value})} className="w-full p-2 bg-white border border-blue-200 rounded-lg text-sm font-bold outline-none" />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* RIGHT COLUMN: Freight Summary Sidebar */}
                            <div className="w-full lg:w-80 bg-slate-900 rounded-2xl p-6 text-white flex flex-col justify-between shadow-xl">
                                <div className="space-y-8">
                                    <div className="text-center">
                                        <DollarSign size={40} className="text-blue-400 mx-auto mb-2" />
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Freight Analysis</p>
                                    </div>

                                    <div className="space-y-6">
                                        <div className="space-y-1 border-b border-white/5 pb-4">
                                            <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Load Quantity</label>
                                            <div className="flex items-center gap-3">
                                                <Package size={20} className="text-blue-500" />
                                                <input type="number" value={formData.no_of_bags} onChange={e => setFormData({...formData, no_of_bags: e.target.value})} className="bg-transparent text-3xl font-black w-full outline-none font-mono" />
                                                <span className="text-xs font-bold text-slate-600 uppercase">Bags</span>
                                            </div>
                                        </div>

                                        <div className="space-y-1 border-b border-white/5 pb-4">
                                            <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Total Freight Amount</label>
                                            <div className="flex items-center gap-3">
                                                <span className="text-xl font-bold text-emerald-500">₹</span>
                                                <input type="number" value={formData.freight} onChange={e => setFormData({...formData, freight: e.target.value})} className="bg-transparent text-3xl font-black w-full outline-none text-emerald-400 font-mono" />
                                            </div>
                                        </div>

                                        <div className="bg-white/5 p-4 rounded-xl border border-white/10 flex gap-3">
                                            <Info size={16} className="text-blue-400 shrink-0" />
                                            <p className="text-[9px] leading-tight text-slate-400 italic">
                                                Freight per bag is automatically calculated for internal logistics auditing and cost assessment.
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-8 bg-blue-600/10 p-5 rounded-2xl border border-blue-500/20 text-center">
                                    <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">Calculated Rate / Bag</p>
                                    <h3 className="text-2xl font-black text-white font-mono">₹ {freightPerBag}</h3>
                                </div>
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="p-6 bg-slate-50 border-t flex justify-between items-center">
                            {formData.id && (
                                <button type="button" onClick={() => {if(window.confirm('Delete this manifest?')) transactionsAPI.despatch.delete(formData.id).then(fetchRecords); setIsModalOpen(false);}} className="flex items-center gap-2 text-red-500 font-bold hover:bg-red-50 px-4 py-2 rounded-xl transition-all uppercase text-xs tracking-widest">
                                    <Trash2 size={18}/> DELETE
                                </button>
                            )}
                            <div className="flex gap-4 ml-auto">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-2 font-bold text-slate-500 hover:text-slate-800 transition-colors uppercase text-xs tracking-widest">Cancel</button>
                                <button onClick={handleSave} disabled={submitLoading} className="bg-blue-600 hover:bg-blue-700 text-white px-10 py-3 rounded-xl font-black shadow-xl flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50 uppercase text-xs tracking-widest">
                                    <Save size={18}/> {submitLoading ? 'SAVING...' : 'FINALIZE ENTRY'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

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

export default DespatchEntry;