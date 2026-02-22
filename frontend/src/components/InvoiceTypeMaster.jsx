import React, { useState, useEffect, useRef } from 'react';
import { mastersAPI } from '../service/api';
import { 
    Plus, Search, Edit, Trash2, X, Settings2, 
    Save, Calculator, Zap, Info, CheckCircle2, AlertCircle
} from 'lucide-react';

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
        <div className="relative w-full">
            <div className="flex items-center justify-between mb-0.5 px-1">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">{label}</span>
                <button type="button" onClick={() => setShowPicker(!showPicker)} className="text-[9px] text-blue-500 hover:text-blue-700 flex items-center gap-0.5 font-bold">
                    <Zap size={10}/> Pick Variable
                </button>
            </div>
            <input 
                ref={inputRef}
                className="w-full bg-slate-50 border border-slate-200 rounded p-1 text-[11px] font-mono text-blue-700 outline-none focus:ring-1 focus:ring-blue-400"
                value={value || ''}
                onChange={(e) => onChange(e.target.value)}
                placeholder="e.g. [H]*0.05"
            />
            {showPicker && (
                <div className="absolute z-[60] top-full left-0 w-64 bg-white shadow-2xl border border-slate-200 rounded-lg p-3 mt-1 animate-in zoom-in-95 duration-150">
                    <div className="flex justify-between items-center mb-2 border-b pb-1">
                        <span className="text-[10px] font-black text-slate-800">FIELDS REFERENCE</span>
                        <X size={12} className="cursor-pointer" onClick={() => setShowPicker(false)}/>
                    </div>
                    <div className="max-h-48 overflow-y-auto space-y-2">
                        {Object.entries(FORMULA_VARIABLES).map(([group, fields]) => (
                            <div key={group}>
                                <p className="text-[8px] font-bold text-slate-400 uppercase mb-1">{group}</p>
                                <div className="grid grid-cols-1 gap-1">
                                    {fields.map(f => (
                                        <button key={f.key} type="button" onClick={() => insertVar(f.key)} className="flex justify-between items-center p-1 hover:bg-blue-50 rounded text-left group">
                                            <span className="text-[10px] font-medium text-slate-600">{f.label}</span>
                                            <code className="text-[9px] font-bold text-blue-500 bg-blue-50 px-1 rounded group-hover:bg-blue-100">{f.key}</code>
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
        code: '', is_option_ii: false, type_name: '', sales_type: 'CST SALES', group_name: '', round_off_digits: 0,
        assess_formula: '[Rate / Kg] * [Total Kgs]', assess_account: '',
        rows: [
            { id: 'charity', label: 'Charity / Bale', checked: false, val: '3', formula: '[Total Kgs]*[CharityRs]', account: '' },
            { id: 'vat', label: 'Tax [ VAT ]', checked: false, val: '', formula: '', account: '' },
            { id: 'duty', label: 'Duty', checked: false, val: '', formula: '', account: '' },
            { id: 'cess', label: 'Cess', checked: false, val: '', formula: '', account: '' },
            { id: 'hr_sec_cess', label: 'Hr.Sec.Cess', checked: false, val: '', formula: '', account: '' },
            { id: 'tcs', label: 'T.C.S', checked: false, val: '', formula: '', account: '' },
            { id: 'cst', label: 'CST', checked: false, val: '', formula: '', account: '' },
            { id: 'cenvat', label: 'CENVAT', checked: false, val: '', formula: '', account: '' },
        ],
        igst_checked: false, igst_val: '5', igst_formula: 'Round(([H]/([igstper]+100))*[igstper],0)', igst_account: '',
        gst_checked: false, sgst_pct: 0, cgst_pct: 0, sgst_account: '', cgst_account: '',
        sub_total_formula: '[H]+[I]', total_value_formula: '[Rate / Kg] * [Total Kgs]', 
        round_off_direction: 'Reverse', round_off_account: 'ROUND OFF', lorry_freight_account: 'FREIGHT OUTWARD', account_posting: true
    };

    const [list, setList] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formData, setFormData] = useState(emptyState);
    const [loading, setLoading] = useState(false);

    useEffect(() => { fetchRecords(); }, []);

    const fetchRecords = async () => {
        try {
            const res = await mastersAPI.invoiceTypes.getAll();
            setList(res.data.data || []);
        } catch (err) { console.error(err); }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            formData.id ? await mastersAPI.invoiceTypes.update(formData.id, formData) : await mastersAPI.invoiceTypes.create(formData);
            fetchRecords(); setIsModalOpen(false);
        } catch (err) { alert("Save failed"); }
        finally { setLoading(false); }
    };

    // --- Simulation Logic ---
    const simulate = (formula) => {
        if (!formula) return 0;
        try {
            let f = formula
                .replace(/\[H\]/g, '1855060')
                .replace(/\[Rate \/ Kg\]/g, '250')
                .replace(/\[Total Kgs\]/g, '5280')
                .replace(/\[CharityRs\]/g, '3')
                .replace(/\[igstper\]/g, '5')
                .replace(/Round\(/g, 'Math.round(');
            return eval(f).toLocaleString();
        } catch { return 'Err'; }
    };

    return (
        <div className="min-h-screen bg-slate-50 p-6 font-sans">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2"><Settings2 className="text-blue-600" /> Invoice Type Master</h1>
                    <p className="text-sm text-slate-500">Replicating core logic from legacy configuration engine</p>
                </div>
                <button onClick={() => {setFormData(emptyState); setIsModalOpen(true);}} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-bold flex items-center gap-2 transition-all shadow-lg shadow-blue-100">
                    <Plus size={18} /> New Configuration
                </button>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 border-b">
                        <tr>
                            <th className="p-4 font-black text-slate-400 uppercase text-[10px]">Code</th>
                            <th className="p-4 font-black text-slate-400 uppercase text-[10px]">Invoice Type Description</th>
                            <th className="p-4 font-black text-slate-400 uppercase text-[10px]">Sales Type</th>
                            <th className="p-4 font-black text-slate-400 uppercase text-[10px] text-center">Setup</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {list.map((item) => (
                            <tr key={item.id} className="hover:bg-blue-50/50 cursor-pointer" onClick={() => {setFormData(item); setIsModalOpen(true);}}>
                                <td className="p-4 font-mono font-bold text-blue-600">{item.code}</td>
                                <td className="p-4 font-bold text-slate-700 uppercase">{item.type_name}</td>
                                <td className="p-4 text-slate-500">{item.sales_type}</td>
                                <td className="p-4 text-center"><Edit size={16} className="mx-auto text-slate-300 group-hover:text-blue-600"/></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl my-8 flex flex-col max-h-[90vh]">
                        {/* Modal Header */}
                        <div className="bg-blue-600 p-4 flex justify-between items-center text-white shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-blue-500 rounded-lg"><Calculator size={20}/></div>
                                <div>
                                    <h2 className="font-black uppercase text-sm tracking-tight">Configuration Engine</h2>
                                    <p className="text-[10px] opacity-80 font-bold">Manage formula logic & account posting</p>
                                </div>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="hover:bg-blue-500 p-2 rounded-full transition-colors"><X size={20}/></button>
                        </div>
                        
                        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 bg-slate-50/30">
                            {/* TOP BAR: Primary Identifiers */}
                            <div className="grid grid-cols-6 gap-4 mb-6 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                                <div className="col-span-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase block mb-1">Code</label>
                                    <input className="w-full border p-2 rounded text-xs font-bold" value={formData.code} onChange={e => setFormData({...formData, code: e.target.value})} />
                                </div>
                                <div className="col-span-1 flex items-center pt-4">
                                    <label className="flex items-center gap-2 cursor-pointer group">
                                        <input type="checkbox" className="w-4 h-4 rounded border-slate-300 text-blue-600" checked={formData.is_option_ii} onChange={e => setFormData({...formData, is_option_ii: e.target.checked})} />
                                        <span className="text-[11px] font-black text-slate-500 group-hover:text-blue-600 uppercase">Option II</span>
                                    </label>
                                </div>
                                <div className="col-span-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase block mb-1">Invoice Type Description</label>
                                    <input className="w-full border-2 border-blue-50 p-2 rounded font-black text-xs text-blue-800 uppercase focus:border-blue-200 outline-none" value={formData.type_name} onChange={e => setFormData({...formData, type_name: e.target.value})} />
                                </div>
                                <div className="col-span-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase block mb-1">Sales Type</label>
                                    <select className="w-full border p-2 rounded text-xs font-bold" value={formData.sales_type} onChange={e => setFormData({...formData, sales_type: e.target.value})}>
                                        <option value="CST SALES">CST SALES</option>
                                        <option value="LOCAL SALES">LOCAL SALES</option>
                                    </select>
                                </div>
                                <div className="col-span-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase block mb-1">Group Name</label>
                                    <input className="w-full border p-2 rounded text-xs" value={formData.group_name} onChange={e => setFormData({...formData, group_name: e.target.value})} />
                                </div>
                            </div>

                            {/* CALCULATION GRID - IMAGE 2 REPLICA */}
                            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden mb-6">
                                <table className="w-full text-left">
                                    <thead className="bg-slate-800 text-white text-[9px] uppercase tracking-wider font-bold">
                                        <tr>
                                            <th className="p-2 w-48">Tax Component</th>
                                            <th className="p-2 w-24 text-center">Val / Rate</th>
                                            <th className="p-2">Calculation Formula</th>
                                            <th className="p-2 w-64">Ledger Account Name</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {/* Assessable Row */}
                                        <tr className="bg-blue-50/40">
                                            <td className="p-2 text-[11px] font-black text-blue-800 uppercase">Assess value</td>
                                            <td className="p-1"></td>
                                            <td className="p-1"><SmartFormulaInput value={formData.assess_formula} onChange={val => setFormData({...formData, assess_formula: val})} /></td>
                                            <td className="p-1"><input className="w-full border border-slate-200 rounded p-1 text-[11px] uppercase font-bold text-slate-600" placeholder="DEBIT LEDGER" value={formData.assess_account} onChange={e => setFormData({...formData, assess_account: e.target.value})} /></td>
                                        </tr>
                                        {/* Tax Rows Mapping */}
                                        {formData.rows.map((row, idx) => (
                                            <tr key={row.id} className="hover:bg-slate-50 transition-colors">
                                                <td className="p-2">
                                                    <label className="flex items-center gap-2 cursor-pointer">
                                                        <input type="checkbox" className="rounded" checked={row.checked} onChange={e => {
                                                            const newRows = [...formData.rows];
                                                            newRows[idx].checked = e.target.checked;
                                                            setFormData({...formData, rows: newRows});
                                                        }} />
                                                        <span className="text-[11px] font-bold text-slate-600 uppercase">{row.label}</span>
                                                    </label>
                                                </td>
                                                <td className="p-1"><input className="w-full border border-slate-200 rounded p-1 text-[11px] text-center font-bold" value={row.val} onChange={e => {
                                                    const newRows = [...formData.rows];
                                                    newRows[idx].val = e.target.value;
                                                    setFormData({...formData, rows: newRows});
                                                }} /></td>
                                                <td className="p-1"><SmartFormulaInput value={row.formula} onChange={val => {
                                                    const newRows = [...formData.rows];
                                                    newRows[idx].formula = val;
                                                    setFormData({...formData, rows: newRows});
                                                }} /></td>
                                                <td className="p-1"><input className="w-full border border-slate-200 rounded p-1 text-[11px] uppercase" value={row.account} onChange={e => {
                                                    const newRows = [...formData.rows];
                                                    newRows[idx].account = e.target.value;
                                                    setFormData({...formData, rows: newRows});
                                                }} /></td>
                                            </tr>
                                        ))}

                                        {/* GST & IGST Special Logic Row */}
                                        <tr className="bg-emerald-50/20 border-t-2 border-emerald-100">
                                            <td className="p-2"><label className="flex items-center gap-2"><input type="checkbox" checked={formData.igst_checked} onChange={e => setFormData({...formData, igst_checked: e.target.checked})} /><span className="text-[11px] font-black text-emerald-700 uppercase">IGST (INTER-STATE)</span></label></td>
                                            <td className="p-1"><input className="w-full border border-emerald-200 rounded p-1 text-[11px] text-center font-bold" value={formData.igst_val} onChange={e => setFormData({...formData, igst_val: e.target.value})} /></td>
                                            <td className="p-1"><SmartFormulaInput value={formData.igst_formula} onChange={val => setFormData({...formData, igst_formula: val})} /></td>
                                            <td className="p-1"><input className="w-full border border-emerald-200 rounded p-1 text-[11px] uppercase text-emerald-800" placeholder="OUTPUT IGST LEDGER" value={formData.igst_account} onChange={e => setFormData({...formData, igst_account: e.target.value})} /></td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>

                            {/* FOOTER CALCS & SIMULATION */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                <div className="bg-slate-900 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden">
                                    <div className="absolute top-0 right-0 p-4 opacity-10"><Calculator size={100}/></div>
                                    <h3 className="text-[11px] font-black uppercase text-blue-400 mb-4 tracking-widest flex items-center gap-2"><CheckCircle2 size={16}/> Final Calculation Logic</h3>
                                    <div className="space-y-4 relative z-10">
                                        <SmartFormulaInput label="Sub Total Calculation [I]" value={formData.sub_total_formula} onChange={val => setFormData({...formData, sub_total_formula: val})} />
                                        <SmartFormulaInput label="Final Net Invoice Value" value={formData.total_value_formula} onChange={val => setFormData({...formData, total_value_formula: val})} />
                                        <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/10">
                                            <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={formData.account_posting} onChange={e => setFormData({...formData, account_posting: e.target.checked})} /><span className="text-[10px] font-black uppercase">Enable Ledger Posting</span></label>
                                            <div className="flex gap-4">
                                                {['Forward', 'Reverse'].map(dir => (
                                                    <label key={dir} className="flex items-center gap-1 cursor-pointer">
                                                        <input type="radio" name="round_dir" checked={formData.round_off_direction === dir} onChange={() => setFormData({...formData, round_off_direction: dir})} />
                                                        <span className="text-[9px] uppercase font-bold tracking-tighter">{dir} Rounding</span>
                                                    </label>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* LIVE LOGIC PREVIEW */}
                                <div className="bg-white rounded-2xl p-6 border-2 border-blue-50 shadow-sm">
                                    <h3 className="text-[11px] font-black uppercase text-slate-400 mb-4 flex items-center gap-2"><AlertCircle size={16} className="text-blue-500"/> Logic Simulator (Test Run)</h3>
                                    <div className="space-y-2">
                                        <div className="flex justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
                                            <span className="text-[10px] font-bold text-slate-500 uppercase">Input: Rate 250 @ 5280 Kg</span>
                                            <span className="text-xs font-mono font-black text-blue-600">H = 1,320,000</span>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2">
                                            <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-100">
                                                <p className="text-[8px] font-black text-emerald-600 uppercase">IGST @ 5%</p>
                                                <p className="text-lg font-mono font-black text-emerald-700">₹ {simulate(formData.igst_formula)}</p>
                                            </div>
                                            <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
                                                <p className="text-[8px] font-black text-blue-600 uppercase">Final Value</p>
                                                <p className="text-lg font-mono font-black text-blue-700">₹ {simulate(formData.total_value_formula)}</p>
                                            </div>
                                        </div>
                                        <p className="text-[9px] text-slate-400 italic text-center mt-2">Simulator uses sample data to verify math syntax before saving.</p>
                                    </div>
                                </div>
                            </div>

                            {/* LEDGER FOOTER */}
                            <div className="mt-6 grid grid-cols-2 gap-4">
                                <div className="bg-white p-4 rounded-xl border border-slate-200">
                                    <label className="text-[10px] font-black text-slate-400 uppercase block mb-1">Round Off Ledger Account</label>
                                    <input className="w-full border p-2 rounded text-xs font-bold uppercase" value={formData.round_off_account} onChange={e => setFormData({...formData, round_off_account: e.target.value})} />
                                </div>
                                <div className="bg-white p-4 rounded-xl border border-slate-200">
                                    <label className="text-[10px] font-black text-slate-400 uppercase block mb-1">Freight Outward Ledger Account</label>
                                    <input className="w-full border p-2 rounded text-xs font-bold uppercase" value={formData.lorry_freight_account} onChange={e => setFormData({...formData, lorry_freight_account: e.target.value})} />
                                </div>
                            </div>

                            <div className="mt-8 pt-6 border-t flex justify-end gap-3">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-8 py-2 text-slate-400 hover:text-slate-600 font-bold uppercase text-[11px]">Discard Changes</button>
                                <button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white px-10 py-3 rounded-xl font-black shadow-xl flex items-center gap-2 uppercase text-[11px] tracking-widest transition-all active:scale-95">
                                    <Save size={18}/> {loading ? 'UPDATING...' : 'Sync Configuration'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default InvoiceTypeMaster;