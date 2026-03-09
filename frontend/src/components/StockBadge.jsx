import React from 'react';
import { Database } from 'lucide-react';

const StockBadge = ({ qty, label = "Available" }) => {
    const isLow = qty <= 0;
    return (
        <div className={`flex items-center gap-2 px-3 py-1 rounded-full border ${
            isLow ? 'bg-red-50 border-red-200 text-red-600' : 'bg-emerald-50 border-emerald-200 text-emerald-600'
        }`}>
            <Database size={12} />
            <span className="text-[10px] font-black uppercase tracking-tighter">
                {label}: {qty} KG
            </span>
        </div>
    );
};







export default StockBadge;