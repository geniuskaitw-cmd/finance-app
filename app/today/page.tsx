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
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  MoreVertical,
  Edit,
  Trash2,
  X,
  Check,
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

const CATEGORIES = [
  '餐飲食品', '交通', '日用品', '娛樂', '醫療', '教育', 
  '住房', '水電瓦斯', '通訊網路', '旅行', '服飾衣物', '雜費'
];

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

  if (cat === '餐飲食品') return <Utensils className="w-8 h-8" />;
  if (cat === '交通') return <Car className="w-8 h-8" />;
  if (cat === '日用品') return <ShoppingBag className="w-8 h-8" />;
  if (cat === '娛樂') return <Gamepad2 className="w-8 h-8" />;
  if (cat === '醫療') return <Stethoscope className="w-8 h-8" />;
  if (cat === '教育') return <GraduationCap className="w-8 h-8" />;
  if (cat === '住房') return <Home className="w-8 h-8" />;
  if (cat === '水電瓦斯') return <Lamp className="w-8 h-8" />;
  if (cat === '通訊網路') return <Wifi className="w-8 h-8" />;
  if (cat === '旅行') return <Plane className="w-8 h-8" />;
  if (cat === '服飾衣物') return <Shirt className="w-8 h-8" />;
  if (cat === '雜費') return <Gift className="w-8 h-8" />;

  return <CircleHelp className="w-8 h-8" />;
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

  // 動作選單狀態
  const [actionItem, setActionItem] = useState<Expense | null>(null);
  const [showActionMenu, setShowActionMenu] = useState(false); // 是否顯示選單
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  
  // 編輯表單狀態
  const [editForm, setEditForm] = useState<{
    time: string;
    amount: string;
    note: string;
    category: string;
  }>({ time: '', amount: '', note: '', category: '' });

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
   * 動作處理：刪除與編輯
   * ----------------------------- */
  // 開啟動作選單
  function handleOpenAction(item: Expense) {
    setActionItem(item);
    setShowActionMenu(true);
  }

  // 關閉所有模态框
  function closeAllModals() {
    setActionItem(null);
    setShowActionMenu(false);
    setShowDeleteConfirm(false);
    setShowEditModal(false);
  }

  // 點擊刪除選項
  function onClickDelete() {
    setShowActionMenu(false);
    setShowDeleteConfirm(true);
  }

  // 執行刪除
  async function doDelete() {
    if (!actionItem) return;
    
    const { error, data } = await supabase
      .from('expenses')
      .delete()
      .eq('id', actionItem.id)
      .select();

    if (error) {
      alert('刪除失敗：' + error.message);
    } else if (!data || data.length === 0) {
      alert('刪除失敗：可能是權限不足 (RLS) 或找不到該筆資料。請檢查 Supabase 的 Delete Policy。');
    } else {
      // 重新讀取資料
      loadData();
    }
    closeAllModals();
  }

  // 點擊編輯選項
  function onClickEdit() {
    if (!actionItem) return;
    setEditForm({
      time: actionItem.time,
      amount: String(actionItem.amount ?? 0),
      note: actionItem.note || actionItem.message || '',
      category: actionItem.category || '',
    });
    setShowActionMenu(false);
    setShowEditModal(true);
  }

  // 執行更新
  async function doUpdate() {
    if (!actionItem) return;

    const amountVal = parseFloat(editForm.amount);
    if (isNaN(amountVal)) {
      alert('請輸入有效的金額');
      return;
    }

    const { error, data } = await supabase
      .from('expenses')
      .update({
        time: editForm.time,
        amount: amountVal,
        note: editForm.note,
        category: editForm.category,
        // message 欄位通常與 note 同步，或只用 note，這裡保持同步
        message: editForm.note 
      })
      .eq('id', actionItem.id)
      .select();

    if (error) {
      alert('更新失敗：' + error.message);
    } else if (!data || data.length === 0) {
      alert('更新失敗：可能是權限不足 (RLS) 或找不到該筆資料。請檢查 Supabase 的 Update Policy。');
    } else {
      loadData();
    }
    closeAllModals();
  }

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
        <div className="flex items-start justify-between mb-6">
          <div>
            <div className="text-lg text-gray-500">總金額</div>
            <div className={`text-4xl font-bold mt-2 ${headerAmountColor}`}>
              {headerAmount}
            </div>
          </div>

          <a
            href="/monthly"
            className="flex items-center justify-center w-12 h-12 border rounded-xl bg-white shadow-sm mt-1"
          >
            <LayoutGrid className="w-6 h-6" />
          </a>
        </div>

        {/* 日期切換：← 日期 →（日期只出現在箭頭中間） */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={handlePrev}
            className="p-3 border rounded-full bg-white shadow-sm hover:bg-gray-50 active:bg-gray-100"
          >
            <ChevronLeft className="w-6 h-6 stroke-[3]" />
          </button>

          <span className="text-xl font-bold">{headerDateLabel}</span>

          <button
            onClick={handleNext}
            className="p-3 border rounded-full bg-white shadow-sm hover:bg-gray-50 active:bg-gray-100"
          >
            <ChevronRight className="w-6 h-6 stroke-[3]" />
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
        <div className="space-y-3 mt-2 mb-4">
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
                // 手機長按
                onContextMenu={(e) => {
                  e.preventDefault();
                  handleOpenAction(item);
                }}
                className="relative flex items-center p-4 pl-6 border rounded-xl bg-white shadow-sm group select-none"
              >
                {/* 左上角更多按鈕 */}
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOpenAction(item);
                  }}
                  className="absolute top-1 left-1 p-1 text-gray-300 hover:text-gray-600 hover:bg-gray-100 rounded-full z-10"
                >
                  <MoreVertical className="w-4 h-4" />
                </button>

                {/* Icon */}
                <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center shrink-0 mr-4">
                  <CategoryIcon category={item.category} />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 flex flex-col gap-1">
                  {/* Row 1: Category + Amount */}
                  <div className="flex justify-between items-start">
                    <div className="font-bold text-lg text-gray-900 truncate pr-2">
                      {item.category || '未分類'}
                    </div>
                    <div className={`text-2xl font-bold ${amountColorClass} leading-none whitespace-nowrap`}>
                      {amount !== 0 ? formatAmount(amount) : '-'}
                    </div>
                  </div>

                  {/* Row 2: Time */}
                  <div className="text-gray-500 text-sm">
                    {item.time}（{weekday}）
                  </div>

                  {/* Row 3: Note + User */}
                  <div className="flex justify-between items-end min-h-[1.25rem]">
                    <div className="text-gray-600 line-clamp-1 text-sm flex-1 pr-2">
                      {item.note || item.message}
                    </div>
                    <div className="text-sm text-gray-400 whitespace-nowrap">
                      {displayUser}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ----------- Modals ----------- */}

      {/* 動作選單 (類似 Action Sheet) */}
      {showActionMenu && actionItem && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={closeAllModals}>
          <div className="bg-white w-full max-w-sm rounded-2xl overflow-hidden shadow-xl animate-in slide-in-from-bottom-10 fade-in duration-200" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b text-center font-bold text-gray-700">
              選擇操作
            </div>
            <div className="flex flex-col">
              <button 
                onClick={onClickEdit}
                className="flex items-center justify-center gap-2 p-4 hover:bg-gray-50 border-b text-blue-600 font-medium"
              >
                <Edit className="w-5 h-5" />
                編輯紀錄
              </button>
              <button 
                onClick={onClickDelete}
                className="flex items-center justify-center gap-2 p-4 hover:bg-gray-50 text-red-600 font-medium"
              >
                <Trash2 className="w-5 h-5" />
                刪除紀錄
              </button>
            </div>
            <div className="p-2 bg-gray-50">
              <button 
                onClick={closeAllModals}
                className="w-full py-3 bg-white rounded-xl border shadow-sm font-bold text-gray-700"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 刪除確認框 */}
      {showDeleteConfirm && actionItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-6">
          <div className="bg-white w-full max-w-sm rounded-2xl p-6 shadow-xl">
            <h3 className="text-lg font-bold text-gray-900 mb-2">確定要刪除嗎？</h3>
            <p className="text-gray-600 mb-6">
              此動作無法復原，該筆記帳紀錄將會永久刪除。
            </p>
            <div className="flex gap-3">
              <button 
                onClick={closeAllModals}
                className="flex-1 py-2.5 border rounded-xl font-medium text-gray-700 hover:bg-gray-50"
              >
                取消
              </button>
              <button 
                onClick={doDelete}
                className="flex-1 py-2.5 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700"
              >
                確定刪除
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 編輯視窗 */}
      {showEditModal && actionItem && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm sm:p-6">
          <div className="bg-white w-full max-w-md sm:rounded-2xl rounded-t-2xl p-5 shadow-xl h-[85vh] sm:h-auto flex flex-col">
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-xl font-bold text-gray-900">編輯記帳</h3>
              <button onClick={closeAllModals} className="p-1 text-gray-400 hover:bg-gray-100 rounded-full">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">日期</label>
                <input 
                  type="date" 
                  value={editForm.time}
                  onChange={e => setEditForm({...editForm, time: e.target.value})}
                  className="w-full min-w-0 appearance-none p-3 border rounded-xl bg-gray-50 focus:bg-white outline-none ring-2 ring-transparent focus:ring-blue-500 transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">金額</label>
                <input 
                  type="number" 
                  value={editForm.amount}
                  onChange={e => setEditForm({...editForm, amount: e.target.value})}
                  className="w-full p-3 border rounded-xl bg-gray-50 focus:bg-white outline-none ring-2 ring-transparent focus:ring-blue-500 transition-all font-mono text-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">項目 (備註)</label>
                <input 
                  type="text" 
                  value={editForm.note}
                  onChange={e => setEditForm({...editForm, note: e.target.value})}
                  className="w-full p-3 border rounded-xl bg-gray-50 focus:bg-white outline-none ring-2 ring-transparent focus:ring-blue-500 transition-all"
                  placeholder="早餐、計程車..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">類別</label>
                <div className="grid grid-cols-4 gap-2">
                  {CATEGORIES.map(cat => (
                    <button
                      key={cat}
                      onClick={() => setEditForm({...editForm, category: cat})}
                      className={`p-2 rounded-lg text-xs font-medium border transition-all
                        ${editForm.category === cat 
                          ? 'bg-blue-600 text-white border-blue-600' 
                          : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                        }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6 pt-4 border-t">
              <button 
                onClick={closeAllModals}
                className="flex-1 py-3 border rounded-xl font-medium text-gray-700 hover:bg-gray-50"
              >
                取消
              </button>
              <button 
                onClick={doUpdate}
                className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold shadow-lg shadow-blue-200 hover:bg-blue-700 active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
              >
                <Check className="w-5 h-5" />
                儲存變更
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
