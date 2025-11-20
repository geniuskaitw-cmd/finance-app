'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import {
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
  CalendarDays,
} from 'lucide-react';

type Expense = {
  id: number;
  user_id: string;
  message: string;
  category: string | null;
  note: string;
  amount: number | null;
  time: string; // YYYY-MM-DD
  intent: string;
  created_at?: string;
};

type NameMap = Record<string, string>;
const NAME_MAP_KEY = 'finance_user_name_map';

// 取得今天 YYYY-MM-DD（台北時區）
function getToday() {
  return new Date()
    .toLocaleString('sv-SE', { timeZone: 'Asia/Taipei' })
    .slice(0, 10);
}

// 日期加減天數（offset: +1 明天，-1 昨天）
function shiftDate(dateStr: string, offset: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + offset);
  return d.toISOString().slice(0, 10);
}

// 取得指定日期所在週（週一～週日）的日期陣列
function getWeekRange(dateStr: string): string[] {
  const d = new Date(dateStr);
  const day = d.getDay() === 0 ? 7 : d.getDay(); // Sunday=0 調整成 7

  const monday = new Date(d);
  monday.setDate(d.getDate() - (day - 1));

  const list: string[] = [];
  for (let i = 0; i < 7; i++) {
    const tmp = new Date(monday);
    tmp.setDate(monday.getDate() + i);
    list.push(tmp.toISOString().slice(0, 10));
  }
  return list;
}

// 取得當月所有日期（YYYY-MM-DD 陣列）
function getMonthRange(dateStr: string): string[] {
  const d = new Date(dateStr);
  const year = d.getFullYear();
  const month = d.getMonth();

  const result: string[] = [];
  const first = new Date(year, month, 1);

  let cur = first;
  while (cur.getMonth() === month) {
    result.push(cur.toISOString().slice(0, 10));
    cur = new Date(cur.getFullYear(), cur.getMonth(), cur.getDate() + 1);
  }

  return result;
}

// 星期文字
function getWeekdayLabel(dateStr: string): string {
  const d = new Date(dateStr);
  const day = d.getDay();
  switch (day) {
    case 0:
      return '週日';
    case 1:
      return '週一';
    case 2:
      return '週二';
    case 3:
      return '週三';
    case 4:
      return '週四';
    case 5:
      return '週五';
    case 6:
      return '週六';
    default:
      return '';
  }
}

// 金額加千分位
function formatAmount(value: number): string {
  return value.toLocaleString('en-US');
}

// Icon mapping：分類名稱 → Icon 元件
function CategoryIcon({ category }: { category: string | null }) {
  const cat = category ?? '';

  if (cat === '餐飲食品') return <Utensils className="w-6 h-6" />;
  if (cat === '交通') return <Car className="w-6 h-6" />;
  if (cat === '日用品') return <ShoppingBag className="w-6 h-6" />;
  if (cat === '娛樂') return <Gamepad2 className="w-6 h-6" />;
  if (cat === '醫療') return <Stethoscope className="w-6 h-6" />;
  if (cat === '教育') return <GraduationCap className="w-6 h-6" />;
  if (cat === '住房') return <Home className="w-6 h-6" />;
  if (cat === '水電瓦斯') return <Lamp className="w-6 h-6" />;
  if (cat === '通訊網路') return <Wifi className="w-6 h-6" />;
  if (cat === '旅行') return <Plane className="w-6 h-6" />;
  if (cat === '服飾衣物') return <Shirt className="w-6 h-6" />;
  if (cat === '雜費') return <Gift className="w-6 h-6" />;

  return <CircleHelp className="w-6 h-6" />;
}

