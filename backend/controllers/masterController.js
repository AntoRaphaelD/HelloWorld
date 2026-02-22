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
        console.log("Fetching direct invoices...");
        const data = await Model.findAll({ include: includeModels });
        console.log("Success");
        res.json({ success: true, data });
    } catch (err) {
        console.error("ERROR:", err);
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
    { model: OrderDetail, as: 'OrderDetails', include: [{ model: Product }] },
    { model: Account, as: 'Party' },
    { model: Broker, as: 'Broker' } // Included Broker
]);

orderCtrl.create = async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const { Details, ...header } = req.body;
        const order = await OrderHeader.create(header, { transaction: t });
        if (Details && Details.length > 0) {
            await OrderDetail.bulkCreate(
                Details.map(d => ({ ...d, order_id: order.id })), 
                { transaction: t }
            );
        }
        await t.commit();
        res.status(201).json({ success: true, data: order });
    } catch (err) { if (t) await t.rollback(); res.status(500).json({ error: err.message }); }
};

// --- 3. Production Controller ---
const productionCtrl = createMasterController(RG1Production, [
    { model: Product },
    { model: PackingType }
]);
productionCtrl.create = async (req, res) => {
    const t = await sequelize.transaction();
    try {

        const {
            date,
            product_id,
            packing_type_id,
            weight_per_bag,
            prev_closing_kgs,
            production_kgs
        } = req.body;

        // ✅ Invoice sum (WITH ORDER)
        const invoiceSum = await InvoiceDetail.sum('total_kgs', {
            include: [{
                model: InvoiceHeader,
                where: { date },
                attributes: []
            }],
            where: { product_id },
            transaction: t
        }) || 0;

        const directInvoiceSum = await DirectInvoiceDetail.sum('qty', {
            include: [{
                model: DirectInvoiceHeader,
                as: 'Header',
                where: { date },
                attributes: []
            }],
            where: { product_id },
            transaction: t
        }) || 0;

        const invoice_kgs = parseFloat(invoiceSum) + parseFloat(directInvoiceSum);

        // ✅ Calculate stock
        const stock_kgs =
            parseFloat(prev_closing_kgs || 0) +
            parseFloat(production_kgs || 0) -
            parseFloat(invoice_kgs || 0);

        const stock_bags =
            parseFloat(weight_per_bag) > 0
                ? Math.floor(stock_kgs / weight_per_bag)
                : 0;

        const stock_loose_kgs =
            parseFloat(weight_per_bag) > 0
                ? stock_kgs % weight_per_bag
                : stock_kgs;

        // ✅ Create RG1 entry
        const prod = await RG1Production.create({
            date,
            product_id,
            packing_type_id,
            weight_per_bag,
            prev_closing_kgs,
            production_kgs,
            invoice_kgs,
            stock_kgs,
            stock_bags,
            stock_loose_kgs
        }, { transaction: t });

        // ✅ Update product mill stock
        await Product.update({
            mill_stock: stock_kgs
        }, {
            where: { id: product_id },
            transaction: t
        });

        await t.commit();

        res.status(201).json({
            success: true,
            data: prod
        });

    } catch (err) {

        await t.rollback();

        console.error("Production Error:", err);

        res.status(500).json({
            success: false,
            error: err.message
        });

    }
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
// --- Direct Invoice Controller ---
const directInvoiceCtrl = createMasterController(DirectInvoiceHeader, [
    { model: Account, as: 'Party' },
    { model: Broker, as: 'Broker' },
    { 
        model: DirectInvoiceDetail, 
        as: 'OrderDetails',
        include: [{ model: Product, as: 'Product' }]
    }
]);

// Custom create to handle the nested "Details" (or OrderDetails) from frontend
directInvoiceCtrl.create = async (req, res) => {
    const t = await sequelize.transaction();
    try {
        // Frontend sends data as { ...formData, Details: gridRows }
        const { Details, ...headerData } = req.body;
        
        const header = await DirectInvoiceHeader.create(headerData, { transaction: t });
        
        if (Details && Details.length > 0) {
            const detailRows = Details.map(item => ({
                ...item,
                direct_invoice_id: header.id
            }));
            
            await DirectInvoiceDetail.bulkCreate(detailRows, { transaction: t });

            // Optional: Reduce stock
            for (const item of Details) {
                if (item.product_id && item.qty) {
                    await Product.decrement('mill_stock', { 
                        by: item.qty, 
                        where: { id: item.product_id }, 
                        transaction: t 
                    });
                }
            }
        }
        
        await t.commit();
        res.status(201).json({ success: true, data: header });
    } catch (err) {
        if (t) await t.rollback();
        console.error("Direct Invoice Create Error:", err);
        res.status(500).json({ success: false, error: err.message });
    }
};

// Also update the generic update to handle details if needed
directInvoiceCtrl.update = async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const { Details, ...headerData } = req.body;
        const id = req.params.id;

        await DirectInvoiceHeader.update(headerData, { where: { id }, transaction: t });
        
        if (Details) {
            // Simple approach: Delete existing and recreate
            await DirectInvoiceDetail.destroy({ where: { direct_invoice_id: id }, transaction: t });
            await DirectInvoiceDetail.bulkCreate(
                Details.map(d => ({ ...d, direct_invoice_id: id })), 
                { transaction: t }
            );
        }

        await t.commit();
        res.status(200).json({ success: true });
    } catch (err) {
        if (t) await t.rollback();
        res.status(500).json({ success: false, error: err.message });
    }
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
    },
     getInvoicePrintData: async (req, res) => {
        try {
            const { invoiceNo } = req.params;
            const data = await InvoiceHeader.findOne({
                where: { invoice_no: invoiceNo },
                include: [
                    { model: Account, as: 'Party' },
                    { model: Transport },
                    { 
                        model: InvoiceDetail, 
                        include: [{ 
                            model: Product, 
                            include: [TariffSubHead] // Important for HSN Code
                        }] 
                    }
                ]
            });

            if (!data) {
                return res.status(404).json({ success: false, message: "Invoice not found" });
            }

            res.json({ success: true, data });
        } catch (err) {
            console.error("Print Error:", err);
            res.status(500).json({ success: false, error: err.message });
        }
    },
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
    reports: reportCtrl,
    
};