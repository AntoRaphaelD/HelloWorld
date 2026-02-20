import axios from 'axios';

// Initialize Axios
const api = axios.create({ 
  baseURL: 'http://localhost:5000/api',
  headers: {
    'Content-Type': 'application/json'
  }
});

/**
 * ==========================================
 * 1. MASTER API
 * ==========================================
 */
export const mastersAPI = {
  accounts: {
    getAll: (params) => api.get('/accounts', { params }),
    create: (data) => api.post('/accounts', data),
    update: (id, data) => api.put(`/accounts/${id}`, data),
    delete: (id) => api.delete(`/accounts/${id}`),
    bulkDelete: (ids) => api.post('/accounts/bulk-delete', { ids })
  },
  brokers: {
    getAll: () => api.get('/brokers'),
    create: (data) => api.post('/brokers', data),
    update: (id, data) => api.put(`/brokers/${id}`, data),
    delete: (id) => api.delete(`/brokers/${id}`),
    bulkDelete: (ids) => api.post('/brokers/bulk-delete', { ids })
  },
  products: {
    getAll: () => api.get('/products'),
    create: (data) => api.post('/products', data),
    update: (id, data) => api.put(`/products/${id}`, data),
    delete: (id) => api.delete(`/products/${id}`),
    bulkDelete: (ids) => api.post('/products/bulk-delete', { ids })
  },
  transports: {
    getAll: () => api.get('/transports'),
    create: (data) => api.post('/transports', data),
    update: (id, data) => api.put(`/transports/${id}`, data),
    delete: (id) => api.delete(`/transports/${id}`),
    bulkDelete: (ids) => api.post('/transports/bulk-delete', { ids })
  },
  tariffs: {
    getAll: () => api.get('/tariffs'),
    create: (data) => api.post('/tariffs', data),
    update: (id, data) => api.put(`/tariffs/${id}`, data),
    delete: (id) => api.delete(`/tariffs/${id}`),
    bulkDelete: (ids) => api.post('/tariffs/bulk-delete', { ids })
  },
  packingTypes: {
    getAll: () => api.get('/packing-types'),
    create: (data) => api.post('/packing-types', data),
    update: (id, data) => api.put(`/packing-types/${id}`, data),
    delete: (id) => api.delete(`/packing-types/${id}`),
    bulkDelete: (ids) => api.post('/packing-types/bulk-delete', { ids })
  },
  invoiceTypes: {
  getAll: () => api.get('/invoice-types'),
  create: (data) => api.post('/invoice-types', data),
  update: (id, data) => api.put(`/invoice-types/${id}`, data),
  delete: (id) => api.delete(`/invoice-types/${id}`),
  bulkDelete: (ids) => api.post('/invoice-types/bulk-delete', { ids })
},
};

/**
 * ==========================================
 * 2. TRANSACTIONAL API
 * ==========================================
 */
export const transactionsAPI = {
  orders: {
    getAll: () => api.get('/orders'),
    create: (data) => api.post('/orders', data), 
    delete: (id) => api.delete(`/orders/${id}`),
    bulkDelete: (ids) => api.post('/orders/bulk-delete', { ids })
  },
  production: {
    getAll: () => api.get('/production'),
    create: (data) => api.post('/production', data), 
    bulkDelete: (ids) => api.post('/production/bulk-delete', { ids })
  },
  
  // Sales WITH Order
  invoices: {
    getAll: () => api.get('/invoices'),
    create: (data) => api.post('/invoices', data),
    approve: (id) => api.put(`/invoices/approve/${id}`),
    reject: (id) => api.put(`/invoices/reject/${id}`), 
    delete: (id) => api.delete(`/invoices/${id}`)
  },
  

  // Sales WITHOUT Order (Direct Sales) - NEWLY ADDED
  directInvoices: {
    getAll: () => api.get('/direct-invoices'),
    create: (data) => api.post('/direct-invoices', data),
    delete: (id) => api.delete(`/direct-invoices/${id}`)
  },

  // service/api.js
despatch: {
    getAll: () => api.get('/despatch'), // Ensure this matches router.get('/despatch'...)
    create: (data) => api.post('/despatch', data),
    update: (id, data) => api.put(`/despatch/${id}`, data),
    delete: (id) => api.delete(`/despatch/${id}`)
},

  depotReceived: {
    getAll: () => api.get('/depot-received'),
    create: (data) => api.post('/depot-received', data), 
    delete: (id) => api.delete(`/depot-received/${id}`)
  }
};

/**
 * ==========================================
 * 3. REPORTING API
 * ==========================================
 */
export const reportsAPI = {
    /**
     * Get Report Data
     * @param {string} reportId - 'sales-with-order', 'sales-direct', or 'production'
     * @param {object} params - { start: 'YYYY-MM-DD', end: 'YYYY-MM-DD' }
     */
    getReportData: (reportId, params) => api.get(`/reports/${reportId}`, { params }),
};

export default api;