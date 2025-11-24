'use client';

import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import {
  CalendarDays,
  Clock,
  MapPin,
  ChevronLeft,
  ChevronRight,
  List,
  MoreVertical,
  Edit,
  Trash2,
  X,
  Check,
} from 'lucide-react';

/** --------------------------------------------------------
 * 型別定義
 * -------------------------------------------------------- */
type CalendarEvent = {
  id: number;
  date: string; // YYYY-MM-DD
  time: string | null; // HH:mm
  title: string;
  user_id: string;
  is_private: boolean;
  created_at?: string;
};

type Holiday = {
  date: string; // YYYY-MM-DD (converted)
  name: string;
  isHoliday: boolean;
};

export default function CalendarPage() {
  /** --------------------------------------------------------
   * 狀態管理
   * -------------------------------------------------------- */
  const [viewMode, setViewMode] = useState<'list' | 'month'>('list');
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [holidays, setHolidays] = useState<Record<string, Holiday>>({});
  const [userMap, setUserMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  // 動作選單狀態
  const [actionItem, setActionItem] = useState<CalendarEvent | null>(null);
  const [showActionMenu, setShowActionMenu] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  // 編輯表單狀態
  const [editForm, setEditForm] = useState<{
    date: string;
    time: string;
    title: string;
  }>({ date: '', time: '', title: '' });

  // 用於 List View 的滾動定位
  const listRef = useRef<HTMLDivElement>(null);
  const eventRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // 月曆模式當前瀏覽的年月
  const [currentDate, setCurrentDate] = useState(new Date());

  // 取得台北時間 YYYY-MM-DD
  function getTodayStr() {
    return new Date()
      .toLocaleString('sv-SE', { timeZone: 'Asia/Taipei' })
      .slice(0, 10);
  }
  const todayStr = getTodayStr();

  /** --------------------------------------------------------
   * 資料讀取
   * -------------------------------------------------------- */
  useEffect(() => {
    fetchAllData();
    fetchUserNames();
    const y = new Date().getFullYear();
    fetchHolidays(y);
    fetchHolidays(y + 1);
  }, []);

  async function fetchUserNames() {
    const { data } = await supabase.from('user_names').select('user_id, display_name');
    if (data) {
      const map: Record<string, string> = {};
      data.forEach((u: any) => (map[u.user_id] = u.display_name));
      setUserMap(map);
    }
  }

  async function fetchAllData() {
    setLoading(true);
    // 讀取 Calendar 表，過濾 private
    const { data, error } = await supabase
      .from('calendar')
      .select('*')
      .eq('is_private', false)
      .order('date', { ascending: true })
      .order('time', { ascending: true });

    if (error) {
      console.error('讀取行事曆失敗', error);
    } else {
      setEvents(data || []);
    }
    setLoading(false);
  }

  // 抓取台灣國定假日
  async function fetchHolidays(year: number) {
    try {
      const res = await fetch(
        `https://cdn.jsdelivr.net/gh/ruyut/TaiwanCalendar/data/${year}.json`
      );
      if (!res.ok) return;
      const list = await res.json();
      const map: Record<string, Holiday> = {};
      list.forEach((item: any) => {
        let dStr = item.date; // 20250101
        if (dStr && !dStr.includes('-') && dStr.length === 8) {
          dStr = `${dStr.slice(0, 4)}-${dStr.slice(4, 6)}-${dStr.slice(6, 8)}`;
        }
        if (item.isHoliday) {
            map[dStr] = {
            date: dStr,
            name: item.description || item.name || '國定假日',
            isHoliday: true,
            };
        }
      });
      setHolidays((prev) => ({ ...prev, ...map }));
    } catch (e) {
      console.warn('無法讀取假日資料', e);
    }
  }

  /** --------------------------------------------------------
   * 動作處理：刪除與編輯
   * -------------------------------------------------------- */
  function handleOpenAction(item: CalendarEvent) {
    setActionItem(item);
    setShowActionMenu(true);
  }

  function closeAllModals() {
    setActionItem(null);
    setShowActionMenu(false);
    setShowDeleteConfirm(false);
    setShowEditModal(false);
  }

  function onClickDelete() {
    setShowActionMenu(false);
    setShowDeleteConfirm(true);
  }

  async function doDelete() {
    if (!actionItem) return;
    const { error, data } = await supabase.from('calendar').delete().eq('id', actionItem.id).select();
    if (error) {
      alert('刪除失敗：' + error.message);
    } else if (!data || data.length === 0) {
      alert('刪除失敗：權限不足或資料不存在 (RLS)');
    } else {
      fetchAllData();
    }
    closeAllModals();
  }

  function onClickEdit() {
    if (!actionItem) return;
    setEditForm({
      date: actionItem.date,
      time: actionItem.time || '',
      title: actionItem.title,
    });
    setShowActionMenu(false);
    setShowEditModal(true);
  }

  async function doUpdate() {
    if (!actionItem) return;
    if (!editForm.date || !editForm.title) {
      alert('日期與標題為必填');
      return;
    }

    const { error, data } = await supabase
      .from('calendar')
      .update({
        date: editForm.date,
        time: editForm.time || null,
        title: editForm.title,
      })
      .eq('id', actionItem.id)
      .select();

    if (error) {
      alert('更新失敗：' + error.message);
    } else if (!data || data.length === 0) {
      alert('更新失敗：權限不足或資料不存在 (RLS)');
    } else {
      fetchAllData();
    }
    closeAllModals();
  }

  /** --------------------------------------------------------
   * 互動邏輯
   * -------------------------------------------------------- */
  function goToListAndScroll(dateStr: string) {
    setViewMode('list');
    setTimeout(() => {
      const target = eventRefs.current[dateStr];
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else {
        const futureEvent = events.find((e) => e.date >= dateStr);
        if (futureEvent && eventRefs.current[futureEvent.date]) {
            eventRefs.current[futureEvent.date]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }
    }, 100);
  }

  /** --------------------------------------------------------
   * 渲染組件：列表模式
   * -------------------------------------------------------- */
  function renderListView() {
    const todayEvents = events.filter(e => e.date === todayStr);
    const sortedEvents = events;

    return (
      <div className="pb-20 space-y-4" ref={listRef}>
        {/* 今天狀態區塊 */}
        <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
          <h2 className="text-lg font-bold text-blue-900 mb-2">
            今天是 {todayStr}
          </h2>
          {todayEvents.length > 0 ? (
            <div className="text-blue-700">
              今日有 {todayEvents.length} 個行程
            </div>
          ) : (
            <div className="text-gray-500">本日無行程</div>
          )}
        </div>

        {sortedEvents.length === 0 && (
            <div className="text-center text-gray-400 py-10">尚無任何行程記錄</div>
        )}

        {sortedEvents.map((evt) => {
            const isPast = evt.date < todayStr;
            const isToday = evt.date === todayStr;
            const userName = userMap[evt.user_id] || '未知';

            return (
                <div
                    key={evt.id}
                    ref={(el) => {
                        if (el && (!eventRefs.current[evt.date] || eventRefs.current[evt.date] === el)) {
                             eventRefs.current[evt.date] = el;
                        }
                    }}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      handleOpenAction(evt);
                    }}
                    className={`relative p-5 rounded-2xl border shadow-sm flex flex-col justify-between min-h-[120px] transition-all select-none
                        ${isToday ? 'bg-blue-50/50 border-blue-500 ring-1 ring-blue-500' : 'bg-white'}
                        ${isPast ? 'opacity-60 grayscale-[0.5]' : ''}
                    `}
                >
                    {/* 右上角更多按鈕 (絕對定位以免破壞版面) */}
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenAction(evt);
                      }}
                      className="absolute top-2 right-2 p-1 text-gray-300 hover:text-gray-600 hover:bg-gray-100/50 rounded-full z-10"
                    >
                      <MoreVertical className="w-5 h-5" />
                    </button>

                    <div className="flex flex-col gap-2">
                        <div className="flex justify-between items-start pr-8">
                            <div className={`text-xl font-bold ${isToday ? 'text-blue-700' : 'text-gray-900'}`}>
                                {evt.date}
                            </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                             <div className={`flex items-center px-2 py-1 rounded-lg text-lg font-bold
                                ${isToday ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
                                <Clock className="w-5 h-5 mr-1.5" />
                                {evt.time ? evt.time.slice(0, 5) : '全天'}
                            </div>
                        </div>

                        <div className="text-gray-800 text-xl font-bold leading-relaxed mt-1">
                            {evt.title || '(無標題)'}
                        </div>
                    </div>

                    <div className="flex justify-end mt-4 pt-3 border-t border-gray-200">
                        <span className="text-sm text-gray-400 font-medium">
                            {userName}
                        </span>
                    </div>
                </div>
            );
        })}
      </div>
    );
  }

  /** --------------------------------------------------------
   * 渲染組件：月曆模式
   * -------------------------------------------------------- */
  function renderMonthView() {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth(); // 0-11

    const firstDay = new Date(year, month, 1);
    const startDayOfWeek = (firstDay.getDay() + 6) % 7; // 週一當作 0
    const startDayIndex = firstDay.getDay(); // 0=Sun

    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const cells = [];
    for (let i = 0; i < startDayIndex; i++) {
      cells.push({ type: 'empty', key: `empty-${i}` });
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      cells.push({ type: 'day', val: d, dateStr, key: dateStr });
    }

    return (
      <div>
        {/* 月曆 Header */}
        <div className="flex items-center justify-between mb-2 bg-white p-2 rounded-xl shadow-sm">
            <button 
                onClick={() => setCurrentDate(new Date(year, month - 1, 1))}
                className="p-2 hover:bg-gray-100 rounded-full"
            >
                <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="font-bold text-lg">
                {year} 年 {month + 1} 月
            </div>
            <button 
                onClick={() => setCurrentDate(new Date(year, month + 1, 1))}
                className="p-2 hover:bg-gray-100 rounded-full"
            >
                <ChevronRight className="w-5 h-5" />
            </button>
        </div>

        {/* 星期 Header */}
        <div className="grid grid-cols-7 text-center mb-1 font-semibold text-gray-500 text-sm">
            <div className="text-red-500">日</div>
            <div>一</div>
            <div>二</div>
            <div>三</div>
            <div>四</div>
            <div>五</div>
            <div className="text-green-600">六</div>
        </div>

        {/* 格子 */}
        <div className="grid grid-cols-7 gap-0.5">
            {cells.map((cell: any) => {
                if (cell.type === 'empty') {
                    return <div key={cell.key} className="h-14" />;
                }

                const dayEvents = events.filter(e => e.date === cell.dateStr);
                const isHoliday = holidays[cell.dateStr]?.isHoliday;
                const isToday = cell.dateStr === todayStr;

                return (
                    <div
                        key={cell.key}
                        onClick={() => goToListAndScroll(cell.dateStr)}
                        className={`
                            h-14 border rounded-lg flex flex-col items-center justify-start pt-1 cursor-pointer relative overflow-hidden transition-all
                            ${isHoliday ? 'bg-red-50 border-red-100' : 'bg-white hover:bg-gray-50'}
                            ${isToday ? 'ring-2 ring-blue-500' : ''}
                        `}
                    >
                        <span className={`text-sm font-medium ${isHoliday ? 'text-red-600' : 'text-gray-700'}`}>
                            {cell.val}
                        </span>
                        
                        {isHoliday && (
                            <span className="text-[9px] text-red-400 transform scale-90 truncate max-w-full">
                                {holidays[cell.dateStr].name}
                            </span>
                        )}

                        <div className="flex gap-0.5 mt-auto mb-1 flex-wrap justify-center px-0.5">
                            {dayEvents.map((_, i) => (
                                <div key={i} className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                            ))}
                        </div>
                    </div>
                );
            })}
        </div>
      </div>
    );
  }

  /** --------------------------------------------------------
   * 主渲染
   * -------------------------------------------------------- */
  useEffect(() => {
    if (viewMode === 'list' && !loading && events.length > 0) {
        setTimeout(() => {
             eventRefs.current = {}; 
             const target = eventRefs.current[todayStr];
             if (target) {
                 target.scrollIntoView({ behavior: 'auto', block: 'start' });
             } else {
                 const future = events.find(e => e.date > todayStr);
                 if (future && eventRefs.current[future.date]) {
                     eventRefs.current[future.date]?.scrollIntoView({ behavior: 'auto', block: 'start' });
                 }
             }
        }, 300);
    }
  }, [loading, viewMode]);


  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="p-4 max-w-md mx-auto w-full flex-1 flex flex-col">
        
        {/* 頂部切換按鈕 */}
        <div className="flex justify-end mb-4">
            <button
                onClick={() => setViewMode(viewMode === 'list' ? 'month' : 'list')}
                className="flex items-center gap-2 px-4 py-2 bg-white border rounded-full shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-100"
            >
                {viewMode === 'list' ? (
                    <>
                        <CalendarDays className="w-4 h-4" />
                        切換月曆模式
                    </>
                ) : (
                    <>
                        <List className="w-4 h-4" />
                        切換列表模式
                    </>
                )}
            </button>
        </div>

        {loading ? (
            <div className="flex-1 flex items-center justify-center text-gray-400">
                載入行程中...
            </div>
        ) : (
            <>
                {viewMode === 'list' && renderListView()}
                {viewMode === 'month' && renderMonthView()}
            </>
        )}
      </div>

      {/* ----------- Modals (移到最外層) ----------- */}

      {/* 動作選單 */}
      {showActionMenu && actionItem && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={closeAllModals}>
          <div className="bg-white w-full max-w-sm rounded-2xl overflow-hidden shadow-xl animate-in slide-in-from-bottom-10 fade-in duration-200" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b text-center font-bold text-gray-700">選擇操作</div>
            <div className="flex flex-col">
              <button onClick={onClickEdit} className="flex items-center justify-center gap-2 p-4 hover:bg-gray-50 border-b text-blue-600 font-medium">
                <Edit className="w-5 h-5" /> 編輯行程
              </button>
              <button onClick={onClickDelete} className="flex items-center justify-center gap-2 p-4 hover:bg-gray-50 text-red-600 font-medium">
                <Trash2 className="w-5 h-5" /> 刪除行程
              </button>
            </div>
            <div className="p-2 bg-gray-50">
              <button onClick={closeAllModals} className="w-full py-3 bg-white rounded-xl border shadow-sm font-bold text-gray-700">
                取消
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 刪除確認 */}
      {showDeleteConfirm && actionItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-6">
          <div className="bg-white w-full max-w-sm rounded-2xl p-6 shadow-xl">
            <h3 className="text-lg font-bold text-gray-900 mb-2">確定要刪除嗎？</h3>
            <div className="flex gap-3 mt-6">
              <button onClick={closeAllModals} className="flex-1 py-2.5 border rounded-xl font-medium text-gray-700 hover:bg-gray-50">取消</button>
              <button onClick={doDelete} className="flex-1 py-2.5 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700">確定刪除</button>
            </div>
          </div>
        </div>
      )}

      {/* 編輯視窗 */}
      {showEditModal && actionItem && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm sm:p-6">
          <div className="bg-white w-full max-w-md sm:rounded-2xl rounded-t-2xl p-5 shadow-xl h-[70vh] sm:h-auto flex flex-col">
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-xl font-bold text-gray-900">編輯行程</h3>
              <button onClick={closeAllModals} className="p-1 text-gray-400 hover:bg-gray-100 rounded-full"><X className="w-6 h-6" /></button>
            </div>
            <div className="flex-1 overflow-y-auto space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">日期</label>
                <input type="date" value={editForm.date} onChange={e => setEditForm({...editForm, date: e.target.value})} className="w-full p-3 border rounded-xl bg-gray-50 focus:bg-white" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">時間 (選填)</label>
                <input type="time" value={editForm.time} onChange={e => setEditForm({...editForm, time: e.target.value})} className="w-full p-3 border rounded-xl bg-gray-50 focus:bg-white" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">項目 (標題)</label>
                <input type="text" value={editForm.title} onChange={e => setEditForm({...editForm, title: e.target.value})} className="w-full p-3 border rounded-xl bg-gray-50 focus:bg-white" />
              </div>
            </div>
            <div className="flex gap-3 mt-6 pt-4 border-t">
              <button onClick={closeAllModals} className="flex-1 py-3 border rounded-xl font-medium text-gray-700 hover:bg-gray-50">取消</button>
              <button onClick={doUpdate} className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold flex items-center justify-center gap-2"><Check className="w-5 h-5" /> 儲存變更</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
