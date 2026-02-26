import React, { useState, useEffect, useRef } from 'react';
import { mastersAPI } from '../service/api';
import { 
    Plus, Edit, X, Save, Calculator, Zap, CheckCircle2, AlertCircle, Info, BookOpen, RefreshCw, Database, Settings
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
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-200">
                <div className="bg-slate-800 p-4 flex justify-between items-center text-white">
                    <div className="flex items-center gap-2">
                        <BookOpen size={18} className="text-blue-400" />
                        <h3 className="font-bold text-sm uppercase tracking-wider">Formula Keywords Reference</h3>
                    </div>
                    <button onClick={onClose} className="hover:bg-slate-700 p-1 rounded-lg"><X size={18}/></button>
                </div>
                <div className="p-6 max-h-[70vh] overflow-y-auto">
                    {Object.entries(FORMULA_VARIABLES).map(([group, vars]) => (
                        <div key={group} className="mb-6 last:mb-0">
                            <h4 className="text-[10px] font-black text-blue-600 uppercase mb-3 border-b pb-1">{group}</h4>
                            <div className="space-y-3">
                                {vars.map(v => (
                                    <div key={v.key} className="flex items-start gap-4 p-2 rounded-lg hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100">
                                        <code className="bg-blue-50 text-blue-700 px-2 py-1 rounded font-bold text-xs min-w-[100px] text-center">{v.key}</code>
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
                <div className="p-4 bg-slate-50 border-t flex justify-end">
                    <button onClick={onClose} className="bg-slate-800 text-white px-6 py-2 rounded-lg text-xs font-bold hover:bg-slate-700 transition-all">Close Guide</button>
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
        const start = inputRef.current.selectionStart;
        const end = inputRef.current.selectionEnd;
        const text = value || '';
        const newValue = text.substring(0, start) + v + text.substring(end);
        onChange(newValue);
        setShowPicker(false);
    };

    return (
        <div className="relative w-full group">
            <div className="flex items-center justify-between mb-0.5 px-1">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">{label}</span>
                <button type="button" onClick={() => setShowPicker(!showPicker)} className="text-[9px] text-blue-500 hover:text-blue-700 flex items-center gap-0.5 font-bold opacity-0 group-hover:opacity-100 transition-opacity">
                    <Zap size={10}/> Pick Variable
                </button>
            </div>
            <input 
                ref={inputRef}
                className="w-full bg-slate-50 border border-slate-200 rounded p-1 text-[11px] font-mono text-blue-700 outline-none focus:ring-1 focus:ring-blue-400 focus:bg-white transition-all"
                value={value || ''}
                onChange={(e) => onChange(e.target.value)}
                placeholder="e.g. [H]*0.05"
            />
            {showPicker && (
                <div className="absolute z-[60] top-full left-0 w-64 bg-white shadow-2xl border border-slate-200 rounded-lg p-3 mt-1 animate-in zoom-in-95 duration-150">
                    <div className="flex justify-between items-center mb-2 border-b pb-1">
                        <span className="text-[10px] font-black text-slate-800 uppercase">Keywords</span>
                        <X size={12} className="cursor-pointer text-slate-400" onClick={() => setShowPicker(false)}/>
                    </div>
                    <div className="max-h-48 overflow-y-auto space-y-2">
                        {Object.entries(FORMULA_VARIABLES).map(([group, fields]) => (
                            <div key={group}>
                                <p className="text-[8px] font-bold text-slate-400 uppercase mb-1">{group}</p>
                                <div className="grid grid-cols-1 gap-1">
                                    {fields.map(f => (
                                        <button key={f.key} type="button" onClick={() => insertVar(f.key)} className="flex justify-between items-center p-1.5 hover:bg-blue-50 rounded text-left group/item">
                                            <span className="text-[10px] font-medium text-slate-600">{f.label}</span>
                                            <code className="text-[9px] font-bold text-blue-500 bg-blue-50 px-1 rounded group-hover/item:bg-blue-100">{f.key}</code>
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

    // --- MAPPING: DB to UI ---
    const mapDbToState = (dbItem) => {
        console.log("🛠 Mapping DB Item to UI State:", dbItem);
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

        return {
            ...dbItem,
            igst_val: dbItem.igst_percentage || '',
            rows: mappedRows
        };
    };

    // --- MAPPING: UI to DB (Strict cleanup for Sequelize) ---
    const mapStateToDb = (stateData) => {
        console.log("🧹 Cleaning and Mapping UI state for DB transmission...");
        const flatData = { ...stateData };

        // Process dynamic rows array into flat columns
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

        // Remove UI-only helper fields
        delete flatData.rows;
        delete flatData.igst_val;
        
        // Remove read-only DB fields (Sequelize usually errors if these are in body)
        delete flatData.createdAt;
        delete flatData.updatedAt;
        
        // Remove ID from body (it belongs in the URL path for PUT)
        const idToReturn = flatData.id;
        delete flatData.id;

        console.log("🚀 Final Payload to Server:", flatData);
        return { payload: flatData, id: idToReturn };
    };

    const fetchRecords = async () => {
        setLoading(true);
        console.log("📡 Fetching Invoice Types...");
        try {
            const res = await mastersAPI.invoiceTypes.getAll();
            const rawData = res.data.data || res.data || [];
            console.log("✅ Data Received:", rawData);
            setList(rawData);
        } catch (err) { 
            console.error("❌ Fetch Failed:", err);
        } finally { setLoading(false); }
    };

    useEffect(() => { fetchRecords(); }, []);

    const handleEdit = (item) => {
        const mapped = mapDbToState(item);
        setFormData(mapped);
        setIsModalOpen(true);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setLoading(true);
        console.log("💾 Initiating Save Operation...");
        
        try {
            const { payload, id } = mapStateToDb(formData);
            
            if (id) {
                console.log(`📡 Sending PUT Request for ID: ${id}`);
                const response = await mastersAPI.invoiceTypes.update(id, payload);
                console.log("✅ Update Response:", response.data);
            } else {
                console.log("📡 Sending POST Request for New Record");
                const response = await mastersAPI.invoiceTypes.create(payload);
                console.log("✅ Create Response:", response.data);
            }

            await fetchRecords();
            setIsModalOpen(false);
            alert("Configuration Saved Successfully!");
        } catch (err) {
            console.error("❌ SAVE FAILED!");
            const serverError = err.response?.data?.error || err.message;
            const sqlError = err.response?.data?.sqlError || "";
            console.error("Server Message:", serverError);
            if(sqlError) console.error("Database SQL Error:", sqlError);
            
            alert(`Error: ${serverError} ${sqlError ? '\n\nSQL Error: ' + sqlError : ''}`);
        } finally {
            setLoading(false);
        }
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
            // eslint-disable-next-line no-eval
            const res = eval(f);
            return parseFloat(res).toLocaleString(undefined, { minimumFractionDigits: 2 });
        } catch { return 'Math Error'; }
    };

    return (
        <div className="min-h-screen bg-slate-100 p-8 font-sans">
            <div className="max-w-7xl mx-auto">
                {/* Dashboard Header */}
                <div className="flex justify-between items-center mb-10">
                    <div>
                        <h1 className="text-3xl font-black text-slate-800 tracking-tight flex items-center gap-3">
                            <Settings size={32} className="text-blue-600"/> INVOICE ENGINE MASTER
                        </h1>
                        <p className="text-slate-500 font-medium tracking-tight">Configure calculation logic and ledger protocols</p>
                    </div>
                    <div className="flex gap-3">
                        <button onClick={fetchRecords} className="p-3 bg-white border rounded-2xl hover:bg-slate-50 transition-colors shadow-sm">
                            <RefreshCw size={20} className={loading ? 'animate-spin' : ''}/>
                        </button>
                        <button onClick={() => {setFormData(emptyState); setIsModalOpen(true);}} className="bg-slate-900 text-white px-8 py-3 rounded-2xl font-bold flex items-center gap-2 hover:bg-blue-600 transition-all shadow-xl shadow-slate-200">
                            <Plus size={20} /> New Type
                        </button>
                    </div>
                </div>

                {/* Table */}
                <div className="bg-white rounded-[2rem] border border-slate-200 shadow-xl overflow-hidden">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 border-b">
                            <tr className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">
                                <th className="px-8 py-5">Code</th>
                                <th className="px-4 py-5">Description</th>
                                <th className="px-4 py-5">Sales Category</th>
                                <th className="px-4 py-5">Posting</th>
                                <th className="px-8 py-5 text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {list.length > 0 ? list.map((item) => (
                                <tr key={item.id} className="hover:bg-blue-50/50 cursor-pointer group" onClick={() => handleEdit(item)}>
                                    <td className="px-8 py-5 font-mono font-bold text-blue-600">#{item.code}</td>
                                    <td className="px-4 py-5 font-black text-slate-700 uppercase">{item.type_name}</td>
                                    <td className="px-4 py-5">
                                        <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-full text-[10px] font-black uppercase">{item.sales_type}</span>
                                    </td>
                                    <td className="px-4 py-5">
                                        {item.account_posting ? 
                                            <span className="text-emerald-500 font-bold text-[10px] uppercase">Active</span> : 
                                            <span className="text-slate-300 font-bold text-[10px] uppercase">Off</span>
                                        }
                                    </td>
                                    <td className="px-8 py-5 text-center">
                                        <div className="flex justify-center">
                                            <div className="p-2 bg-white border rounded-xl group-hover:border-blue-200 group-hover:text-blue-600 transition-all shadow-sm">
                                                <Edit size={16}/>
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan="5" className="p-24 text-center">
                                        <div className="flex flex-col items-center opacity-20">
                                            <Database size={48} />
                                            <p className="mt-4 font-black uppercase tracking-[0.3em]">No Registry Data</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 overflow-y-auto">
                    <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-6xl my-8 flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200">
                        
                        {/* Modal Header */}
                        <div className="bg-slate-900 p-6 flex justify-between items-center text-white shrink-0">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-blue-600 rounded-2xl shadow-lg"><Calculator size={24}/></div>
                                <div>
                                    <h2 className="font-black uppercase text-sm tracking-widest">Logic Designer</h2>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase">Backend Protocol Sync v2.1</p>
                                </div>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="hover:bg-white/10 p-2 rounded-full transition-colors"><X size={24}/></button>
                        </div>
                        
                        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-10 bg-slate-50/50">
                            {/* Identifiers */}
                            <div className="grid grid-cols-12 gap-6 mb-8 bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm">
                                <div className="col-span-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase block mb-2 ml-1">Type Code</label>
                                    <input className="w-full border-slate-200 border-2 p-3 rounded-2xl text-xs font-bold bg-slate-50 outline-none" value={formData.code} onChange={e => setFormData({...formData, code: e.target.value})} placeholder="CODE" />
                                </div>
                                <div className="col-span-6">
                                    <label className="text-[10px] font-black text-slate-400 uppercase block mb-2 ml-1">Logic Description</label>
                                    <input className="w-full border-slate-200 border-2 p-3 rounded-2xl font-black text-xs text-blue-800 uppercase outline-none" value={formData.type_name} onChange={e => setFormData({...formData, type_name: e.target.value})} placeholder="e.g. GST SALES" />
                                </div>
                                <div className="col-span-4">
                                    <label className="text-[10px] font-black text-slate-400 uppercase block mb-2 ml-1">Sales Type</label>
                                    <select className="w-full border-slate-200 border-2 p-3 rounded-2xl text-xs font-bold bg-slate-50 outline-none" value={formData.sales_type} onChange={e => setFormData({...formData, sales_type: e.target.value})}>
                                        <option value="GST SALES">GST SALES</option>
                                        <option value="DEPOT SALES">DEPOT SALES</option>
                                        <option value="DIRECT SALES">DIRECT SALES</option>
                                    </select>
                                </div>
                            </div>

                            {/* Math Table */}
                            <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden mb-8">
                                <table className="w-full text-left text-[11px]">
                                    <thead className="bg-slate-900 text-white text-[9px] uppercase tracking-[0.2em] font-black">
                                        <tr>
                                            <th className="p-5 w-48">Component</th>
                                            <th className="p-5 w-24 text-center">Rate</th>
                                            <th className="p-5">Formula</th>
                                            <th className="p-5 w-72">Ledger Account</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        <tr className="bg-blue-50/40">
                                            <td className="p-5 font-black text-blue-800 uppercase tracking-tighter">Assess Value [A]</td>
                                            <td className="p-1"></td>
                                            <td className="p-3"><SmartFormulaInput value={formData.assess_formula} onChange={val => setFormData({...formData, assess_formula: val})} /></td>
                                            <td className="p-3"><input className="w-full border border-slate-200 rounded-xl p-2 text-[11px] uppercase font-bold text-slate-600 bg-white" placeholder="POSTING A/C" value={formData.assess_account} onChange={e => setFormData({...formData, assess_account: e.target.value})} /></td>
                                        </tr>
                                        {formData.rows.map((row, idx) => (
                                            <tr key={row.id} className="hover:bg-slate-50 transition-colors">
                                                <td className="p-5">
                                                    <label className="flex items-center gap-3 cursor-pointer">
                                                        <input type="checkbox" className="w-4 h-4 rounded" checked={row.checked} onChange={e => {
                                                            const newRows = [...formData.rows];
                                                            newRows[idx].checked = e.target.checked;
                                                            setFormData({...formData, rows: newRows});
                                                        }} />
                                                        <span className={`font-bold uppercase ${row.checked ? 'text-slate-800' : 'text-slate-300'}`}>{row.label}</span>
                                                    </label>
                                                </td>
                                                <td className="p-3"><input className="w-full border border-slate-200 rounded-xl p-2 text-center font-bold text-xs" value={row.val} onChange={e => {
                                                    const newRows = [...formData.rows];
                                                    newRows[idx].val = e.target.value;
                                                    setFormData({...formData, rows: newRows});
                                                }} /></td>
                                                <td className="p-3"><SmartFormulaInput value={row.formula} onChange={val => {
                                                    const newRows = [...formData.rows];
                                                    newRows[idx].formula = val;
                                                    setFormData({...formData, rows: newRows});
                                                }} /></td>
                                                <td className="p-3"><input className="w-full border border-slate-200 rounded-xl p-2 uppercase text-xs" placeholder="A/C NAME" value={row.account} onChange={e => {
                                                    const newRows = [...formData.rows];
                                                    newRows[idx].account = e.target.value;
                                                    setFormData({...formData, rows: newRows});
                                                }} /></td>
                                            </tr>
                                        ))}
                                        <tr className="bg-emerald-50/40 border-t-2 border-emerald-100">
                                            <td className="p-5"><label className="flex items-center gap-3 font-black text-emerald-800 uppercase"><input type="checkbox" className="w-4 h-4 rounded" checked={formData.igst_checked} onChange={e => setFormData({...formData, igst_checked: e.target.checked})} />Output IGST</label></td>
                                            <td className="p-3"><input className="w-full border border-emerald-200 rounded-xl p-2 text-center font-black text-emerald-700 text-xs" value={formData.igst_val} onChange={e => setFormData({...formData, igst_val: e.target.value})} /></td>
                                            <td className="p-3"><SmartFormulaInput value={formData.igst_formula} onChange={val => setFormData({...formData, igst_formula: val})} /></td>
                                            <td className="p-3"><input className="w-full border border-emerald-200 rounded-xl p-2 uppercase text-emerald-800 font-bold text-xs" placeholder="IGST LEDGER" value={formData.igst_account} onChange={e => setFormData({...formData, igst_account: e.target.value})} /></td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>

                            {/* Footers & Simulation */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                <div className="bg-slate-900 rounded-[2.5rem] p-10 text-white shadow-2xl relative overflow-hidden group">
                                    <Calculator size={140} className="absolute -bottom-10 -right-10 opacity-5 group-hover:scale-110 transition-transform duration-700"/>
                                    <h3 className="text-[10px] font-black uppercase text-blue-500 mb-8 tracking-[0.3em] flex items-center gap-2">Final Logic</h3>
                                    <div className="space-y-6">
                                        <SmartFormulaInput label="Sub Total Formula [I]" value={formData.sub_total_formula} onChange={val => setFormData({...formData, sub_total_formula: val})} />
                                        <SmartFormulaInput label="Total Invoice Value" value={formData.total_value_formula} onChange={val => setFormData({...formData, total_value_formula: val})} />
                                        
                                        <div className="flex items-center justify-between p-6 bg-white/5 rounded-3xl border border-white/10 mt-6">
                                            <label className="flex items-center gap-3 cursor-pointer">
                                                <input type="checkbox" className="w-5 h-5 rounded-full" checked={formData.account_posting} onChange={e => setFormData({...formData, account_posting: e.target.checked})} />
                                                <span className="text-[11px] font-black uppercase text-slate-400">Post to Ledger</span>
                                            </label>
                                            <div className="flex bg-white/10 p-1 rounded-2xl">
                                                {['Forward', 'Reverse'].map(dir => (
                                                    <button key={dir} type="button" onClick={() => setFormData({...formData, round_off_direction: dir})} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase ${formData.round_off_direction === dir ? 'bg-blue-600 text-white' : 'text-slate-400'}`}>{dir}</button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-white rounded-[2.5rem] p-10 border-2 border-slate-100 shadow-sm flex flex-col">
                                    <h3 className="text-[10px] font-black uppercase text-slate-400 mb-8 flex items-center gap-2 tracking-[0.3em]"><Zap size={18} className="text-amber-500"/> Logic Simulator</h3>
                                    <div className="space-y-4 flex-1">
                                        <div className="flex justify-between p-5 bg-slate-50 rounded-3xl border border-slate-100 items-center">
                                            <span className="text-[10px] font-bold text-slate-400 uppercase">Input: 5280 Kg @ 250 Rate</span>
                                            <span className="text-sm font-mono font-black text-slate-900">₹1,320,000.00</span>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="p-6 bg-emerald-50 rounded-[2rem] border border-emerald-100 flex flex-col justify-center">
                                                <p className="text-[9px] font-black text-emerald-600 uppercase mb-2">Simulated IGST</p>
                                                <p className="text-2xl font-mono font-black text-emerald-800">₹ {simulate(formData.igst_formula)}</p>
                                            </div>
                                            <div className="p-6 bg-blue-50 rounded-[2rem] border border-blue-100 flex flex-col justify-center">
                                                <p className="text-[9px] font-black text-blue-600 uppercase mb-2">Simulated Net</p>
                                                <p className="text-2xl font-mono font-black text-blue-800">₹ {simulate(formData.total_value_formula)}</p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="mt-8 p-4 bg-amber-50 rounded-2xl flex items-start gap-4 border border-amber-100">
                                        <Info size={20} className="text-amber-600 shrink-0 mt-0.5"/>
                                        <p className="text-[10px] text-amber-800 font-medium leading-relaxed italic uppercase tracking-tighter">Use simulator to verify formula integrity before saving to master records.</p>
                                    </div>
                                </div>
                            </div>

                            {/* Extra Overrides */}
                            <div className="mt-8 grid grid-cols-2 gap-6">
                                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                                    <label className="text-[10px] font-black text-slate-400 uppercase block mb-2 ml-1">Round Off Ledger</label>
                                    <input className="w-full border-slate-200 border-2 p-3 rounded-2xl text-xs font-bold uppercase bg-slate-50 outline-none" placeholder="A/C NAME" value={formData.round_off_account} onChange={e => setFormData({...formData, round_off_account: e.target.value})} />
                                </div>
                                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                                    <label className="text-[10px] font-black text-slate-400 uppercase block mb-2 ml-1">Freight Ledger</label>
                                    <input className="w-full border-slate-200 border-2 p-3 rounded-2xl text-xs font-bold uppercase bg-slate-50 outline-none" placeholder="A/C NAME" value={formData.lorry_freight_account} onChange={e => setFormData({...formData, lorry_freight_account: e.target.value})} />
                                </div>
                            </div>

                            {/* Final Footer */}
                            <div className="mt-12 pt-8 border-t flex justify-between items-center">
                                <button type="button" onClick={() => setShowGuide(true)} className="flex items-center gap-2 text-slate-400 hover:text-blue-600 font-black uppercase text-[10px] tracking-widest transition-colors">
                                    <BookOpen size={20}/> Formula Guide
                                </button>
                                
                                <div className="flex gap-4">
                                    <button type="button" onClick={() => setIsModalOpen(false)} className="px-10 py-3 text-slate-400 font-bold uppercase text-[11px] tracking-widest">Discard</button>
                                    <button type="submit" disabled={loading} className="bg-slate-900 text-white px-12 py-4 rounded-2xl font-black shadow-2xl shadow-slate-200 flex items-center gap-3 uppercase text-[12px] tracking-[0.2em] transition-all hover:bg-blue-600">
                                        <Save size={20}/> {loading ? 'Commiting...' : 'Save Configuration'}
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <FormulaReferenceModal isOpen={showGuide} onClose={() => setShowGuide(false)} />
        </div>
    );
};

export default InvoiceTypeMaster;