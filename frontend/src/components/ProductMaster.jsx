import React, { useState, useEffect, useMemo } from 'react';
import { mastersAPI } from '../service/api';
import { 
    Plus, Search, Edit, Trash2, X, ChevronLeft, 
    ChevronRight, Package, Settings, Box, 
    CheckSquare, Square, RefreshCw, Info, Save, Zap
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
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formData, setFormData] = useState(emptyState);
    const [loading, setLoading] = useState(false);

    // Search & Pagination
    const [searchField, setSearchField] = useState('product_name');
    const [searchValue, setSearchValue] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    useEffect(() => { 
        fetchRecords(); 
        fetchLookups();
    }, []);

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

    // Auto-fill logic when selecting Tariff
    const handleTariffChange = (tariffName) => {
        const selected = tariffs.find(t => t.tariff_name === tariffName);
        if (selected) {
            setFormData(prev => ({
                ...prev,
                tariff_sub_head: selected.tariff_name,
                printing_tariff_sub_head_no: selected.tariff_no, 
                product_type: selected.product_type,
                fibre: selected.fibre,
                commodity: selected.commodity || prev.commodity
            }));
        } else {
            setFormData(prev => ({ ...prev, tariff_sub_head: tariffName }));
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

    const handleEdit = (item) => {
        setFormData({ ...item });
        setIsModalOpen(true);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            formData.id 
                ? await mastersAPI.products.update(formData.id, formData) 
                : await mastersAPI.products.create(formData);
            fetchRecords();
            setIsModalOpen(false);
        } catch (err) { alert("Error saving."); }
        finally { setLoading(false); }
    };

    const filteredData = useMemo(() => {
        return list.filter(item => 
            String(item[searchField] || '').toLowerCase().includes(searchValue.toLowerCase())
        );
    }, [list, searchValue, searchField]);

    const currentItems = filteredData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    return (
        <div className="min-h-screen bg-slate-50 p-6 font-sans text-slate-900">
            {/* HEADER */}
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <Package className="text-blue-600" /> Product Master
                    </h1>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-loose">Yarn Specification Registry</p>
                </div>
                <button onClick={handleAddNew} className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-blue-200 active:scale-95 transition-all">
                    <Plus size={16} /> New Product
                </button>
            </div>

            {/* SEARCH */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm mb-6 flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input type="text" placeholder={`Search by ${searchField.replace('_', ' ')}...`} value={searchValue} onChange={(e) => setSearchValue(e.target.value)} className="w-full pl-12 pr-4 py-3 bg-slate-50 border-none rounded-xl text-sm font-bold outline-none" />
                </div>
                <select value={searchField} onChange={(e) => setSearchField(e.target.value)} className="bg-slate-50 px-6 py-3 rounded-xl text-[10px] font-black uppercase text-slate-500 border-none outline-none cursor-pointer">
                    <option value="product_name">Product Description</option>
                    <option value="product_code">Code</option>
                    <option value="spinning_count_name">Spinning Count</option>
                </select>
            </div>

            {/* MAIN TABLE - FOLLOWS IMAGE HEADERS */}
            <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-slate-900 text-slate-200">
                        <tr>
                            <th className="p-5 text-[11px] font-black uppercase tracking-widest border-r border-slate-800">Code</th>
                            <th className="p-5 text-[11px] font-black uppercase tracking-widest border-r border-slate-800">Product Description</th>
                            <th className="p-5 text-[11px] font-black uppercase tracking-widest border-r border-slate-800">Short Description</th>
                            <th className="p-5 text-[11px] font-black uppercase tracking-widest border-r border-slate-800">Spinning Count</th>
                            <th className="p-5 text-[11px] font-black uppercase tracking-widest border-r border-slate-800">Commodity</th>
                            <th className="p-5 text-[11px] font-black uppercase tracking-widest border-r border-slate-800">Packing Type</th>
                            <th className="p-5 text-[11px] font-black uppercase tracking-widest text-center">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {currentItems.map((item) => (
                            <tr key={item.id} onClick={() => handleEdit(item)} className="hover:bg-blue-50/50 cursor-pointer transition-colors font-semibold">
                                <td className="p-5 text-sm font-mono font-black text-blue-600 bg-slate-50/50">{item.product_code}</td>
                                <td className="p-5 text-sm uppercase text-slate-800 font-black">{item.product_name}</td>
                                <td className="p-5 text-xs text-slate-500">{item.short_description || '---'}</td>
                                <td className="p-5 text-xs font-black text-slate-600 uppercase">{item.spinning_count_name}</td>
                                <td className="p-5 text-xs text-slate-600 uppercase">{item.commodity}</td>
                                <td className="p-5">
                                    <span className="bg-slate-100 px-3 py-1 rounded-lg text-[10px] font-black uppercase text-slate-500 border">
                                        {item.packing_type || 'N/A'}
                                    </span>
                                </td>
                                <td className="p-5 text-center" onClick={e => e.stopPropagation()}>
                                    <div className="flex justify-center gap-2">
                                        <button onClick={() => handleEdit(item)} className="p-2 text-slate-400 hover:text-blue-600"><Edit size={16}/></button>
                                        <button onClick={() => mastersAPI.products.delete(item.id).then(fetchRecords)} className="p-2 text-slate-400 hover:text-red-500"><Trash2 size={16}/></button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* MODAL */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
                    <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-6xl my-8 overflow-hidden animate-in zoom-in duration-200">
                        <div className="bg-blue-600 p-8 flex justify-between items-center text-white">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-white/20 rounded-2xl"><Zap size={28}/></div>
                                <div>
                                    <h2 className="text-2xl font-black uppercase tracking-tight">{formData.id ? 'Modify Product' : 'New Technical Entry'}</h2>
                                    <p className="text-blue-100 text-[10px] font-black uppercase tracking-widest">ID: #{formData.product_code}</p>
                                </div>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="hover:bg-white/10 p-3 rounded-full"><X size={24}/></button>
                        </div>

                        <form onSubmit={handleSave} className="p-10 bg-slate-50/50">
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                                {/* IDENTITY */}
                                <div className="space-y-6 bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
                                    <div className="flex items-center gap-2 text-blue-600 border-b pb-4">
                                        <Info size={18} /> <span className="text-[11px] font-black uppercase tracking-widest text-slate-400">Core Identity</span>
                                    </div>
                                    <div className="space-y-4">
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black text-slate-400 uppercase">Product Code (Read Only)</label>
                                            <input readOnly className="w-full border-2 border-slate-50 p-3 rounded-xl font-mono text-sm font-black text-blue-600 bg-slate-50" value={formData.product_code} />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black text-slate-400 uppercase">Product Description *</label>
                                            <input required className="w-full border-2 border-slate-100 p-3 rounded-xl font-black text-slate-700 uppercase focus:border-blue-500 outline-none text-xs" value={formData.product_name} onChange={e => setFormData({...formData, product_name: e.target.value.toUpperCase()})} />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black text-slate-400 uppercase">Short Description</label>
                                            <input className="w-full border-2 border-slate-100 p-3 rounded-xl font-bold text-slate-500 uppercase text-xs" value={formData.short_description} onChange={e => setFormData({...formData, short_description: e.target.value.toUpperCase()})} />
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-black text-slate-400 uppercase">Commodity</label>
                                                <input className="w-full border-2 border-slate-100 p-3 rounded-xl font-black text-xs uppercase" value={formData.commodity} onChange={e => setFormData({...formData, commodity: e.target.value.toUpperCase()})} />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-black text-slate-400 uppercase">Comm. Code</label>
                                                <input className="w-full border-2 border-slate-100 p-3 rounded-xl font-mono text-xs font-black" value={formData.commodity_code} onChange={e => setFormData({...formData, commodity_code: e.target.value})} />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* TECHNICAL */}
                                <div className="space-y-6 bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
                                    <div className="flex items-center gap-2 text-emerald-600 border-b pb-4">
                                        <Settings size={18} /> <span className="text-[11px] font-black uppercase tracking-widest text-slate-400">Technical Specs</span>
                                    </div>
                                    <div className="space-y-4">
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black text-slate-400 uppercase">Tariff Sub Head (Master Lookup)</label>
                                            <select className="w-full border-2 border-slate-100 p-3 rounded-xl font-black text-[10px] uppercase text-blue-600 outline-none" value={formData.tariff_sub_head} onChange={e => handleTariffChange(e.target.value)}>
                                                <option value="">-- CHOOSE TARIFF --</option>
                                                {tariffs.map(t => <option key={t.id} value={t.tariff_name}>{t.tariff_name}</option>)}
                                            </select>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4 text-xs font-black">
                                            <div>
                                                <label className="text-[10px] text-slate-400 block uppercase">HSN No</label>
                                                <div className="p-3 bg-slate-50 border rounded-xl">{formData.printing_tariff_sub_head_no || '---'}</div>
                                            </div>
                                            <div>
                                                <label className="text-[10px] text-slate-400 block uppercase">Fibre</label>
                                                <div className="p-3 bg-slate-50 border rounded-xl uppercase">{formData.fibre || '---'}</div>
                                            </div>
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black text-slate-400 uppercase">Spinning Count Name</label>
                                            <input className="w-full border-2 border-slate-100 p-3 rounded-xl font-black text-xs text-blue-600 uppercase" value={formData.spinning_count_name} onChange={e => setFormData({...formData, spinning_count_name: e.target.value.toUpperCase()})} />
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-black text-slate-400 uppercase">Actual Count</label>
                                                <input className="w-full border-2 border-slate-100 p-3 rounded-xl font-black text-xs" value={formData.actual_count} onChange={e => setFormData({...formData, actual_count: e.target.value})} />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-black text-slate-400 uppercase">40s Factor</label>
                                                <input type="number" step="0.001" className="w-full border-2 border-slate-100 p-3 rounded-xl font-mono text-xs font-black" value={formData.converted_factor_40s} onChange={e => setFormData({...formData, converted_factor_40s: e.target.value})} />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* LOGISTICS (DARK) */}
                                <div className="space-y-6 bg-slate-900 p-8 rounded-[3rem] text-white shadow-2xl border border-white/5">
                                    <div className="flex items-center gap-2 text-blue-400 border-b border-white/10 pb-4">
                                        <Box size={18} /> <span className="text-[11px] font-black uppercase tracking-widest text-slate-500">Inventory Logic</span>
                                    </div>
                                    <div className="space-y-4">
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black text-slate-500 uppercase">Packing Type</label>
                                            <select className="w-full bg-slate-800 border-none p-3 rounded-xl text-xs font-black uppercase text-blue-200 outline-none" value={formData.packing_type} onChange={e => setFormData({...formData, packing_type: e.target.value})}>
                                                <option value="">-- SELECT PACKING --</option>
                                                {packingTypes.map(p => <option key={p.id} value={p.packing_type}>{p.packing_type}</option>)}
                                            </select>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-1">
                                                <label className="text-[9px] font-black text-slate-500 uppercase">Wt/Cone</label>
                                                <input type="number" step="0.001" className="w-full bg-slate-800 p-3 rounded-xl text-xs font-mono font-black" value={formData.wt_per_cone} onChange={e => setFormData({...formData, wt_per_cone: e.target.value})} />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[9px] font-black text-slate-500 uppercase">Cones/Pack</label>
                                                <input type="number" className="w-full bg-slate-800 p-3 rounded-xl text-xs font-mono font-black" value={formData.no_of_cones_per_pack} onChange={e => setFormData({...formData, no_of_cones_per_pack: e.target.value})} />
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4 pt-2 border-t border-white/5">
                                            <div className="space-y-1">
                                                <label className="text-[9px] font-black text-slate-500 uppercase">Nett Wt (KG)</label>
                                                <input type="number" step="0.001" className="w-full bg-slate-800 p-3 rounded-xl text-xs font-mono font-black text-emerald-400" value={formData.pack_nett_wt} onChange={e => setFormData({...formData, pack_nett_wt: e.target.value})} />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[9px] font-black text-slate-500 uppercase">Charity (₹)</label>
                                                <input type="number" className="w-full bg-slate-800 p-3 rounded-xl text-xs font-mono font-black" value={formData.charity_rs} onChange={e => setFormData({...formData, charity_rs: e.target.value})} />
                                            </div>
                                        </div>
                                        <div className="pt-2 flex items-center gap-3">
                                            <button type="button" onClick={() => setFormData({...formData, roundoff: !formData.roundoff})} className="flex items-center gap-2">
                                                {formData.roundoff ? <CheckSquare size={20} className="text-blue-400" /> : <Square size={20} className="text-slate-600" />}
                                                <span className="text-[10px] font-black uppercase text-slate-400">Round-Off Logic</span>
                                            </button>
                                        </div>
                                        <div className="mt-4 p-5 bg-blue-600/10 rounded-2xl border border-blue-500/20 flex justify-between items-center">
                                            <div className="flex flex-col">
                                                <span className="text-[10px] font-black text-blue-400 uppercase">Mill Stock</span>
                                                <span className="text-2xl font-black font-mono tracking-tighter text-blue-100">{formData.mill_stock} <small className="text-xs">KG</small></span>
                                            </div>
                                            <input type="number" className="w-20 bg-white/10 p-2 text-right text-xs font-black text-white outline-none rounded-lg" value={formData.mill_stock} onChange={e => setFormData({...formData, mill_stock: e.target.value})} />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-12 pt-8 border-t border-slate-200 flex justify-end gap-4">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-8 py-3 font-black text-[10px] uppercase text-slate-400 hover:text-slate-700">Cancel</button>
                                <button type="submit" className="bg-blue-600 text-white px-12 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-2xl active:scale-95 transition-all flex items-center gap-2">
                                    <Save size={18}/> Commit SKU
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProductMaster;