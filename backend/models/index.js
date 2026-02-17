const { Sequelize, DataTypes } = require('sequelize');
const sequelize = require('../config/database');

/**
 * ==========================================
 * 1. MASTER MODELS
 * ==========================================
 */

const TariffSubHead = sequelize.define('TariffSubHead', {
  tariff_code: { type: DataTypes.STRING, unique: true },
  tariff_name: { type: DataTypes.STRING },
  tariff_no: { type: DataTypes.STRING }, // HSN Code
  product_type: { type: DataTypes.STRING, defaultValue: 'CONE' },
  commodity: { type: DataTypes.STRING, defaultValue: 'COTTON' },
  fibre: { type: DataTypes.STRING, defaultValue: 'COTTON' },
  yarn_type: { type: DataTypes.STRING, defaultValue: 'SINGLE' }
}, { tableName: 'tbl_TariffSubHeads' });

const PackingType = sequelize.define('PackingType', {
    // packing_code: {type: DataTypes.STRING, unique: true, allowNull: false },
    packing_type: {type: DataTypes.STRING, allowNull: false }
}, { tableName: 'tbl_PackingTypes' });

const Broker = sequelize.define('Broker', {
  broker_code: { type: DataTypes.STRING, unique: true },
  broker_name: { type: DataTypes.STRING, allowNull: false },
  address: { type: DataTypes.TEXT },
  commission_pct: { type: DataTypes.DECIMAL(5, 2), defaultValue: 0 },
  is_comm_per_kg: { type: DataTypes.BOOLEAN, defaultValue: false }
}, { tableName: 'tbl_Brokers' });

const Transport = sequelize.define('Transport', {
  transport_code: { type: DataTypes.STRING, unique: true },
  transport_name: { type: DataTypes.STRING, allowNull: false },
  place: { type: DataTypes.STRING }
}, { tableName: 'tbl_Transports' });

const Account = sequelize.define('Account', {
  account_code: { type: DataTypes.STRING, unique: true },
  account_group: { type: DataTypes.STRING },
  account_name: { type: DataTypes.STRING, allowNull: false },
  place: { type: DataTypes.STRING },
  address: { type: DataTypes.TEXT }, // Changed to TEXT for multiple lines
  pincode: { type: DataTypes.STRING },
  state: { type: DataTypes.STRING },
  delivery_address: { type: DataTypes.TEXT },
  tin_no: { type: DataTypes.STRING },
  cst_no: { type: DataTypes.STRING },
  phone_no: { type: DataTypes.STRING },
  email: { type: DataTypes.STRING },
  fax: { type: DataTypes.STRING },
  website: { type: DataTypes.STRING },
  bank_account_no: { type: DataTypes.STRING },
  contact_person: { type: DataTypes.STRING },
  cell_no: { type: DataTypes.STRING },
  gst_no: { type: DataTypes.STRING },
  opening_credit: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  opening_debit: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 }
}, { tableName: 'tbl_Accounts' });

const Product = sequelize.define('Product', {
  product_code: { type: DataTypes.STRING, unique: true },
  product_name: { type: DataTypes.STRING, allowNull: false },
  wt_per_cone: { type: DataTypes.DECIMAL(10, 3) },
  mill_stock: { type: DataTypes.DECIMAL(15, 3), defaultValue: 0 }, // Stock at the Mill
}, { tableName: 'tbl_Products' });

/**
 * ==========================================
 * 2. TRANSACTION MODELS
 * ==========================================
 */

const OrderHeader = sequelize.define('OrderHeader', {
  order_no: { type: DataTypes.STRING, unique: true },
  date: { type: DataTypes.DATEONLY },
  is_with_order: { type: DataTypes.BOOLEAN, defaultValue: true },
  is_cancelled: { type: DataTypes.BOOLEAN, defaultValue: false },
  status: { type: DataTypes.STRING, defaultValue: 'OPEN' }
}, { tableName: 'tbl_OrderHeaders' });

const OrderDetail = sequelize.define('OrderDetail', {
  product_id: { type: DataTypes.INTEGER },
  qty: { type: DataTypes.DECIMAL(12, 2) },
  rate_cr: { type: DataTypes.DECIMAL(12, 2) }
}, { tableName: 'tbl_OrderDetails' });

const RG1Production = sequelize.define('RG1Production', {
  date: { type: DataTypes.DATEONLY },
  production_kgs: { type: DataTypes.DECIMAL(15, 3) },
  stock_kgs: { type: DataTypes.DECIMAL(15, 3) } // Daily calculated closing
}, { tableName: 'tbl_RG1Productions' });

