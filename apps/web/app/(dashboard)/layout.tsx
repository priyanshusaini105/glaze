'use client';

import './dashboard.css';
import { SidebarProvider } from '@/components/ui/sidebar';

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <SidebarProvider>
      <div className="flex h-screen w-full bg-gray-50">
        {children}
      </div>
    </SidebarProvider>
  );
}
