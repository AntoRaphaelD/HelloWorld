const { 
    sequelize, TariffSubHead, PackingType, Broker, Transport, 
    Account, Product, OrderHeader, OrderDetail, 
    RG1Production, DespatchEntry, InvoiceHeader, 
    InvoiceDetail, DirectInvoiceHeader, DirectInvoiceDetail,
    DepotReceived, InvoiceType
} = require('../models');
const { Op } = require('sequelize');

// --- 1. Generic Factory ---
const createMasterController = (Model, includeModels = []) => ({
    create: async (req, res) => {
        try {
            const data = await Model.create(req.body);
            res.status(201).json({ success: true, data });
        } catch (err) { res.status(500).json({ success: false, error: err.message }); }
    },
    getAll: async (req, res) => {
        try {
            const { searchField, searchValue } = req.query;
            let where = {};
            if (searchField && searchValue) {
                where[searchField] = { [Op.like]: `%${searchValue}%` };
            }
            const data = await Model.findAll({ where, include: includeModels });
            res.status(200).json({ success: true, data });
        } catch (err) { res.status(500).json({ success: false, error: err.message }); }
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
            await Model.update(req.body, { where: { id: req.params.id } });
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
            if (!ids || !Array.isArray(ids) || ids.length === 0) return res.status(400).json({ success: false, message: "No IDs provided" });
            await Model.destroy({ where: { id: { [Op.in]: ids } } });
            res.status(200).json({ success: true });
        } catch (err) { res.status(500).json({ success: false, error: err.message }); }
    }
});

// --- 2. Order Controller ---
const orderCtrl = createMasterController(OrderHeader, [
    { model: OrderDetail, include: [{ model: Product }] },
    { model: Account, as: 'Party' }
]);
orderCtrl.create = async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const { Details, details, ...header } = req.body;
        const items = Details || details || [];
        const order = await OrderHeader.create(header, { transaction: t });
        if (items.length > 0) {
            await OrderDetail.bulkCreate(items.map(d => ({ ...d, order_id: order.id })), { transaction: t });
        }
        await t.commit();
        res.status(201).json({ success: true, data: order });
    } catch (err) { if (t) await t.rollback(); res.status(500).json({ error: err.message }); }
};

// --- 3. Production Controller ---
const productionCtrl = createMasterController(RG1Production, [{ model: Product }]);
productionCtrl.create = async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const prod = await RG1Production.create(req.body, { transaction: t });
        await Product.increment('mill_stock', { by: req.body.production_kgs, where: { id: req.body.product_id }, transaction: t });
        await t.commit();
        res.status(201).json({ success: true, data: prod });
    } catch (err) { if (t) await t.rollback(); res.status(500).json({ error: err.message }); }
};

// --- 4. Invoice (With Order) Controller ---
const invoiceCtrl = createMasterController(InvoiceHeader, [
    { model: Account, as: 'Party' },
    { model: Transport },
    { 
        model: InvoiceDetail,
        include: [{ model: Product }]
    }
]);
invoiceCtrl.create = async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const { Details, details, ...header } = req.body;
        const items = Details || details || [];
        const inv = await InvoiceHeader.create(header, { transaction: t });
        for (const item of items) {
            await InvoiceDetail.create({ ...item, invoice_id: inv.id }, { transaction: t });
            await Product.decrement('mill_stock', { by: item.total_kgs, where: { id: item.product_id }, transaction: t });
        }
        await t.commit();
        res.status(201).json({ success: true, data: inv });
    } catch (err) { if (t) await t.rollback(); res.status(500).json({ error: err.message }); }
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

// --- 5. Direct Invoice (Without Order) Controller ---
const directInvoiceCtrl = createMasterController(DirectInvoiceHeader, [
    { model: Account, as: 'Party' },
    { model: DirectInvoiceDetail, include: [{ model: Product }] }
]);
directInvoiceCtrl.create = async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const { Details, details, ...header } = req.body;
        const items = Details || details || [];
        const inv = await DirectInvoiceHeader.create(header, { transaction: t });
        for (const item of items) {
            await DirectInvoiceDetail.create({ ...item, direct_invoice_id: inv.id }, { transaction: t });
            await Product.decrement('mill_stock', { by: item.total_kgs, where: { id: item.product_id }, transaction: t });
        }
        await t.commit();
        res.status(201).json({ success: true, data: inv });
    } catch (err) { if (t) await t.rollback(); res.status(500).json({ error: err.message }); }
};

/**
 * 6. REPORTING LOGIC
 */
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
    }
};

module.exports = {
    account: createMasterController(Account),
    broker: createMasterController(Broker),
    transport: createMasterController(Transport),
    
    despatch: createMasterController(DespatchEntry, [{ model: Transport }]), 
    tariff: createMasterController(TariffSubHead),
    packing: createMasterController(PackingType),
    product: createMasterController(Product, [{ model: TariffSubHead }]),
    invoiceType: createMasterController(InvoiceType),
    order: orderCtrl,
    production: productionCtrl,
    invoice: invoiceCtrl,
    directInvoice: directInvoiceCtrl,
    depotReceived: createMasterController(DepotReceived, [{ model: Account, as: 'Depot' }]),
    // despatch: createMasterController(DespatchEntry),
    reports: reportCtrl
};