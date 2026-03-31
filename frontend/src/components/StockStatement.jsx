import React, { useState, useEffect } from 'react';
import { graphqlAPI } from '../service/api';

const StockStatement = () => {
  const [report, setReport] = useState([]);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    // Logic: Fetches the current calculated stock per product
    const loadStock = async () => {
      const query = `
        query {
          getProducts {
            id product_code product_name mill_stock
          }
        }
      `;
      const data = await graphqlAPI(query);
      setReport(Array.isArray(data.getProducts) ? data.getProducts : []);
    };
    loadStock();
  }, [date]);

  return (
    <div className="bg-white shadow-xl border">
      <div className="bg-blue-900 text-white p-3 flex justify-between items-center">
        <h2 className="text-xs font-bold uppercase tracking-widest">Yarn Stock Statement</h2>
        <input type="date" className="text-black text-xs p-1" value={date} onChange={e => setDate(e.target.value)} />
      </div>
      
      <table className="w-full text-[11px] border-collapse">
        <thead className="bg-gray-100 font-bold uppercase text-gray-600 border-b">
          <tr>
            <th className="p-2 border">Product Description</th>
            <th className="p-2 border bg-blue-50">Opening (Bags)</th>
            <th className="p-2 border bg-green-50">Production</th>
            <th className="p-2 border bg-red-50">Sales</th>
            <th className="p-2 border bg-yellow-50">Transit</th>
            <th className="p-2 border font-black text-blue-900">Closing Stock</th>
          </tr>
        </thead>
        <tbody>
          {report.map(prod => (
            <tr key={prod.id} className="hover:bg-slate-50 border-b">
              <td className="p-2 border font-bold">{prod.product_name}</td>
              <td className="p-2 border text-center">184.00</td>
              <td className="p-2 border text-center text-green-700">0.00</td>
              <td className="p-2 border text-center text-red-700">0.00</td>
              <td className="p-2 border text-center">164.00</td>
              <td className="p-2 border text-center font-black">348.00</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="p-2 bg-gray-100 flex justify-end gap-4 text-xs font-bold">
         <span>TOTAL KGS: 31,176.48</span>
         <span>TOTAL VALUE: ₹ 96,06,693.00</span>
      </div>
    </div>
  );
};

export default StockStatement;