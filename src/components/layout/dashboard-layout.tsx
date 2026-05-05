'use client';

import { useState } from 'react';
import { useAppStore } from '@/lib/store';
import { UserRole, ViewId } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Home, Stethoscope, Building2, CalendarDays, ClipboardCheck,
  ArrowLeftRight, FileBarChart, Users, Settings, LogOut, Menu, X
} from 'lucide-react';
import Image from 'next/image';
import { toast } from 'sonner';

interface NavItemConfig {
  id: ViewId;
  label: string;
  icon: React.ReactNode;
  roles: UserRole[];
}

const NAV_ITEMS: NavItemConfig[] = [
  { id: 'home', label: 'الرئيسية', icon: <Home className="h-5 w-5" />, roles: ['super_admin', 'manager', 'worker'] },
  { id: 'doctors', label: 'الأطباء', icon: <Stethoscope className="h-5 w-5" />, roles: ['super_admin', 'manager', 'worker'] },
  { id: 'departments', label: 'الأقسام', icon: <Building2 className="h-5 w-5" />, roles: ['super_admin', 'worker'] },
  { id: 'schedules', label: 'الجداول الشهرية', icon: <CalendarDays className="h-5 w-5" />, roles: ['super_admin', 'worker'] },
  { id: 'today-attendance', label: 'تحضير اليوم', icon: <ClipboardCheck className="h-5 w-5" />, roles: ['super_admin', 'worker'] },
  { id: 'change-requests', label: 'طلبات التغيير', icon: <ArrowLeftRight className="h-5 w-5" />, roles: ['super_admin', 'manager'] },
  { id: 'reports', label: 'التقارير', icon: <FileBarChart className="h-5 w-5" />, roles: ['super_admin', 'manager', 'worker'] },
  { id: 'users', label: 'إدارة المستخدمين', icon: <Users className="h-5 w-5" />, roles: ['super_admin'] },
  { id: 'settings', label: 'إعدادات الحساب', icon: <Settings className="h-5 w-5" />, roles: ['super_admin', 'manager', 'worker'] },
];

const ROLE_LABELS: Record<UserRole, string> = {
  super_admin: 'مدير النظام',
  manager: 'مدير',
  worker: 'موظف',
};

function SidebarContent({
  filteredNavItems,
  currentView,
  onNavClick,
  onLogout,
}: {
  filteredNavItems: NavItemConfig[];
  currentView: string;
  onNavClick: (viewId: ViewId) => void;
  onLogout: () => void;
}) {
  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="p-4 flex flex-col items-center gap-2">
        <div className="w-16 h-16 relative">
          <Image
            src="/logo.png"
            alt="شعار المستشفى"
            fill
            className="object-contain rounded-full"
          />
        </div>
        <h2 className="text-sm font-semibold text-sidebar-foreground text-center leading-tight">
          نظام مراجعة حضور
          <br />
          أطباء الامتياز
        </h2>
      </div>

      <Separator className="bg-sidebar-border" />

      {/* Navigation */}
      <ScrollArea className="flex-1 py-2">
        <nav className="space-y-1 px-2">
          {filteredNavItems.map(item => (
            <Button
              key={item.id}
              variant="ghost"
              onClick={() => onNavClick(item.id)}
              className={cn(
                'w-full justify-start gap-3 h-10 px-3 text-sm transition-all',
                currentView === item.id
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
                  : 'text-sidebar-foreground/80 hover:text-sidebar-foreground hover:bg-sidebar-accent/50'
              )}
            >
              {item.icon}
              <span>{item.label}</span>
            </Button>
          ))}
        </nav>
      </ScrollArea>

      <Separator className="bg-sidebar-border" />

      {/* Logout */}
      <div className="p-2">
        <Button
          variant="ghost"
          onClick={onLogout}
          className="w-full justify-start gap-3 h-10 px-3 text-sm text-red-300 hover:text-red-200 hover:bg-red-900/30"
        >
          <LogOut className="h-5 w-5" />
          <span>تسجيل الخروج</span>
        </Button>
      </div>
    </div>
  );
}

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const currentView = useAppStore(s => s.currentView);
  const currentUser = useAppStore(s => s.currentUser);
  const navigateTo = useAppStore(s => s.navigateTo);
  const logout = useAppStore(s => s.logout);
  const [mobileOpen, setMobileOpen] = useState(false);

  const filteredNavItems = NAV_ITEMS.filter(
    item => currentUser && item.roles.includes(currentUser.role)
  );

  const handleLogout = () => {
    logout();
    toast.success('تم تسجيل الخروج بنجاح');
  };

  const handleNavClick = (viewId: ViewId) => {
    navigateTo(viewId);
    setMobileOpen(false);
  };

  const sidebarProps = {
    filteredNavItems,
    currentView,
    onNavClick: handleNavClick,
    onLogout: handleLogout,
  };

  return (
    <div className="min-h-screen flex bg-background">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:w-64 bg-sidebar flex-col border-l border-sidebar-border">
        <SidebarContent {...sidebarProps} />
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Top Header */}
        <header className="h-14 border-b bg-card flex items-center justify-between px-4 lg:px-6 sticky top-0 z-40">
          <div className="flex items-center gap-3">
            {/* Mobile menu */}
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="lg:hidden">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-64 p-0 bg-sidebar border-sidebar-border">
                <SheetTitle className="sr-only">القائمة</SheetTitle>
                <SidebarContent {...sidebarProps} />
              </SheetContent>
            </Sheet>
            <h1 className="text-lg font-semibold text-foreground">
              {filteredNavItems.find(i => i.id === currentView)?.label || 'الرئيسية'}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            {currentUser && (
              <>
                <Badge variant="outline" className="text-xs border-teal-200 bg-teal-50 text-teal-700">
                  {ROLE_LABELS[currentUser.role]}
                </Badge>
                <span className="text-sm font-medium text-muted-foreground hidden sm:block">
                  {currentUser.name}
                </span>
              </>
            )}
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 lg:p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
