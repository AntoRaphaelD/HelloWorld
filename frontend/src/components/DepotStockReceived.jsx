import React, { useState, useEffect, useMemo } from 'react';
import { mastersAPI, transactionsAPI } from '../service/api';
import { 
    Download, Save, Search, Hash, 
    Calendar, Warehouse, FileText, 
    Plus, X, RefreshCw, Edit,
    PackageCheck, ArrowRightCircle, Box, Activity, Check, 
    AlertCircle, Filter, Database, ChevronLeft, ChevronRight,
    Square, CheckSquare, Clock
} from 'lucide-react';

const DepotStockReceived = () => {
    const emptyState = { 
        id: null,
        date: new Date().toISOString().split('T')[0], 
        depot_id: '', 
        invoice_no: '', 
    };

    const [list, setList] = useState([]);
    const [depots, setDepots] = useState([]);
    const [formData, setFormData] = useState(emptyState);
    const [previewItems, setPreviewItems] = useState([]); 
    const [loading, setLoading] = useState(false);
    const [submitLoading, setSubmitLoading] = useState(false);
    const [isFetchingInvoice, setIsFetchingInvoice] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const [searchField, setSearchField] = useState('invoice_no');
    const [searchCondition, setSearchCondition] = useState('Like');
    const [searchValue, setSearchValue] = useState('');
    const [isSelectionMode, setIsSelectionMode] = useState(false);
    const [selectedIds, setSelectedIds] = useState([]);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    useEffect(() => {
        fetchMasters();
        fetchRecords();
    }, []);

const fetchMasters = async () => {
    try {
        const data = await mastersAPI.accounts.getAll();
        const all = data.data.data || [];
        // Filter specifically for Depot accounts
        setDepots(all.filter(a => a.account_group?.includes('DEPOT')));
    } catch (err) { console.error("Master fetch error", err); }
};

const fetchRecords = async () => {
    setLoading(true);
    try {
        const data = await transactionsAPI.depotReceived.getAll();
        setList(data.data.data || []);
    } catch (err) { console.error("Records fetch error", err); }
    finally { setLoading(false); }
};



    const handleLookupInvoice = async () => {
    if (!formData.invoice_no) 
        return alert("Please enter an Invoice Number");

    setIsFetchingInvoice(true);

    try {
        const data = await transactionsAPI.invoices.getAll();
        const invoices = data.data.data || [];
        const target = invoices.find(
            (invoice) => String(invoice.invoice_no).trim() === String(formData.invoice_no).trim()
        );

        if (!target) {
            alert(`Invoice "${formData.invoice_no}" not found.`);
            setPreviewItems([]);
            return;
        }

        if (target.is_depot_inwarded) {
            alert("❌ This invoice is already inwarded to a depot.");
            return;
        }

        setPreviewItems(target.InvoiceDetails || []);

    } catch (err) {
        console.error(err);
        alert("Error fetching invoice details");
    } finally {
        setIsFetchingInvoice(false);
    }
};

    const handleSave = async () => {
    if (!formData.depot_id || !previewItems.length) return alert("Select Depot and Fetch a valid Invoice");
    setSubmitLoading(true);
    try {
        const payload = { 
            invoice_no: formData.invoice_no,
            depot_id: formData.depot_id,
            date: formData.date 
        };
        await transactionsAPI.depotInward.create(payload);
        
        setIsModalOpen(false);
        fetchRecords();
        alert("Stock Inwarded Successfully!");
    } catch (err) { 
        alert("Error: " + (err.response?.data?.error || "Sync failed")); 
    } finally { 
        setSubmitLoading(false); 
    }
};

    const handleRowClick = (item) => {
        if (isSelectionMode) {
            setSelectedIds(prev =>
                prev.includes(item.id) ? prev.filter(id => id !== item.id) : [...prev, item.id]
            );
            return;
        }
    };

    const filteredData = useMemo(() => {
        let result = Array.isArray(list) ? [...list] : [];
        if (searchValue.trim()) {
            result = result.filter(item => {
                let itemValue = "";
                if (searchField === 'depot_name') itemValue = item.Depot?.account_name || "";
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
                    <h1 className="text-3xl font-black text-slate-800 flex items-center gap-3">
                        <Download className="text-blue-600" size={32} /> Depot Inward Sync
                    </h1>
                    <p className="text-base text-slate-600 mt-1">Mill-to-depot stock reconciliation and sales registry sync</p>
                </div>
                <div className="flex gap-3">
                    <button 
                        onClick={() => { setIsSelectionMode(!isSelectionMode); setSelectedIds([]); }}
                        className={`px-6 py-3 border-2 rounded-xl font-bold text-lg transition-all ${
                            isSelectionMode 
                                ? 'bg-amber-100 border-amber-400 text-amber-800 shadow-md' 
                                : 'bg-white border-slate-300 text-blue-700 hover:bg-slate-50'
                        }`}
                    >
                        {isSelectionMode ? 'Cancel Select' : 'Select Mode'}
                    </button>
                    <button 
                        onClick={() => { setFormData(emptyState); setPreviewItems([]); setIsModalOpen(true); }} 
                        className="flex items-center gap-3 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold text-lg shadow-lg transition-all active:scale-95"
                    >
                        <Plus size={24} /> New Inward Entry
                    </button>
                    <button 
                        onClick={fetchRecords} 
                        className="p-3 border-2 border-slate-300 rounded-xl bg-white hover:bg-slate-50 transition-all"
                    >
                        <RefreshCw size={24} className={loading ? 'animate-spin' : ''} />
                    </button>
                </div>
            </div>

            {/* 2. FILTER BAR */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-md mb-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-5 items-end">
                    <div>
                        <label className="text-[11px] font-bold text-slate-500 uppercase mb-2 block ml-1">Search Field</label>
                        <select 
                            value={searchField} 
                            onChange={(e) => setSearchField(e.target.value)} 
                            className="w-full border border-slate-300 p-3 rounded-xl text-base font-semibold outline-none focus:ring-2 focus:ring-blue-400"
                        >
                            <option value="invoice_no">Invoice No</option>
                            <option value="depot_name">Depot Name</option>
                        </select>
                    </div>
                    <div>
                        <label className="text-[11px] font-bold text-slate-500 uppercase mb-2 block ml-1">Condition</label>
                        <select 
                            value={searchCondition} 
                            onChange={(e) => setSearchCondition(e.target.value)} 
                            className="w-full border border-slate-300 p-3 rounded-xl text-base font-semibold outline-none focus:ring-2 focus:ring-blue-400"
                        >
                            <option value="Like">Like</option>
                            <option value="Equal">Equal</option>
                        </select>
                    </div>
                    <div className="md:col-span-1">
                        <label className="text-[11px] font-bold text-slate-500 uppercase mb-2 block ml-1">Value</label>
                        <div className="relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                            <input 
                                type="text" 
                                placeholder="Search entries..." 
                                value={searchValue} 
                                onChange={(e) => setSearchValue(e.target.value)} 
                                className="w-full border border-slate-300 pl-12 pr-5 py-3 rounded-xl text-base font-semibold outline-none focus:ring-2 focus:ring-blue-400 bg-white" 
                            />
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <button 
                            onClick={() => setSearchValue('')} 
                            className="flex-1 border border-slate-300 py-3 rounded-xl text-base font-semibold hover:bg-slate-50 transition-all"
                        >
                            Clear
                        </button>
                        <div className="flex-1 bg-blue-50 text-blue-700 border border-blue-200 py-3 rounded-xl text-base font-bold flex items-center justify-center gap-2">
                            <Filter size={18}/> {filteredData.length} Matches
                        </div>
                    </div>
                </div>
            </div>

            {/* 3. DATA TABLE */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-md overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-blue-600 text-white">
                                {isSelectionMode && <th className="p-5 w-14 text-center text-[13px] font-bold uppercase tracking-wider"><Square size={20} className="mx-auto" /></th>}
                                <th className="p-5 text-[13px] font-bold uppercase tracking-wider">Date</th>
                                <th className="p-5 text-[13px] font-bold uppercase tracking-wider">Receiving Depot</th>
                                <th className="p-5 text-[13px] font-bold uppercase tracking-wider">Mill Invoice Ref</th>
                                <th className="p-5 text-[13px] font-bold uppercase tracking-wider text-center">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-mono">
                            {loading ? (
                                <tr>
                                    <td colSpan={5} className="py-28 text-center">
                                        <RefreshCw size={56} className="animate-spin text-blue-500 mx-auto mb-6" />
                                        <p className="text-lg font-medium text-slate-600">Loading sync history...</p>
                                    </td>
                                </tr>
                            ) : currentItems.length > 0 ? (
                                currentItems.map((item) => (
                                    <tr 
                                        key={item.id} 
                                        onClick={() => handleRowClick(item)} 
                                        className={`transition-all cursor-pointer hover:bg-blue-50/50 text-base ${selectedIds.includes(item.id) ? 'bg-blue-50' : ''}`}
                                    >
                                        {isSelectionMode && (
                                            <td className="p-5 text-center" onClick={(e) => {e.stopPropagation(); handleRowClick(item);}}>
                                                {selectedIds.includes(item.id) ? <CheckSquare size={22} className="text-blue-600 mx-auto"/> : <Square size={22} className="text-slate-300 mx-auto"/>}
                                            </td>
                                        )}
                                        <td className="p-5 text-base text-slate-700 font-sans">{item.date}</td>
                                        <td className="p-5 text-base font-bold text-slate-800 uppercase font-sans">{item.Depot?.account_name}</td>
                                        <td className="p-5 text-base font-black text-blue-700">#{item.invoice_no}</td>
                                        <td className="p-5 text-center">
                                            <span className="text-xs bg-emerald-100 text-emerald-800 px-4 py-1.5 rounded-full font-bold uppercase border border-emerald-200 flex items-center justify-center gap-2 w-fit mx-auto">
                                                <Check size={14}/> Synced
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={5} className="py-32 text-center">
                                        <div className="flex flex-col items-center justify-center">
                                            <div className="w-28 h-28 bg-slate-100 rounded-3xl flex items-center justify-center mb-10 shadow-inner">
                                                {searchValue.trim() ? <Search size={64} className="text-amber-500" /> : <Warehouse size={64} className="text-slate-400" />}
                                            </div>
                                            <h3 className="text-3xl font-bold text-slate-800 mb-4 tracking-tight">
                                                {searchValue.trim() ? "No matching sync records" : "Depot inward empty"}
                                            </h3>
                                            <p className="text-lg text-slate-600 max-w-lg">Received stock dispatches from the mill will appear in this registry.</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                <div className="p-5 bg-slate-50 border-t flex items-center justify-between text-base">
                    <span className="text-slate-600 font-medium">Page {currentPage} of {totalPages}</span>
                    <div className="flex gap-2">
                        <button disabled={currentPage === 1} onClick={() => setCurrentPage(prev => prev - 1)} className="p-3 border rounded-lg bg-white disabled:opacity-40 hover:bg-slate-50 transition-all">
                            <ChevronLeft size={20}/>
                        </button>
                        <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(prev => prev + 1)} className="p-3 border rounded-lg bg-white disabled:opacity-40 hover:bg-slate-50 transition-all">
                            <ChevronRight size={20}/>
                        </button>
                    </div>
                </div>
            </div>

            {/* 4. MODAL */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in duration-200">
                        
                        {/* Modal Header */}
                        <div className="bg-blue-600 p-5 flex justify-between items-center text-white shadow-lg shrink-0">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-white/20 rounded-xl"><Download size={24} /></div>
                                <div>
                                    <h2 className="text-xl font-bold uppercase tracking-tight">Stock Inbound Sync Engine</h2>
                                    <p className="text-xs font-bold text-blue-100 uppercase">Registry Code: {formData.invoice_no || 'NEW_SYNC'}</p>
                                </div>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="hover:bg-blue-500 p-2 rounded-full transition-all"><X size={28}/></button>
                        </div>

                        {/* Modal Body */}
                        <div className="flex-1 overflow-y-auto p-6 flex flex-col lg:flex-row gap-6 bg-slate-50/50">
                            
                            {/* LEFT: Form */}
                            <div className="flex-1 space-y-6">
                                <div className="bg-white p-6 rounded-2xl border shadow-sm space-y-5">
                                    <div className="flex items-center gap-3 mb-3 text-slate-500"><Database size={18}/><span className="text-xs font-black uppercase tracking-widest">Sync Parameters</span></div>
                                    
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Receiving Depot</label>
                                        <select 
                                            value={formData.depot_id} 
                                            onChange={e => setFormData({...formData, depot_id: e.target.value})}
                                            className="w-full bg-white border border-slate-300 p-4 rounded-xl font-semibold text-base outline-none focus:ring-2 focus:ring-blue-400 shadow-inner"
                                        >
                                            <option value="">-- Choose Target Depot ({depots.length}) --</option>
                                            {depots.map(d => <option key={d.id} value={d.id}>{d.account_name}</option>)}
                                        </select>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Mill Invoice Number</label>
                                        <div className="flex gap-3">
                                            <div className="relative flex-1">
                                                <Hash className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18}/>
                                                <input 
                                                    type="text"
                                                    value={formData.invoice_no}
                                                    onChange={e => setFormData({...formData, invoice_no: e.target.value})}
                                                    className="w-full bg-white border border-slate-300 pl-12 p-4 rounded-xl font-mono text-base font-bold text-blue-700 outline-none focus:ring-2 focus:ring-blue-400 shadow-inner"
                                                    placeholder="ENTER DOC REF..."
                                                />
                                            </div>
                                            <button 
                                                onClick={handleLookupInvoice}
                                                className="bg-blue-600 text-white px-8 rounded-xl font-bold uppercase text-sm tracking-widest hover:bg-blue-700 transition-all flex items-center gap-3 shadow-md active:scale-95 min-w-[140px]"
                                                disabled={isFetchingInvoice}
                                            >
                                                {isFetchingInvoice ? <RefreshCw className="animate-spin" size={18}/> : <Search size={18}/>}
                                                Fetch
                                            </button>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Inward Date</label>
                                        <div className="relative">
                                            <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18}/>
                                            <input 
                                                type="date" 
                                                value={formData.date} 
                                                onChange={e => setFormData({...formData, date: e.target.value})} 
                                                className="w-full bg-white border border-slate-300 pl-12 p-4 rounded-xl font-semibold text-base outline-none focus:ring-2 focus:ring-blue-400 shadow-inner" 
                                            />
                                        </div>
                                    </div>

                                    <div className="p-5 bg-amber-50 rounded-xl border border-amber-100 flex gap-4 text-sm">
                                        <AlertCircle className="text-amber-600 shrink-0 mt-1" size={20} />
                                        <p className="text-amber-800 leading-tight">
                                            Ensure the Invoice Number matches exactly as recorded in the Sales Registry. This action cannot be undone.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* RIGHT: Preview Sidebar */}
                            <div className="w-full lg:w-[420px] bg-slate-900 rounded-2xl p-6 text-white flex flex-col justify-between shadow-2xl">
                                <div className="space-y-5 flex-1 flex flex-col h-full">
                                    <div className="text-center mb-5">
                                        <Activity size={40} className="text-blue-400 mx-auto mb-2" />
                                        <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Invoice Content Preview</p>
                                    </div>

                                    <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
                                        {previewItems.length > 0 ? previewItems.map((item, idx) => (
                                            <div key={idx} className="bg-white/5 p-4 rounded-xl border border-white/10 flex justify-between items-center transition-all hover:bg-white/15">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 bg-blue-600/20 rounded-xl flex items-center justify-center text-blue-400">
                                                        <Box size={20}/>
                                                    </div>
                                                    <div>
                                                        <p className="text-xs text-slate-400 font-black uppercase tracking-tighter">SKU Detail</p>
                                                        <p className="text-base font-bold uppercase truncate max-w-[180px]">{item.Product?.product_name || `ID: ${item.product_id}`}</p>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-xs text-slate-400 font-black uppercase tracking-tighter">Net Qty</p>
                                                    <p className="text-lg font-black text-emerald-400 font-mono">{item.qty || item.total_kgs} <small className="text-xs text-slate-300">KG</small></p>
                                                </div>
                                            </div>
                                        )) : (
                                            <div className="h-full flex flex-col items-center justify-center opacity-20 py-16 border-2 border-dashed border-white/20 rounded-2xl">
                                                <PackageCheck size={72} className="mb-4"/>
                                                <p className="text-sm font-bold uppercase tracking-wider">Pending Doc Fetch</p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="mt-6 p-5 bg-blue-600/10 rounded-2xl border border-blue-500/20 text-center relative overflow-hidden group">
                                    <PackageCheck className="absolute -right-4 -bottom-4 text-white/5 group-hover:scale-110 transition-transform" size={96} />
                                    <p className="text-xs font-black text-blue-300 uppercase tracking-widest mb-1 relative z-10">Total Items Found</p>
                                    <h3 className="text-4xl font-black text-white font-mono relative z-10">{previewItems.length}</h3>
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="p-6 bg-slate-50 border-t flex justify-end items-center gap-5 shrink-0">
                            <button 
                                onClick={() => setIsModalOpen(false)} 
                                className="px-10 py-4 font-bold text-slate-500 hover:text-slate-700 text-base tracking-wider uppercase transition-colors"
                            >
                                Discard
                            </button>
                            <button 
                                onClick={handleSave} 
                                disabled={previewItems.length === 0 || submitLoading} 
                                className="bg-blue-600 hover:bg-blue-700 text-white px-12 py-4 rounded-xl font-bold shadow-xl flex items-center gap-3 active:scale-95 transition-all text-base tracking-wider uppercase disabled:opacity-40 disabled:pointer-events-none"
                            >
                                <Save size={20}/> {submitLoading ? 'SYNCING...' : 'COMMIT INWARD'}
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
                ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
                .custom-scrollbar::-webkit-scrollbar { width: 5px; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.15); border-radius: 10px; }
            `}</style>
        </div>
    );
};

export default DepotStockReceived;
