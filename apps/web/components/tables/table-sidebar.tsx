'use client';

import { Plus } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
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
    <Sidebar className="border-r border-gray-200 bg-white">
      <SidebarHeader className="p-5">
        <div className="flex items-center gap-3">
          <Image 
            src="/img/glaze-abs.png" 
            alt="Glaze Logo" 
            width={32}
            height={32}
            className="w-8 h-8"
          />
          <h1 className="text-lg font-bold text-gray-900 tracking-tight">Glaze</h1>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
            Workspace
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {tables.map((table) => (
                <SidebarMenuItem key={table.id}>
                  <SidebarMenuButton
                    asChild
                    isActive={table.id === currentTableId || table.active}
                    className="data-[active=true]:bg-cyan-500/5 data-[active=true]:text-cyan-500 data-[active=true]:font-medium hover:bg-gray-50"
                  >
                    <Link href={`/dashboard/tables/${table.id}`} className="flex items-center gap-2.5">
                      <span className="text-base">📄</span>
                      <span>{table.name}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
            Team
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild className="hover:bg-gray-50">
                  <Link href="/dashboard/team/sales" className="flex items-center gap-2.5">
                    <span className="text-base">👥</span>
                    <span>Sales Team Q2</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild className="hover:bg-gray-50">
              <Link href="/dashboard/tables/new" className="flex items-center gap-2.5">
                <Plus size={18} />
                <span>New Table</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>

        <div className="flex items-center gap-3 px-3 py-2 mt-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-200 to-gray-300" />
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-gray-900 truncate">Alicia Chen</div>
            <div className="text-xs text-gray-400">Pro Plan</div>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
