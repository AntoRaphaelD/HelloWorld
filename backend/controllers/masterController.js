const { 
    sequelize, TariffSubHead, PackingType, Broker, Transport, 
    Account, Product, OrderHeader, OrderDetail, 
    RG1Production, DespatchEntry, InvoiceHeader, 
    InvoiceDetail, DepotReceived, InvoiceType, DepotStock 
} = require('../models');
const { Op } = require('sequelize');

// 1. Generic Factory
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
            // Enhanced search logic
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
            // Sequelize update returns an array, we want to know if it succeeded
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
            const { ids } = req.body; // Expecting { ids: [1, 2, 5] }
            
            if (!ids || !Array.isArray(ids) || ids.length === 0) {
                return res.status(400).json({ success: false, message: "No IDs provided for deletion" });
            }

            await Model.destroy({
                where: {
                    id: { [Op.in]: ids }
                }
            });

            res.status(200).json({ 
                success: true, 
                message: `${ids.length} records deleted successfully` 
            });
        } catch (err) {
            res.status(500).json({ success: false, error: err.message });
        }
    }
});

// 2. Transactional Controllers (Orders, Production, Invoices)
const orderCtrl = createMasterController(OrderHeader, [{ model: OrderDetail, include: [Product] }, 'Party']);
orderCtrl.create = async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const { Details, ...header } = req.body;
        const order = await OrderHeader.create(header, { transaction: t });
        if (Details) await OrderDetail.bulkCreate(Details.map(d => ({ ...d, order_id: order.id })), { transaction: t });
        await t.commit();
        res.status(201).json({ success: true, data: order });
    } catch (err) { await t.rollback(); res.status(500).json({ error: err.message }); }
};

const productionCtrl = createMasterController(RG1Production, [Product]);
productionCtrl.create = async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const prod = await RG1Production.create(req.body, { transaction: t });
        await Product.increment('mill_stock', { by: req.body.production_kgs, where: { id: req.body.product_id }, transaction: t });
        await t.commit();
        res.status(201).json({ success: true, data: prod });
    } catch (err) { await t.rollback(); res.status(500).json({ error: err.message }); }
};

const invoiceCtrl = createMasterController(InvoiceHeader, ['Party', { model: InvoiceDetail, include: [Product] }]);
invoiceCtrl.create = async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const { Details, ...header } = req.body;
        const inv = await InvoiceHeader.create(header, { transaction: t });
        if (Details) {
            for (const item of Details) {
                await InvoiceDetail.create({ ...item, invoice_id: inv.id }, { transaction: t });
                await Product.decrement('mill_stock', { by: item.total_kgs, where: { id: item.product_id }, transaction: t });
            }
        }
        await t.commit();
        res.status(201).json({ success: true, data: inv });
    } catch (err) { await t.rollback(); res.status(500).json({ error: err.message }); }
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
        const invoiceId = req.params.id;
        const details = await InvoiceDetail.findAll({ where: { invoice_id: invoiceId } });
        for (const item of details) {
            await Product.increment('mill_stock', { by: item.total_kgs, where: { id: item.product_id }, transaction: t });
        }
        await InvoiceHeader.destroy({ where: { id: invoiceId }, transaction: t });
        await t.commit();
        res.json({ success: true, message: "Invoice Rejected & Stock Reverted" });
    } catch (err) {
        await t.rollback();
        res.status(500).json({ error: err.message });
    }
};

/**
 * 3. REPORTING LOGIC
 */
const reportCtrl = {
    getReportData: async (req, res) => {
        const { reportId } = req.params;
        const { start, end } = req.query;
        let where = {};
        if (start && end) where.date = { [Op.between]: [start, end] };

        try {
            let data = [];
            if (reportId === 's1') { // Sales Day Book
                data = await InvoiceHeader.findAll({ where, include: ['Party', { model: InvoiceDetail, include: [Product] }] });
            } else if (reportId === 'st1') { // RG1 Statement
                data = await RG1Production.findAll({ where, include: [Product] });
            }
            res.json({ success: true, data });
        } catch (err) { res.status(500).json({ error: err.message }); }
    },

    getInvoicePrintData: async (req, res) => {
        try {
            const { id } = req.params;
            const invoice = await InvoiceHeader.findOne({
                where: { invoice_no: id },
                include: [
                    { model: Account, as: 'Party' }, 
                    { model: Transport }, 
                    { model: InvoiceDetail, include: [Product] }
                ]
            });

            if (!invoice) return res.status(404).json({ success: false, message: "Invoice not found" });

            const details = invoice.InvoiceDetails || [];
            const formattedData = {
                party_name: invoice.Party?.account_name || "N/A",
                address: invoice.Party?.address || "",
                gst_no: invoice.Party?.gst_no || "N/A",
                invoice_no: invoice.invoice_no,
                date: invoice.date,
                ebill: invoice.ebill_no || "---",
                vehicle: invoice.vehicle_no || "---",
                delivery: invoice.delivery || "---",
                bags: details.reduce((sum, d) => sum + (parseInt(d.packs) || 0), 0),
                weight: details.reduce((sum, d) => sum + (parseFloat(d.total_kgs) || 0), 0),
                rate: details.length > 0 ? details[0].rate : 0,
                product_name: details.length > 0 ? details[0].Product?.product_name : "---",
                hsn_code: details.length > 0 ? (details[0].Product?.product_code || "---") : "---",
                total: parseFloat(invoice.assessable_value || 0),
                grand_total: parseFloat(invoice.final_invoice_value || 0)
            };
            res.json({ success: true, data: formattedData });
        } catch (err) {
            res.status(500).json({ success: false, error: err.message });
        }
    }
};

module.exports = {
    account: createMasterController(Account),
    broker: createMasterController(Broker),
    transport: createMasterController(Transport),
    tariff: createMasterController(TariffSubHead),
    packing: createMasterController(PackingType),
    product: createMasterController(Product, [TariffSubHead]),
    invoiceType: createMasterController(InvoiceType),
    order: orderCtrl,
    production: productionCtrl,
    invoice: invoiceCtrl,
    depotReceived: createMasterController(DepotReceived, ['Depot']),
    despatch: createMasterController(DespatchEntry),
    reports: reportCtrl
};