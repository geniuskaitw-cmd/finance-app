'use client';

import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import {
  ChevronLeft,
  ChevronRight,
  PieChart,
  TrendingUp,
  X,
  Car,
  Utensils,
  ShoppingBag,
  Gamepad2,
  Stethoscope,
  GraduationCap,
  Home,
  Lamp,
  Wifi,
  Plane,
  Shirt,
  Gift,
  CircleHelp,
  Calendar as CalendarIcon,
} from 'lucide-react';

/** --------------------------------------------------------
 * Constants & Types
 * -------------------------------------------------------- */
const CATEGORIES = [
  '餐飲食品', '交通', '日用品', '娛樂', '醫療', '教育', 
  '住房', '水電瓦斯', '通訊網路', '旅行', '服飾衣物', '雜費'
];

const CATEGORY_COLORS: Record<string, string> = {
  '餐飲食品': '#F87171', // Red
  '交通': '#60A5FA',     // Blue
  '日用品': '#34D399',   // Green
  '娛樂': '#FBBF24',     // Yellow
  '醫療': '#A78BFA',     // Purple
  '教育': '#F472B6',     // Pink
  '住房': '#818CF8',     // Indigo
  '水電瓦斯': '#FCD34D', // Amber
  '通訊網路': '#6EE7B7', // Emerald
  '旅行': '#38BDF8',     // Sky
  '服飾衣物': '#C084FC', // Violet
  '雜費': '#9CA3AF',     // Gray
  'default': '#CBD5E1'
};

function getCategoryColor(cat: string) {
  return CATEGORY_COLORS[cat] || CATEGORY_COLORS['default'];
}

// Icon mapping
function CategoryIcon({ category, className }: { category: string, className?: string }) {
  const props = { className: className || "w-6 h-6" };
  switch (category) {
    case '餐飲食品': return <Utensils {...props} />;
    case '交通': return <Car {...props} />;
    case '日用品': return <ShoppingBag {...props} />;
    case '娛樂': return <Gamepad2 {...props} />;
    case '醫療': return <Stethoscope {...props} />;
    case '教育': return <GraduationCap {...props} />;
    case '住房': return <Home {...props} />;
    case '水電瓦斯': return <Lamp {...props} />;
    case '通訊網路': return <Wifi {...props} />;
    case '旅行': return <Plane {...props} />;
    case '服飾衣物': return <Shirt {...props} />;
    case '雜費': return <Gift {...props} />;
    default: return <CircleHelp {...props} />;
  }
}

type CategoryStat = {
  category: string;
  total: number;
  percentage: number;
  color: string;
};

/** --------------------------------------------------------
 * Donut Chart Component (SVG Path)
 * -------------------------------------------------------- */
function DonutChart({ data, total }: { data: CategoryStat[], total: number }) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  // Helpers for creating arc paths
  function getCoordinatesForPercent(percent: number) {
    const x = Math.cos(2 * Math.PI * percent);
    const y = Math.sin(2 * Math.PI * percent);
    return [x, y];
  }

  let cumulativePercent = 0;
  const paths = data.map((slice, index) => {
    const startPercent = cumulativePercent;
    const endPercent = cumulativePercent + (slice.percentage / 100);
    cumulativePercent = endPercent;

    // if full circle (100%), handle special case
    if (slice.percentage >= 99.9) {
       return {
         ...slice,
         pathData: `M 1 0 A 1 1 0 1 1 -1 0 A 1 1 0 1 1 1 0`, // 2 arcs to make a circle
         index
       };
    }

    const [startX, startY] = getCoordinatesForPercent(startPercent);
    const [endX, endY] = getCoordinatesForPercent(endPercent);
    const largeArcFlag = slice.percentage / 100 > 0.5 ? 1 : 0;

    // Create an SVG path
    // M 0 0 L startX startY A 1 1 0 largeArcFlag 1 endX endY Z (Pie)
    // We want Donut, so we'll mask center or stroke? 
    // Better to use thick stroke on a path.
    // Path for stroke: M startX startY A 1 1 0 largeArcFlag 1 endX endY
    const pathData = `M ${startX} ${startY} A 1 1 0 ${largeArcFlag} 1 ${endX} ${endY}`;

    return { ...slice, pathData, index };
  });

  // Center Text Logic
  const activeItem = activeIndex !== null ? data[activeIndex] : null;
  const centerLabel = activeItem ? activeItem.category : "總支出";
  const centerValue = activeItem 
    ? `${activeItem.percentage.toFixed(1)}%` 
    : `$${total.toLocaleString()}`;
  const centerSubValue = activeItem ? `$${activeItem.total.toLocaleString()}` : "";

  if (total === 0) {
    return (
      <div className="relative w-52 h-52 mx-auto flex items-center justify-center">
        <div className="absolute inset-0 rounded-full border-[16px] border-gray-100"></div>
        <div className="text-gray-400 text-sm">本月無支出</div>
      </div>
    );
  }

  return (
    <div className="relative w-56 h-56 mx-auto">
      <svg viewBox="-1.2 -1.2 2.4 2.4" className="transform -rotate-90 w-full h-full">
        {paths.map((slice) => (
          <path
            key={slice.index}
            d={slice.pathData}
            fill="transparent"
            stroke={slice.color}
            strokeWidth="0.25" // Thickness of the donut ring
            className={`cursor-pointer transition-all duration-200 hover:opacity-90 ${activeIndex === slice.index ? 'opacity-100 stroke-[0.28]' : 'opacity-100'}`}
            onClick={() => setActiveIndex(slice.index === activeIndex ? null : slice.index)}
          />
        ))}
      </svg>
      
      {/* Center Text (Click center to reset) */}
      <div 
        className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none"
      >
        <div className="text-sm text-gray-500 font-medium mb-1">{centerLabel}</div>
        <div className="text-2xl font-bold text-gray-800">{centerValue}</div>
        {centerSubValue && (
          <div className="text-sm text-gray-500 font-medium mt-1">{centerSubValue}</div>
        )}
      </div>
      
      {/* Reset overlay if active */}
      {activeIndex !== null && (
         <div 
           className="absolute inset-0 z-[-1] cursor-pointer" 
           onClick={() => setActiveIndex(null)}
         />
      )}
    </div>
  );
}

