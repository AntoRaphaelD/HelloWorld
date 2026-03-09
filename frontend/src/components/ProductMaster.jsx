import React, { useState, useEffect, useMemo } from 'react';
import { mastersAPI } from '../service/api';
import { 
    Plus, Edit, Trash2, X, ChevronLeft, 
    ChevronRight, RefreshCw, Save, 
    Package, Filter, Search, CheckSquare, Square
} from 'lucide-react';

const ProductMaster = () => {
    const emptyState = { 
        id: null,
        product_code: '', 
        product_name: '', 
        short_description: '', 
        commodity: '', 
        commodity_code: '', 
        packing_type: '', 
        fibre: '', 
        wt_per_cone: 0, 
        charity_rs: 0, 
        no_of_cones_per_pack: 0, 
        other_receipt: 0, 
        pack_nett_wt: 0, 
        tariff_sub_head: '', 
        printing_tariff_sub_head_no: '', 
        printing_tariff_desc: '',        
        product_type: '', 
        spinning_count_name: '', 
        converted_factor_40s: 0, 
        actual_count: '', 
        roundoff: false,
        mill_stock: 0
    };

    const [list, setList] = useState([]);
    const [tariffs, setTariffs] = useState([]); 
    const [packingTypes, setPackingTypes] = useState([]); 
    const [formData, setFormData] = useState(emptyState);
    const [loading, setLoading] = useState(false);
    const [submitLoading, setSubmitLoading] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const [isSelectionMode, setIsSelectionMode] = useState(false);
    const [selectedIds, setSelectedIds] = useState([]);
    const [searchField, setSearchField] = useState('product_name');
    const [searchCondition, setSearchCondition] = useState('Like');
    const [searchValue, setSearchValue] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    // Auto-calculate pack nett weight
    useEffect(() => {
        const wt = parseFloat(formData.wt_per_cone) || 0;
        const cones = parseFloat(formData.no_of_cones_per_pack) || 0;
        setFormData(prev => ({ ...prev, pack_nett_wt: (wt * cones).toFixed(3) }));
    }, [formData.wt_per_cone, formData.no_of_cones_per_pack]);

    useEffect(() => { fetchRecords(); fetchLookups(); }, []);

    const fetchRecords = async () => {
        setLoading(true);
        try {
            const res = await mastersAPI.products.getAll();
            const data = res?.data?.data || res?.data || [];
            setList(Array.isArray(data) ? data : []);
        } catch (err) { setList([]); } 
        finally { setLoading(false); }
    };

    const fetchLookups = async () => {
        try {
            const [tariffRes, packingRes] = await Promise.all([
                mastersAPI.tariffs.getAll(),
                mastersAPI.packingTypes.getAll()
            ]);
            setTariffs(tariffRes?.data?.data || tariffRes?.data || []);
            setPackingTypes(packingRes?.data?.data || packingRes?.data || []);
        } catch (err) { console.error(err); }
    };

    const filteredData = useMemo(() => {
        let result = Array.isArray(list) ? [...list] : [];
        if (searchValue.trim()) {
            result = result.filter(item => {
                const itemValue = String(item[searchField] || "").toLowerCase();
                const term = searchValue.toLowerCase().trim();
                return searchCondition === 'Equal' ? itemValue === term : itemValue.includes(term);
            });
        }
        return result.sort((a, b) => b.id - a.id);
    }, [list, searchValue, searchField, searchCondition]);

    const currentItems = filteredData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
    const totalPages = Math.ceil(filteredData.length / itemsPerPage) || 1;

    const handleTariffChange = (tariffCode) => {
        const selected = tariffs.find(t => t.tariff_code === tariffCode);
        if (selected) {
            setFormData(prev => ({
                ...prev,
                tariff_sub_head: selected.tariff_code,
                product_type: selected.product_type,
                fibre: selected.fibre,
                commodity: selected.commodity || prev.commodity,
                printing_tariff_desc: selected.tariff_no
            }));
        } else {
            setFormData(prev => ({ ...prev, tariff_sub_head: tariffCode }));
        }
    };

    const handleAddNew = () => {
        const maxCode = list.reduce((max, item) => {
            const num = parseInt(item.product_code, 10);
            return !isNaN(num) ? Math.max(max, num) : max;
        }, 0);
        setFormData({ ...emptyState, product_code: (maxCode + 1).toString() });
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
        if (window.confirm(`Permanently delete ${selectedIds.length} products?`)) {
            try {
                await Promise.all(selectedIds.map(id => mastersAPI.products.delete(id)));
                setSelectedIds([]);
                setIsSelectionMode(false);
                fetchRecords();
            } catch (err) { alert("Delete failed"); }
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        if (!formData.product_name?.trim()) return alert("Product Name is required");
        setSubmitLoading(true);
        try {
            if (formData.id) await mastersAPI.products.update(formData.id, formData);
            else await mastersAPI.products.create(formData);
            setIsModalOpen(false);
            fetchRecords();
        } catch (err) { alert("Error saving."); }
        finally { setSubmitLoading(false); }
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
                    <Package className="text-blue-700" /> Product Master
                </h1>
                <div className="flex gap-2">
                    <button onClick={handleAddNew} className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg font-bold text-xs uppercase shadow-md transition-all flex items-center gap-1">
                        <Plus size={16} /> New Product
                    </button>
                    <button onClick={fetchRecords} className="p-2 border border-slate-200 rounded-lg bg-white">
                        <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
                    </button>
                </div>
            </div>

            {/* Search Bar */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm mb-6 flex flex-wrap items-end gap-4">
                <div className="flex-1 min-w-[180px]">
                    <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Search Field</label>
                    <select value={searchField} onChange={e => setSearchField(e.target.value)} className="w-full border border-slate-200 p-2 rounded-xl text-[13px] outline-none focus:ring-1 focus:ring-blue-500">
                        <option value="product_name">Product Description</option>
                        <option value="product_code">Product Code</option>
                        <option value="commodity">Commodity</option>
                    </select>
                </div>
                <div className="flex-1 min-w-[150px]">
                    <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Condition</label>
                    <select value={searchCondition} onChange={e => setSearchCondition(e.target.value)} className="w-full border p-2 rounded-xl text-[13px] outline-none">
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
                            className="w-full border pl-9 pr-4 py-2 rounded-xl text-[13px] outline-none focus:ring-1 focus:ring-blue-500 font-semibold" 
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
                            <th className="p-4">Code</th>
                            <th className="p-4">Product Description</th>
                            <th className="p-4">Short Description</th>
                            <th className="p-4">Spinning Count</th>
                            <th className="p-4">Commodity</th>
                            <th className="p-4">Packing Type</th>
                            {!isSelectionMode && <th className="p-4 w-10"></th>}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {loading ? (
                            <tr><td colSpan={7} className="p-12 text-center text-slate-400">Loading products...</td></tr>
                        ) : currentItems.length > 0 ? currentItems.map(item => (
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
                                <td className="p-4 text-base font-bold text-blue-600 font-mono">{item.product_code}</td>
                                <td className="p-4 text-base font-semibold text-slate-700">{item.product_name}</td>
                                <td className="p-4 text-base text-slate-600 uppercase">{item.short_description || '—'}</td>
                                <td className="p-4 text-base font-bold text-amber-700">{item.spinning_count_name || '—'}</td>
                                <td className="p-4 text-base text-slate-600">{item.commodity || '—'}</td>
                                <td className="p-4 text-base font-semibold text-slate-500">{item.packing_type || '—'}</td>
                                {!isSelectionMode && <td className="p-4 text-slate-300"><Edit size={16} /></td>}
                            </tr>
                        )) : (
                            <tr><td colSpan={7} className="p-12 text-center text-slate-400">No products found</td></tr>
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

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
                    <div className="bg-[#cfe2ff] w-full max-w-[1000px] rounded shadow-2xl overflow-hidden border border-white animate-in zoom-in duration-200">
                        
                        <div className="bg-[#6495ed] p-5 flex justify-between items-center text-white border-b border-white/20">
                            <div>
                                <h2 className="text-xl font-medium tracking-wide">Product Master</h2>
                                <p className="text-blue-50 text-base mt-1">Add / Modify Product details</p>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="hover:bg-white/10 p-1 rounded-full"><X size={24}/></button>
                        </div>

                        <div className="p-8">
                            <form onSubmit={handleSave} className="space-y-2">
                                <div className="grid grid-cols-12 gap-x-6 gap-y-2">

                                    {/* Row 1 */}
                                    <div className="col-span-3 flex justify-end items-center"><FormLabel>Product Code</FormLabel></div>
                                    <div className="col-span-3">
                                        <input type="text" readOnly className="w-32 p-1 border border-gray-400 bg-black text-white font-bold outline-none cursor-default font-mono text-base" value={formData.product_code} />
                                    </div>
                                    <div className="col-span-6 flex items-center gap-3 pl-4">
                                        <input type="checkbox" id="rnd" checked={formData.roundoff} onChange={e => setFormData({...formData, roundoff: e.target.checked})} className="w-5 h-5 accent-blue-600" />
                                        <label htmlFor="rnd" className="text-base font-medium text-slate-700">Roundoff</label>
                                    </div>

                                    {/* Row 2 */}
                                    <div className="col-span-3 flex justify-end"><FormLabel>Product Name</FormLabel></div>
                                    <div className="col-span-5">
                                        <input type="text" required className="w-full p-1 border border-gray-400 bg-white uppercase text-base font-semibold outline-none focus:border-blue-500" value={formData.product_name} onChange={e => setFormData({...formData, product_name: e.target.value.toUpperCase()})} />
                                    </div>
                                    <div className="col-span-1 flex justify-end"><FormLabel>Commodity</FormLabel></div>
                                    <div className="col-span-3">
                                        <select className="w-full p-1 border border-gray-400 bg-white text-base outline-none focus:border-blue-500" value={formData.commodity} onChange={e => setFormData({...formData, commodity: e.target.value})}>
                                            <option value="">-- Choose --</option>
                                            <option value="CONE YARN">CONE YARN</option>
                                            <option value="BEAM">BEAM</option>
                                        </select>
                                    </div>

                                    {/* Row 3 */}
                                    <div className="col-span-3 flex justify-end"><FormLabel>Short Description</FormLabel></div>
                                    <div className="col-span-5">
                                        <input type="text" className="w-full p-1 border border-gray-400 bg-white uppercase text-base outline-none focus:border-blue-500" value={formData.short_description} onChange={e => setFormData({...formData, short_description: e.target.value.toUpperCase()})} />
                                    </div>
                                    <div className="col-span-1 flex justify-end"><FormLabel>Commodity Code</FormLabel></div>
                                    <div className="col-span-3">
                                        <input type="text" className="w-full p-1 border border-gray-400 bg-white text-base outline-none focus:border-blue-500" value={formData.commodity_code} onChange={e => setFormData({...formData, commodity_code: e.target.value})} />
                                    </div>

                                    {/* Row 4 */}
                                    <div className="col-span-3 flex justify-end"><FormLabel>Packing Type</FormLabel></div>
                                    <div className="col-span-5">
                                        <select className="w-full p-1 border border-gray-400 bg-white text-base outline-none focus:border-blue-500" value={formData.packing_type} onChange={e => setFormData({...formData, packing_type: e.target.value})}>
                                            <option value="">-- Select --</option>
                                            {packingTypes.map(p => <option key={p.id} value={p.packing_type}>{p.packing_type}</option>)}
                                        </select>
                                    </div>
                                    <div className="col-span-1 flex justify-end"><FormLabel>Fibre</FormLabel></div>
                                    <div className="col-span-3">
                                        <select className="w-full p-1 border border-gray-400 bg-white text-base outline-none focus:border-blue-500" value={formData.fibre} onChange={e => setFormData({...formData, fibre: e.target.value})}>
                                            <option value="">-- Choose --</option>
                                            <option value="COTTON">COTTON</option>
                                            <option value="POLYESTER">POLYESTER</option>
                                        </select>
                                    </div>

                                    {/* Row 5 */}
                                    <div className="col-span-3 flex justify-end"><FormLabel>Wt. per Cone / Bundle</FormLabel></div>
                                    <div className="col-span-5">
                                        <input type="number" step="0.001" className="w-32 p-1 border border-gray-400 bg-white text-base text-right outline-none focus:border-blue-500" value={formData.wt_per_cone} onChange={e => setFormData({...formData, wt_per_cone: e.target.value})} />
                                    </div>
                                    <div className="col-span-1 flex justify-end"><FormLabel>Charity Rs.</FormLabel></div>
                                    <div className="col-span-3">
                                        <input type="number" className="w-full p-1 border border-gray-400 bg-white text-base text-right outline-none focus:border-blue-500" value={formData.charity_rs} onChange={e => setFormData({...formData, charity_rs: e.target.value})} />
                                    </div>

                                    {/* Row 6 */}
                                    <div className="col-span-3 flex justify-end"><FormLabel>No. of Cones / Pack</FormLabel></div>
                                    <div className="col-span-5">
                                        <input type="number" className="w-32 p-1 border border-gray-400 bg-white text-base text-right outline-none focus:border-blue-500" value={formData.no_of_cones_per_pack} onChange={e => setFormData({...formData, no_of_cones_per_pack: e.target.value})} />
                                    </div>
                                    <div className="col-span-1 flex justify-end"><FormLabel>Other Receipt</FormLabel></div>
                                    <div className="col-span-3">
                                        <input type="number" className="w-full p-1 border border-gray-400 bg-white text-base text-right outline-none focus:border-blue-500" value={formData.other_receipt} onChange={e => setFormData({...formData, other_receipt: e.target.value})} />
                                    </div>

                                    {/* Row 7 */}
                                    <div className="col-span-3 flex justify-end"><FormLabel>Pack Nett Wt.</FormLabel></div>
                                    <div className="col-span-9">
                                        <input type="text" readOnly className="w-32 p-1 border border-gray-400 bg-gray-100 text-base font-mono outline-none cursor-default" value={formData.pack_nett_wt} />
                                    </div>

                                    {/* Row 8 - Tariff */}
                                    <div className="col-span-3 flex justify-end"><FormLabel>Tariff Sub Head</FormLabel></div>
                                    <div className="col-span-9 flex gap-2">
                                        <input type="text" className="w-32 p-1 border border-gray-400 bg-white text-base outline-none focus:border-blue-500 font-mono" value={formData.tariff_sub_head} onChange={e => handleTariffChange(e.target.value)} />
                                        <select className="flex-1 p-1 border border-gray-400 bg-white text-base outline-none focus:border-blue-500" value={formData.tariff_sub_head} onChange={e => handleTariffChange(e.target.value)}>
                                            <option value="">-- Choose from master --</option>
                                            {tariffs.map(t => <option key={t.id} value={t.tariff_code}>{t.tariff_name}</option>)}
                                        </select>
                                    </div>

                                    {/* Row 9 - Printing Tariff */}
                                    <div className="col-span-3 flex justify-end"><FormLabel>Printing Tariff No.</FormLabel></div>
                                    <div className="col-span-9 flex gap-2">
                                        <input type="text" className="w-32 p-1 border border-gray-400 bg-white text-base outline-none focus:border-blue-500" value={formData.printing_tariff_sub_head_no} onChange={e => setFormData({...formData, printing_tariff_sub_head_no: e.target.value})} />
                                        <input type="text" className="flex-1 p-1 border border-gray-400 bg-white text-base outline-none focus:border-blue-500" value={formData.printing_tariff_desc} onChange={e => setFormData({...formData, printing_tariff_desc: e.target.value})} />
                                    </div>

                                    {/* Row 10 */}
                                    <div className="col-span-3 flex justify-end"><FormLabel>Product Type</FormLabel></div>
                                    <div className="col-span-9">
                                        <input type="text" className="w-48 p-1 border border-gray-400 bg-white uppercase text-base outline-none focus:border-blue-500" value={formData.product_type} onChange={e => setFormData({...formData, product_type: e.target.value.toUpperCase()})} />
                                    </div>

                                    {/* Row 11 */}
                                    <div className="col-span-3 flex justify-end"><FormLabel>Spinning Count Name</FormLabel></div>
                                    <div className="col-span-9">
                                        <input type="text" className="w-full p-1 border border-gray-400 bg-white uppercase text-base outline-none focus:border-blue-500" value={formData.spinning_count_name} onChange={e => setFormData({...formData, spinning_count_name: e.target.value.toUpperCase()})} />
                                    </div>

                                    {/* Row 12 */}
                                    <div className="col-span-3 flex justify-end"><FormLabel>40's Converted Factor</FormLabel></div>
                                    <div className="col-span-9">
                                        <input type="number" step="0.001" className="w-32 p-1 border border-gray-400 bg-white text-base text-right outline-none focus:border-blue-500" value={formData.converted_factor_40s} onChange={e => setFormData({...formData, converted_factor_40s: e.target.value})} />
                                    </div>

                                    {/* Row 13 */}
                                    <div className="col-span-3 flex justify-end"><FormLabel>Actual Count</FormLabel></div>
                                    <div className="col-span-9">
                                        <input type="text" className="w-32 p-1 border border-gray-400 bg-white text-base outline-none focus:border-blue-500 font-mono" value={formData.actual_count} onChange={e => setFormData({...formData, actual_count: e.target.value})} />
                                    </div>
                                </div>

                                {/* Footer Buttons */}
                                <div className="flex justify-between items-center pt-8">
                                    <div>
                                        {formData.id && (
                                            <button 
                                                type="button"
                                                onClick={() => {
                                                    if (window.confirm("Purge this product record permanently?")) {
                                                        mastersAPI.products.delete(formData.id)
                                                            .then(fetchRecords)
                                                            .then(() => setIsModalOpen(false));
                                                    }
                                                }}
                                                className="text-rose-600 hover:text-rose-700 text-base font-semibold underline hover:no-underline"
                                            >
                                                Purge Record
                                            </button>
                                        )}
                                    </div>
                                    <div className="flex gap-4">
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
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProductMaster;