import React, { useState, useEffect, useMemo } from 'react';
import { mastersAPI, transactionsAPI } from '../service/api';
import { 
    Plus, Edit, Trash2, X, ChevronLeft, 
    ChevronRight, RefreshCw, Save, Factory, Search, Filter, 
    Square, CheckSquare, Loader2
} from 'lucide-react';
import { useFilter } from '../context/FilterContext';

const RG1Production = () => {
    // --- 1. State Management ---
    const [list, setList] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [submitLoading, setSubmitLoading] = useState(false);
    
    // Selection & Bulk Deletion States
    const [isSelectionMode, setIsSelectionMode] = useState(false);
    const [selectedIds, setSelectedIds] = useState([]);
    
    // Search Filters
    const { searchQuery: searchValue, searchField, resetFilters, sortField, setSortField, sortOrder, setSortOrder, fromDate, toDate } = useFilter();
    const [searchCondition, setSearchCondition] = useState('Like');
    const handleSort = (field) => {
        if (sortField === field) {
            setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortOrder('asc');
        }
    };

    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    // Master Data
    const [products, setProducts] = useState([]);
    const [packingTypes, setPackingTypes] = useState([]);
    const [invoices, setInvoices] = useState([]);
    const [directInvoices, setDirectInvoices] = useState([]);

    const emptyState = { 
        id: null,
        date: new Date().toISOString().split('T')[0], 
        product_id: '',
        packing_type_id: '',
        weight_per_bag: '',
        production_kgs: '', 
        prev_closing_kgs: '',
        invoice_kgs: '', 
        stock_kgs: '',
        stock_bags: '',
        stock_loose_kgs: ''
    };

    const [formData, setFormData] = useState(emptyState);
    const [originalRecord, setOriginalRecord] = useState(null);

    const num = (value) => {
        const parsed = parseFloat(value);
        return Number.isNaN(parsed) ? 0 : parsed;
    };

    const getPreviousDate = (dateValue) => {
        if (!dateValue) return '';
        const [year, month, day] = dateValue.split('-').map(Number);
        const date = new Date(year, month - 1, day);
        date.setDate(date.getDate() - 1);
        const yyyy = date.getFullYear();
        const mm = String(date.getMonth() + 1).padStart(2, '0');
        const dd = String(date.getDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`;
    };

    const getInvoiceKgsForDate = (productId, dateValue) => {
        if (!productId || !dateValue) return '0.000';

        const invoiceKgs = invoices.reduce((sum, invoice) => {
            if (invoice.date !== dateValue) return sum;
            const details = invoice.InvoiceDetails || invoice.Details || invoice.details || [];
            return sum + details.reduce((detailSum, detail) => (
                parseInt(detail.product_id) === parseInt(productId)
                    ? detailSum + num(detail.total_kgs)
                    : detailSum
            ), 0);
        }, 0);

        const directKgs = directInvoices.reduce((sum, invoice) => {
            if (invoice.date !== dateValue) return sum;
            const details = invoice.DirectInvoiceDetails || invoice.Details || invoice.details || [];
            return sum + details.reduce((detailSum, detail) => (
                parseInt(detail.product_id) === parseInt(productId)
                    ? detailSum + num(detail.qty)
                    : detailSum
            ), 0);
        }, 0);

        return (invoiceKgs + directKgs).toFixed(3);
    };

    const getPreviousDayClosingKgs = (productId, dateValue) => {
        if (!productId || !dateValue) return '0.000';

        const prodRecords = list.filter(item => 
            parseInt(item.product_id) === parseInt(productId) && 
            item.date < dateValue &&
            (!formData.id || item.id !== formData.id)
        );

        if (prodRecords.length === 0) {
            const product = getProduct(productId);
            const millStock = num(product?.mill_stock);
            return Math.max(0, millStock).toFixed(3);
        }

        prodRecords.sort((a, b) => {
            const dateDiff = new Date(b.date).getTime() - new Date(a.date).getTime();
            if (dateDiff !== 0) return dateDiff;
            return b.id - a.id;
        });

        const latestPrevRecord = prodRecords[0];
        return Math.max(0, num(latestPrevRecord.stock_kgs)).toFixed(3);
    };

    // --- 2. Auto-Calculation Logic ---
    useEffect(() => {
        // If product or date changes, dynamically calculate the previous day's closing stock (ensuring non-negative)
        const nextPrevClosing = getPreviousDayClosingKgs(formData.product_id, formData.date);
        if (formData.prev_closing_kgs !== nextPrevClosing) {
            setFormData(prevForm => ({
                ...prevForm,
                prev_closing_kgs: nextPrevClosing
            }));
        }
    }, [formData.product_id, formData.date, list, products]);

    useEffect(() => {
        // If it's an existing record and inputs haven't changed from original, don't recalculate stock_kgs
        if (formData.id && originalRecord &&
            formData.stock_bags === originalRecord.stock_bags &&
            formData.stock_loose_kgs === originalRecord.stock_loose_kgs &&
            formData.weight_per_bag === originalRecord.weight_per_bag &&
            formData.product_id === originalRecord.product_id) {
            return;
        }

        const product = getProduct(formData.product_id);
        const hasStockInput = [formData.stock_bags, formData.stock_loose_kgs]
            .some(value => value !== undefined && value !== null && value !== '');

        const nextStockKgs = hasStockInput
            ? ((num(formData.stock_bags) * num(formData.weight_per_bag)) + (num(formData.stock_loose_kgs) * num(product?.wt_per_cone))).toFixed(3)
            : '';

        if (formData.stock_kgs !== nextStockKgs) {
            setFormData(prevForm => ({
                ...prevForm,
                stock_kgs: nextStockKgs
            }));
        }
    }, [formData.stock_bags, formData.stock_loose_kgs, formData.weight_per_bag, formData.product_id, products, originalRecord]);

    useEffect(() => {
        // If it's an existing record and product/date hasn't changed from original, don't recalculate invoice_kgs
        if (formData.id && originalRecord && 
            formData.product_id === originalRecord.product_id && 
            formData.date === originalRecord.date) {
            return;
        }

        const nextInvoiceKgs = getInvoiceKgsForDate(formData.product_id, formData.date);
        if (formData.invoice_kgs !== nextInvoiceKgs) {
            setFormData(prevForm => ({
                ...prevForm,
                invoice_kgs: nextInvoiceKgs
            }));
        }
    }, [formData.product_id, formData.date, invoices, directInvoices, originalRecord]);

    useEffect(() => {
        // If it's an existing record and inputs haven't changed from original, don't recalculate production_kgs
        if (formData.id && originalRecord &&
            formData.prev_closing_kgs === originalRecord.prev_closing_kgs &&
            formData.invoice_kgs === originalRecord.invoice_kgs &&
            formData.stock_kgs === originalRecord.stock_kgs) {
            return;
        }

        const hasProductionInput = [formData.prev_closing_kgs, formData.invoice_kgs, formData.stock_kgs]
            .some(value => value !== undefined && value !== null && value !== '');

        if (!hasProductionInput) {
            setFormData(prevForm => ({
                ...prevForm,
                production_kgs: ''
            }));
            return;
        }

        const prev = Math.max(0, num(formData.prev_closing_kgs));
        const inv = num(formData.invoice_kgs);
        const stock = num(formData.stock_kgs);

        const nextProductionKgs = ((inv + stock) - prev).toFixed(3);

        if (formData.production_kgs !== nextProductionKgs) {
            setFormData(prevForm => ({
                ...prevForm,
                production_kgs: nextProductionKgs
            }));
        }

    }, [formData.prev_closing_kgs, formData.invoice_kgs, formData.stock_kgs, originalRecord]);

    // --- 3. Data Fetching ---
    useEffect(() => {
        fetchMasters();
        fetchRecords();
        resetFilters([
            { value: 'product_name', label: 'Product Name' },
            { value: 'ref_no', label: 'Ref No' },
            { value: 'date', label: 'Date' }
        ], 'product_name', true);
    }, []);

    const fetchMasters = async () => {
        try {
            const [productsRes, packingTypesRes, invoicesRes, directInvoicesRes] = await Promise.all([
                mastersAPI.products.getAll(),
                mastersAPI.packingTypes.getAll(),
                transactionsAPI.invoices.getAll(),
                transactionsAPI.directInvoices.getAll()
            ]);
            setProducts(Array.isArray(productsRes.data.data) ? productsRes.data.data : []);
            setPackingTypes(Array.isArray(packingTypesRes.data.data) ? packingTypesRes.data.data : []);
            setInvoices(Array.isArray(invoicesRes.data.data) ? invoicesRes.data.data : []);
            setDirectInvoices(Array.isArray(directInvoicesRes.data.data) ? directInvoicesRes.data.data : []);
        } catch (err) { console.error(err); }
    };

    const fetchRecords = async () => {
        setLoading(true);
        try {
            const data = await transactionsAPI.production.getAll();
            setList(Array.isArray(data.data.data) ? data.data.data : []);
        } catch (err) { setList([]); } 
        finally { setLoading(false); }
    };

    const getProduct = (productId) => products.find(p => p.id === parseInt(productId));

    // --- 4. Action Handlers ---
  const handleAddNew = () => {
    setFormData({ ...emptyState }); // Reset to initial empty strings
    setOriginalRecord(null);
    setIsModalOpen(true);
};

   const onProductChange = (productId) => {
    // Find product in the recently updated products list
    const product = products.find(p => p.id === parseInt(productId));
    if (!product) return;
    
    const pType = packingTypes.find(t => t.packing_type === product.packing_type);

    setFormData(prev => ({
        ...prev,
        product_id: productId,
        packing_type_id: pType ? pType.id : '',
        weight_per_bag: product.pack_nett_wt ?? '',
        // 🟢 This mill_stock must be updated by the backend during the previous save
        prev_closing_kgs: Math.max(0, num(product.mill_stock)).toFixed(3)
    }));
};

    const handleRowClick = (item) => {
        if (isSelectionMode) {
            setSelectedIds(prev => prev.includes(item.id) ? prev.filter(id => id !== item.id) : [...prev, item.id]);
        } else {
            const formattedItem = {
                ...item,
                product_id: item.product_id?.toString() || '',
                packing_type_id: item.packing_type_id?.toString() || ''
            };
            setFormData(formattedItem);
            setOriginalRecord(formattedItem);
            setIsModalOpen(true);
        }
    };

    const handleBulkDelete = async () => {
        if (selectedIds.length === 0) return;
        if (window.confirm(`Permanently delete ${selectedIds.length} logs?`)) {
            try {
                await transactionsAPI.production.bulkDelete(selectedIds);
                setSelectedIds([]);
                setIsSelectionMode(false);
                fetchRecords();
            } catch (err) { alert("Delete failed."); }
        }
    };

    const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.product_id) return alert("Please select a Count/Product");
    
    setSubmitLoading(true);
    try {
        if (formData.id) {
            await transactionsAPI.production.update(formData.id, formData);
        } else {
            const payload = {
                date: formData.date,
                product_id: formData.product_id,
                packing_type_id: formData.packing_type_id,
                weight_per_bag: formData.weight_per_bag,
                prev_closing_kgs: formData.prev_closing_kgs,
                production_kgs: formData.production_kgs,
                invoice_kgs: formData.invoice_kgs,
                stock_kgs: formData.stock_kgs,
                stock_bags: formData.stock_bags,
                stock_loose_kgs: formData.stock_loose_kgs
            };
            await transactionsAPI.production.create(payload);
        }

        // 🟢 CRITICAL: Re-fetch Product Masters to get the NEW mill_stock
        await fetchMasters(); 
        
        // Refresh the ledger list at the bottom
        await fetchRecords(); 
        
        setIsModalOpen(false);
        // Clear form for next entry
        setFormData(emptyState); 
        setOriginalRecord(null); 
    } catch (err) { 
        alert("Error saving production log."); 
    } finally { 
        setSubmitLoading(false); 
    }
};    const processedList = useMemo(() => {
        if (!Array.isArray(list)) return [];
        
        // Sort chronologically ascending to calculate running prev_closing_kgs sequentially
        const sortedList = [...list].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        
        // Track the stock_kgs for each product to carry forward
        const lastStockPerProduct = {};

        const processed = sortedList.map(item => {
            const productId = item.product_id;
            const dateValue = item.date;

            // 1. Calculate dynamic invoice_kgs for this day
            const dynamicInvoiceKgs = getInvoiceKgsForDate(productId, dateValue);

            // 2. Calculate dynamic prev_closing_kgs
            let prevClosing = '0.000';
            if (lastStockPerProduct[productId] !== undefined) {
                prevClosing = lastStockPerProduct[productId];
            } else {
                const product = getProduct(productId);
                prevClosing = Math.max(0, num(product?.mill_stock)).toFixed(3);
            }

            // Save this item's stock_kgs as the last stock for this product
            lastStockPerProduct[productId] = Math.max(0, num(item.stock_kgs)).toFixed(3);

            // 3. Calculate dynamic production_kgs
            const dynamicProductionKgs = ((num(dynamicInvoiceKgs) + num(item.stock_kgs)) - num(prevClosing)).toFixed(3);

            return {
                ...item,
                invoice_kgs: dynamicInvoiceKgs,
                prev_closing_kgs: prevClosing,
                production_kgs: dynamicProductionKgs
            };
        });

        // Return processed list, but sorted by date descending for the UI presentation
        return processed.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [list, invoices, directInvoices, products]);

    const filteredData = useMemo(() => {
        let result = Array.isArray(processedList) ? [...processedList] : [];
        if (fromDate) {
            result = result.filter(item => item.date >= fromDate);
        }
        if (toDate) {
            result = result.filter(item => item.date <= toDate);
        }

        const term = searchValue.toLowerCase().trim();
        const filtered = result.filter(item => {
            const val = searchField === 'product_name' ? item.Product?.product_name : item[searchField];
            return searchCondition === 'Equal' ? String(val).toLowerCase() === term : String(val).toLowerCase().includes(term);
        });

        filtered.sort((a, b) => {
            let aVal, bVal;
            if (sortField === 'ref_no') {
                aVal = String(a.ref_no || '');
                bVal = String(b.ref_no || '');
                return sortOrder === 'asc'
                    ? aVal.localeCompare(bVal, undefined, { numeric: true, sensitivity: 'base' })
                    : bVal.localeCompare(aVal, undefined, { numeric: true, sensitivity: 'base' });
            } else if (sortField === 'date') {
                aVal = new Date(a.date || 0).getTime();
                bVal = new Date(b.date || 0).getTime();
            } else if (sortField === 'product_name') {
                aVal = String(a.Product?.product_name || '');
                bVal = String(b.Product?.product_name || '');
                return sortOrder === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
            } else {
                aVal = a.id || 0;
                bVal = b.id || 0;
            }

            if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
            if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
            return 0;
        });

        return filtered;
    }, [processedList, searchValue, searchField, searchCondition, fromDate, toDate, sortField, sortOrder]);
    const currentItems = filteredData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
    const totalPages = Math.ceil(filteredData.length / itemsPerPage) || 1;

    const FormLabel = ({ children }) => (
        <label className="text-right text-[14px] text-slate-800 pr-4 font-bold self-center whitespace-nowrap">
            {children}
        </label>
    );

    return (
        <div className="min-h-screen bg-slate-50 p-6 font-sans">
            
            {/* Header Section */}
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                    <Factory className="text-blue-700" /> RG1 Production Ledger
                </h1>
                <div className="flex gap-2">
                    <button onClick={handleAddNew} className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg font-bold text-xs uppercase shadow-md transition-all active:scale-95"><Plus size={16} /> New Entry</button>
                    <button onClick={fetchRecords} className="p-2 border border-slate-200 rounded-lg bg-white shadow-sm"><RefreshCw size={20} className={loading ? 'animate-spin' : ''} /></button>
                </div>
            </div>

            {/* Search Bar - Handled in Sidebar */}
            <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm mb-6 flex justify-end items-center gap-4">
                {!isSelectionMode ? (
                    <button onClick={() => setIsSelectionMode(true)} className="border border-blue-200 bg-blue-50 text-blue-600 px-10 py-2 rounded-xl text-sm font-bold hover:bg-blue-100 transition-all">Select</button>
                ) : (
                    <div className="flex gap-2">
                        <button onClick={() => { setIsSelectionMode(false); setSelectedIds([]); }} className="border border-slate-200 px-6 py-2 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 shadow-sm">Clear</button>
                        <button onClick={handleBulkDelete} disabled={selectedIds.length === 0} className="bg-red-500 hover:bg-red-600 text-white px-6 py-2 rounded-xl text-sm font-bold shadow-md disabled:opacity-50 flex items-center gap-2"><Trash2 size={14}/> Delete ({selectedIds.length})</button>
                    </div>
                )}
                
                <div className="bg-slate-50 text-blue-600 border border-slate-100 px-4 py-2 rounded-xl text-xs font-bold flex items-center justify-center min-w-[100px] gap-2"><Filter size={14}/> {filteredData.length} Matches</div>
            </div>

            {/* List Table */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-blue-700 text-white text-[11px] font-bold uppercase tracking-wider">
                        <tr>
                            {isSelectionMode && <th className="p-4 w-12 text-center">#</th>}
                            <th className="p-4 cursor-pointer select-none" onClick={() => handleSort('id')}>
                                Log # {sortField === 'id' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}
                            </th>
                            <th className="p-4 cursor-pointer select-none" onClick={() => handleSort('date')}>
                                Date {sortField === 'date' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}
                            </th>
                            <th className="p-4 cursor-pointer select-none" onClick={() => handleSort('product_name')}>
                                Count (Product SKU) {sortField === 'product_name' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}
                            </th>
                            <th className="p-4 text-right pr-10">Production (KG)</th>
                            <th className="p-4 text-right pr-10">Total Stock (KG)</th>
                            {!isSelectionMode && <th className="p-4 w-10"></th>}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono">
                        {currentItems.map(item => (
                            <tr key={item.id} className={`hover:bg-blue-50 cursor-pointer ${selectedIds.includes(item.id) ? 'bg-blue-100/50' : ''}`} onClick={() => handleRowClick(item)}>
                                {isSelectionMode && (
                                    <td className="p-4 text-center">
                                        {selectedIds.includes(item.id) ? <CheckSquare size={18} className="text-blue-600 mx-auto"/> : <Square size={18} className="text-slate-200 mx-auto"/>}
                                    </td>
                                )}
                                <td className="p-4 text-sm font-bold text-blue-600">#{item.id}</td>
                                <td className="p-4 text-sm text-slate-600">{item.date}</td>
                                <td className="p-4 text-sm font-semibold text-slate-700 uppercase font-sans">{item.Product?.product_name}</td>
                                <td className="p-4 text-right pr-10 font-bold text-blue-800">{item.production_kgs} KG</td>
                                <td className="p-4 text-right pr-10 font-bold text-emerald-700">{item.stock_kgs} KG</td>
                                {!isSelectionMode && <td className="p-4 text-slate-300"><Edit size={16} /></td>}
                            </tr>
                        ))}
                    </tbody>
                </table>
                <div className="p-3 bg-slate-50 border-t flex items-center justify-between">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Page {currentPage} of {totalPages}</span>
                    <div className="flex gap-1">
                        <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} className="p-1.5 border rounded bg-white shadow-sm disabled:opacity-30"><ChevronLeft size={16}/></button>
                        <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)} className="p-1.5 border rounded bg-white shadow-sm disabled:opacity-30"><ChevronRight size={16}/></button>
                    </div>
                </div>
            </div>

            {/* --- LEGACY STYLE POPUP MODAL (MATCHED TO IMAGE) --- */}
            {isModalOpen && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/65 backdrop-blur-md p-4 font-sans">
    <div className="relative bg-white w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden border border-slate-200/70 animate-in zoom-in-95 duration-200 flex flex-col max-h-[92vh]">
      
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-700 to-indigo-700 px-6 py-5 flex justify-between items-center text-white shadow-md">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-white/20 rounded-lg">
            <Factory size={24} /> {/* or Zap, Package, Layers */}
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight">RG1 Production</h2>
            <p className="text-blue-100/90 text-sm font-medium mt-0.5 uppercase tracking-wide">
              Add / Modify Packing Production Details
            </p>
          </div>
        </div>
        <button
          onClick={() => setIsModalOpen(false)}
          className="p-2.5 rounded-xl hover:bg-white/20 transition-all active:scale-95"
        >
          <X size={24} strokeWidth={3} />
        </button>
      </div>

      {/* Body */}
      <div className="p-8 overflow-y-auto flex-1 bg-gradient-to-b from-slate-50 to-white">
        <form onSubmit={handleSave} className="space-y-7 max-w-3xl mx-auto">
          
          {/* Date */}
          <div className="grid grid-cols-12 items-center gap-6">
            <div className="col-span-4 flex justify-end">
              <FormLabel>Date</FormLabel>
            </div>
            <div className="col-span-8">
              <input
                type="date"
                className="w-56 p-3.5 border border-slate-300 rounded-lg bg-white text-base font-semibold focus:border-blue-500 focus:ring-2 focus:ring-blue-400/30 outline-none shadow-sm"
                value={formData.date || ''}
                onChange={e => setFormData({ ...formData, date: e.target.value })}
              />
            </div>
          </div>

          {/* Count / Product */}
          <div className="grid grid-cols-12 items-center gap-6">
            <div className="col-span-4 flex justify-end">
              <FormLabel>Count</FormLabel>
            </div>
            <div className="col-span-8">
              <select
                className="w-full p-3.5 border border-slate-300 rounded-lg bg-white uppercase text-base font-semibold focus:border-blue-500 focus:ring-2 focus:ring-blue-400/30 outline-none shadow-sm"
                value={formData.product_id || ''}
                onChange={e => onProductChange(e.target.value)}
              >
                <option value="">-- SELECT SKU / PRODUCT --</option>
                {products.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.product_name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Packing Type & Weight */}
          <div className="grid grid-cols-12 items-center gap-6">
            <div className="col-span-4 flex justify-end">
              <FormLabel>Packing Type</FormLabel>
            </div>
            <div className="col-span-4">
              <input
                type="text"
                readOnly
                className="w-full p-3.5 border border-slate-300 bg-slate-100 text-slate-700 font-semibold rounded-lg outline-none cursor-default shadow-sm"
                value={packingTypes.find(t => t.id == formData.packing_type_id)?.packing_type || ''}
              />
            </div>
            <div className="col-span-2 flex justify-end">
              <FormLabel>Weight</FormLabel>
            </div>
            <div className="col-span-2">
              <input
                type="text"
                readOnly
                className="w-full p-3.5 border border-slate-300 bg-slate-100 text-slate-700 font-semibold text-center rounded-lg outline-none cursor-default shadow-sm"
                value={formData.weight_per_bag ?? ''}
              />
            </div>
          </div>

          {/* Prev Day Closing & Production Kgs */}
          <div className="grid grid-cols-12 items-center gap-6">
            <div className="col-span-3 flex justify-end">
              <FormLabel>Prv. Day Closing</FormLabel>
            </div>
            <div className="col-span-3">
              <input
                type="number"
                step="0.01"
                readOnly
                className="w-full p-3.5 border border-slate-300 bg-slate-100 text-slate-800 font-black text-base text-right rounded-lg outline-none cursor-default shadow-sm"
                value={formData.prev_closing_kgs ?? ''}
              />
            </div>
            <div className="col-span-3 flex justify-end">
              <FormLabel>Production Kgs</FormLabel>
            </div>
            <div className="col-span-3">
              <input
                type="number"
                step="0.01"
                readOnly
                className="w-full p-3.5 border-2 border-slate-300 bg-slate-100 text-blue-800 font-black text-base text-right rounded-lg outline-none cursor-default shadow-sm"
                value={formData.production_kgs ?? ''}
              />
            </div>
          </div>

          {/* Invoice Kgs & Stock Kgs */}
          <div className="grid grid-cols-12 items-center gap-6">
            <div className="col-span-3 flex justify-end">
              <FormLabel>Invoice Kgs</FormLabel>
            </div>
            <div className="col-span-3">
              <input
                type="number"
                step="0.01"
                readOnly
                className="w-full p-3.5 border border-slate-300 bg-slate-100 text-slate-800 font-bold text-base text-right rounded-lg outline-none cursor-default shadow-sm"
                value={formData.invoice_kgs ?? ''}
              />
            </div>
            <div className="col-span-3 flex justify-end">
              <FormLabel>Stock Kgs</FormLabel>
            </div>
            <div className="col-span-3">
              <input
                type="number"
                step="0.01"
                readOnly
                className="w-full p-3.5 border border-slate-300 bg-slate-100 text-blue-800 font-black text-base text-right rounded-lg outline-none cursor-default shadow-sm"
                value={formData.stock_kgs ?? ''}
              />
            </div>
          </div>

          {/* Stock Bags & Stock Loose – Stock Bags is now editable */}
          <div className="grid grid-cols-12 items-center gap-6">
            <div className="col-span-3 flex justify-end">
              <FormLabel>Stock Bags</FormLabel>
            </div>
            <div className="col-span-3">
              <input
                type="number"
                step="0.01"
                className="w-full p-3.5 border border-blue-400 bg-white text-blue-800 font-black text-base text-right rounded-lg outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-400/30 shadow-sm"
                value={formData.stock_bags ?? ''}
                onChange={e => setFormData({ ...formData, stock_bags: e.target.value })}
              />
            </div>
            <div className="col-span-3 flex justify-end">
              <FormLabel>Stock Loose</FormLabel>
            </div>
            <div className="col-span-3">
              <input
                type="number"
                step="0.01"
                className="w-full p-3.5 border border-blue-400 bg-white text-blue-800 font-black text-base text-right rounded-lg outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-400/30 shadow-sm"
                value={formData.stock_loose_kgs ?? ''}
                onChange={e => setFormData({ ...formData, stock_loose_kgs: e.target.value })}
              />
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex justify-end gap-4 pt-10 mt-4 border-t border-slate-200">
            <button
              type="submit"
              disabled={submitLoading}
              className={`
                px-10 py-3 rounded-xl font-semibold flex items-center gap-3 shadow-md min-w-[140px] justify-center transition-all
                ${submitLoading
                  ? 'bg-slate-400 text-white cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 text-white hover:shadow-blue-300 active:scale-[0.98]'
                }
              `}
            >
              {submitLoading ? (
                <>
                  <Loader2 className="animate-spin" size={20} />
                  Saving...
                </>
              ) : (
                <>
                  <Save size={20} />
                  Update
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-10 py-3 border-2 border-slate-400 rounded-xl text-slate-700 font-semibold hover:bg-slate-50 transition-colors flex items-center gap-3"
            >
              Cancel
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

export default RG1Production;
 