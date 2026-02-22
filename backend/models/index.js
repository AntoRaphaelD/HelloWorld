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
  account_group: { type: DataTypes.STRING },
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
  place: { type: DataTypes.STRING },
  broker_id: { type: DataTypes.INTEGER },
  is_cancelled: { type: DataTypes.BOOLEAN, defaultValue: false },
  status: { type: DataTypes.STRING, defaultValue: 'OPEN' }
}, { tableName: 'tbl_OrderHeaders' });

const OrderDetail = sequelize.define('OrderDetail', {
  product_id: { type: DataTypes.INTEGER },
  qty: { type: DataTypes.DECIMAL(12, 2) },
  bag_wt: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
  rate_cr: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0 },
  rate_imm: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0 },
  rate_per: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0 }
}, { tableName: 'tbl_OrderDetails' });

const InvoiceHeader = sequelize.define('InvoiceHeader', {
  invoice_no: { type: DataTypes.STRING, unique: true },
  date: { type: DataTypes.DATEONLY },
  sales_type: { type: DataTypes.STRING, defaultValue: 'Local' },
  party_id: { type: DataTypes.INTEGER },
  transport_id: { type: DataTypes.INTEGER },
  vehicle_no: { type: DataTypes.STRING },
  delivery: { type: DataTypes.STRING },
  remarks: { type: DataTypes.TEXT },
  is_approved: { type: DataTypes.BOOLEAN, defaultValue: false },
  is_depot_inwarded: { type: DataTypes.BOOLEAN, defaultValue: false }, // Sync Flag
  depot_id: { type: DataTypes.INTEGER }, // Sync Target
  assessable_value: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  final_invoice_value: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 }
}, { tableName: 'tbl_InvoiceHeaders' });

const InvoiceDetail = sequelize.define('InvoiceDetail', {
  invoice_id: { type: DataTypes.INTEGER },
  product_id: { type: DataTypes.INTEGER },
  packs: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
  total_kgs: { type: DataTypes.DECIMAL(15, 3) },
  rate: { type: DataTypes.DECIMAL(12, 2) }
}, { tableName: 'tbl_InvoiceDetails' });

/**
 * ==========================================
 * 3. TRANSACTION MODELS (DIRECT SALES)
 * ==========================================
 */
const DirectInvoiceHeader = sequelize.define('DirectInvoiceHeader', {
  order_no: { type: DataTypes.STRING },
  date: { type: DataTypes.DATEONLY },
  party_id: { type: DataTypes.INTEGER },
  broker_id: { type: DataTypes.INTEGER },
  place: { type: DataTypes.STRING },
  vehicle_no: { type: DataTypes.STRING },
  is_cancelled: { type: DataTypes.BOOLEAN, defaultValue: false },
  status: { type: DataTypes.STRING, defaultValue: 'OPEN' },
  final_invoice_value: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  is_depot_inwarded: { type: DataTypes.BOOLEAN, defaultValue: false },
  depot_id: { type: DataTypes.INTEGER },
}, { tableName: 'tbl_DirectInvoiceHeaders' });

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
 * 4. DEPOT SPECIFIC MODELS
 * ==========================================
 */

// ✅ UPDATED DepotReceived model to match your ALTER TABLE
const DepotReceived = sequelize.define('DepotReceived', {
  date: { type: DataTypes.DATEONLY },
  depot_id: { type: DataTypes.INTEGER }, 
  product_id: { type: DataTypes.INTEGER }, // Added
  invoice_no: { type: DataTypes.STRING }, 
  total_kgs: { type: DataTypes.DECIMAL(15, 3), defaultValue: 0 }, // Added
  total_bags: { type: DataTypes.INTEGER, defaultValue: 0 }, // Added
  type: { type: DataTypes.STRING(20), defaultValue: 'INWARD' }, // Added (OPENING or INWARD)
  remarks: { type: DataTypes.STRING }
}, { tableName: 'tbl_DepotReceived' });

