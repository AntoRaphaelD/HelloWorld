import React, { useState, useEffect, useMemo, useRef } from 'react';
import { mastersAPI } from '../service/api';
import { 
    Plus, Edit, X, Save, Calculator, Zap, CheckCircle2, 
    AlertCircle, Info, BookOpen, RefreshCw, Database, 
    Settings, Square, CheckSquare, Search, Filter,
    Activity, ArrowRightCircle, FileText, LayoutGrid,
    ChevronLeft, ChevronRight, Landmark
} from 'lucide-react';

// --- Formula Constants Dictionary ---
const FORMULA_VARIABLES = {
    "Base Values": [
        { key: "[H]", label: "Gross Amount (Rate * Qty)", desc: "The raw total before any taxes or deductions." },
        { key: "[Rate / Kg]", label: "Product Rate", desc: "The price per unit/Kg defined in the invoice." },
        { key: "[Total Kgs]", label: "Total Quantity", desc: "The total weight or quantity of items." },
    ],
    "Tax & Charges": [
        { key: "[igstper]", label: "IGST %", desc: "The percentage value entered in the IGST column." },
        { key: "[igstamt]", label: "IGST Amount", desc: "The calculated amount of IGST." },
        { key: "[CharityRs]", label: "Charity Rate", desc: "Per unit charity value from Product Master." },
        { key: "[Lorryfright]", label: "Freight Amount", desc: "The value entered for transport/freight." },
    ],
    "Derived Totals": [
        { key: "[A]", label: "Assessable Value", desc: "The value calculated in the 'Assess Value' row." },
        { key: "[I]", label: "Sub Total", desc: "The value calculated in the 'Sub Total' row." },
    ]
};

