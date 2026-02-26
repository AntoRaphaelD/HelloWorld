import React, { useState, useEffect, useMemo } from 'react';
import { mastersAPI } from '../service/api';
import { 
    Plus, Edit, Trash2, X, ChevronLeft, 
    ChevronRight, Loader2, RefreshCw, 
    Save, CheckCircle2, Briefcase, Search, Filter,
    CircleDollarSign, Info, MapPin
} from 'lucide-react';

const BrokerMaster = () => {
    // --- State Management ---
    const [list, setList] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [submitLoading, setSubmitLoading] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const [successMessage, setSuccessMessage] = useState("");
    
    // Search & Pagination
    const [searchField, setSearchField] = useState('broker_name');
    const [searchValue, setSearchValue] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    const initialState = () => ({
        id: null,
        broker_code: '',
        broker_name: '',
        commission_pct: 0,
        address: ''
    });

    const [formData, setFormData] = useState(initialState());

    // --- API Integration ---
    useEffect(() => {
        fetchRecords();
    }, []);

    const fetchRecords = async () => {
        setLoading(true);
        try {
            const res = await mastersAPI.brokers.getAll();
            const data = res?.data?.data || res?.data || [];
            setList(Array.isArray(data) ? data : []);
        } catch (err) { 
            setList([]);
        } finally { 
            setLoading(false); 
        }
    };

    const triggerSuccess = (msg) => {
        setSuccessMessage(msg);
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 2000);
    };

    // --- Actions ---
    const handleAddNew = () => {
        const maxCode = list.reduce((max, item) => {
            const num = parseInt(item.broker_code, 10);
            return !isNaN(num) ? Math.max(max, num) : max;
        }, 0);
        setFormData({ ...initialState(), broker_code: (maxCode + 1).toString() });
        setIsModalOpen(true);
    };

    const handleEdit = (item) => {
        setFormData({ ...item });
        setIsModalOpen(true);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setSubmitLoading(true);
        try {
            const isUpdate = !!formData.id;
            if (isUpdate) await mastersAPI.brokers.update(formData.id, formData);
            else await mastersAPI.brokers.create(formData);
            fetchRecords();
            setIsModalOpen(false);
            triggerSuccess(isUpdate ? "Record Updated!" : "Record Created!");
        } catch (err) { 
            alert("Error saving record."); 
        } finally { 
            setSubmitLoading(false); 
        }
    };

    const filteredData = useMemo(() => {
        return list.filter(item => 
            String(item[searchField] || '').toLowerCase().includes(searchValue.toLowerCase())
        );
    }, [list, searchValue, searchField]);

    const currentItems = filteredData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    return (
        <div className="min-h-screen bg-slate-50 p-6 font-sans text-slate-900">
            {/* SUCCESS OVERLAY */}
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
                    <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <Briefcase className="text-blue-600" /> Broker Master
                    </h1>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-loose">Agent Commission & Contact Registry</p>
                </div>
                <div className="flex gap-2">
                    <button onClick={handleAddNew} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-xl active:scale-95 transition-all">
                        <Plus size={16} /> New Broker
                    </button>
                    <button onClick={fetchRecords} className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-blue-600">
                        <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
                    </button>
                </div>
            </div>

            {/* SEARCH */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm mb-6 flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input 
                        type="text" 
                        placeholder={`Search by ${searchField.replace('_', ' ')}...`} 
                        value={searchValue} 
                        onChange={(e) => setSearchValue(e.target.value)} 
                        className="w-full pl-12 pr-4 py-3 bg-slate-50 border-none rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500/20" 
                    />
                </div>
                <select value={searchField} onChange={(e) => setSearchField(e.target.value)} className="bg-slate-50 px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-500 border-none outline-none">
                    <option value="broker_name">Broker Name</option>
                    <option value="broker_code">Broker Code</option>
                </select>
            </div>

            {/* DATA TABLE - MATCHES IMAGE HEADERS */}
            <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-slate-900 text-slate-200">
                        <tr>
                            <th className="p-5 text-[11px] font-black uppercase tracking-widest border-r border-slate-800">Broker Code</th>
                            <th className="p-5 text-[11px] font-black uppercase tracking-widest border-r border-slate-800">Broker Name</th>
                            <th className="p-5 text-[11px] font-black uppercase tracking-widest border-r border-slate-800">Commission %</th>
                            <th className="p-5 text-[11px] font-black uppercase tracking-widest border-r border-slate-800">Address</th>
                            <th className="p-5 text-[11px] font-black uppercase tracking-widest text-center">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {loading ? (
                            <tr><td colSpan="5" className="p-20 text-center"><Loader2 className="animate-spin mx-auto text-blue-600" size={40} /></td></tr>
                        ) : currentItems.length > 0 ? (
                            currentItems.map((item) => (
                                <tr key={item.id} onClick={() => handleEdit(item)} className="hover:bg-blue-50/50 cursor-pointer transition-colors group">
                                    <td className="p-5 text-sm font-mono font-black text-blue-600 bg-slate-50/50">{item.broker_code}</td>
                                    <td className="p-5 text-sm font-black text-slate-800 uppercase tracking-tight leading-none">{item.broker_name}</td>
                                    <td className="p-5 text-sm font-black text-emerald-600">{item.commission_pct}%</td>
                                    <td className="p-5 text-xs text-slate-500 font-bold uppercase truncate max-w-[300px]">{item.address || '---'}</td>
                                    <td className="p-5 text-center" onClick={e => e.stopPropagation()}>
                                        <div className="flex justify-center gap-2">
                                            <button onClick={() => handleEdit(item)} className="p-2 text-slate-400 hover:text-blue-600 transition-all"><Edit size={16}/></button>
                                            <button onClick={() => {if(window.confirm('Delete?')) mastersAPI.brokers.delete(item.id).then(fetchRecords);}} className="p-2 text-slate-400 hover:text-red-500 transition-all"><Trash2 size={16}/></button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr><td colSpan="5" className="p-20 text-center text-slate-300 font-black uppercase text-xl italic opacity-20 tracking-widest">No Match Found</td></tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* PAGINATION */}
            <div className="p-4 flex items-center justify-between mt-4">
                <span className="text-[10px] text-slate-400 font-black uppercase">Found {filteredData.length} records</span>
                <div className="flex items-center gap-1">
                    <button disabled={currentPage === 1} onClick={() => setCurrentPage(prev => prev - 1)} className="p-2 border rounded-lg bg-white disabled:opacity-30"><ChevronLeft size={16}/></button>
                    <div className="px-4 py-2 bg-white border rounded-lg text-[11px] font-black">{currentPage} / {Math.ceil(filteredData.length / itemsPerPage)}</div>
                    <button disabled={currentPage === Math.ceil(filteredData.length / itemsPerPage)} onClick={() => setCurrentPage(prev => prev + 1)} className="p-2 border rounded-lg bg-white disabled:opacity-30"><ChevronRight size={16}/></button>
                </div>
            </div>

            {/* MODAL */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
                    <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-4xl my-8 animate-in zoom-in duration-200 overflow-hidden border border-white/20">
                        <div className="bg-blue-600 p-8 flex justify-between items-center text-white">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-white/20 rounded-2xl"><Briefcase size={28}/></div>
                                <div>
                                    <h2 className="text-2xl font-black uppercase tracking-tight">{formData.id ? 'Modify Broker' : 'New Broker Entry'}</h2>
                                    <p className="text-blue-100 text-[10px] font-black uppercase tracking-widest opacity-80">Registry ID: #{formData.broker_code}</p>
                                </div>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="hover:bg-white/10 p-2 rounded-full transition-colors"><X size={24}/></button>
                        </div>

                        <form onSubmit={handleSave} className="p-10 bg-slate-50/50">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                                {/* PROFILE */}
                                <div className="md:col-span-2 space-y-6">
                                    <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-6">
                                        <div className="flex items-center gap-2 text-blue-600 border-b border-slate-50 pb-4 mb-4">
                                            <Info size={18} /> <span className="text-[11px] font-black uppercase tracking-widest text-slate-400">Personal Info</span>
                                        </div>
                                        <div className="grid grid-cols-1 gap-4">
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Broker Code (Read Only)</label>
                                                <input readOnly value={formData.broker_code} className="w-full border-2 border-slate-50 p-3 rounded-xl font-mono text-sm font-black text-blue-600 bg-slate-50" />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Full Broker Name *</label>
                                                <input required value={formData.broker_name} onChange={e => setFormData({...formData, broker_name: e.target.value.toUpperCase()})} className="w-full border-2 border-slate-50 p-3 rounded-xl font-black text-slate-700 uppercase focus:border-blue-500 outline-none text-xs" placeholder="ENTER NAME..." />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Registered Address</label>
                                                <textarea rows="4" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value.toUpperCase()})} className="w-full border-2 border-slate-50 p-4 rounded-2xl text-xs font-bold uppercase outline-none focus:border-blue-500 shadow-inner resize-none" placeholder="FULL OFFICE ADDRESS..." />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* CONFIG */}
                                <div className="bg-slate-900 rounded-[3rem] p-8 text-white flex flex-col gap-8 shadow-2xl h-fit">
                                    <div className="text-center">
                                        <CircleDollarSign size={40} className="text-blue-400 mx-auto mb-3" />
                                        <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Financial Config</h3>
                                    </div>
                                    
                                    <div className="space-y-5">
                                        <div className="bg-blue-600/10 p-5 rounded-3xl border border-blue-500/20">
                                            <label className="text-[10px] font-black text-blue-400 uppercase block mb-2 opacity-70">Commission (%)</label>
                                            <input type="number" step="0.01" value={formData.commission_pct} onChange={e => setFormData({...formData, commission_pct: e.target.value})} className="w-full bg-transparent font-black text-white outline-none text-3xl text-center" />
                                        </div>
                                        
                                        <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                                            <p className="text-[9px] text-slate-400 leading-relaxed uppercase font-bold text-center italic">Calculated as a percentage of the total net sale value.</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-12 pt-8 border-t border-slate-200 flex justify-end gap-4">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-8 py-3 font-black text-[10px] uppercase text-slate-400 hover:text-slate-700 tracking-widest">Discard</button>
                                <button type="submit" disabled={submitLoading} className="bg-blue-600 hover:bg-blue-700 text-white px-12 py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-2xl active:scale-95 transition-all flex items-center gap-2">
                                    <Save size={18}/> {submitLoading ? 'SAVING...' : 'SAVE CHANGES'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default BrokerMaster;