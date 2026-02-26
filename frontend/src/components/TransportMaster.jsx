import React, { useState, useEffect, useMemo } from 'react';
import { mastersAPI } from '../service/api';
import { 
    Plus, Edit, Trash2, X, ChevronLeft, 
    ChevronRight, Loader2, RefreshCw, 
    Save, CheckCircle2, Truck, Search, Filter,
    MapPin, Building2, Info
} from 'lucide-react';

const TransportMaster = () => {
    // --- State Management ---
    const [list, setList] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [submitLoading, setSubmitLoading] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const [successMessage, setSuccessMessage] = useState("");
    
    // Search & Pagination
    const [searchField, setSearchField] = useState('transport_name');
    const [searchValue, setSearchValue] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    const initialState = () => ({
        id: null,
        transport_code: '',
        transport_name: '',
        place: '',
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
            const res = await mastersAPI.transports.getAll();
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
            const num = parseInt(item.transport_code, 10);
            return !isNaN(num) ? Math.max(max, num) : max;
        }, 0);
        setFormData({ ...initialState(), transport_code: (maxCode + 1).toString() });
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
            if (isUpdate) await mastersAPI.transports.update(formData.id, formData);
            else await mastersAPI.transports.create(formData);
            fetchRecords();
            setIsModalOpen(false);
            triggerSuccess(isUpdate ? "Transport Updated!" : "Transport Created!");
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
                        <Truck className="text-blue-600" /> Transport Master
                    </h1>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-loose">Logistics Partners & Agency Registry</p>
                </div>
                <div className="flex gap-2">
                    <button onClick={handleAddNew} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-blue-200 active:scale-95 transition-all">
                        <Plus size={16} /> New Transport
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
                <select value={searchField} onChange={(e) => setSearchField(e.target.value)} className="bg-slate-50 px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-500 border-none outline-none cursor-pointer">
                    <option value="transport_name">Transport Name</option>
                    <option value="place">Place</option>
                </select>
            </div>

            {/* DATA TABLE - MATCHES IMAGE HEADERS */}
            <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-slate-900 text-slate-200">
                        <tr>
                            <th className="p-5 text-[11px] font-black uppercase tracking-widest border-r border-slate-800">Transport Name</th>
                            <th className="p-5 text-[11px] font-black uppercase tracking-widest border-r border-slate-800">Place</th>
                            <th className="p-5 text-[11px] font-black uppercase tracking-widest border-r border-slate-800">Address</th>
                            <th className="p-5 text-[11px] font-black uppercase tracking-widest text-center">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {loading ? (
                            <tr><td colSpan="4" className="p-20 text-center"><Loader2 className="animate-spin mx-auto text-blue-600" size={40} /></td></tr>
                        ) : currentItems.length > 0 ? (
                            currentItems.map((item) => (
                                <tr key={item.id} onClick={() => handleEdit(item)} className="hover:bg-blue-50/50 cursor-pointer transition-colors group">
                                    <td className="p-5 text-sm font-black text-slate-800 uppercase tracking-tight leading-none">{item.transport_name}</td>
                                    <td className="p-5 text-sm font-bold text-blue-600 uppercase italic">
                                        <div className="flex items-center gap-2">
                                            <MapPin size={14} className="text-slate-300" />
                                            {item.place || 'LOCAL'}
                                        </div>
                                    </td>
                                    <td className="p-5 text-xs text-slate-500 font-bold uppercase truncate max-w-[400px]">{item.address || '---'}</td>
                                    <td className="p-5 text-center" onClick={e => e.stopPropagation()}>
                                        <div className="flex justify-center gap-2">
                                            <button onClick={() => handleEdit(item)} className="p-2 text-slate-400 hover:text-blue-600 transition-all"><Edit size={16}/></button>
                                            <button onClick={() => {if(window.confirm('Delete?')) mastersAPI.transports.delete(item.id).then(fetchRecords);}} className="p-2 text-slate-400 hover:text-red-500 transition-all"><Trash2 size={16}/></button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr><td colSpan="4" className="p-20 text-center text-slate-300 font-black uppercase text-xl italic opacity-20 tracking-widest">No Transports Found</td></tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* PAGINATION */}
            <div className="p-4 flex items-center justify-between mt-4">
                <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Showing {currentItems.length} of {filteredData.length} records</span>
                <div className="flex items-center gap-1">
                    <button disabled={currentPage === 1} onClick={() => setCurrentPage(prev => prev - 1)} className="p-2 border rounded-lg bg-white disabled:opacity-30 hover:bg-blue-50 transition-all"><ChevronLeft size={16}/></button>
                    <div className="px-4 py-2 bg-white border rounded-lg text-[11px] font-black">{currentPage} / {Math.ceil(filteredData.length / itemsPerPage) || 1}</div>
                    <button disabled={currentPage === Math.ceil(filteredData.length / itemsPerPage)} onClick={() => setCurrentPage(prev => prev + 1)} className="p-2 border rounded-lg bg-white disabled:opacity-30 hover:bg-blue-50 transition-all"><ChevronRight size={16}/></button>
                </div>
            </div>

            {/* MODAL */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
                    <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-4xl my-8 animate-in zoom-in duration-200 overflow-hidden border border-white/20">
                        <div className="bg-blue-600 p-8 flex justify-between items-center text-white">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-white/20 rounded-2xl"><Truck size={28}/></div>
                                <div>
                                    <h2 className="text-2xl font-black uppercase tracking-tight">{formData.id ? 'Modify Transport' : 'New Agency Entry'}</h2>
                                    <p className="text-blue-100 text-[10px] font-black uppercase tracking-widest opacity-80">Ref Code: #{formData.transport_code}</p>
                                </div>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="hover:bg-white/10 p-2 rounded-full transition-colors"><X size={24}/></button>
                        </div>

                        <form onSubmit={handleSave} className="p-10 bg-slate-50/50">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                {/* PROFILE INFO */}
                                <div className="space-y-6">
                                    <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-6">
                                        <div className="flex items-center gap-2 text-blue-600 border-b border-slate-50 pb-4 mb-4">
                                            <Info size={18} /> <span className="text-[11px] font-black uppercase tracking-widest text-slate-400">Basic Identity</span>
                                        </div>
                                        <div className="space-y-4">
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Transport Name *</label>
                                                <input required value={formData.transport_name} onChange={e => setFormData({...formData, transport_name: e.target.value.toUpperCase()})} className="w-full border-2 border-slate-50 p-4 rounded-2xl font-black text-slate-700 uppercase focus:border-blue-500 outline-none transition-all text-sm shadow-inner" placeholder="AGENCY NAME..." />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Place / City</label>
                                                <div className="relative">
                                                    <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                                                    <input value={formData.place} onChange={e => setFormData({...formData, place: e.target.value.toUpperCase()})} className="w-full border-2 border-slate-50 pl-12 p-3 rounded-xl font-bold text-blue-600 uppercase text-xs outline-none" placeholder="e.g. MUMBAI" />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* ADDRESS INFO */}
                                <div className="space-y-6">
                                    <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-6">
                                        <div className="flex items-center gap-2 text-blue-600 border-b border-slate-50 pb-4 mb-4">
                                            <Building2 size={18} /> <span className="text-[11px] font-black uppercase tracking-widest text-slate-400">Contact Details</span>
                                        </div>
                                        <div className="space-y-4">
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Full Office Address</label>
                                                <textarea rows="5" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value.toUpperCase()})} className="w-full border-2 border-slate-50 p-4 rounded-2xl text-xs font-bold uppercase outline-none focus:border-blue-500 shadow-inner resize-none" placeholder="ENTER COMPLETE OFFICE ADDRESS..." />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-12 pt-8 border-t border-slate-200 flex justify-end gap-4">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-8 py-3 font-black text-[10px] uppercase text-slate-400 hover:text-slate-700 tracking-widest">Discard</button>
                                <button type="submit" disabled={submitLoading} className="bg-blue-600 hover:bg-blue-700 text-white px-12 py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-2xl active:scale-95 transition-all flex items-center gap-2">
                                    <Save size={18}/> {submitLoading ? 'SAVING...' : 'SAVE TRANSPORT'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TransportMaster;