// --- Global Reference Modal Component ---
const FormulaReferenceModal = ({ isOpen, onClose }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-200 animate-in zoom-in duration-200">
                <div className="bg-blue-600 p-4 flex justify-between items-center text-white">
                    <div className="flex items-center gap-2">
                        <BookOpen size={20} />
                        <h3 className="font-bold text-sm uppercase tracking-wider">Formula Keywords Reference</h3>
                    </div>
                    <button onClick={onClose} className="hover:bg-white/10 p-1 rounded-lg"><X size={20}/></button>
                </div>
                <div className="p-6 max-h-[70vh] overflow-y-auto bg-slate-50">
                    {Object.entries(FORMULA_VARIABLES).map(([group, vars]) => (
                        <div key={group} className="mb-6 last:mb-0">
                            <h4 className="text-[10px] font-black text-blue-600 uppercase mb-3 border-b border-blue-100 pb-1">{group}</h4>
                            <div className="space-y-3">
                                {vars.map(v => (
                                    <div key={v.key} className="flex items-start gap-4 p-3 rounded-xl bg-white shadow-sm border border-slate-100">
                                        <code className="bg-blue-50 text-blue-700 px-2 py-1 rounded font-black text-xs min-w-[100px] text-center">{v.key}</code>
                                        <div>
                                            <p className="text-xs font-bold text-slate-700">{v.label}</p>
                                            <p className="text-[11px] text-slate-500 mt-0.5">{v.desc}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
                <div className="p-4 bg-white border-t flex justify-end">
                    <button onClick={onClose} className="bg-slate-900 text-white px-8 py-2 rounded-xl text-xs font-bold hover:bg-blue-600 transition-all shadow-lg">Close Guide</button>
                </div>
            </div>
        </div>
    );
};

// --- Smart Formula Component ---
const SmartFormulaInput = ({ label, value, onChange }) => {
    const [showPicker, setShowPicker] = useState(false);
    const inputRef = useRef(null);

    const insertVar = (v) => {
        const start = inputRef.current.selectionStart || 0;
        const end = inputRef.current.selectionEnd || 0;
        const text = value || '';
        const newValue = text.substring(0, start) + v + text.substring(end);
        onChange(newValue);
        setShowPicker(false);
    };

    return (
        <div className="relative w-full group">
            {label && (
                <div className="flex items-center justify-between mb-1 px-1">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{label}</span>
                    <button type="button" onClick={() => setShowPicker(!showPicker)} className="text-[9px] text-blue-500 hover:text-blue-700 flex items-center gap-0.5 font-bold transition-opacity">
                        <Zap size={10}/> Insert Variable
                    </button>
                </div>
            )}
            <div className="relative">
                <input 
                    ref={inputRef}
                    className="w-full bg-slate-100 border border-slate-200 rounded-lg p-2 text-xs font-mono text-blue-700 outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white transition-all shadow-inner"
                    value={value || ''}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder="Enter formula logic..."
                />
                {!label && (
                    <button type="button" onClick={() => setShowPicker(!showPicker)} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-300 hover:text-blue-500">
                        <Zap size={14}/>
                    </button>
                )}
            </div>
            {showPicker && (
                <div className="absolute z-[60] top-full left-0 w-72 bg-white shadow-2xl border border-slate-200 rounded-2xl p-4 mt-2 animate-in slide-in-from-top-2 duration-200">
                    <div className="flex justify-between items-center mb-3 border-b pb-2">
                        <span className="text-[10px] font-black text-slate-800 uppercase tracking-widest">Logic Snippets</span>
                        <X size={14} className="cursor-pointer text-slate-400 hover:text-rose-500" onClick={() => setShowPicker(false)}/>
                    </div>
                    <div className="max-h-60 overflow-y-auto space-y-3 pr-1">
                        {Object.entries(FORMULA_VARIABLES).map(([group, fields]) => (
                            <div key={group}>
                                <p className="text-[8px] font-black text-slate-400 uppercase mb-2 tracking-tighter">{group}</p>
                                <div className="grid grid-cols-1 gap-1">
                                    {fields.map(f => (
                                        <button key={f.key} type="button" onClick={() => insertVar(f.key)} className="flex justify-between items-center p-2 hover:bg-blue-50 rounded-xl text-left transition-colors border border-transparent hover:border-blue-100 group/item">
                                            <span className="text-[10px] font-bold text-slate-600">{f.label}</span>
                                            <code className="text-[9px] font-black text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-lg group-hover/item:bg-blue-200 transition-colors">{f.key}</code>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

const InvoiceTypeMaster = () => {
    const emptyState = {
        id: null,
        code: '', 
        type_name: '', 
        sales_type: 'GST SALES', 
        group_name: '', 
        is_option_ii: false,
        round_off_digits: 0,
        assess_formula: '[H]-[igstamt]-[Lorryfright]', 
        assess_account: '',
        rows: [
            { id: 'charity', label: 'Charity / Bale', checked: false, val: '', formula: '', account: '' },
            { id: 'vat', label: 'Tax [ VAT ]', checked: false, val: '', formula: '', account: '' },
            { id: 'duty', label: 'Duty', checked: false, val: '', formula: '', account: '' },
            { id: 'cess', label: 'Cess', checked: false, val: '', formula: '', account: '' },
            { id: 'hr_sec_cess', label: 'Hr.Sec.Cess', checked: false, val: '', formula: '', account: '' },
            { id: 'tcs', label: 'T.C.S', checked: false, val: '', formula: '', account: '' },
            { id: 'cst', label: 'CST', checked: false, val: '', formula: '', account: '' },
            { id: 'cenvat', label: 'CENVAT', checked: false, val: '', formula: '', account: '' },
        ],
        igst_checked: true, 
        igst_val: '5', 
        igst_formula: 'Round(([H]/([igstper]+100))*[igstper],0)', 
        igst_account: '',
        sub_total_formula: '[H]', 
        total_value_formula: '[Rate / Kg] * [Total Kgs]', 
        round_off_direction: 'Reverse', 
        round_off_account: '', 
        lorry_freight_account: '', 
        account_posting: true
    };

    const [list, setList] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [showGuide, setShowGuide] = useState(false);
    const [formData, setFormData] = useState(emptyState);
    const [loading, setLoading] = useState(false);
    const [submitLoading, setSubmitLoading] = useState(false);
    const [activeTab, setActiveTab] = useState('logic');

    // Search and Selection
    const [searchValue, setSearchValue] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    // --- MAPPING LOGIC (Preserved from source) ---
    const mapDbToState = (dbItem) => {
        const rowConfigs = [
            { id: 'charity', label: 'Charity / Bale', key: 'charity' },
            { id: 'vat', label: 'Tax [ VAT ]', key: 'vat' },
            { id: 'duty', label: 'Duty', key: 'duty' },
            { id: 'cess', label: 'Cess', key: 'cess' },
            { id: 'hr_sec_cess', label: 'Hr.Sec.Cess', key: 'hr_sec_cess' },
            { id: 'tcs', label: 'T.C.S', key: 'tcs' },
            { id: 'cst', label: 'CST', key: 'cst' },
            { id: 'cenvat', label: 'CENVAT', key: 'cenvat' },
        ];
        const mappedRows = rowConfigs.map(conf => ({
            id: conf.id,
            label: conf.label,
            checked: dbItem[`${conf.key}_checked`] || false,
            val: dbItem[`${conf.key}_percentage`] || dbItem[`${conf.key}_value`] || '',
            formula: dbItem[`${conf.key}_formula`] || '',
            account: dbItem[`${conf.key}_account`] || ''
        }));
        return { ...dbItem, igst_val: dbItem.igst_percentage || '', rows: mappedRows };
    };

    const mapStateToDb = (stateData) => {
        const flatData = { ...stateData };
        stateData.rows.forEach(row => {
            const key = row.id;
            flatData[`${key}_checked`] = row.checked;
            flatData[`${key}_formula`] = row.formula;
            flatData[`${key}_account`] = row.account;
            const numericVal = row.val === '' ? 0 : parseFloat(row.val);
            if (key === 'charity') flatData[`charity_value`] = numericVal;
            else flatData[`${key}_percentage`] = numericVal;
        });
        flatData.igst_percentage = stateData.igst_val === '' ? 0 : parseFloat(stateData.igst_val);
        delete flatData.rows;
        delete flatData.igst_val;
        delete flatData.createdAt;
        delete flatData.updatedAt;
        const idToReturn = flatData.id;
        delete flatData.id;
        return { payload: flatData, id: idToReturn };
    };

    const fetchRecords = async () => {
        setLoading(true);
        try {
            const res = await mastersAPI.invoiceTypes.getAll();
            setList(res.data.data || res.data || []);
        } catch (err) { console.error(err); } 
        finally { setLoading(false); }
    };

    useEffect(() => { fetchRecords(); }, []);

    const handleEdit = (item) => {
        setFormData(mapDbToState(item));
        setActiveTab('logic');
        setIsModalOpen(true);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setSubmitLoading(true);
        try {
            const { payload, id } = mapStateToDb(formData);
            if (id) await mastersAPI.invoiceTypes.update(id, payload);
            else await mastersAPI.invoiceTypes.create(payload);
            fetchRecords();
            setIsModalOpen(false);
        } catch (err) { alert("Save Failed"); } 
        finally { setSubmitLoading(false); }
    };

    const simulate = (formula) => {
        if (!formula || formula === '') return "0.00";
        try {
            let f = formula
                .replace(/\[H\]/g, '1320000')
                .replace(/\[Rate \/ Kg\]/g, '250')
                .replace(/\[Total Kgs\]/g, '5280')
                .replace(/\[CharityRs\]/g, '3')
                .replace(/\[igstper\]/g, '5')
                .replace(/\[igstamt\]/g, '62857')
                .replace(/\[Lorryfright\]/g, '0')
                .replace(/Round\(/g, 'Math.round(');
            const res = eval(f);
            return parseFloat(res).toLocaleString(undefined, { minimumFractionDigits: 2 });
        } catch { return 'Math Error'; }
    };

    const filteredData = useMemo(() => {
        return list.filter(item => 
            String(item.type_name || '').toLowerCase().includes(searchValue.toLowerCase()) ||
            String(item.code || '').toLowerCase().includes(searchValue.toLowerCase())
        ).sort((a,b) => b.id - a.id);
    }, [list, searchValue]);

    const currentItems = filteredData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    return (
        <div className="min-h-screen bg-slate-50 p-6 font-sans text-slate-900">
            
            {/* 1. HEADER SECTION */}
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <Calculator className="text-blue-600" /> Invoice Engine Master
                    </h1>
                    <p className="text-sm text-slate-500 font-medium">Configure mathematical logic and account posting protocols</p>
                </div>
                <div className="flex gap-2">
                    <button onClick={() => {setFormData(emptyState); setIsModalOpen(true);}} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg font-semibold shadow-sm transition-all active:scale-95">
                        <Plus size={18} /> New Logic Type
                    </button>
                    <button onClick={fetchRecords} className="p-2 border border-slate-200 rounded-lg bg-white text-slate-400 hover:text-blue-600 transition-colors shadow-sm">
                        <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
                    </button>
                </div>
            </div>

            {/* 2. FILTER BAR */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm mb-6 flex flex-col md:flex-row gap-4 items-center">
                <div className="flex-1 relative w-full">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input 
                        type="text" 
                        placeholder="Search configurations by code or name..." 
                        value={searchValue} 
                        onChange={(e) => setSearchValue(e.target.value)} 
                        className="w-full border border-slate-200 pl-10 pr-4 py-2 rounded-lg text-sm outline-none focus:ring-1 focus:ring-blue-500 transition-all shadow-inner" 
                    />
                </div>
                <div className="flex bg-blue-50 text-blue-600 border border-blue-100 px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest gap-2">
                    <Filter size={14}/> {filteredData.length} Registry Types
                </div>
            </div>

            {/* 3. DATA TABLE */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-blue-600 text-white font-mono">
                                <th className="p-4 text-sm font-semibold uppercase tracking-wider">Type Code</th>
                                <th className="p-4 text-sm font-semibold uppercase tracking-wider">Logic Description</th>
                                <th className="p-4 text-sm font-semibold uppercase tracking-wider">Sales Category</th>
                                <th className="p-4 text-sm font-semibold uppercase tracking-wider text-center">Auto-Post</th>
                                <th className="p-4 w-10"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-mono">
                            {loading ? (
                                <tr>
                                    <td colSpan={5} className="py-24 text-center">
                                        <RefreshCw size={40} className="animate-spin text-blue-500 mx-auto mb-4" />
                                        <p className="text-slate-500 font-bold uppercase text-[10px]">Accessing backend protocol...</p>
                                    </td>
                                </tr>
                            ) : currentItems.length > 0 ? (
                                currentItems.map((item) => (
                                    <tr key={item.id} onClick={() => handleEdit(item)} className="transition-all cursor-pointer hover:bg-blue-50/50">
                                        <td className="p-4 text-sm font-black text-blue-600 bg-slate-50/50">#{item.code}</td>
                                        <td className="p-4 text-sm font-bold text-slate-700 uppercase font-sans">{item.type_name}</td>
                                        <td className="p-4 text-[10px] font-black uppercase font-sans">
                                            <span className="bg-slate-100 text-slate-500 px-3 py-1 rounded-full border border-slate-200">{item.sales_type}</span>
                                        </td>
                                        <td className="p-4 text-center">
                                            {item.account_posting ? 
                                                <span className="text-emerald-500 font-black text-[10px] uppercase flex items-center justify-center gap-1"><CheckCircle2 size={12}/> Active</span> : 
                                                <span className="text-slate-300 font-black text-[10px] uppercase">Off</span>
                                            }
                                        </td>
                                        <td className="p-4"><Edit size={16} className="text-slate-300" /></td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={5} className="py-28 text-center">
                                        <div className="flex flex-col items-center opacity-20">
                                            <Database size={60} />
                                            <p className="mt-4 font-black uppercase tracking-[0.2em]">Logic Registry Empty</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* 4. MODAL COCKPIT */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-7xl overflow-hidden flex flex-col max-h-[95vh] animate-in zoom-in duration-200">
                        
                        {/* Modal Header */}
                        <div className="bg-slate-900 p-4 flex justify-between items-center text-white shadow-lg shrink-0">
                            <div className="flex items-center gap-4">
                                <div className="p-2 bg-blue-600 rounded-lg shadow-lg"><Calculator size={24}/></div>
                                <div>
                                    <h2 className="font-bold uppercase tracking-tight">Invoice Logic Designer</h2>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase">Backend Protocol Sync v3.0</p>
                                </div>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="hover:bg-white/10 p-1 rounded-full"><X size={24}/></button>
                        </div>

                        {/* Navigation Tabs */}
                        <div className="flex bg-slate-50 border-b px-6 shrink-0">
                            <button onClick={() => setActiveTab('logic')} className={`py-4 px-6 text-[10px] font-black uppercase tracking-widest relative transition-colors ${activeTab === 'logic' ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}>
                                01. Formula Framework {activeTab === 'logic' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600"/>}
                            </button>
                            <button onClick={() => setActiveTab('accounts')} className={`py-4 px-6 text-[10px] font-black uppercase tracking-widest relative transition-colors ${activeTab === 'accounts' ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}>
                                02. Ledger Posting Maps {activeTab === 'accounts' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600"/>}
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="flex-1 overflow-y-auto p-6 flex flex-col lg:flex-row gap-6 bg-slate-50/50">
                            
                            {/* LEFT SIDE: Entry Grid */}
                            <div className="flex-1 space-y-6">
                                
                                {/* METADATA CARD */}
                                <div className="bg-white p-6 rounded-2xl border shadow-sm grid grid-cols-12 gap-6 items-end">
                                    <div className="col-span-2">
                                        <InputField label="Type Code" value={formData.code} onChange={e => setFormData({...formData, code: e.target.value})} />
                                    </div>
                                    <div className="col-span-6">
                                        <InputField label="Description" value={formData.type_name} onChange={e => setFormData({...formData, type_name: e.target.value.toUpperCase()})} />
                                    </div>
                                    <div className="col-span-4 space-y-1">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Sales Type</label>
                                        <select className="w-full bg-white border border-slate-200 p-2 rounded-lg text-xs font-bold outline-none shadow-inner" value={formData.sales_type} onChange={e => setFormData({...formData, sales_type: e.target.value})}>
                                            <option value="GST SALES">GST SALES</option>
                                            <option value="DEPOT SALES">DEPOT SALES</option>
                                            <option value="DIRECT SALES">DIRECT SALES</option>
                                        </select>
                                    </div>
                                </div>

                                {/* CALCULATION GRID */}
                                <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
                                    <table className="w-full text-left">
                                        <thead className="bg-slate-900 text-white text-[9px] uppercase font-black tracking-widest">
                                            <tr>
                                                <th className="p-4 w-40">Tax Component</th>
                                                <th className="p-4 w-20 text-center">Rate</th>
                                                <th className="p-4">Mathematical Formula Logic</th>
                                                {activeTab === 'accounts' && <th className="p-4 w-60">Ledger Mapping</th>}
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 font-mono">
                                            <tr className="bg-blue-50/50">
                                                <td className="p-4 font-black text-blue-800 uppercase text-[11px] tracking-tighter">Assessable [A]</td>
                                                <td></td>
                                                <td className="p-2"><SmartFormulaInput value={formData.assess_formula} onChange={val => setFormData({...formData, assess_formula: val})} /></td>
                                                {activeTab === 'accounts' && <td className="p-2"><input className="w-full border border-slate-200 rounded-lg p-2 text-[10px] font-bold uppercase shadow-inner" value={formData.assess_account} onChange={e => setFormData({...formData, assess_account: e.target.value})} placeholder="ASSESS A/C" /></td>}
                                            </tr>
                                            {formData.rows.map((row, idx) => (
                                                <tr key={row.id} className="hover:bg-slate-50 transition-colors">
                                                    <td className="p-4">
                                                        <label className="flex items-center gap-2 cursor-pointer">
                                                            <button type="button" onClick={() => {
                                                                const newRows = [...formData.rows];
                                                                newRows[idx].checked = !newRows[idx].checked;
                                                                setFormData({...formData, rows: newRows});
                                                            }}>
                                                                {row.checked ? <CheckSquare size={16} className="text-blue-600"/> : <Square size={16} className="text-slate-300"/>}
                                                            </button>
                                                            <span className={`text-[11px] font-bold uppercase ${row.checked ? 'text-slate-800' : 'text-slate-300'}`}>{row.label}</span>
                                                        </label>
                                                    </td>
                                                    <td className="p-2"><input className="w-full border border-slate-200 rounded-lg p-2 text-center text-xs font-bold shadow-inner" value={row.val} onChange={e => {
                                                        const newRows = [...formData.rows];
                                                        newRows[idx].val = e.target.value;
                                                        setFormData({...formData, rows: newRows});
                                                    }} /></td>
                                                    <td className="p-2"><SmartFormulaInput value={row.formula} onChange={val => {
                                                        const newRows = [...formData.rows];
                                                        newRows[idx].formula = val;
                                                        setFormData({...formData, rows: newRows});
                                                    }} /></td>
                                                    {activeTab === 'accounts' && <td className="p-2"><input className="w-full border border-slate-200 rounded-lg p-2 text-[10px] font-bold uppercase shadow-inner" value={row.account} onChange={e => {
                                                        const newRows = [...formData.rows];
                                                        newRows[idx].account = e.target.value;
                                                        setFormData({...formData, rows: newRows});
                                                    }} placeholder="LEDGER A/C" /></td>}
                                                </tr>
                                            ))}
                                            <tr className="bg-emerald-50/50 border-t-2 border-emerald-100">
                                                <td className="p-4">
                                                    <label className="flex items-center gap-2 font-black text-emerald-800 uppercase text-[11px] tracking-tighter">
                                                        <button type="button" onClick={() => setFormData({...formData, igst_checked: !formData.igst_checked})}>
                                                            {formData.igst_checked ? <CheckSquare size={16} className="text-emerald-600"/> : <Square size={16} className="text-emerald-200"/>}
                                                        </button>
                                                        Output IGST
                                                    </label>
                                                </td>
                                                <td className="p-2"><input className="w-full border border-emerald-200 rounded-lg p-2 text-center text-xs font-black text-emerald-700 shadow-inner" value={formData.igst_val} onChange={e => setFormData({...formData, igst_val: e.target.value})} /></td>
                                                <td className="p-2"><SmartFormulaInput value={formData.igst_formula} onChange={val => setFormData({...formData, igst_formula: val})} /></td>
                                                {activeTab === 'accounts' && <td className="p-2"><input className="w-full border border-emerald-200 rounded-lg p-2 text-[10px] font-bold uppercase text-emerald-800 shadow-inner" value={formData.igst_account} onChange={e => setFormData({...formData, igst_account: e.target.value})} placeholder="IGST A/C" /></td>}
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* RIGHT SIDE: Simulator Cockpit */}
                            <div className="w-full lg:w-96 bg-slate-900 rounded-2xl p-6 text-white flex flex-col justify-between shadow-2xl shrink-0">
                                <div className="space-y-6">
                                    <div className="text-center mb-6">
                                        <Activity size={32} className="text-blue-400 mx-auto mb-1" />
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Logic Cockpit & Simulations</p>
                                    </div>

                                    <div className="space-y-4">
                                        <SmartFormulaInput label="Sub Total Formula [I]" value={formData.sub_total_formula} onChange={val => setFormData({...formData, sub_total_formula: val})} />
                                        <SmartFormulaInput label="Total Invoice Value" value={formData.total_value_formula} onChange={val => setFormData({...formData, total_value_formula: val})} />
                                        
                                        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 mt-6">
                                            <div className="flex items-center justify-between mb-4">
                                                <label className="flex items-center gap-2 cursor-pointer">
                                                    <button type="button" onClick={() => setFormData({...formData, account_posting: !formData.account_posting})}>
                                                        {formData.account_posting ? <CheckSquare size={18} className="text-blue-400"/> : <Square size={18} className="text-white/20"/>}
                                                    </button>
                                                    <span className="text-[11px] font-black uppercase text-slate-400 tracking-tighter">Auto-Post to Ledger</span>
                                                </label>
                                                <div className="flex bg-white/10 p-1 rounded-xl">
                                                    {['Forward', 'Reverse'].map(dir => (
                                                        <button key={dir} type="button" onClick={() => setFormData({...formData, round_off_direction: dir})} className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${formData.round_off_direction === dir ? 'bg-blue-600 text-white' : 'text-slate-500 hover:text-white'}`}>{dir}</button>
                                                    ))}
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-2 gap-3">
                                                <div className="space-y-1">
                                                    <label className="text-[8px] font-black text-slate-500 uppercase">R/O Ledger</label>
                                                    <input className="w-full bg-slate-800 border-none p-2 rounded-lg text-[10px] font-bold text-blue-200 outline-none uppercase" value={formData.round_off_account} onChange={e => setFormData({...formData, round_off_account: e.target.value})} />
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-[8px] font-black text-slate-500 uppercase">Freight Ledger</label>
                                                    <input className="w-full bg-slate-800 border-none p-2 rounded-lg text-[10px] font-bold text-blue-200 outline-none uppercase" value={formData.lorry_freight_account} onChange={e => setFormData({...formData, lorry_freight_account: e.target.value})} />
                                                </div>
                                            </div>
                                            <div className="mt-3">
                                                <label className="text-[8px] font-black text-slate-500 uppercase">Round Off Digits</label>
                                                <input type="number" className="w-full bg-slate-800 border-none p-2 rounded-lg text-[10px] font-bold text-blue-200 outline-none" value={formData.round_off_digits} onChange={e => setFormData({...formData, round_off_digits: e.target.value})} />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* SIMULATOR RESULTS */}
                                <div className="mt-8 p-6 bg-blue-600/10 rounded-3xl border border-blue-500/20 relative overflow-hidden group">
                                    <div className="relative z-10 space-y-4">
                                        <div className="flex justify-between items-end border-b border-blue-500/10 pb-2">
                                            <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Simulated IGST</span>
                                            <span className="text-xl font-black font-mono text-white">₹ {simulate(formData.igst_formula)}</span>
                                        </div>
                                        <div className="flex justify-between items-end">
                                            <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Simulated Net</span>
                                            <span className="text-2xl font-black font-mono text-white">₹ {simulate(formData.total_value_formula)}</span>
                                        </div>
                                    </div>
                                    <Zap className="absolute -right-2 -bottom-2 text-blue-500/5 group-hover:scale-110 transition-transform" size={100} />
                                </div>
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="p-6 bg-slate-50 border-t flex justify-between items-center shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] shrink-0">
                            <button type="button" onClick={() => setShowGuide(true)} className="flex items-center gap-2 text-slate-400 hover:text-blue-600 font-black uppercase text-[10px] tracking-widest transition-all">
                                <BookOpen size={20}/> Formula Protocol Guide
                            </button>
                            
                            <div className="flex gap-4">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-10 py-3 text-slate-400 font-bold uppercase text-[10px] tracking-widest transition-colors">Discard</button>
                                <button onClick={handleSave} disabled={submitLoading} className="bg-blue-600 hover:bg-blue-700 text-white px-12 py-3 rounded-xl font-black shadow-xl flex items-center gap-2 active:scale-95 transition-all text-[11px] tracking-widest uppercase">
                                    <Save size={18}/> {submitLoading ? 'COMMITTING...' : 'SAVE CONFIGURATION'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <FormulaReferenceModal isOpen={showGuide} onClose={() => setShowGuide(false)} />
            
            <style jsx>{`
                input[type='number']::-webkit-inner-spin-button, 
                input[type='number']::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
                ::-webkit-scrollbar { width: 5px; height: 5px; }
                ::-webkit-scrollbar-track { background: transparent; }
                ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
                ::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
            `}</style>
        </div>
    );
};

// HELPER COMPONENTS
const InputField = ({ label, className = "", ...props }) => (
    <div className={`space-y-1 ${className}`}>
        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">{label}</label>
        <input {...props} className="w-full bg-white border border-slate-200 p-2 rounded-lg text-xs font-bold outline-none focus:ring-1 focus:ring-blue-500 shadow-inner" />
    </div>
);

export default InvoiceTypeMaster;