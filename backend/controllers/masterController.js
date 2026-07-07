const {
    sequelize, TariffSubHead, PackingType, Broker, Transport,
    Account, Product, OrderHeader, OrderDetail,
    RG1Production, DespatchEntry, InvoiceHeader,
    InvoiceDetail, DirectInvoiceHeader, DirectInvoiceDetail,
    DepotReceived, InvoiceType,
    DepotSalesHeader, DepotSalesDetail
} = require('../models');
const { Op } = require('sequelize');
const num = (v) => isNaN(parseFloat(v)) ? 0 : parseFloat(v);
const { evaluate } = require("mathjs");

const evaluateFormula = (formula, context) => {

    console.log("\n===============================");
    console.log("FORMULA RECEIVED:", formula);
    console.log("CONTEXT VALUES:", context);

    if (!formula || formula === '-' || formula === '') {
        console.log("⚠️ Empty formula -> returning 0");
        return 0;
    }

    try {

        let processed = formula;

        console.log("STEP 1: Replace variables");

        Object.keys(context).forEach(key => {

            const regex = new RegExp(`\\[${key}\\]`, 'gi');
            const value = context[key] ?? 0;

            console.log(`Replacing [${key}] ->`, value);

            processed = processed.replace(regex, value);
        });

        console.log("After variable replacement:", processed);

        console.log("STEP 2: Remove unknown variables");

        processed = processed.replace(/\[.*?\]/g, '0');

        console.log("After removing unknown variables:", processed);

        console.log("STEP 3: Convert ERP functions");

        processed = processed
            .replace(/Round\(/gi, "round(")
            .replace(/Abs\(/gi, "abs(")
            .replace(/Ceil\(/gi, "ceil(")
            .replace(/Floor\(/gi, "floor(");

        console.log("After function conversion:", processed);

        console.log("STEP 4: Evaluate using mathjs");

        const result = evaluate(processed);

        console.log("MathJS raw result:", result);

        // ⭐ Ensure digits is numeric
        const digits = Number(context.round_digits ?? 0);

        console.log("Rounding digits:", digits);

        const final = (!isFinite(result) || isNaN(result))
            ? 0
            : Number(result.toFixed(digits));

        console.log("Final Rounded Result:", final);
        console.log("===============================\n");

        return final;

    } catch (err) {

        console.error("❌ FORMULA ERROR:", formula);
        console.error(err.message);

        return 0;
    }
};
/**
 * HELPER: Clean data for MySQL
 * Converts empty strings to null for ID/Foreign Key fields
 */
const sanitizeData = (data) => {
    const sanitized = { ...data };

    const idFields = [
        'broker_id', 'party_id', 'depot_id', 'product_id',
        'transport_id', 'packing_type_id', 'tariff_id',
        'invoice_type_id', 'load_id'
    ];

   const numericFields = [
        'packs', 'total_kgs', 'avg_content', 'rate', 'broker_percentage', 'broker_percentage2',
        'qty', 'bag_wt', 'rate_cr', 'rate_imm', 'rate_per_val',
        'opening_credit', 'opening_debit', 'weight_per_bag', 'freight_charges',
        'round_off_digits', // Added
        'gst_percentage',   // Added
        'sgst_percentage',  // Added
        'cgst_percentage',  // Added
        'igst_percentage',  // Added
        'charity_value',    // Added
        'vat_percentage',   // Added
        'duty_percentage',  // Added
        'cess_percentage',  // Added
        'hr_sec_cess_percentage', // Added
        'tcs_percentage',   // Added
        'cst_percentage',   // Added
        'cenvat_percentage',
        'gst_per', 'sgst_per', 'cgst_per', 'igst_per',
        'vat_per', 'cenvat_per', 'duty_per', 'cess_per', 'hcess_per', 'tcs_per', 'other_per',
        'gst_amt', 'sgst_amt', 'cgst_amt', 'igst_amt',
        'vat_amt', 'cenvat_amt', 'duty_amt', 'cess_amt', 'hr_sec_cess_amt', 'tcs_amt',
        'assessable_value', 'charity_per_bale', 'charity_amt', 'other_amt', 'freight_amt',
        'resale', 'convert_to_hank', 'convert_to_cone', 'rounded_off', 'sub_total', 'final_value',
        'total_gst', 'total_sgst', 'total_cgst', 'total_igst'
    ];

    // 🔵 NEW ADDRESS FIELDS
    const textFields = [
        'addr1','addr2','addr3',
        'del1','del2','del3'
    ];

    idFields.forEach(field => {
        if (sanitized[field] === '' || sanitized[field] === undefined || sanitized[field] === null) {
            sanitized[field] = null;
        }
    });
    const booleanFields = [
        'is_option_ii', 'account_posting', 'assess_checked',
        'gst_checked', 'sgst_checked', 'cgst_checked', 'igst_checked',
        'charity_checked', 'vat_checked', 'duty_checked', 'cess_checked',
        'hr_sec_cess_checked', 'tcs_checked', 'cst_checked', 'cenvat_checked'
    ];


    numericFields.forEach(field => {
        if (sanitized[field] === '' || sanitized[field] === undefined || sanitized[field] === null) {
            sanitized[field] = 0;
        } else {
            sanitized[field] = parseFloat(sanitized[field]);
        }
    });

    // 🔵 Clean address fields
    textFields.forEach(field => {
        if (sanitized[field] === undefined || sanitized[field] === '') {
            sanitized[field] = null;
        }
    });
    booleanFields.forEach(field => {
        if (sanitized[field] === undefined || sanitized[field] === '' || sanitized[field] === null) {
            sanitized[field] = false; // Ensure it's never an empty string
        } else {
            sanitized[field] = !!sanitized[field]; // Convert to true/false
        }
    });

    return sanitized;
};

const sanitizeInvoiceDetailData = (data = {}) => {
    const sanitized = sanitizeData(data);
    const excludedFields = new Set(['id', 'invoice_id', 'createdAt', 'updatedAt']);

    return Object.keys(InvoiceDetail.rawAttributes).reduce((clean, field) => {
        if (!excludedFields.has(field) && sanitized[field] !== undefined) {
            clean[field] = sanitized[field];
        }
        return clean;
    }, {});
};
// --- 1. GENERIC MASTER FACTORY ---
const createMasterController = (Model, includeModels = []) => ({
    create: async (req, res) => {
        try {
            const data = await Model.create(sanitizeData(req.body));
            res.status(201).json({ success: true, data });
        } catch (err) { res.status(500).json({ success: false, error: err.message }); }
    },
    getAll: async (req, res) => {
        try {
            const data = await Model.findAll({ include: includeModels });
            res.json({ success: true, data });
        } catch (err) { res.status(500).json({ error: err.message }); }
    },
    getOne: async (req, res) => {
        try {
            const data = await Model.findByPk(req.params.id, { include: includeModels });
            if (!data) return res.status(404).json({ success: false, message: "Not found" });
            res.status(200).json({ success: true, data });
        } catch (err) { res.status(500).json({ success: false, error: err.message }); }
    },
    update: async (req, res) => {
        try {
            await Model.update(sanitizeData(req.body), { where: { id: req.params.id } });
            res.status(200).json({ success: true });
        } catch (err) { res.status(500).json({ success: false, error: err.message }); }
    },
    delete: async (req, res) => {
        try {
            await Model.destroy({ where: { id: req.params.id } });
            res.status(200).json({ success: true });
        } catch (err) { res.status(500).json({ success: false, error: err.message }); }
    },
    bulkDelete: async (req, res) => {
        try {
            await Model.destroy({ where: { id: { [Op.in]: req.body.ids } } });
            res.status(200).json({ success: true });
        } catch (err) { res.status(500).json({ success: false, error: err.message }); }
    }
});

// --- 2. CALCULATED INVOICE LOGIC (Standard Sales) ---
// --- 2. CALCULATED INVOICE LOGIC (Standard Sales) ---

// FIRST: Initialize the base controller so it has getAll, update, delete, etc.
const invoiceCtrl = createMasterController(InvoiceHeader, [
    { model: Account, as: 'Party' },
    { model: Broker, as: 'Broker' },
    { model: Transport },
    { model: InvoiceDetail, include: [{ model: Product }] }
]);

const calculateInvoiceBreakdown = ({ Details = [], config, freight_charges, sales_type }) => {
    const gstPercentage = num(config?.gst_percentage);
    const sgstPercentage = num(config?.sgst_percentage);
    const cgstPercentage = num(config?.cgst_percentage);
    const igstPercentage = num(config?.igst_percentage);
    const charityPercentage = num(config?.charity_value);
    const cenvatPercentage = num(config?.cenvat_percentage);
    const dutyPercentage = num(config?.duty_percentage);
    const cessPercentage = num(config?.cess_percentage);
    const hcessPercentage = num(config?.hr_sec_cess_percentage);
    const tcsPercentage = num(config?.tcs_percentage);
    const taxPercentage =
        igstPercentage > 0
            ? igstPercentage
            : (gstPercentage > 0 ? gstPercentage : (sgstPercentage + cgstPercentage));

    const totalBags = Details.reduce((sum, r) => sum + num(r.packs), 0);
    const freightPerBag = totalBags > 0 ? num(freight_charges) / totalBags : 0;
    const divisor = 100 + taxPercentage;
    const isGstSale = String(sales_type || '').trim().toUpperCase() === 'GST SALES';

    const totals = {
        assess: 0,
        charity: 0,
        freight: 0,
        gst: 0,
        sgst: 0,
        cgst: 0,
        igst: 0,
        vat: 0,
        cenvat: 0,
        duty: 0,
        cess: 0,
        hcess: 0,
        tcs: 0,
        other: 0,
        net: 0
    };

    const processedRows = Details.map((item) => {
        const packs = num(item.packs);
        const totalKgs = num(item.total_kgs);
        const rateAfterTax = num(item.rate);
        const rowFreight = packs * freightPerBag;
        const totalInvoiceAmount = 10 * packs * rateAfterTax;
        const charityPerBale = isGstSale
            ? num(item.charity_per_bale || 3)
            : num(item.charity_per_bale || charityPercentage);
        const charity = isGstSale
            ? totalKgs * charityPerBale
            : (totalInvoiceAmount * charityPerBale) / 100;
        const adjustedAmount = totalInvoiceAmount - rowFreight - charity;
        const baseAmount = divisor > 0 ? (adjustedAmount / divisor) * 100 : adjustedAmount;
        const gstAmount = (baseAmount * taxPercentage) / 100;
        const assessableValue = totalInvoiceAmount - rowFreight - charity - gstAmount;
        const rowSgst = sgstPercentage > 0 ? gstAmount / 2 : 0;
        const rowCgst = cgstPercentage > 0 ? gstAmount / 2 : 0;
        const rowIgst = igstPercentage > 0 ? gstAmount : 0;
        const rowGst = gstPercentage > 0 ? gstAmount : 0;
        const rowVatPer = num(item.vat_per);
        const rowCenvatPer = num(item.cenvat_per || cenvatPercentage);
        const rowDutyPer = num(item.duty_per || dutyPercentage);
        const rowCessPer = num(item.cess_per || cessPercentage);
        const rowHcessPer = num(item.hcess_per || hcessPercentage);
        const rowTcsPer = num(item.tcs_per || tcsPercentage);
        const rowOtherAmt = num(item.other_per) > 0
            ? (assessableValue * num(item.other_per)) / 100
            : num(item.other_amt);
        const rowVat = (assessableValue * rowVatPer) / 100;
        const rowCenvat = (assessableValue * rowCenvatPer) / 100;
        const rowDuty = (assessableValue * rowDutyPer) / 100;
        const rowCess = (assessableValue * rowCessPer) / 100;
        const rowHcess = (assessableValue * rowHcessPer) / 100;
        const rowTcs = (totalInvoiceAmount * rowTcsPer) / 100;

        totals.assess += assessableValue;
        totals.charity += charity;
        totals.freight += rowFreight;
        totals.gst += gstAmount;
        totals.sgst += rowSgst;
        totals.cgst += rowCgst;
        totals.igst += rowIgst;
        totals.vat += rowVat;
        totals.cenvat += rowCenvat;
        totals.duty += rowDuty;
        totals.cess += rowCess;
        totals.hcess += rowHcess;
        totals.tcs += rowTcs;
        totals.other += rowOtherAmt;
        totals.net += totalInvoiceAmount;

        return {
            ...sanitizeInvoiceDetailData(item),
            broker_code: item.broker_code || item.broker_code1 || '',
            broker_code1: item.broker_code1 || item.broker_code || '',
            charity_per_bale: charityPerBale,
            charity_amt: charity,
            freight_amt: rowFreight,
            assessable_value: assessableValue,
            gst_per: gstPercentage,
            gst_amt: rowGst,
            sgst_per: sgstPercentage,
            sgst_amt: rowSgst,
            cgst_per: cgstPercentage,
            cgst_amt: rowCgst,
            igst_per: igstPercentage,
            igst_amt: rowIgst,
            vat_per: rowVatPer,
            vat_amt: rowVat,
            cenvat_per: rowCenvatPer,
            cenvat_amt: rowCenvat,
            duty_per: rowDutyPer,
            duty_amt: rowDuty,
            cess_per: rowCessPer,
            cess_amt: rowCess,
            hcess_per: rowHcessPer,
            hr_sec_cess_amt: rowHcess,
            tcs_per: rowTcsPer,
            tcs_amt: rowTcs,
            other_amt: rowOtherAmt,
            final_value: totalInvoiceAmount
        };
    });

    return { processedRows, totals };
};

// SECOND: Overwrite the .create method with the dynamic formula logic
invoiceCtrl.create = async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const { Details, invoice_type_id, freight_charges, sales_type, ...headerData } = req.body;
        const config = await InvoiceType.findByPk(invoice_type_id);
        if (!config) throw new Error("Invoice type not found");

        const { processedRows, totals } = calculateInvoiceBreakdown({
            Details,
            config,
            freight_charges,
            sales_type
        });

        const header = await InvoiceHeader.create({
            ...sanitizeData(headerData),
            sales_type,
            invoice_type_id,
            total_assessable: totals.assess,
            total_charity: totals.charity,
            freight_charges: freight_charges,
            total_gst: totals.gst,
            total_sgst: totals.sgst,
            total_cgst: totals.cgst,
            total_igst: totals.igst,
            total_vat: totals.vat,
            total_cenvat: totals.cenvat,
            total_duty: totals.duty,
            total_cess: totals.cess,
            total_hr_sec_cess: totals.hcess,
            total_tcs: totals.tcs,
            total_other: totals.other,
            sub_total: totals.net,
            round_off: Math.ceil(totals.net) - totals.net,
            net_amount: Math.ceil(totals.net)
        }, { transaction: t });

        for (const row of processedRows) {
            await InvoiceDetail.create({ ...row, invoice_id: header.id }, { transaction: t });
            await Product.decrement('mill_stock', { by: row.total_kgs, where: { id: row.product_id }, transaction: t });
        }

        await t.commit();
        res.status(201).json({ success: true, data: header });
    } catch (err) {
        if (t) await t.rollback();
        console.error("INVOICE CREATE ERROR:", err);
        res.status(500).json({ success: false, error: err.message });
    }
};

invoiceCtrl.update = async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const { id } = req.params;
        const { Details, invoice_type_id, freight_charges, sales_type, ...headerData } = req.body;
        const config = await InvoiceType.findByPk(invoice_type_id, { transaction: t });
        if (!config) throw new Error("Invoice type not found");

        const existingDetails = await InvoiceDetail.findAll({
            where: { invoice_id: id },
            transaction: t
        });

        for (const item of existingDetails) {
            await Product.increment('mill_stock', {
                by: num(item.total_kgs),
                where: { id: item.product_id },
                transaction: t
            });
        }

        await InvoiceDetail.destroy({
            where: { invoice_id: id },
            transaction: t
        });

        const { processedRows, totals } = calculateInvoiceBreakdown({
            Details,
            config,
            freight_charges,
            sales_type
        });

        await InvoiceHeader.update({
            ...sanitizeData(headerData),
            sales_type,
            invoice_type_id,
            total_assessable: totals.assess,
            total_charity: totals.charity,
            freight_charges: freight_charges,
            total_gst: totals.gst,
            total_sgst: totals.sgst,
            total_cgst: totals.cgst,
            total_igst: totals.igst,
            total_vat: totals.vat,
            total_cenvat: totals.cenvat,
            total_duty: totals.duty,
            total_cess: totals.cess,
            total_hr_sec_cess: totals.hcess,
            total_tcs: totals.tcs,
            total_other: totals.other,
            sub_total: totals.net,
            round_off: Math.ceil(totals.net) - totals.net,
            net_amount: Math.ceil(totals.net)
        }, {
            where: { id },
            transaction: t
        });

        for (const row of processedRows) {
            await InvoiceDetail.create({ ...row, invoice_id: id }, { transaction: t });
            await Product.decrement('mill_stock', {
                by: num(row.total_kgs),
                where: { id: row.product_id },
                transaction: t
            });
        }

        await t.commit();
        res.json({ success: true });
    } catch (err) {
        if (t) await t.rollback();
        console.error("INVOICE UPDATE ERROR:", err);
        res.status(500).json({ success: false, error: err.message });
    }
};
// Add these to make sure approve/reject are not undefined
invoiceCtrl.approve = async (req, res) => {
    try {
        await InvoiceHeader.update({ is_approved: true }, { where: { id: req.params.id } });
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

invoiceCtrl.reject = async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const details = await InvoiceDetail.findAll({ where: { invoice_id: req.params.id } });
        for (const item of details) {
            await Product.increment('mill_stock', { by: item.total_kgs, where: { id: item.product_id }, transaction: t });
        }
        await InvoiceHeader.destroy({ where: { id: req.params.id }, transaction: t });
        await t.commit();
        res.json({ success: true });
    } catch (err) { if (t) await t.rollback(); res.status(500).json({ error: err.message }); }
};
// --- 3. RG1 PRODUCTION LOGIC ---
const productionCtrl = createMasterController(RG1Production, [{ model: Product }, { model: PackingType }]);