const DepotSalesHeader = sequelize.define('DepotSalesHeader', {
  invoice_no: { type: DataTypes.STRING, unique: true },
  date: { type: DataTypes.DATEONLY },
  sales_type: { type: DataTypes.STRING, defaultValue: 'DEPOT SALES' },
  invoice_type: { type: DataTypes.STRING },
  depot_id: { type: DataTypes.INTEGER }, 
  party_id: { type: DataTypes.INTEGER },
  address: { type: DataTypes.TEXT },
  credit_days: { type: DataTypes.INTEGER, defaultValue: 0 },
  interest_pct: { type: DataTypes.DECIMAL(5,2), defaultValue: 0 },
  transport_id: { type: DataTypes.INTEGER },
  lr_no: { type: DataTypes.STRING },
  lr_date: { type: DataTypes.DATEONLY },
  vehicle_no: { type: DataTypes.STRING },
  removal_time: { type: DataTypes.DATE },
  agent_name: { type: DataTypes.STRING },
  pay_mode: { type: DataTypes.STRING },
  remarks: { type: DataTypes.TEXT },
  assessable_value: { type: DataTypes.DECIMAL(15,2), defaultValue: 0 },
  charity: { type: DataTypes.DECIMAL(15,2), defaultValue: 0 },
  vat_tax: { type: DataTypes.DECIMAL(15,2), defaultValue: 0 },
  cenvat: { type: DataTypes.DECIMAL(15,2), defaultValue: 0 },
  duty: { type: DataTypes.DECIMAL(15,2), defaultValue: 0 },
  cess: { type: DataTypes.DECIMAL(15,2), defaultValue: 0 },
  hs_cess: { type: DataTypes.DECIMAL(15,2), defaultValue: 0 },
  tcs: { type: DataTypes.DECIMAL(15,2), defaultValue: 0 },
  discount: { type: DataTypes.DECIMAL(15,2), defaultValue: 0 },
  pf_amount: { type: DataTypes.DECIMAL(15,2), defaultValue: 0 },
  freight: { type: DataTypes.DECIMAL(15,2), defaultValue: 0 },
  gst: { type: DataTypes.DECIMAL(15,2), defaultValue: 0 },
  igst: { type: DataTypes.DECIMAL(15,2), defaultValue: 0 },
  sub_total: { type: DataTypes.DECIMAL(15,2), defaultValue: 0 },
  round_off: { type: DataTypes.DECIMAL(15,2), defaultValue: 0 },
  final_invoice_value: { type: DataTypes.DECIMAL(15,2), defaultValue: 0 }
}, { tableName: 'tbl_DepotSalesHeaders' });

const DepotSalesDetail = sequelize.define('DepotSalesDetail', {
  depot_sales_id: { type: DataTypes.INTEGER },
  order_no: { type: DataTypes.STRING },
  product_id: { type: DataTypes.INTEGER },
  packs: { type: DataTypes.DECIMAL(10,2) },
  packing_type: { type: DataTypes.STRING },
  total_kgs: { type: DataTypes.DECIMAL(15,3) },
  avg_content: { type: DataTypes.DECIMAL(10,2) }
}, { tableName: 'tbl_DepotSalesDetails' });

/**
 * ==========================================
 * 5. OTHER MODELS
 * ==========================================
 */
const RG1Production = sequelize.define('RG1Production', {
  date: { type: DataTypes.DATEONLY, allowNull: false },
  product_id: { type: DataTypes.INTEGER },
  packing_type_id: { type: DataTypes.INTEGER, allowNull: false },
  weight_per_bag: { type: DataTypes.DECIMAL(10, 3), defaultValue: 0 },
  prev_closing_kgs: { type: DataTypes.DECIMAL(15, 3), defaultValue: 0 },
  production_kgs: { type: DataTypes.DECIMAL(15, 3), defaultValue: 0 },
  invoice_kgs: { type: DataTypes.DECIMAL(15, 3), defaultValue: 0 },
  stock_kgs: { type: DataTypes.DECIMAL(15, 3), defaultValue: 0 },
  stock_bags: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
  stock_loose_kgs: { type: DataTypes.DECIMAL(15, 3), defaultValue: 0 }
}, { tableName: 'tbl_RG1Productions', timestamps: true });

