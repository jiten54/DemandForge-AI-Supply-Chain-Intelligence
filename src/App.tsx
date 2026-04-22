import { useState, useEffect, useCallback } from 'react';
import { 
  TrendingUp, 
  Store, 
  Package, 
  BarChart3, 
  AlertTriangle, 
  LayoutDashboard, 
  FileText,
  ChevronRight,
  Download,
  Info,
  Calendar,
  Layers,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  Brain
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ReferenceLine,
  Legend,
  BarChart,
  Bar,
  Cell,
  PieChart,
  Pie
} from 'recharts';
import { format, subDays, addDays } from 'date-fns';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { GoogleGenAI } from "@google/genai";

// --- Utils ---
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// --- Data Types ---
interface DemandData {
  date: string;
  sales: number;
  isPromo: boolean;
}

interface ForecastData {
  date: string;
  predicted: number;
  upper: number;
  lower: number;
}

interface InventoryState {
  currentStock: number;
  reorderPoint: number;
  needsRestock: boolean;
  recommendedQty: number;
  leadTime: number;
}

// --- Components ---

const SidebarItem = ({ icon: Icon, label, active = false, onClick }: any) => (
  <button 
    onClick={onClick}
    className={cn(
      "w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-all duration-200 rounded-lg mb-1",
      active ? "bg-prof-sidebar-active text-white" : "text-prof-sidebar-muted hover:text-white hover:bg-prof-sidebar-border/50"
    )}
  >
    <Icon size={18} />
    <span>{label}</span>
  </button>
);

const InventoryMonitor = ({ inventory }: { inventory: InventoryState | null }) => {
  if (!inventory) return null;
  
  return (
    <div className="bg-white border border-prof-border rounded-xl p-6 shadow-sm flex flex-col justify-between">
      <div>
        <div className="flex justify-between items-center mb-6">
          <h4 className="text-[11px] font-black uppercase text-prof-text-secondary tracking-[0.2em]">Decision Engine</h4>
          <Activity size={14} className={inventory.needsRestock ? "text-rose-500 animate-pulse" : "text-emerald-500"} />
        </div>
        <div className="space-y-4">
          <div className="flex justify-between items-end">
            <span className="text-[10px] font-bold text-prof-text-secondary uppercase">Stock Status</span>
            <span className={cn(
              "text-xs font-black uppercase tracking-widest",
              inventory.needsRestock ? "text-rose-600" : "text-emerald-600"
            )}>
              {inventory.needsRestock ? "CRITICAL: REORDER" : "LEVELS OPTIMAL"}
            </span>
          </div>
          <div className="flex justify-between items-center bg-prof-bg/20 p-3 rounded-lg border border-prof-border/50">
            <div className="space-y-1">
              <span className="text-[9px] font-bold text-prof-text-secondary uppercase">Current Inventory</span>
              <p className="text-xl font-black text-prof-text-primary">{inventory.currentStock.toLocaleString()}u</p>
            </div>
            <div className="h-8 w-[1px] bg-prof-border" />
            <div className="space-y-1 text-right">
              <span className="text-[9px] font-bold text-prof-text-secondary uppercase">Reorder Point</span>
              <p className="text-xl font-black text-prof-text-primary">{inventory.reorderPoint.toLocaleString()}u</p>
            </div>
          </div>
          {inventory.needsRestock && (
            <div className="bg-rose-50 border border-rose-100 p-3 rounded-lg flex items-center gap-3">
              <div className="p-2 bg-white rounded-md shadow-sm">
                <AlertTriangle size={14} className="text-rose-500" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-rose-800 uppercase tracking-tight">Recommended Action</p>
                <p className="text-[11px] text-rose-700 font-medium">Restock <span className="font-black">+{inventory.recommendedQty}u</span> immediately (ETD: {inventory.leadTime}d)</p>
              </div>
            </div>
          )}
        </div>
      </div>
      {!inventory.needsRestock && (
        <div className="mt-4 p-3 bg-emerald-50 border border-emerald-100 rounded-lg flex items-center gap-3">
          <Activity size={14} className="text-emerald-500" />
          <p className="text-[11px] text-emerald-700 font-medium">Inventory sufficient for forecast horizon + safety buffer.</p>
        </div>
      )}
    </div>
  );
};

const StatCard = ({ title, value, change, trend, icon: Icon }: any) => (
  <div className="bg-white border border-prof-border p-5 rounded-xl shadow-sm hover:shadow-md transition-shadow">
    <div className="flex justify-between items-start mb-4">
      <div className="p-2 bg-prof-bg rounded-lg">
        <Icon size={18} className="text-prof-sidebar" />
      </div>
      {change && (
        <span className={cn(
          "flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider",
          trend === 'up' ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
        )}>
          {trend === 'up' ? "↑" : "↓"} {change}
        </span>
      )}
    </div>
    <div className="space-y-1">
      <h3 className="text-prof-text-secondary text-[11px] font-bold tracking-wider uppercase">{title}</h3>
      <p className="text-2xl font-extrabold text-prof-text-primary tracking-tight">{value}</p>
    </div>
  </div>
);

