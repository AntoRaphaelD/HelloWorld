import React, { useState, useEffect } from 'react';
import { graphqlAPI } from '../service/api';
import { Search, Save, X, Plus, Edit } from 'lucide-react';

const PartyMaster = () => {
  const [list, setList] = useState([]);
  const [brokers, setBrokers] = useState([]); 
  const [show, setShow] = useState(false);
  const [editingId, setEditingId] = useState(null);
  
  // FIXED: Field names now match the tbl_Accounts model (account_name, account_code, etc.)
  const initial = { 
    account_code: '', 
    account_name: '', 
    address: '', 
    place: '', 
    gst_no: '', 
    broker_id: '' 
  };
  const [form, setForm] = useState(initial);

  const fetchAll = async () => {
    try {
      const query = `
        query {
          getAccounts {
            id
            account_code
            account_name
            address
            place
            gst_no
            broker_id
            Broker { id broker_name }
          }
          getBrokers {
            id
            broker_code
            broker_name
          }
        }
      `;
      const data = await graphqlAPI(query);
      setList(Array.isArray(data.getAccounts) ? data.getAccounts : []);
      setBrokers(Array.isArray(data.getBrokers) ? data.getBrokers : []);
    } catch (err) {
      console.error("Failed to fetch master data", err);
    }
  };
  
  useEffect(() => { fetchAll(); }, []);

  const openAddModal = () => {
    setForm(initial);
    setEditingId(null);
    setShow(true);
  };

  const openEditModal = (item) => {
    setForm({
        ...item,
        // Ensure broker_id is a string for the <select> comparison
        broker_id: item.broker_id ? item.broker_id.toString() : '' 
    });
    // FIXED: Using account_code as the ID for the URL since it's the Primary Key
    setEditingId(item.account_code); 
    setShow(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...form, broker_id: form.broker_id || null };
      
      if (editingId) {
        const mutation = `
          mutation {
            updateAccount(id: "${editingId}", input: {
              account_code: "${payload.account_code}"
              account_name: "${payload.account_name}"
              address: "${(payload.address || '').replace(/"/g, '\\"')}"
              place: "${payload.place || ''}"
              gst_no: "${payload.gst_no || ''}"
              broker_id: ${payload.broker_id || null}
            }) { id }
          }
        `;
        await graphqlAPI(mutation);
      } else {
        const mutation = `
          mutation {
            createAccount(input: {
              account_code: "${payload.account_code}"
              account_name: "${payload.account_name}"
              address: "${(payload.address || '').replace(/"/g, '\\"')}"
              place: "${payload.place || ''}"
              gst_no: "${payload.gst_no || ''}"
              broker_id: ${payload.broker_id || null}
            }) { id }
          }
        `;
        await graphqlAPI(mutation);
      }
      setShow(false);
      fetchAll();
    } catch (err) {
      alert("Save operation failed: " + err.message);
    }
  };

  return (
    <div className="p-4 text-xs font-sans">
      <div className="bg-white border-b mb-4 p-2 text-center font-bold text-red-700 uppercase shadow-sm">
        Kayaar Exports - Party Master
      </div>

      <div className="flex gap-4">
        <div className="w-64 bg-white border p-4 h-fit shadow-sm">
          <div className="font-bold border-b text-blue-800 mb-2 uppercase text-[10px]">Search Party</div>
          <input className="border w-full p-1 mb-2 uppercase" placeholder="Party Name..." />
          <button className="w-full bg-gray-100 border p-1 flex items-center justify-center gap-1 hover:bg-gray-200 transition">
            <Search size={14}/> Search
          </button>
        </div>

        <div className="flex-1 bg-white border shadow-sm h-[450px] overflow-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-gray-50 border-b text-[10px] uppercase sticky top-0 font-bold text-blue-900">
              <tr>
                <th className="p-2 border-r w-12 text-center">Edit</th>
                <th className="p-2 border-r">Code</th>
                <th className="p-2 border-r">Party Name</th>
                <th className="p-2 border-r">Place</th>
                <th className="p-2">Default Broker</th>
              </tr>
            </thead>
            <tbody>
              {list.map(i => (
                <tr key={i.account_code} className="border-b hover:bg-blue-50 transition-colors">
                  <td className="p-2 border-r text-center">
                    <Edit 
                      size={14} 
                      className="cursor-pointer text-blue-600 inline hover:scale-125 transition-transform" 
                      onClick={() => openEditModal(i)} 
                    />
                  </td>
                  <td className="p-2 border-r font-mono">{i.account_code}</td>
                  <td className="p-2 border-r font-bold uppercase">{i.account_name}</td>
                  <td className="p-2 border-r uppercase text-gray-600">{i.place}</td>
                  <td className="p-2 text-blue-800 font-semibold italic">
                    {i.Broker?.broker_name || 'DIRECT'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {show && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-[#f0f0f0] border-[3px] border-yellow-500 w-[550px] shadow-2xl">
            <div className="bg-yellow-500 p-1 flex justify-between text-white px-3 font-bold uppercase">
              <span>{editingId ? 'Modify Party' : 'Add New Party'}</span>
              <X className="cursor-pointer" onClick={() => setShow(false)} />
            </div>

            <form onSubmit={handleSave} className="p-4 bg-[#BDD4F1]">
              <div className="bg-white border-2 border-yellow-500 p-6 space-y-3 shadow-inner">
                <div className="flex gap-4">
                  <div className="flex-1">
                    <label className="text-[10px] font-bold text-gray-500 uppercase">Party Code</label>
                    {/* Value/OnChange now bound to account_code */}
                    <input 
                      required 
                      className="border w-full p-1 bg-blue-50 font-bold" 
                      value={form.account_code} 
                      onChange={e=>setForm({...form, account_code:e.target.value})}
                    />
                  </div>
                  <div className="flex-1">
                    <label className="text-[10px] font-bold text-gray-500 uppercase">GST No / GSTIN</label>
                    {/* Value/OnChange now bound to gst_no */}
                    <input 
                      className="border w-full p-1 uppercase" 
                      value={form.gst_no} 
                      onChange={e=>setForm({...form, gst_no:e.target.value})}
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase">Party Name</label>
                  {/* Value/OnChange now bound to account_name */}
                  <input 
                    required 
                    className="border w-full p-1 uppercase font-bold" 
                    value={form.account_name} 
                    onChange={e=>setForm({...form, account_name:e.target.value})}
                  />
                </div>

                <div className="flex gap-4">
                  <div className="flex-1">
                    <label className="text-[10px] font-bold text-gray-500 uppercase">Place</label>
                    <input className="border w-full p-1 uppercase" value={form.place} onChange={e=>setForm({...form, place:e.target.value})}/>
                  </div>
                  <div className="flex-1">
                    <label className="text-[10px] font-bold text-gray-500 uppercase">Assigned Broker</label>
                    <select 
                      className="border w-full p-1 text-blue-900 font-bold bg-white" 
                      value={form.broker_id} 
                      onChange={e=>setForm({...form, broker_id: e.target.value})}
                    >
                      <option value="">-- DIRECT SALE (NONE) --</option>
                      {brokers.map(b => (
                        <option key={b.id} value={b.id}>
                          {b.broker_name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase">Address</label>
                  <textarea className="border w-full p-1 h-16 uppercase text-[10px]" value={form.address} onChange={e=>setForm({...form, address:e.target.value})}/>
                </div>
              </div>

              <div className="flex justify-end gap-2 mt-4 pt-2 border-t border-yellow-400">
                <button type="submit" className="bg-white border-2 border-blue-400 px-6 py-1 text-blue-800 flex items-center gap-2 font-bold hover:bg-blue-50 shadow-sm transition-colors">
                  <Save size={14}/> {editingId ? 'Update' : 'Save Record'}
                </button>
                <button type="button" className="bg-white border-2 border-red-400 px-6 py-1 text-red-800 font-bold hover:bg-red-50 transition-colors" onClick={()=>setShow(false)}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <button 
        onClick={openAddModal} 
        className="fixed bottom-8 right-8 bg-blue-600 text-white p-4 rounded-full shadow-2xl hover:scale-110 transition-transform flex items-center justify-center z-40"
      >
        <Plus size={24}/>
      </button>
    </div>
  );
};

export default PartyMaster;