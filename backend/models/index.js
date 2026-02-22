const { Sequelize, DataTypes } = require('sequelize');
const sequelize = require('../config/database');

/**
 * ==========================================
 * 1. MASTER MODELS
 * ==========================================
 */
const TariffSubHead = sequelize.define('TariffSubHead', {
  tariff_code: { type: DataTypes.STRING, unique: 'idx_tariff_code' },
  tariff_name: { type: DataTypes.STRING },
  tariff_no: { type: DataTypes.STRING }, // HSN Code
  product_type: { type: DataTypes.STRING },
  commodity: { type: DataTypes.STRING },
  fibre: { type: DataTypes.STRING },
  yarn_type: { type: DataTypes.STRING }
}, { tableName: 'tbl_TariffSubHeads' });

const PackingType = sequelize.define('PackingType', {
    packing_type: {type: DataTypes.STRING, allowNull: false }
}, { tableName: 'tbl_PackingTypes' });

const Broker = sequelize.define('Broker', {
  broker_code: { type: DataTypes.STRING, unique: true },
  broker_name: { type: DataTypes.STRING, allowNull: false },
  address: { type: DataTypes.TEXT },
  commission_pct: { type: DataTypes.DECIMAL(5, 2), defaultValue: 0 }
}, { tableName: 'tbl_Brokers' });

const Transport = sequelize.define('Transport', {
  transport_code: { type: DataTypes.STRING, unique: true },
  transport_name: { type: DataTypes.STRING, allowNull: false },
  place: { type: DataTypes.STRING }
}, { tableName: 'tbl_Transports' });

const Account = sequelize.define('Account', {
  account_code: { type: DataTypes.STRING, unique: true },
  account_name: { type: DataTypes.STRING, allowNull: false },
  place: { type: DataTypes.STRING },
  address: { type: DataTypes.TEXT },
  gst_no: { type: DataTypes.STRING }
}, { tableName: 'tbl_Accounts' });

const Product = sequelize.define('Product', {
  product_code: { type: DataTypes.STRING, unique: true },
  product_name: { type: DataTypes.STRING, allowNull: false },
  wt_per_cone: { type: DataTypes.DECIMAL(10, 3) },
  mill_stock: { type: DataTypes.DECIMAL(15, 3), defaultValue: 0 },
}, { tableName: 'tbl_Products' });

/**
 * ==========================================
 * 2. TRANSACTION MODELS (SALES WITH ORDER)
 * ==========================================
 */
const OrderHeader = sequelize.define('OrderHeader', {
  order_no: { type: DataTypes.STRING, unique: true },
  date: { type: DataTypes.DATEONLY },
  place: { type: DataTypes.STRING },         // Added
  broker_id: { type: DataTypes.INTEGER },    // Added
  is_cancelled: { type: DataTypes.BOOLEAN, defaultValue: false }, // Added
  status: { type: DataTypes.STRING, defaultValue: 'OPEN' }
}, { tableName: 'tbl_OrderHeaders' });

const OrderDetail = sequelize.define('OrderDetail', {
  product_id: { type: DataTypes.INTEGER },
  qty: { type: DataTypes.DECIMAL(12, 2) },
  bag_wt: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 }, // Added
  rate_cr: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0 },
  rate_imm: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0 }, // Added
  rate_per: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0 }  // Added
}, { tableName: 'tbl_OrderDetails' });

// Invoices generated FROM an Order
const InvoiceHeader = sequelize.define('InvoiceHeader', {
  invoice_no: { type: DataTypes.STRING, unique: true },
  date: { type: DataTypes.DATEONLY },
  sales_type: { type: DataTypes.STRING, defaultValue: 'Local' }, // Added
  party_id: { type: DataTypes.INTEGER },
  transport_id: { type: DataTypes.INTEGER }, // Added
  vehicle_no: { type: DataTypes.STRING }, // Added
  delivery: { type: DataTypes.STRING }, // Added
  remarks: { type: DataTypes.TEXT }, // Added
  is_approved: { type: DataTypes.BOOLEAN, defaultValue: false },
  assessable_value: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 }, // Added
  final_invoice_value: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 }
}, { tableName: 'tbl_InvoiceHeaders' });

