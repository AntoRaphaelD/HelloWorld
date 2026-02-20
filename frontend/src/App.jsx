import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { 
  ChevronRight, Database, LayoutDashboard, Settings, 
  Truck, Factory, FileText, Users, Package, MapPin, 
  CheckSquare, ShoppingBag, Landmark, ArrowLeftRight, 
  BarChart3, ClipboardCheck, Box, Zap, ShieldCheck, 
  MonitorDot, Cpu, HardDrive
} from 'lucide-react';

// --- Master Components ---
import AccountMaster from './components/AccountMaster';
import BrokerMaster from './components/BrokerMaster';
import ProductMaster from './components/ProductMaster';
import TariffMaster from './components/TariffMaster';
import TransportMaster from './components/TransportMaster';
import InvoiceTypeMaster from './components/InvoiceTypeMaster';
import PackingTypeMaster from './components/PackingTypeMaster';
// import SpinningCountMaster from './components/SpinningCountMaster';

// --- Transactional Components (Factory) ---
import SalesWithOrder from './components/SalesWithOrder';
import SalesWithoutOrder from './components/SalesWithoutOrder';
import RG1Production from './components/RG1Production';
import DespatchEntry from './components/DespatchEntry';
import InvoicePreparation from './components/InvoicePreparation';
import InvoiceApproval from './components/InvoiceApproval';

// --- Depot Management Components ---
import DepotSalesInvoice from './components/DepotSalesInvoice';
import DepotStockReceived from './components/DepotStockReceived';
import { DepotOpeningStock } from './components/DepotOpeningStock';
import { DepotTransfer } from './components/DepotTransfer';

// --- Reports ---
import ReportsDashboard from './components/ReportsDashboard';

/**
 * Enhanced Sidebar Link with Active State Logic
 */
const SidebarLink = ({ to, label, icon: Icon, color = "text-slate-400" }) => {
  const loc = useLocation();
  const active = loc.pathname === to;
  
  return (
    <Link 
      to={to} 
      className={`flex items-center justify-between px-4 py-2 text-[11px] transition-all duration-150 group
        ${active 
          ? 'bg-blue-600 text-white font-bold shadow-lg shadow-blue-900/20 rounded-md mx-2' 
          : 'text-slate-600 hover:bg-slate-100 hover:text-blue-700'
        }`}
    >
      <div className="flex items-center gap-3">
        {Icon && <Icon size={16} className={active ? 'text-white' : color} />}
        {!Icon && <ChevronRight size={12} className={active ? 'text-white' : 'text-slate-300'} />} 
        <span className="uppercase tracking-tight">{label}</span>
      </div>
      {active && <MonitorDot size={10} className="animate-pulse" />}
    </Link>
  );
};

const DashboardHome = () => (
  <div className="p-10 flex flex-col items-center justify-center min-h-[80vh]">
    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-6xl">
      <div className="col-span-3 text-center mb-10">
        <h2 className="text-4xl font-black text-slate-800 uppercase tracking-tighter">Command Center</h2>
        <p className="text-slate-400 font-bold uppercase text-xs tracking-[0.3em] mt-2">Kayaar Exports Management System</p>
      </div>
      
      {/* Quick Access Cards */}
      <div className="bg-white p-8 rounded-[2rem] shadow-xl border border-slate-100 hover:border-blue-500 transition-all group">
        <div className="h-14 w-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-blue-600 group-hover:text-white transition-all">
          <Database size={28} />
        </div>
        <h3 className="font-black text-xl text-slate-800 uppercase">Master Data</h3>
        <p className="text-sm text-slate-500 mt-2 leading-relaxed">Manage your core entities including Accounts, Products, and Taxes.</p>
        <Link to="/accounts" className="inline-block mt-6 text-xs font-black text-blue-600 uppercase tracking-widest border-b-2 border-blue-100 pb-1">Open Modules</Link>
      </div>

      <div className="bg-white p-8 rounded-[2rem] shadow-xl border border-slate-100 hover:border-rose-500 transition-all group">
        <div className="h-14 w-14 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-rose-600 group-hover:text-white transition-all">
          <Zap size={28} />
        </div>
        <h3 className="font-black text-xl text-slate-800 uppercase">Live Sales</h3>
        <p className="text-sm text-slate-500 mt-2 leading-relaxed">Process factory orders, direct billing, and production registries.</p>
        <Link to="/order-with" className="inline-block mt-6 text-xs font-black text-rose-600 uppercase tracking-widest border-b-2 border-rose-100 pb-1">Start Trading</Link>
      </div>

      <div className="bg-white p-8 rounded-[2rem] shadow-xl border border-slate-100 hover:border-emerald-500 transition-all group">
        <div className="h-14 w-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-emerald-600 group-hover:text-white transition-all">
          <BarChart3 size={28} />
        </div>
        <h3 className="font-black text-xl text-slate-800 uppercase">Analytics</h3>
        <p className="text-sm text-slate-500 mt-2 leading-relaxed">Generate GST reports, stock ledgers, and sales performance charts.</p>
        <Link to="/reports" className="inline-block mt-6 text-xs font-black text-emerald-600 uppercase tracking-widest border-b-2 border-emerald-100 pb-1">View Insights</Link>
      </div>
    </div>
  </div>
);

