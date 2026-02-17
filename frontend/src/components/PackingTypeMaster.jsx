import React, { useState, useEffect, useMemo } from 'react';
import { mastersAPI } from '../service/api';
import { 
    Plus, Edit, Trash2, X, ChevronLeft, 
    ChevronRight, Loader2, CheckSquare, Square, RefreshCw, 
    Save, CheckCircle2, Package
} from 'lucide-react';

const PackingTypeMaster = () => {
    const [list, setList] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [submitLoading, setSubmitLoading] = useState(false);
    const [isSelectionMode, setIsSelectionMode] = useState(false);
    const [selectedIds, setSelectedIds] = useState([]);
    const [showSuccess, setShowSuccess] = useState(false);
    const [successMessage, setSuccessMessage] = useState("");
    const [searchValue, setSearchValue] = useState('');
    const [activeFilter, setActiveFilter] = useState({ field: 'packing_type', value: '' });
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(10);

    const initialState = () => ({
        id: null,
        packing_type: ''
    });

    const [formData, setFormData] = useState(initialState());

    useEffect(() => { fetchRecords(); }, []);

    const fetchRecords = async () => {
        setLoading(true);
        try {
            const res = await mastersAPI.packingTypes.getAll();
            const rawData = res?.data?.data || res?.data || [];
            setList(Array.isArray(rawData) ? rawData : []);
        } catch (err) { 
            console.error("Fetch Error:", err);
            setList([]); 
        } finally { setLoading(false); }
    };

    const triggerSuccess = (msg) => {
        setSuccessMessage(msg);
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 2000);
    };

    const handleAddNew = () => {
        // Find highest ID for UI display only
        const maxId = list.reduce((max, item) => (item.id > max ? item.id : max), 0);
        setFormData({ ...initialState(), id: maxId + 1 });
        setIsModalOpen(true);
    };

    const handleEdit = (item) => {
        if (isSelectionMode) {
            setSelectedIds(prev => prev.includes(item.id) ? prev.filter(i => i !== item.id) : [...prev, item.id]);
            return;
        }
        setFormData({ ...item });
        setIsModalOpen(true);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setSubmitLoading(true);
        try {
            if (formData.id && list.some(item => item.id === formData.id)) {
                // UPDATE
                await mastersAPI.packingTypes.update(formData.id, formData);
            } else {
                // CREATE: Remove ID from payload so Database can Auto-Increment
                const { id, ...payload } = formData;
                await mastersAPI.packingTypes.create(payload);
            }
            fetchRecords();
            setIsModalOpen(false);
            triggerSuccess("Record Saved Successfully!");
        } catch (err) { alert("Error saving record."); } 
        finally { setSubmitLoading(false); }
    };

    const handleBulkDelete = async () => {
        if (selectedIds.length === 0) return;
        if (window.confirm(`Delete ${selectedIds.length} records?`)) {
            setLoading(true);
            try {
                await mastersAPI.packingTypes.bulkDelete(selectedIds);
                setSelectedIds([]);
                setIsSelectionMode(false);
                fetchRecords();
                triggerSuccess("Deleted Successfully");
            } catch (err) { alert("Delete failed"); } 
            finally { setLoading(false); }
        }
    };

    const processedData = useMemo(() => {
        const safeList = Array.isArray(list) ? list : [];
        if (!activeFilter.value) return safeList;
        return safeList.filter(item => 
            String(item.packing_type || '').toLowerCase().includes(activeFilter.value.toLowerCase())
        );
    }, [list, activeFilter]);

    const totalPages = Math.ceil(processedData.length / itemsPerPage) || 1;
    const currentItems = processedData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    return (
        <div className="min-h-screen bg-slate-100 p-4 md:p-8 font-sans text-slate-900">
            {showSuccess && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/20 backdrop-blur-sm">
                    <div className="bg-white p-10 rounded-3xl shadow-2xl flex flex-col items-center gap-4">
                        <CheckCircle2 size={80} className="text-emerald-500 animate-bounce" />
                        <h3 className="text-2xl font-black text-slate-800 uppercase">{successMessage}</h3>
                    </div>
                </div>
            )}

            <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
                <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                    <Package className="text-blue-600" size={32} /> Packing Master
                </h1>
                
                <div className="flex gap-3">
                    {!isSelectionMode ? (
                        <button onClick={() => setIsSelectionMode(true)} className="px-6 py-3 border-2 border-slate-200 bg-white rounded-xl font-black text-xs hover:bg-slate-50">SELECT</button>
                    ) : (
                        <div className="flex gap-2">
                             <button onClick={() => {setIsSelectionMode(false); setSelectedIds([]);}} className="px-6 py-3 bg-slate-800 text-white rounded-xl font-black text-xs">CANCEL</button>
                            <button onClick={handleBulkDelete} disabled={selectedIds.length === 0} className={`px-6 py-3 rounded-xl font-black text-xs transition-all ${selectedIds.length > 0 ? 'bg-red-600 text-white' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}>DELETE ({selectedIds.length})</button>
                        </div>
                    )}
                    <button onClick={handleAddNew} className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl font-black shadow-lg flex items-center gap-2 transition-all"><Plus size={20} /> NEW TYPE</button>
                    <button onClick={fetchRecords} className="p-3 border-2 border-slate-200 rounded-xl bg-white text-slate-400 hover:text-blue-600"><RefreshCw size={20} className={loading ? 'animate-spin' : ''} /></button>
                </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm mb-8 flex flex-wrap gap-4 items-end">
                <div className="flex-1 min-w-[300px]">
                    <label className="text-[10px] font-black text-slate-400 uppercase mb-1 block">Filter by Description</label>
                    <input type="text" value={searchValue} onChange={(e) => setSearchValue(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && setActiveFilter({ field: 'packing_type', value: searchValue })} className="w-full border-2 border-slate-50 p-3 rounded-xl text-sm font-semibold outline-none focus:border-blue-500" placeholder="Type and press enter..." />
                </div>
                <button onClick={() => setActiveFilter({ field: 'packing_type', value: searchValue })} className="bg-slate-900 text-white px-10 py-3 rounded-xl text-xs font-black uppercase">Search</button>
            </div>

            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-blue-600 text-white text-[10px] uppercase tracking-widest font-bold">
                            <tr>
                                {isSelectionMode && <th className="p-5 w-16 text-center">Select</th>}
                                <th className="p-5">System ID</th>
                                <th className="p-5">Packing Description</th>
                                {!isSelectionMode && <th className="p-5 text-center">Actions</th>}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {loading ? (
                                <tr><td colSpan="4" className="p-20 text-center"><Loader2 className="animate-spin mx-auto text-blue-500" size={40} /></td></tr>
                            ) : currentItems.length > 0 ? currentItems.map((item) => (
                                <tr key={item.id} onClick={() => handleEdit(item)} className={`transition-all cursor-pointer ${selectedIds.includes(item.id) ? 'bg-blue-50' : 'hover:bg-blue-50/30'}`}>
                                    {isSelectionMode && (
                                        <td className="p-5 text-center" onClick={(e) => {e.stopPropagation(); toggleSelection(item.id);}}>
                                            {selectedIds.includes(item.id) ? <CheckSquare size={20} className="text-blue-600 mx-auto"/> : <Square size={20} className="text-slate-200 mx-auto"/>}
                                        </td>
                                    )}
                                    <td className="p-5 text-sm font-black text-blue-600 font-mono">#{item.id}</td>
                                    <td className="p-5 text-sm font-black text-slate-800 uppercase">{item.packing_type}</td>
                                    {!isSelectionMode && (
                                        <td className="p-5 text-center" onClick={(e) => e.stopPropagation()}>
                                            <div className="flex justify-center gap-2">
                                                <button onClick={() => handleEdit(item)} className="p-2 bg-slate-50 rounded-lg hover:bg-blue-600 hover:text-white transition-all"><Edit size={16}/></button>
                                                <button onClick={() => {if(window.confirm("Delete?")) mastersAPI.packingTypes.delete(item.id).then(() => fetchRecords()); }} className="p-2 bg-slate-50 rounded-lg hover:bg-red-600 hover:text-white transition-all"><Trash2 size={16}/></button>
                                            </div>
                                        </td>
                                    )}
                                </tr>
                            )) : (
                                <tr><td colSpan="4" className="p-20 text-center text-slate-400 font-bold uppercase tracking-widest">No Data Found</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-md p-4">
                    <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-xl overflow-hidden animate-in zoom-in duration-300">
                        <div className="bg-white border-b border-slate-100 p-8 flex justify-between items-center">
                            <h2 className="text-xl font-black text-slate-900 uppercase">{formData.id && list.some(i => i.id === formData.id) ? 'Modify Packing' : 'New Packing Entry'}</h2>
                            <button onClick={() => setIsModalOpen(false)} className="text-slate-300 hover:text-red-500"><X size={32}/></button>
                        </div>
                        <form onSubmit={handleSave} className="p-10 space-y-6">
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase block mb-1 ml-2">Code (Auto-Generated)</label>
                                <input readOnly value={formData.id || ''} className="w-full border-2 border-slate-50 p-4 rounded-2xl text-sm font-black bg-slate-50 text-blue-600 outline-none cursor-not-allowed" />
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase block mb-1 ml-2">Packing Description *</label>
                                <input required value={formData.packing_type} onChange={e => setFormData({...formData, packing_type: e.target.value.toUpperCase()})} className="w-full border-2 border-slate-50 p-4 rounded-2xl text-sm font-black bg-slate-50 outline-none uppercase focus:border-blue-500" placeholder="e.g. CONE, BAG, HANK..." />
                            </div>
                            <div className="mt-12 flex justify-end gap-4 border-t border-slate-100 pt-8">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-10 py-4 rounded-2xl text-xs font-black text-slate-400 uppercase">Cancel</button>
                                <button type="submit" disabled={submitLoading} className="bg-blue-600 hover:bg-blue-700 text-white px-12 py-4 rounded-2xl font-black shadow-xl flex items-center gap-2 uppercase text-xs tracking-widest transition-all active:scale-95">
                                    {submitLoading ? <Loader2 className="animate-spin" size={18} /> : <><Save size={18} /> SAVE RECORD</>}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PackingTypeMaster;