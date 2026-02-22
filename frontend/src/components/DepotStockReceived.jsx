import React, { useState, useEffect, useMemo } from 'react';
import { mastersAPI, transactionsAPI } from '../service/api';
import { 
    Download, Save, Search, Hash, 
    Calendar, Warehouse, FileText, 
    Plus, X, RefreshCw, Edit,
    PackageCheck, ArrowRightCircle, Box, Activity, Check, AlertCircle
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
    const [isFetchingInvoice, setIsFetchingInvoice] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [searchValue, setSearchValue] = useState('');

    useEffect(() => {
        fetchMasters();
        fetchRecords();
    }, []);

    const fetchMasters = async () => {
        try {
            console.log("Step 1: Fetching Master Accounts...");
            const res = await mastersAPI.accounts.getAll();
            const all = res.data.data || res.data || [];
            
            console.log("Step 2: Total Accounts found in DB:", all.length);

            const filtered = all.filter(a => {
                const group = (a.account_group || a.group_name || "").toUpperCase().trim();
                const isMatch = group === 'DEPOT';
                if (isMatch) console.log(`✅ Found Depot: ${a.account_name} (ID: ${a.id})`);
                return isMatch;
            });

            if (filtered.length === 0) {
                console.warn("❌ WARNING: No accounts found with account_group 'DEPOT'. Check your Database values.");
                console.log("Example Account from DB:", all[0]); // Shows you what the fields actually look like
            }

            setDepots(filtered);
        } catch (err) { console.error("Master fetch error", err); }
    };
    const fetchRecords = async () => {
        setLoading(true);
        try {
            const res = await transactionsAPI.depotReceived.getAll();
            const data = Array.isArray(res.data) ? res.data : (res.data.data || []);
            setList(data);
        } catch (err) { console.error("Records fetch error", err); }
        finally { setLoading(false); }
    };

    const handleLookupInvoice = async () => {
    if (!formData.invoice_no) {
        alert("Please enter an Invoice Number");
        return;
    }
        
    console.log(`🔎 Searching Registry for Invoice No: "${formData.invoice_no}"`);
    setIsFetchingInvoice(true);

    try {
        const res = await transactionsAPI.directInvoices.getAll();
        const allInvoices = res.data.data || res.data || [];
            
        console.log(`📋 Total Invoices in Sales Registry: ${allInvoices.length}`);

        const target = allInvoices.find(inv => {
            const inputVal = String(formData.invoice_no).trim().toLowerCase();
            const invNo = String(inv.invoice_no || "").trim().toLowerCase();
            const ordNo = String(inv.order_no || "").trim().toLowerCase();
            const idNo = String(inv.id || "").trim().toLowerCase();

            return (invNo === inputVal || ordNo === inputVal || idNo === inputVal);
        });

        if (!target) {
            alert(`Invoice "${formData.invoice_no}" not found.`);
            setPreviewItems([]);
            return;
        }

        // 🔥 VALIDATION: Already inwarded check
        if (target.is_depot_inwarded === true || target.is_depot_inwarded === 1) {
            alert("❌ This invoice has already been received in the depot.");
            setPreviewItems([]);
            return;
        }

        // If not inwarded, show items
        const items = target.OrderDetails || target.InvoiceDetails || target.items || [];

        if (!items || items.length === 0) {
            alert("Invoice found but no line items available.");
            setPreviewItems([]);
            return;
        }

        console.log("🎯 Invoice Valid. Showing items...");
        setPreviewItems(items);

    } catch (err) {
        console.error("Fetch invoice error", err);
        alert("Error fetching invoice.");
    } finally {
        setIsFetchingInvoice(false);
    }
};

const handleSave = async (e) => {
    if (e) e.preventDefault();
    if (!formData.depot_id) return alert("Select a Depot");
    
    setLoading(true);
    try {
        const payload = { 
            invoice_no: formData.invoice_no,
            depot_id: formData.depot_id,
            date: formData.date 
        };

        const res = await transactionsAPI.depotInward.create(payload);
        
        console.log("Sync Result:", res.data);

        // 🔥 Notify other components that depot stock changed
        window.dispatchEvent(new Event("depotStockUpdated"));

        setIsModalOpen(false);
        fetchRecords(); 
        alert("Stock Inwarded Successfully!");
    } catch (err) { 
        alert("Error: " + (err.response?.data?.error || "Check Connection")); 
    } finally { 
        setLoading(false); 
    }
};
    // Filtered list for the main table
    const filteredData = useMemo(() => {
        return list.filter(item => 
            String(item.Depot?.account_name || '').toLowerCase().includes(searchValue.toLowerCase()) ||
            String(item.invoice_no || '').toLowerCase().includes(searchValue.toLowerCase())
        ).sort((a, b) => b.id - a.id);
    }, [list, searchValue]);

    return (
        <div className="min-h-screen bg-[#f8fafc] p-6 font-sans">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-black text-slate-800 flex items-center gap-2">
                        <Download className="text-indigo-600" /> Depot Inward Sync
                    </h1>
                </div>
                <button 
                    onClick={() => { setFormData(emptyState); setPreviewItems([]); setIsModalOpen(true); }}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-xl font-bold flex items-center gap-2 shadow-lg"
                >
                    <Plus size={18} /> New Entry
                </button>
            </div>

            {/* Main Table */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                            <th className="p-4 text-xs font-black uppercase text-slate-500">Date</th>
                            <th className="p-4 text-xs font-black uppercase text-slate-500">Depot</th>
                            <th className="p-4 text-xs font-black uppercase text-slate-500">Invoice Ref</th>
                            <th className="p-4 text-xs font-black uppercase text-slate-500">Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredData.map(item => (
                            <tr key={item.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                                <td className="p-4 text-sm font-medium">{item.date}</td>
                                <td className="p-4 text-sm font-black text-slate-700">{item.Depot?.account_name}</td>
                                <td className="p-4 text-sm font-mono text-indigo-600">{item.invoice_no}</td>
                                <td className="p-4"><span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-1 rounded-md font-bold uppercase">Synced</span></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-5xl overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="bg-indigo-950 p-6 flex justify-between items-center text-white">
                            <h2 className="font-black uppercase tracking-widest">Inbound Stock Sync</h2>
                            <button onClick={() => setIsModalOpen(false)}><X /></button>
                        </div>

                        <div className="p-8 grid grid-cols-1 lg:grid-cols-2 gap-8 overflow-y-auto">
                            <div className="space-y-6">
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase">Receiving Depot</label>
                                    <select 
                                        value={formData.depot_id} 
                                        onChange={e => setFormData({...formData, depot_id: e.target.value})}
                                        className="w-full p-3 mt-1 bg-slate-50 border border-slate-200 rounded-xl font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                                    >
                                        <option value="">Select a Depot ({depots.length} found)</option>
                                        {depots.map(d => <option key={d.id} value={d.id}>{d.account_name}</option>)}
                                    </select>
                                </div>

                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase">Mill Invoice Number</label>
                                    <div className="flex gap-2 mt-1">
                                        <input 
                                            type="text"
                                            value={formData.invoice_no}
                                            onChange={e => setFormData({...formData, invoice_no: e.target.value})}
                                            className="flex-1 p-3 bg-slate-50 border border-slate-200 rounded-xl font-mono focus:ring-2 focus:ring-indigo-500 outline-none"
                                            placeholder="Enter Invoice No..."
                                        />
                                        <button 
                                            onClick={handleLookupInvoice}
                                            className="bg-indigo-600 text-white px-4 rounded-xl font-bold hover:bg-indigo-700 transition-all flex items-center gap-2"
                                            disabled={isFetchingInvoice}
                                        >
                                            {isFetchingInvoice ? <RefreshCw className="animate-spin" size={16}/> : <Search size={16}/>}
                                            Fetch
                                        </button>
                                    </div>
                                </div>

                                <div className="p-4 bg-amber-50 rounded-xl border border-amber-100 flex gap-3">
                                    <AlertCircle className="text-amber-500 shrink-0" />
                                    <p className="text-xs text-amber-800">Ensure the Invoice Number matches exactly as recorded in the Sales Registry.</p>
                                </div>
                            </div>

                            <div className="bg-slate-900 rounded-3xl p-6 text-white overflow-hidden flex flex-col">
                                <h3 className="text-xs font-black uppercase text-slate-400 mb-4 flex items-center gap-2">
                                    <FileText size={14}/> Invoice Content Preview
                                </h3>
                                
                                <div className="flex-1 overflow-y-auto space-y-3 pr-2">
                                    {previewItems.length > 0 ? previewItems.map((item, idx) => (
                                        <div key={idx} className="bg-white/5 p-3 rounded-xl border border-white/10 flex justify-between items-center">
                                            <div>
                                                <p className="text-[10px] text-indigo-400 font-bold uppercase">Product</p>
                                                <p className="text-sm font-bold">{item.Product?.product_name || `Item ID: ${item.product_id}`}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-[10px] text-indigo-400 font-bold uppercase">Qty</p>
                                                <p className="text-lg font-black text-emerald-400">{item.qty} <small className="text-[10px] text-white/50">KG</small></p>
                                            </div>
                                        </div>
                                    )) : (
                                        <div className="h-full flex flex-col items-center justify-center opacity-20 py-10">
                                            <Box size={40} className="mb-2"/>
                                            <p className="text-xs font-bold uppercase">Waiting for data...</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="p-6 bg-slate-50 border-t flex justify-end gap-3">
                            <button onClick={() => setIsModalOpen(false)} className="px-6 py-2 font-bold text-slate-400">Cancel</button>
                            <button 
                                onClick={handleSave}
                                disabled={previewItems.length === 0 || loading}
                                className="bg-indigo-600 text-white px-10 py-3 rounded-xl font-black uppercase tracking-widest text-xs disabled:opacity-30 flex items-center gap-2"
                            >
                                <Save size={16}/> {loading ? 'Saving...' : 'Confirm Inward'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DepotStockReceived;