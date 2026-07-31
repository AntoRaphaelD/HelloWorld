import React, { useState, useEffect, useMemo } from 'react';
import { mastersAPI, transactionsAPI } from '../service/api';
import {
    Plus, Edit, Trash2, X, ChevronLeft, ChevronRight, RefreshCw,
    Save, Search, Square, CheckSquare, Clock, Truck, MapPin,
    CalendarDays, ShieldCheck, Package, IndianRupee, ArrowRight
} from 'lucide-react';
import { useFilter } from '../context/FilterContext';
import LocalSearchBar from './LocalSearchBar';

const DespatchEntry = () => {
    const [list, setList] = useState([]);
    const [transports, setTransports] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [submitLoading, setSubmitLoading] = useState(false);
    const [isSelectionMode, setIsSelectionMode] = useState(false);
    const [selectedIds, setSelectedIds] = useState([]);
    
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

    const emptyState = {
        id: null,
        load_no: '',
        load_date: new Date().toISOString().split('T')[0],
        transport_id: '',
        lr_no: '',
        lr_date: new Date().toISOString().split('T')[0],
        vehicle_no: '',
        delivery: '',
        insurance_no: '',
        in_hh: '12', in_mm: '00', in_period: 'PM',
        out_hh: '12', out_mm: '00', out_period: 'PM',
        no_of_bags: 0,
        freight: 0,
        freight_per_bag: 0,
        original_no_of_bags: 0,
        original_freight: 0
    };

    const [formData, setFormData] = useState(emptyState);
    const hours = Array.from({ length: 12 }, (_, i) => (i + 1).toString().padStart(2, '0'));
    const minutes = Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0'));

    const calculatedFreightPerBag = useMemo(() => {
        const bags = parseFloat(formData.original_no_of_bags) || 0;
        const total = parseFloat(formData.original_freight) || 0;
        return bags > 0 ? (total / bags).toFixed(2) : '0.00';
    }, [formData.original_no_of_bags, formData.original_freight]);

    useEffect(() => {
        fetchRecords();
        fetchTransports();
        resetFilters([
            { value: 'vehicle_no', label: 'Vehicle No' },
            { value: 'load_no', label: 'Load No' },
            { value: 'lr_no', label: 'LR No' }
        ], 'vehicle_no', true);
    }, []);

    const fetchRecords = async () => {
        setLoading(true);
        try {
            const data = await transactionsAPI.despatch.getAll();
            setList(data.data.data || []);
        } catch (err) {
            console.error(err);
            setList([]);
        } finally {
            setLoading(false);
        }
    };

    const fetchTransports = async () => {
        try {
            const data = await mastersAPI.transports.getAll();
            setTransports(data.data.data || []);
        } catch (err) {
            console.error(err);
        }
    };

    const handleAddNew = () => {
        const nextNo = (list.length + 1).toString();
        setFormData({ ...emptyState, load_no: nextNo });
        setIsModalOpen(true);
    };

    const handleRowClick = (item) => {
        if (isSelectionMode) {
            setSelectedIds(prev => prev.includes(item.id) ? prev.filter(id => id !== item.id) : [...prev, item.id]);
        } else {
            const parseTime = (str) => {
                if (!str) return { hh: '12', mm: '00', period: 'PM' };
                const [time, period] = str.split(' ');
                const [hh, mm] = time.split(':');
                return { hh, mm, period };
            };
            const inT = parseTime(item.in_time);
            const outT = parseTime(item.out_time);
            setFormData({
                ...item,
                transport_id: item.transport_id?.toString() || '',
                in_hh: inT.hh, in_mm: inT.mm, in_period: inT.period,
                out_hh: outT.hh, out_mm: outT.mm, out_period: outT.period
            });
            setIsModalOpen(true);
        }
    };

    const handleBulkDelete = async () => {
        if (selectedIds.length === 0) return;
        if (window.confirm(`Permanently delete ${selectedIds.length} despatch records?`)) {
            try {
                await Promise.all(selectedIds.map(id => transactionsAPI.despatch.delete(id)));
                setSelectedIds([]);
                setIsSelectionMode(false);
                fetchRecords();
            } catch (err) {
                alert('Delete failed.');
            }
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setSubmitLoading(true);
        const finalIn = `${formData.in_hh}:${formData.in_mm} ${formData.in_period}`;
        const finalOut = `${formData.out_hh}:${formData.out_mm} ${formData.out_period}`;
        const payload = {
            ...formData,
            in_time: finalIn,
            out_time: finalOut,
            freight_per_bag: parseFloat(calculatedFreightPerBag)
        };

        try {
            const input = {
                load_no: payload.load_no || '',
                load_date: payload.load_date || '',
                transport_id: payload.transport_id ? Number(payload.transport_id) : null,
                lr_no: payload.lr_no || '',
                lr_date: payload.lr_date || '',
                vehicle_no: payload.vehicle_no || '',
                delivery: payload.delivery || '',
                insurance_no: payload.insurance_no || '',
                in_time: finalIn,
                out_time: finalOut,
                original_no_of_bags: Number(payload.original_no_of_bags) || 0,
                original_freight: Number(payload.original_freight) || 0,
                no_of_bags: formData.id ? (Number(payload.no_of_bags) || 0) : (Number(payload.original_no_of_bags) || 0),
                freight: formData.id ? (Number(payload.freight) || 0) : (Number(payload.original_freight) || 0),
                freight_per_bag: Number(calculatedFreightPerBag) || 0
            };
            if (formData.id) {
                await transactionsAPI.despatch.update(formData.id, input);
            } else {
                await transactionsAPI.despatch.create(input);
            }
            fetchRecords();
            setIsModalOpen(false);
        } catch (err) {
            alert('Error saving.');
        } finally {
            setSubmitLoading(false);
        }
    };

    const filteredData = useMemo(() => {
        let result = Array.isArray(list) ? [...list] : [];
        if (fromDate) {
            result = result.filter(item => item.load_date >= fromDate);
        }
        if (toDate) {
            result = result.filter(item => item.load_date <= toDate);
        }

        const term = searchValue.toLowerCase().trim();
        const filtered = result.filter(item => {
            const val = item[searchField] || '';
            return String(val).toLowerCase().includes(term);
        });

        filtered.sort((a, b) => {
            let aVal, bVal;
            if (sortField === 'load_no') {
                aVal = String(a.load_no || '');
                bVal = String(b.load_no || '');
                return sortOrder === 'asc'
                    ? aVal.localeCompare(bVal, undefined, { numeric: true, sensitivity: 'base' })
                    : bVal.localeCompare(aVal, undefined, { numeric: true, sensitivity: 'base' });
            } else if (sortField === 'date') {
                aVal = new Date(a.load_date || 0).getTime();
                bVal = new Date(b.load_date || 0).getTime();
            } else {
                aVal = a.id || 0;
                bVal = b.id || 0;
            }

            if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
            if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
            return 0;
        });

        return filtered;
    }, [list, searchValue, searchField, fromDate, toDate, sortField, sortOrder]);

    const currentItems = filteredData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
    const totalPages = Math.ceil(filteredData.length / itemsPerPage) || 1;
    const fieldClass = 'w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-900 outline-none transition placeholder:text-slate-400 hover:border-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10';
    const labelClass = 'mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-slate-500';

    const TimePicker = ({ type }) => {
        const isIn = type === 'in';
        const hhKey = isIn ? 'in_hh' : 'out_hh';
        const mmKey = isIn ? 'in_mm' : 'out_mm';
        const periodKey = isIn ? 'in_period' : 'out_period';
        return (
            <div className="grid grid-cols-[1fr_1fr_1.1fr] overflow-hidden rounded-lg border border-slate-300 bg-white focus-within:border-blue-500 focus-within:ring-4 focus-within:ring-blue-500/10">
                <select className="border-r border-slate-200 bg-transparent px-2 py-2.5 text-center text-sm font-semibold outline-none" value={formData[hhKey]} onChange={e => setFormData({ ...formData, [hhKey]: e.target.value })}>{hours.map(h => <option key={h} value={h}>{h}</option>)}</select>
                <select className="border-r border-slate-200 bg-transparent px-2 py-2.5 text-center text-sm font-semibold outline-none" value={formData[mmKey]} onChange={e => setFormData({ ...formData, [mmKey]: e.target.value })}>{minutes.map(m => <option key={m} value={m}>{m}</option>)}</select>
                <select className="bg-transparent px-2 py-2.5 text-center text-sm font-bold text-blue-700 outline-none" value={formData[periodKey]} onChange={e => setFormData({ ...formData, [periodKey]: e.target.value })}><option value="AM">AM</option><option value="PM">PM</option></select>
            </div>
        );
    };

    const SectionTitle = ({ icon: Icon, children }) => (
        <div className="mb-5 flex items-center gap-2 border-b border-slate-100 pb-3">
            <Icon size={17} className="text-blue-600" />
            <h3 className="text-sm font-bold text-slate-900">{children}</h3>
        </div>
    );

    return (
        <div className="min-h-screen bg-[#f4f7fb] px-4 py-6 font-sans text-slate-900 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-[1500px]">
                <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-900 text-white shadow-sm"><Truck size={24} /></div>
                        <div>
                            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-blue-600">Logistics</p>
                            <h1 className="text-2xl font-bold tracking-tight text-slate-950">Despatch Registry</h1>
                            <p className="mt-0.5 text-sm text-slate-500">Manage vehicle movements, freight and delivery records.</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={fetchRecords} title="Refresh records" className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-600 shadow-sm transition hover:bg-slate-50"><RefreshCw size={17} className={loading ? 'animate-spin' : ''} /></button>
                        <button onClick={handleAddNew} className="inline-flex h-10 items-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"><Plus size={17} /> New despatch</button>
                    </div>
                </header>

                <LocalSearchBar />

                {/* Search Bar - Handled in Sidebar */}
                <div className="mb-5 rounded-xl border border-slate-200 bg-white p-3 shadow-sm flex justify-end items-center gap-4">
                    {!isSelectionMode ? (
                        <button onClick={() => setIsSelectionMode(true)} className="h-[42px] rounded-lg border border-blue-500 bg-blue-500 px-5 py-2 text-sm font-semibold text-white transition-colors duration-200 hover:bg-blue-800 hover:border-blue-700 hover:text-white">Select records</button>
                    ) : (
                        <div className="flex gap-2"><button onClick={() => { setIsSelectionMode(false); setSelectedIds([]); }} className="h-[42px] rounded-lg border border-slate-300 px-4 text-sm font-semibold text-slate-700">Clear</button><button onClick={handleBulkDelete} disabled={selectedIds.length === 0} className="inline-flex h-[42px] items-center gap-2 rounded-lg bg-red-600 px-4 text-sm font-semibold text-white disabled:opacity-40"><Trash2 size={16} /> Delete ({selectedIds.length})</button></div>
                    )}
                </div>
            {/* </section> */}
            

            <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
                    <div><h2 className="text-sm font-semibold text-slate-900">Despatch records</h2><p className="mt-0.5 text-xs text-slate-500">{filteredData.length} record{filteredData.length === 1 ? '' : 's'} found</p></div>
                    {isSelectionMode && <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">{selectedIds.length} selected</span>}
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[850px] text-left">
                        <thead className="border-b border-slate-200 bg-slate-50">
                            <tr className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                                {isSelectionMode && <th className="w-14 px-5 py-3 text-center">Select</th>}
                                <th className="px-5 py-3 cursor-pointer select-none" onClick={() => handleSort('load_no')}>
                                    Load number {sortField === 'load_no' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}
                                </th>
                                <th className="px-5 py-3 cursor-pointer select-none" onClick={() => handleSort('date')}>
                                    Load date {sortField === 'date' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}
                                </th>
                                <th className="px-5 py-3">Transport</th>
                                <th className="px-5 py-3 text-right">Bags</th>
                                <th className="px-5 py-3 text-right">Freight</th>
                                {!isSelectionMode && <th className="w-16 px-5 py-3"><span className="sr-only">Edit</span></th>}
                            </tr>
                        </thead>
                            <tbody className="divide-y divide-slate-100">
                                {loading ? (
                                    <tr><td colSpan={7} className="px-5 py-16 text-center text-sm text-slate-500"><RefreshCw size={20} className="mx-auto mb-3 animate-spin text-blue-600" />Loading despatch records...</td></tr>
                                ) : currentItems.length > 0 ? currentItems.map(item => (
                                    <tr key={item.id} onClick={() => handleRowClick(item)} className={`group cursor-pointer transition hover:bg-blue-50/60 ${selectedIds.includes(item.id) ? 'bg-blue-50' : ''}`}>
                                        {isSelectionMode && <td className="px-5 py-4 text-center">{selectedIds.includes(item.id) ? <CheckSquare size={19} className="mx-auto text-blue-600" /> : <Square size={19} className="mx-auto text-slate-300" />}</td>}
                                        <td className="px-5 py-4"><span className="inline-flex rounded-md bg-slate-100 px-2.5 py-1 font-mono text-sm font-bold text-slate-800">L-{item.load_no}</span></td>
                                        <td className="px-5 py-4 text-sm text-slate-600">{item.load_date || '—'}</td>
                                        <td className="px-5 py-4 text-sm font-semibold uppercase text-slate-800">{item.Transport?.transport_name || 'DIRECT'}</td>
                                        <td className="px-5 py-4 text-right text-sm font-semibold tabular-nums">{item.original_no_of_bags ?? item.no_of_bags ?? 0}</td>
                                        <td className="px-5 py-4 text-right text-sm font-semibold tabular-nums">₹{parseFloat(item.original_freight ?? item.freight ?? 0).toLocaleString('en-IN')}</td>
                                        {!isSelectionMode && <td className="px-5 py-4 text-right"><span className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 group-hover:bg-white group-hover:text-blue-600"><Edit size={16} /></span></td>}
                                    </tr>
                                )) : (
                                    <tr><td colSpan={7} className="px-5 py-16 text-center"><Truck size={28} className="mx-auto mb-3 text-slate-300" /><p className="text-sm font-semibold text-slate-700">No despatch records found</p><p className="mt-1 text-xs text-slate-400">Try changing your search or create a new despatch.</p></td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                    <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50/70 px-5 py-3"><span className="text-xs font-medium text-slate-500">Page <strong className="text-slate-800">{currentPage}</strong> of {totalPages}</span><div className="flex gap-1.5"><button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-300 bg-white disabled:opacity-40"><ChevronLeft size={17} /></button><button disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)} className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-300 bg-white disabled:opacity-40"><ChevronRight size={17} /></button></div></div>
                </section>
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-3 backdrop-blur-sm sm:p-6">
                    <div className="flex max-h-[94vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-white/20 bg-white shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 sm:px-7">
                            <div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white"><Truck size={20} /></div><div><h2 className="text-lg font-bold text-slate-950">{formData.id ? 'Edit despatch' : 'New despatch'}</h2><p className="text-xs text-slate-500">Load {formData.load_no || 'NEW'} · Vehicle and freight information</p></div></div>
                            <button type="button" onClick={() => setIsModalOpen(false)} className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"><X size={20} /></button>
                        </div>

                        <form onSubmit={handleSave} className="flex min-h-0 flex-1 flex-col">
                            <div className="flex-1 overflow-y-auto bg-slate-50/60 p-5 sm:p-7">
                                <div className="grid gap-5 lg:grid-cols-2">
                                    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                                        <SectionTitle icon={CalendarDays}>Load information</SectionTitle>
                                        <div className="grid gap-4 sm:grid-cols-2">
                                            <div><label className={labelClass}>Load number</label><input type="text" readOnly className={`${fieldClass} cursor-default bg-slate-100 font-mono font-bold`} value={formData.load_no || 'NEW'} /></div>
                                            <div><label className={labelClass}>Load date</label><input type="date" className={fieldClass} value={formData.load_date || ''} onChange={e => setFormData({ ...formData, load_date: e.target.value })} /></div>
                                            <div className="sm:col-span-2"><label className={labelClass}>Transport</label><select className={`${fieldClass} uppercase`} value={formData.transport_id || ''} onChange={e => setFormData({ ...formData, transport_id: e.target.value })}><option value="">— Select agency —</option>{transports.map(t => <option key={t.id} value={t.id}>{t.transport_name}</option>)}</select></div>
                                            <div><label className={labelClass}>LR number</label><input type="text" className={`${fieldClass} uppercase`} value={formData.lr_no || ''} onChange={e => setFormData({ ...formData, lr_no: e.target.value.toUpperCase() })} placeholder="Enter LR number" /></div>
                                            <div><label className={labelClass}>LR date</label><input type="date" className={fieldClass} value={formData.lr_date || ''} onChange={e => setFormData({ ...formData, lr_date: e.target.value })} /></div>
                                        </div>
                                    </section>

                                    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                                        <SectionTitle icon={MapPin}>Vehicle & destination</SectionTitle>
                                        <div className="grid gap-4">
                                            <div><label className={labelClass}>Vehicle number</label><input type="text" required className={`${fieldClass} border-slate-400 font-mono font-bold uppercase tracking-wide`} value={formData.vehicle_no || ''} onChange={e => setFormData({ ...formData, vehicle_no: e.target.value.toUpperCase() })} placeholder="TN 37 AB 1234" /></div>
                                            <div><label className={labelClass}>Delivery to</label><input type="text" className={`${fieldClass} uppercase`} value={formData.delivery || ''} onChange={e => setFormData({ ...formData, delivery: e.target.value.toUpperCase() })} placeholder="Location / party" /></div>
                                            <div><label className={labelClass}>Insurance number</label><div className="relative"><ShieldCheck className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={17} /><input type="text" className={`${fieldClass} pl-10`} value={formData.insurance_no || ''} onChange={e => setFormData({ ...formData, insurance_no: e.target.value })} placeholder="Policy number" /></div></div>
                                        </div>
                                    </section>

                                    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                                        <SectionTitle icon={Clock}>Gate timing</SectionTitle>
                                        <div className="flex flex-col gap-3 sm:flex-row sm:items-end"><div className="flex-1"><label className={labelClass}>Time in</label><TimePicker type="in" /></div><div className="hidden h-[42px] items-center text-slate-300 sm:flex"><ArrowRight size={18} /></div><div className="flex-1"><label className={labelClass}>Time out</label><TimePicker type="out" /></div></div>
                                    </section>

                                    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                                        <SectionTitle icon={IndianRupee}>Freight details</SectionTitle>
                                        <div className="grid gap-4 sm:grid-cols-2">
                                            <div><label className={labelClass}>Number of bags</label><div className="relative"><Package className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={17} /><input type="number" className={`${fieldClass} pl-10 text-right font-semibold tabular-nums`} value={formData.original_no_of_bags ?? ''} onChange={e => setFormData({ ...formData, original_no_of_bags: Number(e.target.value) })} placeholder="0" /></div></div>
                                            <div><label className={labelClass}>Total freight</label><div className="relative"><span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-semibold text-slate-400">₹</span><input type="number" className={`${fieldClass} pl-8 text-right font-semibold tabular-nums`} value={formData.original_freight ?? ''} onChange={e => setFormData({ ...formData, original_freight: Number(e.target.value) })} placeholder="0.00" /></div></div>
                                            <div className="sm:col-span-2 flex items-center justify-between rounded-lg border border-blue-100 bg-blue-50 px-4 py-3"><div><p className="text-[11px] font-bold uppercase tracking-wider text-blue-600">Freight per bag</p><p className="mt-0.5 text-xs text-blue-600/70">Calculated automatically</p></div><input type="text" readOnly className="w-36 border-0 bg-transparent text-right text-xl font-bold tabular-nums text-blue-800 outline-none" value={`₹ ${calculatedFreightPerBag}`} /></div>
                                        </div>
                                    </section>
                                </div>
                            </div>

                            <div className="flex flex-col-reverse gap-2 border-t border-slate-200 bg-white px-6 py-4 sm:flex-row sm:justify-end sm:px-7">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="h-10 rounded-lg border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-700 hover:bg-slate-50">Cancel</button>
                                <button type="submit" disabled={submitLoading} className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-blue-600 px-6 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300">{submitLoading ? <><RefreshCw size={16} className="animate-spin" /> Saving...</> : <><Save size={16} /> Save record</>}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DespatchEntry;