const InvoiceDetail = sequelize.define('InvoiceDetail', {
  invoice_id: { type: DataTypes.INTEGER },
  product_id: { type: DataTypes.INTEGER },
  packs: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 }, // Added (Bags/Packs)
  total_kgs: { type: DataTypes.DECIMAL(15, 3) },
  rate: { type: DataTypes.DECIMAL(12, 2) }
}, { tableName: 'tbl_InvoiceDetails' });

/**
 * ==========================================
 * 3. TRANSACTION MODELS (DIRECT SALES - WITHOUT ORDER)
 * ==========================================
 */
const DirectInvoiceHeader = sequelize.define('DirectInvoiceHeader', {
  order_no: { type: DataTypes.STRING }, // Used as Ref No in UI
  date: { type: DataTypes.DATEONLY },
  party_id: { type: DataTypes.INTEGER },
  broker_id: { type: DataTypes.INTEGER },
  place: { type: DataTypes.STRING },
  vehicle_no: { type: DataTypes.STRING },
  is_cancelled: { type: DataTypes.BOOLEAN, defaultValue: false },
  status: { type: DataTypes.STRING, defaultValue: 'OPEN' },
  final_invoice_value: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 }
}, { tableName: 'tbl_DirectInvoiceHeaders' });

// 2. Update DirectInvoiceDetail
const DirectInvoiceDetail = sequelize.define('DirectInvoiceDetail', {
  product_id: { type: DataTypes.INTEGER },
  qty: { type: DataTypes.DECIMAL(15, 3) },
  bag_wt: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
  rate_cr: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0 },
  rate_imm: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0 },
  rate_per: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0 }
}, { tableName: 'tbl_DirectInvoiceDetails' });


/**
 * ==========================================
 * 4. OTHER MODELS
 * ==========================================
 */
const RG1Production = sequelize.define('RG1Production', {
  date: { 
    type: DataTypes.DATEONLY, 
    allowNull: false 
  },

  product_id: { 
    type: DataTypes.INTEGER, 
    allowNull: true 
  },

  packing_type_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },

  weight_per_bag: {
    type: DataTypes.DECIMAL(10, 3),
    allowNull: false,
    defaultValue: 0
  },

  // Previous day closing stock (kgs)
  prev_closing_kgs: {
    type: DataTypes.DECIMAL(15, 3),
    allowNull: false,
    defaultValue: 0
  },

  // Today's production
  production_kgs: { 
    type: DataTypes.DECIMAL(15, 3),
    allowNull: false,
    defaultValue: 0
  },

  // Already invoiced quantity
  invoice_kgs: {
    type: DataTypes.DECIMAL(15, 3),
    allowNull: false,
    defaultValue: 0
  },

  // Current stock available
  stock_kgs: {
    type: DataTypes.DECIMAL(15, 3),
    allowNull: false,
    defaultValue: 0
  },

  // Number of bags
  stock_bags: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0
  },

  // Loose stock not packed
  stock_loose_kgs: {
    type: DataTypes.DECIMAL(15, 3),
    allowNull: false,
    defaultValue: 0
  }

}, { 
  tableName: 'tbl_RG1Productions',
  timestamps: true
});

const DepotReceived = sequelize.define('DepotReceived', {
  date: { type: DataTypes.DATEONLY },
  remarks: { type: DataTypes.STRING }
}, { tableName: 'tbl_DepotReceived' });

