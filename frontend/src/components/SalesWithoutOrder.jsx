import React, { useState, useEffect } from 'react';
import { mastersAPI, transactionsAPI } from '../service/api';
import { Plus, Trash, Save, AlertCircle } from 'lucide-react';

const SalesWithoutOrder = () => {
  // 1. Initial State matching your Sequelize Model
  const [header, setHeader] = useState({ 
    order_no: '', 
    date: new Date().toISOString().split('T')[0], 
    account_id: '',  // Needs to be account_code
    broker_id: '', 
    place: '',
    is_with_order: false // Critical for direct transactions
  });

  const [details, setDetails] = useState([{ product_id: '', qty: 0, rate_cr: 0, bag_wt: 55 }]);
  const [dropdowns, setDropdowns] = useState({ accounts: [], brokers: [], products: [] });
  const [loading, setLoading] = useState(false);

  // 2. Fetch Masters on Load
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
        console.log("✅ Masters Loaded Successfully");
      } catch (err) {
        console.error("❌ Failed to load dropdowns:", err);
      }
    };
    fetchMasters();
  }, []);

  const addRow = () => setDetails([...details, { product_id: '', qty: 0, rate_cr: 0, bag_wt: 55 }]);
  const removeRow = (index) => setDetails(details.filter((_, i) => i !== index));

  // 3. The Submit Function with Heavy Logging
  const submitOrder = async () => {
    setLoading(true);
    
    // Create the Payload
    const payload = { 
      ...header, 
      // Ensure numeric values are sent as Numbers, not Strings
      Details: details.map(d => ({
        product_id: d.product_id,
        qty: parseFloat(d.qty) || 0,
        rate_cr: parseFloat(d.rate_cr) || 0,
        bag_wt: parseFloat(d.bag_wt) || 0
      }))
    };

    console.log("🚀 SENDING PAYLOAD TO BACKEND:", payload);

    try {
      const response = await transactionsAPI.orders.create(payload);
      console.log("✅ SUCCESS RESPONSE:", response.data);
      alert("Direct Sale Saved Successfully!");
      
      // Reset form on success
      setHeader({ order_no: '', date: new Date().toISOString().split('T')[0], account_id: '', broker_id: '', place: '', is_with_order: false });
      setDetails([{ product_id: '', qty: 0, rate_cr: 0, bag_wt: 55 }]);
    } catch (err) {
      console.error("❌ API ERROR DETECTED");
      
      // LOG THE SPECIFIC SERVER ERROR (This is the most important part)
      if (err.response) {
        console.error("SERVER ERROR DATA:", err.response.data);
        console.error("SERVER STATUS CODE:", err.response.status);
        
        // If your backend sends a specific error message
        const errorMsg = err.response.data.error || err.response.data.message || "Internal Server Error";
        alert(`Server Error (500): ${errorMsg}\nCheck Console for full details.`);
      } else if (err.request) {
        console.error("NO RESPONSE FROM SERVER:", err.request);
        alert("No response from server. Check if backend is running.");
      } else {
        console.error("REQUEST SETUP ERROR:", err.message);
        alert("Request error: " + err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-slate-50 min-h-screen p-4 font-sans text-xs">
      <div className="bg-orange-600 text-white p-2 font-bold mb-4 shadow flex justify-between items-center">
        <span>SALES WITHOUT ORDER (DIRECT TRANSACTION)</span>
        {loading && <span className="animate-pulse">Saving...</span>}
      </div>
      
      {/* Header Fields */}
      <div className="bg-white p-6 shadow-md border-2 border-orange-100 mb-4 grid grid-cols-2 gap-6">
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <label className="w-24 font-bold text-gray-600">Order No.</label>
            <input 
              className="border p-1 w-full outline-orange-500 font-bold" 
              value={header.order_no} 
              onChange={e => setHeader({...header, order_no: e.target.value})} 
            />
          </div>
          <div className="flex items-center gap-4">
            <label className="w-24 font-bold text-gray-600">Date</label>
            <input 
              type="date" 
              className="border p-1 w-full outline-orange-500" 
              value={header.date} 
              onChange={e => setHeader({...header, date: e.target.value})} 
            />
          </div>
          <div className="flex items-center gap-4">
            <label className="w-24 font-bold text-gray-600">Place</label>
            <input 
              className="border p-1 w-full outline-orange-500 uppercase" 
              value={header.place} 
              onChange={e => setHeader({...header, place: e.target.value})} 
            />
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-1">
            <label className="block font-bold text-gray-600">Party (Account)</label>
            <select 
              className="border p-2 w-full text-sm font-semibold bg-orange-50 border-orange-200" 
              value={header.account_id}
              onChange={e => setHeader({...header, account_id: e.target.value})}
            >
              <option value="">-- Select Party --</option>
              {dropdowns.accounts.map(a => (
                <option key={a.account_code} value={a.account_code}>{a.account_name}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="block font-bold text-gray-600">Agent / Broker</label>
            <select 
              className="border p-2 w-full text-sm" 
              value={header.broker_id}
              onChange={e => setHeader({...header, broker_id: e.target.value})}
            >
              <option value="">-- Select Broker --</option>
              {dropdowns.brokers.map(b => (
                <option key={b.id} value={b.id}>{b.broker_name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Details Table */}
      <div className="bg-white border-2 border-orange-100 shadow-md">
        <table className="w-full text-xs text-left">
          <thead className="bg-orange-500 text-white uppercase">
            <tr>
              <th className="p-2 border">Product</th>
              <th className="p-2 border">Rate (Cr)</th>
              <th className="p-2 border">Qty</th>
              <th className="p-2 border">Bag Wt.</th>
              <th className="p-2 border w-16 text-center">Action</th>
            </tr>
          </thead>
          <tbody>
            {details.map((row, i) => (
              <tr key={i} className="border-b">
                <td className="border p-1">
                  <select 
                    className="w-full p-1 outline-none" 
                    value={row.product_id}
                    onChange={e => {
                      const d = [...details]; d[i].product_id = e.target.value; setDetails(d);
                    }}
                  >
                    <option value="">Select Product</option>
                    {dropdowns.products.map(p => <option key={p.id} value={p.id}>{p.product_name}</option>)}
                  </select>
                </td>
                <td className="border p-1">
                  <input type="number" className="w-full p-1 text-right" value={row.rate_cr} onChange={e => {const d = [...details]; d[i].rate_cr = e.target.value; setDetails(d);}} />
                </td>
                <td className="border p-1">
                  <input type="number" className="w-full p-1 text-right" value={row.qty} onChange={e => {const d = [...details]; d[i].qty = e.target.value; setDetails(d);}} />
                </td>
                <td className="border p-1">
                  <input type="number" className="w-full p-1 text-right" value={row.bag_wt} onChange={e => {const d = [...details]; d[i].bag_wt = e.target.value; setDetails(d);}} />
                </td>
                <td className="border p-1 text-center">
                  <button onClick={() => removeRow(i)} className="text-red-500 hover:bg-red-50 p-1 rounded">
                    <Trash size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        
        <div className="p-2 flex justify-between bg-gray-50 border-t">
          <button 
            onClick={addRow} 
            className="bg-green-600 text-white px-4 py-1 flex items-center gap-1 hover:bg-green-700 font-bold rounded shadow"
          >
            <Plus size={14}/> Add Row
          </button>
          
          <button 
            onClick={submitOrder} 
            disabled={loading}
            className={`bg-orange-700 text-white px-8 py-1 font-bold flex items-center gap-2 rounded shadow-lg ${loading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-orange-800'}`}
          >
            <Save size={14}/> {loading ? 'SAVING...' : 'SAVE RECORD'}
          </button>
        </div>
      </div>

      {/* Helper Warning */}
      {!header.account_id && (
        <div className="mt-4 p-2 bg-yellow-50 border border-yellow-200 text-yellow-800 flex items-center gap-2">
          <AlertCircle size={14} />
          <span>Note: You must select a <strong>Party</strong> before saving.</span>
        </div>
      )}
    </div>
  );
};

export default SalesWithoutOrder;