productionCtrl.create = async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const toNumber = (value, fallback = 0) => {
            if (value === undefined || value === null || value === '') return fallback;
            const parsed = parseFloat(value);
            return Number.isNaN(parsed) ? fallback : parsed;
        };

        // Sanitize all incoming data from the frontend.
        const data = sanitizeData(req.body);

        // The frontend sends pre-calculated and validated values.
        // The backend's main job is to persist them and update the master stock.
        const {
            product_id,
            stock_kgs,
        } = data;

        if (!product_id) {
            throw new Error("Product ID is required to create a production log.");
        }

        // Create the production log entry with the exact values from the form.
        const prod = await RG1Production.create({
            ...data
        }, { transaction: t });

        // The most critical step: Update the product's master stock (`mill_stock`)
        // with the final closing stock (`stock_kgs`) from this entry.
        await Product.update(
            { mill_stock: toNumber(stock_kgs) },
            { where: { id: product_id }, transaction: t }
        );

        await t.commit();
        res.status(201).json({ success: true, data: prod });
    } catch (err) { if (t) await t.rollback(); res.status(500).json({ error: err.message }); }
};

// --- 4. DEPOT STORAGE LOGIC ---
const getDepotInventory = async (req, res) => {
    try {

        const { depotId } = req.params;

        const products = await Product.findAll({
            include: [{ model: TariffSubHead }]
        });

        const data = await Promise.all(products.map(async (p) => {

            // inward stock for that depot
            const inward = await DepotReceived.sum('total_kgs', {
                where: {
                    depot_id: depotId,
                    product_id: p.id,
                    type: 'INWARD'
                }
            }) || 0;

            // sales from that depot
            const outward = await DepotSalesDetail.sum('total_kgs', {
                include: [{
                    model: DepotSalesHeader,
                    attributes: [],
                    required: true,
                    where: { depot_id: depotId }
                }],
                where: { product_id: p.id }
            }) || 0;

            const stock = inward - outward;

            return {
                ...p.toJSON(),
                depot_stock: stock > 0 ? stock : 0
            };

        }));

        res.json({ success: true, data });

    } catch (err) {
        console.error("DEPOT INVENTORY ERROR:", err);
        res.status(500).json({ error: err.message });
    }
};
// --- masterController.js ---