export default function App() {
  return (
    <Router>
      <div className="flex h-screen bg-[#F8FAFC] overflow-hidden font-sans text-slate-900">
        
        {/* --- Sidebar --- */}
        <aside className="w-72 bg-white border-r border-slate-200 shadow-2xl flex flex-col z-30">
          {/* Logo Section */}
          <div className="p-6 bg-slate-900 text-white relative overflow-hidden">
            <div className="absolute top-[-20px] right-[-20px] w-24 h-24 bg-blue-500/10 rounded-full blur-2xl"></div>
            <div className="flex items-center gap-4 relative z-10">
              <div className="bg-gradient-to-br from-blue-500 to-indigo-700 p-2.5 rounded-xl shadow-lg">
                  <Cpu size={24} className="text-white" />
              </div>
              <div>
                <div className="text-[10px] font-black tracking-[0.3em] text-blue-400 uppercase">Enterprise</div>
                <div className="text-lg font-black uppercase leading-tight tracking-tighter">Kayaar ERP</div>
              </div>
            </div>
          </div>

          {/* Navigation Section */}
          <nav className="flex-1 py-4 overflow-y-auto custom-scrollbar">
            {/* 1. MASTERS */}
            <div className="px-6 flex items-center gap-2 mb-3 mt-2">
              <div className="h-1 w-1 bg-blue-600 rounded-full"></div>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Core Masters</span>
            </div>
            <SidebarLink to="/accounts" label="Accounts / Party" icon={Users} color="text-blue-500" />
            <SidebarLink to="/product" label="Product Master" icon={Package} color="text-blue-500" />
            <SidebarLink to="/tariff" label="Tariff Sub Head" icon={FileText} color="text-blue-500" />
            <SidebarLink to="/broker" label="Broker Master" icon={Users} color="text-blue-500" />
            <SidebarLink to="/transport" label="Transport Master" icon={MapPin} color="text-blue-500" />
            <SidebarLink to="/invoice-types" label="Invoice Types" icon={Settings} color="text-blue-500" />
            <SidebarLink to="/packing" label="Packing Types" icon={Package} color="text-blue-500" />
            {/* <SidebarLink to="/spinning-counts" label="Spinning Counts" icon={BarChart3} color="text-blue-500" /> */}

            {/* 2. FACTORY TRANSACTIONS */}
            <div className="px-6 flex items-center gap-2 mb-3 mt-8">
              <div className="h-1 w-1 bg-rose-600 rounded-full"></div>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Factory Ops</span>
            </div>
            <SidebarLink to="/order-with" label="Sales With Order" icon={ClipboardCheck} color="text-rose-500" />
            <SidebarLink to="/order-without" label="Sales Without Order" icon={Zap} color="text-rose-500" />
            <SidebarLink to="/production" label="RG1 Production" icon={Factory} color="text-rose-500" />
            <SidebarLink to="/despatch" label="Despatch Entry" icon={Truck} color="text-rose-500" />
            <SidebarLink to="/invoice-prep" label="Invoice Gen" icon={FileText} color="text-rose-500" />
            <SidebarLink to="/invoice-approval" label="Approval" icon={CheckSquare} color="text-rose-500" />

            {/* 3. DEPOT MANAGEMENT */}
            <div className="px-6 flex items-center gap-2 mb-3 mt-8">
              <div className="h-1 w-1 bg-emerald-600 rounded-full"></div>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Inventory / Depot</span>
            </div>
            <SidebarLink to="/depot-sales" label="Depot Sales" icon={ShoppingBag} color="text-emerald-500" />
            <SidebarLink to="/depot-received" label="Stock Inward" icon={Landmark} color="text-emerald-500" />
            <SidebarLink to="/depot-transfer" label="Inter-Transfer" icon={ArrowLeftRight} color="text-emerald-500" />
            <SidebarLink to="/depot-opening" label="Opening Bal." icon={Box} color="text-emerald-500" />

            {/* 4. REPORTS */}
            <div className="px-6 flex items-center gap-2 mb-3 mt-8">
              <div className="h-1 w-1 bg-slate-400 rounded-full"></div>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">BI Reports</span>
            </div>
            <SidebarLink to="/reports" label="Analytics" icon={BarChart3} color="text-slate-500" />
          </nav>

          {/* User Profile Area */}
          <div className="p-4 bg-slate-50 border-t border-slate-200">
            <div className="flex items-center gap-3 p-2 bg-white rounded-xl shadow-sm border border-slate-100">
              <div className="h-8 w-8 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600 font-bold text-xs uppercase">Ad</div>
              <div className="flex-1 overflow-hidden">
                <p className="text-[11px] font-black text-slate-700 truncate uppercase">Administrator</p>
                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Master User</p>
              </div>
            </div>
          </div>
        </aside>

        {/* --- Main Viewport --- */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          
          {/* Universal Header */}
          <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 shrink-0 z-20 shadow-sm">
            <div className="flex items-center gap-6">
              <h1 className="text-slate-800 font-black text-lg uppercase tracking-tight flex items-center gap-3">
                <span className="bg-red-600 text-white px-2 py-0.5 rounded text-sm italic">K</span>
                Kayaar Exports <span className="text-slate-300 font-normal ml-2">|</span> <span className="text-blue-600 text-sm tracking-widest ml-2">FY 2025-26</span>
              </h1>
            </div>

            <div className="flex items-center gap-6">
               <div className="flex flex-col items-end">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Network Node</span>
                  <span className="text-xs font-bold text-emerald-500 flex items-center gap-1.5 uppercase">
                    <span className="h-2 w-2 bg-emerald-500 rounded-full animate-pulse"></span> 
                    Active Server
                  </span>
               </div>
               <div className="h-8 w-px bg-slate-200"></div>
               <div className="flex flex-col items-end">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">System Date</span>
                  <span className="text-xs font-black text-slate-700 uppercase">
                    {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </span>
               </div>
            </div>
          </header>

          {/* View Container */}
          <main className="flex-1 overflow-y-auto bg-slate-50 relative">
             <Routes>
                {/* Master Routes */}
                <Route path="/accounts" element={<AccountMaster />} />
                <Route path="/product" element={<ProductMaster />} />
                <Route path="/tariff" element={<TariffMaster />} />
                <Route path="/broker" element={<BrokerMaster />} />
                <Route path="/transport" element={<TransportMaster />} />
                <Route path="/invoice-types" element={<InvoiceTypeMaster />} />
                <Route path="/packing" element={<PackingTypeMaster />} />
                {/* <Route path="/spinning-counts" element={<SpinningCountMaster />} /> */}

                {/* Transaction Routes */}
                <Route path="/order-with" element={<SalesWithOrder />} />
                <Route path="/order-without" element={<SalesWithoutOrder />} />
                <Route path="/production" element={<RG1Production />} />
                <Route path="/despatch" element={<DespatchEntry />} />
                <Route path="/invoice-prep" element={<InvoicePreparation />} />
                <Route path="/invoice-approval" element={<InvoiceApproval />} />

                {/* Depot Routes */}
                <Route path="/depot-sales" element={<DepotSalesInvoice />} />
                <Route path="/depot-received" element={<DepotStockReceived />} />
                <Route path="/depot-transfer" element={<DepotTransfer />} />
                <Route path="/depot-opening" element={<DepotOpeningStock />} />

                {/* Reports */}
                <Route path="/reports" element={<ReportsDashboard />} />

                {/* Landing Page */}
                <Route path="/" element={<DashboardHome />} />
              </Routes>
          </main>
          
          {/* Technical Footer Status Bar */}
          <footer className="h-8 bg-slate-900 text-slate-400 text-[9px] px-6 flex items-center justify-between font-mono uppercase tracking-[0.2em] shrink-0 border-t border-white/5">
             <div className="flex gap-6">
                <span className="text-slate-500 flex items-center gap-2"><ShieldCheck size={12} className="text-blue-500"/> SECURE SESSION: TRUE</span>
                <span className="flex items-center gap-2"><HardDrive size={12} /> DB: MARIADB_INTERNAL_10.4</span>
             </div>
             <div className="flex gap-6">
                <span className="text-blue-400 font-black tracking-widest">License: Registered To Kayaar Exports Pvt Ltd</span>
                <span className="text-slate-600">Build: 2025.04.1.A</span>
             </div>
          </footer>
        </div>
      </div>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 5px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #cbd5e1; }
        
        /* Modern Scrollbar for Main View */
        * { scrollbar-width: thin; scrollbar-color: #cbd5e1 transparent; }
      `}</style>
    </Router>
  );
}