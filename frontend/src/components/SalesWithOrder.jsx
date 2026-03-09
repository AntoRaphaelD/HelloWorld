import React, { useState, useEffect, useMemo } from 'react';
import { mastersAPI, transactionsAPI } from '../service/api';
import { 
    Plus, Edit, Trash2, X, ChevronLeft, 
    ChevronRight, RefreshCw, Save, ShoppingCart, Search, Filter, 
    Square, CheckSquare, MinusCircle
} from 'lucide-react';

const SalesWithOrder = () => {
    const [list, setList] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [submitLoading, setSubmitLoading] = useState(false);
    
    const [isSelectionMode, setIsSelectionMode] = useState(false);
    const [selectedIds, setSelectedIds] = useState([]);
    
    const [searchField, setSearchField] = useState('order_no');
    const [searchCondition, setSearchCondition] = useState('Like');
    const [searchValue, setSearchValue] = useState('');

    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;
    const [activeTab, setActiveTab] = useState('head');

    const [parties, setParties] = useState([]);
    const [brokers, setBrokers] = useState([]);
    const [products, setProducts] = useState([]);

    const emptyHeader = {
        id: null,
        order_no: '',
        date: new Date().toISOString().split('T')[0],
        party_id: '',
        broker_id: '',
        place: '',
        is_cancelled: false,
        status: 'OPEN'
    };

    const emptyRow = {
        product_id: '',
        packing_type: '', 
        rate_cr: 0,          
        rate_imm: 0,      
        rate_per: 0,
        qty: 0,
        bag_wt: 0         
    };

    const [formData, setFormData] = useState(emptyHeader);
    const [gridRows, setGridRows] = useState([]);

    useEffect(() => {
        fetchMasters();
        fetchRecords();
    }, []);

    const fetchMasters = async () => {
        try {
            const [p, b, pr] = await Promise.all([
                mastersAPI.accounts.getAll(),
                mastersAPI.brokers.getAll(),
                mastersAPI.products.getAll()
            ]);
            setParties(p?.data?.data || []);
            setBrokers(b?.data?.data || []);
            setProducts(pr?.data?.data || []);
        } catch (err) { console.error(err); }
    };

    const fetchRecords = async () => {
        setLoading(true);
        try {
            const res = await transactionsAPI.orders.getAll();
            setList(res?.data?.data || []);
        } catch (err) { setList([]); } 
        finally { setLoading(false); }
    };

    const handleAddNew = () => {
        const nextOrderNo = (list.length + 1).toString();
        setFormData({ ...emptyHeader, order_no: nextOrderNo });
        setGridRows([{ ...emptyRow }]);
        setActiveTab('head');
        setIsModalOpen(true);
    };

    const handleRowClick = (item) => {
        if (isSelectionMode) {
            setSelectedIds(prev => prev.includes(item.id) ? prev.filter(id => id !== item.id) : [...prev, item.id]);
        } else {
            setFormData({ ...item });
            setGridRows(item.OrderDetails?.length > 0 ? item.OrderDetails.map(d => ({ ...d })) : [{ ...emptyRow }]);
            setActiveTab('head');
            setIsModalOpen(true);
        }
    };

    const updateGrid = (index, field, value) => {
        const updated = [...gridRows];
        if (field === 'product_id') {
            const product = products.find(p => String(p.id) === String(value));
            updated[index] = {
                ...updated[index],
                product_id: value,
                packing_type: product?.packing_type || '',
                bag_wt: product?.pack_nett_wt || 0,
            };
        } else {
            updated[index][field] = value;
        }
        setGridRows(updated);
    };

    const addNewRow = () => {
        setGridRows([...gridRows, { ...emptyRow }]);
    };

    const removeRow = (index) => {
        if (gridRows.length === 1) return;
        setGridRows(gridRows.filter((_, i) => i !== index));
    };

    const handleBulkDelete = async () => {
        if (selectedIds.length === 0) return;
        if (window.confirm(`Permanently delete ${selectedIds.length} orders?`)) {
            try {
                await Promise.all(selectedIds.map(id => transactionsAPI.orders.delete(id)));
                setSelectedIds([]);
                setIsSelectionMode(false);
                fetchRecords();
            } catch (err) { alert("Bulk delete failed."); }
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        if (!formData.party_id) return alert("Please select a Party");
        if (gridRows.every(r => !r.product_id)) return alert("At least one product row is required");
        
        setSubmitLoading(true);
        try {
            const payload = { 
                ...formData, 
                OrderDetails: gridRows.filter(r => r.product_id) 
            };
            if (formData.id) {
                await transactionsAPI.orders.update(formData.id, payload);
            } else {
                await transactionsAPI.orders.create(payload);
            }
            fetchRecords();
            setIsModalOpen(false);
        } catch (err) { 
            alert("Error saving order."); 
            console.error(err); 
        } finally { 
            setSubmitLoading(false); 
        }
    };

    const filteredData = useMemo(() => {
        let result = Array.isArray(list) ? [...list] : [];
        if (searchValue.trim()) {
            result = result.filter(item => {
                let val;
                if (searchField === 'party') {
                    val = item.Party?.account_name || '';
                } else {
                    val = item[searchField] || '';
                }
                const term = searchValue.toLowerCase().trim();
                return searchCondition === 'Equal' 
                    ? String(val).toLowerCase() === term 
                    : String(val).toLowerCase().includes(term);
            });
        }
        return result.sort((a, b) => b.id - a.id);
    }, [list, searchValue, searchField, searchCondition]);

    const currentItems = filteredData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
    const totalPages = Math.ceil(filteredData.length / itemsPerPage) || 1;

    const FormLabel = ({ children }) => (
        <label className="text-right text-base text-black pr-3 font-semibold self-center whitespace-nowrap">
            {children}
        </label>
    );

    return (
        <div className="min-h-screen bg-slate-100 p-6 font-sans">
            
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-black flex items-center gap-2">
                    <ShoppingCart className="text-blue-700" /> Sales Booking Master
                </h1>
                <div className="flex gap-2">
                    <button onClick={handleAddNew} className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg font-bold text-xs uppercase shadow-md transition-all flex items-center gap-1">
                        <Plus size={16} /> New Order
                    </button>
                    <button onClick={fetchRecords} className="p-2 border border-slate-200 rounded-lg bg-white">
                        <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
                    </button>
                </div>
            </div>

            {/* Search Bar */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm mb-6 flex flex-wrap items-end gap-4">
                <div className="flex-1 min-w-[180px]">
                    <label className="text-[10px] font-bold text-black uppercase mb-1 block">Search Field</label>
                    <select value={searchField} onChange={e => setSearchField(e.target.value)} className="w-full border border-slate-200 p-2 rounded-xl text-[13px] outline-none focus:ring-1 focus:ring-blue-500">
                        <option value="order_no">Order No</option>
                        <option value="party">Party Name</option>
                    </select>
                </div>
                <div className="flex-1 min-w-[150px]">
                    <label className="text-[10px] font-bold text-black uppercase mb-1 block">Condition</label>
                    <select value={searchCondition} onChange={e => setSearchCondition(e.target.value)} className="w-full border p-2 rounded-xl text-[13px] outline-none">
                        <option value="Like">Like</option>
                        <option value="Equal">Equal</option>
                    </select>
                </div>
                <div className="flex-[2] min-w-[280px]">
                    <label className="text-[10px] font-bold text-black uppercase mb-1 block">Value</label>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-black" size={16} />
                        <input type="text" value={searchValue} onChange={e => setSearchValue(e.target.value)} className="w-full border pl-9 pr-4 py-2 rounded-xl text-[13px] outline-none focus:ring-1 focus:ring-blue-500" placeholder="Live search..." />
                    </div>
                </div>

                {!isSelectionMode ? (
                    <button onClick={() => setIsSelectionMode(true)} className="border border-blue-200 bg-blue-50 text-blue-600 px-8 py-2 rounded-xl text-base font-bold hover:bg-blue-100 shadow-sm transition-all">
                        Select
                    </button>
                ) : (
                    <div className="flex gap-2">
                        <button onClick={() => { setIsSelectionMode(false); setSelectedIds([]); }} className="border border-slate-200 px-6 py-2 rounded-xl text-base font-bold text-black hover:bg-slate-50">
                            Clear
                        </button>
                        <button onClick={handleBulkDelete} disabled={selectedIds.length === 0} className="bg-red-500 text-white px-6 py-2 rounded-xl text-base font-bold shadow-md disabled:opacity-50 flex items-center gap-1">
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
                            <th className="p-4">Order No</th>
                            <th className="p-4">Order Date</th>
                            <th className="p-4">Party Name</th>
                            <th className="p-4">Broker</th>
                            {!isSelectionMode && <th className="p-4 w-10"></th>}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {loading ? (
                            <tr><td colSpan={5} className="p-12 text-center text-black">Loading...</td></tr>
                        ) : currentItems.length > 0 ? currentItems.map(item => (
                            <tr 
                                key={item.id} 
                                className={`hover:bg-blue-50 cursor-pointer ${selectedIds.includes(item.id) ? 'bg-blue-100/50' : ''}`} 
                                onClick={() => handleRowClick(item)}
                            >
                                {isSelectionMode && (
                                    <td className="p-4 text-center">
                                        {selectedIds.includes(item.id) ? <CheckSquare size={18} className="text-blue-600 mx-auto"/> : <Square size={18} className="text-black mx-auto"/>}
                                    </td>
                                )}
                                <td className="p-4 text-base font-bold text-blue-600 font-mono">{item.order_no}</td>
                                <td className="p-4 text-base text-black">{item.date || '—'}</td>
                                <td className="p-4 text-base font-semibold text-black uppercase">{item.Party?.account_name || '—'}</td>
                                <td className="p-4 text-base text-black uppercase">{item.Broker?.broker_name || 'DIRECT'}</td>
                                {!isSelectionMode && <td className="p-4 text-black"><Edit size={16} /></td>}
                            </tr>
                        )) : (
                            <tr><td colSpan={5} className="p-12 text-center text-black">No orders found</td></tr>
                        )}
                    </tbody>
                </table>

                <div className="p-3 bg-slate-50 border-t flex items-center justify-between text-sm">
                    <span className="text-black font-medium">Page {currentPage} of {totalPages}</span>
                    <div className="flex gap-1">
                        <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} className="p-1.5 border rounded bg-white disabled:opacity-40"><ChevronLeft size={16}/></button>
                        <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)} className="p-1.5 border rounded bg-white disabled:opacity-40"><ChevronRight size={16}/></button>
                    </div>
                </div>
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
                    <div className="bg-[#cfe2ff] w-full max-w-[1100px] rounded-xl shadow-2xl overflow-hidden border border-white animate-in zoom-in duration-200">
                        <div className="bg-[#6495ed] p-5 flex justify-between items-center text-white border-b border-white/20">
                            <div>
                                <h2 className="text-xl font-medium tracking-wide">Sales Booking Master</h2>
                                <p className="text-blue-50 text-base mt-1">Add / Modify Sales Order</p>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="hover:bg-white/20 p-1 rounded-full transition-colors">
                                <X size={28} />
                            </button>
                        </div>

                        {/* Tabs */}
                        <div className="flex bg-[#e8f1ff] border-b border-blue-200">
                            <button 
                                onClick={() => setActiveTab('head')} 
                                className={`flex-1 py-3 text-base font-semibold transition-all ${activeTab === 'head' ? 'bg-[#cfe2ff] text-blue-900 border-b-4 border-blue-600' : 'text-black hover:bg-white/60'}`}
                            >
                                Order Header
                            </button>
                            <button 
                                onClick={() => setActiveTab('detail')} 
                                className={`flex-1 py-3 text-base font-semibold transition-all ${activeTab === 'detail' ? 'bg-[#cfe2ff] text-blue-900 border-b-4 border-blue-600' : 'text-black hover:bg-white/60'}`}
                            >
                                Order Details
                            </button>
                        </div>

                        <div className="p-8 bg-[#cfe2ff]">
                            {activeTab === 'head' ? (
                                <div className="space-y-4 max-w-4xl mx-auto bg-white p-6 rounded-lg shadow-sm">
                                    <div className="grid grid-cols-12 items-center gap-4">
                                        <div className="col-span-3 flex justify-end"><FormLabel>Order No.</FormLabel></div>
                                        <div className="col-span-4">
                                            <input 
                                                type="text" 
                                                readOnly 
                                                className="w-full p-2 border border-gray-400 bg-black text-white font-bold font-mono text-base outline-none cursor-default" 
                                                value={formData.order_no} 
                                            />
                                        </div>
                                        <div className="col-span-5 flex items-center gap-6">
                                            <FormLabel>Date</FormLabel>
                                            <input 
                                                type="date" 
                                                className="w-44 p-2 border border-gray-400 bg-white text-base outline-none focus:border-blue-500" 
                                                value={formData.date} 
                                                onChange={e => setFormData({...formData, date: e.target.value})} 
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-12 items-center gap-4">
                                        <div className="col-span-3 flex justify-end"><FormLabel>Party</FormLabel></div>
                                        <div className="col-span-9">
                                            <select 
                                                className="w-full p-2 border border-gray-400 bg-white uppercase text-base outline-none focus:border-blue-500" 
                                                value={formData.party_id} 
                                                onChange={e => setFormData({...formData, party_id: e.target.value})}
                                            >
                                                <option value="">— Select Customer —</option>
                                                {parties.map(p => (
                                                    <option key={p.id} value={p.id}>{p.account_name}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-12 items-center gap-4">
                                        <div className="col-span-3 flex justify-end"><FormLabel>Broker</FormLabel></div>
                                        <div className="col-span-5">
                                            <select 
                                                className="w-full p-2 border border-gray-400 bg-white uppercase text-base outline-none focus:border-blue-500" 
                                                value={formData.broker_id} 
                                                onChange={e => setFormData({...formData, broker_id: e.target.value})}
                                            >
                                                <option value="">— Direct / No Broker —</option>
                                                {brokers.map(b => (
                                                    <option key={b.id} value={b.id}>{b.broker_name}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="col-span-4 flex items-center gap-4 justify-end">
                                            <input 
                                                type="checkbox" 
                                                id="cancelled" 
                                                checked={formData.is_cancelled} 
                                                onChange={e => setFormData({...formData, is_cancelled: e.target.checked})} 
                                                className="w-5 h-5 accent-red-600" 
                                            />
                                            <label htmlFor="cancelled" className="text-base font-medium text-red-700">Cancelled</label>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-12 items-center gap-4">
                                        <div className="col-span-3 flex justify-end"><FormLabel>Place</FormLabel></div>
                                        <div className="col-span-9">
                                            <input 
                                                type="text" 
                                                className="w-full p-2 border border-gray-400 bg-white uppercase text-base outline-none focus:border-blue-500" 
                                                value={formData.place} 
                                                onChange={e => setFormData({...formData, place: e.target.value.toUpperCase()})} 
                                            />
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="bg-white rounded-lg shadow-sm border border-slate-300 overflow-hidden">
                                    <div className="overflow-x-auto max-h-[500px]">
                                        <table className="w-full border-collapse">
                                            <thead className="bg-blue-700 text-white sticky top-0 z-10">
                                                <tr>
                                                    <th className="p-3 text-left w-10"></th>
                                                    <th className="p-3 text-left min-w-[320px]">Product</th>
                                                    <th className="p-3 text-center w-32">Packing</th>
                                                    <th className="p-3 text-right w-28">Rate Cr</th>
                                                    <th className="p-3 text-right w-28">Rate Imm</th>
                                                    <th className="p-3 text-center w-20">Per</th>
                                                    <th className="p-3 text-right w-28">Qty</th>
                                                    <th className="p-3 text-right w-28">Bag Wt</th>
                                                    <th className="p-3 text-center w-12"></th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-200">
                                                {gridRows.map((row, idx) => (
                                                    <tr key={idx} className="hover:bg-blue-50/50">
                                                        <td className="p-3 text-center text-blue-500 font-bold">{idx + 1}</td>
                                                        <td className="p-2">
                                                            <select 
                                                                value={row.product_id} 
                                                                onChange={e => updateGrid(idx, 'product_id', e.target.value)} 
                                                                className="w-full p-2 border border-gray-300 rounded text-base outline-none focus:border-blue-500"
                                                            >
                                                                <option value="">— Select Product —</option>
                                                                {products.map(p => (
                                                                    <option key={p.id} value={p.id}>{p.product_name}</option>
                                                                ))}
                                                            </select>
                                                        </td>
                                                        <td className="p-3 text-center text-base font-medium text-black">
                                                            {row.packing_type || '—'}
                                                        </td>
                                                        <td className="p-2">
                                                            <input 
                                                                type="number" 
                                                                step="0.01" 
                                                                value={row.rate_cr} 
                                                                onChange={e => updateGrid(idx, 'rate_cr', e.target.value)} 
                                                                className="w-full p-2 text-right border border-gray-300 rounded text-base focus:border-blue-500" 
                                                            />
                                                        </td>
                                                        <td className="p-2">
                                                            <input 
                                                                type="number" 
                                                                step="0.01" 
                                                                value={row.rate_imm} 
                                                                onChange={e => updateGrid(idx, 'rate_imm', e.target.value)} 
                                                                className="w-full p-2 text-right border border-gray-300 rounded text-base focus:border-blue-500" 
                                                            />
                                                        </td>
                                                        <td className="p-2">
                                                            <input 
                                                                type="text" 
                                                                value={row.rate_per} 
                                                                onChange={e => updateGrid(idx, 'rate_per', e.target.value)} 
                                                                className="w-full p-2 text-center border border-gray-300 rounded text-base uppercase focus:border-blue-500" 
                                                            />
                                                        </td>
                                                        <td className="p-2">
                                                            <input 
                                                                type="number" 
                                                                value={row.qty} 
                                                                onChange={e => updateGrid(idx, 'qty', e.target.value)} 
                                                                className="w-full p-2 text-right border border-gray-300 rounded text-base font-bold text-emerald-700 focus:border-blue-500" 
                                                            />
                                                        </td>
                                                        <td className="p-3 text-right text-base font-medium text-black">
                                                            {row.bag_wt || '0.000'}
                                                        </td>
                                                        <td className="p-2 text-center">
                                                            <button 
                                                                onClick={() => removeRow(idx)} 
                                                                disabled={gridRows.length === 1}
                                                                className="text-red-500 hover:text-red-700 disabled:opacity-40 transition-colors"
                                                            >
                                                                <MinusCircle size={20} />
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>

                                    <button 
                                        onClick={addNewRow} 
                                        className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white text-base font-bold transition-colors flex items-center justify-center gap-2"
                                    >
                                        <Plus size={18} /> Add New Product Row
                                    </button>
                                </div>
                            )}

                            {/* Footer Actions */}
                            <div className="flex justify-end gap-4 mt-10">
                                <button 
                                    type="submit" 
                                    onClick={handleSave} 
                                    disabled={submitLoading} 
                                    className="flex items-center gap-2 bg-slate-50 border border-slate-400 px-10 py-2.5 text-base font-bold shadow-sm hover:bg-white active:scale-95 transition-all"
                                >
                                    <span className="text-blue-700 p-1 border border-blue-100 bg-white rounded"><Save size={16}/></span>
                                    {formData.id ? 'Update Order' : 'Create Order'}
                                </button>
                                <button 
                                    onClick={() => setIsModalOpen(false)} 
                                    className="flex items-center gap-2 bg-slate-50 border border-slate-400 px-10 py-2.5 text-base font-bold shadow-sm hover:bg-white active:scale-95 transition-all"
                                >
                                    <span className="text-red-600 font-black p-1 border border-red-100 bg-white rounded">X</span> Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SalesWithOrder;