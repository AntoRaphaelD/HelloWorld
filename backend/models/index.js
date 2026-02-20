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
  status: { type: DataTypes.STRING, defaultValue: 'OPEN' }
}, { tableName: 'tbl_OrderHeaders' });

const OrderDetail = sequelize.define('OrderDetail', {
  qty: { type: DataTypes.DECIMAL(12, 2) },
  rate_cr: { type: DataTypes.DECIMAL(12, 2) }
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
  invoice_no: { type: DataTypes.STRING, unique: true },
  date: { type: DataTypes.DATEONLY },
  vehicle_no: { type: DataTypes.STRING },
  final_invoice_value: { type: DataTypes.DECIMAL(15, 2) }
}, { tableName: 'tbl_DirectInvoiceHeaders' });

const DirectInvoiceDetail = sequelize.define('DirectInvoiceDetail', {
  total_kgs: { type: DataTypes.DECIMAL(15, 3) },
  rate: { type: DataTypes.DECIMAL(12, 2) }
}, { tableName: 'tbl_DirectInvoiceDetails' });

/**
 * ==========================================
 * 4. OTHER MODELS
 * ==========================================
 */
const RG1Production = sequelize.define('RG1Production', {
  date: { type: DataTypes.DATEONLY },
  production_kgs: { type: DataTypes.DECIMAL(15, 3) }
}, { tableName: 'tbl_RG1Productions' });

const DepotReceived = sequelize.define('DepotReceived', {
  date: { type: DataTypes.DATEONLY },
  remarks: { type: DataTypes.STRING }
}, { tableName: 'tbl_DepotReceived' });

const InvoiceType = sequelize.define('InvoiceType', {
  type_name: { type: DataTypes.STRING }
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

// DIRECT Invoice (WITHOUT ORDER) Associations
Account.hasMany(DirectInvoiceHeader, { foreignKey: 'party_id' });
DirectInvoiceHeader.belongsTo(Account, { foreignKey: 'party_id', as: 'Party' });
DirectInvoiceHeader.hasMany(DirectInvoiceDetail, { foreignKey: 'direct_invoice_id', onDelete: 'CASCADE' });
DirectInvoiceDetail.belongsTo(DirectInvoiceHeader, { foreignKey: 'direct_invoice_id' });
DirectInvoiceDetail.belongsTo(Product, { foreignKey: 'product_id' });

// Production
Product.hasMany(RG1Production, { foreignKey: 'product_id' });
RG1Production.belongsTo(Product, { foreignKey: 'product_id' });

Transport.hasMany(DespatchEntry, { foreignKey: 'transport_id' });
DespatchEntry.belongsTo(Transport, { foreignKey: 'transport_id' });

Transport.hasMany(InvoiceHeader, { foreignKey: 'transport_id' });
InvoiceHeader.belongsTo(Transport, { foreignKey: 'transport_id' });

module.exports = {
  sequelize, TariffSubHead, PackingType, Broker, Transport, Account,
  Product, OrderHeader, OrderDetail, RG1Production,
  InvoiceHeader, InvoiceDetail, DirectInvoiceHeader, DirectInvoiceDetail, 
  DepotReceived, InvoiceType, DespatchEntry
};