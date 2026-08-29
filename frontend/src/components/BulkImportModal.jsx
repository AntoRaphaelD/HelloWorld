import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { UploadCloud, FileSpreadsheet, Download, X, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

const BulkImportModal = ({
    isOpen,
    onClose,
    title = "Bulk Import from Excel",
    subtitle = "Upload an .xlsx or .xls file to import multiple records at once.",
    onDownloadTemplate,
    onSave
}) => {
    const [fileName, setFileName] = useState('');
    const [parsedData, setParsedData] = useState([]);
    const [previewRows, setPreviewRows] = useState([]);
    const [headers, setHeaders] = useState([]);
    const [isParsing, setIsParsing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
    const [successMsg, setSuccessMsg] = useState('');
    const fileInputRef = useRef(null);

    if (!isOpen) return null;

    const handleFile = (file) => {
        if (!file) return;
        setFileName(file.name);
        setErrorMsg('');
        setSuccessMsg('');
        setIsParsing(true);

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const sheetName = workbook.SheetNames[0];
                const sheet = workbook.Sheets[sheetName];
                const json = XLSX.utils.sheet_to_json(sheet, { defval: "" });

                if (!json || json.length === 0) {
                    setErrorMsg("The selected Excel file contains no records.");
                    setIsParsing(false);
                    return;
                }

                const detectedHeaders = Object.keys(json[0] || {});
                setHeaders(detectedHeaders);
                setParsedData(json);
                setPreviewRows(json.slice(0, 10)); // preview top 10
            } catch (err) {
                console.error("Failed to parse Excel file:", err);
                setErrorMsg("Failed to parse Excel file. Please ensure it's a valid .xlsx or .xls file.");
            } finally {
                setIsParsing(false);
            }
        };
        reader.readAsArrayBuffer(file);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFile(e.dataTransfer.files[0]);
        }
    };

    const handleImportSave = async () => {
        if (!parsedData || parsedData.length === 0) {
            setErrorMsg("Please upload a valid Excel file first.");
            return;
        }

        setIsSaving(true);
        setErrorMsg('');
        try {
            await onSave(parsedData);
            setSuccessMsg(`Successfully imported ${parsedData.length} records!`);
            setTimeout(() => {
                onClose();
                setParsedData([]);
                setFileName('');
                setHeaders([]);
                setPreviewRows([]);
                setSuccessMsg('');
            }, 1200);
        } catch (err) {
            console.error("Bulk import failed:", err);
            setErrorMsg(err.response?.data?.error || err.message || "Bulk import failed. Please check the data format.");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 font-sans animate-in fade-in duration-150">
            <div className="relative bg-white w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden border border-slate-200 flex flex-col max-h-[90vh]">
                
                {/* Modal Header */}
                <div className="bg-gradient-to-r from-blue-700 to-indigo-700 px-6 py-4 flex justify-between items-center text-white">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-white/20 rounded-xl">
                            <FileSpreadsheet size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold">{title}</h2>
                            <p className="text-blue-100 text-xs mt-0.5">{subtitle}</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-lg hover:bg-white/20 transition-all text-white"
                    >
                        <X size={22} />
                    </button>
                </div>

                {/* Modal Body */}
                <div className="p-6 overflow-y-auto flex-1 space-y-5">
                    {/* Template download notice */}
                    <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-xl p-4">
                        <div className="flex items-center gap-3">
                            <Download className="text-blue-600" size={22} />
                            <div>
                                <h4 className="text-sm font-bold text-blue-900">Need the standard format?</h4>
                                <p className="text-xs text-blue-700">Download the pre-filled template with proper column headers.</p>
                            </div>
                        </div>
                        {onDownloadTemplate && (
                            <button
                                type="button"
                                onClick={onDownloadTemplate}
                                className="px-4 py-2 bg-white border border-blue-300 text-blue-700 hover:bg-blue-100 rounded-lg text-xs font-bold uppercase shadow-sm transition-all flex items-center gap-1.5"
                            >
                                <Download size={14} /> Download Template
                            </button>
                        )}
                    </div>

                    {/* File Dropzone */}
                    <div
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={handleDrop}
                        onClick={() => fileInputRef.current?.click()}
                        className="border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-2xl p-8 text-center bg-slate-50 hover:bg-blue-50/50 cursor-pointer transition-all flex flex-col items-center justify-center gap-3"
                    >
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".xlsx, .xls, .csv"
                            className="hidden"
                            onChange={(e) => handleFile(e.target.files?.[0])}
                        />
                        <div className="p-4 bg-white rounded-full shadow-sm text-blue-600">
                            <UploadCloud size={36} />
                        </div>
                        <div>
                            <p className="text-sm font-bold text-slate-800">
                                {fileName ? fileName : "Click to select or drag and drop your Excel file here"}
                            </p>
                            <p className="text-xs text-slate-500 mt-1">
                                Supports .XLSX, .XLS files with first sheet as data
                            </p>
                        </div>
                    </div>

                    {/* Feedback messages */}
                    {errorMsg && (
                        <div className="flex items-center gap-2 text-sm text-red-700 bg-red-50 border border-red-200 p-3.5 rounded-xl">
                            <AlertCircle size={18} className="shrink-0" />
                            <span>{errorMsg}</span>
                        </div>
                    )}
                    {successMsg && (
                        <div className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 p-3.5 rounded-xl">
                            <CheckCircle size={18} className="shrink-0" />
                            <span>{successMsg}</span>
                        </div>
                    )}

                    {/* Preview Table */}
                    {isParsing && (
                        <div className="p-8 text-center text-slate-500 flex items-center justify-center gap-2">
                            <Loader2 className="animate-spin" size={20} />
                            <span>Parsing Excel file...</span>
                        </div>
                    )}

                    {parsedData.length > 0 && !isParsing && (
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                                    Preview ({parsedData.length} records found)
                                </span>
                                <span className="text-[11px] text-slate-400 font-medium">
                                    Showing top {previewRows.length} rows
                                </span>
                            </div>
                            <div className="border border-slate-200 rounded-xl overflow-x-auto max-h-56">
                                <table className="w-full text-left text-xs border-collapse font-mono">
                                    <thead className="bg-slate-100 text-slate-700 sticky top-0 uppercase font-bold">
                                        <tr>
                                            {headers.map((h, i) => (
                                                <th key={i} className="p-2.5 border-b border-r border-slate-200 whitespace-nowrap">
                                                    {h}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {previewRows.map((row, rIdx) => (
                                            <tr key={rIdx} className="hover:bg-slate-50">
                                                {headers.map((h, cIdx) => (
                                                    <td key={cIdx} className="p-2.5 border-r border-slate-200 whitespace-nowrap text-slate-800">
                                                        {String(row[h] !== undefined ? row[h] : '')}
                                                    </td>
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>

                {/* Modal Footer */}
                <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end items-center gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-semibold text-sm hover:bg-slate-100 transition-all"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={handleImportSave}
                        disabled={parsedData.length === 0 || isSaving}
                        className="px-7 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-sm shadow-md transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isSaving ? (
                            <>
                                <Loader2 size={16} className="animate-spin" /> Importing...
                            </>
                        ) : (
                            <>
                                <UploadCloud size={16} /> Import {parsedData.length > 0 ? `(${parsedData.length})` : ''}
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default BulkImportModal;