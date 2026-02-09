import React, { useState, useEffect, useMemo } from 'react';
import { mastersAPI } from '../service/api';
import { 
    Plus, Search, Edit, Trash2, X, ChevronLeft, 
    ChevronRight, Filter, Download, MoreVertical 
} from 'lucide-react';

const AccountMaster = () => {
    // --- State Management ---
    const [list, setList] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    
    // UI Input State (What the user types)
    const [searchField, setSearchField] = useState('account_name');
    const [searchCondition, setSearchCondition] = useState('Like');
    const [searchValue, setSearchValue] = useState('');
    
    // Active Filter State (What the table actually uses)
    const [activeFilter, setActiveFilter] = useState({ field: 'account_name', condition: 'Like', value: '' });

    // Pagination & Sorting State
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(10);
    const [sortConfig, setSortConfig] = useState({ key: 'account_name', direction: 'asc' });

    const [formData, setFormData] = useState(initialState());

    function initialState() {
        return {
            id: null, account_code: '', account_group: 'Sundry Debtors', account_name: '',
            place: '', address: '', pincode: '', gst_no: '', opening_credit: 0, opening_debit: 0
        };
    }

    useEffect(() => { fetchRecords(); }, []);

    const fetchRecords = async () => {
        setLoading(true);
        try {
            const res = await mastersAPI.accounts.getAll();
            setList(res.data.data || []);
        } catch (err) { 
            console.error(err); 
        } finally { 
            setLoading(false); 
        }
    };

    // --- Search Actions ---
    const handleSearch = () => {
        setCurrentPage(1); // Reset to page 1 on new search
        setActiveFilter({ field: searchField, condition: searchCondition, value: searchValue });
    };

    const handleShowAll = () => {
        setSearchValue('');
        setCurrentPage(1);
        setActiveFilter({ field: 'account_name', condition: 'Like', value: '' });
    };

    // --- CRUD Actions ---
    const handleAddNew = () => {
        setFormData(initialState());
        setIsModalOpen(true);
    };

    const handleEdit = (item) => {
        setFormData(item);
        setIsModalOpen(true);
    };

    const handleDelete = async (id) => {
        if (window.confirm("Are you sure you want to delete this record?")) {
            try {
                await mastersAPI.accounts.delete(id);
                fetchRecords();
                setIsModalOpen(false);
            } catch (err) { alert("Delete failed"); }
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            // Ensure numbers are sent as numbers, not strings
            const payload = {
                ...formData,
                opening_credit: Number(formData.opening_credit),
                opening_debit: Number(formData.opening_debit)
            };

            formData.id 
                ? await mastersAPI.accounts.update(formData.id, payload) 
                : await mastersAPI.accounts.create(payload);
            
            fetchRecords();
            setIsModalOpen(false);
        } catch (err) { alert("Error saving record"); } 
        finally { setLoading(false); }
    };

    // --- Filter & Sort Logic ---
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
                const aVal = a[sortConfig.key] || '';
                const bVal = b[sortConfig.key] || '';
                if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
                if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }
        return sortableItems;
    }, [filteredData, sortConfig]);

    // Pagination Logic
    const indexOfLastItem = currentPage * itemsPerPage;
    const currentItems = sortedData.slice(indexOfLastItem - itemsPerPage, indexOfLastItem);
    const totalPages = Math.ceil(sortedData.length / itemsPerPage);

    const requestSort = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
        setSortConfig({ key, direction });
    };

    return (
        <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans text-slate-900">
            {/* 1. TOP HEADER SECTION */}
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Account Master</h1>
                    <p className="text-sm text-slate-500">Manage your ledger and account information</p>
                </div>
                <div className="flex gap-2">
                    <button 
                        onClick={handleAddNew}
                        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-all shadow-sm"
                    >
                        <Plus size={18} /> New Account
                    </button>
                </div>
            </div>

            {/* 2. FILTER BAR */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm mb-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Search Field</label>
                        <select 
                            value={searchField} 
                            onChange={(e) => setSearchField(e.target.value)}
                            className="w-full border border-slate-200 p-2 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                        >
                            <option value="account_name">Account Name</option>
                            <option value="account_code">Account Code</option>
                            <option value="place">Place</option>
                            <option value="account_group">Group</option>
                        </select>
                    </div>
                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Condition</label>
                        <select 
                            value={searchCondition}
                            onChange={(e) => setSearchCondition(e.target.value)}
                            className="w-full border border-slate-200 p-2 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                        >
                            <option value="Like">Contains (Like)</option>
                            <option value="Equal">Exact Match</option>
                        </select>
                    </div>
                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Value</label>
                        <input 
                            type="text" 
                            placeholder="Type to search..."
                            value={searchValue}
                            onChange={(e) => setSearchValue(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                            className="w-full border border-slate-200 p-2 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                    </div>
                    <div className="flex gap-2">
                        <button 
                            onClick={handleSearch}
                            className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-700 flex items-center justify-center gap-2 transition-colors"
                        >
                            <Search size={16}/> Search
                        </button>
                        <button 
                            onClick={handleShowAll}
                            className="flex-1 border border-slate-200 py-2 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors"
                        >
                            Show All
                        </button>
                    </div>
                </div>
            </div>

            {/* 3. DATA TABLE */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-blue-600 text-white">
                                <th onClick={() => requestSort('account_code')} className="p-4 text-sm font-semibold cursor-pointer hover:bg-blue-700 transition-colors">Code</th>
                                <th onClick={() => requestSort('account_name')} className="p-4 text-sm font-semibold cursor-pointer hover:bg-blue-700 transition-colors">Account Name</th>
                                <th onClick={() => requestSort('account_group')} className="p-4 text-sm font-semibold cursor-pointer hover:bg-blue-700 transition-colors">Group</th>
                                <th onClick={() => requestSort('place')} className="p-4 text-sm font-semibold cursor-pointer hover:bg-blue-700 transition-colors">Place</th>
                                <th className="p-4 text-sm font-semibold">Opening Bal</th>
                                <th className="p-4 text-sm font-semibold text-center w-20">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr><td colSpan="6" className="p-8 text-center text-slate-400">Loading records...</td></tr>
                            ) : currentItems.length > 0 ? (
                                currentItems.map((item) => (
                                    <tr key={item.id} className="hover:bg-blue-50/50 cursor-pointer transition-colors group">
                                        <td onClick={() => handleEdit(item)} className="p-4 text-sm font-medium text-slate-700">{item.account_code}</td>
                                        <td onClick={() => handleEdit(item)} className="p-4 text-sm text-slate-600">{item.account_name}</td>
                                        <td onClick={() => handleEdit(item)} className="p-4 text-sm text-slate-600">{item.account_group}</td>
                                        <td onClick={() => handleEdit(item)} className="p-4 text-sm text-slate-600">{item.place}</td>
                                        <td onClick={() => handleEdit(item)} className="p-4 text-sm">
                                            <span className="text-red-600 font-medium">Dr: {item.opening_debit}</span> / 
                                            <span className="text-green-600 font-medium ml-1">Cr: {item.opening_credit}</span>
                                        </td>
                                        <td className="p-4 text-center">
                                            <button onClick={() => handleEdit(item)} className="p-2 text-slate-400 hover:text-blue-600 transition-colors">
                                                <Edit size={16}/>
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr><td colSpan="6" className="p-8 text-center text-slate-400">No records found matching your search.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* 4. PAGINATION */}
                <div className="p-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
                    <span className="text-xs text-slate-500 font-medium">
                        Showing {sortedData.length > 0 ? indexOfLastItem - itemsPerPage + 1 : 0} to {Math.min(indexOfLastItem, sortedData.length)} of {sortedData.length} records
                    </span>
                    <div className="flex gap-2">
                        <button 
                            disabled={currentPage === 1}
                            onClick={() => setCurrentPage(prev => prev - 1)}
                            className="p-2 rounded border bg-white disabled:opacity-50 hover:bg-slate-50 transition-all shadow-sm"
                        >
                            <ChevronLeft size={16} />
                        </button>
                        <button 
                            disabled={currentPage >= totalPages}
                            onClick={() => setCurrentPage(prev => prev + 1)}
                            className="p-2 rounded border bg-white disabled:opacity-50 hover:bg-slate-50 transition-all shadow-sm"
                        >
                            <ChevronRight size={16} />
                        </button>
                    </div>
                </div>
            </div>

            {/* 5. MODAL POPUP */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="bg-blue-600 p-4 flex justify-between items-center text-white">
                            <h2 className="font-bold text-lg">{formData.id ? 'Modify Account' : 'Add New Account'}</h2>
                            <button onClick={() => setIsModalOpen(false)} className="hover:bg-blue-500 p-1 rounded-full transition-colors"><X size={20}/></button>
                        </div>
                        
                        <form onSubmit={handleSave} className="p-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-slate-500 uppercase">Account Name *</label>
                                    <input 
                                        required
                                        value={formData.account_name} 
                                        onChange={(e) => setFormData({...formData, account_name: e.target.value})}
                                        className="w-full border border-slate-200 p-2.5 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" 
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-slate-500 uppercase">Account Group</label>
                                    <select 
                                        value={formData.account_group}
                                        onChange={(e) => setFormData({...formData, account_group: e.target.value})}
                                        className="w-full border border-slate-200 p-2.5 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                                    >
                                        <option value="Sundry Debtors">Sundry Debtors</option>
                                        <option value="Sundry Creditors">Sundry Creditors</option>
                                        <option value="Bank Accounts">Bank Accounts</option>
                                        <option value="Cash-in-hand">Cash-in-hand</option>
                                    </select>
                                </div>
                                <div className="space-y-1 md:col-span-2">
                                    <label className="text-xs font-bold text-slate-500 uppercase">Address</label>
                                    <textarea 
                                        rows="2"
                                        value={formData.address}
                                        onChange={(e) => setFormData({...formData, address: e.target.value})}
                                        className="w-full border border-slate-200 p-2.5 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" 
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-slate-500 uppercase">Opening Debit</label>
                                    <input 
                                        type="number"
                                        value={formData.opening_debit}
                                        onChange={(e) => setFormData({...formData, opening_debit: e.target.value})}
                                        className="w-full border border-slate-200 p-2.5 rounded-lg text-red-600 font-semibold focus:ring-2 focus:ring-red-500 outline-none" 
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-slate-500 uppercase">Opening Credit</label>
                                    <input 
                                        type="number"
                                        value={formData.opening_credit}
                                        onChange={(e) => setFormData({...formData, opening_credit: e.target.value})}
                                        className="w-full border border-slate-200 p-2.5 rounded-lg text-green-600 font-semibold focus:ring-2 focus:ring-green-500 outline-none" 
                                    />
                                </div>
                            </div>

                            <div className="mt-8 flex justify-between items-center border-t pt-6">
                                {formData.id && (
                                    <button 
                                        type="button"
                                        onClick={() => handleDelete(formData.id)}
                                        className="flex items-center gap-2 text-red-500 hover:bg-red-50 px-4 py-2 rounded-lg transition-colors"
                                    >
                                        <Trash2 size={18}/> Delete
                                    </button>
                                )}
                                <div className="flex gap-3 ml-auto">
                                    <button 
                                        type="button"
                                        onClick={() => setIsModalOpen(false)}
                                        className="px-6 py-2 rounded-lg text-slate-600 hover:bg-slate-100 font-medium transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button 
                                        type="submit"
                                        disabled={loading}
                                        className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-2 rounded-lg font-bold shadow-lg disabled:opacity-50 transition-all active:scale-95"
                                    >
                                        {loading ? 'Saving...' : 'Save Changes'}
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

export default AccountMaster;