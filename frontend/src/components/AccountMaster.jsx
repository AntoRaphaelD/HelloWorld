import React, { useState, useEffect, useMemo } from 'react';
import { mastersAPI } from '../service/api';
import { 
    Plus, Edit, Trash2, X, ChevronLeft, 
    ChevronRight, RefreshCw, Save, Building2, Search, Filter, 
    Square, CheckSquare
} from 'lucide-react';

const AccountMaster = () => {
    // --- 1. State Management ---
    const [list, setList] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [submitLoading, setSubmitLoading] = useState(false);
    
    const [isSelectionMode, setIsSelectionMode] = useState(false);
    const [selectedIds, setSelectedIds] = useState([]);
    
    const [searchField, setSearchField] = useState('account_name');
    const [searchCondition, setSearchCondition] = useState('Like');
    const [searchValue, setSearchValue] = useState('');

    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    const emptyAccount = {
        id: null, 
        account_code: '', 
        account_name: '', 
        account_group: 'DEBTORS - YARN SALES', 
        place: '', 
        // 3-Line UI States
        addr1: '', addr2: '', addr3: '',
        del1: '', del2: '', del3: '',
        pincode: '', 
        state: '',
        tin_no: '', 
        cst_no: '', 
        phone_no: '', 
        email: '',
        fax: '', 
        website: '', 
        account_no: '',                    
        contact_person: '', 
        cell_no: '', 
        gst_no: '',
        opening_credit: 0, 
        opening_debit: 0
    };

    const [formData, setFormData] = useState(emptyAccount);

    // --- 2. Split/Join Logic for 3-Line Address ---
    const mapDbToUi = (item) => {
        const addrLines = (item.address || '').split('\n');
        const delLines = (item.delivery_address || '').split('\n');
        return {
            ...item,
            addr1: addrLines[0] || '', addr2: addrLines[1] || '', addr3: addrLines[2] || '',
            del1: delLines[0] || '', del2: delLines[1] || '', del3: delLines[2] || ''
        };
    };

    const mapUiToDb = (data) => {
        return {
            ...data,
            address: `${data.addr1}\n${data.addr2}\n${data.addr3}`.trim(),
            delivery_address: `${data.del1}\n${data.del2}\n${data.del3}`.trim()
        };
    };

    // --- 3. Lifecycle & API ---
    useEffect(() => { fetchRecords(); }, []);

    const fetchRecords = async () => {
        setLoading(true);
        try {
            const res = await mastersAPI.accounts.getAll();
            const rawData = res?.data?.data || res?.data || [];
            setList(Array.isArray(rawData) ? rawData : []);
        } catch (err) { setList([]); } finally { setLoading(false); }
    };

    const handleAddNew = () => {
        const safeList = Array.isArray(list) ? list : [];
        const maxCode = safeList.reduce((max, item) => {
            const num = parseInt(item.account_code, 10);
            return !isNaN(num) ? Math.max(max, num) : max;
        }, 0);
        setFormData({ ...emptyAccount, account_code: (maxCode + 1).toString() });
        setIsModalOpen(true);
    };

    const handleRowClick = (item) => {
        if (isSelectionMode) {
            setSelectedIds(prev => prev.includes(item.id) ? prev.filter(id => id !== item.id) : [...prev, item.id]);
        } else {
            setFormData(mapDbToUi(item));
            setIsModalOpen(true);
        }
    };

    const handleBulkDelete = async () => {
        if (selectedIds.length === 0) return;
        if (window.confirm(`Permanently delete ${selectedIds.length} accounts?`)) {
            try {
                await Promise.all(selectedIds.map(id => mastersAPI.accounts.delete(id)));
                setSelectedIds([]);
                setIsSelectionMode(false);
                fetchRecords();
            } catch (err) { alert("Delete failed."); }
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setSubmitLoading(true);
        try {
            const payload = mapUiToDb(formData);
            if (formData.id) await mastersAPI.accounts.update(formData.id, payload);
            else await mastersAPI.accounts.create(payload);
            fetchRecords();
            setIsModalOpen(false);
        } catch (err) { alert("Error saving."); } finally { setSubmitLoading(false); }
    };

    // --- 4. Filtering ---
    const filteredData = useMemo(() => {
        let result = Array.isArray(list) ? [...list] : [];
        if (searchValue.trim()) {
            result = result.filter(item => {
                const val = String(item[searchField] || '').toLowerCase();
                const term = searchValue.toLowerCase().trim();
                return searchCondition === 'Equal' ? val === term : val.includes(term);
            });
        }
        return result.sort((a, b) => b.id - a.id);
    }, [list, searchValue, searchField, searchCondition]);

    const currentItems = filteredData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
    const totalPages = Math.ceil(filteredData.length / itemsPerPage) || 1;

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
                    <Building2 className="text-blue-700" /> Account Master
                </h1>
                <div className="flex gap-2">
                    <button onClick={handleAddNew} className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg font-bold text-xs uppercase shadow-md transition-all"><Plus size={16} /> New Account</button>
                    <button onClick={fetchRecords} className="p-2 border border-slate-200 rounded-lg bg-white"><RefreshCw size={20} className={loading ? 'animate-spin' : ''} /></button>
                </div>
            </div>

            {/* Dynamic Search Bar */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm mb-6 flex flex-wrap items-end gap-4">
                <div className="flex-1 min-w-[180px]">
                    <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Search Field</label>
                    <select value={searchField} onChange={(e) => setSearchField(e.target.value)} className="w-full border border-slate-200 p-2 rounded-xl text-[13px] outline-none focus:ring-1 focus:ring-blue-500">
                        <option value="account_name">Account Name</option>
                        <option value="account_code">Account Code</option>
                        <option value="place">Place</option>
                    </select>
                </div>
                <div className="flex-1 min-w-[150px]">
                    <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Condition</label>
                    <select value={searchCondition} onChange={(e) => setSearchCondition(e.target.value)} className="w-full border p-2 rounded-xl text-[13px] outline-none">
                        <option value="Like">Like</option>
                        <option value="Equal">Equal</option>
                    </select>
                </div>
                <div className="flex-[2] min-w-[280px]">
                    <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Value</label>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                        <input type="text" value={searchValue} onChange={(e) => setSearchValue(e.target.value)} className="w-full border pl-9 pr-4 py-2 rounded-xl text-[13px] outline-none focus:ring-1 focus:ring-blue-500" placeholder="Live search..." />
                    </div>
                </div>

                {!isSelectionMode ? (
                    <button onClick={() => setIsSelectionMode(true)} className="border border-blue-200 bg-blue-50 text-blue-600 px-8 py-2 rounded-xl text-base font-bold hover:bg-blue-100 shadow-sm transition-all">Select</button>
                ) : (
                    <div className="flex gap-2 animate-in slide-in-from-right-2">
                        <button onClick={() => { setIsSelectionMode(false); setSelectedIds([]); }} className="border border-slate-200 px-6 py-2 rounded-xl text-base font-bold text-slate-600">Clear</button>
                        <button onClick={handleBulkDelete} disabled={selectedIds.length === 0} className="bg-red-500 text-white px-6 py-2 rounded-xl text-base font-bold shadow-md disabled:opacity-50">Delete ({selectedIds.length})</button>
                    </div>
                )}
            </div>

            {/* List Table */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-blue-700 border-b text-white text-sm font-bold uppercase tracking-wider">
                        <tr>
    {isSelectionMode && <th className="p-4 w-12 text-center">#</th>}
    <th className="p-4">Account Code</th>
    <th className="p-4">Account Name</th>
    <th className="p-4">Sub Group</th>
    <th className="p-4">Group</th>
    <th className="p-4">Main</th>
    <th className="p-4">Place</th>
    <th className="p-4">Phone No.</th>
    <th className="p-4">Email Id</th>
    {!isSelectionMode && <th className="p-4 w-10"></th>}
</tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-sm">
                        {currentItems.map(item => (
                            <tr key={item.id} className={`hover:bg-blue-50 cursor-pointer ${selectedIds.includes(item.id) ? 'bg-blue-100/50' : ''}`} onClick={() => handleRowClick(item)}>
                                {isSelectionMode && (
                                    <td className="p-4 text-center">
                                        {selectedIds.includes(item.id) ? <CheckSquare size={18} className="text-blue-600 mx-auto"/> : <Square size={18} className="text-slate-200 mx-auto"/>}
                                    </td>
                                )}
                                <td className="p-4 text-base font-bold text-blue-600 font-mono">
    {item.account_code}
</td>

<td className="p-4 text-base font-semibold text-slate-700 uppercase">
    {item.account_name}
</td>

<td className="p-4 text-sm font-bold text-amber-600 uppercase">
    {item.account_group}
</td>

<td className="p-4 text-sm font-bold text-slate-600 uppercase">
    {item.primary_group}
</td>

<td className="p-4 text-sm font-bold text-slate-500 uppercase">
    {item.main_group}
</td>

<td className="p-4 text-base text-slate-600 uppercase">
    {item.place}
</td>

<td className="p-4 text-xs text-slate-500">
    {item.phone_no || '-'}
</td>

<td className="p-4 text-xs text-slate-500 lowercase">
    {item.email || '-'}
</td>
                                {!isSelectionMode && <td className="p-4 text-slate-300"><Edit size={16} /></td>}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* POPUP MODAL (SPLIT TWO-COLUMN WITH 3-LINE ADDRESS) */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
                    <div className="bg-[#cfe2ff] w-full max-w-[1000px] rounded shadow-2xl overflow-hidden border border-white animate-in zoom-in duration-200">
                        
                        <div className="bg-[#6495ed] p-5 flex justify-between items-center text-white border-b border-white/20">
                            <div>
                                <h2 className="text-xl font-medium tracking-wide">Accounts Master</h2>
                                <p className="text-blue-50 text-base mt-1">To Add, Modify Accounts details.</p>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="hover:bg-white/10 p-1 rounded-full"><X size={24}/></button>
                        </div>

                        <div className="p-8 text-base">
                            <form onSubmit={handleSave} className="space-y-2">
                                <div className="flex flex-col lg:flex-row gap-x-10 gap-y-2">
                                    
                                    {/* --- LEFT COLUMN --- */}
                                    <div className="flex-1 space-y-2">
                                        <div className="grid grid-cols-12 items-center">
                                            <div className="col-span-4 flex justify-end"><FormLabel>Code</FormLabel></div>
                                            <div className="col-span-8">
                                                <input type="text" readOnly className="w-32 p-1 border border-gray-400 bg-black text-white font-bold outline-none cursor-default font-mono" value={formData.account_code} />
                                            </div>
                                        </div>

                                       {/* MAIN GROUP */}
<div className="grid grid-cols-12 items-center">
    <div className="col-span-4 flex justify-end">
        <FormLabel>Main Group</FormLabel>
    </div>
    <div className="col-span-8">
        <select
            className="w-full p-1 border border-gray-400 bg-white text-base outline-none"
            value={formData.main_group}
            onChange={e => setFormData({ ...formData, main_group: e.target.value })}
        >
            <option value="ASSETS">ASSETS</option>
            <option value="LIABILITIES">LIABILITIES</option>
            <option value="INCOME">INCOME</option>
            <option value="EXPENSE">EXPENSE</option>
        </select>
    </div>
</div>

{/* PRIMARY GROUP */}
<div className="grid grid-cols-12 items-center">
    <div className="col-span-4 flex justify-end">
        <FormLabel>Primary Group</FormLabel>
    </div>
    <div className="col-span-8">
        <input
            type="text"
            className="w-full p-1 border border-gray-400 bg-white uppercase text-base"
            value={formData.primary_group}
            onChange={e => setFormData({ ...formData, primary_group: e.target.value.toUpperCase() })}
        />
    </div>
</div>

{/* ACCOUNT SUB GROUP */}
<div className="grid grid-cols-12 items-center">
    <div className="col-span-4 flex justify-end">
        <FormLabel>Account Group</FormLabel>
    </div>
    <div className="col-span-8">
        <select
            className="w-full p-1 border border-gray-400 bg-white text-base outline-none"
            value={formData.account_group}
            onChange={e => setFormData({ ...formData, account_group: e.target.value })}
        >
            <option value="DEBTORS - OTHERS">DEBTORS - OTHERS</option>
            <option value="DEBTORS - DEPOT - SALES">DEBTORS - DEPOT - SALES</option>
            <option value="DEBTOR - YARN - SALES">DEBTOR - YARN - SALES</option>
        </select>
    </div>
</div>
                                        <div className="grid grid-cols-12 items-center">
                                            <div className="col-span-4 flex justify-end"><FormLabel>Account Name</FormLabel></div>
                                            <div className="col-span-8">
                                                <input type="text" required className="w-full p-1 border border-gray-400 bg-white uppercase text-base font-bold" value={formData.account_name} onChange={e => setFormData({...formData, account_name: e.target.value.toUpperCase()})} />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-12 items-center">
                                            <div className="col-span-4 flex justify-end"><FormLabel>Place</FormLabel></div>
                                            <div className="col-span-8">
                                                <input type="text" className="w-full p-1 border border-gray-400 bg-white uppercase text-base" value={formData.place} onChange={e => setFormData({...formData, place: e.target.value.toUpperCase()})} />
                                            </div>
                                        </div>

                                        {/* 3-LINE ADDRESS SETTER */}
                                        <div className="grid grid-cols-12 items-start">
                                            <div className="col-span-4 flex justify-end pt-1"><FormLabel>Address</FormLabel></div>
                                            <div className="col-span-8 space-y-1">
                                                <input type="text" className="w-full p-1 border border-gray-400 bg-white uppercase text-sm" value={formData.addr1} onChange={e => setFormData({...formData, addr1: e.target.value.toUpperCase()})} />
                                                <input type="text" className="w-full p-1 border border-gray-400 bg-white uppercase text-sm" value={formData.addr2} onChange={e => setFormData({...formData, addr2: e.target.value.toUpperCase()})} />
                                                <input type="text" className="w-full p-1 border border-gray-400 bg-white uppercase text-sm" value={formData.addr3} onChange={e => setFormData({...formData, addr3: e.target.value.toUpperCase()})} />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-12 items-center">
                                            <div className="col-span-4 flex justify-end"><FormLabel>Pincode</FormLabel></div>
                                            <div className="col-span-8">
                                                <input type="text" className="w-32 p-1 border border-gray-400 bg-white text-base" value={formData.pincode} onChange={e => setFormData({...formData, pincode: e.target.value})} />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-12 items-center">
                                            <div className="col-span-4 flex justify-end"><FormLabel>State</FormLabel></div>
                                            <div className="col-span-8">
                                                <input type="text" className="w-full p-1 border border-gray-400 bg-[#ffe4e1] uppercase text-base font-bold" value={formData.state} onChange={e => setFormData({...formData, state: e.target.value.toUpperCase()})} />
                                            </div>
                                        </div>

                                        {/* 3-LINE DELIVERY ADDRESS SETTER */}
                                        <div className="grid grid-cols-12 items-start">
                                            <div className="col-span-4 flex justify-end pt-1"><FormLabel>Delivery Address</FormLabel></div>
                                            <div className="col-span-8 space-y-1">
                                                <input type="text" className="w-full p-1 border border-gray-400 bg-white uppercase text-sm" value={formData.del1} onChange={e => setFormData({...formData, del1: e.target.value.toUpperCase()})} />
                                                <input type="text" className="w-full p-1 border border-gray-400 bg-white uppercase text-sm" value={formData.del2} onChange={e => setFormData({...formData, del2: e.target.value.toUpperCase()})} />
                                                <input type="text" className="w-full p-1 border border-gray-400 bg-white uppercase text-sm" value={formData.del3} onChange={e => setFormData({...formData, del3: e.target.value.toUpperCase()})} />
                                            </div>
                                        </div>
                                    </div>

                                    {/* --- RIGHT COLUMN --- */}
                                    <div className="flex-1 space-y-2">
                                        {[
                                            { label: 'TIN No.', key: 'tin_no' },
                                            { label: 'CST No.', key: 'cst_no' },
                                            { label: 'Ph. No.', key: 'phone_no' },
                                            { label: 'Email', key: 'email' },
                                            { label: 'Fax', key: 'fax' },
                                            { label: 'WebSite', key: 'website' },
                                            { label: 'Account No.', key: 'account_no' },
                                            { label: 'Contact', key: 'contact_person' },
                                            { label: 'Cell No.', key: 'cell_no' },
                                            { label: 'GST No.', key: 'gst_no' },
                                        ].map((field) => (
                                            <div key={field.key} className="grid grid-cols-12 items-center">
                                                <div className="col-span-4 flex justify-end"><FormLabel>{field.label}</FormLabel></div>
                                                <div className="col-span-8">
                                                    <input type="text" className="w-full p-1 border border-gray-400 bg-white text-base" value={formData[field.key]} onChange={e => setFormData({...formData, [field.key]: e.target.value})} />
                                                </div>
                                            </div>
                                        ))}

                                        <div className="grid grid-cols-12 items-center">
                                            <div className="col-span-4 flex justify-end"><FormLabel>Opening Credit</FormLabel></div>
                                            <div className="col-span-8 flex gap-2">
                                                <input type="number" className="w-32 p-1 border border-gray-400 bg-white text-base text-right" value={formData.opening_credit} onChange={e => setFormData({...formData, opening_credit: e.target.value})} />
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-12 items-center">
                                            <div className="col-span-4 flex justify-end"><FormLabel>Opening Debit</FormLabel></div>
                                            <div className="col-span-8 flex gap-2">
                                                <input type="number" className="w-32 p-1 border border-gray-400 bg-white text-base text-right" value={formData.opening_debit} onChange={e => setFormData({...formData, opening_debit: e.target.value})} />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Action Buttons */}
                                <div className="flex justify-end gap-3 pt-6">
                                    <div className="bg-[#cfe2ff] border border-blue-200 p-3 flex gap-3 rounded-sm shadow-sm">
                                        <button type="submit" disabled={submitLoading} className="flex items-center gap-2 bg-slate-50 border border-slate-400 px-8 py-1.5 text-xs font-bold shadow-sm hover:bg-white active:scale-95 transition-all">
                                            <span className="text-blue-700 p-0.5 border border-blue-100 bg-white rounded-sm"><Save size={14}/></span> Update
                                        </button>
                                        <button type="button" onClick={() => setIsModalOpen(false)} className="flex items-center gap-2 bg-slate-50 border border-slate-400 px-8 py-1.5 text-xs font-bold shadow-sm hover:bg-white active:scale-95 transition-all">
                                            <span className="text-red-600 font-black p-0.5 border border-red-100 bg-white rounded-sm">X</span> Cancel
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

export default AccountMaster;