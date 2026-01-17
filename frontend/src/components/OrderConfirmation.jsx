import React, { useState, useEffect } from 'react';
import { mastersAPI, transactionsAPI } from '../service/api';
import { Plus, Trash, Save, Loader2 } from 'lucide-react';

const OrderConfirmation = () => {
  const [header, setHeader] = useState({ 
    order_no: '', 
    date: new Date().toISOString().split('T')[0], 
    account_id: '', 
    broker_id: '', 
    place: '',
    is_with_order: true // This is the 'Sales with order' page
  });

  const [details, setDetails] = useState([{ product_id: '', qty: 0, rate_cr: 0, bag_wt: 55 }]);
  const [dropdowns, setDropdowns] = useState({ accounts: [], brokers: [], products: [] });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const fetchMasters = async () => {
      try {
        const [a, b, p] = await Promise.all([
          mastersAPI.accounts.getAll(),
          mastersAPI.brokers.getAll(),
          mastersAPI.products.getAll()
        ]);
        setDropdowns({ 
          accounts: a.data.data || [], 
          brokers: b.data.data || [], 
          products: p.data.data || [] 
        });
      } catch (err) {
        console.error("Fetch Masters Error:", err);
      }
    };
    fetchMasters();
  }, []);

  const addRow = () => setDetails([...details, { product_id: '', qty: 0, rate_cr: 0, bag_wt: 55 }]);
  
  const submitOrder = async () => {
    setIsSaving(true);

    // Prepare payload with sanitized data types
    const payload = { 
      ...header, 
      // Sequelize expects 'Details' (Capital D) based on your model alias
      Details: details.map(d => ({
        product_id: d.product_id,
        qty: parseFloat(d.qty) || 0,
        rate_cr: parseFloat(d.rate_cr) || 0,
        bag_wt: parseFloat(d.bag_wt) || 0
      }))
    };

    console.log("🚀 SUBMITTING ORDER PAYLOAD:", payload);

    try {
      const response = await transactionsAPI.orders.create(payload);
      console.log("✅ SERVER RESPONSE:", response.data);
      alert("Order Saved Successfully");
      
      // Reset form
      setHeader({ order_no: '', date: new Date().toISOString().split('T')[0], account_id: '', broker_id: '', place: '', is_with_order: true });
      setDetails([{ product_id: '', qty: 0, rate_cr: 0, bag_wt: 55 }]);
    } catch (err) {
      console.error("❌ 500 ERROR DETAILS:");
      if (err.response) {
        // This is where the Sequelize error message will hide
        console.error("Data:", err.response.data);
        console.error("Status:", err.response.status);
        alert(`Error: ${err.response.data.error || "Internal Server Error"}`);
      } else {
        console.error("Error Message:", err.message);
        alert("Failed to connect to server");
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-slate-50 min-h-screen p-4 font-sans">
      <div className="bg-blue-600 text-white p-2 font-bold text-sm mb-4 shadow uppercase flex justify-between items-center">
        <span>Order Confirmation (Sales with order)</span>
        {isSaving && <Loader2 size={16} className="animate-spin" />}
      </div>
      
      {/* Header Tab Section */}
      <div className="bg-white p-6 shadow-md border mb-4 grid grid-cols-2 gap-6">
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <label className="w-24 text-xs font-bold">Order No.</label>
            <input 
              className="border p-1 w-full text-xs font-bold focus:border-blue-500 outline-none" 
              value={header.order_no} 
              onChange={e => setHeader({...header, order_no: e.target.value})} 
            />
          </div>
          <div className="flex items-center gap-4">
            <label className="w-24 text-xs font-bold">Date</label>
            <input 
              type="date" 
              className="border p-1 w-full text-xs outline-none" 
              value={header.date} 
              onChange={e => setHeader({...header, date: e.target.value})} 
            />
          </div>
          <div className="flex items-center gap-4">
            <label className="w-24 text-xs font-bold">Place</label>
            <input 
              className="border p-1 w-full text-xs outline-none uppercase" 
              value={header.place} 
              onChange={e => setHeader({...header, place: e.target.value})} 
            />
          </div>
        </div>

        <div className="space-y-4">
          {/* FIX: Using a.account_code as the value to match your Sequelize Primary Key */}
          <select 
            className="border p-2 w-full text-xs font-semibold bg-blue-50 outline-none" 
            value={header.account_id}
            onChange={e => setHeader({...header, account_id: e.target.value})}
          >
            <option value="">Select Party (Account)</option>
            {dropdowns.accounts.map((a, idx) => (
              <option key={a.account_code || idx} value={a.account_code}>{a.account_name}</option>
            ))}
          </select>

          <select 
            className="border p-2 w-full text-xs outline-none" 
            value={header.broker_id}
            onChange={e => setHeader({...header, broker_id: e.target.value})}
          >
            <option value="">Select Agent / Broker</option>
            {dropdowns.brokers.map((b, idx) => (
              <option key={b.id || idx} value={b.id}>{b.broker_name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Details Grid Section */}
      <div className="bg-white border shadow-md">
        <table className="w-full text-xs text-left">
          <thead className="bg-blue-100 uppercase text-blue-900">
            <tr>
              <th className="p-2 border">Product</th>
              <th className="p-2 border text-right">Rate (Cr)</th>
              <th className="p-2 border text-right">Qty</th>
              <th className="p-2 border text-right">Bag Wt.</th>
              <th className="p-2 border w-12 text-center">Action</th>
            </tr>
          </thead>
          <tbody>
            {details.map((row, i) => (
              <tr key={i} className="hover:bg-blue-50/30">
                <td className="border p-1">
                  <select 
                    className="w-full p-1 outline-none bg-transparent" 
                    value={row.product_id}
                    onChange={e => {
                      const d = [...details]; d[i].product_id = e.target.value; setDetails(d);
                    }}
                  >
                    <option value="">Select Product</option>
                    {dropdowns.products.map((p, idx) => (
                      <option key={p.id || idx} value={p.id}>{p.product_name}</option>
                    ))}
                  </select>
                </td>
                <td className="border p-1">
                  <input type="number" className="w-full p-1 text-right outline-none" value={row.rate_cr} onChange={e => {const d = [...details]; d[i].rate_cr = e.target.value; setDetails(d);}} />
                </td>
                <td className="border p-1">
                  <input type="number" className="w-full p-1 text-right outline-none" value={row.qty} onChange={e => {const d = [...details]; d[i].qty = e.target.value; setDetails(d);}} />
                </td>
                <td className="border p-1">
                  <input type="number" className="w-full p-1 text-right outline-none" value={row.bag_wt} onChange={e => {const d = [...details]; d[i].bag_wt = e.target.value; setDetails(d);}} />
                </td>
                <td className="border p-1 text-center">
                  <button onClick={() => setDetails(details.filter((_, idx) => idx !== i))}>
                    <Trash size={14} className="text-red-500 hover:scale-110 transition-transform" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="p-2 flex justify-between bg-gray-50 border-t">
          <button 
            onClick={addRow} 
            className="bg-green-600 text-white px-4 py-1 text-xs flex items-center gap-1 hover:bg-green-700 rounded transition-colors"
          >
            <Plus size={14}/> Add Item
          </button>
          
          <button 
            onClick={submitOrder} 
            disabled={isSaving}
            className={`bg-blue-700 text-white px-8 py-1 text-xs font-bold flex items-center gap-1 rounded shadow hover:bg-blue-800 transition-all ${isSaving ? 'opacity-50' : ''}`}
          >
            <Save size={14}/> {isSaving ? 'Saving...' : 'Save Order'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default OrderConfirmation;