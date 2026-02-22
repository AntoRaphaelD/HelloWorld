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
 * HELPER: Sanitize empty strings to null for ID fields
 * Prevents "Incorrect integer value: ''" errors in MySQL
 */
const sanitizeData = (data) => {
    const sanitized = { ...data };
    const numericFields = [
        'broker_id', 'party_id', 'depot_id', 'product_id', 
        'transport_id', 'packing_type_id', 'tariff_id'
    ];
    
    numericFields.forEach(field => {
        if (sanitized[field] === '' || sanitized[field] === undefined) {
            sanitized[field] = null;
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
        } catch (err) { 
            console.error(`[Master Create Error] ${Model.name}:`, err.message);
            res.status(500).json({ success: false, error: err.message }); 
        }
    },
    getAll: async (req, res) => {
        try {
            console.log(`[Database] Fetching Registry: ${Model.name}`);
            const data = await Model.findAll({ include: includeModels });
            res.json({ success: true, data });
        } catch (err) {
            console.error(`[Database Error] ${Model.name} getAll:`, err);
            res.status(500).json({ error: err.message });
        }
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
            const { ids } = req.body;
            if (!ids || !Array.isArray(ids) || ids.length === 0) return res.status(400).json({ success: false, message: "No IDs" });
            await Model.destroy({ where: { id: { [Op.in]: ids } } });
            res.status(200).json({ success: true });
        } catch (err) { res.status(500).json({ success: false, error: err.message }); }
    }
});

// --- 2. MILL ORDER LOGIC ---
const orderCtrl = createMasterController(OrderHeader, [
    { model: OrderDetail, as: 'OrderDetails', include: [{ model: Product }] },
    { model: Account, as: 'Party' },
    { model: Broker, as: 'Broker' }
]);

orderCtrl.create = async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const { Details, ...header } = req.body;
        const order = await OrderHeader.create(sanitizeData(header), { transaction: t });
        if (Details && Details.length > 0) {
            await OrderDetail.bulkCreate(Details.map(d => ({ ...d, order_id: order.id })), { transaction: t });
        }
        await t.commit();
        res.status(201).json({ success: true, data: order });
    } catch (err) { 
        if (t) await t.rollback(); 
        console.error("[Order Create Error]:", err.message);
        res.status(500).json({ error: err.message }); 
    }
};

// --- 3. RG1 PRODUCTION LOGIC (Mill Stock) ---
const productionCtrl = createMasterController(RG1Production, [{ model: Product }, { model: PackingType }]);

productionCtrl.create = async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const { date, product_id, packing_type_id, weight_per_bag, prev_closing_kgs, production_kgs } = req.body;

        if (!product_id || !packing_type_id) {
            throw new Error("Product and Packing Type are required for production entries.");
        }

        // 1. Sum Invoiced Qty from standard sales (InvoiceDetail belongsTo InvoiceHeader)
        const invoiceSum = await InvoiceDetail.sum('total_kgs', {
            include: [{ model: InvoiceHeader, where: { date }, attributes: [] }],
            where: { product_id }, 
            transaction: t
        }) || 0;

        // 2. Sum Invoiced Qty from direct sales (DirectInvoiceDetail belongsTo DirectInvoiceHeader as 'Header')
        const directInvoiceSum = await DirectInvoiceDetail.sum('qty', {
            include: [{ model: DirectInvoiceHeader, as: 'Header', where: { date }, attributes: [] }],
            where: { product_id }, 
            transaction: t
        }) || 0;

        const total_invoiced = parseFloat(invoiceSum) + parseFloat(directInvoiceSum);
        const closing_stock = parseFloat(prev_closing_kgs || 0) + parseFloat(production_kgs || 0) - total_invoiced;
        const bag_weight = parseFloat(weight_per_bag || 0);

        // 3. Create RG1 Entry
        const prod = await RG1Production.create({
            date,
            product_id,
            packing_type_id,
            weight_per_bag: bag_weight,
            prev_closing_kgs: parseFloat(prev_closing_kgs || 0),
            production_kgs: parseFloat(production_kgs || 0),
            invoice_kgs: total_invoiced,
            stock_kgs: parseFloat(closing_stock.toFixed(3)),
            stock_bags: bag_weight > 0 ? Math.floor(closing_stock / bag_weight) : 0,
            stock_loose_kgs: bag_weight > 0 ? parseFloat((closing_stock % bag_weight).toFixed(3)) : closing_stock
        }, { transaction: t });

        // 4. Sync Master Product Mill Stock
        await Product.update(
            { mill_stock: parseFloat(closing_stock.toFixed(3)) },
            { where: { id: product_id }, transaction: t }
        );

        await t.commit();
        res.status(201).json({ success: true, data: prod });
    } catch (err) {
        if (t) await t.rollback();
        console.error("[Production Error]:", err.message);
        res.status(500).json({ success: false, error: err.message });
    }
};

