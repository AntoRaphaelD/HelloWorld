import React, { useState, useEffect, useMemo } from 'react';
import { mastersAPI, transactionsAPI } from '../service/api';
import { 
    Warehouse, Search, Package, Layers, 
    AlertTriangle, ArrowUpDown, Download, 
    RefreshCw, Filter, Boxes
} from 'lucide-react';

const DepotStorage = () => {
    const [depots, setDepots] = useState([]);
    const [selectedDepot, setSelectedDepot] = useState('');
    const [inventory, setInventory] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchValue, setSearchValue] = useState('');

    // Load Depots on Mount
    useEffect(() => {
        fetchDepots();
    }, []);

    // Fetch Inventory when Depot changes
    useEffect(() => {
        if (selectedDepot) {
            fetchInventory();
        } else {
            setInventory([]);
        }
    }, [selectedDepot]);

    const fetchDepots = async () => {
        try {
            const res = await mastersAPI.accounts.getAll();
            const all = res.data?.data || res.data || [];
            const filtered = all.filter(a => {
                const grp = String(a.account_group || "").toUpperCase();
                const name = String(a.account_name || "").toUpperCase();
                return grp === 'DEPOT' || name.includes('DEPOT');
            });
            setDepots(filtered);
            // Default select the first depot if available
            if (filtered.length > 0) setSelectedDepot(filtered[0].id);
        } catch (err) {
            console.error("Error fetching depots", err);
        }
    };

    const fetchInventory = async () => {
    if (!selectedDepot) return;
    
    setLoading(true);
    try {
        // CALL THE NEW DEPOT-SPECIFIC ENDPOINT
        const res = await transactionsAPI.depotStock.getInventory(selectedDepot);
        const data = res.data?.data || [];
        
        console.log("Inventory Data Received:", data); // Check if depot_stock is now > 0
        setInventory(data);
    } catch (err) {
        console.error("Error fetching inventory", err);
        alert("Could not load inventory for this depot");
    } finally {
        setLoading(false);
    }
};
useEffect(() => {
    const handleDepotUpdate = () => {
        if (selectedDepot) {
            fetchInventory();
        }
    };

    window.addEventListener("depotStockUpdated", handleDepotUpdate);

    return () => {
        window.removeEventListener("depotStockUpdated", handleDepotUpdate);
    };
}, [selectedDepot]);
    const filteredInventory = useMemo(() => {
        return inventory.filter(item => 
            item.product_name.toLowerCase().includes(searchValue.toLowerCase()) ||
            item.product_code.toLowerCase().includes(searchValue.toLowerCase())
        );
    }, [inventory, searchValue]);

    const stats = useMemo(() => {
        const totalItems = filteredInventory.length;
        const totalWeight = filteredInventory.reduce((sum, item) => sum + parseFloat(item.depot_stock || 0), 0);
        const lowStock = filteredInventory.filter(item => parseFloat(item.depot_stock) < 100).length;
        return { totalItems, totalWeight, lowStock };
    }, [filteredInventory]);

    return (
        <div className="min-h-screen bg-[#f8fafc] p-6 font-sans text-slate-900">
            
            {/* HEADER SECTION */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-black text-slate-800 tracking-tight flex items-center gap-3">
                        <Warehouse className="text-indigo-600" size={32} /> Depot Storage Vault
                    </h1>
                    <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mt-1">Live Inventory & Warehouse Position</p>
                </div>

                <div className="flex items-center gap-3 bg-white p-2 rounded-2xl shadow-sm border border-slate-200 w-full md:w-auto">
                    <span className="pl-3 text-[10px] font-black uppercase text-slate-400">Viewing:</span>
                    <select 
                        value={selectedDepot}
                        onChange={(e) => setSelectedDepot(e.target.value)}
                        className="bg-slate-50 border-none font-black text-indigo-600 focus:ring-0 rounded-xl px-4 py-2 cursor-pointer"
                    >
                        {depots.map(d => (
                            <option key={d.id} value={d.id}>{d.account_name}</option>
                        ))}
                    </select>
                    <button onClick={fetchInventory} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                        <RefreshCw size={18} className={loading ? 'animate-spin text-indigo-600' : 'text-slate-400'} />
                    </button>
                </div>
            </div>

            {/* STATS CARDS */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm flex items-center gap-5">
                    <div className="p-4 bg-indigo-50 rounded-2xl text-indigo-600"><Boxes size={28}/></div>
                    <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Unique SKUs</p>
                        <p className="text-2xl font-black text-slate-800">{stats.totalItems}</p>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm flex items-center gap-5">
                    <div className="p-4 bg-emerald-50 rounded-2xl text-emerald-600"><Layers size={28}/></div>
                    <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Gross Weight (KG)</p>
                        <p className="text-2xl font-black text-slate-800">{stats.totalWeight.toLocaleString()} <span className="text-sm font-bold opacity-40">KG</span></p>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm flex items-center gap-5">
                    <div className="p-4 bg-rose-50 rounded-2xl text-rose-600"><AlertTriangle size={28}/></div>
                    <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Low Stock Alerts</p>
                        <p className="text-2xl font-black text-slate-800">{stats.lowStock}</p>
                    </div>
                </div>
            </div>

            {/* DATA TABLE AREA */}
            <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-xl overflow-hidden">
                
                {/* Search Bar */}
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <div className="relative w-full max-w-md">
                        <Search className="absolute left-4 top-3.5 text-slate-400" size={18} />
                        <input 
                            type="text" 
                            placeholder="Search by Product Name or SKU..."
                            value={searchValue}
                            onChange={(e) => setSearchValue(e.target.value)}
                            className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-medium focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all shadow-sm"
                        />
                    </div>
                    <button className="hidden md:flex items-center gap-2 bg-slate-800 text-white px-6 py-3 rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-slate-700 transition-all active:scale-95">
                        <Download size={16}/> Export Sheet
                    </button>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-indigo-950 text-white">
                                <th className="p-5 text-[10px] font-black uppercase tracking-[0.2em] rounded-tl-3xl">Product Details</th>
                                <th className="p-5 text-[10px] font-black uppercase tracking-[0.2em]">SKU Code</th>
                                <th className="p-5 text-[10px] font-black uppercase tracking-[0.2em]">Tariff/HSN</th>
                                <th className="p-5 text-[10px] font-black uppercase tracking-[0.2em]">In-Stock Qty</th>
                                <th className="p-5 text-[10px] font-black uppercase tracking-[0.2em] text-center">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr>
                                    <td colSpan={5} className="p-20 text-center">
                                        <div className="flex flex-col items-center gap-4">
                                            <RefreshCw className="animate-spin text-indigo-600" size={40} />
                                            <p className="text-xs font-black uppercase tracking-widest text-slate-400">Syncing with Depot Database...</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : filteredInventory.length > 0 ? filteredInventory.map((item) => {
                                const stockVal = parseFloat(item.depot_stock || 0);
                                return (
                                    <tr key={item.id} className="hover:bg-slate-50 transition-colors group">
                                        <td className="p-5">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400 group-hover:bg-indigo-100 group-hover:text-indigo-600 transition-all">
                                                    <Package size={20} />
                                                </div>
                                                <span className="font-black text-slate-700 uppercase">{item.product_name}</span>
                                            </div>
                                        </td>
                                        <td className="p-5 font-mono text-sm text-slate-500 font-bold">{item.product_code}</td>
                                        <td className="p-5">
                                            <span className="px-3 py-1 bg-slate-100 text-slate-500 text-[10px] font-black rounded-lg">
                                                HSN: {item.TariffSubHead?.tariff_no || 'N/A'}
                                            </span>
                                        </td>
                                        <td className="p-5">
                                            <div className="flex flex-col">
                                                <span className="text-xl font-black text-slate-800">{stockVal.toLocaleString()}</span>
                                                <span className="text-[10px] font-bold text-slate-400 uppercase">Kilograms (KG)</span>
                                            </div>
                                        </td>
                                        <td className="p-5 text-center">
                                            {stockVal <= 0 ? (
                                                <span className="bg-rose-50 text-rose-600 text-[9px] px-3 py-1.5 rounded-full font-black uppercase border border-rose-100">Out of Stock</span>
                                            ) : stockVal < 100 ? (
                                                <span className="bg-amber-50 text-amber-600 text-[9px] px-3 py-1.5 rounded-full font-black uppercase border border-amber-100">Low Stock</span>
                                            ) : (
                                                <span className="bg-emerald-50 text-emerald-600 text-[9px] px-3 py-1.5 rounded-full font-black uppercase border border-emerald-100">In Stock</span>
                                            )}
                                        </td>
                                    </tr>
                                );
                            }) : (
                                <tr>
                                    <td colSpan={5} className="p-32 text-center">
                                        <div className="opacity-20 flex flex-col items-center">
                                            <Search size={64} className="mb-4" />
                                            <p className="text-xl font-black uppercase tracking-widest">No Products Found</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default DepotStorage;