// Define the Order Controller specifically to handle nested details
const orderCtrl = createMasterController(OrderHeader, [
    { model: OrderDetail, as: 'OrderDetails', include: [{ model: Product }] },
    { model: Account, as: 'Party' },
    { model: Broker, as: 'Broker' }
]);

// OVERRIDE CREATE
orderCtrl.create = async (req, res) => {
    const t = await sequelize.transaction();
    try {
        console.log("ORDER BODY:", req.body);

        const { OrderDetails, ...headerData } = req.body;

        // 1️⃣ Create header FIRST
        const header = await OrderHeader.create(
            sanitizeData(headerData),
            { transaction: t }
        );

        console.log("HEADER CREATED ID:", header.id);

        // 2️⃣ Manually insert details
        if (OrderDetails && OrderDetails.length > 0) {
            const detailRows = OrderDetails.map(item => ({
                ...sanitizeData(item),
                order_id: header.id   // 🔥 FORCE FK
            }));

            console.log("DETAIL ROWS:", detailRows);

            await OrderDetail.bulkCreate(detailRows, { transaction: t });
        }

        await t.commit();
        res.status(201).json({ success: true, data: header });

    } catch (err) {
        await t.rollback();
        console.error("ORDER CREATE ERROR:", err);
        res.status(500).json({ success: false, error: err.message });
    }
};
// OVERRIDE UPDATE
orderCtrl.update = async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const { id } = req.params;
        const { OrderDetails, ...headerData } = req.body;

        await OrderHeader.update(
            sanitizeData(headerData),
            { where: { id }, transaction: t }
        );

        await OrderDetail.destroy({
            where: { order_id: id },
            transaction: t
        });

        if (OrderDetails && OrderDetails.length > 0) {
            const detailRows = OrderDetails.map(item => ({
                ...sanitizeData(item),
                order_id: id
            }));

            await OrderDetail.bulkCreate(detailRows, { transaction: t });
        }

        await t.commit();
        res.json({ success: true });

    } catch (err) {
        await t.rollback();
        console.error("ORDER UPDATE ERROR:", err);
        res.status(500).json({ success: false, error: err.message });
    }
};
const directInvoiceCtrl = createMasterController(DirectInvoiceHeader, [
    { model: Account, as: 'Party' },
    {
        model: DirectInvoiceDetail,
        as: 'DirectInvoiceDetails',
        include: [{ model: Product, as: 'Product' }]
    }
]);