const DespatchEntry = sequelize.define('DespatchEntry', {
  load_no: { type: DataTypes.STRING },
  vehicle_no: { type: DataTypes.STRING },
  lr_no: { type: DataTypes.STRING },
  no_of_bags: { type: DataTypes.DECIMAL(10, 2) },
  freight: { type: DataTypes.DECIMAL(12, 2) }
}, { tableName: 'tbl_DespatchEntries' });

const InvoiceHeader = sequelize.define('InvoiceHeader', {
  invoice_no: { type: DataTypes.STRING, unique: true },
  date: { type: DataTypes.DATEONLY },
  invoice_type: { type: DataTypes.STRING }, // 'Local', 'Depot Transfer', etc.
  is_approved: { type: DataTypes.BOOLEAN, defaultValue: false },
  final_invoice_value: { type: DataTypes.DECIMAL(15, 2) }
}, { tableName: 'tbl_InvoiceHeaders' });

const InvoiceDetail = sequelize.define('InvoiceDetail', {
  product_id: { type: DataTypes.INTEGER },
  total_kgs: { type: DataTypes.DECIMAL(15, 3) },
  rate: { type: DataTypes.DECIMAL(12, 2) }
}, { tableName: 'tbl_InvoiceDetails' });

const DepotReceived = sequelize.define('DepotReceived', {
  code: { type: DataTypes.STRING },
  date: { type: DataTypes.DATEONLY },
  received_inv_from: { type: DataTypes.STRING },
  received_inv_to: { type: DataTypes.STRING }
}, { tableName: 'tbl_DepotReceived' });

const DepotStock = sequelize.define('DepotStock', {
  depot_id: { type: DataTypes.INTEGER },
  product_id: { type: DataTypes.INTEGER },
  balance_qty: { type: DataTypes.DECIMAL(15, 3), defaultValue: 0 }
}, { tableName: 'tbl_DepotStock' });

const InvoiceType = sequelize.define('InvoiceType', {
  type_name: { type: DataTypes.STRING },
  is_gst_enabled: { type: DataTypes.BOOLEAN, defaultValue: true }
}, { tableName: 'tbl_InvoiceTypes' });

/**
 * ==========================================
 * 3. ASSOCIATIONS
 * ==========================================
 */

// Product relations
TariffSubHead.hasMany(Product, { foreignKey: 'tariff_id' });
Product.belongsTo(TariffSubHead, { foreignKey: 'tariff_id' });

// Order relations
Account.hasMany(OrderHeader, { foreignKey: 'party_id' });
OrderHeader.belongsTo(Account, { foreignKey: 'party_id', as: 'Party' });
OrderHeader.hasMany(OrderDetail, { foreignKey: 'order_id', onDelete: 'CASCADE' });
OrderDetail.belongsTo(Product, { foreignKey: 'product_id' });

// Production relations
Product.hasMany(RG1Production, { foreignKey: 'product_id' });
RG1Production.belongsTo(Product, { foreignKey: 'product_id' });

Transport.hasMany(InvoiceHeader, { foreignKey: 'transport_id' });
InvoiceHeader.belongsTo(Transport, { foreignKey: 'transport_id' });

// Invoice relations
Account.hasMany(InvoiceHeader, { foreignKey: 'party_id' });
InvoiceHeader.belongsTo(Account, { foreignKey: 'party_id', as: 'Party' });
InvoiceHeader.hasMany(InvoiceDetail, { foreignKey: 'invoice_id', onDelete: 'CASCADE' });
InvoiceDetail.belongsTo(Product, { foreignKey: 'product_id' });

// Depot Stock relations
Account.hasMany(DepotStock, { foreignKey: 'depot_id' });
Product.hasMany(DepotStock, { foreignKey: 'product_id' });
DepotStock.belongsTo(Account, { foreignKey: 'depot_id', as: 'Depot' });

// Depot Received relations
Account.hasMany(DepotReceived, { foreignKey: 'depot_id' });
DepotReceived.belongsTo(Account, { foreignKey: 'depot_id', as: 'Depot' });

module.exports = {
  sequelize, TariffSubHead, PackingType, Broker, Transport, Account,
  Product, OrderHeader, OrderDetail, RG1Production, DespatchEntry,
  InvoiceHeader, InvoiceDetail, DepotReceived, DepotStock, InvoiceType
};