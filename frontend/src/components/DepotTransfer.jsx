import React, { useState, useEffect, useMemo } from 'react';
import { mastersAPI, transactionsAPI } from '../service/api';
import { 
    Truck, ArrowRightLeft, Warehouse, Send, AlertCircle, 
    Calendar, Plus, Trash2, X, Search, RefreshCw, 
    ChevronLeft, ChevronRight, Edit, Square, CheckSquare,
    Activity, ClipboardList
} from 'lucide-react';

export const DepotTransfer = () => {
    // --- Initial States ---
    const emptyState = {
        id: null,
        from_depot_id: '',
        to_depot_id: '',
        vehicle_no: '',
        remarks: '',
        transfer_date: new Date().toISOString().split('T')[0]
    };

    // --- Main States ---
    const [list, setList] = useState([]);
    const [depots, setDepots] = useState([]);
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
        fetchDepots();
        fetchRecords();
    }, []);

    const fetchDepots = async () => {
        try {
            const res = await mastersAPI.accounts.getAll();
            const allAccounts = res.data.data || [];
            const depotList = allAccounts.filter(acc => acc.account_group === 'Depot');
            setDepots(depotList);
        } catch (err) { console.error("Error fetching depots:", err); }
    };

    const fetchRecords = async () => {
        setLoading(true);
        try {
            const res = await transactionsAPI.invoices.getAll();
            const data = Array.isArray(res.data) ? res.data : (res.data.data || []);
            // Filter only Depot Transfer type invoices
            setList(data.filter(inv => inv.invoice_type === 'Depot Transfer'));
        } catch (err) { console.error("Fetch records error:", err); }
        finally { setLoading(false); }
    };

    // --- Logic: Search & Pagination ---
    const processedData = useMemo(() => {
        let result = [...list];
        if (searchValue) {
            result = result.filter(item => {
                const searchStr = searchValue.toLowerCase();
                if (searchField === 'source') return String(item.FromDepot?.account_name || '').toLowerCase().includes(searchStr);
                if (searchField === 'destination') return String(item.Party?.account_name || '').toLowerCase().includes(searchStr);
                return String(item[searchField] || '').toLowerCase().includes(searchStr);
            });
        }
        return result.sort((a, b) => b.id - a.id);
    }, [list, searchValue, searchField]);

    const currentItems = processedData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
    const totalPages = Math.ceil(processedData.length / itemsPerPage) || 1;

    // --- Action Handlers ---
    const handleAddNew = () => {
        setFormData(emptyState);
        setIsModalOpen(true);
    };

    const handleRowClick = (item) => {
        if (isSelectionMode) {
            setSelectedIds(prev => prev.includes(item.id) ? prev.filter(i => i !== item.id) : [...prev, item.id]);
            return;
        }
        setFormData({
            ...item,
            from_depot_id: item.from_depot_id?.toString(),
            to_depot_id: item.party_id?.toString(), // party_id stores destination in this schema
            transfer_date: item.date // mapping date to transfer_date
        });
        setIsModalOpen(true);
    };

    const handleExecuteTransfer = async (e) => {
        if (e) e.preventDefault();
        const { from_depot_id, to_depot_id, vehicle_no } = formData;

        if (!from_depot_id || !to_depot_id) return alert("Select both Source and Destination.");
        if (!vehicle_no) return alert("Vehicle Number is required.");

        setLoading(true);
        try {
            const payload = {
                ...formData,
                invoice_type: 'Depot Transfer',
                party_id: to_depot_id,
                date: formData.transfer_date
            };

            if (formData.id) await transactionsAPI.invoices.update(formData.id, payload);
            else await transactionsAPI.invoices.create(payload);

            setIsModalOpen(false);
            fetchRecords();
        } catch (err) { alert("Execution Error: " + err.message); }
        finally { setLoading(false); }
    };

    const handleBulkDelete = async () => {
        if (selectedIds.length === 0) return;
        if (window.confirm(`Cancel ${selectedIds.length} transfers permanently?`)) {
            setLoading(true);
            try {
                await Promise.all(selectedIds.map(id => transactionsAPI.invoices.delete(id)));
                setSelectedIds([]);
                setIsSelectionMode(false);
                fetchRecords();
            } catch (err) { alert("Delete failed"); }
            finally { setLoading(false); }
        }
    };

    return (
        <div className="min-h-screen bg-[#f8fafc] p-6 font-sans">
            
            {/* 1. TOP HEADER */}
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
                        <ArrowRightLeft className="text-amber-500" size={32} /> Stock Transfer Registry
                    </h1>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Inter-Depot Logistics Management System</p>
                </div>
                
                <div className="flex gap-2">
                    <button onClick={handleAddNew} className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white px-6 py-2 rounded-lg font-bold shadow-md transition-all active:scale-95">
                        <Plus size={18} /> New Transfer
                    </button>
                    
                    <button 
                        onClick={() => { setIsSelectionMode(!isSelectionMode); setSelectedIds([]); }}
                        className={`px-6 py-2 border rounded-lg font-bold transition-all ${isSelectionMode ? 'bg-amber-100 border-amber-300 text-amber-700' : 'bg-white border-slate-200 text-amber-600 hover:bg-slate-50'}`}
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
                    <button onClick={fetchRecords} className="p-2 border rounded-lg bg-white text-slate-400 hover:text-amber-600 transition-colors">
                        <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                    </button>
                </div>
            </div>

            {/* 2. SEARCH BAR */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm mb-6 flex flex-wrap gap-4 items-end">
                <div className="flex-1 min-w-[200px]">
                    <label className="text-[10px] font-black text-slate-400 uppercase mb-1 block ml-1">Search Property</label>
                    <div className="flex gap-2">
                        <select value={searchField} onChange={(e) => setSearchField(e.target.value)} className="border border-slate-200 p-2.5 rounded-lg text-sm outline-none focus:ring-2 focus:ring-amber-500">
                            <option value="vehicle_no">Vehicle / LR No</option>
                            <option value="source">Source Depot</option>
                            <option value="destination">Destination Depot</option>
                        </select>
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-3 text-slate-400" size={16}/>
                            <input type="text" placeholder="Filter transfers..." value={searchValue} onChange={(e) => setSearchValue(e.target.value)} className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-amber-500" />
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
                                <th className="p-4 text-[10px] font-black uppercase tracking-[0.2em]">Ref ID</th>
                                <th className="p-4 text-[10px] font-black uppercase tracking-[0.2em]">Date</th>
                                <th className="p-4 text-[10px] font-black uppercase tracking-[0.2em]">From (Source)</th>
                                <th className="p-4 text-[10px] font-black uppercase tracking-[0.2em]">To (Destination)</th>
                                <th className="p-4 text-[10px] font-black uppercase tracking-[0.2em]">Vehicle / LR</th>
                                <th className="p-4 text-[10px] font-black uppercase tracking-[0.2em] text-center w-20">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {currentItems.length > 0 ? currentItems.map((item) => (
                                <tr key={item.id} onClick={() => handleRowClick(item)} className={`transition-colors cursor-pointer ${selectedIds.includes(item.id) ? 'bg-amber-50' : 'hover:bg-slate-50'}`}>
                                    {isSelectionMode && (
                                        <td className="p-4 text-center">
                                            {selectedIds.includes(item.id) ? <CheckSquare size={20} className="text-amber-600 mx-auto"/> : <Square size={20} className="text-slate-200 mx-auto"/>}
                                        </td>
                                    )}
                                    <td className="p-4 text-sm font-bold text-amber-600 font-mono">#TR-{item.id}</td>
                                    <td className="p-4 text-sm text-slate-500">{item.date}</td>
                                    <td className="p-4 text-sm font-black text-slate-700 uppercase">{item.FromDepot?.account_name}</td>
                                    <td className="p-4 text-sm font-black text-slate-700 uppercase">{item.Party?.account_name}</td>
                                    <td className="p-4 text-sm font-bold text-slate-500 italic"><Truck size={12} className="inline mr-1"/>{item.vehicle_no}</td>
                                    <td className="p-4 text-center">
                                        <button className="p-2 text-slate-300 hover:text-amber-600 transition-colors"><Edit size={16}/></button>
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan={7} className="p-20 text-center opacity-20">
                                        <ArrowRightLeft size={48} className="mx-auto mb-2"/>
                                        <p className="font-black uppercase tracking-widest">No Transfers Found</p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* 4. PAGINATION FOOTER */}
                <div className="p-4 bg-slate-50 border-t flex items-center justify-between">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        Showing {currentItems.length} of {processedData.length} Records
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

            {/* 5. ENGINE MODAL POPUP */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-5xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in duration-200">
                        {/* Modal Header */}
                        <div className="bg-amber-500 p-6 flex justify-between items-center text-white">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-white/20 rounded-xl"><Activity /></div>
                                <div>
                                    <h2 className="font-black uppercase tracking-widest text-xl">{formData.id ? 'Modify Stock Movement' : 'Stock Transfer Engine'}</h2>
                                    <p className="text-[10px] font-bold text-amber-200 uppercase tracking-widest">Logistics Control Panel</p>
                                </div>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="hover:bg-amber-400 p-2 rounded-full transition-colors"><X size={24}/></button>
                        </div>

                        {/* Modal Body */}
                        <div className="flex-1 overflow-y-auto p-8 grid grid-cols-1 lg:grid-cols-2 gap-10">
                            
                            {/* LEFT COLUMN: MOVEMENT DETAILS */}
                            <div className="space-y-8">
                                <div className="flex items-center gap-2 text-indigo-500 font-black text-[10px] uppercase tracking-[0.2em]">
                                    <Warehouse size={16} /> Location Mapping
                                </div>

                                {/* SOURCE SELECT */}
                                <div className="p-6 bg-red-50 rounded-[2rem] border border-red-100 space-y-3">
                                    <label className="text-[10px] font-black text-red-400 block uppercase tracking-widest ml-1">From (Source Depot)</label>
                                    <select 
                                        className="w-full bg-transparent font-bold text-slate-800 outline-none cursor-pointer"
                                        value={formData.from_depot_id}
                                        onChange={(e) => setFormData({...formData, from_depot_id: e.target.value})}
                                    >
                                        <option value="">Select Source...</option>
                                        {depots.filter(d => d.id.toString() !== formData.to_depot_id).map(d => (
                                            <option key={d.id} value={d.id}>{d.account_name}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* DESTINATION SELECT */}
                                <div className="p-6 bg-emerald-50 rounded-[2rem] border border-emerald-100 space-y-3">
                                    <label className="text-[10px] font-black text-emerald-400 block uppercase tracking-widest ml-1">To (Destination Depot)</label>
                                    <select 
                                        className="w-full bg-transparent font-bold text-slate-800 outline-none cursor-pointer"
                                        value={formData.to_depot_id}
                                        onChange={(e) => setFormData({...formData, to_depot_id: e.target.value})}
                                    >
                                        <option value="">Select Destination...</option>
                                        {depots.filter(d => d.id.toString() !== formData.from_depot_id).map(d => (
                                            <option key={d.id} value={d.id}>{d.account_name}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="p-4 bg-blue-50 border border-blue-100 rounded-2xl flex items-start gap-3">
                                    <AlertCircle size={18} className="text-blue-500 shrink-0 mt-0.5" />
                                    <p className="text-[10px] font-medium text-blue-700 leading-relaxed uppercase">
                                        Note: System automatically prevents identical source and destination selection to maintain audit integrity.
                                    </p>
                                </div>
                            </div>

                            {/* RIGHT COLUMN: LOGISTICS CARD */}
                            <div className="bg-slate-900 rounded-[3rem] p-10 text-white flex flex-col justify-between shadow-2xl relative border border-slate-800">
                                <Truck className="absolute top-6 right-6 text-amber-500/20" size={100} />
                                
                                <div className="space-y-10 relative">
                                    <div className="flex items-center gap-2 text-amber-500 font-black text-[10px] uppercase tracking-[0.2em]">
                                        <ClipboardList size={16} /> Logistics manifest
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-[10px] text-slate-400 font-black uppercase tracking-widest ml-1">Vehicle / LR Number</label>
                                        <input 
                                            className="w-full bg-white/5 border-b-2 border-slate-700 p-3 outline-none font-bold text-2xl focus:border-amber-500 transition-colors uppercase" 
                                            placeholder="TN 01 AB 1234"
                                            value={formData.vehicle_no}
                                            onChange={(e) => setFormData({...formData, vehicle_no: e.target.value})}
                                        />
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-[10px] text-slate-400 font-black uppercase tracking-widest ml-1">Transfer Date</label>
                                        <div className="flex items-center gap-3 bg-white/5 border-b-2 border-slate-700 p-3">
                                            <Calendar size={18} className="text-slate-500" />
                                            <input 
                                                type="date"
                                                className="w-full bg-transparent outline-none font-bold text-xl focus:text-white" 
                                                value={formData.transfer_date}
                                                onChange={(e) => setFormData({...formData, transfer_date: e.target.value})}
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-12 flex gap-4">
                                    <button onClick={() => setIsModalOpen(false)} className="flex-1 py-4 font-black uppercase text-xs text-slate-400 hover:text-white transition-colors">Discard</button>
                                    <button 
                                        onClick={handleExecuteTransfer}
                                        disabled={loading}
                                        className="flex-[2] bg-amber-500 text-slate-900 py-4 rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-amber-500/20 active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                                    >
                                        <Send size={18} /> {loading ? "Executing..." : "Execute Movement"}
                                    </button>
                                </div>
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

export default DepotTransfer;