// --- 4. MILL SALES (STANDARD) ---
const invoiceCtrl = createMasterController(InvoiceHeader, [
    { model: Account, as: 'Party' }, { model: Transport },
    { model: InvoiceDetail, include: [{ model: Product }] }
]);

invoiceCtrl.create = async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const { Details, ...header } = req.body;
        const inv = await InvoiceHeader.create(sanitizeData(header), { transaction: t });
        for (const item of (Details || [])) {
            await InvoiceDetail.create({ ...item, invoice_id: inv.id }, { transaction: t });
            await Product.decrement('mill_stock', { by: item.total_kgs, where: { id: item.product_id }, transaction: t });
        }
        await t.commit();
        res.status(201).json({ success: true, data: inv });
    } catch (err) { 
        if (t) await t.rollback(); 
        console.error("[Invoice Create Error]:", err.message);
        res.status(500).json({ error: err.message }); 
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

// --- 5. MILL SALES (DIRECT - WITHOUT ORDER) ---
const directInvoiceCtrl = createMasterController(DirectInvoiceHeader, [
    { model: Account, as: 'Party' }, { model: Broker, as: 'Broker' },
    { model: DirectInvoiceDetail, as: 'OrderDetails', include: [{ model: Product, as: 'Product' }] }
]);

directInvoiceCtrl.create = async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const { Details, ...headerData } = req.body;
        const header = await DirectInvoiceHeader.create(sanitizeData(headerData), { transaction: t });
        if (Details && Details.length > 0) {
            await DirectInvoiceDetail.bulkCreate(Details.map(d => ({ ...d, direct_invoice_id: header.id })), { transaction: t });
            for (const item of Details) {
                await Product.decrement('mill_stock', { by: parseFloat(item.qty || 0), where: { id: item.product_id }, transaction: t });
            }
        }
        await t.commit();
        res.status(201).json({ success: true, data: header });
    } catch (err) { 
        if (t) await t.rollback(); 
        console.error("[Direct Invoice Error]:", err.message);
        res.status(500).json({ success: false, error: err.message }); 
    }
};

directInvoiceCtrl.update = async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const { Details, ...headerData } = req.body;
        await DirectInvoiceHeader.update(sanitizeData(headerData), { where: { id: req.params.id }, transaction: t });
        if (Details) {
            await DirectInvoiceDetail.destroy({ where: { direct_invoice_id: req.params.id }, transaction: t });
            await DirectInvoiceDetail.bulkCreate(Details.map(d => ({ ...d, direct_invoice_id: req.params.id })), { transaction: t });
        }
        await t.commit();
        res.status(200).json({ success: true });
    } catch (err) { if (t) await t.rollback(); res.status(500).json({ error: err.message }); }
};

// --- 6. DEPOT INVENTORY CORE LOGIC ---

const getDepotInventory = async (req, res) => {
    try {
        const { depotId } = req.params;
        const products = await Product.findAll({ include: [{ model: TariffSubHead }] });

        const inventoryReport = await Promise.all(products.map(async (product) => {
            
            const openingBalance = await DepotReceived.sum('total_kgs', {
                where: { product_id: product.id, depot_id: depotId, type: 'OPENING' }
            }) || 0;

            const standardInward = await InvoiceDetail.sum('total_kgs', {
                where: { product_id: product.id },
                include: [{ model: InvoiceHeader, where: { depot_id: depotId, is_depot_inwarded: true }, attributes: [] }]
            }) || 0;

            const directInward = await DirectInvoiceDetail.sum('qty', {
                where: { product_id: product.id },
                include: [{ model: DirectInvoiceHeader, as: 'Header', where: { depot_id: depotId, is_depot_inwarded: true }, attributes: [] }]
            }) || 0;

            const transfersIn = await DepotSalesDetail.sum('total_kgs', {
                where: { product_id: product.id },
                include: [{ model: DepotSalesHeader, where: { party_id: depotId, sales_type: 'DEPOT TRANSFER' }, attributes: [] }]
            }) || 0;

            const totalOutward = await DepotSalesDetail.sum('total_kgs', {
                where: { product_id: product.id },
                include: [{ model: DepotSalesHeader, where: { depot_id: depotId }, attributes: [] }]
            }) || 0;

            const currentStock = (parseFloat(openingBalance) + parseFloat(standardInward) + parseFloat(directInward) + parseFloat(transfersIn)) - parseFloat(totalOutward);

            return {
                ...product.toJSON(),
                depot_stock: currentStock > 0 ? currentStock : 0 
            };
        }));
        res.json({ success: true, data: inventoryReport });
    } catch (err) { 
        console.error("[Inventory Query Error]:", err.message);
        res.status(500).json({ error: err.message }); 
    }
};