const InvoiceType = sequelize.define('InvoiceType', {
  code: { type: DataTypes.STRING },
  is_option_ii: { type: DataTypes.BOOLEAN, defaultValue: false },
  type_name: { type: DataTypes.STRING }, // "Invoice Type" in UI
  sales_type: { type: DataTypes.STRING },
  group_name: { type: DataTypes.STRING },
  round_off_digits: { type: DataTypes.INTEGER, defaultValue: 0 },
  
  // Formulas and Accounts
  assess_formula: { type: DataTypes.STRING },
  assess_account: { type: DataTypes.STRING },
  
  // Tax/Charge Grids (Boolean check + Value/Rate + Formula + Account)
  charity_checked: { type: DataTypes.BOOLEAN, defaultValue: false },
  charity_val: { type: DataTypes.STRING },
  charity_formula: { type: DataTypes.STRING },
  charity_account: { type: DataTypes.STRING },

  vat_checked: { type: DataTypes.BOOLEAN, defaultValue: false },
  vat_val: { type: DataTypes.STRING },
  vat_formula: { type: DataTypes.STRING },
  vat_account: { type: DataTypes.STRING },

  duty_checked: { type: DataTypes.BOOLEAN, defaultValue: false },
  duty_val: { type: DataTypes.STRING },
  duty_formula: { type: DataTypes.STRING },
  duty_account: { type: DataTypes.STRING },

  cess_checked: { type: DataTypes.BOOLEAN, defaultValue: false },
  cess_val: { type: DataTypes.STRING },
  cess_formula: { type: DataTypes.STRING },
  cess_account: { type: DataTypes.STRING },

  hr_sec_cess_checked: { type: DataTypes.BOOLEAN, defaultValue: false },
  hr_sec_cess_val: { type: DataTypes.STRING },
  hr_sec_cess_formula: { type: DataTypes.STRING },
  hr_sec_cess_account: { type: DataTypes.STRING },

  tcs_checked: { type: DataTypes.BOOLEAN, defaultValue: false },
  tcs_val: { type: DataTypes.STRING },
  tcs_formula: { type: DataTypes.STRING },
  tcs_account: { type: DataTypes.STRING },

  cst_checked: { type: DataTypes.BOOLEAN, defaultValue: false },
  cst_val: { type: DataTypes.STRING },
  cst_formula: { type: DataTypes.STRING },
  cst_account: { type: DataTypes.STRING },

  cenvat_checked: { type: DataTypes.BOOLEAN, defaultValue: false },
  cenvat_val: { type: DataTypes.STRING },
  cenvat_formula: { type: DataTypes.STRING },
  cenvat_account: { type: DataTypes.STRING },

  // GST Specifics
  gst_checked: { type: DataTypes.BOOLEAN, defaultValue: false },
  gst_val: { type: DataTypes.STRING },
  sgst_account: { type: DataTypes.STRING },
  cgst_account: { type: DataTypes.STRING },
  sgst_pct: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
  cgst_pct: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },

  igst_checked: { type: DataTypes.BOOLEAN, defaultValue: false },
  igst_val: { type: DataTypes.STRING },
  igst_formula: { type: DataTypes.STRING },
  igst_account: { type: DataTypes.STRING },

  // Footers
  sub_total_formula: { type: DataTypes.STRING },
  total_value_formula: { type: DataTypes.STRING },
  round_off_formula: { type: DataTypes.STRING },
  round_off_account: { type: DataTypes.STRING },
  round_off_direction: { type: DataTypes.STRING, defaultValue: 'Reverse' }, // Forward/Reverse
  lorry_freight_account: { type: DataTypes.STRING },
  account_posting: { type: DataTypes.BOOLEAN, defaultValue: true }
}, { tableName: 'tbl_InvoiceTypes' });

const DespatchEntry = sequelize.define('DespatchEntry', {
  load_no: { type: DataTypes.STRING },
  load_date: { type: DataTypes.DATEONLY }, // Missing
  vehicle_no: { type: DataTypes.STRING },
  transport_id: { type: DataTypes.INTEGER }, // Missing
  lr_no: { type: DataTypes.STRING },
  lr_date: { type: DataTypes.DATEONLY }, // Missing
  delivery_place: { type: DataTypes.STRING }, // Missing
  in_time: { type: DataTypes.STRING }, // Missing
  out_time: { type: DataTypes.STRING }, // Missing
  no_of_bags: { type: DataTypes.DECIMAL(10, 2) },
  freight: { type: DataTypes.DECIMAL(12, 2) }
}, { tableName: 'tbl_DespatchEntries' });

