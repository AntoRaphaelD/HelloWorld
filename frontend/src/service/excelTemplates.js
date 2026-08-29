import * as XLSX from 'xlsx';

const downloadExcel = (data, filename) => {
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
    XLSX.writeFile(wb, filename);
};

export const downloadOrderTemplate = () => {
    const data = [
        {
            order_no: "ORD-101",
            date: "2026-04-01",
            party_name: "SHREE GANESH TEXTILES",
            place: "SURAT",
            broker_name: "DIRECT",
            remarks: "Standard Yarn Booking",
            product_name: "60s CH (WARP)",
            qty: 100,
            rate_cr: 320.00,
            rate_imm: 315.00,
            packing_type: "BAGS",
            bag_wt: 60.000,
            delivery: "2026-04-15"
        },
        {
            order_no: "ORD-102",
            date: "2026-04-02",
            party_name: "BALAJI SPINNERS",
            place: "COIMBATORE",
            broker_name: "KUMAR BROKERS",
            remarks: "Hank Yarn Order",
            product_name: "40s CW (HANK)",
            qty: 50,
            rate_cr: 290.00,
            rate_imm: 285.00,
            packing_type: "BAGS",
            bag_wt: 50.000,
            delivery: "2026-04-20"
        }
    ];
    downloadExcel(data, "sample_sales_orders_template.xlsx");
};

export const downloadDirectOrderTemplate = () => {
    const data = [
        {
            order_no: "DIR-101",
            date: "2026-04-01",
            party_name: "SHREE GANESH TEXTILES",
            place: "SURAT",
            broker_name: "DIRECT",
            remarks: "Direct sales booking",
            product_name: "60s CH (WARP)",
            qty: 50,
            rate_cr: 325.00,
            rate_imm: 320.00,
            packing_type: "BAGS",
            bag_wt: 60.000,
            delivery: "2026-04-05"
        }
    ];
    downloadExcel(data, "sample_direct_orders_template.xlsx");
};

export const downloadProductionTemplate = () => {
    const data = [
        {
            date: "2026-04-01",
            product_name: "60s CH (WARP)",
            prev_closing_kgs: 1200.00,
            production_kgs: 600.00,
            invoice_kgs: 400.00,
            stock_kgs: 1400.00,
            stock_bags: 23,
            stock_loose_kgs: 20.00
        },
        {
            date: "2026-04-01",
            product_name: "40s CW (HANK)",
            prev_closing_kgs: 800.00,
            production_kgs: 500.00,
            invoice_kgs: 300.00,
            stock_kgs: 1000.00,
            stock_bags: 20,
            stock_loose_kgs: 0.00
        }
    ];
    downloadExcel(data, "sample_yarn_production_template.xlsx");
};

export const downloadDespatchTemplate = () => {
    const data = [
        {
            load_no: "LD-201",
            load_date: "2026-04-01",
            transport_name: "VRL LOGISTICS",
            lr_no: "LR-99881",
            lr_date: "2026-04-01",
            vehicle_no: "MH-04-AB-1234",
            delivery: "MUMBAI",
            insurance_no: "INS-00123",
            in_time: "10:30 AM",
            out_time: "02:45 PM",
            original_no_of_bags: 100,
            original_freight: 15000.00
        }
    ];
    downloadExcel(data, "sample_despatch_template.xlsx");
};

export const downloadInvoiceTemplate = () => {
    const data = [
        {
            "Invoice No": 1,
            "Party Name": "KAYAAR EXPORTS PRIVATE LIMITED",
            "Product Name": "60s CH (WARP)",
            "Packs": 50,
            "Total Kgs": 3000.00,
            "Rate": 320.00,
            "Freight": 2500.00,
            "Value": 960000.00,
            "Date": "2026-04-01",
            "Address Line 1": "123 MILL ROAD",
            "Address Line 2": "INDUSTRIAL ESTATE",
            "Address Line 3": "TIRUPUR",
            "Place": "TIRUPUR",
            "GST No": "33AAACK1234F1Z5"
        }
    ];
    downloadExcel(data, "sample_invoices_template.xlsx");
};

export const downloadDepotSalesTemplate = () => {
    const data = [
        {
            "Invoice No": 1,
            "Party Name": "LOCAL TEXTILE TRADERS",
            "Product Name": "60s CH (WARP)",
            "Packs": 20,
            "Total Kgs": 1200.00,
            "Rate": 335.00,
            "Freight": 1200.00,
            "Value": 402000.00,
            "Date": "2026-04-01",
            "Address Line 1": "SHOP 45, CLOTH MARKET",
            "Address Line 2": "BHIWANDI",
            "Address Line 3": "MAHARASHTRA",
            "Place": "BHIWANDI",
            "GST No": "27AAACK1234F1Z8"
        }
    ];
    downloadExcel(data, "sample_depot_sales_template.xlsx");
};

export const downloadDepotReceivedTemplate = () => {
    const data = [
        {
            date: "2026-04-01",
            depot_name: "DEPOT - MUMBAI",
            invoice_no: "101",
            product_name: "60s CH (WARP)",
            total_kgs: 1500.00,
            remarks: "Mill inward received"
        }
    ];
    downloadExcel(data, "sample_depot_received_template.xlsx");
};

export const downloadDepotTransferTemplate = () => {
    const data = [
        {
            transfer_date: "2026-04-01",
            from_depot_name: "DEPOT - MUMBAI",
            to_depot_name: "DEPOT - SURAT",
            vehicle_no: "MH-04-AB-1234",
            product_name: "60s CH (WARP)",
            total_kgs: 600.00,
            remarks: "Stock relocation"
        }
    ];
    downloadExcel(data, "sample_depot_transfer_template.xlsx");
};