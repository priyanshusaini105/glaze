'use client';

import './dashboard.css';
import { SidebarProvider } from '@/components/ui/sidebar';
import { MobileBlocker } from '@/components/MobileBlocker';

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <SidebarProvider>
      <MobileBlocker />
      <div className="flex h-screen w-full bg-gray-50">
        {children}
      </div>
    </SidebarProvider>
  );
}
