import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';
import {
  Home,
  CalendarDays,
  BarChart3,
  Settings as SettingsIcon,
} from 'lucide-react';

export const metadata: Metadata = {
  title: '小管家記帳',
  description: '家庭記帳與行事曆小管家',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-Hant">
      <body className="min-h-screen bg-white text-gray-900">
        <div className="pb-20">{children}</div>

        {/* 底部導航列 */}
        <nav className="fixed bottom-0 left-0 right-0 border-t bg-white shadow-md">
          <div className="max-w-md mx-auto flex justify-around py-2 text-xs">

            <NavItem href="/today" icon={<Home />} label="記帳" />
            <NavItem href="/calendar" icon={<CalendarDays />} label="行事曆" />
            <NavItem href="/stats" icon={<BarChart3 />} label="統計" />
            <NavItem href="/settings" icon={<SettingsIcon />} label="設定" />

          </div>
        </nav>
      </body>
    </html>
  );
}

function NavItem({
  href,
  icon,
  label,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
}) {
  const isActive = typeof window !== 'undefined' && window.location.pathname === href;

  return (
    <Link
      href={href}
      className={`flex flex-col items-center px-5 py-1 rounded-xl transition-all ${
        isActive
          ? 'bg-gray-200 text-black'
          : 'text-gray-500 hover:bg-gray-100'
      }`}
    >
      <div className="w-5 h-5 mb-1">{icon}</div>
      <span>{label}</span>
    </Link>
  );
}
