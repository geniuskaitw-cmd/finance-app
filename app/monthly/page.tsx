'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function MonthlyPage() {
  /** -----------------------------
   * 基本日期資訊
   * ----------------------------- */
  // 解決 SSG 時間凍結問題：初始值設為 null，透過 useEffect 在前端更新
  const [todayDate, setTodayDate] = useState<Date | null>(null);

  // 取得台北時間 YYYY-MM-DD
  function getTaipeiDateStr(d: Date) {
    return d.toLocaleString('sv-SE', { timeZone: 'Asia/Taipei' }).slice(0, 10);
  }

  const [current, setCurrent] = useState(() => {
    // 這裡初始值可能仍是 Build Time，但在 useEffect 會被校正
    const now = new Date();
    return {
      year: now.getFullYear(),
      month: now.getMonth(), // 0~11
    };
  });

  useEffect(() => {
    // 確保在 Client 端執行時，取得當下真正的時間
    const now = new Date();
    setTodayDate(now);
    
    // 校正當前月份（若使用者剛好跨月開啟）
    setCurrent({
      year: now.getFullYear(),
      month: now.getMonth(),
    });
  }, []);

  const todayStr = todayDate ? getTaipeiDateStr(todayDate) : '';

  /** -----------------------------
   * 本月每日金額總和
   * daySums = { '2025-11-19': 600, ... }
   * ----------------------------- */
  const [daySums, setDaySums] = useState<Record<string, number>>({});
  const [monthTotal, setMonthTotal] = useState(0);

  /** -----------------------------
   * 本月預算（來自 Supabase 最新一筆）
   * ----------------------------- */
  const [budget, setBudget] = useState<number>(0);

  async function loadBudget() {
    const { data, error } = await supabase
      .from('budgets')
      .select('budget')
      .order('id', { ascending: false }) // 最新一筆
      .limit(1);

    if (error) {
      console.error('讀取預算錯誤：', error);
      return;
    }

    if (data && data.length > 0) {
      setBudget(data[0].budget);
    } else {
      setBudget(0);
    }
  }

  /** -----------------------------
   * 抓取本月所有記帳資料
   * ----------------------------- */
  async function loadMonthData(year: number, month: number) {
    const yyyyMm = `${year}-${String(month + 1).padStart(2, '0')}`;

    const { data, error } = await supabase
      .from('expenses')
      .select('*')
      .like('time', `${yyyyMm}%`);

    if (error) return console.error(error);

    const sums: Record<string, number> = {};
    let total = 0;

    (data || []).forEach((item) => {
      const d = item.time;
      const amt = item.amount ?? 0;
      if (!sums[d]) sums[d] = 0;
      sums[d] += amt;
      total += amt;
    });

    setDaySums(sums);
    setMonthTotal(total);
  }

  /** -----------------------------
   * 月曆格（含空白）
   * ----------------------------- */
  function getCalendarMatrix(y: number, m: number) {
    const firstDay = new Date(y, m, 1);
    const weekday = (firstDay.getDay() + 6) % 7; // 週一=0
    const days = new Date(y, m + 1, 0).getDate();

    const list: (number | null)[] = [];
    for (let i = 0; i < weekday; i++) list.push(null);
    for (let d = 1; d <= days; d++) list.push(d);

    return list;
  }

  /** -----------------------------
   * 月份切換
   * ----------------------------- */
  function prevMonth() {
    let y = current.year;
    let m = current.month - 1;
    if (m < 0) {
      m = 11;
      y -= 1;
    }
    setCurrent({ year: y, month: m });
    loadMonthData(y, m);
    loadBudget();
  }

  function nextMonth() {
    let y = current.year;
    let m = current.month + 1;
    if (m > 11) {
      m = 0;
      y += 1;
    }
    setCurrent({ year: y, month: m });
    loadMonthData(y, m);
    loadBudget();
  }

  /** -----------------------------
   * 初次載入
   * ----------------------------- */
  useEffect(() => {
    loadMonthData(current.year, current.month);
    loadBudget(); // 讀取最新預算
  }, []);

  /** -----------------------------
   * helper：金額顏色
   * ----------------------------- */
  function amountColor(n: number) {
    if (n > 0) return 'text-green-600';
    if (n < 0) return 'text-red-500';
    return 'text-gray-400';
  }

  return (
    <div className="p-4 max-w-md mx-auto">
      {/* 年月 + 上下月切換 */}
      <div className="flex justify-between items-center mb-4">
        <button
          onClick={prevMonth}
          className="px-3 py-1 border rounded-lg bg-white shadow-sm text-sm"
        >
          ←
        </button>

        <div className="text-lg font-bold">
          {current.year} 年 {current.month + 1} 月
        </div>

        <button
          onClick={nextMonth}
          className="px-3 py-1 border rounded-lg bg-white shadow-sm text-sm"
        >
          →
        </button>
      </div>

      {/* 星期列 */}
      <div className="grid grid-cols-7 text-center text-sm font-semibold text-gray-600 mb-2">
        <div>一</div>
        <div>二</div>
        <div>三</div>
        <div>四</div>
        <div>五</div>
        <div>六</div>
        <div>日</div>
      </div>

      {/* 月曆格 */}
      <div className="grid grid-cols-7 gap-2 text-center text-sm">
        {getCalendarMatrix(current.year, current.month).map((day, idx) => {
          if (!day) {
            return (
              <div
                key={idx}
                className="h-12 border rounded-lg bg-gray-50 shadow-sm"
              ></div>
            );
          }

          const dateStr = `${current.year}-${String(
            current.month + 1,
          ).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

          const sum = daySums[dateStr] ?? 0;

          const isToday =
            todayDate &&
            dateStr === todayStr &&
            current.year === todayDate.getFullYear() &&
            current.month === todayDate.getMonth();

          return (
            <Link
              key={idx}
              href={`/today?date=${dateStr}`}
              className={`h-12 flex flex-col items-center justify-center border rounded-lg shadow-sm
                ${
                  isToday
                    ? 'bg-blue-600 border-blue-700 text-white font-bold'
                    : 'bg-white'
                }
              `}
            >
              <div className="leading-none">{day}</div>

              {sum !== 0 && (
                <div
                  className={`text-[10px] leading-none mt-0.5 ${
                    isToday ? 'text-white' : amountColor(sum)
                  }`}
                >
                  {sum}
                </div>
              )}
            </Link>
          );
        })}
      </div>

      {/* 底部三欄 */}
      <div className="mt-6 p-4 bg-white shadow-sm border rounded-lg text-sm space-y-2">
        <div className="flex justify-between">
          <span className="text-gray-600">本月預算</span>
          <span className="font-semibold">{budget || 0}</span>
        </div>

        <div className="flex justify-between">
          <span className="text-gray-600">目前花費</span>
          <span className={`font-semibold ${amountColor(monthTotal)}`}>
            {monthTotal}
          </span>
        </div>

        <div className="flex justify-between">
          <span className="text-gray-600">剩餘金額</span>
          <span
            className={`font-bold ${
              budget - monthTotal < 0 ? 'text-red-600' : 'text-gray-900'
            }`}
          >
            {budget - monthTotal}
          </span>
        </div>
      </div>
    </div>
  );
}
