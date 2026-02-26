const { 
    sequelize, TariffSubHead, PackingType, Broker, Transport, 
    Account, Product, OrderHeader, OrderDetail, 
    RG1Production, DespatchEntry, InvoiceHeader, 
    InvoiceDetail, DirectInvoiceHeader, DirectInvoiceDetail,
    DepotReceived, InvoiceType,
    DepotSalesHeader, DepotSalesDetail
} = require('../models');
const { Op } = require('sequelize');

/**
 * CORE MATH ENGINE
 * Evaluates formulas from Invoice Type Master (e.g., "[H]*0.05")
 * Replaces bracketed keywords with actual numeric context values.
 */
const evaluateFormula = (formula, context) => {
    if (!formula || formula === '-' || formula === '') return 0;
    try {
        let processed = formula;

        // 1. Replace defined keywords from context
        Object.keys(context).forEach(key => {
            const regex = new RegExp(`\\[${key}\\]`, 'g');
            const val = context[key] !== undefined ? context[key] : 0;
            processed = processed.replace(regex, val);
        });

        // 2. SAFETY: Remove any remaining [KEYWORDS] that weren't in context 
        // This prevents the "I is not defined" error
        processed = processed.replace(/\[.*?\]/g, '0');

        // 3. Convert legacy "Round(" to JavaScript "Math.round("
        processed = processed.replace(/Round\(/gi, 'Math.round(');

        // 4. Execute math
        // eslint-disable-next-line no-eval
        const result = eval(processed);
        return isNaN(result) || !isFinite(result) ? 0 : parseFloat(result.toFixed(2));
    } catch (err) {
        console.error(`Math Syntax Error in: ${formula} | Error: ${err.message}`);
        return 0;
    }
};
/**
 * HELPER: Clean data for MySQL
 * Converts empty strings to null for ID/Foreign Key fields
 */
const sanitizeData = (data) => {
    const sanitized = { ...data };
    
    // Fields that should be NULL if empty (Foreign Keys/IDs)
    const idFields = [
        'broker_id', 'party_id', 'depot_id', 'product_id', 
        'transport_id', 'packing_type_id', 'tariff_id', 
        'invoice_type_id', 'load_id'
    ];

    // Fields that should be 0 if empty (Numeric/Decimal/Kgs)
    const numericFields = [
        'packs', 'total_kgs', 'avg_content', 'rate', 'broker_percentage',
        'qty', 'bag_wt', 'rate_cr', 'rate_imm', 'rate_per_val',
        'opening_credit', 'opening_debit', 'weight_per_bag', 'freight_charges'
    ];

    idFields.forEach(field => {
        if (sanitized[field] === '' || sanitized[field] === undefined || sanitized[field] === null) {
            sanitized[field] = null;
        }
    });

    numericFields.forEach(field => {
        if (sanitized[field] === '' || sanitized[field] === undefined || sanitized[field] === null) {
            sanitized[field] = 0;
        } else {
            sanitized[field] = parseFloat(sanitized[field]);
        }
    });

    return sanitized;
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
const invoiceCtrl = createMasterController(InvoiceHeader, [
    { model: Account, as: 'Party' }, { model: Transport },
    { model: InvoiceDetail, include: [{ model: Product }] }
]);

invoiceCtrl.create = async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const { Details, invoice_type_id, freight_charges, ...headerData } = req.body;

        const config = await InvoiceType.findByPk(invoice_type_id);
        if (!config) throw new Error("Invoice Type configuration not found.");

        let hTotals = { assess: 0, charity: 0, igst: 0, sgst: 0, cgst: 0, vat: 0, duty: 0, cess: 0, hcess: 0, tcs: 0, sub: 0, net: 0 };
        const processedRows = [];

        for (const item of Details) {
            const product = await Product.findByPk(item.product_id);
            
            // Step 1: Initialize Context with Base Values
            let ctx = {
                "Rate / Kg": parseFloat(item.rate) || 0,
                "Total Kgs": parseFloat(item.total_kgs) || 0,
                "H": (parseFloat(item.rate) || 0) * (parseFloat(item.total_kgs) || 0),
                "CharityRs": product ? parseFloat(product.charity_rs || 0) : 0,
                "Lorryfright": parseFloat(freight_charges || 0),
                "igstper": parseFloat(config.igst_percentage || 0),
                "sgstper": parseFloat(config.sgst_percentage || 0),
                "cgstper": parseFloat(config.cgst_percentage || 0),
                "vatper": parseFloat(config.vat_percentage || 0),
                "dutyper": parseFloat(config.duty_percentage || 0),
                "cessper": parseFloat(config.cess_percentage || 0),
                "hcessper": parseFloat(config.hr_sec_cess_percentage || 0),
                "tcsper": parseFloat(config.tcs_percentage || 0),
                // Initialize calculated placeholders as 0 to prevent "undefined" errors
                "A": 0, "I": 0, "igstamt": 0, "sgstamt": 0, "cgstamt": 0, "Charity": 0,
                "vatamt": 0, "dutyamt": 0, "cessamt": 0, "hcessamt": 0, "tcsamt": 0
            };

            // Step 2: Calculate Taxes first
            ctx["Charity"] = config.charity_checked ? evaluateFormula(config.charity_formula, ctx) : 0;
            ctx["igstamt"] = config.igst_checked ? evaluateFormula(config.igst_formula, ctx) : 0;
            ctx["sgstamt"] = config.gst_checked ? evaluateFormula(config.sgst_formula, ctx) : 0;
            ctx["cgstamt"] = config.gst_checked ? evaluateFormula(config.cgst_formula, ctx) : 0;
            ctx["vatamt"] = config.vat_checked ? evaluateFormula(config.vat_formula, ctx) : 0;
            ctx["dutyamt"] = config.duty_checked ? evaluateFormula(config.duty_formula, ctx) : 0;
            ctx["cessamt"] = config.cess_checked ? evaluateFormula(config.cess_formula, ctx) : 0;
            ctx["hcessamt"] = config.hr_sec_cess_checked ? evaluateFormula(config.hr_sec_cess_formula, ctx) : 0;
            ctx["tcsamt"] = config.tcs_checked ? evaluateFormula(config.tcs_formula, ctx) : 0;

            // Step 3: Calculate Assessable [A] using the taxes above
            ctx["A"] = evaluateFormula(config.assess_formula, ctx);

            // Step 4: Calculate Sub Total [I] using [A] and taxes
            ctx["I"] = evaluateFormula(config.sub_total_formula, ctx);

            // Step 5: Calculate Final Row Value
            const finalRowVal = evaluateFormula(config.total_value_formula, ctx);

            // Accumulate Header Totals
            hTotals.assess += ctx["A"]; 
            hTotals.charity += ctx["Charity"];
            hTotals.igst += ctx["igstamt"];
            hTotals.sgst += ctx["sgstamt"];
            hTotals.cgst += ctx["cgstamt"];
            hTotals.sub += ctx["I"];
            hTotals.net += finalRowVal;

            processedRows.push({
                ...item,
                assessable_value: ctx["A"],
                charity_amt: ctx["Charity"],
                igst_amt: ctx["igstamt"],
                sgst_amt: ctx["sgstamt"],
                cgst_amt: ctx["cgstamt"],
                sub_total: ctx["I"],
                final_value: finalRowVal
            });
        }

        // Create Header (Including all aggregate fields)
        const header = await InvoiceHeader.create({
            ...sanitizeData(headerData),
            invoice_type_id,
            total_assessable: hTotals.assess,
            total_charity: hTotals.charity,
            total_igst: hTotals.igst,
            total_sgst: hTotals.sgst,
            total_cgst: hTotals.cgst,
            sub_total: hTotals.sub,
            net_amount: hTotals.net
        }, { transaction: t });

        // Save Details and Update Product Stock
        // Save Details and Update Product Stock
for (const row of processedRows) {
    // 🔥 SANITIZE THE ROW DATA BEFORE SAVING
    const sanitizedRow = sanitizeData(row);
    
    await InvoiceDetail.create({ 
        ...sanitizedRow, 
        invoice_id: header.id 
    }, { transaction: t });

    await Product.decrement('mill_stock', { 
        by: sanitizedRow.total_kgs, 
        where: { id: sanitizedRow.product_id }, 
        transaction: t 
    });
}

        await t.commit();
        res.status(201).json({ success: true, data: header });
    } catch (err) {
        if (t) await t.rollback();
        console.error("CREATE INVOICE ERROR:", err);
        res.status(500).json({ success: false, error: err.message });
    }
};

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
        const { date, product_id, packing_type_id, weight_per_bag, prev_closing_kgs, production_kgs } = req.body;

        const invSum = await InvoiceDetail.sum('total_kgs', {
            include: [{ model: InvoiceHeader, where: { date }, attributes: [] }],
            where: { product_id }, transaction: t
        }) || 0;

        const directSum = await DirectInvoiceDetail.sum('qty', {
            include: [{ model: DirectInvoiceHeader, as: 'Header', where: { date }, attributes: [] }],
            where: { product_id }, transaction: t
        }) || 0;

        const total_invoiced = parseFloat(invSum) + parseFloat(directSum);
        const closing_stock = parseFloat(prev_closing_kgs || 0) + parseFloat(production_kgs || 0) - total_invoiced;
        const bag_weight = parseFloat(weight_per_bag || 0);

        const prod = await RG1Production.create({
            date, product_id, packing_type_id, weight_per_bag: bag_weight,
            prev_closing_kgs: parseFloat(prev_closing_kgs || 0),
            production_kgs: parseFloat(production_kgs || 0),
            invoice_kgs: total_invoiced,
            stock_kgs: parseFloat(closing_stock.toFixed(3)),
            stock_bags: bag_weight > 0 ? Math.floor(closing_stock / bag_weight) : 0,
            stock_loose_kgs: bag_weight > 0 ? parseFloat((closing_stock % bag_weight).toFixed(3)) : closing_stock
        }, { transaction: t });

        await Product.update({ mill_stock: parseFloat(closing_stock.toFixed(3)) }, { where: { id: product_id }, transaction: t });

        await t.commit();
        res.status(201).json({ success: true, data: prod });
    } catch (err) { if (t) await t.rollback(); res.status(500).json({ error: err.message }); }
};

