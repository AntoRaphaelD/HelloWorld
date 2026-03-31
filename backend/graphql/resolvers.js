const {
  Account, Broker, Transport, TariffSubHead, PackingType, InvoiceType, Product,
  OrderHeader, OrderDetail, InvoiceHeader, InvoiceDetail,
  DirectInvoiceHeader, DirectInvoiceDetail, DepotReceived,
  DepotSalesHeader, DepotSalesDetail, RG1Production, DespatchEntry
} = require('../models');

const resolvers = {
  Query: {
    // Masters
    getAccounts: async () => await Account.findAll(),
    getBrokers: async () => await Broker.findAll(),
    getTransports: async () => await Transport.findAll(),
    getTariffSubHeads: async () => await TariffSubHead.findAll(),
    getPackingTypes: async () => await PackingType.findAll(),
    getInvoiceTypes: async () => await InvoiceType.findAll(),
    getProducts: async () => await Product.findAll(),

    // Transactions
    getOrderHeaders: async () => await OrderHeader.findAll({
      include: [
        { model: Account, as: 'Party' },
        { model: Broker, as: 'Broker' },
        { model: OrderDetail, as: 'OrderDetails', include: [Product] }
      ]
    }),
    getInvoiceHeaders: async () => await InvoiceHeader.findAll({
      include: [
        { model: Account, as: 'Party' },
        { model: Broker, as: 'Broker' },
        { model: Transport },
        { model: DespatchEntry },
        { model: InvoiceType },
        { model: InvoiceDetail, include: [Product] }
      ]
    }),
    getDirectInvoiceHeaders: async () => await DirectInvoiceHeader.findAll({
      include: [
        { model: Account, as: 'Party' },
        { model: Broker, as: 'Broker' },
        { model: DirectInvoiceDetail, as: 'DirectInvoiceDetails', include: [{ model: Product, as: 'Product' }] }
      ]
    }),
    getDepotReceived: async () => await DepotReceived.findAll({
      include: [
        { model: Account, as: 'Depot' },
        { model: Product, as: 'Product' }
      ]
    }),
    getDepotSalesHeaders: async () => await DepotSalesHeader.findAll({
      include: [
        { model: Account, as: 'Party' },
        { model: Account, as: 'Depot' },
        { model: Broker, as: 'Broker' },
        { model: Transport },
        { model: DepotSalesDetail, as: 'DepotSalesDetails', include: [{ model: Product, as: 'Product' }] }
      ]
    }),
    getRG1Productions: async () => await RG1Production.findAll({
      include: [
        { model: Product },
        { model: PackingType }
      ]
    }),
    getDespatchEntries: async () => await DespatchEntry.findAll({
      include: [Transport]
    }),

    // Custom queries
    getDepotInventory: async (_, { depotId }) => {
      const id = Number(depotId);
      const products = await Product.findAll({
        include: [{ model: TariffSubHead }]
      });

      const data = await Promise.all(products.map(async (p) => {
        const inward = await DepotReceived.sum('total_kgs', {
          where: {
            depot_id: id,
            product_id: p.id
          }
        }) || 0;

        const outward = await DepotSalesDetail.sum('total_kgs', {
          include: [{
            model: DepotSalesHeader,
            attributes: [],
            required: true,
            where: { depot_id: id }
          }],
          where: { product_id: p.id }
        }) || 0;

        const stock = Number(inward) - Number(outward);
        return {
          ...p.toJSON(),
          depot_stock: stock > 0 ? stock : 0
        };
      }));

      return data;
    },

    // Single records
    getAccount: async (_, { id }) => await Account.findByPk(id),
    getBroker: async (_, { id }) => await Broker.findByPk(id),
    getTransport: async (_, { id }) => await Transport.findByPk(id),
    getProduct: async (_, { id }) => await Product.findByPk(id),
    getOrderHeader: async (_, { id }) => await OrderHeader.findByPk(id, {
      include: [
        { model: Account, as: 'Party' },
        { model: Broker, as: 'Broker' },
        { model: OrderDetail, as: 'OrderDetails', include: [Product] }
      ]
    }),
    getInvoiceHeader: async (_, { id }) => await InvoiceHeader.findByPk(id, {
      include: [
        { model: Account, as: 'Party' },
        { model: Broker, as: 'Broker' },
        { model: Transport },
        { model: DespatchEntry },
        { model: InvoiceType },
        { model: InvoiceDetail, include: [Product] }
      ]
    }),
    getDepotSalesHeader: async (_, { id }) => await DepotSalesHeader.findByPk(id, {
      include: [
        { model: Account, as: 'Party' },
        { model: Account, as: 'Depot' },
        { model: Broker, as: 'Broker' },
        { model: Transport },
        { model: DepotSalesDetail, as: 'DepotSalesDetails', include: [{ model: Product, as: 'Product' }] }
      ]
    }),
    getDespatchEntry: async (_, { id }) => await DespatchEntry.findByPk(id, {
      include: [Transport]
    }),
  },

  Mutation: {
    // Account mutations
    createAccount: async (_, { input }) => await Account.create(input),
    updateAccount: async (_, { id, input }) => {
      const account = await Account.findByPk(id);
      if (!account) throw new Error("Account not found");
      await account.update(input);
      return account;
    },
    deleteAccount: async (_, { id }) => {
      const result = await Account.destroy({ where: { id } });
      return result > 0;
    },

    // Broker mutations
    createBroker: async (_, { input }) => await Broker.create(input),
    updateBroker: async (_, { id, input }) => {
      const broker = await Broker.findByPk(id);
      if (!broker) throw new Error("Broker not found");
      await broker.update(input);
      return broker;
    },
    deleteBroker: async (_, { id }) => {
      const result = await Broker.destroy({ where: { id } });
      return result > 0;
    },

    // Transport mutations
    createTransport: async (_, { input }) => await Transport.create(input),
    updateTransport: async (_, { id, input }) => {
      const transport = await Transport.findByPk(id);
      if (!transport) throw new Error("Transport not found");
      await transport.update(input);
      return transport;
    },
    deleteTransport: async (_, { id }) => {
      const result = await Transport.destroy({ where: { id } });
      return result > 0;
    },

    // Tariff Sub Head mutations
    createTariffSubHead: async (_, { input }) => await TariffSubHead.create(input),
    updateTariffSubHead: async (_, { id, input }) => {
      const tariff = await TariffSubHead.findByPk(id);
      if (!tariff) throw new Error("Tariff Sub Head not found");
      await tariff.update(input);
      return tariff;
    },
    deleteTariffSubHead: async (_, { id }) => {
      const result = await TariffSubHead.destroy({ where: { id } });
      return result > 0;
    },

    // Packing Type mutations
    createPackingType: async (_, { input }) => await PackingType.create(input),
    updatePackingType: async (_, { id, input }) => {
      const packingType = await PackingType.findByPk(id);
      if (!packingType) throw new Error("Packing Type not found");
      await packingType.update(input);
      return packingType;
    },
    deletePackingType: async (_, { id }) => {
      const result = await PackingType.destroy({ where: { id } });
      return result > 0;
    },

    // Invoice Type mutations
    createInvoiceType: async (_, { input }) => await InvoiceType.create(input),
    updateInvoiceType: async (_, { id, input }) => {
      const invoiceType = await InvoiceType.findByPk(id);
      if (!invoiceType) throw new Error("Invoice Type not found");
      await invoiceType.update(input);
      return invoiceType;
    },
    deleteInvoiceType: async (_, { id }) => {
      const result = await InvoiceType.destroy({ where: { id } });
      return result > 0;
    },

    // Product mutations
    createProduct: async (_, { input }) => await Product.create(input),
    updateProduct: async (_, { id, input }) => {
      const product = await Product.findByPk(id);
      if (!product) throw new Error("Product not found");
      await product.update(input);
      return product;
    },
    deleteProduct: async (_, { id }) => {
      const result = await Product.destroy({ where: { id } });
      return result > 0;
    },
    updateMillStock: async (_, { productId, amount }) => {
      const product = await Product.findByPk(productId);
      if (!product) throw new Error("Product not found");
      product.mill_stock += amount;
      await product.save();
      return product;
    },

    // Order mutations
    createOrderHeader: async (_, { input }) => {
      const detailsInput = input.OrderDetails || input.Details || [];
      const { OrderDetails, Details, account_id, ...restHeader } = input;
      const headerData = {
        ...restHeader,
        party_id: restHeader.party_id || account_id || null
      };
      const header = await OrderHeader.create(headerData);
      if (detailsInput && detailsInput.length > 0) {
        const details = detailsInput.map(detail => ({ ...detail, order_id: header.id }));
        await OrderDetail.bulkCreate(details);
      }
      return header;
    },
    updateOrderHeader: async (_, { id, input }) => {
      const detailsInput = input.OrderDetails || input.Details;
      const { OrderDetails, Details, account_id, ...restHeader } = input;
      const headerData = {
        ...restHeader,
        party_id: restHeader.party_id || account_id || null
      };
      const header = await OrderHeader.findByPk(id);
      if (!header) throw new Error("Order not found");
      await header.update(headerData);
      if (detailsInput) {
        await OrderDetail.destroy({ where: { order_id: id } });
        if (detailsInput.length > 0) {
          const details = detailsInput.map(detail => ({ ...detail, order_id: id }));
          await OrderDetail.bulkCreate(details);
        }
      }
      return header;
    },
    deleteOrderHeader: async (_, { id }) => {
      const result = await OrderHeader.destroy({ where: { id } });
      return result > 0;
    },

    // Invoice mutations
    createInvoiceHeader: async (_, { input }) => await InvoiceHeader.create(input),
    updateInvoiceHeader: async (_, { id, input }) => {
      const invoice = await InvoiceHeader.findByPk(id);
      if (!invoice) throw new Error("Invoice not found");
      await invoice.update(input);
      return invoice;
    },
    deleteInvoiceHeader: async (_, { id }) => {
      const result = await InvoiceHeader.destroy({ where: { id } });
      return result > 0;
    },

    // Direct Invoice mutations
    createDirectInvoiceHeader: async (_, { input }) => {
      const { DirectInvoiceDetails, ...headerData } = input;
      const header = await DirectInvoiceHeader.create(headerData);
      if (DirectInvoiceDetails && DirectInvoiceDetails.length > 0) {
        const details = DirectInvoiceDetails.map(detail => ({ ...detail, direct_invoice_id: header.id }));
        await DirectInvoiceDetail.bulkCreate(details);
      }
      return header;
    },
    updateDirectInvoiceHeader: async (_, { id, input }) => {
      const { DirectInvoiceDetails, ...headerData } = input;
      const header = await DirectInvoiceHeader.findByPk(id);
      if (!header) throw new Error("Direct Invoice not found");
      await header.update(headerData);
      if (DirectInvoiceDetails) {
        await DirectInvoiceDetail.destroy({ where: { direct_invoice_id: id } });
        if (DirectInvoiceDetails.length > 0) {
          const details = DirectInvoiceDetails.map(detail => ({ ...detail, direct_invoice_id: id }));
          await DirectInvoiceDetail.bulkCreate(details);
        }
      }
      return header;
    },
    deleteDirectInvoiceHeader: async (_, { id }) => {
      const result = await DirectInvoiceHeader.destroy({ where: { id } });
      return result > 0;
    },

    // Depot Sales mutations
    createDepotSalesHeader: async (_, { input }) => {
      const { Details, ...headerData } = input;
      const header = await DepotSalesHeader.create(headerData);
      if (Details && Details.length > 0) {
        const rows = Details.map(detail => ({ ...detail, depot_sales_id: header.id }));
        await DepotSalesDetail.bulkCreate(rows);
      }
      return header;
    },
    updateDepotSalesHeader: async (_, { id, input }) => {
      const { Details, ...headerData } = input;
      const depotSales = await DepotSalesHeader.findByPk(id);
      if (!depotSales) throw new Error("Depot Sales not found");
      await depotSales.update(headerData);
      if (Details) {
        await DepotSalesDetail.destroy({ where: { depot_sales_id: id } });
        if (Details.length > 0) {
          const rows = Details.map(detail => ({ ...detail, depot_sales_id: id }));
          await DepotSalesDetail.bulkCreate(rows);
        }
      }
      return depotSales;
    },
    deleteDepotSalesHeader: async (_, { id }) => {
      const result = await DepotSalesHeader.destroy({ where: { id } });
      return result > 0;
    },

    // Despatch mutations
    createDespatchEntry: async (_, { input }) => await DespatchEntry.create(input),
    updateDespatchEntry: async (_, { id, input }) => {
      const despatch = await DespatchEntry.findByPk(id);
      if (!despatch) throw new Error("Despatch Entry not found");
      await despatch.update(input);
      return despatch;
    },
    deleteDespatchEntry: async (_, { id }) => {
      const result = await DespatchEntry.destroy({ where: { id } });
      return result > 0;
    },

    // Backward-compatible aliases used by frontend screens
    createDespatch: async (_, { input }) => await DespatchEntry.create(input),
    updateDespatch: async (_, { id, input }) => {
      const despatch = await DespatchEntry.findByPk(id);
      if (!despatch) throw new Error("Despatch Entry not found");
      await despatch.update(input);
      return despatch;
    },
    deleteDespatch: async (_, { id }) => {
      const result = await DespatchEntry.destroy({ where: { id } });
      return result > 0;
    },
  }
};

module.exports = resolvers;
