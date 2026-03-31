import React, { useState } from 'react';
import { graphqlAPI } from '../service/api'; // Import the new helper

const OrderDetailTab = ({ details = [], onProductSelect }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);

  // 🔥 GraphQL Powered Live Search
  const handleProductSearch = async (val) => {
    setSearchQuery(val);
    if (val.length < 2) return setSuggestions([]);

    try {
      const query = `
        query SearchProducts($term: String!) {
          getProducts(filter: $term) {
            id
            product_name
            pack_nett_wt
            rate_per
          }
        }
      `;
      const data = await graphqlAPI(query, { term: val });
      setSuggestions(data.getProducts);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="bg-white border-2 border-yellow-500 overflow-hidden shadow-inner min-h-[200px]">
      <table className="w-full text-[11px] text-left border-collapse">
        <thead className="bg-blue-100 border-b font-bold uppercase text-blue-900 sticky top-0">
          {/* ... existing headers ... */}
        </thead>
        <tbody>
          {details.length > 0 ? (
            details.map((item, idx) => (
              <tr key={idx} className="border-b hover:bg-yellow-50 group">
                <td className="p-2 border-r text-center text-blue-600 font-bold">▶</td>
                <td className="p-2 border-r font-bold uppercase">
                  {item.Product?.product_name || "N/A"}
                </td>
                <td className="p-2 border-r text-right px-4">{item.rate_cr}</td>
                <td className="p-2 border-r text-right px-4">{item.rate_imm}</td>
                <td className="p-2 border-r text-center font-mono text-blue-800">5.5</td>
                <td className="p-2 border-r text-center font-bold bg-gray-50">{item.qty}</td>
                <td className="p-2 border-r text-center">{item.bag_wt}</td>
                <td className="p-2 uppercase text-gray-600">
                   {/* GraphQL nested data access */}
                  {item.Product?.PackingType?.packing_type || 'BAGS'}
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={8} className="p-12 text-center text-gray-400 italic bg-gray-50 border-dashed border-2 m-2">
                <div className="flex flex-col items-center gap-2 relative">
                  <span>Type starting letter of the product to search...</span>
                  <input 
                    type="text" 
                    value={searchQuery}
                    onChange={(e) => handleProductSearch(e.target.value)}
                    placeholder="Search Product..." 
                    className="border p-2 w-64 not-italic text-black uppercase font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                  
                  {/* SEARCH SUGGESTIONS DROPDOWN */}
                  {suggestions.length > 0 && (
                    <div className="absolute top-full bg-white border shadow-xl w-64 z-50 not-italic text-left">
                      {suggestions.map(p => (
                        <div 
                          key={p.id} 
                          onClick={() => {
                            onProductSelect(p); // Pass the selected product back to parent
                            setSuggestions([]);
                            setSearchQuery('');
                          }}
                          className="p-2 hover:bg-blue-600 hover:text-white cursor-pointer border-b text-black font-bold uppercase"
                        >
                          {p.product_name}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </td>
            </tr>
          )}
        </tbody>
      </table>
      
      {/* Footer Totals */}
      {details.length > 0 && (
        <div className="bg-blue-50 p-1 border-t flex justify-end gap-10 pr-10 font-bold text-blue-900">
          <span>Total Qty: {details.reduce((sum, i) => sum + Number(i.qty), 0)}</span>
        </div>
      )}
    </div>
  );
};

export default OrderDetailTab;