export default function TodayPage() {
  const [data, setData] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState<string>(getToday());
  const [mode, setMode] = useState<'day' | 'week' | 'month'>('day');
  const [sort, setSort] = useState<
    'time-desc' | 'time-asc' | 'amount-desc' | 'amount-asc'
  >('time-desc');
  const [nameMap, setNameMap] = useState<NameMap>({});

  /** -----------------------------
   * 暱稱 map：從 Supabase 讀取 user_names
   * ----------------------------- */
  useEffect(() => {
    async function loadNameMap() {
      try {
        const { data, error } = await supabase
          .from('user_names')
          .select('user_id, display_name');

        if (error) {
          console.error('讀取暱稱失敗', error);
          const raw = localStorage.getItem(NAME_MAP_KEY);
          if (raw) setNameMap(JSON.parse(raw) as NameMap);
          return;
        }

        const map: NameMap = {};
        (data || []).forEach((row: any) => {
          map[row.user_id] = row.display_name;
        });
        setNameMap(map);
        localStorage.setItem(NAME_MAP_KEY, JSON.stringify(map));
      } catch (e) {
        console.warn('讀取暱稱發生錯誤', e);
      }
    }

    loadNameMap();
  }, []);

  /** -----------------------------
   * 抓資料（依模式決定日期範圍）
   * ----------------------------- */
  async function loadData() {
    setLoading(true);

    let dates: string[] = [];
    if (mode === 'day') {
      dates = [currentDate];
    } else if (mode === 'week') {
      dates = getWeekRange(currentDate);
    } else if (mode === 'month') {
      dates = getMonthRange(currentDate);
    }

    const { data, error } = await supabase
      .from('expenses')
      .select('*')
      .in('time', dates)
      .order('created_at', { ascending: false });

    if (error) {
      console.error(error);
      setData([]);
    } else {
      const list = (data || []).slice(); // clone

      // 排序
      list.sort((a, b) => {
        if (sort === 'amount-desc') {
          return (b.amount ?? 0) - (a.amount ?? 0);
        }
        if (sort === 'amount-asc') {
          return (a.amount ?? 0) - (b.amount ?? 0);
        }
        if (sort === 'time-desc') {
          return (b.created_at ?? '').localeCompare(a.created_at ?? '');
        }
        if (sort === 'time-asc') {
          return (a.created_at ?? '').localeCompare(b.created_at ?? '');
        }
        return 0;
      });

      setData(list);
    }

    setLoading(false);
  }

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentDate, mode, sort]);

  /** -----------------------------
   * Header 顯示：日期文字 + 總金額
   * ----------------------------- */
  const { headerDateLabel, headerAmount, headerAmountColor } = useMemo(() => {
    let dateLabel = '';
    if (mode === 'day') {
      const weekday = getWeekdayLabel(currentDate);
      dateLabel = `${currentDate}（${weekday}）`;
    } else if (mode === 'week') {
      const range = getWeekRange(currentDate);
      const start = range[0];
      const end = range[range.length - 1];
      dateLabel = `${start} ~ ${end}`;
    } else if (mode === 'month') {
      const d = new Date(currentDate);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      dateLabel = `${y}-${m}`;
    }

    const total = data.reduce((sum, item) => sum + (item.amount ?? 0), 0);

    let color = 'text-gray-800';
    if (total < 0) color = 'text-red-500';
    else if (total > 0) color = 'text-green-600';

    const label = `$ ${formatAmount(total)}`;

    return {
      headerDateLabel: dateLabel,
      headerAmount: label,
      headerAmountColor: color,
    };
  }, [currentDate, mode, data]);

  /** -----------------------------
   * 左右切換「基準日期」，依模式（日/週/月）切
   * ----------------------------- */
  function handlePrev() {
    if (mode === 'day') {
      setCurrentDate(shiftDate(currentDate, -1));
    } else if (mode === 'week') {
      setCurrentDate(shiftDate(currentDate, -7));
    } else {
      const d = new Date(currentDate);
      d.setMonth(d.getMonth() - 1);
      setCurrentDate(d.toISOString().slice(0, 10));
    }
  }

  function handleNext() {
    if (mode === 'day') {
      setCurrentDate(shiftDate(currentDate, 1));
    } else if (mode === 'week') {
      setCurrentDate(shiftDate(currentDate, 7));
    } else {
      const d = new Date(currentDate);
      d.setMonth(d.getMonth() + 1);
      setCurrentDate(d.toISOString().slice(0, 10));
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="p-4 pb-20 max-w-md mx-auto w-full">
        {/* 上方：左側只有總金額；右側月曆按鈕 */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="text-sm text-gray-500">總金額</div>
            <div className={`text-2xl font-bold mt-1 ${headerAmountColor}`}>
              {headerAmount}
            </div>
          </div>

          <a
            href="/calendar"
            className="flex items-center justify-center w-10 h-10 border rounded-xl bg-white shadow-sm mt-1"
          >
            <CalendarDays className="w-5 h-5" />
          </a>
        </div>

        {/* 日期切換：← 日期 →（日期只出現在箭頭中間） */}
        <div className="flex items-center justify-between mb-4 text-sm">
          <button
            onClick={handlePrev}
            className="px-3 py-2 border rounded-full bg-white shadow-sm"
          >
            ←
          </button>

          <span className="font-medium">{headerDateLabel}</span>

          <button
            onClick={handleNext}
            className="px-3 py-2 border rounded-full bg-white shadow-sm"
          >
            →
          </button>
        </div>

        {/* 日 / 週 / 月 + 排序（同一行左右對稱） */}
        <div className="flex items-center justify-between mb-3 text-sm">
          <div className="flex gap-4">
            <button
              onClick={() => setMode('day')}
              className={`pb-1 border-b-2 ${
                mode === 'day'
                  ? 'border-black font-semibold'
                  : 'border-transparent text-gray-500'
              }`}
            >
              日
            </button>
            <button
              onClick={() => setMode('week')}
              className={`pb-1 border-b-2 ${
                mode === 'week'
                  ? 'border-black font-semibold'
                  : 'border-transparent text-gray-500'
              }`}
            >
              週
            </button>
            <button
              onClick={() => setMode('month')}
              className={`pb-1 border-b-2 ${
                mode === 'month'
                  ? 'border-black font-semibold'
                  : 'border-transparent text-gray-500'
              }`}
            >
              月
            </button>
          </div>

          <select
            value={sort}
            onChange={(e) =>
              setSort(
                e.target.value as
                  | 'time-desc'
                  | 'time-asc'
                  | 'amount-desc'
                  | 'amount-asc',
              )
            }
            className="border rounded px-2 py-1 text-xs bg-white"
          >
            <option value="time-desc">時間：新 → 舊</option>
            <option value="time-asc">時間：舊 → 新</option>
            <option value="amount-desc">金額：大 → 小</option>
            <option value="amount-asc">金額：小 → 大</option>
          </select>
        </div>

        {/* 載入 / 無資料 */}
        {loading && (
          <p className="text-gray-500 text-center mt-4">載入中...</p>
        )}
        {!loading && data.length === 0 && (
          <p className="text-gray-500 text-center mt-4">沒有資料。</p>
        )}

        {/* 記帳卡片列表 */}
        <div className="space-y-2 mt-2 mb-4">
          {data.map((item) => {
            const amount = item.amount ?? 0;
            let amountColorClass = 'text-gray-800';
            if (amount < 0) amountColorClass = 'text-red-500';
            else if (amount > 0) amountColorClass = 'text-green-600';

            const weekday = getWeekdayLabel(item.time);
            const displayUser = nameMap[item.user_id] || item.user_id;

            return (
              <div
                key={item.id}
                className="flex items-stretch justify-between p-3 border rounded-lg bg-white shadow-sm"
              >
                {/* 左側 icon + 文案 */}
                <div className="flex items-center gap-3 flex-1">
                  <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center">
                    <CategoryIcon category={item.category} />
                  </div>

                  <div className="text-xs flex flex-col">
                    <div className="font-semibold text-gray-900 mb-0.5">
                      {item.category || '未分類'}
                    </div>
                    <div className="text-gray-400">
                      {item.time}（{weekday}）
                    </div>
                    <div className="text-gray-600 line-clamp-1">
                      {item.note || item.message}
                    </div>
                  </div>
                </div>

                {/* 右側：金額 + 紀錄者（卡片右下） */}
                <div className="flex flex-col items-end justify-between ml-2 text-xs">
                  <div
                    className={`text-sm font-bold ${amountColorClass} mb-1`}
                  >
                    {amount !== 0 ? formatAmount(amount) : '-'}
                  </div>
                  <div className="text-gray-400 mt-2">
                    紀錄者：{displayUser}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
