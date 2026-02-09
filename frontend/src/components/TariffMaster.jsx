import React, { useState, useEffect, useMemo } from 'react';
import { mastersAPI } from '../service/api'; // Path to your api file
import { 
    Plus, Search, Edit, Trash2, X, ChevronLeft, 
    ChevronRight, BookOpen, Hash, Save, CheckSquare, Square, RefreshCw 
} from 'lucide-react';

const TariffMaster = () => {
    // --- Initial State ---
    const emptyState = { 
        id: null,
        tariff_code: '', 
        tariff_name: '', 
        tariff_no: '', 
        product_type: '', 
        commodity: '', 
        fibre: '', 
        yarn_type: '' 
    };

    // --- Core Data States ---
    const [list, setList] = useState([]);
    const [formData, setFormData] = useState(emptyState);
    const [loading, setLoading] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);

    // --- UI/Selection States ---
    const [isSelectionMode, setIsSelectionMode] = useState(false);
    const [selectedIds, setSelectedIds] = useState([]);

    // --- Filter & Pagination States ---
    const [searchField, setSearchField] = useState('tariff_name');
    const [searchCondition, setSearchCondition] = useState('Like');
    const [searchValue, setSearchValue] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(10);
    const [sortConfig, setSortConfig] = useState({ key: 'tariff_name', direction: 'asc' });

    // --- API Integration ---
    useEffect(() => { 
        fetchRecords(); 
    }, []);

    const fetchRecords = async () => {
        setLoading(true);
        try {
            const res = await mastersAPI.tariffs.getAll();
            // Maps res.data.data based on common Axios response structures
            const data = res.data?.data || res.data || [];
            setList(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error("Fetch Error:", err);
            setList([]);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            if (formData.id) {
                await mastersAPI.tariffs.update(formData.id, formData);
            } else {
                await mastersAPI.tariffs.create(formData);
            }
            setIsModalOpen(false);
            fetchRecords();
        } catch (err) {
            alert("Error saving record. Check console for details.");
        } finally {
            setLoading(false);
        }
    };

    const handleBulkDelete = async () => {
        if (selectedIds.length === 0) return;
        if (window.confirm(`Are you sure you want to delete ${selectedIds.length} records?`)) {
            setLoading(true);
            try {
                await Promise.all(selectedIds.map(id => mastersAPI.tariffs.delete(id)));
                setSelectedIds([]);
                setIsSelectionMode(false);
                fetchRecords();
            } catch (err) {
                alert("Bulk delete failed.");
            } finally {
                setLoading(false);
            }
        }
    };

    // --- UI Logic Helpers ---
    const handleAddNew = () => {
        const nextId = list.length > 0 ? Math.max(...list.map(i => i.id || 0)) + 1 : 1;
        setFormData({ ...emptyState, tariff_code: String(nextId) });
        setIsModalOpen(true);
    };

    const handleEdit = (item) => {
        if (isSelectionMode) {
            setSelectedIds(prev => prev.includes(item.id) ? prev.filter(i => i !== item.id) : [...prev, item.id]);
            return;
        }
        setFormData(item);
        setIsModalOpen(true);
    };

    // --- Search & Sort Logic ---
    const processedData = useMemo(() => {
        let result = [...list];
        if (searchValue) {
            result = result.filter(item => {
                const val = String(item[searchField] || '').toLowerCase();
                const search = searchValue.toLowerCase();
                return searchCondition === 'Like' ? val.includes(search) : val === search;
            });
        }
        if (sortConfig.key) {
            result.sort((a, b) => {
                const aVal = String(a[sortConfig.key] || '');
                const bVal = String(b[sortConfig.key] || '');
                return sortConfig.direction === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
            });
        }
        return result;
    }, [list, searchValue, searchField, searchCondition, sortConfig]);

    const currentItems = processedData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
    const totalPages = Math.ceil(processedData.length / itemsPerPage) || 1;

    return (
        <div className="min-h-screen bg-[#f8fafc] p-6 font-sans">
            
            {/* 1. TOP HEADER ACTIONS */}
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-black text-slate-800 tracking-tight">Tariff Machine Master</h1>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Manage HSN Codes and classifications</p>
                </div>
                
                <div className="flex gap-2">
                    <button onClick={handleAddNew} className="flex items-center gap-2 bg-[#2563eb] hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-bold shadow-md transition-all active:scale-95">
                        <Plus size={18} /> New
                    </button>
                    
                    <button 
                        onClick={() => { setIsSelectionMode(!isSelectionMode); setSelectedIds([]); }}
                        className={`px-6 py-2 border rounded-lg font-bold transition-all ${isSelectionMode ? 'bg-amber-100 border-amber-300 text-amber-700' : 'bg-white border-slate-200 text-blue-600 hover:bg-slate-50'}`}
                    >
                        {isSelectionMode ? 'Cancel Select' : 'Select'}
                    </button>

                    <button 
                        onClick={handleBulkDelete}
                        disabled={selectedIds.length === 0}
                        className={`px-6 py-2 border rounded-lg font-bold flex items-center gap-2 transition-all ${selectedIds.length > 0 ? 'bg-red-50 border-red-200 text-red-600 hover:bg-red-100' : 'bg-white border-slate-100 text-slate-300 cursor-not-allowed'}`}
                    >
                        <Trash2 size={18} /> Delete {selectedIds.length > 0 && `(${selectedIds.length})`}
                    </button>
                    <button onClick={fetchRecords} className="p-2 border rounded-lg bg-white text-slate-400 hover:text-blue-600"><RefreshCw size={18} className={loading ? 'animate-spin' : ''}/></button>
                </div>
            </div>

            {/* 2. SEARCH BAR (SCREENSHOT STYLE) */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm mb-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                    <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase mb-1 block ml-1">Search Field</label>
                        <select value={searchField} onChange={(e) => setSearchField(e.target.value)} className="w-full border border-slate-200 p-2.5 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500">
                            <option value="tariff_name">Tariff Name</option>
                            <option value="tariff_no">HSN No</option>
                            <option value="tariff_code">M/c No</option>
                        </select>
                    </div>
                    <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase mb-1 block ml-1">Condition</label>
                        <select value={searchCondition} onChange={(e) => setSearchCondition(e.target.value)} className="w-full border border-slate-200 p-2.5 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500">
                            <option value="Like">Like</option>
                            <option value="Equal">Equal</option>
                        </select>
                    </div>
                    <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase mb-1 block ml-1">Value</label>
                        <input type="text" placeholder="Enter search value..." value={searchValue} onChange={(e) => setSearchValue(e.target.value)} className="w-full border border-slate-200 p-2.5 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div className="flex gap-2">
                        <button className="flex-1 bg-[#2563eb] text-white py-2.5 rounded-lg text-sm font-bold hover:bg-blue-700 transition-all">Search</button>
                        <button onClick={() => {setSearchValue(''); fetchRecords();}} className="flex-1 border border-slate-200 py-2.5 rounded-lg text-sm font-bold hover:bg-slate-50 transition-all">Show All</button>
                    </div>
                </div>
            </div>

            {/* 3. BLUE HEADER DATA TABLE */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-md overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-[#2563eb] text-white">
                            <tr>
                                {isSelectionMode && <th className="p-4 w-12 text-center"><Square size={20}/></th>}
                                <th onClick={() => setSortConfig({key:'tariff_code', direction: sortConfig.direction === 'asc' ? 'desc' : 'asc'})} className="p-4 text-xs font-black uppercase tracking-widest cursor-pointer hover:bg-blue-700">M/c No.</th>
                                <th onClick={() => setSortConfig({key:'tariff_name', direction: sortConfig.direction === 'asc' ? 'desc' : 'asc'})} className="p-4 text-xs font-black uppercase tracking-widest cursor-pointer hover:bg-blue-700">Description</th>
                                <th className="p-4 text-xs font-black uppercase tracking-widest">HSN No.</th>
                                <th className="p-4 text-xs font-black uppercase tracking-widest">Product Type</th>
                                <th className="p-4 text-xs font-black uppercase tracking-widest text-center w-20">ActEffi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {currentItems.length > 0 ? currentItems.map((item) => (
                                <tr key={item.id} onClick={() => handleEdit(item)} className={`transition-colors cursor-pointer ${selectedIds.includes(item.id) ? 'bg-blue-50' : 'hover:bg-slate-50'}`}>
                                    {isSelectionMode && (
                                        <td className="p-4 text-center">
                                            {selectedIds.includes(item.id) ? <CheckSquare size={20} className="text-blue-600 mx-auto"/> : <Square size={20} className="text-slate-200 mx-auto"/>}
                                        </td>
                                    )}
                                    <td className="p-4 text-sm font-bold text-slate-400 font-mono">{item.tariff_code}</td>
                                    <td className="p-4 text-sm font-bold text-slate-700 uppercase">{item.tariff_name}</td>
                                    <td className="p-4 text-sm text-slate-600 font-bold">{item.tariff_no}</td>
                                    <td className="p-4 text-sm text-slate-500 font-semibold">{item.product_type || 'General'}</td>
                                    <td className="p-4 text-sm font-bold text-slate-400 text-center">80</td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan={isSelectionMode ? 6 : 5} className="p-24 text-center">
                                        <div className="flex flex-col items-center opacity-10">
                                            <RefreshCw size={64} className="mb-2" />
                                            <p className="text-lg font-black uppercase tracking-widest">No Records Found</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* 4. PAGINATION */}
                <div className="p-4 bg-[#f8fafc] border-t flex items-center justify-between">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        Showing {currentItems.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0} to {Math.min(currentPage * itemsPerPage, processedData.length)} of {processedData.length} Records
                    </p>
                    <div className="flex gap-2">
                        <button disabled={currentPage === 1} onClick={() => setCurrentPage(prev => prev - 1)} className="p-2 border rounded-lg bg-white hover:bg-slate-50 disabled:opacity-30 transition-all shadow-sm">
                            <ChevronLeft size={18}/>
                        </button>
                        <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(prev => prev + 1)} className="p-2 border rounded-lg bg-white hover:bg-slate-50 disabled:opacity-30 transition-all shadow-sm">
                            <ChevronRight size={18}/>
                        </button>
                    </div>
                </div>
            </div>

            {/* 5. MODAL FORM (POPUP) */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="bg-[#2563eb] p-5 flex justify-between items-center text-white">
                            <div>
                                <h2 className="font-black uppercase tracking-tight text-lg">{formData.id ? 'Modify Record' : 'New Entry'}</h2>
                                <p className="text-[10px] font-bold text-blue-200 uppercase tracking-widest mt-1">Tariff Head Configuration</p>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="hover:bg-blue-500 p-1 rounded-full"><X size={24}/></button>
                        </div>
                        
                        <form onSubmit={handleSave} className="p-8 space-y-6">
                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">M/c Code *</label>
                                    <input required className="w-full border-b-2 border-slate-100 p-2 font-mono font-bold text-blue-600 outline-none focus:border-blue-500 transition-colors" value={formData.tariff_code} onChange={e => setFormData({...formData, tariff_code: e.target.value})} />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">HSN No *</label>
                                    <input required className="w-full border-b-2 border-slate-100 p-2 font-bold outline-none focus:border-blue-500" value={formData.tariff_no} onChange={e => setFormData({...formData, tariff_no: e.target.value})} placeholder="5205" />
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Tariff Description *</label>
                                <input required className="w-full border-b-2 border-slate-100 p-2 text-lg font-bold text-slate-700 outline-none focus:border-blue-500 uppercase" value={formData.tariff_name} onChange={e => setFormData({...formData, tariff_name: e.target.value})} placeholder="Cotton Yarn dyed" />
                            </div>

                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Product Type</label>
                                    <input className="w-full border-b-2 border-slate-100 p-2 text-sm font-semibold outline-none focus:border-blue-500" value={formData.product_type} onChange={e => setFormData({...formData, product_type: e.target.value})} placeholder="Yarn" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Commodity</label>
                                    <input className="w-full border-b-2 border-slate-100 p-2 text-sm font-semibold outline-none focus:border-blue-500" value={formData.commodity} onChange={e => setFormData({...formData, commodity: e.target.value})} />
                                </div>
                            </div>

                            <div className="pt-8 border-t flex justify-end gap-4">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-2 font-bold text-slate-400 hover:text-slate-600 text-xs tracking-widest">CANCEL</button>
                                <button type="submit" disabled={loading} className="bg-[#2563eb] hover:bg-blue-700 text-white px-10 py-3 rounded-xl font-black shadow-lg shadow-blue-100 flex items-center gap-2 active:scale-95 transition-all text-xs tracking-widest">
                                    <Save size={16}/> {loading ? 'SAVING...' : 'SAVE RECORD'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <style jsx>{`
                ::-webkit-scrollbar { width: 6px; }
                ::-webkit-scrollbar-track { background: transparent; }
                ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
            `}</style>
        </div>
    );
};

export default TariffMaster;