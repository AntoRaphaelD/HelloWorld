import React, { useState, useEffect, useMemo } from 'react';
import { mastersAPI, transactionsAPI } from '../service/api';
import { 
    Truck, Save, Clock, MapPin, Plus, Trash2, X, Search, 
    RefreshCw, ChevronLeft, ChevronRight, Edit, Square, 
    CheckSquare, Calendar, Navigation, DollarSign, Package,
    Info, Activity
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
    const [isModalOpen, setIsModalOpen] = useState(false);

    // --- Search, Sort & Selection States ---
    const [isSelectionMode, setIsSelectionMode] = useState(false);
    const [selectedIds, setSelectedIds] = useState([]);
    const [searchField, setSearchField] = useState('vehicle_no');
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

    // --- Logic: Search & Pagination ---
    const processedData = useMemo(() => {
        let result = [...list];
        if (searchValue) {
            result = result.filter(item => {
                const val = searchField === 'transport_name' 
                    ? String(item.Transport?.transport_name || '').toLowerCase()
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
            transport_id: item.transport_id?.toString()
        });
        setIsModalOpen(true);
    };

    const handleSave = async (e) => {
        if (e) e.preventDefault();
        if (!formData.vehicle_no) return alert("Vehicle Number is required");
        
        setLoading(true);
        try {
            if (formData.id) await transactionsAPI.despatch.update(formData.id, formData);
            else await transactionsAPI.despatch.create(formData);
            
            setIsModalOpen(false);
            fetchRecords();
        } catch (err) { alert("Error saving despatch entry"); }
        finally { setLoading(false); }
    };

    const handleBulkDelete = async () => {
        if (selectedIds.length === 0) return;
        if (window.confirm(`Delete ${selectedIds.length} despatch logs permanently?`)) {
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
        <div className="min-h-screen bg-[#f8fafc] p-6 font-sans">
            
            {/* 1. TOP HEADER & PRIMARY ACTIONS */}
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
                        <Truck className="text-blue-600" size={32} /> Despatch Registry
                    </h1>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Fleet Logistics and Freight Management</p>
                </div>
                
                <div className="flex gap-2">
                    <button onClick={handleAddNew} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-bold shadow-md transition-all active:scale-95">
                        <Plus size={18} /> New Load
                    </button>
                    
                    <button 
                        onClick={() => { setIsSelectionMode(!isSelectionMode); setSelectedIds([]); }}
                        className={`px-6 py-2 border rounded-lg font-bold transition-all ${isSelectionMode ? 'bg-amber-100 border-amber-300 text-amber-700' : 'bg-white border-slate-200 text-blue-600 hover:bg-slate-50'}`}
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
                    <button onClick={fetchRecords} className="p-2 border rounded-lg bg-white text-slate-400 hover:text-blue-600 transition-colors">
                        <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                    </button>
                </div>
            </div>

            {/* 2. SEARCH BAR */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm mb-6 flex flex-wrap gap-4 items-end">
                <div className="flex-1 min-w-[200px]">
                    <label className="text-[10px] font-black text-slate-400 uppercase mb-1 block ml-1">Filter Logistics</label>
                    <div className="flex gap-2">
                        <select value={searchField} onChange={(e) => setSearchField(e.target.value)} className="border border-slate-200 p-2.5 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500">
                            <option value="vehicle_no">Vehicle No</option>
                            <option value="load_no">Load No</option>
                            <option value="delivery_place">Destination</option>
                            <option value="transport_name">Transport</option>
                        </select>
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-3 text-slate-400" size={16}/>
                            <input type="text" placeholder="Start typing to search loads..." value={searchValue} onChange={(e) => setSearchValue(e.target.value)} className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500" />
                        </div>
                    </div>
                </div>
                <button onClick={() => setSearchValue('')} className="px-6 py-2.5 text-sm font-bold text-slate-500 hover:bg-slate-100 rounded-lg transition-all">Clear Filters</button>
            </div>

            {/* 3. BLUE HEADER DATA TABLE */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-md overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-blue-600 text-white">
                            <tr>
                                {isSelectionMode && <th className="p-4 w-12 text-center"><Square size={20} className="mx-auto" /></th>}
                                <th className="p-4 text-[10px] font-black uppercase tracking-widest">Load #</th>
                                <th className="p-4 text-[10px] font-black uppercase tracking-widest">Date</th>
                                <th className="p-4 text-[10px] font-black uppercase tracking-widest">Vehicle Details</th>
                                <th className="p-4 text-[10px] font-black uppercase tracking-widest">Destination</th>
                                <th className="p-4 text-[10px] font-black uppercase tracking-widest text-center">Bags</th>
                                <th className="p-4 text-[10px] font-black uppercase tracking-widest text-right">Freight (₹)</th>
                                <th className="p-4 text-[10px] font-black uppercase tracking-widest text-center w-20">Action</th>
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
                                    <td className="p-4 text-sm font-bold text-blue-600">{item.load_no}</td>
                                    <td className="p-4 text-sm text-slate-500">{item.load_date}</td>
                                    <td className="p-4">
                                        <p className="text-sm font-black text-slate-700 uppercase">{item.vehicle_no}</p>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase">{item.Transport?.transport_name || 'Direct'}</p>
                                    </td>
                                    <td className="p-4 text-sm text-slate-500 font-medium italic">
                                        <MapPin size={12} className="inline mr-1 text-slate-300"/>{item.delivery_place}
                                    </td>
                                    <td className="p-4 text-sm text-center font-bold text-slate-700">{item.no_of_bags}</td>
                                    <td className="p-4 text-sm text-right font-black text-emerald-600">₹{item.freight.toLocaleString()}</td>
                                    <td className="p-4 text-center">
                                        <button className="p-2 text-slate-300 hover:text-blue-600 transition-colors"><Edit size={16}/></button>
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan={isSelectionMode ? 8 : 7} className="p-20 text-center opacity-20">
                                        <Truck size={48} className="mx-auto mb-2"/>
                                        <p className="font-black uppercase tracking-widest">No Despatch History</p>
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
                        <button disabled={currentPage === 1} onClick={() => setCurrentPage(prev => prev - 1)} className="p-2 border rounded-lg bg-white disabled:opacity-30 hover:bg-slate-100 transition-all shadow-sm active:scale-95">
                            <ChevronLeft size={18}/>
                        </button>
                        <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(prev => prev + 1)} className="p-2 border rounded-lg bg-white disabled:opacity-30 hover:bg-slate-100 transition-all shadow-sm active:scale-95">
                            <ChevronRight size={18}/>
                        </button>
                    </div>
                </div>
            </div>

            {/* 5. MODAL FORM POPUP (Add/Edit) */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-5xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in duration-200">
                        {/* Modal Header */}
                        <div className="bg-blue-600 p-6 flex justify-between items-center text-white">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-white/20 rounded-xl"><Navigation /></div>
                                <div>
                                    <h2 className="font-black uppercase tracking-widest text-xl">{formData.id ? 'Modify Despatch Entry' : 'New Despatch Logging'}</h2>
                                    <p className="text-[10px] font-bold text-blue-200 uppercase tracking-widest">Manifest Reference: {formData.load_no}</p>
                                </div>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="hover:bg-blue-500 p-2 rounded-full transition-colors"><X size={24}/></button>
                        </div>

                        {/* Modal Body */}
                        <div className="flex-1 overflow-y-auto p-8 grid grid-cols-1 md:grid-cols-3 gap-8">
                            
                            {/* LEFT & CENTER: LOGISTICS INFO */}
                            <div className="md:col-span-2 space-y-6">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Load Date</label>
                                        <div className="relative">
                                            <Calendar className="absolute left-3 top-3.5 text-slate-300" size={18} />
                                            <input type="date" value={formData.load_date} onChange={e => setFormData({...formData, load_date: e.target.value})} className="w-full pl-10 p-3 bg-slate-50 border border-slate-100 rounded-xl font-bold outline-none focus:ring-2 focus:ring-blue-500" />
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Vehicle Number</label>
                                        <input value={formData.vehicle_no} onChange={e => setFormData({...formData, vehicle_no: e.target.value})} placeholder="KA-01-AB-1234" className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl font-black text-blue-600 uppercase outline-none focus:ring-2 focus:ring-blue-500" />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Transport Agency</label>
                                        <select value={formData.transport_id} onChange={e => setFormData({...formData, transport_id: e.target.value})} className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl font-bold outline-none appearance-none">
                                            <option value="">-- Choose Transport --</option>
                                            {transports.map(t => <option key={t.id} value={t.id}>{t.transport_name}</option>)}
                                        </select>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Delivery Destination</label>
                                        <div className="relative">
                                            <MapPin className="absolute left-3 top-3.5 text-slate-300" size={18} />
                                            <input value={formData.delivery_place} onChange={e => setFormData({...formData, delivery_place: e.target.value})} placeholder="City/Unloading Point" className="w-full pl-10 p-3 bg-slate-50 border border-slate-100 rounded-xl font-bold outline-none" />
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-blue-50/50 p-6 rounded-2xl border border-blue-100 grid grid-cols-2 gap-6">
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-2 text-[10px] font-black text-blue-900 uppercase tracking-tighter mb-2"><Activity size={14}/> Lorry Receipt Details</div>
                                        <input placeholder="LR Number" value={formData.lr_no} onChange={e => setFormData({...formData, lr_no: e.target.value})} className="w-full p-2.5 bg-white border border-blue-200 rounded-lg text-sm font-bold outline-none" />
                                        <input type="date" value={formData.lr_date} onChange={e => setFormData({...formData, lr_date: e.target.value})} className="w-full p-2.5 bg-white border border-blue-200 rounded-lg text-sm font-bold outline-none" />
                                    </div>
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-2 text-[10px] font-black text-blue-900 uppercase tracking-tighter mb-2"><Clock size={14}/> Time Stamp Log</div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-[9px] font-bold text-blue-400 w-12">IN:</span>
                                            <input type="time" value={formData.in_time} onChange={e => setFormData({...formData, in_time: e.target.value})} className="flex-1 p-2 bg-white border border-blue-200 rounded-lg text-sm font-bold outline-none" />
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-[9px] font-bold text-blue-400 w-12">OUT:</span>
                                            <input type="time" value={formData.out_time} onChange={e => setFormData({...formData, out_time: e.target.value})} className="flex-1 p-2 bg-white border border-blue-200 rounded-lg text-sm font-bold outline-none" />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* RIGHT: FREIGHT CALCULATION CARD */}
                            <div className="bg-slate-900 rounded-3xl p-8 text-white flex flex-col shadow-xl border border-slate-800">
                                <div className="flex items-center gap-2 text-blue-400 text-[10px] font-black uppercase tracking-widest mb-8">
                                    <DollarSign size={16}/> Revenue & Logistics Math
                                </div>
                                
                                <div className="space-y-8 flex-1">
                                    <div>
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">Number of Bags</label>
                                        <div className="flex items-center gap-3">
                                            <Package size={24} className="text-slate-700"/>
                                            <input type="number" value={formData.no_of_bags} onChange={e => setFormData({...formData, no_of_bags: e.target.value})} className="bg-transparent text-4xl font-black w-full border-b border-slate-800 outline-none focus:border-blue-500 transition-colors" />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">Total Freight Amount</label>
                                        <div className="flex items-center gap-3">
                                            <span className="text-2xl font-black text-slate-700">₹</span>
                                            <input type="number" value={formData.freight} onChange={e => setFormData({...formData, freight: e.target.value})} className="bg-transparent text-4xl font-black text-emerald-500 w-full border-b border-slate-800 outline-none focus:border-emerald-500 transition-colors" />
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-12 bg-white/5 p-6 rounded-2xl border border-white/10 relative overflow-hidden">
                                    <div className="absolute top-0 right-0 p-2 opacity-10"><Info size={40}/></div>
                                    <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">Calculated Load Rate</p>
                                    <p className="text-3xl font-black text-white">₹ {freightPerBag} <span className="text-[10px] text-slate-500">/BAG</span></p>
                                </div>
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="p-6 bg-slate-50 border-t flex justify-end items-center gap-4">
                            <button type="button" onClick={() => setIsModalOpen(false)} className="px-8 py-3 font-bold text-slate-400 hover:text-slate-600 text-xs tracking-widest uppercase">Discard</button>
                            <button onClick={handleSave} disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white px-12 py-4 rounded-xl font-black shadow-lg shadow-blue-100 flex items-center gap-2 active:scale-95 transition-all text-xs tracking-widest uppercase">
                                <Save size={18}/> {loading ? 'SAVING...' : 'FINALIZE ENTRY'}
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

export default DespatchEntry;