// CREATE
directInvoiceCtrl.create = async (req, res) => {
    const t = await sequelize.transaction();
    try {
        console.log("DIRECT BODY:", req.body);

        const { Details, DirectInvoiceDetails, ...headerData } = req.body;
        const detailItems = Array.isArray(Details)
            ? Details
            : (Array.isArray(DirectInvoiceDetails) ? DirectInvoiceDetails : []);

        // 1️⃣ Create Header
        const header = await DirectInvoiceHeader.create(
            sanitizeData(headerData),
            { transaction: t }
        );

        console.log("DIRECT HEADER ID:", header.id);

        // 2️⃣ Insert Details
        if (detailItems.length > 0) {
            const detailRows = detailItems.map(item => ({
                ...sanitizeData(item),
                direct_invoice_id: header.id  // 🔥 VERY IMPORTANT
            }));

            console.log("DIRECT DETAILS:", detailRows);

            await DirectInvoiceDetail.bulkCreate(detailRows, { transaction: t });
        }

        await t.commit();
        res.status(201).json({ success: true, data: header });

    } catch (err) {
        await t.rollback();
        console.error("DIRECT CREATE ERROR:", err);
        res.status(500).json({ success: false, error: err.message });
    }
};

// UPDATE
directInvoiceCtrl.update = async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const { id } = req.params;
        const { Details, DirectInvoiceDetails, ...headerData } = req.body;
        const detailItems = Array.isArray(Details)
            ? Details
            : (Array.isArray(DirectInvoiceDetails) ? DirectInvoiceDetails : []);

        await DirectInvoiceHeader.update(
            sanitizeData(headerData),
            { where: { id }, transaction: t }
        );

        // delete old rows
        await DirectInvoiceDetail.destroy({
            where: { direct_invoice_id: id },
            transaction: t
        });

        // recreate
        if (detailItems.length > 0) {
            const detailRows = detailItems.map(item => ({
                ...sanitizeData(item),
                direct_invoice_id: id
            }));

            await DirectInvoiceDetail.bulkCreate(detailRows, { transaction: t });
        }

        await t.commit();
        res.json({ success: true });

    } catch (err) {
        await t.rollback();
        console.error("DIRECT UPDATE ERROR:", err);
        res.status(500).json({ success: false, error: err.message });
    }
};
// --- DEPOT SALES CONTROLLER OVERRIDE ---
const depotSalesCtrl = createMasterController(DepotSalesHeader, [
    { model: Account, as: 'Party' },
    { model: Account, as: 'Depot' },
    { model: Broker, as: 'Broker' },
    {
        model: DepotSalesDetail,
        as: 'DepotSalesDetails',
        include: [{ model: Product, as: 'Product' }]
    }
]);

