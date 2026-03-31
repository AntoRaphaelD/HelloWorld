const { gql } = require('apollo-server-express');

const typeDefs = gql`
  type Account {
    id: ID!
    account_code: String
    account_name: String
    place: String
    gst_no: String
    phone_no: String
    main_group: String
    primary_group: String
    account_group: String
    addr1: String
    addr2: String
    addr3: String
    del1: String
    del2: String
    del3: String
    pincode: String
    state: String
    tin_no: String
    cst_no: String
    email: String
    fax: String
    website: String
    account_no: String
    contact_person: String
    cell_no: String
    opening_credit: Float
    opening_debit: Float
  }

  type Broker {
    id: ID!
    broker_code: String
    broker_name: String
    address: String
    commission_pct: Float
    is_comm_per_kg: Boolean
  }

  type Transport {
    id: ID!
    transport_code: String
    transport_name: String
    place: String
    address: String
  }

  type TariffSubHead {
    id: ID!
    tariff_code: String
    tariff_name: String
    tariff_no: String
    product_type: String
    commodity: String
    fibre: String
    yarn_type: String
  }

  type PackingType {
    id: ID!
    packing_type: String
  }

  type InvoiceType {
    id: ID!
    code: String
    type_name: String
    sales_type: String
    group_name: String
    is_option_ii: Boolean
    round_off_digits: Int
    account_posting: Boolean
    assess_checked: Boolean
    assess_formula: String
    assess_account: String
    charity_checked: Boolean
    charity_value: Float
    charity_formula: String
    charity_account: String
    vat_checked: Boolean
    vat_percentage: Float
    vat_formula: String
    vat_account: String
    duty_checked: Boolean
    duty_percentage: Float
    duty_formula: String
    duty_account: String
    cess_checked: Boolean
    cess_percentage: Float
    cess_formula: String
    cess_account: String
    hr_sec_cess_checked: Boolean
    hr_sec_cess_percentage: Float
    hr_sec_cess_formula: String
    hr_sec_cess_account: String
    tcs_checked: Boolean
    tcs_percentage: Float
    tcs_formula: String
    tcs_account: String
    cst_checked: Boolean
    cst_percentage: Float
    cst_formula: String
    cst_account: String
    cenvat_checked: Boolean
    cenvat_percentage: Float
    cenvat_formula: String
    cenvat_account: String
    gst_checked: Boolean
    gst_percentage: Float
    gst_formula: String
    gst_account: String
    sgst_checked: Boolean
    sgst_percentage: Float
    sgst_formula: String
    sgst_account: String
    cgst_checked: Boolean
    cgst_percentage: Float
    cgst_formula: String
    cgst_account: String
    igst_checked: Boolean
    igst_percentage: Float
    igst_formula: String
    igst_account: String
    sub_total_formula: String
    total_value_formula: String
    round_off_formula: String
    round_off_direction: String
    round_off_account: String
    lorry_freight_account: String
  }

  type Product {
    id: ID!
    product_code: String
    product_name: String
    mill_stock: Float
    tariff_sub_head: String
    short_description: String
    commodity: String
    commodity_code: String
    fibre: String
    packing_type: String
    wt_per_cone: Float
    no_of_cones_per_pack: Int
    pack_nett_wt: Float
    printing_tariff_sub_head_no: String
    product_type: String
    spinning_count_name: String
    converted_factor_40s: Float
    actual_count: String
    printing_tariff_desc: String
    charity_rs: Float
    other_receipt: Float
    roundoff: Boolean
  }

  type OrderHeader {
    id: ID!
    order_no: String
    date: String
    place: String
    broker_id: Int
    is_cancelled: Boolean
    status: String
    Party: Account
    Broker: Broker
    OrderDetails: [OrderDetail]
  }

  type OrderDetail {
    id: ID!
    order_id: Int
    product_id: Int
    qty: Float
    bag_wt: Float
    rate_cr: Float
    rate_imm: Float
    rate_per: Float
    packs: Float
    packing_type: String
    Product: Product
  }

  type InvoiceDetail {
    id: ID!
    invoice_id: Int
    order_no: String
    order_type: String
    product_id: Int
    broker_code: String
    broker_percentage: Float
    product_description: String
    packs: Float
    packing_type: String
    total_kgs: Float
    avg_content: Float
    rate: Float
    rate_per: String
    identification_mark: String
    from_no: String
    to_no: String
    resale: Float
    convert_to_hank: Float
    convert_to_cone: Boolean
    assessable_value: Float
    charity_amt: Float
    vat_amt: Float
    cenvat_amt: Float
    duty_amt: Float
    cess_amt: Float
    hr_sec_cess_amt: Float
    gst_amt: Float
    sgst_amt: Float
    cgst_amt: Float
    igst_amt: Float
    tcs_amt: Float
    discount_percentage: Float
    discount_amt: Float
    other_amt: Float
    freight_amt: Float
    vat_per: Float
    cenvat_per: Float
    duty_per: Float
    cess_per: Float
    hcess_per: Float
    gst_per: Float
    sgst_per: Float
    cgst_per: Float
    igst_per: Float
    tcs_per: Float
    sub_total: Float
    rounded_off: Float
    final_value: Float
    Product: Product
  }

  type InvoiceHeader {
    id: ID!
    invoice_no: String
    date: String
    sales_type: String
    load_id: Int
    invoice_type_id: Int
    party_id: Int
    broker_id: Int
    transport_id: Int
    vehicle_no: String
    delivery: String
    address: String
    credit_days: Int
    interest_percentage: Float
    lr_no: String
    lr_date: String
    ebill_no: String
    removal_time: String
    prepare_time: String
    pay_mode: String
    form_j: String
    sales_against: String
    epcg_no: String
    remarks: String
    total_assessable: Float
    total_gst: Float
    is_cancelled: Boolean
    total_charity: Float
    total_vat: Float
    total_cenvat: Float
    total_duty: Float
    total_cess: Float
    total_hr_sec_cess: Float
    total_tcs: Float
    total_sgst: Float
    total_cgst: Float
    total_igst: Float
    total_other: Float
    sub_total: Float
    freight_charges: Float
    round_off: Float
    net_amount: Float
    is_approved: Boolean
    Party: Account
    Broker: Broker
    Transport: Transport
    DespatchEntry: DespatchEntry
    InvoiceType: InvoiceType
    InvoiceDetails: [InvoiceDetail]
  }

  type DirectInvoiceHeader {
    id: ID!
    order_no: String
    date: String
    party_id: Int
    broker_id: Int
    place: String
    vehicle_no: String
    is_cancelled: Boolean
    status: String
    final_invoice_value: Float
    is_depot_inwarded: Boolean
    depot_id: Int
    Party: Account
    Broker: Broker
    DirectInvoiceDetails: [DirectInvoiceDetail]
  }

  type DirectInvoiceDetail {
    id: ID!
    product_id: Int
    qty: Float
    bag_wt: Float
    rate_cr: Float
    rate_imm: Float
    rate_per: Float
    direct_invoice_id: Int
    packing_type: String
    packs: Float
    Product: Product
  }

  type DepotReceived {
    id: ID!
    date: String
    depot_id: Int
    product_id: Int
    invoice_no: String
    total_kgs: Float
    total_bags: Int
    type: String
    remarks: String
    Depot: Account
    Product: Product
  }

  type DepotSalesHeader {
    id: ID!
    invoice_no: String
    date: String
    sales_type: String
    invoice_type_id: Int
    invoice_type: String
    depot_id: Int
    party_id: Int
    broker_id: Int
    addr1: String
    addr2: String
    addr3: String
    credit_days: Int
    interest_pct: Float
    transport_id: Int
    lr_no: String
    lr_date: String
    vehicle_no: String
    removal_time: String
    agent_name: String
    pay_mode: String
    remarks: String
    country: String
    are_no: String
    form_jj: String
    total_assessable: Float
    total_charity: Float
    total_vat: Float
    total_cenvat: Float
    total_duty: Float
    total_cess: Float
    total_hr_sec_cess: Float
    total_gst: Float
    total_sgst: Float
    total_cgst: Float
    total_igst: Float
    total_discount: Float
    total_other: Float
    pf_amount: Float
    freight: Float
    sub_total: Float
    round_off: Float
    final_invoice_value: Float
    Party: Account
    Depot: Account
    Broker: Broker
    Transport: Transport
    DepotSalesDetails: [DepotSalesDetail]
  }

  type DepotSalesDetail {
    id: ID!
    depot_sales_id: Int
    order_no: String
    order_type: String
    product_id: Int
    packs: Float
    packing_type: String
    total_kgs: Float
    avg_content: Float
    broker_code: String
    broker_percentage: Float
    product_description: String
    rate_per: String
    rate: Float
    identification_mark: String
    from_no: String
    to_no: String
    resale: Float
    convert_to_hank: Float
    convert_to_cone: Float
    assessable_value: Float
    charity_amt: Float
    vat_per: Float
    vat_amt: Float
    cenvat_per: Float
    cenvat_amt: Float
    duty_per: Float
    duty_amt: Float
    cess_per: Float
    cess_amt: Float
    hcess_per: Float
    hcess_amt: Float
    gst_per: Float
    gst_amt: Float
    sgst_per: Float
    sgst_amt: Float
    cgst_per: Float
    cgst_amt: Float
    igst_per: Float
    igst_amt: Float
    tcs_per: Float
    tcs_amt: Float
    discount_percentage: Float
    discount_amt: Float
    other_amt: Float
    freight_amt: Float
    sub_total: Float
    rounded_off: Float
    final_value: Float
    Product: Product
  }

  type RG1Production {
    id: ID!
    date: String
    product_id: Int
    packing_type_id: Int
    weight_per_bag: Float
    prev_closing_kgs: Float
    production_kgs: Float
    invoice_kgs: Float
    stock_kgs: Float
    stock_bags: Float
    stock_loose_kgs: Float
    Product: Product
    PackingType: PackingType
  }

  type DespatchEntry {
    id: ID!
    load_no: String
    load_date: String
    transport_id: Int
    lr_no: String
    lr_date: String
    vehicle_no: String
    delivery: String
    insurance_no: String
    in_time: String
    out_time: String
    no_of_bags: Float
    freight: Float
    freight_per_bag: Float
    Transport: Transport
  }

  type DepotInventory {
    id: ID!
    product_name: String
    product_code: String
    depot_stock: Float
    TariffSubHead: TariffSubHead
  }

  type Query {
    # Masters
    getAccounts: [Account]
    getBrokers: [Broker]
    getTransports: [Transport]
    getTariffSubHeads: [TariffSubHead]
    getPackingTypes: [PackingType]
    getInvoiceTypes: [InvoiceType]
    getProducts: [Product]

    # Transactions
    getOrderHeaders: [OrderHeader]
    getInvoiceHeaders: [InvoiceHeader]
    getDirectInvoiceHeaders: [DirectInvoiceHeader]
    getDepotReceived: [DepotReceived]
    getDepotSalesHeaders: [DepotSalesHeader]
    getRG1Productions: [RG1Production]
    getDespatchEntries: [DespatchEntry]

    # Custom queries
    getDepotInventory(depotId: ID!): [DepotInventory]

    # Single records
    getAccount(id: ID!): Account
    getBroker(id: ID!): Broker
    getTransport(id: ID!): Transport
    getProduct(id: ID!): Product
    getOrderHeader(id: ID!): OrderHeader
    getInvoiceHeader(id: ID!): InvoiceHeader
    getDepotSalesHeader(id: ID!): DepotSalesHeader
    getDespatchEntry(id: ID!): DespatchEntry
  }

  # Input types for mutations
  input AccountInput {
    account_code: String
    account_name: String
    place: String
    gst_no: String
    main_group: String
    primary_group: String
    account_group: String
    addr1: String
    addr2: String
    addr3: String
    del1: String
    del2: String
    del3: String
    pincode: String
    state: String
    tin_no: String
    cst_no: String
    phone_no: String
    email: String
    fax: String
    website: String
    account_no: String
    contact_person: String
    cell_no: String
    opening_credit: Float
    opening_debit: Float
  }

  input BrokerInput {
    broker_code: String
    broker_name: String
    address: String
    commission_pct: Float
    is_comm_per_kg: Boolean
  }

  input TransportInput {
    transport_code: String
    transport_name: String
    place: String
    address: String
  }

  input TariffSubHeadInput {
    tariff_code: String
    tariff_name: String
    tariff_no: String
    product_type: String
    commodity: String
    fibre: String
    yarn_type: String
  }

  input PackingTypeInput {
    packing_type: String
  }

  input InvoiceTypeInput {
    code: String
    type_name: String
    sales_type: String
    group_name: String
    is_option_ii: Boolean
    round_off_digits: Int
    account_posting: Boolean
    assess_checked: Boolean
    assess_formula: String
    assess_account: String
    charity_checked: Boolean
    charity_value: Float
    charity_formula: String
    charity_account: String
    vat_checked: Boolean
    vat_percentage: Float
    vat_formula: String
    vat_account: String
    duty_checked: Boolean
    duty_percentage: Float
    duty_formula: String
    duty_account: String
    cess_checked: Boolean
    cess_percentage: Float
    cess_formula: String
    cess_account: String
    hr_sec_cess_checked: Boolean
    hr_sec_cess_percentage: Float
    hr_sec_cess_formula: String
    hr_sec_cess_account: String
    tcs_checked: Boolean
    tcs_percentage: Float
    tcs_formula: String
    tcs_account: String
    cst_checked: Boolean
    cst_percentage: Float
    cst_formula: String
    cst_account: String
    cenvat_checked: Boolean
    cenvat_percentage: Float
    cenvat_formula: String
    cenvat_account: String
    gst_checked: Boolean
    gst_percentage: Float
    gst_formula: String
    gst_account: String
    sgst_checked: Boolean
    sgst_percentage: Float
    sgst_formula: String
    sgst_account: String
    cgst_checked: Boolean
    cgst_percentage: Float
    cgst_formula: String
    cgst_account: String
    igst_checked: Boolean
    igst_percentage: Float
    igst_formula: String
    igst_account: String
    sub_total_formula: String
    total_value_formula: String
    round_off_formula: String
    round_off_direction: String
    round_off_account: String
    lorry_freight_account: String
  }

  input ProductInput {
    product_code: String
    product_name: String
    short_description: String
    commodity: String
    commodity_code: String
    fibre: String
    packing_type: String
    wt_per_cone: Float
    no_of_cones_per_pack: Int
    pack_nett_wt: Float
    tariff_sub_head: String
    printing_tariff_sub_head_no: String
    product_type: String
    spinning_count_name: String
    converted_factor_40s: Float
    actual_count: String
    printing_tariff_desc: String
    charity_rs: Float
    other_receipt: Float
    roundoff: Boolean
    mill_stock: Float
  }

  input OrderHeaderInput {
    order_no: String
    date: String
    place: String
    broker_id: Int
    is_cancelled: Boolean
    status: String
    party_id: Int
    account_id: Int
    is_with_order: Boolean
    OrderDetails: [OrderDetailInput]
    Details: [OrderDetailInput]
  }

  input OrderDetailInput {
    product_id: Int
    qty: Float
    bag_wt: Float
    rate_cr: Float
    rate_imm: Float
    rate_per: Float
    packs: Float
    packing_type: String
  }

  input DirectInvoiceHeaderInput {
    order_no: String
    date: String
    party_id: Int
    broker_id: Int
    place: String
    vehicle_no: String
    is_cancelled: Boolean
    status: String
    final_invoice_value: Float
    is_depot_inwarded: Boolean
    depot_id: Int
    DirectInvoiceDetails: [DirectInvoiceDetailInput]
  }

  input DirectInvoiceDetailInput {
    product_id: Int
    qty: Float
    bag_wt: Float
    rate_cr: Float
    rate_imm: Float
    rate_per: Float
    direct_invoice_id: Int
    packing_type: String
    packs: Float
  }

  input InvoiceHeaderInput {
    invoice_no: String
    date: String
    sales_type: String
    load_id: Int
    invoice_type_id: Int
    party_id: Int
    broker_id: Int
    transport_id: Int
    vehicle_no: String
    delivery: String
    address: String
    credit_days: Int
    interest_percentage: Float
    lr_no: String
    lr_date: String
    ebill_no: String
    removal_time: String
    prepare_time: String
    pay_mode: String
    form_j: String
    sales_against: String
    epcg_no: String
    remarks: String
    total_assessable: Float
    total_gst: Float
    is_cancelled: Boolean
    total_charity: Float
    total_vat: Float
    total_cenvat: Float
    total_duty: Float
    total_cess: Float
    total_hr_sec_cess: Float
    total_tcs: Float
    total_sgst: Float
    total_cgst: Float
    total_igst: Float
    total_other: Float
    sub_total: Float
    freight_charges: Float
    round_off: Float
    net_amount: Float
    is_approved: Boolean
  }

  input DepotSalesHeaderInput {
    invoice_no: String
    date: String
    sales_type: String
    invoice_type_id: Int
    invoice_type: String
    depot_id: Int
    party_id: Int
    broker_id: Int
    addr1: String
    addr2: String
    addr3: String
    credit_days: Int
    interest_pct: Float
    transport_id: Int
    lr_no: String
    lr_date: String
    vehicle_no: String
    removal_time: String
    agent_name: String
    pay_mode: String
    remarks: String
    country: String
    are_no: String
    form_jj: String
    total_assessable: Float
    total_charity: Float
    total_vat: Float
    total_cenvat: Float
    total_duty: Float
    total_cess: Float
    total_hr_sec_cess: Float
    total_gst: Float
    total_sgst: Float
    total_cgst: Float
    total_igst: Float
    total_discount: Float
    total_other: Float
    pf_amount: Float
    freight: Float
    sub_total: Float
    round_off: Float
    final_invoice_value: Float
    Details: [DepotSalesDetailInput]
  }

  input DepotSalesDetailInput {
    order_no: String
    order_type: String
    product_id: Int
    packs: Float
    packing_type: String
    total_kgs: Float
    avg_content: Float
    broker_code: String
    broker_percentage: Float
    product_description: String
    rate_per: String
    rate: Float
    identification_mark: String
    from_no: String
    to_no: String
    resale: Float
    convert_to_hank: Float
    convert_to_cone: Float
    assessable_value: Float
    charity_amt: Float
    vat_per: Float
    vat_amt: Float
    cenvat_per: Float
    cenvat_amt: Float
    duty_per: Float
    duty_amt: Float
    cess_per: Float
    cess_amt: Float
    hcess_per: Float
    hcess_amt: Float
    gst_per: Float
    gst_amt: Float
    sgst_per: Float
    sgst_amt: Float
    cgst_per: Float
    cgst_amt: Float
    igst_per: Float
    igst_amt: Float
    tcs_per: Float
    tcs_amt: Float
    discount_percentage: Float
    discount_amt: Float
    other_amt: Float
    freight_amt: Float
    sub_total: Float
    rounded_off: Float
    final_value: Float
  }

  input DespatchEntryInput {
    load_no: String
    load_date: String
    transport_id: Int
    lr_no: String
    lr_date: String
    vehicle_no: String
    delivery: String
    insurance_no: String
    in_time: String
    out_time: String
    no_of_bags: Float
    freight: Float
    freight_per_bag: Float
  }

  type Mutation {
    # Account mutations
    createAccount(input: AccountInput): Account
    updateAccount(id: ID!, input: AccountInput): Account
    deleteAccount(id: ID!): Boolean

    # Broker mutations
    createBroker(input: BrokerInput): Broker
    updateBroker(id: ID!, input: BrokerInput): Broker
    deleteBroker(id: ID!): Boolean

    # Transport mutations
    createTransport(input: TransportInput): Transport
    updateTransport(id: ID!, input: TransportInput): Transport
    deleteTransport(id: ID!): Boolean

    # Tariff Sub Head mutations
    createTariffSubHead(input: TariffSubHeadInput): TariffSubHead
    updateTariffSubHead(id: ID!, input: TariffSubHeadInput): TariffSubHead
    deleteTariffSubHead(id: ID!): Boolean

    # Packing Type mutations
    createPackingType(input: PackingTypeInput): PackingType
    updatePackingType(id: ID!, input: PackingTypeInput): PackingType
    deletePackingType(id: ID!): Boolean

    # Invoice Type mutations
    createInvoiceType(input: InvoiceTypeInput): InvoiceType
    updateInvoiceType(id: ID!, input: InvoiceTypeInput): InvoiceType
    deleteInvoiceType(id: ID!): Boolean

    # Product mutations
    createProduct(input: ProductInput): Product
    updateProduct(id: ID!, input: ProductInput): Product
    deleteProduct(id: ID!): Boolean
    updateMillStock(productId: ID!, amount: Float!): Product

    # Order mutations
    createOrderHeader(input: OrderHeaderInput): OrderHeader
    updateOrderHeader(id: ID!, input: OrderHeaderInput): OrderHeader
    deleteOrderHeader(id: ID!): Boolean

    # Invoice mutations
    createInvoiceHeader(input: InvoiceHeaderInput): InvoiceHeader
    updateInvoiceHeader(id: ID!, input: InvoiceHeaderInput): InvoiceHeader
    deleteInvoiceHeader(id: ID!): Boolean

    # Direct Invoice mutations
    createDirectInvoiceHeader(input: DirectInvoiceHeaderInput): DirectInvoiceHeader
    updateDirectInvoiceHeader(id: ID!, input: DirectInvoiceHeaderInput): DirectInvoiceHeader
    deleteDirectInvoiceHeader(id: ID!): Boolean

    # Depot Sales mutations
    createDepotSalesHeader(input: DepotSalesHeaderInput): DepotSalesHeader
    updateDepotSalesHeader(id: ID!, input: DepotSalesHeaderInput): DepotSalesHeader
    deleteDepotSalesHeader(id: ID!): Boolean

    # Despatch mutations
    createDespatchEntry(input: DespatchEntryInput): DespatchEntry
    updateDespatchEntry(id: ID!, input: DespatchEntryInput): DespatchEntry
    deleteDespatchEntry(id: ID!): Boolean

    # Backward-compatible aliases used by frontend screens
    createDespatch(input: DespatchEntryInput): DespatchEntry
    updateDespatch(id: ID!, input: DespatchEntryInput): DespatchEntry
    deleteDespatch(id: ID!): Boolean
  }
`;

module.exports = typeDefs;
