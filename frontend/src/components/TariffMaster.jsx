import React, { useState, useEffect, useMemo } from 'react';
import { mastersAPI } from '../service/api';
import { 
    Plus, Edit, Trash2, X, ChevronLeft, 
    ChevronRight, RefreshCw, Save, BookOpen, Search, Filter, 
    Square, CheckSquare
} from 'lucide-react';

const TariffMaster = () => {
    const [list, setList] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [submitLoading, setSubmitLoading] = useState(false);
    
    const [isSelectionMode, setIsSelectionMode] = useState(false);
    const [selectedIds, setSelectedIds] = useState([]);
    
    const [searchField, setSearchField] = useState('tariff_name');
    const [searchCondition, setSearchCondition] = useState('Like');
    const [searchValue, setSearchValue] = useState('');

    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    const initialState = {
        id: null,
        tariff_code: '', 
        tariff_name: '', 
        tariff_no: '', 
        product_type: 'CONE', 
        commodity: 'COTTON', 
        fibre: 'COTTON', 
        yarn_type: 'SINGLE' 
    };

    const [formData, setFormData] = useState(initialState);

    useEffect(() => { fetchRecords(); }, []);

    const fetchRecords = async () => {
        setLoading(true);
        try {
            const res = await mastersAPI.tariffs.getAll();
            const rawData = res?.data?.data || res?.data || [];
            setList(Array.isArray(rawData) ? rawData : []);
        } catch (err) { setList([]); } finally { setLoading(false); }
    };

    const filteredData = useMemo(() => {
        let result = Array.isArray(list) ? [...list] : [];
        if (searchValue.trim()) {
            result = result.filter(item => {
                const itemValue = String(item[searchField] || '').toLowerCase();
                const term = searchValue.toLowerCase().trim();
                return searchCondition === 'Equal' ? itemValue === term : itemValue.includes(term);
            });
        }
        return result.sort((a, b) => b.id - a.id);
    }, [list, searchValue, searchField, searchCondition]);

    const totalPages = Math.ceil(filteredData.length / itemsPerPage) || 1;
    const currentItems = filteredData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    const handleAddNew = () => {
        const safeList = Array.isArray(list) ? list : [];
        const maxCode = safeList.reduce((max, item) => {
            const num = parseInt(item.tariff_code, 10);
            return !isNaN(num) ? Math.max(max, num) : max;
        }, 0);
        setFormData({ ...initialState, tariff_code: (maxCode + 1).toString() });
        setIsModalOpen(true);
    };

    const handleRowClick = (item) => {
        if (isSelectionMode) {
            setSelectedIds(prev => 
                prev.includes(item.id) ? prev.filter(id => id !== item.id) : [...prev, item.id]
            );
        } else {
            setFormData({ ...item });
            setIsModalOpen(true);
        }
    };

    const handleBulkDelete = async () => {
        if (selectedIds.length === 0) return;
        if (window.confirm(`Permanently delete ${selectedIds.length} records?`)) {
            setLoading(true);
            try {
                await Promise.all(selectedIds.map(id => mastersAPI.tariffs.delete(id)));
                setSelectedIds([]);
                setIsSelectionMode(false);
                fetchRecords();
            } catch (err) { alert("Bulk delete failed."); } finally { setLoading(false); }
        }
    };

    const handleDeleteSingle = async () => {
        if (!formData.id) return;
        if (window.confirm("Delete this tariff record permanently?")) {
            setSubmitLoading(true);
            try {
                await mastersAPI.tariffs.delete(formData.id);
                setIsModalOpen(false);
                fetchRecords();
            } catch (err) { alert("Delete failed."); } finally { setSubmitLoading(false); }
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setSubmitLoading(true);
        try {
            if (formData.id) await mastersAPI.tariffs.update(formData.id, formData);
            else await mastersAPI.tariffs.create(formData);
            fetchRecords();
            setIsModalOpen(false);
        } catch (err) { alert("Error saving."); } finally { setSubmitLoading(false); }
    };

    const FormLabel = ({ children }) => (
        <label className="text-right text-base text-slate-700 pr-3 font-semibold self-center whitespace-nowrap">
            {children}
        </label>
    );

    return (
        <div className="min-h-screen bg-slate-100 p-6 font-sans">
            
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                    <BookOpen className="text-blue-700" /> Tariff Sub Head Master
                </h1>
                <div className="flex gap-2">
                    <button 
                        onClick={handleAddNew} 
                        className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg font-bold text-xs uppercase shadow-md transition-all flex items-center gap-1"
                    >
                        <Plus size={16} /> New Tariff
                    </button>
                    <button 
                        onClick={fetchRecords} 
                        className="p-2 border border-slate-200 rounded-lg bg-white"
                    >
                        <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
                    </button>
                </div>
            </div>

            {/* Search Bar – matched to other masters */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm mb-6 flex flex-wrap items-end gap-4">
                <div className="flex-1 min-w-[180px]">
                    <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Search Field</label>
                    <select 
                        value={searchField} 
                        onChange={e => setSearchField(e.target.value)} 
                        className="w-full border border-slate-200 p-2 rounded-xl text-[13px] outline-none focus:ring-1 focus:ring-blue-500"
                    >
                        <option value="tariff_name">Tariff Name</option>
                        <option value="tariff_no">Tariff No.</option>
                        <option value="tariff_code">Code</option>
                    </select>
                </div>
                <div className="flex-1 min-w-[150px]">
                    <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Condition</label>
                    <select 
                        value={searchCondition} 
                        onChange={e => setSearchCondition(e.target.value)} 
                        className="w-full border p-2 rounded-xl text-[13px] outline-none"
                    >
                        <option value="Like">Like</option>
                        <option value="Equal">Equal</option>
                    </select>
                </div>
                <div className="flex-[2] min-w-[280px]">
                    <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Value</label>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                        <input 
                            type="text" 
                            value={searchValue} 
                            onChange={e => setSearchValue(e.target.value)} 
                            className="w-full border pl-9 pr-4 py-2 rounded-xl text-[13px] outline-none focus:ring-1 focus:ring-blue-500" 
                            placeholder="Live search..." 
                        />
                    </div>
                </div>

                {!isSelectionMode ? (
                    <button 
                        onClick={() => setIsSelectionMode(true)} 
                        className="border border-blue-200 bg-blue-50 text-blue-600 px-8 py-2 rounded-xl text-base font-bold hover:bg-blue-100 shadow-sm transition-all"
                    >
                        Select
                    </button>
                ) : (
                    <div className="flex gap-2">
                        <button 
                            onClick={() => { setIsSelectionMode(false); setSelectedIds([]); }} 
                            className="border border-slate-200 px-6 py-2 rounded-xl text-base font-bold text-slate-600 hover:bg-slate-50"
                        >
                            Clear
                        </button>
                        <button 
                            onClick={handleBulkDelete}
                            disabled={selectedIds.length === 0}
                            className="bg-red-500 text-white px-6 py-2 rounded-xl text-base font-bold shadow-md disabled:opacity-50 flex items-center gap-1"
                        >
                            <Trash2 size={16} /> Delete ({selectedIds.length})
                        </button>
                    </div>
                )}
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-blue-700 border-b text-white text-sm font-bold uppercase tracking-wider">
                        <tr>
                            {isSelectionMode && <th className="p-4 w-12 text-center">#</th>}
                            <th className="p-4">Tariff Code</th>
                            <th className="p-4">Tariff Name</th>
                            <th className="p-4">Tariff No.</th>
                            <th className="p-4">Yarn Type</th>
                            <th className="p-4">Product Type</th>
                            {!isSelectionMode && <th className="p-4 w-10"></th>}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {loading ? (
                            <tr><td colSpan={6} className="p-12 text-center text-slate-400">Loading...</td></tr>
                        ) : currentItems.length > 0 ? (
                            currentItems.map(item => (
                                <tr 
                                    key={item.id} 
                                    className={`hover:bg-blue-50 cursor-pointer ${selectedIds.includes(item.id) ? 'bg-blue-100/50' : ''}`} 
                                    onClick={() => handleRowClick(item)}
                                >
                                    {isSelectionMode && (
                                        <td className="p-4 text-center">
                                            {selectedIds.includes(item.id) ? <CheckSquare size={18} className="text-blue-600 mx-auto"/> : <Square size={18} className="text-slate-200 mx-auto"/>}
                                        </td>
                                    )}
                                    <td className="p-4 text-base font-bold text-blue-600 font-mono">{item.tariff_code}</td>
                                    <td className="p-4 text-base font-semibold text-slate-700 uppercase">{item.tariff_name}</td>
                                    <td className="p-4 text-base text-slate-600 font-mono">{item.tariff_no || '—'}</td>
                                    <td className="p-4 text-base font-bold text-amber-700 uppercase">{item.yarn_type}</td>
                                    <td className="p-4 text-base font-bold text-slate-600 uppercase">{item.product_type}</td>
                                    {!isSelectionMode && <td className="p-4 text-slate-300"><Edit size={16} /></td>}
                                </tr>
                            ))
                        ) : (
                            <tr><td colSpan={6} className="p-12 text-center text-slate-400">No matching tariffs found</td></tr>
                        )}
                    </tbody>
                </table>

                <div className="p-3 bg-slate-50 border-t flex items-center justify-between text-sm">
                    <span className="text-slate-500 font-medium">Page {currentPage} of {totalPages}</span>
                    <div className="flex gap-1">
                        <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} className="p-1.5 border rounded bg-white disabled:opacity-40"><ChevronLeft size={16}/></button>
                        <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)} className="p-1.5 border rounded bg-white disabled:opacity-40"><ChevronRight size={16}/></button>
                    </div>
                </div>
            </div>

            {/* Modal – font sizes aligned */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
                    <div className="bg-[#cfe2ff] w-full max-w-[680px] rounded shadow-2xl overflow-hidden border border-white animate-in zoom-in duration-200">
                        <div className="bg-[#6495ed] p-5 flex justify-between items-center text-white border-b border-white/20">
                            <div>
                                <h2 className="text-xl font-medium tracking-wide">Tariff Sub Head Master</h2>
                                <p className="text-blue-50 text-base mt-1">Add / Modify Tariff details</p>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="hover:bg-white/10 p-1 rounded-full"><X size={24}/></button>
                        </div>

                        <div className="p-8">
                            <form onSubmit={handleSave} className="space-y-2 max-w-2xl mx-auto">
                                <div className="grid grid-cols-12 items-center">
                                    <div className="col-span-4 flex justify-end"><FormLabel>Tariff Code</FormLabel></div>
                                    <div className="col-span-8">
                                        <input 
                                            type="text" 
                                            readOnly 
                                            className="w-40 p-1 border border-gray-400 bg-black text-white font-bold outline-none cursor-default font-mono text-base" 
                                            value={formData.tariff_code} 
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-12 items-center">
                                    <div className="col-span-4 flex justify-end"><FormLabel>Tariff Name</FormLabel></div>
                                    <div className="col-span-8">
                                        <input 
                                            type="text" 
                                            required 
                                            className="w-full p-1 border border-gray-400 bg-white uppercase text-base font-semibold outline-none focus:border-blue-500" 
                                            value={formData.tariff_name} 
                                            onChange={e => setFormData({...formData, tariff_name: e.target.value.toUpperCase()})} 
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-12 items-center">
                                    <div className="col-span-4 flex justify-end"><FormLabel>Tariff No.</FormLabel></div>
                                    <div className="col-span-8">
                                        <input 
                                            type="text" 
                                            required 
                                            className="w-full p-1 border border-gray-400 bg-white text-base outline-none focus:border-blue-500" 
                                            value={formData.tariff_no} 
                                            onChange={e => setFormData({...formData, tariff_no: e.target.value})} 
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-12 items-center">
                                    <div className="col-span-4 flex justify-end"><FormLabel>Product Type</FormLabel></div>
                                    <div className="col-span-8">
                                        <select 
                                            className="w-40 p-1 border border-gray-400 bg-white text-base outline-none focus:border-blue-500" 
                                            value={formData.product_type} 
                                            onChange={e => setFormData({...formData, product_type: e.target.value})}
                                        >
                                            <option value="CONE">CONE</option>
                                            <option value="HANK">HANK</option>
                                            <option value="CHEESE">CHEESE</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="grid grid-cols-12 items-center">
                                    <div className="col-span-4 flex justify-end"><FormLabel>Commodity</FormLabel></div>
                                    <div className="col-span-8">
                                        <select 
                                            className="w-48 p-1 border border-gray-400 bg-white text-base outline-none focus:border-blue-500" 
                                            value={formData.commodity} 
                                            onChange={e => setFormData({...formData, commodity: e.target.value})}
                                        >
                                            <option value="COTTON">COTTON</option>
                                            <option value="POLYESTER">POLYESTER</option>
                                            <option value="VISCOSE">VISCOSE</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="grid grid-cols-12 items-center">
                                    <div className="col-span-4 flex justify-end"><FormLabel>Fibre</FormLabel></div>
                                    <div className="col-span-8">
                                        <select 
                                            className="w-48 p-1 border border-gray-400 bg-white text-base outline-none focus:border-blue-500" 
                                            value={formData.fibre} 
                                            onChange={e => setFormData({...formData, fibre: e.target.value})}
                                        >
                                            <option value="COTTON">COTTON</option>
                                            <option value="COMBED">COMBED</option>
                                            <option value="CARDED">CARDED</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="grid grid-cols-12 items-center">
                                    <div className="col-span-4 flex justify-end"><FormLabel>Yarn Type</FormLabel></div>
                                    <div className="col-span-8">
                                        <select 
                                            className="w-48 p-1 border border-gray-400 bg-white text-base outline-none focus:border-blue-500" 
                                            value={formData.yarn_type} 
                                            onChange={e => setFormData({...formData, yarn_type: e.target.value})}
                                        >
                                            <option value="SINGLE">SINGLE</option>
                                            <option value="DOUBLE">DOUBLE</option>
                                            <option value="MULTIFOLD">MULTIFOLD</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="flex justify-end gap-4 pt-8">
                                    {formData.id && (
                                        <button 
                                            type="button" 
                                            onClick={handleDeleteSingle}
                                            className="mr-auto text-red-600 text-base font-bold hover:bg-red-50 px-4 py-2 rounded transition-all"
                                        >
                                            Purge Record
                                        </button>
                                    )}
                                    <button 
                                        type="submit" 
                                        disabled={submitLoading} 
                                        className="flex items-center gap-2 bg-slate-50 border border-slate-400 px-10 py-2 text-base font-bold shadow-sm hover:bg-white active:scale-95 transition-all"
                                    >
                                        <span className="text-blue-700 p-1 border border-blue-100 bg-white rounded"><Save size={16}/></span> 
                                        {formData.id ? 'Update' : 'Save'}
                                    </button>
                                    <button 
                                        type="button" 
                                        onClick={() => setIsModalOpen(false)} 
                                        className="flex items-center gap-2 bg-slate-50 border border-slate-400 px-10 py-2 text-base font-bold shadow-sm hover:bg-white active:scale-95 transition-all"
                                    >
                                        <span className="text-red-600 font-black p-1 border border-red-100 bg-white rounded">X</span> Cancel
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TariffMaster;