// Add the association so you can fetch the Transport name
Transport.hasMany(DespatchEntry, { foreignKey: 'transport_id' });
DespatchEntry.belongsTo(Transport, { foreignKey: 'transport_id' });
/**
 * ==========================================
 * 5. ASSOCIATIONS (RELATIONSHIPS)
 * ==========================================
 */

// Product -> Tariff
TariffSubHead.hasMany(Product, { foreignKey: 'tariff_id' });
Product.belongsTo(TariffSubHead, { foreignKey: 'tariff_id' });

// Order Associations
Account.hasMany(OrderHeader, { foreignKey: 'party_id' });
OrderHeader.belongsTo(Account, { foreignKey: 'party_id', as: 'Party' });
OrderHeader.hasMany(OrderDetail, { foreignKey: 'order_id', onDelete: 'CASCADE' });
OrderDetail.belongsTo(OrderHeader, { foreignKey: 'order_id' });
OrderDetail.belongsTo(Product, { foreignKey: 'product_id' });

// Invoice WITH Order Associations
OrderHeader.hasMany(InvoiceHeader, { foreignKey: 'order_id' });
InvoiceHeader.belongsTo(OrderHeader, { foreignKey: 'order_id' });
Account.hasMany(InvoiceHeader, { foreignKey: 'party_id' });
InvoiceHeader.belongsTo(Account, { foreignKey: 'party_id', as: 'Party' });
InvoiceHeader.hasMany(InvoiceDetail, { foreignKey: 'invoice_id', onDelete: 'CASCADE' });
InvoiceDetail.belongsTo(Product, { foreignKey: 'product_id' });
InvoiceDetail.belongsTo(InvoiceHeader, { foreignKey: 'invoice_id' });
// DIRECT Invoice (WITHOUT ORDER) Associations
Account.hasMany(DirectInvoiceHeader, { foreignKey: 'party_id' });
DirectInvoiceHeader.belongsTo(Account, { foreignKey: 'party_id', as: 'Party' });
DirectInvoiceHeader.hasMany(DirectInvoiceDetail, { 
    foreignKey: 'direct_invoice_id',
    as: 'OrderDetails',
    onDelete: 'CASCADE'
});
DirectInvoiceDetail.belongsTo(DirectInvoiceHeader, { 
    foreignKey: 'direct_invoice_id',
    as: 'Header'
});

DirectInvoiceDetail.belongsTo(Product, { 
    foreignKey: 'product_id',
    as: 'Product'
});
// DirectInvoiceDetail.belongsTo(DirectInvoiceHeader, {
//     foreignKey: 'direct_invoice_id'
// });
// Production
Product.hasMany(RG1Production, { foreignKey: 'product_id' });
RG1Production.belongsTo(Product, { foreignKey: 'product_id' });

// Packing Type relation
PackingType.hasMany(RG1Production, { foreignKey: 'packing_type_id' });
RG1Production.belongsTo(PackingType, { foreignKey: 'packing_type_id' });

Transport.hasMany(DespatchEntry, { foreignKey: 'transport_id' });
DespatchEntry.belongsTo(Transport, { foreignKey: 'transport_id' });

Transport.hasMany(InvoiceHeader, { foreignKey: 'transport_id' });
InvoiceHeader.belongsTo(Transport, { foreignKey: 'transport_id' });

// Broker Associations (New)
Broker.hasMany(OrderHeader, { foreignKey: 'broker_id' });
OrderHeader.belongsTo(Broker, { foreignKey: 'broker_id', as: 'Broker' });

Broker.hasMany(DirectInvoiceHeader, { foreignKey: 'broker_id' });
DirectInvoiceHeader.belongsTo(Broker, { foreignKey: 'broker_id', as: 'Broker' });

module.exports = {
  sequelize, TariffSubHead, PackingType, Broker, Transport, Account,
  Product, OrderHeader, OrderDetail, RG1Production,
  InvoiceHeader, InvoiceDetail, DirectInvoiceHeader, DirectInvoiceDetail, 
  DepotReceived, InvoiceType, DespatchEntry
};