const InvoiceType = sequelize.define('InvoiceType', {
  code: { type: DataTypes.STRING },
  type_name: { type: DataTypes.STRING },
  sales_type: { type: DataTypes.STRING },
  gst_val: { type: DataTypes.STRING }
}, { tableName: 'tbl_InvoiceTypes' });

const DespatchEntry = sequelize.define('DespatchEntry', {
  load_no: { type: DataTypes.STRING },
  vehicle_no: { type: DataTypes.STRING },
  transport_id: { type: DataTypes.INTEGER },
  no_of_bags: { type: DataTypes.DECIMAL(10, 2) },
  freight: { type: DataTypes.DECIMAL(12, 2) }
}, { tableName: 'tbl_DespatchEntries' });

/**
 * ==========================================
 * 6. ASSOCIATIONS (RELATIONSHIPS)
 * ==========================================
 */

// Product -> Tariff
Product.belongsTo(TariffSubHead, { foreignKey: 'tariff_id' });

// Depot Received Associations (Opening Stock & Inward Logs)
DepotReceived.belongsTo(Account, { foreignKey: 'depot_id', as: 'Depot' });
DepotReceived.belongsTo(Product, { foreignKey: 'product_id', as: 'Product' }); // ✅ NEW

// Depot Sales Associations
DepotSalesHeader.belongsTo(Account, { foreignKey: 'party_id', as: 'Party' });
DepotSalesHeader.belongsTo(Account, { foreignKey: 'depot_id', as: 'Depot' });
DepotSalesHeader.belongsTo(Transport, { foreignKey: 'transport_id' });
DepotSalesHeader.hasMany(DepotSalesDetail, { foreignKey: 'depot_sales_id', onDelete: 'CASCADE' });
DepotSalesDetail.belongsTo(Product, { foreignKey: 'product_id' });

// Order Associations
OrderHeader.belongsTo(Account, { foreignKey: 'party_id', as: 'Party' });
OrderHeader.belongsTo(Broker, { foreignKey: 'broker_id', as: 'Broker' });
OrderHeader.hasMany(OrderDetail, { foreignKey: 'order_id', onDelete: 'CASCADE' });
OrderDetail.belongsTo(Product, { foreignKey: 'product_id' });

// Invoice WITH Order Associations
InvoiceHeader.belongsTo(Account, { foreignKey: 'party_id', as: 'Party' });
InvoiceHeader.belongsTo(Transport, { foreignKey: 'transport_id' });
InvoiceHeader.hasMany(InvoiceDetail, { foreignKey: 'invoice_id', onDelete: 'CASCADE' });
// ADD THIS LINE
InvoiceDetail.belongsTo(InvoiceHeader, { foreignKey: 'invoice_id' });
InvoiceDetail.belongsTo(Product, { foreignKey: 'product_id' });
DepotSalesDetail.belongsTo(DepotSalesHeader, { foreignKey: 'depot_sales_id' });

// DIRECT Invoice Associations
DirectInvoiceHeader.belongsTo(Account, { foreignKey: 'party_id', as: 'Party' });
DirectInvoiceHeader.belongsTo(Broker, { foreignKey: 'broker_id', as: 'Broker' });
DirectInvoiceHeader.hasMany(DirectInvoiceDetail, { foreignKey: 'direct_invoice_id', as: 'OrderDetails', onDelete: 'CASCADE' });
DirectInvoiceDetail.belongsTo(Product, { foreignKey: 'product_id', as: 'Product' });
DirectInvoiceDetail.belongsTo(DirectInvoiceHeader, { foreignKey: 'direct_invoice_id', as: 'Header' });

// Production Associations
RG1Production.belongsTo(Product, { foreignKey: 'product_id' });
RG1Production.belongsTo(PackingType, { foreignKey: 'packing_type_id' });

// Despatch
DespatchEntry.belongsTo(Transport, { foreignKey: 'transport_id' });

module.exports = {
  sequelize, TariffSubHead, PackingType, Broker, Transport, Account,
  Product, OrderHeader, OrderDetail, RG1Production,
  InvoiceHeader, InvoiceDetail, DirectInvoiceHeader, DirectInvoiceDetail, 
  DepotReceived, InvoiceType, DespatchEntry, DepotSalesHeader, DepotSalesDetail
};