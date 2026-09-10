import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {
  title: 'Hệ thống quản trị dữ liệu dashboard',
  description: 'Không gian quản trị dữ liệu Dashboard VTV.',
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi">
      <body>{children}</body>
    </html>
  );
}
