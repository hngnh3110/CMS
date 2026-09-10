import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {
  title: 'VTV CMS · Quản trị dữ liệu',
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