// --- DEPOT SALES / TRANSFER CONTROLLER ---
depotSalesCtrl.create = async (req, res) => {
    console.log("=================================");
    console.log("DEPOT SALES CREATE REQUEST BODY");
    console.log("=================================");
    const t = await sequelize.transaction();
    try {
        const { Details, ...headerData } = req.body;
        const isTransfer = headerData.sales_type === 'DEPOT TRANSFER';

        // 1. Create Header
        const header = await DepotSalesHeader.create({
            ...sanitizeData(headerData),
        }, { transaction: t });

        // 2. Insert Details
        if (Details && Details.length > 0) {
            const detailRows = Details.map(item => ({
                ...sanitizeData(item),
                depot_sales_id: header.id
            }));

            await DepotSalesDetail.bulkCreate(detailRows, { transaction: t });

            // 3. Handle Depot Transfer Logic
            if (isTransfer) {
                for (const row of detailRows) {
                    await DepotReceived.create({
                        date: headerData.date || new Date(),
                        depot_id: headerData.party_id, // The receiving depot
                        product_id: row.product_id,
                        invoice_no: header.invoice_no,
                        total_kgs: row.total_kgs,
                        type: 'INWARD',
                        remarks: `TRANSFERRED FROM DEPOT ID: ${headerData.depot_id}`
                    }, { transaction: t });
                }
            }
        }

        await t.commit();
        res.status(201).json({ success: true, data: header });
    } catch (err) {
        if (t) await t.rollback();
        console.error("DEPOT SALES CREATE ERROR:", err);
        res.status(500).json({ success: false, error: err.message });
    }
};
depotSalesCtrl.update = async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const { id } = req.params;
        const { Details, ...headerData } = req.body;

        // 1. Delete old details
        await DepotSalesDetail.destroy({ where: { depot_sales_id: id }, transaction: t });

        // 2. Update Header
        await DepotSalesHeader.update({
            ...sanitizeData(headerData),
        }, { where: { id }, transaction: t });

        // 3. Bulk insert new details
        if (Details && Details.length > 0) {
            const detailRows = Details.map(item => ({
                ...sanitizeData(item),
                depot_sales_id: id
            }));
            await DepotSalesDetail.bulkCreate(detailRows, { transaction: t });
        }

        await t.commit();
        res.json({ success: true });
    } catch (err) {
        if (t) await t.rollback();
        console.error("DEPOT SALES UPDATE ERROR:", err);
        res.status(500).json({ error: err.message });
    }
};
depotSalesCtrl.getAll = async (req, res) => {
    console.log("DEBUG: Received request to fetch Depot Sales...");
    try {
        const data = await DepotSalesHeader.findAll({
            include: [
                { model: Account, as: 'Party' },
                { model: Account, as: 'Depot' },
                {
                    model: DepotSalesDetail,
                    as: 'DepotSalesDetails',
                    include: [{ model: Product, as: 'Product' }]
                }
            ]
        });

        console.log(`DEBUG: Successfully fetched ${data.length} records.`);
        res.json({ success: true, data });
    } catch (err) {
        console.error("❌ CRITICAL ERROR in DepotSales.getAll:");
        console.error("Message:", err.message);

        // This will tell us if a column name is wrong
        if (err.name === 'SequelizeDatabaseError') {
            console.error("SQL Error Code:", err.parent.code);
            console.error("Full SQL Query:", err.sql);
        }

        // This will tell us if an association (Party/Depot) is wrong
        if (err.name === 'SequelizeEagerLoadingError') {
            console.error("Association Error: The 'as' alias likely doesn't match the model file.");
        }

        res.status(500).json({
            success: false,
            error: err.message,
            stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
        });
    }
};
// --- 5. EXPORTS ---
// --- masterController.js (Bottom of file) ---

