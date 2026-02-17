const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/masterController');

/**
 * Validation helper to ensure controller methods exist
 */
const validate = (fn) => {
    if (typeof fn !== 'function') {
        throw new Error(`Route handler is not a function! Check masterController exports.`);
    }
    return fn;
};

/**
 * 1. MASTER ROUTES (Auto-generated)
 * These use the standardized createMasterController factory methods
 */
const masters = [
    { path: 'accounts', controller: ctrl.account },
    { path: 'brokers', controller: ctrl.broker },
    { path: 'products', controller: ctrl.product },
    { path: 'transports', controller: ctrl.transport },
    { path: 'tariffs', controller: ctrl.tariff },
    { path: 'packing-types', controller: ctrl.packing },
    { path: 'invoice-types', controller: ctrl.invoiceType }
];

masters.forEach(m => {
    router.post(`/${m.path}`, validate(m.controller.create));
    router.get(`/${m.path}`, validate(m.controller.getAll));
    router.get(`/${m.path}/:id`, validate(m.controller.getOne));
    router.put(`/${m.path}/:id`, validate(m.controller.update));
    router.delete(`/${m.path}/:id`, validate(m.controller.delete));
    // Standardized Bulk Delete
    router.post(`/${m.path}/bulk-delete`, validate(m.controller.bulkDelete));
});

/**
 * 2. TRANSACTIONAL ROUTES
 * These may have custom logic (like transactions or stock increments)
 */

// Orders
router.post('/orders', validate(ctrl.order.create));
router.get('/orders', validate(ctrl.order.getAll));
router.put('/orders/:id', validate(ctrl.order.update));
router.delete('/orders/:id', validate(ctrl.order.delete));
router.post('/orders/bulk-delete', validate(ctrl.order.bulkDelete));

// Production
router.post('/production', validate(ctrl.production.create));
router.get('/production', validate(ctrl.production.getAll));
router.put('/production/:id', validate(ctrl.production.update));
router.delete('/production/:id', validate(ctrl.production.delete));
router.post('/production/bulk-delete', validate(ctrl.production.bulkDelete));

// Invoices
router.post('/invoices', validate(ctrl.invoice.create));
router.get('/invoices', validate(ctrl.invoice.getAll));
router.put('/invoices/approve/:id', validate(ctrl.invoice.approve));
router.put('/invoices/reject/:id', validate(ctrl.invoice.reject));
router.put('/invoices/:id', validate(ctrl.invoice.update));
router.delete('/invoices/:id', validate(ctrl.invoice.delete));
router.post('/invoices/bulk-delete', validate(ctrl.invoice.bulkDelete));

// Despatch & Depot
router.post('/despatch', validate(ctrl.despatch.create));
router.get('/despatch', validate(ctrl.despatch.getAll));
router.post('/despatch/bulk-delete', validate(ctrl.despatch.bulkDelete));

router.post('/depot-received', validate(ctrl.depotReceived.create));
router.get('/depot-received', validate(ctrl.depotReceived.getAll));
router.post('/depot-received/bulk-delete', validate(ctrl.depotReceived.bulkDelete));

/**
 * 3. REPORTING ROUTES
 */
router.get('/reports/:reportId', validate(ctrl.reports.getReportData));
router.get('/invoices/print/:id', validate(ctrl.reports.getInvoicePrintData));

module.exports = router;