/** --------------------------------------------------------
 * Trend Chart Component
 * -------------------------------------------------------- */
function TrendChart({ data, category }: { data: { month: string, total: number }[], category: string }) {
  const max = Math.max(...data.map(d => d.total), 1);
  const color = getCategoryColor(category);

  if (data.length === 0) return <div className="h-48 flex items-center justify-center text-gray-400">無資料</div>;

  // 為避免資料過多擠在一起，設定最小寬度並允許橫向捲動
  return (
    <div className="w-full overflow-x-auto pb-2 touch-pan-x">
        <div className="flex items-end h-48 gap-3 pt-6 px-1" style={{ minWidth: `${Math.max(300, data.length * 60)}px` }}>
        {data.map((item, i) => {
            const heightPercent = (item.total / max) * 100;
            return (
            <div key={i} className="flex-1 flex flex-col items-center gap-2 group min-w-[30px]">
                <div className="text-[10px] text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity font-mono mb-1 absolute -mt-6">
                    ${item.total}
                </div>
                <div 
                className="w-full rounded-t-md transition-all duration-500 relative hover:opacity-80 min-h-[4px]"
                style={{ height: `${heightPercent}%`, backgroundColor: color }}
                >
                </div>
                <div className="text-[10px] text-gray-500 font-medium whitespace-nowrap">
                    {item.month.slice(5)}
                </div>
            </div>
            );
        })}
        </div>
    </div>
  );
}