module.exports = {
    account: createMasterController(Account),
    broker: createMasterController(Broker),
    transport: createMasterController(Transport),
    tariff: createMasterController(TariffSubHead),
    packing: createMasterController(PackingType),
    product: createMasterController(Product, [{ model: TariffSubHead }]),
    invoiceType: createMasterController(InvoiceType),
    order: orderCtrl,
    production: productionCtrl,
    invoice: invoiceCtrl,
    directInvoice: directInvoiceCtrl,

    // Change the key name here to match what masterRoutes.js expects
    depotSales: depotSalesCtrl,

    depotInward: {
        create: async (req, res) => {
            const t = await sequelize.transaction();
            try {

                const { invoice_no, depot_id } = req.body;

                const header = await InvoiceHeader.findOne({
                    where: { invoice_no },
                    include: [{ model: InvoiceDetail }]
                });

                if (!header) throw new Error("Invoice not found");

                for (const item of header.InvoiceDetails) {

                    await DepotReceived.create({
                        date: new Date(),
                        depot_id,
                        invoice_no,
                        product_id: item.product_id,
                        total_kgs: item.total_kgs,
                        type: 'INWARD'
                    }, { transaction: t });

                }

                await InvoiceHeader.update(
                    { is_depot_inwarded: true, depot_id },
                    { where: { invoice_no }, transaction: t }
                );

                await t.commit();

                res.json({ success: true });

            } catch (err) {

                await t.rollback();
                res.status(500).json({ error: err.message });

            }
        }
    },

    getDepotInventory,
    depotReceived: createMasterController(DepotReceived, [{ model: Account, as: 'Depot' }, { model: Product, as: 'Product' }]),
    despatch: createMasterController(DespatchEntry, [{ model: Transport }]),

    reports: {
        getReportData: async (req, res) => {
            try {

                const { reportId } = req.params;
                const { from, to } = req.query;

                let data = [];

                switch (reportId) {

                    // ================================
                    // SALES WITH ORDER
                    // ================================
                    case "orders":

                        data = await OrderHeader.findAll({
                            where: {
                                date: { [Op.between]: [from, to] }
                            },
                            include: [
                                {
                                    model: Account,
                                    as: "Party",
                                    attributes: ["id", "account_name"]
                                },
                                {
                                    model: Broker,
                                    as: "Broker",
                                    attributes: ["id", "broker_name"]
                                },
                                {
                                    model: OrderDetail,
                                    as: "OrderDetails",
                                    include: [
                                        {
                                            model: Product,
                                            attributes: ["id", "product_name"]
                                        }
                                    ]
                                }
                            ],
                            order: [["date", "DESC"]]
                        });

                        break;



                    // ================================
                    // SALES WITHOUT ORDER
                    // ================================
                    case "direct-invoices":

                        data = await DirectInvoiceHeader.findAll({
                            where: {
                                date: { [Op.between]: [from, to] }
                            },
                            attributes: [
                                "id",
                                "order_no",
                                "date",
                                "final_invoice_value"
                            ],
                            include: [
                                {
                                    model: Account,
                                    as: "Party",
                                    attributes: ["account_name"]
                                },
                                {
                                    model: Broker,
                                    as: "Broker",
                                    attributes: ["broker_name"]
                                },
                                {
                                    model: DirectInvoiceDetail,
                                    as: "DirectInvoiceDetails",
                                    attributes: ["qty", "rate_cr", "rate_imm"],
                                    include: [
                                        {
                                            model: Product,
                                            as: "Product",
                                            attributes: ["product_name"]
                                        }
                                    ]
                                }
                            ],
                            order: [["date", "DESC"]]
                        });

                        break;



                    // ================================
                    // PRODUCTION
                    // ================================
                    case "production":

                        data = await RG1Production.findAll({
                            where: {
                                date: { [Op.between]: [from, to] }
                            },
                            include: [
                                {
                                    model: Product,
                                    attributes: ["product_name"]
                                },
                                {
                                    model: PackingType,
                                    attributes: ["packing_type"]
                                }
                            ],
                            order: [["date", "DESC"]]
                        });

                        break;



                    // ================================
                    // DESPATCH
                    // IMPORTANT: uses load_date
                    // ================================
                    case "despatch":

                        data = await DespatchEntry.findAll({
                            where: {
                                load_date: { [Op.between]: [from, to] }
                            },
                            attributes: [
                                "id",
                                "load_no",
                                "load_date",
                                "vehicle_no",
                                "freight",
                                "no_of_bags"
                            ],
                            include: [
                                {
                                    model: Transport,
                                    attributes: ["transport_name"]
                                }
                            ],
                            order: [["load_date", "DESC"]]
                        });

                        break;



                    // ================================
                    // INVOICE REGISTER
                    // ================================
                    case "invoices":

                        data = await InvoiceHeader.findAll({
                            where: {
                                date: { [Op.between]: [from, to] }
                            },
                            attributes: [
                                "id",
                                "invoice_no",
                                "date",
                                "net_amount"
                            ],
                            include: [
                                {
                                    model: Account,
                                    as: "Party",
                                    attributes: ["account_name"]
                                },
                                {
                                    model: Transport,
                                    attributes: ["transport_name"]
                                },
                                {
                                    model: InvoiceDetail,
                                    attributes: [
                                        "total_kgs",
                                        "rate",
                                        "final_value"
                                    ],
                                    include: [
                                        {
                                            model: Product,
                                            attributes: ["product_name"]
                                        }
                                    ]
                                }
                            ],
                            order: [["date", "DESC"]]
                        });

                        break;
                    // ================================
                    // DEPOT SALES
                    // ================================
                    case "depot-sales":

                        data = await DepotSalesHeader.findAll({
                            where: {
                                date: { [Op.between]: [from, to] }
                            },
                            attributes: [
                                "id",
                                "invoice_no",
                                "date",
                                "final_invoice_value"
                            ],
                            include: [
                                {
                                    model: Account,
                                    as: "Party",
                                    attributes: ["account_name"]
                                },
                                {
                                    model: Account,
                                    as: "Depot",
                                    attributes: ["account_name"]
                                },
                                {
                                    model: Transport,
                                    attributes: ["transport_name"]
                                },
                                {
                                    model: DepotSalesDetail,
                                    as: "DepotSalesDetails",
                                    attributes: [
                                        "total_kgs",
                                        "rate_per",
                                        "final_value"
                                    ],
                                    include: [
                                        {
                                            model: Product,
                                            as: "Product",
                                            attributes: ["product_name"]
                                        }
                                    ]
                                }
                            ],
                            order: [["date", "DESC"]]
                        });

                        break;



                    // ================================
                    // DEPOT RECEIVED
                    // ================================
                    case "depot-received":

                        data = await DepotReceived.findAll({
                            where: {
                                date: { [Op.between]: [from, to] }
                            },
                            attributes: [
                                "invoice_no",
                                "date",
                                "total_kgs",
                                "total_bags"
                            ],
                            include: [
                                {
                                    model: Account,
                                    as: "Depot",
                                    attributes: ["account_name"]
                                },
                                {
                                    model: Product,
                                    as: "Product",
                                    attributes: ["product_name"]
                                }
                            ],
                            order: [["date", "DESC"]]
                        });

                        break;


                    default:

                        return res.status(400).json({
                            success: false,
                            message: "Invalid report type"
                        });

                }

                res.json({
                    success: true,
                    data
                });

            } catch (err) {

                console.error("REPORT ERROR:", err);

                res.status(500).json({
                    success: false,
                    error: err.message
                });

            }
        },
        getInvoicePrintData: async (req, res) => {
            const data = await InvoiceHeader.findOne({
                where: { invoice_no: req.params.invoiceNo },
                include: [{ model: Account, as: 'Party' }, { model: Transport }, { model: InvoiceDetail, include: [{ model: Product, include: [TariffSubHead] }] }]
            });
            res.json({ success: true, data });
        }
    }
};