export default function App() {
  const [view, setView] = useState('forecast');
  const [history, setHistory] = useState<DemandData[]>([]);
  const [forecast, setForecast] = useState<ForecastData[]>([]);
  const [inventory, setInventory] = useState<InventoryState | null>(null);
  const [selectedStore, setSelectedStore] = useState('ST_001');
  const [selectedProduct, setSelectedProduct] = useState('PRD_001');
  const [loading, setLoading] = useState(true);
  const [aiInsight, setAiInsight] = useState<string>("");
  const [isAiLoading, setIsAiLoading] = useState(false);

  const fetchAiInsight = useCallback(async (historical: DemandData[], predicted: ForecastData[]) => {
    setIsAiLoading(true);
    try {
      const summary = historical.slice(-7).map(d => `${d.date}: ${d.sales}`).join(', ');
      const forecastSummary = predicted.slice(0, 7).map(p => `${p.date}: ${p.predicted}`).join(', ');
      
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [
          {
            parts: [{
              text: `As a Senior Demand Planner, analyze this data for ${selectedProduct} at ${selectedStore}:
              Recent History (7 days): ${summary}
              Forecast (Next 7 days): ${forecastSummary}
              
              Provide one sharp, actionable supply chain insight (max 40 words). Focus on stock levels or promotions.`
            }]
          }
        ],
        config: {
          systemInstruction: "You are a world-class supply chain expert. Be concise, professional, and actionable."
        }
      });
      
      setAiInsight(response.text || "Analyzing current patterns...");
    } catch (e) {
      setAiInsight("Unable to generate strategy insight.");
    } finally {
      setIsAiLoading(false);
    }
  }, [selectedProduct, selectedStore]);

  useEffect(() => {
    async function fetchData() {
      try {
        const [historyRes, forecastRes] = await Promise.all([
          fetch('/api/data'),
          fetch('/api/forecast')
        ]);
        const historyData = await historyRes.json();
        const forecastResponse = await forecastRes.json();
        
        const filteredHistory = historyData.filter((d: any) => d.storeId === selectedStore && d.productId === selectedProduct);
        setHistory(filteredHistory);
        setForecast(forecastResponse.forecast);
        setInventory(forecastResponse.inventory);

        fetchAiInsight(filteredHistory, forecastResponse.forecast);
      } catch (e) {
        console.error("Fetch failed", e);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [selectedStore, selectedProduct, fetchAiInsight]);

  const chartData = [
    ...history.slice(-30).map(d => ({ date: d.date, actual: d.sales, type: 'History' })),
    ...forecast.map(d => ({ date: d.date, predicted: d.predicted, upper: d.upper, lower: d.lower, type: 'Forecast' }))
  ];

  return (
    <div className="flex h-screen bg-prof-bg font-sans selection:bg-prof-accent/20">
      {/* Sidebar */}
      <aside className="w-65 border-r border-prof-sidebar-border bg-prof-sidebar flex flex-col p-6 shadow-2xl">
        <div className="mb-10 flex flex-col">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xl font-black text-prof-accent-sky tracking-tighter uppercase italic">ZEPTO</span>
            <span className="text-xl font-light text-white tracking-widest uppercase">FORECAST</span>
          </div>
          <span className="text-[10px] font-bold text-prof-sidebar-border tracking-widest uppercase ml-1">v4.2.0-STABLE</span>
        </div>

        <div className="mb-6">
          <h4 className="text-[10px] font-bold text-prof-sidebar-muted uppercase tracking-[0.2em] mb-4">Navigational Nodes</h4>
          <nav className="flex flex-col">
            <SidebarItem icon={LayoutDashboard} label="Operations Floor" active={view === 'forecast'} onClick={() => setView('forecast')} />
            <SidebarItem icon={Layers} label="Inventory Health" active={view === 'inventory'} onClick={() => setView('inventory')} />
            <SidebarItem icon={Store} label="Store Mapping" active={view === 'store'} onClick={() => setView('store')} />
            <SidebarItem icon={FileText} label="Model Logs" active={view === 'models'} onClick={() => setView('models')} />
          </nav>
        </div>

        <div className="mt-auto">
          <div className="bg-prof-sidebar-border rounded-xl p-4 border border-prof-sidebar-active/50 overflow-hidden relative group">
             <div className="absolute top-0 right-0 w-16 h-16 bg-prof-accent/5 rounded-full -mr-8 -mt-8" />
             <div className="text-[10px] font-bold text-prof-sidebar-muted uppercase tracking-widest mb-3 flex justify-between">
                <span>Active Context</span>
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
             </div>
             <div className="space-y-1.5 font-mono text-[11px] text-white/90">
                <div className="flex justify-between">
                  <span className="text-prof-sidebar-muted">Store:</span>
                  <span className="text-prof-accent-sky">{selectedStore}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-prof-sidebar-muted">Model:</span>
                  <span className="text-white">LSTM-v2</span>
                </div>
             </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto px-10 py-8">
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
          <div>
            <h1 className="text-3xl font-black text-prof-text-primary tracking-tight">Demand Intelligence</h1>
            <p className="text-sm text-prof-text-secondary mt-1 font-medium italic">Predictive analysis for {selectedStore} over Mumbai nodes.</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-white border border-prof-border rounded-lg px-4 py-2 shadow-sm focus-within:border-prof-accent">
              <Store size={14} className="text-prof-text-secondary" />
              <select 
                value={selectedStore} 
                onChange={(e) => setSelectedStore(e.target.value)}
                className="bg-transparent text-xs font-bold text-prof-text-primary outline-none cursor-pointer"
              >
                <option value="ST_001">Downtown (402)</option>
                <option value="ST_002">North (501)</option>
                <option value="ST_003">West (109)</option>
              </select>
            </div>
            <div className="flex items-center gap-2 bg-white border border-prof-border rounded-lg px-4 py-2 shadow-sm focus-within:border-prof-accent">
              <Package size={14} className="text-prof-text-secondary" />
              <select 
                value={selectedProduct} 
                onChange={(e) => setSelectedProduct(e.target.value)}
                className="bg-transparent text-xs font-bold text-prof-text-primary outline-none cursor-pointer"
              >
                <option value="PRD_001">Fresh Milk 1L</option>
                <option value="PRD_002">Sourdough Loaf</option>
                <option value="PRD_003">Haas Avocado</option>
                <option value="PRD_004">Greek Yogurt</option>
                <option value="PRD_005">Sparkling Water</option>
              </select>
            </div>
            <button className="bg-prof-sidebar text-white px-5 py-2.5 rounded-lg font-bold text-xs flex items-center gap-2 hover:bg-prof-sidebar-active transition-all shadow-lg active:scale-95">
              <Download size={14} />
              Export PDF
            </button>
          </div>
        </header>

        <div className="space-y-8 max-w-7xl">
          {/* Stats Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard title="MAE Score" value="12.42" change="↓ 2.1%" trend="up" icon={TrendingUp} />
            <StatCard title="Stockout Risk" value={inventory?.needsRestock ? "CRITICAL" : "LOW"} change={inventory?.needsRestock ? "↑ 12%" : "↓ 4%"} trend={inventory?.needsRestock ? "down" : "up"} icon={AlertTriangle} />
            <StatCard title="Best Weighted" value="LSTM-v2" change="Resign" trend="up" icon={Brain} />
            <StatCard title="30D Forecast" value="+14,201" change="+8.3%" trend="up" icon={BarChart3} />
          </div>

          {/* Forecast Card */}
          <div className="bg-white border border-prof-border rounded-xl shadow-sm overflow-hidden flex flex-col h-[520px]">
            <div className="p-6 border-b border-prof-border flex justify-between items-center bg-white">
              <div>
                <h3 className="text-prof-text-primary font-black text-lg">Actual vs. Predicted Sales</h3>
                <p className="text-xs text-prof-text-secondary mt-1 font-medium">Monitoring variance and model resilience</p>
              </div>
              <div className="flex gap-4">
                 <div className="flex items-center gap-2 text-[10px] font-bold uppercase text-prof-text-secondary">
                    <div className="w-2.5 h-2.5 bg-zinc-300 rounded-full" />
                    Historical
                 </div>
                 <div className="flex items-center gap-2 text-[10px] font-bold uppercase text-prof-accent">
                    <div className="w-2.5 h-2.5 bg-prof-accent rounded-full border-2 border-white shadow-sm" />
                    Forecast
                 </div>
              </div>
            </div>
            <div className="flex-1 p-8">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#94a3b8" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#94a3b8" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorPredicted" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="date" 
                    stroke="#94a3b8" 
                    fontSize={10} 
                    fontWeight={600}
                    tickFormatter={(d) => format(new Date(d), 'MMM d')}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis stroke="#94a3b8" fontSize={10} fontWeight={600} axisLine={false} tickLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '11px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}
                    cursor={{ stroke: '#3b82f6', strokeWidth: 1, strokeDasharray: '4 4' }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="actual" 
                    stroke="#cbd5e1" 
                    strokeWidth={2}
                    fillOpacity={1} 
                    fill="url(#colorActual)" 
                  />
                  <Area 
                    type="monotone" 
                    dataKey="predicted" 
                    stroke="#3b82f6" 
                    strokeWidth={3}
                    fillOpacity={1} 
                    fill="url(#colorPredicted)" 
                  />
                  <ReferenceLine x={history[history.length - 1]?.date} stroke="#3b82f6" label={{ position: 'top', value: 'CUTOFF', fill: '#3b82f6', fontSize: 9, fontWeight: 800 }} strokeWidth={2} strokeDasharray="3 3" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
             {/* Model Table */}
             <div className="lg:col-span-2 space-y-6">
                <div className="bg-white border border-prof-border rounded-xl shadow-sm overflow-hidden">
                  <div className="p-4 border-b border-prof-border bg-prof-bg/30">
                    <h4 className="text-[11px] font-black uppercase text-prof-text-secondary tracking-[0.2em]">Model Benchmarking</h4>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead className="bg-prof-bg/10 border-b border-prof-border">
                        <tr>
                          <th className="px-6 py-3 text-[10px] font-black text-prof-text-secondary uppercase">Model Name</th>
                          <th className="px-6 py-3 text-[10px] font-black text-prof-text-secondary uppercase">RMSE</th>
                          <th className="px-6 py-3 text-[10px] font-black text-prof-text-secondary uppercase">MAPE</th>
                          <th className="px-6 py-3 text-[10px] font-black text-prof-text-secondary uppercase">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-prof-border">
                        {[
                          { name: 'Stacked Ensemble (XGB+LSTM)', rmse: 14.22, mape: '18.1%', status: 'Active', active: true },
                          { name: 'XGBoost Regression', rmse: 18.91, mape: '19.8%', status: 'Baseline', active: false },
                          { name: 'Facebook Prophet', rmse: 22.10, mape: '21.2%', status: 'Idle', active: false },
                          { name: 'Baseline (Moving Average)', rmse: 29.45, mape: '22.0%', status: 'Reference', active: false },
                        ].map((m) => (
                          <tr key={m.name} className="hover:bg-prof-bg/20 transition-colors">
                            <td className="px-6 py-4 text-xs font-bold text-prof-text-primary">{m.name}</td>
                            <td className="px-6 py-4 text-xs text-prof-text-secondary font-mono">{m.rmse}</td>
                            <td className="px-6 py-4 text-xs text-prof-text-secondary font-mono">{m.mape}</td>
                            <td className="px-6 py-4 text-xs">
                              <span className={cn(
                                "px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest",
                                m.active ? "bg-emerald-100 text-emerald-800" : "bg-prof-bg text-prof-text-secondary"
                              )}>
                                {m.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="bg-white border border-prof-border rounded-xl p-6 shadow-sm">
                   <div className="flex justify-between items-center mb-6">
                     <h4 className="text-[11px] font-black uppercase text-prof-text-secondary tracking-[0.2em]">Feature Impact</h4>
                     <BarChart3 size={14} className="text-prof-accent" />
                   </div>
                   <div className="space-y-5">
                      {[
                        { label: 'Weekly Seasonality', value: 85 },
                        { label: 'Holiday Effect', value: 42 },
                        { label: 'Lag Coefficients', value: 31 }
                      ].map(item => (
                        <div key={item.label} className="space-y-2">
                           <div className="flex justify-between text-[10px] font-bold">
                              <span className="text-prof-text-secondary uppercase">{item.label}</span>
                              <span className="text-prof-text-primary">{item.value}%</span>
                           </div>
                           <div className="h-1.5 bg-prof-bg rounded-full overflow-hidden">
                              <div className="h-full bg-prof-accent rounded-full transition-all duration-1000" style={{ width: `${item.value}%` }} />
                           </div>
                        </div>
                      ))}
                   </div>
                </div>
             </div>

             {/* Decision Engine & Strategy AI */}
             <div className="space-y-6">
                <InventoryMonitor inventory={inventory} />

                <div className="bg-prof-sidebar rounded-xl p-6 shadow-xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-prof-accent/10 rounded-full blur-3xl -mr-16 -mt-16" />
                  <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center gap-2 text-prof-accent-sky">
                      <Brain size={16} />
                      <span className="text-[10px] font-black uppercase tracking-widest">Strategy AI</span>
                    </div>
                    {isAiLoading && <Activity size={12} className="text-prof-accent-sky animate-spin" />}
                  </div>
                  <p className="text-xs text-white/90 leading-relaxed font-serif italic relative z-10">
                    "{aiInsight || "Synchronizing with Mumbai inventory nodes to generate high-confidence tactical advice..."}"
                  </p>
                </div>
             </div>
          </div>
        </div>
      </main>
    </div>
  );
}
