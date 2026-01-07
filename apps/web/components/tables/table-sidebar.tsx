'use client';

import { Plus } from 'lucide-react';
import Link from 'next/link';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';
import Image from 'next/image';

interface Table {
  id: string;
  name: string;
  active: boolean;
}

interface TableSidebarProps {
  tables: Table[];
  currentTableId?: string;
}

export function TableSidebar({ tables, currentTableId }: TableSidebarProps) {
  return (
    <Sidebar className="border-r border-slate-200 bg-white">
      <SidebarHeader className="p-5">
        <div className="flex items-center gap-3">
          {/* <div className="w-8 h-8 rounded-lg bg-cyan-gradient shadow-sm shadow-cyan-500/30 flex items-center justify-center">
            <span className="text-white text-xl font-bold">G</span>
          </div>
          <h1 className="text-lg font-bold text-slate-900 tracking-tight">Glaze</h1> */}
          <Image
            src="/img/glaze-text.png"
            alt="Glaze"
            width={100}
            height={32}
            className="object-contain"
          />
        </div>
      </SidebarHeader>

      <SidebarContent className="px-3">
        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-3">
            Workspace
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-0.5">
              {tables.map((table) => (
                <SidebarMenuItem key={table.id}>
                  <SidebarMenuButton
                    asChild
                    isActive={table.id === currentTableId || table.active}
                    className="data-[active=true]:bg-cyan-soft data-[active=true]:text-cyan-primary data-[active=true]:font-medium hover:bg-slate-50 rounded-lg px-3 py-1.5"
                  >
                    <Link href={`/tables/${table.id}`} className="flex items-center gap-2.5">
                      <span className="text-base">📄</span>
                      <span className="text-sm">{table.name}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-slate-200 bg-white p-3 space-y-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild className="hover:bg-slate-50 rounded-lg px-3 py-1.5">
              <Link href="/tables/new" className="flex items-center gap-2.5">
                <Plus size={20} className="text-slate-600" />
                <span className="text-sm font-medium text-slate-600">New Table</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>

        <div className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-200 to-slate-300" />
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-slate-900 truncate">Alicia Chen</div>
            <div className="text-xs text-slate-400">Pro Plan</div>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