// --- 7. DEPOT INWARD & SALES/TRANSFER LOGIC ---

const depotInwardCtrl = {
    create: async (req, res) => {
        const t = await sequelize.transaction();
        try {
            const { invoice_no, depot_id, date } = req.body;
            let header = await InvoiceHeader.findOne({ where: { invoice_no } });
            let ModelRef = InvoiceHeader;
            if (!header) {
                header = await DirectInvoiceHeader.findOne({ where: { order_no: invoice_no } });
                ModelRef = DirectInvoiceHeader;
            }
            if (!header) throw new Error("Invoice not found in Mill records");
            
            await ModelRef.update({ is_depot_inwarded: true, depot_id: parseInt(depot_id) }, { where: { id: header.id }, transaction: t });
            await DepotReceived.create({ date: date || new Date(), depot_id: parseInt(depot_id), invoice_no, remarks: 'Mill Sync' }, { transaction: t });
            await t.commit();
            res.json({ success: true });
        } catch (err) { if (t) await t.rollback(); res.status(500).json({ error: err.message }); }
    }
};

const depotSalesCtrl = createMasterController(DepotSalesHeader, [
    { model: Account, as: 'Party' }, { model: Account, as: 'Depot' },
    { model: Transport }, { model: DepotSalesDetail, include: [{ model: Product }] }
]);

depotSalesCtrl.create = async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const { items, ...headerData } = req.body;
        const header = await DepotSalesHeader.create(sanitizeData(headerData), { transaction: t });
        if (items && items.length > 0) {
            const detailRows = items.map(item => ({
                depot_sales_id: header.id,
                product_id: item.product_id,
                total_kgs: parseFloat(item.qty || item.total_kgs || 0),
                packs: item.packs || 0
            }));
            await DepotSalesDetail.bulkCreate(detailRows, { transaction: t });
        }
        await t.commit();
        res.status(201).json({ success: true, data: header });
    } catch (err) { 
        if (t) await t.rollback(); 
        console.error("[Depot Sales Error]:", err.message);
        res.status(500).json({ error: err.message }); 
    }
};

// --- 8. REPORTING & PRINT ---
const reportCtrl = {
    getReportData: async (req, res) => {
        const { reportId } = req.params;
        const { start, end } = req.query;
        let where = {};
        if (start && end) where.date = { [Op.between]: [start, end] };
        try {
            let data = [];
            if (reportId === 'sales-with-order') {
                data = await InvoiceHeader.findAll({ where, include: [{ model: Account, as: 'Party' }, { model: InvoiceDetail, include: [Product] }] });
            } else if (reportId === 'sales-direct') {
                data = await DirectInvoiceHeader.findAll({ where, include: [{ model: Account, as: 'Party' }, { model: DirectInvoiceDetail, include: [Product] }] });
            }
            res.json({ success: true, data });
        } catch (err) { res.status(500).json({ error: err.message }); }
    },
    getInvoicePrintData: async (req, res) => {
        try {
            const data = await InvoiceHeader.findOne({
                where: { invoice_no: req.params.invoiceNo },
                include: [{ model: Account, as: 'Party' }, { model: Transport }, { model: InvoiceDetail, include: [{ model: Product, include: [TariffSubHead] }] }]
            });
            if (!data) return res.status(404).json({ success: false, message: "Not found" });
            res.json({ success: true, data });
        } catch (err) { res.status(500).json({ success: false, error: err.message }); }
    },
};

// --- 9. EXPORTS ---
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
    depotInward: depotInwardCtrl,
    getDepotInventory,
    depotReceived: createMasterController(DepotReceived, [{ model: Account, as: 'Depot' }, { model: Product, as: 'Product' }]),
    depotSales: depotSalesCtrl,
    despatch: createMasterController(DespatchEntry, [{ model: Transport }]),
    reports: reportCtrl,
};