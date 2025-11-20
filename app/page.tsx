// app/page.tsx
import { redirect } from 'next/navigation';

export default function Home() {
  // Next.js App Router：元件 render 時就執行 redirect()
  redirect('/today');

  // 下面這行只是避免 TS 抱怨，實際不會執行
  return null;
}
