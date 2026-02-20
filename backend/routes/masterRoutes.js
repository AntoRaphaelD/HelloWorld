const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/masterController');

/**
 * Validation helper
 */
const validate = (fn) => {
    if (typeof fn !== 'function') {
        // This error helps find which specific route is broken
        throw new Error(`Route handler is not a function! Check masterController exports.`);
    }
    return fn;
};

/**
 * 1. MASTER ROUTES
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
    router.post(`/${m.path}/bulk-delete`, validate(m.controller.bulkDelete));
});

/**
 * 2. TRANSACTIONAL ROUTES
 */

// Orders
router.post('/orders', validate(ctrl.order.create));
router.get('/orders', validate(ctrl.order.getAll));
router.delete('/orders/:id', validate(ctrl.order.delete));
router.post('/orders/bulk-delete', validate(ctrl.order.bulkDelete));

// Production
router.post('/production', validate(ctrl.production.create));
router.get('/production', validate(ctrl.production.getAll));

// Invoices (Sales WITH Order)
router.post('/invoices', validate(ctrl.invoice.create));
router.get('/invoices', validate(ctrl.invoice.getAll));
router.delete('/invoices/:id', validate(ctrl.invoice.delete));
// Added back approve/reject
router.put('/invoices/approve/:id', validate(ctrl.invoice.approve));
router.put('/invoices/reject/:id', validate(ctrl.invoice.reject));

// Direct Invoices (Sales WITHOUT Order) - NEW
router.post('/direct-invoices', validate(ctrl.directInvoice.create));
router.get('/direct-invoices', validate(ctrl.directInvoice.getAll));
router.delete('/direct-invoices/:id', validate(ctrl.directInvoice.delete));

// Despatch & Depot
// Despatch
router.get('/despatch', validate(ctrl.despatch.getAll));
router.post('/despatch', validate(ctrl.despatch.create));
router.put('/despatch/:id', validate(ctrl.despatch.update)); // Added
router.delete('/despatch/:id', validate(ctrl.despatch.delete)); // Added
router.post('/despatch/bulk-delete', validate(ctrl.despatch.bulkDelete));

router.post('/depot-received', validate(ctrl.depotReceived.create));
router.get('/depot-received', validate(ctrl.depotReceived.getAll));

/**
 * 3. REPORTING ROUTES
 */
router.get('/reports/:reportId', validate(ctrl.reports.getReportData));

module.exports = router;