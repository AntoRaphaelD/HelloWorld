import React, { useState, useEffect, useMemo } from 'react';
import { mastersAPI } from '../service/api';
import { 
    Plus, Search, Edit, Trash2, X, ChevronLeft, 
    ChevronRight, Package, Hash, Scale, Save 
} from 'lucide-react';

const ProductMaster = () => {
    // --- Initial State ---
    const emptyState = { 
        product_code: '', product_name: '', short_description: '', 
        packing_type_id: '', tariff_id: '', wt_per_cone: 0, 
        cones_per_pack: 0, pack_nett_wt: 0, actual_count: 0, 
        charity_rs: 0, mill_stock: 0
    };

    // --- State Management ---
    const [list, setList] = useState([]);
    const [tariffs, setTariffs] = useState([]);
    const [packingTypes, setPackingTypes] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formData, setFormData] = useState(emptyState);
    const [loading, setLoading] = useState(false);

    // Search & Pagination State
    const [searchField, setSearchField] = useState('product_name');
    const [searchCondition, setSearchCondition] = useState('Like');
    const [searchValue, setSearchValue] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(10);
    const [sortConfig, setSortConfig] = useState({ key: 'product_name', direction: 'asc' });

    useEffect(() => { 
        fetchRecords();
        mastersAPI.tariffs.getAll().then(res => setTariffs(res.data.data || []));
        mastersAPI.packingTypes.getAll().then(res => setPackingTypes(res.data.data || []));
    }, []);

    const fetchRecords = async () => {
        setLoading(true);
        try {
            const res = await mastersAPI.products.getAll();
            setList(res.data.data || []);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    const generateNextCode = (currentList) => {
        const nextId = currentList.length > 0 ? Math.max(...currentList.map(i => i.id)) + 1 : 1;
        return String(nextId);
    };

    // --- Actions ---
    const handleAddNew = () => {
        const nextCode = generateNextCode(list);
        setFormData({ ...emptyState, product_code: nextCode });
        setIsModalOpen(true);
    };

    const handleEdit = (item) => {
        setFormData(item);
        setIsModalOpen(true);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        if (!formData.product_name) return alert("Product Name Required");
        setLoading(true);
        try {
            formData.id 
                ? await mastersAPI.products.update(formData.id, formData) 
                : await mastersAPI.products.create(formData);
            fetchRecords();
            setIsModalOpen(false);
        } catch (err) { alert("Error saving product"); }
        finally { setLoading(false); }
    };

    const handleDelete = async (id) => {
        if (window.confirm("Are you sure you want to delete this product?")) {
            try {
                await mastersAPI.products.delete(id);
                fetchRecords();
                setIsModalOpen(false);
            } catch (err) { alert("Delete failed"); }
        }
    };

    // --- Logic: Search, Sort, Pagination ---
    const filteredAndSortedData = useMemo(() => {
        let result = [...list];

        // Search Logic
        if (searchValue) {
            result = result.filter(item => {
                const val = String(item[searchField] || '').toLowerCase();
                const search = searchValue.toLowerCase();
                return searchCondition === 'Like' ? val.includes(search) : val === search;
            });
        }

        // Sort Logic
        if (sortConfig.key) {
            result.sort((a, b) => {
                if (a[sortConfig.key] < b[sortConfig.key]) return sortConfig.direction === 'asc' ? -1 : 1;
                if (a[sortConfig.key] > b[sortConfig.key]) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }
        return result;
    }, [list, searchValue, searchField, searchCondition, sortConfig]);

    const indexOfLastItem = currentPage * itemsPerPage;
    const currentItems = filteredAndSortedData.slice(indexOfLastItem - itemsPerPage, indexOfLastItem);
    const totalPages = Math.ceil(filteredAndSortedData.length / itemsPerPage);

    const requestSort = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
        setSortConfig({ key, direction });
    };

    return (
        <div className="min-h-screen bg-slate-50 p-6 font-sans">
            {/* TOP HEADER */}
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <Package className="text-blue-600" /> Product Machine Master
                    </h1>
                    <p className="text-sm text-slate-500">Manage product information and inventory specifications</p>
                </div>
                <div className="flex gap-2">
                    <button onClick={handleAddNew} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg font-semibold shadow-sm transition-all">
                        <Plus size={18} /> New
                    </button>
                    <button className="px-5 py-2 border border-slate-200 bg-white text-blue-600 rounded-lg font-semibold hover:bg-slate-50">Select</button>
                    <button className="px-5 py-2 border border-red-100 bg-white text-red-400 rounded-lg hover:bg-red-50"><Trash2 size={18}/></button>
                </div>
            </div>

            {/* SEARCH BAR */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm mb-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                    <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Search Field</label>
                        <select value={searchField} onChange={(e) => setSearchField(e.target.value)} className="w-full border border-slate-200 p-2 rounded-lg text-sm outline-none">
                            <option value="product_name">Product Name</option>
                            <option value="product_code">Product Code</option>
                        </select>
                    </div>
                    <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Condition</label>
                        <select value={searchCondition} onChange={(e) => setSearchCondition(e.target.value)} className="w-full border border-slate-200 p-2 rounded-lg text-sm outline-none">
                            <option value="Like">Like</option>
                            <option value="Equal">Equal</option>
                        </select>
                    </div>
                    <div className="md:col-span-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Value</label>
                        <input type="text" placeholder="Enter search value..." value={searchValue} onChange={(e) => setSearchValue(e.target.value)} className="w-full border border-slate-200 p-2 rounded-lg text-sm outline-none" />
                    </div>
                    <div className="flex gap-2">
                        <button className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-sm font-bold hover:bg-blue-700 flex items-center justify-center gap-2">
                            <Search size={16}/> Search
                        </button>
                        <button onClick={() => setSearchValue('')} className="flex-1 border border-slate-200 py-2 rounded-lg text-sm font-bold hover:bg-slate-50">Show All</button>
                    </div>
                </div>
            </div>

            {/* TABLE */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-blue-600 text-white">
                            <tr>
                                <th onClick={() => requestSort('product_code')} className="p-4 text-sm font-semibold cursor-pointer hover:bg-blue-700">Code</th>
                                <th onClick={() => requestSort('product_name')} className="p-4 text-sm font-semibold cursor-pointer hover:bg-blue-700">Product Name</th>
                                <th className="p-4 text-sm font-semibold">Tariff (HSN)</th>
                                <th className="p-4 text-sm font-semibold">Packing Type</th>
                                <th onClick={() => requestSort('mill_stock')} className="p-4 text-sm font-semibold cursor-pointer hover:bg-blue-700">Stock (KG)</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {currentItems.map((item) => (
                                <tr key={item.id} onClick={() => handleEdit(item)} className="hover:bg-blue-50 cursor-pointer transition-colors group">
                                    <td className="p-4 text-sm font-mono text-slate-500">{item.product_code}</td>
                                    <td className="p-4 text-sm font-bold text-slate-700 uppercase">{item.product_name}</td>
                                    <td className="p-4 text-sm text-slate-600">
                                        {tariffs.find(t => t.id === item.tariff_id)?.tariff_no || 'N/A'}
                                    </td>
                                    <td className="p-4 text-sm text-slate-600">
                                        {packingTypes.find(p => p.id === item.packing_type_id)?.packing_type || 'N/A'}
                                    </td>
                                    <td className="p-4 text-sm font-black text-emerald-600">{item.mill_stock}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* PAGINATION */}
                <div className="p-4 bg-slate-50 border-t flex items-center justify-between">
                    <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider">
                        Records: {indexOfLastItem - itemsPerPage + 1} - {Math.min(indexOfLastItem, filteredAndSortedData.length)} of {filteredAndSortedData.length}
                    </span>
                    <div className="flex gap-2">
                        <button disabled={currentPage === 1} onClick={() => setCurrentPage(prev => prev - 1)} className="p-2 border rounded bg-white hover:bg-slate-50 disabled:opacity-30">
                            <ChevronLeft size={16}/>
                        </button>
                        <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(prev => prev + 1)} className="p-2 border rounded bg-white hover:bg-slate-50 disabled:opacity-30">
                            <ChevronRight size={16}/>
                        </button>
                    </div>
                </div>
            </div>

            {/* MODAL POP-UP */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="bg-blue-600 p-4 flex justify-between items-center text-white">
                            <h2 className="font-black uppercase tracking-tight">{formData.id ? 'Modify Product' : 'Add New Product'}</h2>
                            <button onClick={() => setIsModalOpen(false)} className="hover:bg-blue-500 p-1 rounded-full"><X size={20}/></button>
                        </div>
                        
                        <form onSubmit={handleSave} className="p-8">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                {/* General Info */}
                                <div className="md:col-span-2 grid grid-cols-2 gap-6">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase">Product Name *</label>
                                        <input required className="w-full border p-3 rounded-xl font-bold" value={formData.product_name} onChange={e => setFormData({...formData, product_name: e.target.value})} />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase">Product Code</label>
                                        <input className="w-full border p-3 rounded-xl bg-slate-50 font-mono" readOnly value={formData.product_code} />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase">Packing Type</label>
                                        <select className="w-full border p-3 rounded-xl" value={formData.packing_type_id} onChange={e => setFormData({...formData, packing_type_id: e.target.value})}>
                                            <option value="">Select Packing</option>
                                            {packingTypes.map(p => <option key={p.id} value={p.id}>{p.packing_type}</option>)}
                                        </select>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase">Tariff (HSN)</label>
                                        <select className="w-full border p-3 rounded-xl" value={formData.tariff_id} onChange={e => setFormData({...formData, tariff_id: e.target.value})}>
                                            <option value="">Select Tariff</option>
                                            {tariffs.map(t => <option key={t.id} value={t.id}>{t.tariff_name} ({t.tariff_no})</option>)}
                                        </select>
                                    </div>
                                </div>

                                {/* Stock Sidebar in Modal */}
                                <div className="bg-slate-900 rounded-2xl p-6 text-white flex flex-col justify-center items-center text-center">
                                    <Scale size={40} className="text-blue-400 mb-2" />
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Available Stock</p>
                                    <h3 className="text-5xl font-black mt-1">{formData.mill_stock || 0} <span className="text-sm">KG</span></h3>
                                    <input type="number" className="mt-4 w-full bg-slate-800 border-none rounded-lg p-2 text-center text-sm" placeholder="Adj. Stock" value={formData.mill_stock} onChange={e => setFormData({...formData, mill_stock: e.target.value})} />
                                </div>
                            </div>

                            <div className="mt-10 pt-6 border-t flex justify-between">
                                {formData.id && (
                                    <button type="button" onClick={() => handleDelete(formData.id)} className="flex items-center gap-2 text-red-500 font-bold hover:bg-red-50 px-4 py-2 rounded-xl transition-all">
                                        <Trash2 size={18}/> DELETE RECORD
                                    </button>
                                )}
                                <div className="flex gap-4 ml-auto">
                                    <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-2 font-bold text-slate-500 hover:text-slate-800">CANCEL</button>
                                    <button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white px-10 py-3 rounded-xl font-black shadow-xl flex items-center gap-2">
                                        <Save size={18}/> {loading ? 'SAVING...' : 'SAVE PRODUCT'}
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

export default ProductMaster;