import React, { useState, useEffect, useMemo } from 'react';
import { transactionsAPI } from '../service/api';
import { 
    ShieldCheck, Clock, CheckCircle, Search, 
    ArrowUpRight, AlertCircle, Eye, X, Package, 
    RefreshCw, ChevronLeft, ChevronRight, Square, 
    CheckSquare, Trash2, UserCheck, Calculator
} from 'lucide-react';

const InvoiceApproval = () => {
    // --- Main States ---
    const [list, setList] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedInvoice, setSelectedInvoice] = useState(null);

    // --- Search, Sort & Selection States ---
    const [isSelectionMode, setIsSelectionMode] = useState(false);
    const [selectedIds, setSelectedIds] = useState([]);
    const [searchField, setSearchField] = useState('party_name');
    const [searchValue, setSearchValue] = useState('');
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
    const handleRowClick = (item) => {
        if (isSelectionMode) {
            setSelectedIds(prev => prev.includes(item.id) ? prev.filter(i => i !== item.id) : [...prev, item.id]);
            return;
        }
        setSelectedInvoice(item);
    };

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
        <div className="min-h-screen bg-[#f8fafc] p-6 font-sans">
            
            {/* 1. TOP HEADER */}
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
                        <ShieldCheck className="text-amber-500" size={32} /> Post-Transaction Audit
                    </h1>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse"></span>
                        {list.length} Invoices Awaiting Authorization
                    </p>
                </div>
                
                <div className="flex gap-2">
                    <button 
                        onClick={() => { setIsSelectionMode(!isSelectionMode); setSelectedIds([]); }}
                        className={`px-6 py-2 border rounded-lg font-bold transition-all ${isSelectionMode ? 'bg-amber-100 border-amber-300 text-amber-700' : 'bg-white border-slate-200 text-amber-600 hover:bg-slate-50'}`}
                    >
                        {isSelectionMode ? 'Exit Selection' : 'Bulk Select'}
                    </button>

                    {isSelectionMode && (
                        <button 
                            onClick={handleBulkApprove}
                            disabled={selectedIds.length === 0}
                            className={`px-6 py-2 border rounded-lg font-bold flex items-center gap-2 transition-all ${selectedIds.length > 0 ? 'bg-emerald-600 border-emerald-700 text-white shadow-lg' : 'bg-white border-slate-100 text-slate-300 cursor-not-allowed'}`}
                        >
                            <UserCheck size={18} /> Authorize Selected ({selectedIds.length})
                        </button>
                    )}

                    <button onClick={fetchPending} className="p-2 border rounded-lg bg-white text-slate-400 hover:text-amber-600 transition-colors">
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
                            <option value="party_name">Customer Name</option>
                            <option value="invoice_no">Invoice Ref</option>
                        </select>
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-3 text-slate-400" size={16}/>
                            <input type="text" placeholder="Filter pending queue..." value={searchValue} onChange={(e) => setSearchValue(e.target.value)} className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-amber-500" />
                        </div>
                    </div>
                </div>
                <button onClick={() => setSearchValue('')} className="px-6 py-2.5 text-sm font-bold text-slate-500 hover:bg-slate-100 rounded-lg transition-all">Show Queue</button>
            </div>

            {/* 3. AMBER HEADER DATA TABLE */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-md overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-amber-500 text-white">
                            <tr>
                                {isSelectionMode && <th className="p-4 w-12 text-center"><Square size={20} className="mx-auto" /></th>}
                                <th className="p-4 text-[10px] font-black uppercase tracking-widest">Inv #</th>
                                <th className="p-4 text-[10px] font-black uppercase tracking-widest">Date</th>
                                <th className="p-4 text-[10px] font-black uppercase tracking-widest">Party / Ledger Name</th>
                                <th className="p-4 text-[10px] font-black uppercase tracking-widest text-right">Invoice Value (₹)</th>
                                <th className="p-4 text-[10px] font-black uppercase tracking-widest text-center">Status</th>
                                <th className="p-4 text-[10px] font-black uppercase tracking-widest text-center w-32">Actions</th>
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
                                    <td className="p-4 text-sm font-bold text-amber-600 font-mono">#{item.invoice_no}</td>
                                    <td className="p-4 text-sm text-slate-500">{item.date}</td>
                                    <td className="p-4 text-sm font-black text-slate-700 uppercase">{item.Party?.account_name}</td>
                                    <td className="p-4 text-sm font-black text-right text-slate-900">₹{parseFloat(item.final_invoice_value).toLocaleString()}</td>
                                    <td className="p-4 text-center">
                                        <span className="text-[9px] font-bold bg-amber-50 text-amber-600 px-2 py-1 rounded-full uppercase tracking-tighter flex items-center justify-center gap-1">
                                            <Clock size={10}/> Awaiting Audit
                                        </span>
                                    </td>
                                    <td className="p-4 text-center flex justify-center gap-2">
                                        <button onClick={(e) => {e.stopPropagation(); setSelectedInvoice(item);}} className="p-2 text-slate-300 hover:text-blue-600 transition-colors" title="View Details"><Eye size={18}/></button>
                                        <button onClick={(e) => {e.stopPropagation(); handleReject(item.id);}} className="p-2 text-slate-300 hover:text-red-600 transition-colors" title="Reject & Delete"><Trash2 size={18}/></button>
                                        <button onClick={(e) => {e.stopPropagation(); handleApprove(item.id);}} className="p-2 text-slate-300 hover:text-emerald-600 transition-colors" title="Authorize"><UserCheck size={18}/></button>
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan={isSelectionMode ? 7 : 6} className="p-24 text-center opacity-20">
                                        <CheckCircle size={64} className="mx-auto mb-2 text-emerald-500" />
                                        <p className="font-black uppercase tracking-widest">Queue Cleared</p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* 4. PAGINATION FOOTER */}
                <div className="p-4 bg-slate-50 border-t flex items-center justify-between">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        Showing {currentItems.length} of {processedData.length} Audits
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

            {/* 5. AUDIT DETAIL MODAL */}
            {selectedInvoice && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4">
                    <div className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in duration-200">
                        {/* Modal Header */}
                        <div className="p-6 bg-slate-900 text-white flex justify-between items-center">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-amber-500/20 rounded-xl text-amber-500"><ShieldCheck /></div>
                                <div>
                                    <h3 className="font-black uppercase tracking-widest text-lg">Invoice Audit Detail</h3>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">REF: #{selectedInvoice.invoice_no} | {selectedInvoice.date}</p>
                                </div>
                            </div>
                            <button onClick={() => setSelectedInvoice(null)} className="p-2 hover:bg-white/10 rounded-full transition-colors text-slate-400"><X size={24}/></button>
                        </div>
                        
                        {/* Modal Body */}
                        <div className="p-8 space-y-8">
                            <div>
                                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 border-b pb-2">Party Information</h4>
                                <p className="text-xl font-black text-slate-800 uppercase">{selectedInvoice.Party?.account_name}</p>
                                <p className="text-xs text-slate-400 font-bold flex items-center gap-1 mt-1 uppercase tracking-tighter"><AlertCircle size={12}/> Authorization will post to this ledger.</p>
                            </div>

                            <div className="border border-slate-100 rounded-2xl overflow-hidden">
                                <table className="w-full text-left">
                                    <thead className="bg-slate-50 text-[10px] font-black uppercase text-slate-400">
                                        <tr>
                                            <th className="p-4">Composition SKU</th>
                                            <th className="p-4 text-center">Weight (KG)</th>
                                            <th className="p-4 text-right">Rate</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {selectedInvoice.InvoiceDetails?.map((item, idx) => (
                                            <tr key={idx} className="text-sm font-bold">
                                                <td className="p-4 flex items-center gap-2 text-slate-700">
                                                    <Package size={14} className="text-slate-300"/>
                                                    {item.Product?.product_name}
                                                </td>
                                                <td className="p-4 text-center font-mono text-amber-600">{item.total_kgs}</td>
                                                <td className="p-4 text-right font-mono italic text-slate-400">₹{item.rate}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            <div className="bg-slate-900 rounded-3xl p-6 text-white flex justify-between items-center relative overflow-hidden">
                                <Calculator className="absolute right-0 top-0 text-white/5" size={100}/>
                                <div className="relative">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Grand Total Transaction Value</p>
                                    <h2 className="text-3xl font-black font-mono">₹{parseFloat(selectedInvoice.final_invoice_value).toLocaleString()}</h2>
                                </div>
                                <div className="flex gap-2 relative">
                                    <button 
                                        onClick={() => handleReject(selectedInvoice.id)} 
                                        className="bg-white/10 hover:bg-red-600 px-6 py-3 rounded-xl font-black text-[10px] uppercase transition-all"
                                    >
                                        Reject
                                    </button>
                                    <button 
                                        onClick={() => handleApprove(selectedInvoice.id)} 
                                        className="bg-emerald-500 hover:bg-emerald-600 text-white px-8 py-3 rounded-xl font-black text-[10px] uppercase transition-all shadow-lg"
                                    >
                                        Authorize Posting
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <footer className="h-10 bg-white border-t px-8 flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase shrink-0">
                <div className="flex items-center gap-6">
                    <span><AlertCircle size={14} className="text-amber-500 inline mr-1" /> Authorized Session</span>
                    <span className="text-slate-200">|</span>
                    <span>Audit Trail: Active Logging</span>
                </div>
                <div className="bg-slate-900 text-white px-4 py-1 rounded-full text-[9px] tracking-widest">Auth Level: ADMIN_LEDGER</div>
            </footer>

            <style jsx>{`
                ::-webkit-scrollbar { width: 5px; height: 5px; }
                ::-webkit-scrollbar-track { background: transparent; }
                ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
            `}</style>
        </div>
    );
};

export default InvoiceApproval;