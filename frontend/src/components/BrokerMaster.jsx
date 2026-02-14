import React, { useState, useEffect, useMemo } from 'react';
import { mastersAPI } from '../service/api';
import { 
    Plus, Search, Edit, Trash2, X, ChevronLeft, 
    ChevronRight, Loader2, CheckSquare, Square, 
    Percent, CircleDollarSign, Info, RefreshCw, Briefcase
} from 'lucide-react';

const BrokerMaster = () => {
    // --- State Management ---
    const [list, setList] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [submitLoading, setSubmitLoading] = useState(false);
    
    // Selection State
    const [selectedIds, setSelectedIds] = useState([]);
    
    // Search/Filter State
    const [searchField, setSearchField] = useState('broker_name');
    const [searchCondition, setSearchCondition] = useState('Like');
    const [searchValue, setSearchValue] = useState('');
    const [activeFilter, setActiveFilter] = useState({ field: 'broker_name', condition: 'Like', value: '' });

    // Pagination & Sorting State
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(10);
    const [sortConfig, setSortConfig] = useState({ key: 'broker_name', direction: 'asc' });

    // Form Data - Aligned with Sequelize Model
    const [formData, setFormData] = useState(initialState());

    function initialState() {
        return {
            id: null,
            broker_code: '',
            broker_name: '',
            commission_pct: 0,
            is_comm_per_kg: false 
        };
    }

    useEffect(() => { fetchRecords(); }, []);

    const fetchRecords = async () => {
        setLoading(true);
        try {
            const res = await mastersAPI.brokers.getAll();
            setList(res.data.data || res.data || []);
        } catch (err) { console.error(err); } 
        finally { setLoading(false); }
    };

    // --- Bulk Selection Logic ---
    const toggleSelectAll = () => {
        if (selectedIds.length === currentItems.length) setSelectedIds([]);
        else setSelectedIds(currentItems.map(item => item.id));
    };

    const toggleSelectOne = (id) => {
        setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
    };

    const handleBulkDelete = async () => {
        if (window.confirm(`Delete ${selectedIds.length} records?`)) {
            setLoading(true);
            try {
                await Promise.all(selectedIds.map(id => mastersAPI.brokers.delete(id)));
                setSelectedIds([]);
                fetchRecords();
            } catch (err) { alert("Bulk delete failed."); } 
            finally { setLoading(false); }
        }
    };

    // --- CRUD Actions ---
    const handleAddNew = () => {
        setFormData(initialState());
        setIsModalOpen(true);
    };

    const handleEdit = (item) => {
        setFormData({ ...item });
        setIsModalOpen(true);
    };

    const handleDeleteOne = async (id) => {
        if (window.confirm("Are you sure you want to delete this broker?")) {
            try {
                await mastersAPI.brokers.delete(id);
                fetchRecords();
                setIsModalOpen(false);
            } catch (err) { alert("Delete failed."); }
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setSubmitLoading(true);
        try {
            formData.id 
                ? await mastersAPI.brokers.update(formData.id, formData) 
                : await mastersAPI.brokers.create(formData);
            fetchRecords();
            setIsModalOpen(false);
        } catch (err) { alert("Error saving record"); } 
        finally { setSubmitLoading(false); }
    };

    // --- Search, Sort & Pagination Logic ---
    const filteredData = useMemo(() => {
        return list.filter(item => {
            if (!activeFilter.value) return true;
            const val = String(item[activeFilter.field] || '').toLowerCase();
            const search = activeFilter.value.toLowerCase();
            return activeFilter.condition === 'Like' ? val.includes(search) : val === search;
        });
    }, [list, activeFilter]);

    const sortedData = useMemo(() => {
        let sortableItems = [...filteredData];
        if (sortConfig.key) {
            sortableItems.sort((a, b) => {
                const aVal = String(a[sortConfig.key] || '').toLowerCase();
                const bVal = String(b[sortConfig.key] || '').toLowerCase();
                if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
                if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }
        return sortableItems;
    }, [filteredData, sortConfig]);

    const indexOfLastItem = currentPage * itemsPerPage;
    const currentItems = sortedData.slice(indexOfLastItem - itemsPerPage, indexOfLastItem);
    const totalPages = Math.ceil(sortedData.length / itemsPerPage);

    return (
        <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans text-slate-900">
            {/* 1. HEADER */}
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <Briefcase className="text-blue-600" /> Broker Master
                    </h1>
                    <p className="text-sm text-slate-500 font-medium tracking-tight">Manage broker commissions and identification</p>
                </div>
                <div className="flex gap-3">
                    {selectedIds.length > 0 && (
                        <button onClick={handleBulkDelete} className="flex items-center gap-2 bg-red-50 text-red-600 border border-red-200 px-5 py-2.5 rounded-lg font-bold hover:bg-red-100 transition-all shadow-sm">
                            <Trash2 size={18} /> Delete Selected ({selectedIds.length})
                        </button>
                    )}
                    <button onClick={handleAddNew} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg font-bold shadow-md active:scale-95 transition-all">
                        <Plus size={20} /> New Broker
                    </button>
                </div>
            </div>

            {/* 2. SEARCH BAR */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm mb-6 grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Field</label>
                    <select value={searchField} onChange={(e) => setSearchField(e.target.value)} className="w-full border border-slate-200 p-2 rounded-lg text-sm bg-slate-50 outline-none">
                        <option value="broker_name">Broker Name</option>
                        <option value="broker_code">Broker Code</option>
                    </select>
                </div>
                <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Search Value</label>
                    <input 
                        type="text" 
                        value={searchValue} 
                        onChange={(e) => setSearchValue(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && setActiveFilter({ field: searchField, condition: searchCondition, value: searchValue })}
                        placeholder="Type to search..." 
                        className="w-full border border-slate-200 p-2 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>
                <div className="flex gap-2 md:col-span-2">
                    <button onClick={() => setActiveFilter({ field: searchField, condition: searchCondition, value: searchValue })} className="flex-1 bg-slate-800 text-white py-2 rounded-lg text-sm font-bold hover:bg-slate-900 transition-colors">Apply Filter</button>
                    <button onClick={() => { setSearchValue(''); setActiveFilter({ field: 'broker_name', condition: 'Like', value: '' }); fetchRecords(); }} className="flex-1 border border-slate-200 py-2 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors">Reset</button>
                </div>
            </div>

            {/* 3. BLUE HEADER DATA TABLE */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-blue-600 text-white">
                                <th className="p-4 w-12 text-center">
                                    <button onClick={toggleSelectAll}>
                                        {selectedIds.length === currentItems.length && currentItems.length > 0 ? <CheckSquare size={18}/> : <Square size={18}/>}
                                    </button>
                                </th>
                                <th className="p-4 text-xs font-bold uppercase tracking-wider">Code</th>
                                <th className="p-4 text-xs font-bold uppercase tracking-wider">Broker Name</th>
                                <th className="p-4 text-xs font-bold uppercase tracking-wider">Rate</th>
                                <th className="p-4 text-xs font-bold uppercase tracking-wider">Type</th>
                                <th className="p-4 text-xs font-bold uppercase tracking-wider text-center w-48">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr><td colSpan="6" className="p-12 text-center text-slate-400 font-medium">Loading...</td></tr>
                            ) : currentItems.map((item) => (
                                <tr key={item.id} onClick={() => handleEdit(item)} className={`hover:bg-blue-50/30 transition-colors cursor-pointer group ${selectedIds.includes(item.id) ? 'bg-blue-50/50' : ''}`}>
                                    <td className="p-4 text-center" onClick={(e) => e.stopPropagation()}>
                                        <button onClick={() => toggleSelectOne(item.id)} className="text-slate-300 hover:text-blue-500">
                                            {selectedIds.includes(item.id) ? <CheckSquare size={18} className="text-blue-600"/> : <Square size={18}/>}
                                        </button>
                                    </td>
                                    <td className="p-4 text-sm font-bold text-slate-700 font-mono">{item.broker_code}</td>
                                    <td className="p-4 text-sm font-medium text-slate-600 uppercase">{item.broker_name}</td>
                                    <td className="p-4 text-sm font-bold text-emerald-600">{item.commission_pct}</td>
                                    <td className="p-4 text-sm text-slate-500 italic">{item.is_comm_per_kg ? 'Per KG' : 'Percentage %'}</td>
                                    <td className="p-4 text-center" onClick={(e) => e.stopPropagation()}>
                                        <div className="flex justify-center gap-2">
                                            <button onClick={() => handleEdit(item)} className="flex items-center gap-1 bg-blue-50 text-blue-600 px-3 py-1.5 rounded-md text-xs font-bold hover:bg-blue-600 hover:text-white transition-all"><Edit size={14}/> UPDATE</button>
                                            <button onClick={() => handleDeleteOne(item.id)} className="flex items-center gap-1 bg-red-50 text-red-600 px-3 py-1.5 rounded-md text-xs font-bold hover:bg-red-600 hover:text-white transition-all"><Trash2 size={14}/> DELETE</button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <div className="p-4 border-t border-slate-100 flex items-center justify-between bg-slate-50">
                    <span className="text-xs text-slate-500 font-bold uppercase">Page {currentPage} of {totalPages || 1}</span>
                    <div className="flex gap-2">
                        <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} className="p-2 border rounded bg-white disabled:opacity-40"><ChevronLeft size={18}/></button>
                        <button disabled={currentPage >= totalPages} onClick={() => setCurrentPage(p => p + 1)} className="p-2 border rounded bg-white disabled:opacity-40"><ChevronRight size={18}/></button>
                    </div>
                </div>
            </div>

            {/* 4. MODAL FORM */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in duration-200">
                        <div className="bg-blue-600 p-5 flex justify-between items-center text-white">
                            <div>
                                <h2 className="font-bold text-xl">{formData.id ? 'Edit Broker' : 'New Broker Registration'}</h2>
                                <p className="text-[10px] text-blue-100 uppercase tracking-widest font-bold">Profile Management</p>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="hover:bg-blue-500 p-2 rounded-full transition-colors"><X size={20}/></button>
                        </div>
                        
                        <form onSubmit={handleSave} className="p-6 space-y-4">
                            <div className="space-y-4">
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-slate-500 uppercase ml-1">Broker Name *</label>
                                    <input required value={formData.broker_name} onChange={e => setFormData({...formData, broker_name: e.target.value.toUpperCase()})} placeholder="e.g. TEXTILE AGENTS" className="w-full border border-slate-200 p-3 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none uppercase font-bold" />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-slate-500 uppercase ml-1">Broker Code</label>
                                        <input value={formData.broker_code} onChange={e => setFormData({...formData, broker_code: e.target.value})} placeholder="BRK001" className="w-full border border-slate-200 p-3 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-mono" />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-slate-500 uppercase ml-1">Commission Rate</label>
                                        <div className="relative">
                                            <div className="absolute left-3 top-3.5 text-slate-300">
                                                {formData.is_comm_per_kg ? <CircleDollarSign size={18}/> : <Percent size={18}/>}
                                            </div>
                                            <input type="number" step="0.01" value={formData.commission_pct} onChange={e => setFormData({...formData, commission_pct: e.target.value})} className="w-full pl-10 border border-slate-200 p-3 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none font-bold text-emerald-600" />
                                        </div>
                                    </div>
                                </div>

                                {/* Calculation Toggle */}
                                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded-lg ${formData.is_comm_per_kg ? 'bg-amber-100 text-amber-600' : 'bg-blue-100 text-blue-600'}`}>
                                            <Info size={18} />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase">Calculation Mode</p>
                                            <p className="text-xs font-bold text-slate-700 uppercase tracking-tighter">
                                                {formData.is_comm_per_kg ? 'Flat Rate per KG' : 'Percentage of Invoice'}
                                            </p>
                                        </div>
                                    </div>
                                    <div 
                                        className="relative inline-flex h-6 w-11 items-center rounded-full cursor-pointer transition-colors"
                                        style={{ backgroundColor: formData.is_comm_per_kg ? '#10b981' : '#cbd5e1' }}
                                        onClick={() => setFormData({...formData, is_comm_per_kg: !formData.is_comm_per_kg})}
                                    >
                                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${formData.is_comm_per_kg ? 'translate-x-6' : 'translate-x-1'}`} />
                                    </div>
                                </div>
                            </div>

                            <div className="pt-6 flex justify-between gap-3 border-t">
                                {formData.id && (
                                    <button type="button" onClick={() => handleDeleteOne(formData.id)} className="flex items-center gap-2 text-red-600 hover:bg-red-50 px-4 py-2 rounded-xl font-bold transition-all">
                                        <Trash2 size={18}/> DELETE
                                    </button>
                                )}
                                <div className="flex gap-2 ml-auto">
                                    <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-2.5 rounded-xl text-slate-500 font-bold hover:bg-slate-100 transition-all uppercase text-xs">Close</button>
                                    <button type="submit" disabled={submitLoading} className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-2.5 rounded-xl font-black shadow-lg shadow-blue-200 flex items-center gap-2 transition-all active:scale-95 uppercase text-xs">
                                        {submitLoading ? <Loader2 size={18} className="animate-spin" /> : 'Save Broker'}
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default BrokerMaster;