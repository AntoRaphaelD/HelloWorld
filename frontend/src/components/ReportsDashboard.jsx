import React, { useState, useMemo } from 'react';
import {
  FileText, Printer, Download, Search, ClipboardCheck,
  Zap, Factory, Truck, ShoppingBag, Landmark, Box, Loader2, AlertCircle,
  FileDown, FileJson, FileSpreadsheet
} from 'lucide-react';
import { reportsAPI } from '../service/api';
import * as XLSX from 'xlsx';
import logoImage from '../assets/logo.jpeg';

// PDF Generation Libraries
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const imageUrlToDataUrl = async (url) => {
  const response = await fetch(url);
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

const ReportsDashboard = () => {
  const [selectedReport, setSelectedReport] = useState(null);
  const [dateRange, setDateRange] = useState({
    from: '2024-04-01',
    to: '2026-03-31'
  });
  const [reportData, setReportData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // 1. DYNAMIC COLUMN CONFIGURATION
  const REPORT_CONFIGS = {
    'orders': {
      title: 'Sales Orders Report',
      headers: ['Order No', 'Date', 'Party', 'Broker', 'Items'],
      renderRow: (row) => [
        row.order_no || 'N/A',
        row.date,
        row.Party?.account_name || '-',
        row.Broker?.broker_name || '-',
        row.OrderDetails?.length > 0 ? row.OrderDetails.map(d => d.Product?.product_name).join(", ") : 'No Items'
      ]
    },
    'direct-invoices': {
      title: 'Direct Sales Report',
      headers: ['Order No', 'Date', 'Party', 'Items Count', 'Total Val'],
      renderRow: (row) => [
        row.order_no || 'N/A',
        row.date,
        row.Party?.account_name || '-',
        row.DirectInvoiceDetails?.length || 0,
        `Rs. ${row.final_invoice_value || 0}`
      ]
    },
    'production': {
      title: 'Production Register (RG1)',
      headers: ['Date', 'Product', 'Packing', 'Prod Kgs', 'Stock Kgs', 'Bags'],
      renderRow: (row) => [
        row.date,
        row.Product?.product_name || '-',
        row.PackingType?.packing_type || '-',
        row.production_kgs,
        row.stock_kgs,
        row.stock_bags
      ]
    },
    'despatch': {
      title: 'Despatch / Loading Report',
      headers: ['Load No', 'Load Date', 'Vehicle No', 'Transport', 'Bags', 'Freight'],
      renderRow: (row) => [
        row.load_no,
        row.load_date,
        row.vehicle_no,
        row.Transport?.transport_name || '-',
        row.no_of_bags,
        `Rs. ${row.freight}`
      ]
    },
    'invoices': {
      title: 'Invoice Registry',
      headers: ['Inv No', 'Date', 'Party', 'Transport', 'Amount'],
      renderRow: (row) => [
        row.invoice_no,
        row.date,
        row.Party?.account_name || '-',
        row.Transport?.transport_name || '-',
        `Rs. ${row.net_amount}`
      ]
    },
    'depot-sales': {
      title: 'Depot Sales Report',
      headers: ['Inv No', 'Date', 'Party', 'Depot', 'Value'],
      renderRow: (row) => [
        row.invoice_no,
        row.date,
        row.Party?.account_name || '-',
        row.Depot?.account_name || '-',
        `Rs. ${row.final_invoice_value}`
      ]
    },
    'depot-received': {
      title: 'Depot Stock Inward Report',
      headers: ['Inv No', 'Date', 'Depot', 'Product', 'Kgs'],
      renderRow: (row) => [
        row.invoice_no,
        row.date,
        row.Depot?.account_name || '-',
        row.Product?.product_name || '-',
        row.total_kgs
      ]
    }
  };

  const reportCategories = [
    {
      title: "Factory Operations",
      reports: [
        { id: 'orders', label: 'Sales With Order', icon: ClipboardCheck },
        { id: 'direct-invoices', label: 'Sales Without Order', icon: Zap },
        { id: 'production', label: 'RG1 Production', icon: Factory },
        { id: 'despatch', label: 'Despatch Entry', icon: Truck },
        { id: 'invoices', label: 'Invoice Registry', icon: FileText },
      ]
    },
    {
      title: "Depot Management",
      reports: [
        { id: 'depot-sales', label: 'Depot Sales', icon: ShoppingBag },
        { id: 'depot-received', label: 'Stock Inward', icon: Landmark },
      ]
    }
  ];

  const handleGenerateReport = async () => {
    if (!selectedReport) return;
    setLoading(true);
    setError(null);
    setReportData([]);
    try {
      const response = await reportsAPI.getReportData(selectedReport.id, dateRange);
      const fetchedData = response.data?.data || [];
      if (fetchedData.length === 0) setError("No records found for this period.");
      else setReportData(fetchedData);
    } catch (err) {
      setError("Server connection failed.");
    } finally {
      setLoading(false);
    }
  };

  // ================= EXPORT LOGIC =================

  // 1. Excel Export (.xlsx)
  const exportToExcel = () => {
    if (!selectedReport || reportData.length === 0) return;
    const config = REPORT_CONFIGS[selectedReport.id];

    const wsData = [
      ["KAYAAR EXPORTS PRIVATE LIMITED"],
      [`${config.title} (${dateRange.from} to ${dateRange.to})`],
      ["GSTIN: 33AAACK4468M1ZA | Kovilpatti, Tamil Nadu"],
      [],
      config.headers,
      ...reportData.map(row => config.renderRow(row))
    ];

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Report");
    XLSX.writeFile(wb, `Kayaar_Exports_${selectedReport.id}_report_${dateRange.from}_to_${dateRange.to}.xlsx`);
  };

  // 2. PDF Export
  const exportToPDF = async () => {
    if (!selectedReport || reportData.length === 0) return;
    const doc = new jsPDF('landscape');
    const config = REPORT_CONFIGS[selectedReport.id];

    let logoDataUrl = '';
    try {
      logoDataUrl = await imageUrlToDataUrl(logoImage);
    } catch (e) {
      console.warn("Logo load error:", e);
    }

    if (logoDataUrl) {
      doc.addImage(logoDataUrl, 'JPEG', 14, 10, 18, 18);
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("KAYAAR EXPORTS PRIVATE LIMITED", logoDataUrl ? 36 : 14, 17);

    doc.setFontSize(10);
    doc.setTextColor(80, 80, 80);
    doc.text(config.title, logoDataUrl ? 36 : 14, 24);

    doc.setFontSize(8.5);
    doc.text(`Period: ${dateRange.from} to ${dateRange.to}`, doc.internal.pageSize.getWidth() - 14, 24, { align: 'right' });

    const tableRows = reportData.map(row => config.renderRow(row));
    autoTable(doc, {
      startY: 32,
      head: [config.headers],
      body: tableRows,
      theme: 'grid',
      headStyles: { fillColor: [15, 23, 42], fontSize: 9, fontStyle: 'bold' },
      styles: { fontSize: 8 }
    });
    doc.save(`Kayaar_Exports_${selectedReport.id}_report.pdf`);
  };

  // 3. JSON Export
  const exportToJSON = () => {
    if (!reportData.length) return;

    // Convert data to JSON string with indentation
    const jsonString = JSON.stringify(reportData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    // Create temporary link and click it
    const link = document.createElement('a');
    link.href = url;
    link.download = `Kayaar_Exports_${selectedReport.id}_data_${dateRange.from}.json`;
    document.body.appendChild(link);
    link.click();

    // Cleanup
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const currentConfig = useMemo(() =>
    selectedReport ? REPORT_CONFIGS[selectedReport.id] : null
    , [selectedReport]);

  return (
    <div className="p-8 max-w-[1600px] mx-auto min-h-screen bg-slate-50/50 font-sans">
      {/* Branding & Analytics Header */}
      <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-4">
          <img src={logoImage} alt="Kayaar Exports Logo" className="w-14 h-14 object-contain rounded-2xl border border-slate-200 p-1.5 bg-white shadow-sm" />
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase text-blue-600 tracking-wider">KAYAAR EXPORTS PRIVATE LIMITED</span>
            </div>
            <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">
              Intelligence <span className="text-blue-600">Analytics</span>
            </h2>
            <p className="text-slate-400 font-bold uppercase text-[9px] tracking-[0.2em]">GSTIN: 33AAACK4468M1ZA | Kovilpatti, Tamil Nadu</p>
          </div>
        </div>

        {/* Action Buttons */}
        {reportData.length > 0 && (
          <div className="flex gap-2.5 flex-wrap items-center">
            <button
              onClick={exportToExcel}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-md shadow-emerald-200 active:scale-95"
            >
              <FileSpreadsheet size={16} /> Export Excel
            </button>
            <button
              onClick={exportToJSON}
              className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-md shadow-amber-200 active:scale-95"
            >
              <FileJson size={16} /> Export JSON
            </button>
            <button
              onClick={exportToPDF}
              className="flex items-center gap-2 bg-rose-600 hover:bg-rose-700 text-white px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-md shadow-rose-200 active:scale-95"
            >
              <FileDown size={16} /> Export PDF
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-12 gap-8">
        {/* SIDEBAR */}
        <div className="col-span-12 lg:col-span-3 space-y-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm">
            {reportCategories.map((cat, idx) => (
              <div key={idx} className="mb-6 last:mb-0">
                <h5 className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 px-2">{cat.title}</h5>
                <div className="space-y-1">
                  {cat.reports.map(report => (
                    <button
                      key={report.id}
                      onClick={() => { setSelectedReport(report); setError(null); setReportData([]); }}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${selectedReport?.id === report.id
                          ? 'bg-blue-600 text-white shadow-lg'
                          : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                        }`}
                    >
                      <report.icon size={16} />
                      <span className="text-xs font-bold uppercase tracking-tight">{report.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="bg-slate-900 rounded-3xl p-6 text-white shadow-xl">
            <div className="space-y-4 mb-6">
              <div>
                <label className="text-[9px] font-black text-slate-500 uppercase block mb-1">From Date</label>
                <input type="date" value={dateRange.from} onChange={(e) => setDateRange({ ...dateRange, from: e.target.value })} className="w-full bg-slate-800 border-none rounded-lg p-2 text-xs text-white" />
              </div>
              <div>
                <label className="text-[9px] font-black text-slate-500 uppercase block mb-1">To Date</label>
                <input type="date" value={dateRange.to} onChange={(e) => setDateRange({ ...dateRange, to: e.target.value })} className="w-full bg-slate-800 border-none rounded-lg p-2 text-xs text-white" />
              </div>
            </div>
            <button
              onClick={handleGenerateReport}
              disabled={!selectedReport || loading}
              className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 py-4 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-lg"
            >
              {loading ? <Loader2 className="animate-spin" size={16} /> : <Printer size={16} />}
              Fetch Statistics
            </button>
          </div>
        </div>

        {/* DATA TABLE */}
        <div className="col-span-12 lg:col-span-9 bg-white border border-slate-200 rounded-[2.5rem] overflow-hidden shadow-sm flex flex-col min-h-[600px]">
          {reportData.length > 0 && currentConfig ? (
            <div className="overflow-auto custom-scrollbar">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-900 text-white sticky top-0 z-10">
                    {currentConfig.headers.map((h, i) => (
                      <th key={i} className="px-6 py-5 text-[10px] font-black uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {reportData.map((row, rowIndex) => (
                    <tr key={rowIndex} className="border-b border-slate-50 hover:bg-blue-50/40 transition-colors">
                      {currentConfig.renderRow(row).map((cell, cellIndex) => (
                        <td key={cellIndex} className={`px-6 py-4 text-[11px] ${cellIndex === 0 ? 'font-black text-blue-600' : 'font-medium text-slate-700'}`}>
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-300 p-10">
              {loading ? (
                <Loader2 className="animate-spin text-blue-600 mb-4" size={40} />
              ) : error ? (
                <div className="text-center">
                  <AlertCircle size={48} className="mx-auto mb-4 text-amber-500" />
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">{error}</p>
                </div>
              ) : (
                <div className="text-center">
                  <Search size={48} strokeWidth={1} className="mx-auto mb-4 opacity-20" />
                  <p className="text-[10px] font-black uppercase tracking-[0.2em]">Select a report and click Generate</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReportsDashboard;