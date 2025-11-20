import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  devIndicators: false, // ★ 關閉左下角 N 的方式（Next14 正確寫法）
  reactStrictMode: false,
};

export default nextConfig;
