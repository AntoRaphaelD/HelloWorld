import React, { useState, useEffect, useMemo } from 'react';
import { transactionsAPI } from '../service/api';
import { 
    ShieldCheck, Clock, CheckCircle, Search, 
    ArrowUpRight, AlertCircle, Eye, X, Package, 
    RefreshCw, ChevronLeft, ChevronRight, Square, 
    CheckSquare, Trash2, UserCheck, Calculator,
    Filter, Hash, FileText, Activity, Database
} from 'lucide-react';

const InvoiceApproval = () => {
    // --- Main States ---
    const [list, setList] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedInvoice, setSelectedInvoice] = useState(null);

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
        fetchPending();
    }, []);

    const fetchPending = async () => {
        setLoading(true);
        try {
            const res = await transactionsAPI.invoices.getAll();
            const data = Array.isArray(res.data) ? res.data : (res.data.data || []);
            // Filter only pending (unapproved) invoices
            setList(data.filter(inv => !inv.is_approved));
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

    // Reset pagination on filter change
    useEffect(() => {
        setCurrentPage(1);
    }, [searchValue, searchField, searchCondition]);

    // --- Action Handlers ---
    const handleApprove = async (id) => {
        if (!window.confirm("Authorize this transaction for Ledger Posting?")) return;
        setLoading(true);
        try {
            await transactionsAPI.invoices.approve(id);
            fetchPending();
            if (selectedInvoice?.id === id) setSelectedInvoice(null);
        } catch (err) { alert("Authorization Error"); }
        finally { setLoading(false); }
    };

    const handleReject = async (id) => {
        if (!window.confirm("Rejecting will DELETE this invoice and REVERT Mill Stock. Proceed?")) return;
        setLoading(true);
        try {
            await transactionsAPI.invoices.reject(id);
            fetchPending();
            if (selectedInvoice?.id === id) setSelectedInvoice(null);
        } catch (err) { alert("Rejection Error"); }
        finally { setLoading(false); }
    };

    const handleBulkApprove = async () => {
        if (selectedIds.length === 0) return;
        if (window.confirm(`Authorize ${selectedIds.length} invoices for posting?`)) {
            setLoading(true);
            try {
                await Promise.all(selectedIds.map(id => transactionsAPI.invoices.approve(id)));
                setSelectedIds([]);
                setIsSelectionMode(false);
                fetchPending();
            } catch (err) { alert("Bulk Action Error"); }
            finally { setLoading(false); }
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 p-6 font-sans text-slate-900">
            
            {/* 1. TOP HEADER */}
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <ShieldCheck className="text-amber-500" /> Post-Transaction Audit
                    </h1>
                    <p className="text-sm text-slate-500 flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse"></span>
                        {list.length} Invoices Awaiting Authorization
                    </p>
                </div>
                
                <div className="flex gap-2">
                    <button 
                        onClick={() => { setIsSelectionMode(!isSelectionMode); setSelectedIds([]); }}
                        className={`px-5 py-2 border rounded-lg font-semibold transition-all ${isSelectionMode ? 'bg-amber-100 border-amber-300 text-amber-700' : 'bg-white border-slate-200 text-blue-600 hover:bg-slate-50'}`}
                    >
                        {isSelectionMode ? 'Exit Selection' : 'Bulk Select'}
                    </button>

                    {isSelectionMode ? (
                        <button 
                            onClick={handleBulkApprove}
                            disabled={selectedIds.length === 0}
                            className={`px-5 py-2 border rounded-lg flex items-center gap-2 transition-all ${selectedIds.length > 0 ? 'bg-emerald-600 text-white shadow-lg' : 'bg-white border-slate-100 text-slate-300 cursor-not-allowed'}`}
                        >
                            <UserCheck size={18} /> Authorize Selected ({selectedIds.length})
                        </button>
                    ) : (
                        <div className="flex items-center bg-blue-50 text-blue-600 px-4 py-2 rounded-lg text-xs font-bold gap-2">
                            <Activity size={14}/> Queue Active
                        </div>
                    )}

                    <button onClick={fetchPending} className="p-2 border border-slate-200 rounded-lg bg-white text-slate-400 hover:text-blue-600 transition-colors">
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
                            <option value="party_name">Customer Name</option>
                            <option value="invoice_no">Invoice Ref</option>
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
                            <input type="text" placeholder="Filter queue..." value={searchValue} onChange={(e) => setSearchValue(e.target.value)} className="w-full border border-slate-200 pl-10 pr-4 py-2 rounded-lg text-sm outline-none focus:ring-1 focus:ring-blue-500 bg-white" />
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
                                <th className="p-4 text-sm font-semibold uppercase tracking-wider">Inv #</th>
                                <th className="p-4 text-sm font-semibold uppercase tracking-wider">Date</th>
                                <th className="p-4 text-sm font-semibold uppercase tracking-wider">Party / Ledger Name</th>
                                <th className="p-4 text-sm font-semibold uppercase tracking-wider text-right">Value (₹)</th>
                                <th className="p-4 text-sm font-semibold uppercase tracking-wider text-center">Status</th>
                                <th className="p-4 text-sm font-semibold uppercase tracking-wider text-center w-32">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-mono">
                            {currentItems.length > 0 ? currentItems.map((item) => (
                                <tr key={item.id} className={`transition-colors cursor-pointer group ${selectedIds.includes(item.id) ? 'bg-amber-50' : 'hover:bg-blue-50/50'}`}>
                                    {isSelectionMode && (
                                        <td className="p-4 text-center" onClick={() => setSelectedIds(prev => prev.includes(item.id) ? prev.filter(i => i !== item.id) : [...prev, item.id])}>
                                            {selectedIds.includes(item.id) ? <CheckSquare size={18} className="text-amber-600 mx-auto"/> : <Square size={18} className="text-slate-300 mx-auto"/>}
                                        </td>
                                    )}
                                    <td className="p-4 text-sm font-bold text-blue-600">#{item.invoice_no}</td>
                                    <td className="p-4 text-sm text-slate-500 font-sans">{item.date}</td>
                                    <td className="p-4 text-sm font-bold text-slate-700 uppercase font-sans">{item.Party?.account_name}</td>
                                    <td className="p-4 text-sm font-black text-right text-slate-900 font-mono">
                                        ₹{parseFloat(item.final_invoice_value).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                    </td>
                                    <td className="p-4 text-center font-sans">
                                        <span className="text-[10px] font-black bg-amber-50 text-amber-600 px-2 py-1 rounded uppercase tracking-tighter flex items-center justify-center gap-1">
                                            <Clock size={12}/> Awaiting
                                        </span>
                                    </td>
                                    <td className="p-4 text-center">
                                        <div className="flex justify-center gap-2">
                                            <button onClick={() => setSelectedInvoice(item)} className="p-1.5 text-slate-300 hover:text-blue-600 transition-colors" title="View Detail"><Eye size={18}/></button>
                                            <button onClick={() => handleApprove(item.id)} className="p-1.5 text-slate-300 hover:text-emerald-600 transition-colors" title="Authorize"><UserCheck size={18}/></button>
                                            <button onClick={() => handleReject(item.id)} className="p-1.5 text-slate-300 hover:text-red-600 transition-colors" title="Reject"><Trash2 size={18}/></button>
                                        </div>
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan={7} className="p-24 text-center opacity-20">
                                        <CheckCircle size={64} className="mx-auto mb-2 text-emerald-500" />
                                        <p className="font-bold text-xl uppercase tracking-widest">Queue Cleared</p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* 4. PAGINATION FOOTER */}
                <div className="p-4 bg-slate-50 border-t flex items-center justify-between">
                    <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider">
                        Pending Items: {filteredData.length} entries
                    </span>
                    <div className="flex gap-2">
                        <button disabled={currentPage === 1} onClick={() => setCurrentPage(prev => prev - 1)} className="p-2 border rounded bg-white hover:bg-blue-50 disabled:opacity-30 transition-all shadow-sm">
                            <ChevronLeft size={16}/>
                        </button>
                        <div className="px-3 flex items-center text-xs font-bold text-slate-600">Page {currentPage} of {totalPages}</div>
                        <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(prev => prev + 1)} className="p-2 border rounded bg-white disabled:opacity-30 hover:bg-blue-50 transition-all shadow-sm">
                            <ChevronRight size={16}/>
                        </button>
                    </div>
                </div>
            </div>

            {/* 5. AUDIT COCKPIT MODAL */}
            {selectedInvoice && (
                <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setSelectedInvoice(null)} />
                    
                    <div className="relative bg-white w-full max-w-5xl rounded-[2rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in duration-200">
                        
                        {/* Modal Header */}
                        <div className="p-4 bg-blue-600 text-white flex justify-between items-center">
                            <div className="flex items-center gap-4">
                                <div className="p-2 bg-amber-500 rounded-lg shadow-lg">
                                    <ShieldCheck size={24} />
                                </div>
                                <div>
                                    <h3 className="font-black uppercase tracking-tight text-lg">Transaction Authorization Cockpit</h3>
                                    <p className="text-[10px] text-blue-100 font-bold uppercase tracking-widest">Audit REF: #{selectedInvoice.invoice_no} | {selectedInvoice.date}</p>
                                </div>
                            </div>
                            <button onClick={() => setSelectedInvoice(null)} className="p-2 hover:bg-blue-500 rounded-full transition-colors text-white"><X size={24}/></button>
                        </div>
                        
                        {/* Modal Body */}
                        <div className="flex-1 overflow-y-auto flex flex-col lg:flex-row">
                            
                            {/* LEFT SIDE: Transaction Data */}
                            <div className="flex-1 p-8 space-y-8">
                                <div>
                                    <div className="flex items-center gap-2 mb-4 text-slate-400">
                                        <FileText size={14} />
                                        <span className="text-[10px] font-black uppercase tracking-[0.2em]">Party Identity Detail</span>
                                    </div>
                                    <h4 className="text-2xl font-black text-slate-800 uppercase tracking-tighter mb-1">{selectedInvoice.Party?.account_name}</h4>
                                    <div className="flex gap-4 text-xs font-bold text-slate-400 uppercase">
                                        <div className="flex items-center gap-1"><Hash size={12}/> ID: {selectedInvoice.party_id}</div>
                                        <div className="flex items-center gap-1"><Clock size={12}/> {selectedInvoice.date}</div>
                                    </div>
                                </div>

                                <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                                    <table className="w-full text-left">
                                        <thead className="bg-slate-900 text-white text-[9px] uppercase font-bold tracking-widest">
                                            <tr>
                                                <th className="p-4">Composition SKU</th>
                                                <th className="p-4 text-center">Net Weight</th>
                                                <th className="p-4 text-right">Audit Rate</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 font-mono">
                                            {selectedInvoice.InvoiceDetails?.map((item, idx) => (
                                                <tr key={idx} className="text-sm">
                                                    <td className="p-4 text-slate-700 font-sans font-bold uppercase">
                                                        {item.Product?.product_name}
                                                    </td>
                                                    <td className="p-4 text-center text-amber-600 font-black">{item.total_kgs} <span className="text-[10px] text-slate-400">KG</span></td>
                                                    <td className="p-4 text-right text-slate-600 font-black">₹{item.rate}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl flex gap-3">
                                    <AlertCircle size={20} className="text-blue-600 shrink-0 mt-0.5" />
                                    <p className="text-[11px] leading-relaxed text-blue-900 font-medium italic">
                                        Authorization will commit this invoice to the general ledger and finalize mill stock deduction. This action is logged for the active audit trail.
                                    </p>
                                </div>
                            </div>

                            {/* RIGHT SIDE: Financial & Action Dashboard */}
                            <div className="w-full lg:w-80 bg-slate-900 text-white p-8 flex flex-col justify-between shadow-xl">
                                <div className="space-y-8">
                                    <div className="text-center">
                                        <Calculator size={40} className="text-blue-400 mx-auto mb-2" />
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Revenue Validation</p>
                                    </div>

                                    <div className="space-y-6">
                                        <div className="space-y-1 border-b border-white/5 pb-4">
                                            <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Assessable Value</label>
                                            <div className="text-2xl font-black font-mono">₹ {parseFloat(selectedInvoice.assessable_value).toLocaleString()}</div>
                                        </div>

                                        <div className="space-y-1 border-b border-white/5 pb-4">
                                            <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Document Net Value</label>
                                            <div className="text-3xl font-black text-emerald-400 font-mono tracking-tighter">₹ {parseFloat(selectedInvoice.final_invoice_value).toLocaleString()}</div>
                                        </div>

                                        <div className="bg-white/5 p-4 rounded-xl border border-white/10 text-center">
                                            <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest mb-1">Authorization Hub</p>
                                            <div className="flex flex-col gap-3 mt-4">
                                                <button 
                                                    onClick={() => handleApprove(selectedInvoice.id)} 
                                                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-xl font-black text-[11px] uppercase tracking-widest shadow-xl shadow-emerald-900/50 flex items-center justify-center gap-2 transition-all active:scale-95"
                                                >
                                                    <UserCheck size={16}/> Post to Ledger
                                                </button>
                                                <button 
                                                    onClick={() => handleReject(selectedInvoice.id)} 
                                                    className="w-full bg-slate-800 hover:bg-red-950 hover:text-red-400 text-slate-400 py-3 rounded-xl font-black text-[11px] uppercase tracking-widest border border-white/5 transition-all active:scale-95"
                                                >
                                                    Reject Document
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-8 p-5 bg-white/5 rounded-2xl border border-white/10 flex items-center justify-center gap-2">
                                    <Database size={16} className="text-blue-500" />
                                    <p className="text-[9px] font-black uppercase text-slate-500 tracking-[0.2em]">Auth Level: ADMIN_LEDGER</p>
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

export default InvoiceApproval;