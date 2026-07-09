import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { mastersAPI, transactionsAPI } from '../service/api';
import {
    Save, FileText, Calculator, Plus, MinusCircle,
    Layers, Activity, Search, Hash, Printer,
    Warehouse, X, Database, CheckCircle
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { evaluate } from "mathjs";
import logoImage from '../assets/logo.jpeg';

const evaluateFormula = (formula, ctx) => {

    let processed = formula;

    Object.keys(ctx).forEach(key => {
        const regex = new RegExp(`\\[${key}\\]`, 'gi');
        processed = processed.replace(regex, ctx[key]);
    });

    processed = processed.replace(/\[.*?\]/g, '0');

    processed = processed
        .replace(/Round\(/gi, "round(")
        .replace(/Abs\(/gi, "abs(");

    return evaluate(processed);
};
// ==========================================
// HELPERS & FORMATTING
// ==========================================
const num = (v) => isNaN(parseFloat(v)) ? 0 : parseFloat(v);
const money = (v) => num(v).toFixed(2);
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
const numberToWords = (amount) => {
    if (!amount || amount === 0) return "Zero Rupees Only";
    const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
    const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
    const convert = (n) => {
        if (n < 20) return ones[n];
        if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? " " + ones[n % 10] : "");
        if (n < 1000) return ones[Math.floor(n / 100)] + " Hundred" + (n % 100 ? " and " + convert(n % 100) : "");
        return "";
    };
    let str = "";
    const crore = Math.floor(amount / 10000000);
    const lakh = Math.floor((amount % 10000000) / 100000);
    const thousand = Math.floor((amount % 100000) / 1000);
    const hundred = amount % 1000;
    if (crore) str += convert(crore) + " Crore ";
    if (lakh) str += convert(lakh) + " Lakh ";
    if (thousand) str += convert(thousand) + " Thousand ";
    if (hundred) str += convert(hundred);
    return str.trim() + " Rupees Only";
};
const DepotSalesInvoice = () => {
    // ==========================================
    // 1. INITIAL STATES
    // ==========================================
    const emptyInvoice = {

        id: null,
        invoice_no: '',
        date: new Date().toISOString().split('T')[0],

        sales_type: 'DEPOT SALES',
        invoice_type_id: '',

        depot_id: '',
        party_id: '',
        addr1: '',
        addr2: '',
        addr3: '',

        del1: '',
        del2: '',
        del3: '',

        credit_days: 0,
        interest_pct: 0,

        transport_id: '',
        lr_no: '',
        lr_date: new Date().toISOString().split('T')[0],

        vehicle_no: '',
        remarks: '',

        broker_id: '',
        pay_mode: 'CREDIT',

        // ⭐ NEW FIELDS
        country: '',
        are_no: '',
        removal_time: '',
        agent_name: '',
        form_jj: '',

        // totals
        total_assessable: 0,
        total_charity: 0,

        total_vat: 0,
        total_cenvat: 0,
        total_duty: 0,
        total_cess: 0,
        total_hr_sec_cess: 0,

        total_sgst: 0,
        total_cgst: 0,
        total_igst: 0,
        total_tcs: 0,

        total_discount: 0,
        total_other: 0,

        pf_amount: 0,
        freight: 0,

        sub_total: 0,
        round_off: 0,
        final_invoice_value: 0
    };
    const [listData, setListData] = useState({
        types: [], parties: [], depots: [], transports: [],
        products: [], orders: [], history: [], brokers: []
    });
    const [formData, setFormData] = useState(emptyInvoice);
    const [gridRows, setGridRows] = useState([]);
    const [loading, setLoading] = useState(false);
    const [submitLoading, setSubmitLoading] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [activeTab, setActiveTab] = useState('head');

    const [searchField, setSearchField] = useState('invoice_no');
    const [searchCondition, setSearchCondition] = useState('Like');
    const [searchValue, setSearchValue] = useState('');

    // Pagination (registry)
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);

    // Add this near your other useMemo/useEffect hooks
    const filteredInvoiceTypes = useMemo(() => {
        if (!formData.sales_type) return [];

        return listData.types.filter(type => {
            // This compares the 'sales_type' field inside your tbl_InvoiceTypes
            // directly with the 'sales_type' selected in the UI dropdown.
            return String(type.sales_type).trim().toUpperCase() === String(formData.sales_type).trim().toUpperCase();
        });
    }, [listData.types, formData.sales_type]);
    useEffect(() => {

        if (!formData.invoice_type_id) return;

        setGridRows(prev =>
            runCalculations(prev, formData.invoice_type_id)
        );

    }, [formData.invoice_type_id]);
    useEffect(() => {

        if (gridRows.length === 0) return;

        setGridRows(prev =>
            runCalculations(prev, formData.invoice_type_id)
        );

    }, []);
    // ==========================================
    // 2. MATH ENGINE - FREIGHT NOW SYNCED FROM DETAILS
    // ==========================================
    const runCalculations = useCallback((rows, typeId, hFreight = formData.freight, salesType = formData.sales_type) => {
        if (!typeId) return rows;
        const config = listData.types.find(t => t.id === parseInt(typeId));
        if (!config) return rows;

        let hTotals = {
            assess: 0, charity: 0, freight: 0, gst: 0, tcs: 0, gross: 0,
            cenvat: 0, duty: 0, cess: 0, hcess: 0, other: 0, vat: 0,
            sgst: 0, cgst: 0, igst: 0, disc: 0, net: 0
        };

        const gstPer = num(config.gst_percentage);
        const sgstPer = num(config.sgst_percentage);
        const cgstPer = num(config.cgst_percentage);
        const igstPer = num(config.igst_percentage);
        const splitGstPer = sgstPer + cgstPer;
        const taxPercentage = igstPer > 0 ? igstPer : (splitGstPer > 0 ? splitGstPer : gstPer);

        const updatedRows = rows.map((item) => {
            const product = listData.products.find(p => p.id === parseInt(item.product_id));
            const productName = String(item.product_description || product?.product_name || '').toLowerCase();
            const is68Product = productName.includes('68');

            const packs = num(item.packs);
            const bagWt = num(item.avg_content);
            const rateInput = num(item.rate);
            const totalKgs = is68Product ? num(item.total_kgs) : (packs * bagWt);

            const rawTotalInvoiceAmount = is68Product ? (10 * packs * rateInput) : (totalKgs * rateInput);
            const totalInvoiceAmount = is68Product ? rawTotalInvoiceAmount : Math.round(rawTotalInvoiceAmount);

            const charityPerBale = salesType === 'GST SALES' || salesType === "DEPOT SALES" ? 3 : num(item.charity_per_bale || config.charity_value || 0);
            let charity = 0;
            if (salesType === 'GST SALES' || salesType === "DEPOT SALES" ) {
                charity = totalKgs * charityPerBale;
            } else {
                charity = 0;
            }

            const taxDivisor = 1 + (taxPercentage / 100);
            const baseAmount = taxDivisor > 0 ? (totalInvoiceAmount / taxDivisor) : totalInvoiceAmount;
            const gstAmount = (baseAmount * taxPercentage) / 100;
            const accessibleValue = totalInvoiceAmount - num(item.freight_amt) - charity - gstAmount;

            const vat = (accessibleValue * num(item.vat_per)) / 100;
            const cenvat = (accessibleValue * num(item.cenvat_per)) / 100;
            const duty = (accessibleValue * num(item.duty_per)) / 100;
            const cess = (accessibleValue * num(item.cess_per)) / 100;
            const hcess = (accessibleValue * num(item.hcess_per)) / 100;
            const tcs = (totalInvoiceAmount * num(item.tcs_per)) / 100;

            const basis = accessibleValue + vat + cenvat + duty + cess + hcess + gstAmount + tcs + charity + num(item.other_amt) + num(item.freight_amt);
            const discAmt = (num(item.discount_percentage) * basis) / 100;
            const rowTotal = basis - discAmt;

            hTotals.assess += accessibleValue; hTotals.charity += charity; hTotals.freight += num(item.freight_amt);
            hTotals.gst += gstAmount; hTotals.tcs += tcs; hTotals.gross += totalInvoiceAmount;
            hTotals.vat += vat; hTotals.cenvat += cenvat; hTotals.duty += duty;
            hTotals.cess += cess; hTotals.hcess += hcess; hTotals.other += num(item.other_amt);
            hTotals.disc += discAmt; hTotals.net += rowTotal;

            return {
                ...item,
                packs: packs,
                avg_content: bagWt,
                total_kgs: totalKgs,
                assessable_value: accessibleValue, charity_amt: charity,
                gst_amt: gstAmount,
                sgst_amt: sgstPer > 0 ? gstAmount / 2 : 0,
                cgst_amt: cgstPer > 0 ? gstAmount / 2 : 0,
                igst_amt: igstPer > 0 ? gstAmount : 0,
                vat_amt: vat, cenvat_amt: cenvat, duty_amt: duty, cess_amt: cess,
                hr_sec_cess_amt: hcess, tcs_amt: tcs,
                discount_amt: discAmt, sub_total: basis, final_value: rowTotal
            };
        });

        const finalRawTotal = hTotals.gross + num(formData.pf_amount);
        const finalNetTotal = Math.round(finalRawTotal);

        setFormData(prev => ({
            ...prev,
            total_assessable: money(hTotals.assess),
            total_charity: money(hTotals.charity),
            total_vat: money(hTotals.vat),
            total_cenvat: money(hTotals.cenvat),
            total_duty: money(hTotals.duty), total_cess: money(hTotals.cess),
            total_hr_sec_cess: money(hTotals.hcess),
            total_gst: igstPer > 0 ? 0 : money(hTotals.gst),
            total_sgst: sgstPer > 0 ? money(hTotals.gst / 2) : 0,
            total_cgst: cgstPer > 0 ? money(hTotals.gst / 2) : 0,
            total_igst: igstPer > 0 ? money(hTotals.gst) : 0,
            total_tcs: money(hTotals.tcs),
            total_discount: money(hTotals.disc),
            total_other: money(hTotals.other),
            sub_total: money(finalRawTotal),
            round_off: (finalNetTotal - finalRawTotal).toFixed(2),
            final_invoice_value: finalNetTotal
        }));

        return updatedRows;
    }, [listData.types, listData.products, formData.pf_amount, formData.freight, formData.sales_type]);
    // ==========================================
    // 3. EXPORT TO PDF - COMPACT TAX INVOICE FORMAT
    // ==========================================
    const exportToPDF = async () => {
        const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
        const data = formData;
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const margin = 7;
        const right = pageWidth - margin;
        const contentWidth = pageWidth - (margin * 2);
        const midX = margin + 115;

        const fmt = (v, digits = 2) => num(v).toLocaleString('en-IN', {
            minimumFractionDigits: digits,
            maximumFractionDigits: digits
        });
        const fmtDate = (value) => {
            if (!value) return '';
            const date = new Date(value);
            if (Number.isNaN(date.getTime())) return String(value);
            return date.toLocaleDateString('en-GB');
        };
        const safe = (value, fallback = '') => {
            const text = value === null || value === undefined ? '' : String(value).trim();
            return text || fallback;
        };
        const party = listData.parties.find(p => String(p.id) === String(data.party_id)) || data.Party || {};
        const depot = listData.depots.find(d => String(d.id) === String(data.depot_id)) || data.Depot || {};
        const transport = listData.transports.find(t => String(t.id) === String(data.transport_id)) || data.Transport || {};
        const firstRow = gridRows[0] || {};
        const lineRows = gridRows.length ? gridRows : [{}];
        const getHSN = (productId) => {
            const product = listData.products.find(p => String(p.id) === String(productId));
            return product?.printing_tariff_sub_head_no || '';
        };
        const hsnCodes = [...new Set(gridRows.map(row => getHSN(row.product_id)).filter(Boolean))];
        const totalGst = num(data.total_gst) + num(data.total_sgst) + num(data.total_cgst) + num(data.total_igst);
        const ratePerKg = (item) => {
            const netWeight = num(item.total_kgs);
            return netWeight ? num(item.assessable_value) / netWeight : 0;
        };

        const labelValue = (label, value, x, y, labelW = 28) => {
            doc.setFont("helvetica", "bold");
            doc.text(label, x, y);
            doc.text(":", x + labelW, y);
            doc.text(safe(value, "-"), x + labelW + 5, y);
        };
        const checkbox = (label, x, y) => {
            doc.rect(x, y - 3, 3.5, 3.5);
            doc.setFont("helvetica", "bold");
            doc.text(label, x + 5, y);
        };

        doc.setTextColor(0);
        doc.setDrawColor(0);
        doc.setLineWidth(0.25);
        doc.setFont("helvetica", "bold");
        let logoDataUrl = '';
        try {
            logoDataUrl = await imageUrlToDataUrl(logoImage);
        } catch (error) {
            console.warn("Depot invoice logo could not be loaded:", error);
        }

        doc.setFontSize(6.5);
        checkbox("ORIGINAL FOR BUYER", 145, 10);
        checkbox("DUPLICATE FOR TRANSPORTER", 145, 15);
        checkbox("TRIPLICATE FOR FILE COPY", 145, 20);
        checkbox("EXTRA COPY", 145, 25);

        doc.setFontSize(11);
        doc.text("TAX INVOICE", pageWidth / 2, 22, { align: "center" });

        let y = 36;
        const headerHeight = 52;
        doc.rect(margin, y, contentWidth, headerHeight);
        if (logoDataUrl) {
            doc.addImage(logoDataUrl, "JPEG", margin + 12, y + 8, 38, 38);
        }

        doc.setFontSize(10);
        doc.text("KAYAAR EXPORTS PRIVATE LIMITED", margin + 62, y + 8);
        doc.setFontSize(8);
        doc.text("D.No: 43/5, Railway Feeder Road,", margin + 71, y + 13);
        doc.text("K.R. Nagar - 628 503, Kovilpatti - Taluk", margin + 65, y + 18);
        doc.text("Tuticorin Dist., Tamilnadu, India", margin + 72, y + 23);
        doc.text("(04632) - 248258, 9443238761", margin + 75, y + 29);
        doc.text("E-Mail : ttnkrgroup@gmail.com", margin + 74, y + 34);
        doc.text("GSTIN : 33AAACK4468M1ZA", margin + 78, y + 40);

        const certX = right - 48;
        doc.rect(certX, y + 4, 41, 34);
        doc.setFontSize(7);
        doc.text("OEKO-TEX", certX + 20.5, y + 10, { align: "center" });
        doc.setFontSize(5.5);
        doc.text("CONFIDENCE IN TEXTILES", certX + 20.5, y + 14, { align: "center" });
        doc.setFontSize(7);
        doc.text("STANDARD 100", certX + 20.5, y + 19, { align: "center" });
        doc.setFontSize(6);
        doc.text("18.HIN.60427 HOHENSTEIN HTTI", certX + 20.5, y + 25, { align: "center" });
        doc.setFontSize(5.2);
        doc.text("Tested for harmful substances", certX + 20.5, y + 31, { align: "center" });
        doc.text("www.oeko-tex.com/standard100", certX + 20.5, y + 35, { align: "center" });

        doc.setFontSize(7);
        doc.text("PAN : AAACK4468M", margin + 3, y + 49);
        doc.text("CIN : U51101TN1991PTC020933", right - 64, y + 49);

        y += headerHeight;
        const detailsHeight = 45;
        doc.rect(margin, y, contentWidth, detailsHeight);
        doc.line(midX, y, midX, y + detailsHeight);

        doc.setFontSize(8);
        doc.text("Party Name & Address", margin + 3, y + 6);
        doc.setFontSize(9);
        doc.text(safe(party.account_name, safe(data.party_name, "N/A")).toUpperCase(), margin + 8, y + 13);
        doc.setFontSize(7);
        const addressLines = [data.addr1, data.addr2, data.addr3].filter(Boolean);
        (addressLines.length ? addressLines : [""]).slice(0, 4).forEach((line, index) => {
            doc.text(safe(line).toUpperCase(), margin + 8, y + 20 + (index * 5));
        });
        doc.text(`GST No: ${safe(party.gst_no || data.gst_no, "N/A")}`, margin + 8, y + 39);

        const infoX = midX + 7;
        doc.setFontSize(8);
        labelValue("Invoice No", data.invoice_no, infoX, y + 8);
        labelValue("Invoice Dt", fmtDate(data.date), infoX, y + 15);
        labelValue("Vehicle No", data.vehicle_no, infoX, y + 22);
        labelValue("Delivery At", depot.account_name || data.delivery || data.country, infoX, y + 29);
        if (transport.transport_name) labelValue("Transport", transport.transport_name, infoX, y + 36);

        y += detailsHeight;
        doc.rect(margin, y, contentWidth, 9);
        doc.setFontSize(8);
        doc.text("DESCRIPTION OF GOODS", pageWidth / 2, y + 6, { align: "center" });
        y += 9;

        autoTable(doc, {
            startY: y,
            margin: { left: margin, right: margin },
            tableWidth: contentWidth,
            head: [["No of Bags", "Net Weight", "S.L No", "Rate Per Kgs", "Assessable Value"]],
            body: lineRows.map(item => [
                fmt(item.packs, 0),
                fmt(item.total_kgs, 2),
                [safe(item.from_no), safe(item.to_no)].filter(Boolean).join(" - "),
                fmt(ratePerKg(item), 2),
                fmt(item.assessable_value, 2)
            ]),
            theme: "grid",
            styles: {
                font: "helvetica",
                fontSize: 8,
                textColor: 0,
                lineColor: 0,
                lineWidth: 0.25,
                cellPadding: 2,
                minCellHeight: 9,
                valign: "middle"
            },
            headStyles: {
                fillColor: [255, 255, 255],
                textColor: 0,
                fontStyle: "bold",
                halign: "center",
                fontSize: 7.5
            },
            bodyStyles: {
                halign: "center",
                fontStyle: "bold"
            },
            columnStyles: {
                0: { cellWidth: 30 },
                1: { cellWidth: 38 },
                2: { cellWidth: 58 },
                3: { cellWidth: 34, halign: "right" },
                4: { cellWidth: contentWidth - 160, halign: "right" }
            }
        });

        y = doc.lastAutoTable.finalY;
        const summaryTop = y;
        const taxRows = [
            ["CHARITY", data.total_charity],
            ["FREIGHT", data.freight],
            ["GST", totalGst],
            ["ROUND OFF", data.round_off]
        ].filter(([label, value]) => label === "CHARITY" || label === "FREIGHT" || num(value) !== 0);
        const summaryHeight = Math.max(38, 14 + (taxRows.length * 6));
        doc.rect(margin, summaryTop, contentWidth, summaryHeight);
        doc.line(midX, summaryTop, midX, summaryTop + summaryHeight);

        doc.setFontSize(10);
        doc.text(safe(firstRow.product_description, "DESCRIPTION").toUpperCase(), margin + 3, summaryTop + 9);
        doc.setFontSize(8);
        doc.text(`HSN CODE: ${hsnCodes.join(", ") || "N/A"}`, margin + 3, summaryTop + 34);

        const taxLabelX = midX + 4;
        const taxValueX = right - 5;
        doc.setFontSize(8);
        taxRows.forEach(([label, value], index) => {
            const rowY = summaryTop + 9 + (index * 6);
            doc.setFont("helvetica", label === "GST" ? "bold" : "normal");
            doc.text(label, taxLabelX, rowY);
            doc.text(fmt(value, 2), taxValueX, rowY, { align: "right" });
        });

        y = summaryTop + summaryHeight;
        doc.rect(margin, y, contentWidth, 30);
        doc.setFontSize(8);
        doc.setFont("helvetica", "bold");
        doc.text("Amount Chargeable (in words)", margin + 3, y + 7);
        doc.setFont("helvetica", "normal");
        doc.text(doc.splitTextToSize(numberToWords(num(data.final_invoice_value)), 105), margin + 3, y + 13);
        doc.setFont("helvetica", "bold");
        doc.text("Grand Total", right - 48, y + 11);
        doc.setFontSize(10);
        doc.text(fmt(data.final_invoice_value, 2), right - 3, y + 11, { align: "right" });

        y += 30;
        doc.rect(margin, y, contentWidth, 24);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(7);
        doc.text("For KAYAAR EXPORTS PRIVATE LIMITED", right - 5, y + 9, { align: "right" });
        doc.text("Authorised Signatory", right - 5, y + 21, { align: "right" });

        doc.setFontSize(6.5);
        doc.setFont("helvetica", "normal");
        doc.text(`Generated on ${new Date().toLocaleString('en-GB')} | Subject to Kovilpatti jurisdiction`, pageWidth / 2, pageHeight - 7, { align: "center" });

        doc.save(`Depot_Invoice_${data.invoice_no || 'draft'}.pdf`);
    };
    const exportToJSON = () => {
        // 1. Find the Depot Name from the list based on selection
        const selectedDepot = listData.depots.find(d => d.id === parseInt(formData.depot_id));
        const depotName = selectedDepot ? selectedDepot.account_name : "INV";

        // 2. Generate Initials (e.g., "Depot Mumbai" -> "DM")
        const shortName = depotName
            .split(' ')                  // Split by space ["Depot", "Mumbai"]
            .filter(word => word.length > 0)
            .map(word => word[0])        // Take first letter ["D", "M"]
            .join('')                    // Join them "DM"
            .toUpperCase();              // Ensure uppercase

        // 3. Construct Filename: [Initials]-[InvoiceNo].json
        const invNo = formData.invoice_no || '000';
        const fileName = `${shortName}-${invNo}.json`;

        // 4. Data Preparation
        const exportData = {
            ...formData,
            Details: gridRows
        };

        // 5. Blob and Download execution
        const jsonString = JSON.stringify(exportData, null, 2);
        const blob = new Blob([jsonString], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");

        link.href = url;
        link.download = fileName; // Uses the generated name (e.g., DM-101.json)

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };
    // ==========================================
    // 4. DATA LOAD
    // ==========================================
    const init = async () => {
        setLoading(true);
        try {
            const [
                invoiceTypesRes,
                accountsRes,
                transportsRes,
                productsRes,
                brokersRes,
                ordersRes,
                depotSalesRes
            ] = await Promise.all([
                mastersAPI.invoiceTypes.getAll(),
                mastersAPI.accounts.getAll(),
                mastersAPI.transports.getAll(),
                mastersAPI.products.getAll(),
                mastersAPI.brokers.getAll(),
                transactionsAPI.orders.getAll(),
                transactionsAPI.depotSales.getAll()
            ]);
            const accs = accountsRes.data.data || [];

            setListData({
                types: invoiceTypesRes.data.data || [],
                parties: accs.filter(a => !a.account_group?.toUpperCase().includes('DEPOT')),
                depots: accs.filter(a => a.account_group?.toUpperCase().includes('DEPOT')),
                transports: transportsRes.data.data || [],
                products: productsRes.data.data || [],
                orders: ordersRes.data.data || [],
                history: depotSalesRes.data.data || [],
                brokers: brokersRes.data.data || []
            });
        } catch (e) {
            console.error("REST Init Error:", e);
        } finally {
            setLoading(false);
        }
    };
    useEffect(() => { init(); }, []);
    // ==========================================
    // 5. HANDLERS
    // ==========================================
    const handleOrderSync = (e) => {

        const val = e.target.value;
        if (!val) return;

        const [source, orderNo] = val.split('|');

        const config = listData.types.find(
            t => t.id === parseInt(formData.invoice_type_id)
        );

        if (!config) {
            alert("Select Invoice Type first.");
            return;
        }

        const order = listData.orders.find(
            o => o.order_no === orderNo
        );

        if (!order) return;

        const details = order?.OrderDetails || [];

        // 🔵 AUTO FILL HEADER
        const party = order.Party || {};
        const broker = order.Broker || {};

        setFormData(prev => ({
            ...prev,

            party_id: party.id || '',
            broker_id: broker.id || '',
            addr1: party.addr1 || '',
            addr2: party.addr2 || '',
            addr3: party.addr3 || '',

            header_locked: true

        }));

        // 🔵 CREATE GRID ROWS
        const newRows = details.map(d => {
            const packs = d.packs || d.qty || 0;
            const bagWt = d.bag_wt || 0;

            return {
                order_no: orderNo,
                order_type: 'WITH_ORDER',
                product_id: d.product_id,
                product_description: d.Product?.product_name || '',
                // 🟢 qty from order is mapped to packs here
                packs: num(d.qty) || 0,
                avg_content: num(d.bag_wt) || 0,
                // 🟢 Immediate calculation for the initial load
                total_kgs: num(d.qty) * num(d.bag_wt),
                rate: d.rate_cr || 0,
                broker_code: broker.broker_code || '',
                packing_type: d.packing_type || 'BAGS',
                vat_per: config.vat_percentage || 0,
                gst_per: config.gst_percentage || 0,
                sgst_per: config.sgst_percentage || 0,
                cgst_per: config.cgst_percentage || 0,
                igst_per: config.igst_percentage || 0,
                tcs_per: config.tcs_percentage || 0,
                discount_percentage: 0,
                other_amt: 0,
                freight_amt: 0
            };
        });

        setGridRows(
            runCalculations([...gridRows, ...newRows], formData.invoice_type_id)
        );

        e.target.value = "";
    };
    const updateGrid = (idx, field, val) => {
        setGridRows(prev => {
            const updated = [...prev];
            updated[idx] = { ...updated[idx], [field]: val };
            return runCalculations(updated, formData.invoice_type_id);
        });
    };
    const handleSave = async () => {
        if (!formData.depot_id || gridRows.length === 0) return;

        setSubmitLoading(true);
        try {
            const { id, ...header } = formData;

            // Construct the payload with proper formatting
            const payload = {
                ...header,
                invoice_type_id: header.invoice_type_id ? Number(header.invoice_type_id) : null,
                depot_id: header.depot_id ? Number(header.depot_id) : null,
                party_id: header.party_id ? Number(header.party_id) : null,
                broker_id: header.broker_id ? Number(header.broker_id) : null,
                transport_id: header.transport_id ? Number(header.transport_id) : null,
                credit_days: Number(header.credit_days) || 0,
                interest_pct: Number(header.interest_pct) || 0,
                total_assessable: Number(header.total_assessable) || 0,
                total_charity: Number(header.total_charity) || 0,
                total_vat: Number(header.total_vat) || 0,
                total_cenvat: Number(header.total_cenvat) || 0,
                total_duty: Number(header.total_duty) || 0,
                total_cess: Number(header.total_cess) || 0,
                total_hr_sec_cess: Number(header.total_hr_sec_cess) || 0,
                total_gst: Number(header.total_gst) || 0,
                total_sgst: Number(header.total_sgst) || 0,
                total_cgst: Number(header.total_cgst) || 0,
                total_igst: Number(header.total_igst) || 0,
                total_discount: Number(header.total_discount) || 0,
                total_other: Number(header.total_other) || 0,
                pf_amount: Number(header.pf_amount) || 0,
                freight: Number(header.freight) || 0,
                sub_total: Number(header.sub_total) || 0,
                round_off: Number(header.round_off) || 0,
                final_invoice_value: Number(header.final_invoice_value) || 0,
                Details: gridRows.map((r) => ({
                    ...r,
                    product_id: r.product_id ? Number(r.product_id) : null,
                    packs: Number(r.packs) || 0,
                    total_kgs: Number(r.total_kgs) || 0,
                    avg_content: Number(r.avg_content) || 0,
                    broker_percentage: Number(r.broker_percentage) || 0,
                    rate: Number(r.rate) || 0,
                    resale: Number(r.resale) || 0,
                    convert_to_hank: Number(r.convert_to_hank) || 0,
                    convert_to_cone: Number(r.convert_to_cone) || 0,
                    assessable_value: Number(r.assessable_value) || 0,
                    charity_amt: Number(r.charity_amt) || 0,
                    vat_per: Number(r.vat_per) || 0,
                    vat_amt: Number(r.vat_amt) || 0,
                    cenvat_per: Number(r.cenvat_per) || 0,
                    cenvat_amt: Number(r.cenvat_amt) || 0,
                    duty_per: Number(r.duty_per) || 0,
                    duty_amt: Number(r.duty_amt) || 0,
                    cess_per: Number(r.cess_per) || 0,
                    cess_amt: Number(r.cess_amt) || 0,
                    hcess_per: Number(r.hcess_per) || 0,
                    hcess_amt: Number(r.hcess_amt) || 0,
                    gst_per: Number(r.gst_per) || 0,
                    gst_amt: Number(r.gst_amt) || 0,
                    sgst_per: Number(r.sgst_per) || 0,
                    sgst_amt: Number(r.sgst_amt) || 0,
                    cgst_per: Number(r.cgst_per) || 0,
                    cgst_amt: Number(r.cgst_amt) || 0,
                    igst_per: Number(r.igst_per) || 0,
                    igst_amt: Number(r.igst_amt) || 0,
                    tcs_per: Number(r.tcs_per) || 0,
                    tcs_amt: Number(r.tcs_amt) || 0,
                    discount_percentage: Number(r.discount_percentage) || 0,
                    discount_amt: Number(r.discount_amt) || 0,
                    other_amt: Number(r.other_amt) || 0,
                    freight_amt: Number(r.freight_amt) || 0,
                    sub_total: Number(r.sub_total) || 0,
                    rounded_off: Number(r.rounded_off) || 0,
                    final_value: Number(r.final_value) || 0
                }))
            };

            if (formData.id) {
                await transactionsAPI.depotSales.update(formData.id, payload);
            } else {
                await transactionsAPI.depotSales.create(payload);
            }

            await init();
            setIsModalOpen(false);
        } catch (e) {
            console.error("Save Error: " + e.message);
        } finally {
            setSubmitLoading(false);
        }
    };
    const filteredHistory = useMemo(() => {
        const history = Array.isArray(listData.history) ? listData.history : [];
        const term = searchValue.toLowerCase().trim();
        return history
            .filter(item => (item.DepotSalesDetails || []).some(d => String(d.order_type).toLowerCase() !== "transfer"))
            .filter(item => {
                let fieldValue = '';
                if (searchField === 'invoice_no') fieldValue = String(item.invoice_no);
                if (searchField === 'depot') fieldValue = item.Depot?.account_name || '';
                if (searchField === 'party') fieldValue = item.Party?.account_name || '';
                const value = fieldValue.toLowerCase();
                return searchCondition === 'Equal' ? value === term : value.includes(term);
            })
            .sort((a, b) => {
                const da = a.date ? new Date(a.date).getTime() : 0;
                const db = b.date ? new Date(b.date).getTime() : 0;
                // latest first; fallback to id desc
                if (db !== da) return db - da;
                return (b.id || 0) - (a.id || 0);
            });
    }, [listData.history, searchValue, searchField, searchCondition]);

    useEffect(() => {
        setPage(1);
    }, [searchValue, searchField, searchCondition]);

    const totalPages = Math.max(1, Math.ceil(filteredHistory.length / pageSize));
    const pagedHistory = useMemo(() => {
        const safePage = Math.min(page, totalPages);
        const start = (safePage - 1) * pageSize;
        return filteredHistory.slice(start, start + pageSize);
    }, [filteredHistory, page, pageSize, totalPages]);

    return (
        <div className="min-h-screen bg-slate-100 p-6 font-sans">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                    <Warehouse className="text-blue-600" /> Depot Sales Registry
                </h1>
                <button
                    onClick={() => {
                        setFormData({ ...emptyInvoice, invoice_no: (listData.history.length + 1).toString(), header_locked: false });
                        setGridRows([]); setIsModalOpen(true);
                    }}
                    className="bg-blue-600 text-white px-5 py-2 rounded-lg font-bold uppercase text-xs flex items-center gap-2 shadow-md hover:bg-blue-700"
                >
                    <Plus size={16} /> New Depot Invoice
                </button>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm mb-6 flex gap-4 items-end">
                <div className="flex-1">
                    <label className="text-[9px] font-black text-slate-500 uppercase block mb-1">Search Field</label>
                    <select value={searchField} onChange={e => setSearchField(e.target.value)} className="w-full border border-slate-300 p-2 text-xs font-bold rounded">
                        <option value="invoice_no">Invoice No</option>
                        <option value="depot">Depot</option>
                        <option value="party">Party</option>
                    </select>
                </div>
                <div className="flex-1">
                    <label className="text-[9px] font-black text-slate-500 uppercase block mb-1">Value</label>
                    <input value={searchValue} onChange={e => setSearchValue(e.target.value)} className="w-full border border-slate-300 p-2 text-xs font-bold rounded" placeholder="Search..." />
                </div>
                <div className="bg-blue-50 text-blue-700 border border-blue-200 px-6 py-2 rounded text-xs font-bold">{filteredHistory.length} Matches</div>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="flex flex-col">
                    <table className="w-full text-left">
                        <thead className="bg-slate-900 text-white text-[10px] uppercase font-bold tracking-wider">
                            <tr><th className="p-3">Inv #</th><th className="p-3">Date</th><th className="p-3">Depot</th><th className="p-3">Party</th><th className="p-3 text-right">Net Value</th></tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-sm">

                            {pagedHistory.map(item => (
                                <tr key={item.id} className="hover:bg-blue-50 cursor-pointer" onClick={async () => {

                                    try {
                                        setSubmitLoading(true);
                                        const data = await transactionsAPI.depotSales.getOne(item.id);
                                        const full = data.data.data;
                                        if (!full) return;

                                        const formatted = {
                                            ...full,
                                            removal_time: full.removal_time
                                                ? String(full.removal_time).replace(' ', 'T').slice(0, 16)
                                                : '',
                                            addr1: full.addr1 || full.Party?.addr1 || '',
                                            addr2: full.addr2 || full.Party?.addr2 || '',
                                            addr3: full.addr3 || full.Party?.addr3 || ''
                                        };

                                        setFormData(formatted);
                                        const rows = full.DepotSalesDetails || [];
                                        const recalculated = runCalculations(rows, full.invoice_type_id, full.sales_type);
                                        setGridRows(recalculated);
                                        setIsModalOpen(true);
                                    } catch (err) {
                                        console.error("Error loading depot sales invoice:", err);
                                        alert("Failed to load invoice details");
                                    } finally {
                                        setSubmitLoading(false);
                                    }
                                }}>
                                    <td className="p-3 font-bold text-blue-600 font-mono">{item.invoice_no}</td>
                                    <td className="p-3 text-slate-500 font-sans">{item.date}</td>
                                    <td className="p-3 uppercase text-xs font-semibold">{item.Depot?.account_name}</td>
                                    <td className="p-3 uppercase font-bold text-xs">{item.Party?.account_name}</td>
                                    <td className="p-3 text-right font-black font-mono">₹{parseFloat(item.final_invoice_value).toLocaleString()}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* 🟢 START: PAGINATION CONTROLS */}
            <div className="flex justify-between items-center mt-4 p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
                <div className="flex items-center gap-4">
                    <span className="text-xs font-bold text-slate-600">
                        Page {page} of {totalPages}
                    </span>
                    <select
                        value={pageSize}
                        onChange={e => {
                            setPageSize(Number(e.target.value));
                            setPage(1); // Reset to first page on page size change
                        }}
                        className="border border-slate-300 p-1 text-xs font-bold rounded"
                    >
                        <option value={10}>10 per page</option>
                        <option value={20}>20 per page</option>
                        <option value={50}>50 per page</option>
                        <option value={100}>100 per page</option>
                    </select>
                </div>


                <div className="flex gap-2">
                    <button
                        onClick={() => setPage(prev => Math.max(prev - 1, 1))}
                        disabled={page === 1}
                        className="px-4 py-2 text-xs font-bold text-white bg-blue-600 rounded disabled:bg-slate-300 disabled:cursor-not-allowed hover:bg-blue-700 transition-colors"
                    >
                        Previous
                    </button>
                    <button
                        onClick={() => setPage(prev => Math.min(prev + 1, totalPages))}
                        disabled={page === totalPages}
                        className="px-4 py-2 text-xs font-bold text-white bg-blue-600 rounded disabled:bg-slate-300 disabled:cursor-not-allowed hover:bg-blue-700 transition-colors"
                    >
                        Next
                    </button>
                </div>
            </div>
            {/* 🟢 END: PAGINATION CONTROLS */}


            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4">
                    <div className="bg-[#D9E5F7] rounded-lg shadow-2xl w-full max-w-[1250px] flex flex-col overflow-hidden border border-slate-400 h-[98vh]">
                        <div className="bg-[#FCD166] p-1.5 border-b border-slate-400 flex justify-between items-center">
                            <span className="text-[13px] font-bold text-slate-700 ml-2 flex items-center gap-2"><Layers size={14} /> Depot Sales Engine</span>
                            <button onClick={() => setIsModalOpen(false)} className="bg-red-500 text-white px-2 rounded font-bold">×</button>
                        </div>
                        <div className="flex bg-[#D9E5F7] pt-2 px-4 gap-1">
                            {['head', 'detail'].map(t => (
                                <button key={t} onClick={() => setActiveTab(t)} className={`px-6 py-1 text-[11px] font-bold border border-b-0 rounded-t-md ${activeTab === t ? 'bg-white text-blue-700 border-slate-400' : 'bg-[#EBF2FA] text-slate-500 border-slate-300'}`}>{t.toUpperCase()}</button>
                            ))}
                        </div>
                        <div className="flex-1 bg-white mx-4 mb-4 border border-slate-400 p-5 overflow-hidden flex flex-col">
                            {activeTab === 'head' ? (
                                <div className="grid grid-cols-12 gap-6 h-full overflow-y-auto">
                                    <div className="col-span-8 space-y-2">
                                        <div className="grid grid-cols-2 gap-4">
                                            <RowInput label="Invoice No" value={formData.invoice_no} readOnly color="bg-slate-50" />
                                            <RowInput label="Date" type="date" value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} />
                                        </div>
                                        <RowSelect
                                            label="Sales Type"
                                            value={formData.sales_type}
                                            options={[
                                                { value: 'GST SALES', label: 'GST SALES' },
                                                { value: 'DEPOT SALES', label: 'DEPOT SALES' },
                                                { value: 'DIRECT SALES', label: 'DIRECT SALES' }
                                            ]}
                                            onChange={e => setFormData({
                                                ...formData,
                                                sales_type: e.target.value,
                                                invoice_type_id: '' // 🟢 Clear selected ID to prevent invalid mapping
                                            })}
                                        />
                                        <RowSelect label="Invoice Type" value={formData.invoice_type_id} options={filteredInvoiceTypes.map(t => ({ value: t.id, label: t.type_name }))} onChange={e => setFormData({ ...formData, invoice_type_id: e.target.value })} />
                                        <RowSelect label="Depot Name" value={formData.depot_id} options={listData.depots.map(d => ({ value: d.id, label: d.account_name }))} onChange={e => setFormData({ ...formData, depot_id: e.target.value })} />
                                        <RowSelect label="Party Name" value={formData.party_id} disabled={formData.header_locked} options={listData.parties.map(p => ({ value: p.id, label: p.account_name }))}
                                            onChange={e => {
                                                const partyId = parseInt(e.target.value);
                                                const acc = listData.parties.find(a => a.id === partyId);
                                                console.log("Selected Party:", acc);
                                                if (!acc) return;
                                                setFormData(prev => ({
                                                    ...prev,
                                                    party_id: partyId,
                                                    addr1: acc.addr1 ?? '',
                                                    addr2: acc.addr2 ?? '',
                                                    addr3: acc.addr3 ?? ''
                                                }));
                                            }}
                                        />

                                        <RowInput label="Address 1" value={formData.addr1} readOnly={formData.header_locked} onChange={e => setFormData({ ...formData, addr1: e.target.value })} />
                                        <RowInput label="Address 2" value={formData.addr2} readOnly={formData.header_locked} onChange={e => setFormData({ ...formData, addr2: e.target.value })} />
                                        <RowInput label="Address 3" value={formData.addr3} readOnly={formData.header_locked} onChange={e => setFormData({ ...formData, addr3: e.target.value })} />
                                        <div className="grid grid-cols-3 gap-2">
                                            <RowInput label="Credit Days" type="number" value={formData.credit_days} onChange={e => setFormData({ ...formData, credit_days: e.target.value })} />
                                            <RowInput label="Interest %" type="number" value={formData.interest_pct} onChange={e => setFormData({ ...formData, interest_pct: e.target.value })} />
                                            {/* Pay Mode dropdown exists below */}
                                            <div />
                                        </div>

                                        <RowSelect label="Agent Name" value={formData.broker_id} disabled={formData.header_locked} options={listData.brokers.map(b => ({ value: b.id, label: b.broker_name }))} onChange={e => setFormData({ ...formData, broker_id: e.target.value })} />
                                        <div className="grid grid-cols-2 gap-4 pt-2 border-t">

                                            <RowSelect
                                                label="Transport"
                                                value={formData.transport_id}
                                                options={listData.transports.map(t => ({
                                                    value: t.id,
                                                    label: t.transport_name
                                                }))}
                                                onChange={e => setFormData({ ...formData, transport_id: e.target.value })}
                                            />

                                            <RowInput
                                                label="Vehicle No"
                                                value={formData.vehicle_no}
                                                onChange={e => setFormData({ ...formData, vehicle_no: e.target.value })}
                                            />

                                            <RowInput
                                                label="LR No"
                                                value={formData.lr_no}
                                                onChange={e => setFormData({ ...formData, lr_no: e.target.value })}
                                            />

                                            <RowInput
                                                label="Country"
                                                value={formData.country}
                                                onChange={e => setFormData({ ...formData, country: e.target.value })}
                                            />

                                            <RowInput
                                                label="LR Date"
                                                type="date"
                                                value={formData.lr_date}
                                                onChange={e => setFormData({ ...formData, lr_date: e.target.value })}
                                            />

                                            <RowInput
                                                label="ARE No"
                                                value={formData.are_no}
                                                onChange={e => setFormData({ ...formData, are_no: e.target.value })}
                                            />

                                            <RowInput
                                                label="Removal Time"
                                                type="datetime-local"
                                                value={formData.removal_time || ""}
                                                onChange={e =>
                                                    setFormData({ ...formData, removal_time: e.target.value })
                                                }
                                            />
                                            <RowSelect
                                                label="Pay Mode"
                                                value={formData.pay_mode}
                                                options={[
                                                    { value: 'IMMEDIATE', label: 'IMMEDIATE' },
                                                    { value: 'CREDIT', label: 'CREDIT' }
                                                ]}
                                                onChange={e => setFormData({ ...formData, pay_mode: e.target.value })}
                                            />

                                            <RowInput
                                                label="Form JJ"
                                                value={formData.form_jj}
                                                onChange={e => setFormData({ ...formData, form_jj: e.target.value })}
                                            />

                                            <RowInput
                                                label="Remarks"
                                                value={formData.remarks}
                                                onChange={e => setFormData({ ...formData, remarks: e.target.value })}
                                            />

                                        </div>
                                    </div>
                                    <div className="col-span-4 bg-slate-50 border border-slate-300 p-4 rounded flex flex-col gap-1 shadow-inner font-black overflow-y-auto">
                                        <h3 className="text-[10px] text-blue-800 mb-1 border-b pb-1 uppercase tracking-tighter font-black">Aggregate Value</h3>

                                        <TotalRow label="Assessable Value" value={formData.total_assessable} />
                                        <TotalRow label="Charity" value={formData.total_charity} />

                                        {/* GST Group */}
                                        <div className="bg-blue-50/30 p-0.5 rounded border border-blue-100 my-0.5">
                                            <TotalRow label="GST (Gen)" value={formData.total_gst} />
                                            <TotalRow label="SGST Total" value={formData.total_sgst} />
                                            <TotalRow label="CGST Total" value={formData.total_cgst} />
                                            <TotalRow label="IGST Total" value={formData.total_igst} />
                                        </div>
                                        {/* Traditional Taxes from Model */}
                                        <TotalRow label="VAT Tax" value={formData.total_vat} />
                                        <TotalRow label="CENVAT Tax" value={formData.total_cenvat} />
                                        <TotalRow label="Duty Amount" value={formData.total_duty} />
                                        <TotalRow label="CESS Total" value={formData.total_cess} />
                                        <TotalRow label="H.S. Cess" value={formData.total_hr_sec_cess} />
                                        <TotalRow label="TCS Amount" value={formData.total_tcs} color="text-amber-700" />
                                        {/* Deductions & Additions */}
                                        <TotalRow label="Discount (-)" value={formData.total_discount} color="text-red-600" />
                                        <TotalRow label="Other Amt (+)" value={formData.total_other} />
                                        <TotalRow label="PF Amount" value={formData.pf_amount} />
                                        <TotalRow label="Freight" value={formData.freight} />

                                        <div className="mt-auto pt-4 border-t-2 border-slate-400 space-y-1">
                                            <TotalRow label="Sub Total" value={formData.sub_total} />
                                            <TotalRow label="Round Off" value={formData.round_off} />
                                            <div className="flex justify-between items-center py-2 px-2 bg-white border border-slate-400 rounded shadow-sm mt-1">
                                                <span className="text-[11px] uppercase font-black">Final Invoice Value</span>
                                                <span className="text-xl font-mono text-blue-700 font-black">₹ {num(formData.final_invoice_value).toLocaleString()}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-4 h-full flex flex-col overflow-hidden">
                                    <div className="bg-[#EBF2FA] p-3 border border-slate-300 flex items-center justify-between rounded shadow-sm">
                                        <div className="flex items-center gap-4">
                                            <span className="text-[10px] font-black uppercase text-blue-700">Sync Mill Order:</span>
                                            <select onChange={handleOrderSync} className="border border-slate-300 text-[11px] p-1 w-72 font-bold rounded">
                                                <option value="">-- Choose Order --</option>
                                                {listData.orders.map(o => <option key={o.id} value={`WITH|${o.order_no}`}>{o.order_no}</option>)}
                                            </select>
                                        </div>
                                    </div>
                                    <div className="flex-1 border border-slate-300 overflow-x-auto bg-slate-50 shadow-inner rounded">
                                        {/* ... inside the Detail tab section ... */}
                                        <div className="flex-1 border border-slate-300 overflow-x-auto bg-slate-50 shadow-inner rounded">
                                            <table className="min-w-[8000px] text-[10px] border-collapse bg-white">
                                                <thead className="bg-slate-800 text-white sticky top-0 z-10 font-bold uppercase">
                                                    {/* Row 1: Main Categories */}
                                                    <tr>
                                                        <th className="p-3 border-r w-32" rowSpan="2">Order No</th>
                                                        <th className="p-3 border-r w-80" rowSpan="2">Product Description</th>
                                                        <th className="p-3 border-r w-32" rowSpan="2">Broker</th>
                                                        <th className="p-3 border-r w-24" rowSpan="2">Packs</th>
                                                        <th className="p-3 border-r w-32" rowSpan="2">Avg Content</th>
                                                        <th className="p-3 border-r w-32 bg-blue-900" rowSpan="2">Total Kgs</th>
                                                        <th className="p-3 border-r w-24" rowSpan="2">Rate</th>
                                                        <th className="p-3 border-r w-40 bg-blue-700 font-black" rowSpan="2">Assess [A]</th>
                                                        <th className="p-3 border-r w-32" rowSpan="2">Charity</th>

                                                        {/* 10 Tax Groups */}
                                                        <th colSpan="2" className="border-r text-center bg-slate-700">GST</th>
                                                        <th colSpan="2" className="border-r text-center bg-slate-700">SGST</th>
                                                        <th colSpan="2" className="border-r text-center bg-slate-700">CGST</th>
                                                        <th colSpan="2" className="border-r text-center bg-slate-700">IGST</th>
                                                        <th colSpan="2" className="border-r text-center bg-slate-700">VAT</th>
                                                        <th colSpan="2" className="border-r text-center bg-slate-700">CENVAT</th>
                                                        <th colSpan="2" className="border-r text-center bg-slate-700">DUTY</th>
                                                        <th colSpan="2" className="border-r text-center bg-slate-700">CESS</th>
                                                        <th colSpan="2" className="border-r text-center bg-slate-700">H.CESS</th>
                                                        <th colSpan="2" className="border-r text-center bg-slate-700">TCS</th>
                                                        <th colSpan="2" className="border-r text-center bg-rose-900">Discount</th>

                                                        <th className="p-3 border-r w-32" rowSpan="2">Other</th>
                                                        <th className="p-3 border-r w-32" rowSpan="2">Freight</th>
                                                        <th className="p-3 border-r w-80" rowSpan="2">ID Mark</th>
                                                        <th className="p-3 w-12" rowSpan="2"></th>
                                                    </tr>
                                                    {/* Row 2: Sub-headers - UPDATED TO 11 PAIRS */}
                                                    <tr className="bg-slate-900 text-[9px]">
                                                        {[...Array(11)].map((_, i) => (
                                                            <React.Fragment key={i}>
                                                                <th className="border-r p-1 text-center">%</th>
                                                                <th className="border-r p-1 text-center">Amt</th>
                                                            </React.Fragment>
                                                        ))}
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-200 font-black">
                                                    {gridRows.map((r, i) => (
                                                        <tr key={i} className="hover:bg-blue-50">
                                                            <td className="p-2 border-r text-blue-600 font-mono">{r.order_no}</td>
                                                            <td className="p-2 border-r uppercase">{r.product_description}</td>
                                                            <td className="p-1 border-r"><input className="w-full text-center outline-none border-none" value={r.broker_code} onChange={e => updateGrid(i, 'broker_code', e.target.value)} /></td>
                                                            <td className="p-1 border-r">
                                                                <input
                                                                    type="number"
                                                                    className="w-full text-center font-black bg-white"
                                                                    value={r.packs}
                                                                    onChange={e => updateGrid(i, 'packs', e.target.value)}
                                                                />
                                                            </td>
                                                            <td className="p-1 border-r">
                                                                <input
                                                                    type="number"
                                                                    step="0.001"
                                                                    className="w-full text-center font-black bg-white"
                                                                    value={r.avg_content}
                                                                    onChange={e => updateGrid(i, 'avg_content', e.target.value)}
                                                                />
                                                            </td>
                                                            <td className="p-2 border-r text-center font-black bg-blue-50 text-blue-800">
                                                                {num(r.total_kgs).toFixed(3)}
                                                            </td>
                                                            <td className="p-1 border-r">
                                                                <input
                                                                    type="number"
                                                                    className="w-full text-center font-black bg-white"
                                                                    value={r.rate}
                                                                    onChange={e => updateGrid(i, 'rate', e.target.value)}
                                                                />
                                                            </td>
                                                            <td className="p-2 border-r text-center bg-blue-100 font-black">₹{num(r.assessable_value).toFixed(2)}</td>
                                                            <td className="p-2 border-r text-center text-orange-600">₹{num(r.charity_amt).toFixed(2)}</td>

                                                            {/* Editable Percentage Pair Cells - Full Sync */}
                                                            {/* Render Pair Cells - Ensure this order matches the header! */}
                                                            {renderPairCell(r, i, 'gst_per', 'gst_amt', true, updateGrid)}
                                                            {renderPairCell(r, i, 'sgst_per', 'sgst_amt', true, updateGrid)}
                                                            {renderPairCell(r, i, 'cgst_per', 'cgst_amt', true, updateGrid)}
                                                            {renderPairCell(r, i, 'igst_per', 'igst_amt', true, updateGrid)}
                                                            {renderPairCell(r, i, 'vat_per', 'vat_amt', true, updateGrid)}
                                                            {renderPairCell(r, i, 'cenvat_per', 'cenvat_amt', true, updateGrid)}
                                                            {renderPairCell(r, i, 'duty_per', 'duty_amt', true, updateGrid)}
                                                            {renderPairCell(r, i, 'cess_per', 'cess_amt', true, updateGrid)}
                                                            {renderPairCell(r, i, 'hcess_per', 'hcess_amt', true, updateGrid)}
                                                            {renderPairCell(r, i, 'tcs_per', 'tcs_amt', true, updateGrid)}
                                                            {renderPairCell(r, i, 'discount_percentage', 'discount_amt', true, updateGrid, "text-rose-600")}

                                                            <td className="p-1 border-r"><input type="number" className="w-full text-center outline-none" value={r.other_amt} onChange={e => updateGrid(i, 'other_amt', e.target.value)} /></td>
                                                            <td className="p-1 border-r"><input type="number" className="w-full text-center outline-none" value={r.freight_amt} onChange={e => updateGrid(i, 'freight_amt', e.target.value)} /></td>
                                                            <td className="p-1 border-r"><input className="w-full text-center outline-none text-[9px] uppercase" value={r.identification_mark} onChange={e => updateGrid(i, 'identification_mark', e.target.value)} /></td>
                                                            <td className="p-2 text-center">
                                                                <button onClick={() => setGridRows(prev => prev.filter((_, idx) => idx !== i))} className="text-red-500 hover:scale-110">
                                                                    <MinusCircle size={20} />
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="bg-[#D9E5F7] p-3 border-t border-slate-400 flex justify-between gap-3 px-6 shadow-inner">
                            <div className="flex gap-2">
                                <button onClick={exportToPDF} disabled={gridRows.length === 0} className="bg-emerald-600 text-white px-6 py-2 text-[11px] font-black rounded flex items-center gap-2 shadow hover:bg-emerald-700">
                                    <FileText size={16} /> DOWNLOAD PDF
                                </button>
                            </div>
                            <button
                                onClick={exportToJSON}
                                disabled={gridRows.length === 0 || !formData.depot_id}
                                className="bg-indigo-600 text-white px-6 py-2 text-[11px] font-black rounded flex items-center gap-2 shadow hover:bg-indigo-700 transition-all active:scale-95 disabled:bg-slate-400 disabled:cursor-not-allowed"
                            >
                                <Calculator size={16} /> JSON EXPORT
                            </button>
                            <div className="flex gap-3">
                                <button onClick={() => setIsModalOpen(false)} className="bg-white border border-slate-400 px-10 py-2 text-[11px] font-black rounded uppercase hover:bg-slate-50">Cancel</button>
                                <button onClick={handleSave} disabled={submitLoading || gridRows.length === 0} className="bg-blue-600 text-white border border-blue-700 px-12 py-2 text-[11px] font-black rounded flex items-center gap-2 hover:bg-blue-700 shadow-md">
                                    <Save size={16} /> {submitLoading ? "SAVING..." : "COMMIT INVOICE"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
// --- ERP HELPERS ---
const RowInput = ({ label, width = "w-full", color = "bg-white", ...props }) => (
    <div className="flex items-center"><label className="w-[140px] text-[10px] font-black text-slate-700 uppercase tracking-tighter">{label}</label><input {...props} className={`border border-slate-300 p-1 px-2 text-[11px] font-bold outline-none rounded-sm shadow-sm ${width} ${color}`} /></div>
);
const RowSelect = ({ label, options, width = "w-full", ...props }) => (
    <div className="flex items-center"><label className="w-[140px] text-[10px] font-black text-slate-700 uppercase tracking-tighter">{label}</label><select {...props} className={`border border-slate-300 p-1 text-[11px] font-bold outline-none rounded-sm shadow-sm ${width}`}><option value="">-- Select --</option>{options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}</select></div>
);
const TotalRow = ({ label, value, isEditable = false, onChange, color = "text-slate-900" }) => (
    <div className="flex justify-between items-center text-[10px] py-0.5 px-2 hover:bg-white rounded transition-colors">
        <span className="font-black text-slate-500 uppercase tracking-tighter">{label}</span>
        <input
            readOnly={!isEditable}
            value={Number(value).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            onChange={e => onChange?.(e.target.value)}
            className={`w-32 border border-slate-300 text-right p-0.5 font-mono text-[11px] font-black outline-none rounded shadow-inner ${color} ${isEditable ? 'bg-white border-blue-400' : 'bg-slate-50'}`}
        />
    </div>
);
const renderPairCell = (row, idx, perKey, amtKey, isEditable, updateGrid, color = "text-blue-600") => (
    <>
        <td className="p-1 border-r text-slate-400"><input type="number" step="0.01" disabled={!isEditable} className={`w-full p-2 text-center font-black border rounded bg-white outline-none focus:border-blue-500 ${color} disabled:bg-slate-100 disabled:border-transparent`} value={row[perKey] || 0} onChange={(e) => updateGrid(idx, perKey, e.target.value)} /></td>
        <td className={`p-2 border-r text-center font-black bg-slate-50 ${color}`}>{num(row[amtKey]).toFixed(2)}</td>
    </>
);

export default DepotSalesInvoice;
