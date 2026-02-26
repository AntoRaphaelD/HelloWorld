import React, { useState, useEffect, useMemo } from 'react';
import { mastersAPI, transactionsAPI } from '../service/api';
import { 
    Plus, Edit, Trash2, X, ChevronLeft, 
    ChevronRight, Loader2, RefreshCw, 
    Save, CheckCircle2, Truck, Search, 
    Calendar, Clock, MapPin, Package, DollarSign,
    Info, Navigation, Hash, ShieldCheck
} from 'lucide-react';

const DespatchEntry = () => {
    // --- Model State ---
    const emptyState = { 
        id: null,
        load_no: '', 
        load_date: new Date().toISOString().split('T')[0], 
        transport_id: '', 
        lr_no: '', 
        lr_date: new Date().toISOString().split('T')[0], 
        vehicle_no: '', 
        delivery: '',         
        insurance_no: '',     
        in_time: '', 
        out_time: '', 
        no_of_bags: 0, 
        freight: 0, 
        freight_per_bag: 0    
    };

    const [list, setList] = useState([]);
    const [transports, setTransports] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formData, setFormData] = useState(emptyState);
    const [loading, setLoading] = useState(false);
    const [submitLoading, setSubmitLoading] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const [successMessage, setSuccessMessage] = useState("");

    const [searchField, setSearchField] = useState('vehicle_no');
    const [searchValue, setSearchValue] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    useEffect(() => { 
        fetchRecords(); 
        fetchTransports();
    }, []);

    // --- Calculation Logic for Read-Only Field ---
    const calculatedFreightPerBag = useMemo(() => {
        const bags = parseFloat(formData.no_of_bags) || 0;
        const total = parseFloat(formData.freight) || 0;
        return bags > 0 ? (total / bags).toFixed(2) : "0.00";
    }, [formData.no_of_bags, formData.freight]);

    const fetchRecords = async () => {
        setLoading(true);
        try {
            const res = await transactionsAPI.despatch.getAll();
            const data = res?.data?.data || res?.data || [];
            setList(Array.isArray(data) ? data : []);
        } catch (err) { setList([]); } 
        finally { setLoading(false); }
    };

    const fetchTransports = async () => {
        try {
            const res = await mastersAPI.transports.getAll();
            setTransports(res?.data?.data || res?.data || []);
        } catch (err) { console.error(err); }
    };

    const handleAddNew = () => {
        const safeList = Array.isArray(list) ? list : [];
        const maxCode = safeList.reduce((max, item) => {
            const num = parseInt(item.load_no, 10);
            return !isNaN(num) ? Math.max(max, num) : max;
        }, 0);
        setFormData({ ...emptyState, load_no: (maxCode + 1).toString() });
        setIsModalOpen(true);
    };

    const handleEdit = (item) => {
        setFormData({ ...item, transport_id: item.transport_id?.toString() || '' });
        setIsModalOpen(true);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setSubmitLoading(true);
        const payload = {
            ...formData,
            freight_per_bag: parseFloat(calculatedFreightPerBag)
        };
        try {
            if (formData.id) await transactionsAPI.despatch.update(formData.id, payload);
            else await transactionsAPI.despatch.create(payload);
            
            setSuccessMessage(formData.id ? "Updated!" : "Saved!");
            setShowSuccess(true);
            setTimeout(() => setShowSuccess(false), 2000);
            fetchRecords();
            setIsModalOpen(false);
        } catch (err) { alert("Error saving record."); }
        finally { setSubmitLoading(false); }
    };

    const currentItems = useMemo(() => {
        const filtered = list.filter(item => 
            String(item[searchField] || '').toLowerCase().includes(searchValue.toLowerCase())
        );
        return filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
    }, [list, searchValue, searchField, currentPage]);

    return (
        <div className="min-h-screen bg-slate-50 p-6 font-sans text-slate-900">
            {showSuccess && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white p-10 rounded-[2.5rem] shadow-2xl flex flex-col items-center gap-4 scale-110">
                        <CheckCircle2 size={80} className="text-emerald-500 animate-bounce" />
                        <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tight">{successMessage}</h3>
                    </div>
                </div>
            )}

            {/* HEADER */}
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <Truck className="text-blue-600" /> Despatch Entry
                    </h1>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Fleet manifest & Logistics control</p>
                </div>
                <button onClick={handleAddNew} className="bg-blue-600 text-white px-6 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-xl active:scale-95 transition-all flex items-center gap-2">
                    <Plus size={16} /> New Load
                </button>
            </div>

            {/* SEARCH */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm mb-6 flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input type="text" placeholder={`Search...`} value={searchValue} onChange={(e) => setSearchValue(e.target.value)} className="w-full pl-12 pr-4 py-3 bg-slate-50 border-none rounded-xl text-sm font-bold outline-none" />
                </div>
                <select value={searchField} onChange={(e) => setSearchField(e.target.value)} className="bg-slate-50 px-6 py-3 rounded-xl text-[10px] font-black uppercase text-slate-500 border-none outline-none">
                    <option value="load_no">Load No</option>
                    <option value="vehicle_no">Vehicle No</option>
                </select>
            </div>

            {/* TABLE - MATCHES YOUR IMAGE HEADERS */}
            <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-slate-900 text-slate-200">
                        <tr>
                            <th className="p-5 text-[11px] font-black uppercase tracking-widest border-r border-slate-800">Load No</th>
                            <th className="p-5 text-[11px] font-black uppercase tracking-widest border-r border-slate-800">Load Date</th>
                            <th className="p-5 text-[11px] font-black uppercase tracking-widest border-r border-slate-800">TransName</th>
                            <th className="p-5 text-[11px] font-black uppercase tracking-widest border-r border-slate-800 text-right">Qty</th>
                            <th className="p-5 text-[11px] font-black uppercase tracking-widest border-r border-slate-800 text-right">Freight</th>
                            <th className="p-5 text-[11px] font-black uppercase tracking-widest text-center">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {loading ? (
                            <tr><td colSpan="6" className="p-20 text-center"><Loader2 className="animate-spin mx-auto text-blue-600" size={40} /></td></tr>
                        ) : currentItems.length > 0 ? (
                            currentItems.map((item) => (
                                <tr key={item.id} onClick={() => handleEdit(item)} className="hover:bg-blue-50/50 cursor-pointer transition-colors font-semibold">
                                    <td className="p-5 text-sm font-mono font-black text-blue-600 bg-slate-50/50">{item.load_no}</td>
                                    <td className="p-5 text-sm text-slate-500 uppercase">{item.load_date}</td>
                                    <td className="p-5 text-xs font-black uppercase text-slate-800">{item.Transport?.transport_name || 'DIRECT'}</td>
                                    <td className="p-5 text-sm text-right font-bold text-slate-400">{item.no_of_bags}</td>
                                    <td className="p-5 text-sm text-right font-black text-emerald-600">₹{parseFloat(item.freight).toLocaleString()}</td>
                                    <td className="p-5 text-center" onClick={e => e.stopPropagation()}>
                                        <div className="flex justify-center gap-2">
                                            <button onClick={() => handleEdit(item)} className="p-2 text-slate-400 hover:text-blue-600 transition-all"><Edit size={16}/></button>
                                            <button onClick={() => {if(window.confirm('Delete?')) transactionsAPI.despatch.delete(item.id).then(fetchRecords);}} className="p-2 text-slate-400 hover:text-red-500 transition-all"><Trash2 size={16}/></button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr><td colSpan="6" className="p-20 text-center text-slate-300 font-black uppercase italic opacity-20">Data Not Found</td></tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* MODAL */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
                    <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-6xl my-8 overflow-hidden animate-in zoom-in duration-200">
                        <div className="bg-blue-600 p-8 flex justify-between items-center text-white">
                            <div className="flex items-center gap-4">
                                <Navigation size={28}/>
                                <div>
                                    <h2 className="text-2xl font-black uppercase tracking-tight">{formData.id ? 'Modify Load' : 'New Load Registry'}</h2>
                                    <p className="text-blue-100 text-[10px] font-black uppercase tracking-widest opacity-80">Ref: #{formData.load_no}</p>
                                </div>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="hover:bg-white/10 p-2 rounded-full transition-colors"><X size={24}/></button>
                        </div>

                        <form onSubmit={handleSave} className="p-10 bg-slate-50/50">
                            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                                {/* LEFT SECTION */}
                                <div className="lg:col-span-8 space-y-8">
                                    <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-6">
                                        <div className="flex items-center gap-2 text-blue-600 border-b pb-4">
                                            <Truck size={18} /> <span className="text-[11px] font-black uppercase tracking-widest text-slate-400">Logistics & Route</span>
                                        </div>
                                        <div className="grid grid-cols-2 gap-6">
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-black text-slate-400 uppercase">Load Number</label>
                                                <input readOnly value={formData.load_no} className="w-full border-2 border-slate-50 p-3 rounded-xl font-mono text-sm font-black text-blue-600 bg-slate-50" />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-black text-slate-400 uppercase">Load Date</label>
                                                <input type="date" value={formData.load_date} onChange={e => setFormData({...formData, load_date: e.target.value})} className="w-full border-2 border-slate-100 p-3 rounded-xl text-sm font-bold outline-none" />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-black text-slate-400 uppercase">Vehicle Number *</label>
                                                <input required value={formData.vehicle_no} onChange={e => setFormData({...formData, vehicle_no: e.target.value.toUpperCase()})} placeholder="TN-37-BY-1234" className="w-full border-2 border-slate-100 p-3 rounded-xl font-black text-blue-600 text-sm focus:border-blue-500 outline-none transition-all" />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-black text-slate-400 uppercase">Delivery</label>
                                                <input value={formData.delivery} onChange={e => setFormData({...formData, delivery: e.target.value.toUpperCase()})} placeholder="LOCATION / HUB" className="w-full border-2 border-slate-100 p-3 rounded-xl text-sm font-bold outline-none" />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-6">
                                        <div className="flex items-center gap-2 text-emerald-600 border-b pb-4">
                                            <Hash size={18} /> <span className="text-[11px] font-black uppercase tracking-widest text-slate-400">Manifest Tracking</span>
                                        </div>
                                        <div className="grid grid-cols-2 gap-6">
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-black text-slate-400 uppercase">Transport Agency</label>
                                                <select value={formData.transport_id} onChange={e => setFormData({...formData, transport_id: e.target.value})} className="w-full border-2 border-slate-100 p-3 rounded-xl text-sm font-bold outline-none">
                                                    <option value="">-- Direct Delivery --</option>
                                                    {transports.map(t => <option key={t.id} value={t.id}>{t.transport_name}</option>)}
                                                </select>
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-black text-slate-400 uppercase">LR Number</label>
                                                <input value={formData.lr_no} onChange={e => setFormData({...formData, lr_no: e.target.value.toUpperCase()})} className="w-full border-2 border-slate-100 p-3 rounded-xl text-sm font-bold outline-none" />
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-1">
                                                    <label className="text-[10px] font-black text-slate-400 uppercase">In Time</label>
                                                    <input type="time" value={formData.in_time} onChange={e => setFormData({...formData, in_time: e.target.value})} className="w-full border-2 border-slate-100 p-3 rounded-xl text-sm font-bold outline-none" />
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-[10px] font-black text-slate-400 uppercase">Out Time</label>
                                                    <input type="time" value={formData.out_time} onChange={e => setFormData({...formData, out_time: e.target.value})} className="w-full border-2 border-slate-100 p-3 rounded-xl text-sm font-bold outline-none" />
                                                </div>
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-black text-slate-400 uppercase">Insurance Ref.</label>
                                                <input value={formData.insurance_no} onChange={e => setFormData({...formData, insurance_no: e.target.value.toUpperCase()})} className="w-full border-2 border-slate-100 p-3 rounded-xl text-sm font-bold outline-none" />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* RIGHT SIDEBAR */}
                                <div className="lg:col-span-4 bg-slate-900 rounded-[3rem] p-8 text-white flex flex-col gap-8 shadow-2xl h-fit border border-white/5">
                                    <div className="text-center">
                                        <DollarSign size={40} className="text-blue-400 mx-auto mb-3" />
                                        <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Freight Summary</h3>
                                    </div>
                                    <div className="space-y-5">
                                        <div className="bg-white/5 p-5 rounded-3xl border border-white/10">
                                            <label className="text-[10px] font-black text-slate-500 uppercase block mb-2">Quantity (Bags)</label>
                                            <input type="number" value={formData.no_of_bags} onChange={e => setFormData({...formData, no_of_bags: e.target.value})} className="w-full bg-transparent font-black text-white outline-none text-2xl" />
                                        </div>
                                        <div className="bg-emerald-500/10 p-5 rounded-3xl border border-emerald-500/20">
                                            <label className="text-[10px] font-black text-emerald-400 uppercase block mb-2">Total Freight (₹)</label>
                                            <input type="number" value={formData.freight} onChange={e => setFormData({...formData, freight: e.target.value})} className="w-full bg-transparent font-black text-emerald-400 outline-none text-3xl" />
                                        </div>
                                        <div className="bg-blue-600/10 p-6 rounded-3xl border border-blue-500/30 text-center">
                                            <label className="text-[10px] font-black text-blue-400 uppercase block mb-1">Freight Per Bag (Auto)</label>
                                            <p className="text-4xl font-black font-mono tracking-tighter text-blue-100">₹ {calculatedFreightPerBag}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-12 pt-8 border-t border-slate-200 flex justify-end gap-4">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-8 py-3 font-black text-[10px] uppercase text-slate-400 hover:text-slate-700 tracking-widest">Discard</button>
                                <button type="submit" disabled={submitLoading} className="bg-blue-600 hover:bg-blue-700 text-white px-12 py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-2xl active:scale-95 transition-all flex items-center gap-2">
                                    {submitLoading ? <Loader2 className="animate-spin" size={18} /> : <Save size={18}/>} Commit Manifest
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DespatchEntry;