export default function StatsPage() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [stats, setStats] = useState<CategoryStat[]>([]);
  const [monthTotal, setMonthTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  // Trend Modal
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [trendData, setTrendData] = useState<{ month: string, total: number }[]>([]);
  const [trendLoading, setTrendLoading] = useState(false);
  
  // Custom Range for Trend
  const [trendRange, setTrendRange] = useState<{ start: string, end: string }>({
    start: '', end: ''
  });

  // Init trend range when category selected (default last 6 months)
  useEffect(() => {
    if (selectedCategory) {
        // 使用本地時間計算，避免 UTC 時區差異導致月份錯誤
        const now = new Date();
        
        // 結束月份：當前月份
        const endYear = now.getFullYear();
        const endMonth = now.getMonth() + 1;
        
        // 開始月份：5個月前
        // 邏輯：建立一個日期在當月1號，然後扣掉5個月
        const startObj = new Date(endYear, now.getMonth() - 5, 1); 
        const startYear = startObj.getFullYear();
        const startMonth = startObj.getMonth() + 1;

        const fmt = (y: number, m: number) => `${y}-${String(m).padStart(2, '0')}`;

        setTrendRange({
            start: fmt(startYear, startMonth),
            end: fmt(endYear, endMonth)
        });
    }
  }, [selectedCategory]);

  // Format: YYYY-MM
  const currentMonthStr = currentMonth.toISOString().slice(0, 7);

  /** -----------------------------
   * Fetch Monthly Data
   * ----------------------------- */
  useEffect(() => {
    async function fetchStats() {
      setLoading(true);
      const { data, error } = await supabase
        .from('expenses')
        .select('amount, category')
        .like('time', `${currentMonthStr}%`);

      if (error || !data) {
        console.error(error);
        setStats([]);
        setMonthTotal(0);
        setLoading(false);
        return;
      }

      const map: Record<string, number> = {};
      let total = 0;
      data.forEach((item: any) => {
        const cat = item.category || '未分類';
        const amt = Number(item.amount) || 0;
        if (cat) {
             map[cat] = (map[cat] || 0) + amt;
             total += amt;
        }
      });

      const result: CategoryStat[] = Object.keys(map)
        .map(cat => ({
          category: cat,
          total: map[cat],
          percentage: total === 0 ? 0 : (map[cat] / total) * 100,
          color: getCategoryColor(cat)
        }))
        .sort((a, b) => b.total - a.total);

      setStats(result);
      setMonthTotal(total);
      setLoading(false);
    }

    fetchStats();
  }, [currentMonthStr]);

  /** -----------------------------
   * Fetch Trend Data (with custom range)
   * ----------------------------- */
  useEffect(() => {
    if (!selectedCategory || !trendRange.start || !trendRange.end) return;
    
    async function fetchTrend() {
      setTrendLoading(true);
      
      // range: start ~ end
      const startStr = trendRange.start + '-01';
      // end date needs to cover the full month, so calculate next month 1st day then minus 1 sec? 
      // Or just simple string match. YYYY-MM is enough for grouping, but for querying we need range.
      // Simple way: time >= start-01 AND time <= end-31
      // Let's use simple string compare for months if format matches? No.
      
      const { data, error } = await supabase
        .from('expenses')
        .select('amount, time')
        .eq('category', selectedCategory)
        .gte('time', startStr)
        .lte('time', trendRange.end + '-31') // Rough end date covering
        .order('time', { ascending: true });

      if (error || !data) {
        setTrendData([]);
      } else {
        const monthMap: Record<string, number> = {};
        
        // Generate all months in range (to show 0 for empty months)
        const s = new Date(trendRange.start + '-01');
        const e = new Date(trendRange.end + '-01');
        const loop = new Date(s);
        
        while(loop <= e) {
            const k = loop.toISOString().slice(0, 7);
            monthMap[k] = 0;
            loop.setMonth(loop.getMonth() + 1);
        }

        data.forEach((item: any) => {
           const k = item.time.slice(0, 7);
           if (monthMap[k] !== undefined) {
               monthMap[k] += Number(item.amount) || 0;
           }
        });

        const arr = Object.keys(monthMap).sort().map(k => ({
            month: k,
            total: monthMap[k]
        }));
        setTrendData(arr);
      }
      setTrendLoading(false);
    }
    fetchTrend();
  }, [selectedCategory, trendRange]);


  function prevMonth() {
    const d = new Date(currentMonth);
    d.setMonth(d.getMonth() - 1);
    setCurrentMonth(d);
  }

  function nextMonth() {
    const d = new Date(currentMonth);
    d.setMonth(d.getMonth() + 1);
    setCurrentMonth(d);
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="p-4 max-w-md mx-auto w-full flex-1 flex flex-col">
        
        {/* 標題與月份切換 */}
        <div className="flex justify-between items-center mb-6">
          <button onClick={prevMonth} className="p-3 border rounded-full bg-white shadow-sm hover:bg-gray-50 active:bg-gray-100">
             <ChevronLeft className="w-6 h-6 stroke-[3]" />
          </button>
          <div className="text-xl font-bold">
             {currentMonth.getFullYear()} 年 {currentMonth.getMonth() + 1} 月
          </div>
          <button onClick={nextMonth} className="p-3 border rounded-full bg-white shadow-sm hover:bg-gray-50 active:bg-gray-100">
             <ChevronRight className="w-6 h-6 stroke-[3]" />
          </button>
        </div>

        {/* 圓餅圖 */}
        <div className="bg-white p-6 rounded-2xl shadow-sm mb-6 flex justify-center">
          <DonutChart data={stats} total={monthTotal} />
        </div>

        {/* 分類列表 */}
        <div className="space-y-3 pb-20">
          {loading ? (
            <div className="text-center text-gray-400 py-10">計算中...</div>
          ) : stats.length === 0 ? (
            <div className="text-center text-gray-400 py-10">本月尚無資料</div>
          ) : (
            stats.map((stat) => (
              <div 
                key={stat.category}
                onClick={() => setSelectedCategory(stat.category)}
                className="bg-white p-4 rounded-xl shadow-sm border flex items-center gap-4 hover:bg-gray-50 cursor-pointer active:scale-[0.98] transition-all"
              >
                {/* Icon */}
                <div className="w-12 h-12 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: stat.color + '20', color: stat.color }}>
                  <CategoryIcon category={stat.category} />
                </div>

                {/* Info */}
                <div className="flex-1">
                  <div className="flex justify-between items-end mb-1">
                    <div className="font-bold text-gray-900">{stat.category}</div>
                    <div className="font-bold text-gray-900">${stat.total.toLocaleString()}</div>
                  </div>
                  
                  {/* Progress Bar */}
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full rounded-full"
                        style={{ width: `${stat.percentage}%`, backgroundColor: stat.color }}
                      />
                    </div>
                    <div className="text-xs text-gray-400 w-10 text-right">{stat.percentage.toFixed(1)}%</div>
                  </div>
                </div>
                
                <ChevronRight className="w-5 h-5 text-gray-300" />
              </div>
            ))
          )}
        </div>
      </div>

      {/* Trend Modal */}
      {selectedCategory && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm" onClick={() => setSelectedCategory(null)}>
          <div className="bg-white w-full max-w-md rounded-t-3xl p-6 shadow-xl animate-in slide-in-from-bottom-10 flex flex-col max-h-[85vh]" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-3">
                 <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: getCategoryColor(selectedCategory) + '20', color: getCategoryColor(selectedCategory) }}>
                    <CategoryIcon category={selectedCategory} />
                 </div>
                 <div>
                   <h3 className="text-xl font-bold text-gray-900">{selectedCategory}</h3>
                   <p className="text-xs text-gray-500">歷史趨勢</p>
                 </div>
              </div>
              <button onClick={() => setSelectedCategory(null)} className="p-2 text-gray-400 hover:bg-gray-100 rounded-full">
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Date Range Filter */}
            <div className="flex items-center gap-2 mb-4 bg-gray-50 p-2 rounded-xl">
                <div className="flex items-center flex-1">
                    <CalendarIcon className="w-4 h-4 text-gray-400 mr-2" />
                    <input 
                        type="month" 
                        value={trendRange.start}
                        onChange={e => {
                            const newStart = e.target.value;
                            setTrendRange(p => {
                                // 限制最多 12 個月
                                const s = new Date(newStart);
                                const e = new Date(p.end);
                                const months = (e.getFullYear() - s.getFullYear()) * 12 + (e.getMonth() - s.getMonth());
                                if (months > 11) {
                                    // 如果超過 12 個月，自動調整結束日期
                                    const newEnd = new Date(s);
                                    newEnd.setMonth(newEnd.getMonth() + 11);
                                    return { start: newStart, end: newEnd.toISOString().slice(0, 7) };
                                }
                                return { ...p, start: newStart };
                            });
                        }}
                        className="bg-transparent text-sm font-medium text-gray-700 outline-none w-full"
                    />
                </div>
                <span className="text-gray-400">-</span>
                <div className="flex items-center flex-1">
                    <input 
                        type="month" 
                        value={trendRange.end}
                        onChange={e => {
                            const newEnd = e.target.value;
                            setTrendRange(p => {
                                // 限制最多 12 個月
                                const s = new Date(p.start);
                                const e = new Date(newEnd);
                                const months = (e.getFullYear() - s.getFullYear()) * 12 + (e.getMonth() - s.getMonth());
                                if (months > 11) {
                                    // 如果超過 12 個月，自動調整開始日期
                                    const newStart = new Date(e);
                                    newStart.setMonth(newStart.getMonth() - 11);
                                    return { start: newStart.toISOString().slice(0, 7), end: newEnd };
                                }
                                return { ...p, end: newEnd };
                            });
                        }}
                        className="bg-transparent text-sm font-medium text-gray-700 outline-none w-full text-right"
                    />
                </div>
            </div>

            <div className="bg-gray-50 rounded-2xl p-4 flex-1 min-h-[200px] overflow-hidden flex flex-col">
              {trendLoading ? (
                <div className="h-full flex items-center justify-center text-gray-400">載入中...</div>
              ) : (
                <TrendChart data={trendData} category={selectedCategory} />
              )}
            </div>
            
            <div className="mt-6 text-center text-sm text-gray-400">
                點擊其他區域關閉
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
