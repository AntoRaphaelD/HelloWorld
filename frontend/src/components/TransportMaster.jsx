import React, { useState, useEffect, useMemo } from 'react';
import { mastersAPI } from '../service/api';
import { 
    Plus, Search, Edit, Trash2, X, ChevronLeft, 
    ChevronRight, Truck, Save, CheckSquare, Square, RefreshCw 
} from 'lucide-react';

const TransportMaster = () => {
    // --- Initial State ---
    const emptyState = { id: null, transport_code: '', transport_name: '', place: '', address: '' };

    // --- Core Data States ---
    const [list, setList] = useState([]);
    const [formData, setFormData] = useState(emptyState);
    const [loading, setLoading] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);

    // --- UI/Selection States ---
    const [isSelectionMode, setIsSelectionMode] = useState(false);
    const [selectedIds, setSelectedIds] = useState([]);

    // --- Search & Pagination States ---
    const [searchField, setSearchField] = useState('transport_name');
    const [searchCondition, setSearchCondition] = useState('Like');
    const [searchValue, setSearchValue] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(10);
    const [sortConfig, setSortConfig] = useState({ key: 'transport_name', direction: 'asc' });

    useEffect(() => { fetchRecords(); }, []);

    const fetchRecords = async () => {
        setLoading(true);
        try {
            const res = await mastersAPI.transports.getAll();
            const data = res.data?.data || res.data || [];
            setList(Array.isArray(data) ? data : []);
        } catch (err) { setList([]); }
        finally { setLoading(false); }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            formData.id ? await mastersAPI.transports.update(formData.id, formData) : await mastersAPI.transports.create(formData);
            setIsModalOpen(false);
            fetchRecords();
        } catch (err) { alert("Error saving record"); }
        finally { setLoading(false); }
    };

    const handleBulkDelete = async () => {
        if (selectedIds.length === 0) return;
        if (window.confirm(`Delete ${selectedIds.length} transporters?`)) {
            setLoading(true);
            try {
                await Promise.all(selectedIds.map(id => mastersAPI.transports.delete(id)));
                setSelectedIds([]);
                setIsSelectionMode(false);
                fetchRecords();
            } catch (err) { alert("Bulk delete failed"); }
            finally { setLoading(false); }
        }
    };

    const handleAddNew = () => {
        const nextId = list.length > 0 ? Math.max(...list.map(i => i.id || 0)) + 1 : 1;
        setFormData({ ...emptyState, transport_code: String(nextId) });
        setIsModalOpen(true);
    };

    const handleRowClick = (item) => {
        if (isSelectionMode) {
            setSelectedIds(prev => prev.includes(item.id) ? prev.filter(i => i !== item.id) : [...prev, item.id]);
            return;
        }
        setFormData(item);
        setIsModalOpen(true);
    };

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
        <div className="min-h-screen bg-[#f8fafc] p-6 font-sans select-none">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2"><Truck className="text-blue-600" /> Transport Master</h1>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Fleet & Logistics Management</p>
                </div>
                <div className="flex gap-2">
                    <button onClick={handleAddNew} className="bg-[#2563eb] hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-bold shadow-md transition-all active:scale-95 flex items-center gap-2"><Plus size={18} /> New</button>
                    <button onClick={() => { setIsSelectionMode(!isSelectionMode); setSelectedIds([]); }} className={`px-6 py-2 border rounded-lg font-bold transition-all ${isSelectionMode ? 'bg-amber-100 border-amber-300 text-amber-700' : 'bg-white border-slate-200 text-blue-600'}`}>{isSelectionMode ? 'Cancel Select' : 'Select'}</button>
                    <button onClick={handleBulkDelete} disabled={selectedIds.length === 0} className={`px-6 py-2 border rounded-lg font-bold flex items-center gap-2 transition-all ${selectedIds.length > 0 ? 'bg-red-50 border-red-200 text-red-600' : 'bg-white border-slate-100 text-slate-300 cursor-not-allowed'}`}><Trash2 size={18} /> Delete {selectedIds.length > 0 && `(${selectedIds.length})`}</button>
                </div>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm mb-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                    <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase mb-1 block">Search Field</label>
                        <select value={searchField} onChange={(e) => setSearchField(e.target.value)} className="w-full border border-slate-200 p-2 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500">
                            <option value="transport_name">Transport Name</option>
                            <option value="place">Place</option>
                            <option value="transport_code">M/c No</option>
                        </select>
                    </div>
                    <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase mb-1 block">Condition</label>
                        <select value={searchCondition} onChange={(e) => setSearchCondition(e.target.value)} className="w-full border border-slate-200 p-2 rounded-lg text-sm outline-none">
                            <option value="Like">Like</option>
                            <option value="Equal">Equal</option>
                        </select>
                    </div>
                    <div className="md:col-span-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase mb-1 block">Value</label>
                        <input type="text" placeholder="Enter search value..." value={searchValue} onChange={(e) => setSearchValue(e.target.value)} className="w-full border border-slate-200 p-2 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div className="flex gap-2">
                        <button onClick={() => setCurrentPage(1)} className="flex-1 bg-[#2563eb] text-white py-2 rounded-lg text-sm font-bold">Search</button>
                        <button onClick={() => {setSearchValue(''); fetchRecords();}} className="flex-1 border border-slate-200 py-2 rounded-lg text-sm font-bold">Show All</button>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-md overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-[#2563eb] text-white">
                            <tr>
                                {isSelectionMode && <th className="p-4 w-12 text-center"><Square size={20} className="mx-auto" /></th>}
                                <th onClick={() => setSortConfig({key:'transport_code', direction: sortConfig.direction === 'asc' ? 'desc' : 'asc'})} className="p-4 text-xs font-black uppercase tracking-widest cursor-pointer hover:bg-blue-700 w-32">M/c No.</th>
                                <th onClick={() => setSortConfig({key:'transport_name', direction: sortConfig.direction === 'asc' ? 'desc' : 'asc'})} className="p-4 text-xs font-black uppercase tracking-widest cursor-pointer hover:bg-blue-700">Description (Name)</th>
                                <th className="p-4 text-xs font-black uppercase tracking-widest">Base Hub (Place)</th>
                                <th className="p-4 text-xs font-black uppercase tracking-widest text-center">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {currentItems.length > 0 ? currentItems.map((item) => (
                                <tr key={item.id} onClick={() => handleRowClick(item)} className={`transition-colors cursor-pointer ${selectedIds.includes(item.id) ? 'bg-blue-50' : 'hover:bg-slate-50'}`}>
                                    {isSelectionMode && <td className="p-4 text-center">{selectedIds.includes(item.id) ? <CheckSquare size={20} className="text-blue-600 mx-auto"/> : <Square size={20} className="text-slate-200 mx-auto"/>}</td>}
                                    <td className="p-4 text-sm font-bold text-slate-400 font-mono">{item.transport_code}</td>
                                    <td className="p-4 text-sm font-bold text-slate-700 uppercase">{item.transport_name}</td>
                                    <td className="p-4 text-sm text-slate-500 font-semibold">{item.place || 'LOCAL'}</td>
                                    <td className="p-4 text-center"><button className="p-2 text-slate-300 hover:text-blue-600"><Edit size={16}/></button></td>
                                </tr>
                            )) : (
                                <tr><td colSpan={isSelectionMode ? 5 : 4} className="p-24 text-center opacity-10 flex flex-col items-center"><Truck size={64}/><p className="text-lg font-black uppercase">No Records Displayed</p></td></tr>
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="p-4 bg-[#f8fafc] border-t flex items-center justify-between">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Showing {currentItems.length} of {processedData.length} Records</p>
                    <div className="flex gap-2">
                        <button disabled={currentPage === 1} onClick={() => setCurrentPage(prev => prev - 1)} className="p-2 border rounded-lg bg-white disabled:opacity-30"><ChevronLeft size={18}/></button>
                        <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(prev => prev + 1)} className="p-2 border rounded-lg bg-white disabled:opacity-30"><ChevronRight size={18}/></button>
                    </div>
                </div>
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden">
                        <div className="bg-[#2563eb] p-5 flex justify-between items-center text-white">
                            <h2 className="font-black uppercase tracking-tight text-lg">{formData.id ? 'Modify Transporter' : 'New Fleet Registration'}</h2>
                            <button onClick={() => setIsModalOpen(false)} className="hover:bg-blue-500 p-1 rounded-full"><X size={24}/></button>
                        </div>
                        <form onSubmit={handleSave} className="p-8 space-y-6">
                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase ml-1">M/c Code *</label><input required className="w-full border-b-2 border-slate-100 p-2 font-mono font-bold text-blue-600 bg-slate-50 outline-none" readOnly value={formData.transport_code} /></div>
                                <div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase ml-1">Primary Place</label><input className="w-full border-b-2 border-slate-100 p-2 font-bold uppercase outline-none focus:border-blue-500" value={formData.place} onChange={e => setFormData({...formData, place: e.target.value})} placeholder="CITY NAME" /></div>
                            </div>
                            <div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase ml-1">Agency Name *</label><input required className="w-full border-b-2 border-slate-100 p-2 text-lg font-bold text-slate-700 outline-none focus:border-blue-500 uppercase" value={formData.transport_name} onChange={e => setFormData({...formData, transport_name: e.target.value})} placeholder="e.g. Speed Logistics" /></div>
                            <div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase ml-1">Full Address</label><textarea className="w-full border-b-2 border-slate-100 p-2 font-semibold text-slate-500 outline-none focus:border-blue-500" rows="3" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} placeholder="Registered office address..." /></div>
                            <div className="pt-8 border-t flex justify-end gap-4">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-2 font-bold text-slate-400 hover:text-slate-600 text-xs tracking-widest">CANCEL</button>
                                <button type="submit" disabled={loading} className="bg-[#2563eb] hover:bg-blue-700 text-white px-10 py-3 rounded-xl font-black shadow-lg shadow-blue-100 flex items-center gap-2 active:scale-95 transition-all text-xs tracking-widest"><Save size={16}/> {loading ? 'SAVING...' : 'SAVE TRANSPORT'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TransportMaster;