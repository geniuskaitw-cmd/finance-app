'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function SettingsPage() {
  const [userId, setUserId] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [nameList, setNameList] = useState<{ user_id: string; display_name: string }[]>([]);

  const [budget, setBudget] = useState<number | ''>('');
  const [loading, setLoading] = useState(true);

  // -----------------------------
  // 載入暱稱列表 + 預算
  // -----------------------------
  async function loadSettings() {
    setLoading(true);

    // 讀取全部暱稱(user_names)
    const { data: nameData } = await supabase
      .from('user_names')
      .select('*')
      .order('id', { ascending: true });

    if (nameData) {
      setNameList(nameData);
    }

    // 讀取預算 budgets（永遠只有一筆）
    const { data: budgetData } = await supabase
      .from('budgets')
      .select('*')
      .limit(1)
      .single();

    if (budgetData && typeof budgetData.budget === 'number') {
      setBudget(budgetData.budget);
    } else {
      setBudget('');
    }

    setLoading(false);
  }

  useEffect(() => {
    loadSettings();
  }, []);

  // -----------------------------
  // 儲存暱稱
  // -----------------------------
  async function handleSaveName(e: React.FormEvent) {
    e.preventDefault();

    if (!userId.trim() || !displayName.trim()) {
      alert('請輸入 userId 與顯示名稱');
      return;
    }

    // upsert：如果 user_id 存在 → update；否則 insert
    const { error } = await supabase.from('user_names').upsert(
      {
        user_id: userId.trim(),
        display_name: displayName.trim(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    );

    if (error) {
      console.error(error);
      alert('儲存失敗，請稍後再試');
      return;
    }

    alert('已儲存暱稱');
    loadSettings();
  }

  // -----------------------------
  // 儲存預算（budgets 永遠只會有一筆 id=1）
  // -----------------------------
  async function handleSaveBudget(e: React.FormEvent) {
    e.preventDefault();

    if (budget === '' || isNaN(Number(budget))) {
      alert('請輸入正確的預算金額');
      return;
    }

    // 查是否已有資料
    const { data } = await supabase.from('budgets').select('*').limit(1).single();

    if (!data) {
      // 沒資料 → insert
      const { error } = await supabase.from('budgets').insert({
        budget: Number(budget),
        updated_at: new Date().toISOString(),
      });

      if (error) {
        console.error(error);
        alert('儲存預算失敗');
        return;
      }
    } else {
      // 有資料 → update
      const { error } = await supabase
        .from('budgets')
        .update({
          budget: Number(budget),
          updated_at: new Date().toISOString(),
        })
        .eq('id', data.id);

      if (error) {
        console.error(error);
        alert('更新預算失敗');
        return;
      }
    }

    alert('已儲存預算');
    loadSettings();
  }

  // -----------------------------
  // 畫面
  // -----------------------------
  return (
    <div className="p-4 max-w-md mx-auto" style={{ background: 'var(--page-bg)' }}>
      <h1 className="text-lg font-semibold mb-4" style={{ color: 'var(--foreground)' }}>設定</h1>

      {loading && <p className="text-sm" style={{ color: 'var(--muted)' }}>載入中…</p>}

      {!loading && (
        <>
          {/* 暱稱設定 */}
          <section className="mb-8">
            <h2 className="text-sm font-semibold mb-2" style={{ color: 'var(--foreground)' }}>userId 顯示名稱</h2>
            <p className="text-xs mb-3" style={{ color: 'var(--muted)' }}>
              這裡可以設定「哪一個 userId 要顯示成什麼名稱」。
            </p>

            <form onSubmit={handleSaveName} className="space-y-3">
              <div>
                <label className="block text-xs mb-1" style={{ color: 'var(--muted)' }}>userId</label>
                <input
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                  className="w-full border rounded px-2 py-1 text-sm"
                  style={{ background: 'var(--input-bg)', borderColor: 'var(--input-border)', color: 'var(--input-text)' }}
                  placeholder="請輸入 userId"
                />
              </div>

              <div>
                <label className="block text-xs mb-1" style={{ color: 'var(--muted)' }}>顯示名稱</label>
                <input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full border rounded px-2 py-1 text-sm"
                  style={{ background: 'var(--input-bg)', borderColor: 'var(--input-border)', color: 'var(--input-text)' }}
                  placeholder="例如：我、老婆、小孩…"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-blue-600 text-white text-sm py-2 rounded-md"
              >
                儲存
              </button>
            </form>

            {/* 列表 */}
            <div className="mt-4">
              <h3 className="text-sm font-semibold mb-2" style={{ color: 'var(--foreground)' }}>目前設定列表</h3>
              {nameList.length === 0 && (
                <p className="text-xs" style={{ color: 'var(--muted)' }}>尚未設定任何 userId。</p>
              )}

              <ul className="space-y-1 text-xs">
                {nameList.map((item) => (
                  <li
                    key={item.user_id}
                    className="flex justify-between border-b py-1"
                    style={{ borderColor: 'var(--card-border)', color: 'var(--foreground)' }}
                  >
                    <span className="break-all">{item.user_id}</span>
                    <span className="font-semibold">{item.display_name}</span>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          {/* 預算設定 */}
          <section className="mb-8">
            <h2 className="text-sm font-semibold mb-2" style={{ color: 'var(--foreground)' }}>每月預算（全站共用）</h2>

            <form onSubmit={handleSaveBudget} className="space-y-3">
              <div>
                <label className="block text-xs mb-1" style={{ color: 'var(--muted)' }}>預算金額</label>
                <input
                  type="number"
                  value={budget}
                  onChange={(e) => setBudget(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full border rounded px-2 py-1 text-sm"
                  style={{ background: 'var(--input-bg)', borderColor: 'var(--input-border)', color: 'var(--input-text)' }}
                  placeholder="請輸入本月預算"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-blue-600 text-white text-sm py-2 rounded-md"
              >
                儲存預算
              </button>
            </form>
          </section>
        </>
      )}
    </div>
  );
}