// --- 4. DEPOT STORAGE LOGIC ---
const getDepotInventory = async (req, res) => {
    try {
        const { depotId } = req.params;
        const products = await Product.findAll({ include: [{ model: TariffSubHead }] });

        const data = await Promise.all(products.map(async (p) => {
            const opening = await DepotReceived.sum('total_kgs', { where: { product_id: p.id, depot_id: depotId, type: 'OPENING' } }) || 0;
            const inward = await InvoiceDetail.sum('total_kgs', {
                include: [{ model: InvoiceHeader, where: { depot_id: depotId, is_depot_inwarded: true }, attributes: [] }],
                where: { product_id: p.id }
            }) || 0;
            const outward = await DepotSalesDetail.sum('total_kgs', {
                include: [{ model: DepotSalesHeader, where: { depot_id: depotId }, attributes: [] }],
                where: { product_id: p.id }
            }) || 0;

            const stock = (parseFloat(opening) + parseFloat(inward)) - parseFloat(outward);
            return { ...p.toJSON(), depot_stock: stock > 0 ? stock : 0 };
        }));
        res.json({ success: true, data });
    } catch (err) { res.status(500).json({ error: err.message }); }
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

        const { Details, ...headerData } = req.body;

        // 1️⃣ Create Header
        const header = await DirectInvoiceHeader.create(
            sanitizeData(headerData),
            { transaction: t }
        );

        console.log("DIRECT HEADER ID:", header.id);

        // 2️⃣ Insert Details
        if (Details && Details.length > 0) {
            const detailRows = Details.map(item => ({
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
        const { Details, ...headerData } = req.body;

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
        if (Details && Details.length > 0) {
            const detailRows = Details.map(item => ({
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
// --- 5. EXPORTS ---
module.exports = {
    account: createMasterController(Account),
    broker: createMasterController(Broker),
    transport: createMasterController(Transport),
    tariff: createMasterController(TariffSubHead),
    packing: createMasterController(PackingType),
    product: createMasterController(Product, [{ model: TariffSubHead }]),
    invoiceType: createMasterController(InvoiceType),
    
    // order: createMasterController(OrderHeader, [
    //     { model: OrderDetail, as: 'OrderDetails', include: [{ model: Product }] },
    //     { model: Account, as: 'Party' }, { model: Broker, as: 'Broker' }
    // ]),
     order: orderCtrl,
    production: productionCtrl,
    invoice: invoiceCtrl,
    
    directInvoice: directInvoiceCtrl,

    depotInward: {
        create: async (req, res) => {
            const t = await sequelize.transaction();
            try {
                const { invoice_no, depot_id } = req.body;
                await InvoiceHeader.update({ is_depot_inwarded: true, depot_id }, { where: { invoice_no }, transaction: t });
                await DepotReceived.create({ date: new Date(), depot_id, invoice_no, type: 'INWARD' }, { transaction: t });
                await t.commit(); res.json({ success: true });
            } catch (err) { if (t) await t.rollback(); res.status(500).json({ error: err.message }); }
        }
    },

    getDepotInventory,
    depotReceived: createMasterController(DepotReceived, [{ model: Account, as: 'Depot' }, { model: Product, as: 'Product' }]),
    
    depotSales: createMasterController(DepotSalesHeader, [
        { model: Account, as: 'Party' }, { model: DepotSalesDetail, include: [{ model: Product }] }
    ]),

    despatch: createMasterController(DespatchEntry, [{ model: Transport }]),
    
    reports: {
        getReportData: async (req, res) => {
            const { start, end } = req.query;
            let where = {};
            if (start && end) where.date = { [Op.between]: [start, end] };
            const data = await InvoiceHeader.findAll({ where, include: [{ model: Account, as: 'Party' }, { model: InvoiceDetail, include: [Product] }] });
            res.json({ success: true, data });
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