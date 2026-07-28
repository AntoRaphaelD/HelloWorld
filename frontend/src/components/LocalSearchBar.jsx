import React from 'react';
import { useFilter } from '../context/FilterContext';
import { Search } from 'lucide-react';

export default function LocalSearchBar({ searchCondition, setSearchCondition }) {
  const { searchQuery, setSearchQuery, searchField, setSearchField, searchFields } = useFilter();

  if (!searchFields || searchFields.length === 0) return null;

  return (
    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm mb-6 flex flex-wrap items-end gap-4 w-full">
      <div className="flex-1 min-w-[150px]">
        <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Search Field</label>
        <select 
          value={searchField} 
          onChange={(e) => setSearchField(e.target.value)} 
          className="w-full border border-slate-200 p-2 rounded-xl text-[13px] outline-none focus:ring-1 focus:ring-blue-500 bg-white font-semibold text-slate-700"
        >
          {searchFields.map(field => (
            <option key={field.value} value={field.value}>{field.label}</option>
          ))}
        </select>
      </div>
      
      {setSearchCondition && (
        <div className="flex-1 min-w-[120px]">
          <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Condition</label>
          <select 
            value={searchCondition} 
            onChange={(e) => setSearchCondition(e.target.value)} 
            className="w-full border border-slate-200 p-2 rounded-xl text-[13px] outline-none focus:ring-1 focus:ring-blue-500 bg-white font-semibold text-slate-700"
          >
            <option value="Like">Like</option>
            <option value="Equal">Equal</option>
          </select>
        </div>
      )}

      <div className="flex-[2] min-w-[200px]">
        <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Value</label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
          <input 
            type="text" 
            value={searchQuery} 
            onChange={(e) => setSearchQuery(e.target.value)} 
            placeholder="Type to search..."
            className="w-full border border-slate-200 pl-9 pr-4 py-2 rounded-xl text-[13px] outline-none focus:ring-1 focus:ring-blue-500 font-bold" 
          />
        </div>
      </div>
    </div>
  );
}
