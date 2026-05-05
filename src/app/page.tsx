'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAppStore } from '@/lib/store';
import { toast } from 'sonner';
import {
  LayoutDashboard, Users, Building2, Calendar, ClipboardCheck,
  UserPlus, ArrowLeftRight, BarChart3, UserCog, Settings, LogOut,
  Menu, X, Plus, Pencil, Trash2, Search, Upload, Download, Printer,
  ChevronDown, Check, Eye, EyeOff, RefreshCw, QrCode, FileSpreadsheet,
  ArrowRight, ChevronLeft, Clock, AlertCircle, Shield, Activity,
  TrendingUp, Phone, Mail, Stethoscope, Hash, Filter
} from 'lucide-react';

// ============================================================
// API Helper
// ============================================================
const api = {
  get: async (url: string): Promise<any> => {
    const token = useAppStore.getState().token;
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(url, { headers, credentials: 'include' });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'حدث خطأ' }));
      throw new Error(err.error || 'حدث خطأ');
    }
    return res.json();
  },
  post: async (url: string, data?: any): Promise<any> => {
    const token = useAppStore.getState().token;
    const isFormData = data instanceof FormData;
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    if (!isFormData) headers['Content-Type'] = 'application/json';
    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: isFormData ? data : JSON.stringify(data),
      credentials: 'include',
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'حدث خطأ' }));
      throw new Error(err.error || 'حدث خطأ');
    }
    return res.json();
  },
  put: async (url: string, data: any): Promise<any> => {
    const token = useAppStore.getState().token;
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(url, {
      method: 'PUT',
      headers,
      body: JSON.stringify(data),
      credentials: 'include',
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'حدث خطأ' }));
      throw new Error(err.error || 'حدث خطأ');
    }
    return res.json();
  },
  del: async (url: string): Promise<any> => {
    const token = useAppStore.getState().token;
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(url, { method: 'DELETE', headers, credentials: 'include' });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'حدث خطأ' }));
      throw new Error(err.error || 'حدث خطأ');
    }
    return res.json();
  },
};

// ============================================================
// Helpers
// ============================================================
function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function getTodayStr(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function getDaysInMonth(month: string): number {
  const [y, m] = month.split('-').map(Number);
  return new Date(y, m, 0).getDate();
}

function formatDateAr(dateStr: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('ar-SA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}

function formatTime(timeStr: string): string {
  if (!timeStr) return '—';
  try {
    const d = new Date(timeStr);
    return d.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return timeStr;
  }
}

function getMonthName(month: string): string {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(y, m - 1, 1);
  return d.toLocaleDateString('ar-SA', { year: 'numeric', month: 'long' });
}

function getMonthList(): { value: string; label: string }[] {
  const months: { value: string; label: string }[] = [];
  const now = new Date();
  for (let i = -6; i <= 6; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = d.toLocaleDateString('ar-SA', { year: 'numeric', month: 'long' });
    months.push({ value: val, label });
  }
  return months;
}

function statusBadge(status: string) {
  const map: Record<string, string> = {
    present: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    absent: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    outside_schedule: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    incomplete: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
    approved_changed_day: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    scheduled: 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-400',
    changed_from: 'bg-gray-100 text-gray-600 dark:bg-gray-900/30 dark:text-gray-400',
    changed_to: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400',
    pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    approved: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    rejected: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    cancelled: 'bg-gray-100 text-gray-600 dark:bg-gray-900/30 dark:text-gray-400',
  };
  const textMap: Record<string, string> = {
    present: 'حاضر', absent: 'غائب', outside_schedule: 'خارج الجدول',
    incomplete: 'غير مكتمل', approved_changed_day: 'معتمد (بديل)',
    scheduled: 'مجدول', changed_from: 'تم التغيير منه', changed_to: 'يوم بديل',
    pending: 'معلّق', approved: 'معتمد', rejected: 'مرفوض', cancelled: 'ملغى',
  };
  return { cls: map[status] || 'bg-gray-100 text-gray-600', text: textMap[status] || status };
}

function shiftBadge(shift: string) {
  if (shift === 'morning') return { cls: 'bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-400', text: 'صباحي' };
  if (shift === 'evening') return { cls: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400', text: 'مسائي' };
  return { cls: 'bg-gray-100 text-gray-600', text: shift };
}

function roleBadge(role: string) {
  const map: Record<string, { cls: string; text: string }> = {
    super_admin: { cls: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400', text: 'مدير عام' },
    manager: { cls: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400', text: 'مدير' },
    worker: { cls: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400', text: 'موظف' },
  };
  return map[role] || { cls: 'bg-gray-100 text-gray-600', text: role };
}

// ============================================================
// Components
// ============================================================

// --- Simple reusable wrapper components ---
function B({ className = '', variant, ...props }: any) {
  const base = 'inline-flex items-center justify-center rounded-md px-2 py-0.5 text-xs font-medium whitespace-nowrap';
  const cls = variant === 'outline' ? `${base} border` : `${base}`;
  return <span className={`${cls} ${className}`} {...props} />;
}

function StatusBadge({ status }: { status: string }) {
  const { cls, text } = statusBadge(status);
  return <span className={cls}>{text}</span>;
}

function ShiftBadge({ shift }: { shift: string }) {
  const { cls, text } = shiftBadge(shift);
  return <span className={cls}>{text}</span>;
}

function RoleBadge({ role }: { role: string }) {
  const { cls, text } = roleBadge(role);
  return <span className={cls}>{text}</span>;
}

// ============================================================
// LOGIN VIEW
// ============================================================
function LoginView({ onLogin }: { onLogin: (user: any, token: string) => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Only check if already logged in via cookie (no seed here)
    fetch('/api/auth')
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(data => { if (data.user) onLogin(data.user, ''); })
      .catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) { toast.error('البريد الإلكتروني وكلمة المرور مطلوبان'); return; }
    setLoading(true);
    try {
      const data = await api.post('/api/auth', { action: 'login', email, password });
      onLogin(data.user, data.token);
      toast.success(`مرحباً ${data.user.name}`);
    } catch (err: any) {
      toast.error(err.message || 'بيانات الدخول غير صحيحة');
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-teal-50 via-white to-emerald-50 dark:from-gray-950 dark:via-gray-900 dark:to-teal-950 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="mx-auto w-20 h-20 bg-gradient-to-br from-teal-500 to-emerald-600 rounded-2xl flex items-center justify-center shadow-lg mb-4">
            <Stethoscope className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">نظام مراجعة حضور أطباء الامتياز</h1>
          <p className="text-muted-foreground mt-2">سجّل الدخول للمتابعة</p>
        </div>
        <form onSubmit={handleSubmit} className="bg-card rounded-xl border shadow-lg p-6 space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">البريد الإلكتروني</label>
            <div className="relative">
              <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                className="w-full h-10 pr-10 pl-4 rounded-md border border-input bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-ring/50 focus:border-ring text-right"
                placeholder="admin@hospital.com" dir="ltr" />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">كلمة المرور</label>
            <div className="relative">
              <Shield className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input type={showPass ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                className="w-full h-10 pr-10 pl-10 rounded-md border border-input bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-ring/50 focus:border-ring text-right"
                placeholder="••••••••" />
              <button type="button" onClick={() => setShowPass(!showPass)}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <button type="submit" disabled={loading}
            className="w-full h-10 bg-primary text-primary-foreground rounded-md font-medium text-sm hover:bg-primary/90 disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
            {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : null}
            {loading ? 'جاري تسجيل الدخول...' : 'تسجيل الدخول'}
          </button>
        </form>
      </div>
    </div>
  );
}

// ============================================================
// CHANGE PASSWORD VIEW
// ============================================================
function ChangePasswordView() {
  const { user, updateUser, setCurrentPage } = useAppStore();
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!oldPassword || !newPassword || !confirmPassword) { toast.error('جميع الحقول مطلوبة'); return; }
    if (newPassword !== confirmPassword) { toast.error('كلمة المرور الجديدة غير متطابقة'); return; }
    if (newPassword.length < 6) { toast.error('كلمة المرور يجب أن تكون 6 أحرف على الأقل'); return; }
    setLoading(true);
    try {
      const result = await api.post('/api/auth', { action: 'change-password', oldPassword, newPassword });
      // Update local state with new token and mustChangePassword
      updateUser({ mustChangePassword: false });
      if (result.token) {
        useAppStore.getState().login(useAppStore.getState().user!, result.token);
      }
      toast.success('تم تغيير كلمة المرور بنجاح');
      setCurrentPage('dashboard');
    } catch (err: any) { toast.error(err.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-teal-50 via-white to-emerald-50 dark:from-gray-950 dark:via-gray-900 dark:to-teal-950 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Shield className="mx-auto w-16 h-16 text-primary mb-4" />
          <h1 className="text-2xl font-bold">تغيير كلمة المرور</h1>
          <p className="text-muted-foreground mt-2">مرحباً {user?.name}، يجب تغيير كلمة المرور قبل المتابعة</p>
        </div>
        <form onSubmit={handleSubmit} className="bg-card rounded-xl border shadow-lg p-6 space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">كلمة المرور الحالية</label>
            <div className="relative">
              <input type={showOld ? 'text' : 'password'} value={oldPassword} onChange={e => setOldPassword(e.target.value)}
                className="w-full h-10 pr-4 pl-10 rounded-md border border-input bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-ring/50 focus:border-ring text-right" />
              <button type="button" onClick={() => setShowOld(!showOld)} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                {showOld ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">كلمة المرور الجديدة</label>
            <div className="relative">
              <input type={showNew ? 'text' : 'password'} value={newPassword} onChange={e => setNewPassword(e.target.value)}
                className="w-full h-10 pr-4 pl-10 rounded-md border border-input bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-ring/50 focus:border-ring text-right" />
              <button type="button" onClick={() => setShowNew(!showNew)} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">تأكيد كلمة المرور الجديدة</label>
            <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
              className="w-full h-10 px-4 rounded-md border border-input bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-ring/50 focus:border-ring text-right" />
          </div>
          <button type="submit" disabled={loading}
            className="w-full h-10 bg-primary text-primary-foreground rounded-md font-medium text-sm hover:bg-primary/90 disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
            {loading && <RefreshCw className="w-4 h-4 animate-spin" />}
            تغيير كلمة المرور
          </button>
        </form>
      </div>
    </div>
  );
}

// ============================================================
// NAV ITEMS
// ============================================================
const navItems = [
  { id: 'dashboard', label: 'لوحة التحكم', icon: LayoutDashboard, roles: ['super_admin', 'manager', 'worker'] },
  { id: 'doctors', label: 'أطباء الامتياز', icon: Users, roles: ['super_admin', 'manager', 'worker'] },
  { id: 'departments', label: 'الأقسام', icon: Building2, roles: ['super_admin', 'manager'] },
  { id: 'monthly-schedule', label: 'الجدول الشهري', icon: Calendar, roles: ['super_admin', 'manager', 'worker'] },
  { id: 'today-attendance', label: 'حضور اليوم', icon: ClipboardCheck, roles: ['super_admin', 'manager', 'worker'] },
  { id: 'manual-attendance', label: 'تسجيل حضور يدوي', icon: UserPlus, roles: ['super_admin', 'manager', 'worker'] },
  { id: 'change-requests', label: 'طلبات التغيير', icon: ArrowLeftRight, roles: ['super_admin', 'manager', 'worker'] },
  { id: 'reports', label: 'التقارير', icon: BarChart3, roles: ['super_admin', 'manager'] },
  { id: 'users', label: 'إدارة المستخدمين', icon: UserCog, roles: ['super_admin'] },
  { id: 'account-settings', label: 'إعدادات الحساب', icon: Settings, roles: ['super_admin', 'manager', 'worker'] },
];

// ============================================================
// SIDEBAR
// ============================================================
function Sidebar() {
  const { user, currentPage, setCurrentPage, logout, sidebarOpen, setSidebarOpen, setSelectedDoctor } = useAppStore();

  const handleNav = (id: string) => {
    setCurrentPage(id);
    setSelectedDoctor(null);
    setSidebarOpen(false);
  };

  const visibleItems = navItems.filter(item => user && item.roles.includes(user.role));

  return (
    <>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}
      {/* Sidebar */}
      <aside className={`fixed top-0 right-0 z-50 h-full w-64 bg-sidebar text-sidebar-foreground transition-transform duration-300 lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : 'translate-x-full'} lg:static lg:z-auto flex flex-col`}>
        {/* Header */}
        <div className="flex items-center gap-3 p-4 border-b border-sidebar-border">
          <div className="w-10 h-10 bg-sidebar-primary rounded-xl flex items-center justify-center flex-shrink-0">
            <Stethoscope className="w-5 h-5 text-sidebar-primary-foreground" />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-bold truncate">نظام الحضور</h2>
            <p className="text-xs text-sidebar-foreground/60 truncate">أطباء الامتياز</p>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden mr-auto text-sidebar-foreground/60 hover:text-sidebar-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>
        {/* Nav items */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {visibleItems.map(item => {
            const Icon = item.icon;
            const isActive = currentPage === item.id || (item.id === 'dashboard' && currentPage === 'doctor-detail');
            return (
              <button key={item.id} onClick={() => handleNav(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive ? 'bg-sidebar-accent text-sidebar-accent-foreground' : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
                }`}>
                <Icon className="w-5 h-5 flex-shrink-0" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
        {/* Footer */}
        <div className="border-t border-sidebar-border p-3 space-y-1">
          {user && (
            <div className="px-3 py-2 mb-2">
              <p className="text-sm font-medium truncate">{user.name}</p>
              <RoleBadge role={user.role} />
            </div>
          )}
          <button onClick={logout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-red-300 hover:bg-red-900/20 hover:text-red-200 transition-colors">
            <LogOut className="w-5 h-5 flex-shrink-0" />
            <span>تسجيل الخروج</span>
          </button>
        </div>
      </aside>
    </>
  );
}

// ============================================================
// HEADER
// ============================================================
function Header() {
  const { user, currentPage, toggleSidebar } = useAppStore();
  const title = navItems.find(n => n.id === currentPage)?.label ||
    (currentPage === 'doctor-detail' ? 'تفاصيل الطبيب' : 'لوحة التحكم');
  const { selectedMonth, setSelectedMonth } = useAppStore();
  const months = getMonthList();

  return (
    <header className="sticky top-0 z-30 bg-card/80 backdrop-blur-sm border-b px-4 lg:px-6 h-14 flex items-center gap-4">
      <button onClick={toggleSidebar} className="lg:hidden text-foreground hover:text-primary">
        <Menu className="w-5 h-5" />
      </button>
      <h1 className="text-lg font-bold flex-1">{title}</h1>
      <div className="flex items-center gap-3">
        {['monthly-schedule', 'reports', 'doctor-detail', 'today-attendance', 'change-requests'].includes(currentPage) && (
          <select value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)}
            className="h-8 px-2 rounded-md border border-input bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-ring/50 min-w-[140px]">
            {months.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
        )}
        <div className="hidden sm:flex items-center gap-2 text-sm text-muted-foreground">
          <span>{user?.name}</span>
          <RoleBadge role={user?.role || ''} />
        </div>
      </div>
    </header>
  );
}

// ============================================================
// DASHBOARD PAGE
// ============================================================
function DashboardPage({ onNavigate }: { onNavigate: (page: string) => void }) {
  const [stats, setStats] = useState({ totalDoctors: 0, todayPresent: 0, todayTotal: 0, pendingRequests: 0, activeDepts: 0 });
  const [loading, setLoading] = useState(true);
  const { user } = useAppStore();

  useEffect(() => {
    async function load() {
      try {
        const [doctorsRes, todayRes, crRes, deptRes] = await Promise.allSettled([
          api.get('/api/doctors?active=true'),
          api.get('/api/attendance/today'),
          api.get('/api/change-requests?status=pending'),
          api.get('/api/departments?active=true'),
        ]);
        const totalDoctors = doctorsRes.status === 'fulfilled' ? doctorsRes.value.doctors?.length || 0 : 0;
        const todayData = todayRes.status === 'fulfilled' ? todayRes.value : null;
        const presentCount = todayData ? [...(todayData.morning || []), ...(todayData.evening || [])].filter((d: any) => d.attendance?.status === 'present').length : 0;
        const totalCount = todayData ? (todayData.morning?.length || 0) + (todayData.evening?.length || 0) : 0;
        const pendingRequests = crRes.status === 'fulfilled' ? crRes.value.changeRequests?.length || 0 : 0;
        const activeDepts = deptRes.status === 'fulfilled' ? deptRes.value.departments?.length || 0 : 0;
        setStats({ totalDoctors, todayPresent: presentCount, todayTotal: totalCount, pendingRequests, activeDepts });
      } catch {}
      finally { setLoading(false); }
    }
    load();
  }, []);

  const cards = [
    { label: 'إجمالي الأطباء', value: stats.totalDoctors, icon: Users, color: 'text-teal-600 bg-teal-50 dark:bg-teal-900/20 dark:text-teal-400' },
    { label: 'حضور اليوم', value: `${stats.todayPresent}/${stats.todayTotal}`, icon: ClipboardCheck, color: 'text-green-600 bg-green-50 dark:bg-green-900/20 dark:text-green-400' },
    { label: 'طلبات التغيير المعلّقة', value: stats.pendingRequests, icon: ArrowLeftRight, color: 'text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20 dark:text-yellow-400' },
    { label: 'الأقسام النشطة', value: stats.activeDepts, icon: Building2, color: 'text-blue-600 bg-blue-50 dark:bg-blue-900/20 dark:text-blue-400' },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c, i) => {
          const Icon = c.icon;
          return (
            <div key={i} className="bg-card border rounded-xl p-5 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-muted-foreground">{c.label}</span>
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${c.color}`}>
                  <Icon className="w-5 h-5" />
                </div>
              </div>
              <p className="text-3xl font-bold">{loading ? <RefreshCw className="w-6 h-6 animate-spin inline" /> : c.value}</p>
            </div>
          );
        })}
      </div>

      <div className="bg-card border rounded-xl p-6">
        <h2 className="text-lg font-bold mb-4">إجراءات سريعة</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <button onClick={() => onNavigate('today-attendance')} className="flex items-center gap-3 p-4 rounded-lg border hover:bg-accent transition-colors text-right">
            <ClipboardCheck className="w-5 h-5 text-primary" />
            <div>
              <p className="font-medium text-sm">حضور اليوم</p>
              <p className="text-xs text-muted-foreground">تسجيل ومتابعة الحضور</p>
            </div>
          </button>
          <button onClick={() => onNavigate('doctors')} className="flex items-center gap-3 p-4 rounded-lg border hover:bg-accent transition-colors text-right">
            <Users className="w-5 h-5 text-primary" />
            <div>
              <p className="font-medium text-sm">الأطباء</p>
              <p className="text-xs text-muted-foreground">إدارة بيانات الأطباء</p>
            </div>
          </button>
          <button onClick={() => onNavigate('monthly-schedule')} className="flex items-center gap-3 p-4 rounded-lg border hover:bg-accent transition-colors text-right">
            <Calendar className="w-5 h-5 text-primary" />
            <div>
              <p className="font-medium text-sm">الجدول الشهري</p>
              <p className="text-xs text-muted-foreground">عرض وإدارة الجداول</p>
            </div>
          </button>
          <button onClick={() => onNavigate('change-requests')} className="flex items-center gap-3 p-4 rounded-lg border hover:bg-accent transition-colors text-right">
            <ArrowLeftRight className="w-5 h-5 text-primary" />
            <div>
              <p className="font-medium text-sm">طلبات التغيير</p>
              <p className="text-xs text-muted-foreground">{stats.pendingRequests} طلب معلّق</p>
            </div>
          </button>
          <button onClick={() => onNavigate('reports')} className="flex items-center gap-3 p-4 rounded-lg border hover:bg-accent transition-colors text-right">
            <BarChart3 className="w-5 h-5 text-primary" />
            <div>
              <p className="font-medium text-sm">التقارير</p>
              <p className="text-xs text-muted-foreground">تقارير الحضور الشهرية</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// DOCTORS PAGE
// ============================================================
function DoctorsPage({ onNavigate, onSelectDoctor }: { onNavigate: (page: string) => void; onSelectDoctor: (id: string) => void }) {
  const [doctors, setDoctors] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingDoctor, setEditingDoctor] = useState<any>(null);
  const [form, setForm] = useState({ fullName: '', code: '', phone: '', email: '', departmentId: '' });
  const [saving, setSaving] = useState(false);
  const [autoCode, setAutoCode] = useState(true);

  const load = async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (deptFilter) params.set('departmentId', deptFilter);
      const [dRes, deptRes] = await Promise.all([
        api.get(`/api/doctors?${params.toString()}`),
        api.get('/api/departments'),
      ]);
      setDoctors(dRes.doctors || []);
      setDepartments(deptRes.departments || []);
    } catch (err: any) { toast.error(err.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [search, deptFilter]);

  const generateCode = () => {
    const maxCode = doctors.reduce((max: number, d: any) => {
      const num = parseInt(d.code);
      return !isNaN(num) && num > max ? num : max;
    }, 0);
    return String(maxCode + 1).padStart(3, '0');
  };

  const openAdd = () => {
    setForm({ fullName: '', code: generateCode(), phone: '', email: '', departmentId: '' });
    setAutoCode(true);
    setEditingDoctor(null);
    setDialogOpen(true);
  };
  const openEdit = (d: any) => {
    setForm({ fullName: d.fullName, code: d.code, phone: d.phone || '', email: d.email || '', departmentId: d.departmentId || '' });
    setAutoCode(false);
    setEditingDoctor(d);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.fullName.trim()) { toast.error('اسم الطبيب مطلوب'); return; }
    if (!autoCode && !form.code.trim()) { toast.error('رمز الطبيب مطلوب'); return; }
    if (!autoCode && !/^[0-9]{1,3}$/.test(form.code.trim())) { toast.error('رمز الطبيب يجب أن يكون رقماً من 1 إلى 3 أرقام'); return; }
    const finalForm = autoCode ? { ...form, code: generateCode() } : form;
    setSaving(true);
    try {
      if (editingDoctor) {
        await api.put(`/api/doctors/${editingDoctor.id}`, finalForm);
        toast.success('تم تحديث بيانات الطبيب');
      } else {
        await api.post('/api/doctors', finalForm);
        toast.success('تم إضافة الطبيب بنجاح');
      }
      setDialogOpen(false);
      load();
    } catch (err: any) { toast.error(err.message); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا الطبيب نهائياً من قاعدة البيانات؟')) return;
    try { await api.del(`/api/doctors/${id}`); toast.success('تم حذف الطبيب نهائياً'); load(); }
    catch (err: any) { toast.error(err.message); }
  };

  const toggleActive = async (d: any) => {
    try {
      await api.put(`/api/doctors/${d.id}`, { active: !d.active });
      toast.success(d.active ? 'تم تعطيل الطبيب' : 'تم تفعيل الطبيب');
      load();
    } catch (err: any) { toast.error(err.message); }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex flex-1 gap-3 w-full sm:w-auto">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="بحث بالاسم أو الرمز..."
              className="w-full h-9 pr-9 pl-4 rounded-md border border-input bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-ring/50" />
          </div>
          <select value={deptFilter} onChange={e => setDeptFilter(e.target.value)}
            className="h-9 px-3 rounded-md border border-input bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-ring/50">
            <option value="">كل الأقسام</option>
            {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </div>
        <button onClick={openAdd} className="flex items-center gap-2 h-9 px-4 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 transition-colors">
          <Plus className="w-4 h-4" /> إضافة طبيب
        </button>
      </div>

      <div className="bg-card border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-right p-3 font-medium">الاسم</th>
                <th className="text-right p-3 font-medium">الرمز</th>
                <th className="text-right p-3 font-medium hidden sm:table-cell">القسم</th>
                <th className="text-right p-3 font-medium hidden md:table-cell">الهاتف</th>
                <th className="text-right p-3 font-medium">الحالة</th>
                <th className="text-right p-3 font-medium">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading ? (
                <tr><td colSpan={6} className="p-8 text-center"><RefreshCw className="w-5 h-5 animate-spin mx-auto text-muted-foreground" /></td></tr>
              ) : doctors.length === 0 ? (
                <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">لا يوجد أطباء</td></tr>
              ) : doctors.map(d => (
                <tr key={d.id} className="hover:bg-muted/30 transition-colors">
                  <td className="p-3">
                    <button onClick={() => { onSelectDoctor(d.id); onNavigate('doctor-detail'); }}
                      className="text-primary hover:underline font-medium text-right">{d.fullName}</button>
                  </td>
                  <td className="p-3 font-mono text-xs">{d.code}</td>
                  <td className="p-3 hidden sm:table-cell">{d.department?.name || '—'}</td>
                  <td className="p-3 hidden md:table-cell" dir="ltr">{d.phone || '—'}</td>
                  <td className="p-3">
                    <button onClick={() => toggleActive(d)}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors cursor-pointer ${
                        d.active ? 'bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-900/30 dark:text-gray-400'
                      }`}>
                      <span className={`w-2 h-2 rounded-full ${d.active ? 'bg-green-500' : 'bg-gray-400'}`} />
                      {d.active ? 'نشط' : 'غير نشط'}
                    </button>
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-1">
                      <button onClick={() => openEdit(d)} className="p-1.5 rounded-md hover:bg-accent transition-colors" title="تعديل">
                        <Pencil className="w-4 h-4 text-muted-foreground" />
                      </button>
                      <button onClick={() => handleDelete(d.id)} className="p-1.5 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors" title="حذف نهائي">
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Dialog */}
      {dialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50" onClick={() => setDialogOpen(false)} />
          <div className="relative bg-card rounded-xl border shadow-xl w-full max-w-md p-6 space-y-4 z-10">
            <h2 className="text-lg font-bold">{editingDoctor ? 'تعديل بيانات الطبيب' : 'إضافة طبيب جديد'}</h2>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium">الاسم الكامل *</label>
                <input value={form.fullName} onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))}
                  className="w-full h-9 px-3 mt-1 rounded-md border border-input bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-ring/50" />
              </div>
              <div>
                <label className="text-sm font-medium">الرمز *</label>
                <div className="flex gap-2 mt-1">
                  <input value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))}
                    disabled={autoCode && !editingDoctor}
                    className="flex-1 h-9 px-3 rounded-md border border-input bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-ring/50 disabled:opacity-50 disabled:cursor-not-allowed" />
                  {!editingDoctor && (
                    <button type="button" onClick={() => setAutoCode(!autoCode)}
                      className={`h-9 px-3 rounded-md border text-xs font-medium transition-colors whitespace-nowrap ${autoCode ? 'bg-primary text-primary-foreground border-primary' : 'hover:bg-accent'}`}>
                      {autoCode ? 'تلقائي' : 'يدوي'}
                    </button>
                  )}
                </div>
                {autoCode && !editingDoctor && <p className="text-xs text-muted-foreground mt-1">سيتم توليد الرمز تلقائياً</p>}
              </div>
              <div>
                <label className="text-sm font-medium">الهاتف</label>
                <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                  className="w-full h-9 px-3 mt-1 rounded-md border border-input bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-ring/50" dir="ltr" />
              </div>
              <div>
                <label className="text-sm font-medium">البريد الإلكتروني</label>
                <input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  className="w-full h-9 px-3 mt-1 rounded-md border border-input bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-ring/50" dir="ltr" />
              </div>
              <div>
                <label className="text-sm font-medium">القسم</label>
                <select value={form.departmentId} onChange={e => setForm(f => ({ ...f, departmentId: e.target.value }))}
                  className="w-full h-9 px-3 mt-1 rounded-md border border-input bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-ring/50">
                  <option value="">بدون قسم</option>
                  {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-3 justify-end pt-2">
              <button onClick={() => setDialogOpen(false)} className="h-9 px-4 rounded-md border text-sm font-medium hover:bg-accent transition-colors">إلغاء</button>
              <button onClick={handleSave} disabled={saving}
                className="h-9 px-4 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors flex items-center gap-2">
                {saving && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                {editingDoctor ? 'تحديث' : 'إضافة'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// DOCTOR DETAIL PAGE
// ============================================================
function DoctorDetailPage({ doctorId }: { doctorId: string }) {
  const { selectedMonth } = useAppStore();
  const [doctor, setDoctor] = useState<any>(null);
  const [schedule, setSchedule] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState<Record<string, { active: boolean; shift: string }>>({});
  const [saving, setSaving] = useState(false);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [changeRequests, setChangeRequests] = useState<any[]>([]);

  const load = async () => {
    try {
      const [docRes, schRes, attRes, crRes] = await Promise.allSettled([
        api.get(`/api/doctors/${doctorId}`),
        api.get(`/api/doctors/${doctorId}/schedule?month=${selectedMonth}`),
        api.get(`/api/attendance?month=${selectedMonth}&doctorId=${doctorId}`),
        api.get(`/api/change-requests?month=${selectedMonth}&doctorId=${doctorId}`),
      ]);
      if (docRes.status === 'fulfilled') setDoctor(docRes.value.doctor);
      if (schRes.status === 'fulfilled') {
        const s = schRes.value.schedule;
        setSchedule(s);
        const d: Record<string, { active: boolean; shift: string }> = {};
        if (s?.scheduleDays) {
          s.scheduleDays.forEach((sd: any) => {
            const day = sd.date.split('-')[2];
            d[day] = { active: true, shift: sd.shift };
          });
        }
        setDays(d);
      }
      if (attRes.status === 'fulfilled') setAttendance(attRes.value.records || []);
      if (crRes.status === 'fulfilled') setChangeRequests(crRes.value.changeRequests || []);
    } catch {}
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [doctorId, selectedMonth]);

  const toggleDay = (dayNum: string) => {
    setDays(prev => {
      const curr = prev[dayNum];
      if (curr?.active) {
        const next = { ...prev };
        delete next[dayNum];
        return next;
      }
      return { ...prev, [dayNum]: { active: true, shift: 'morning' } };
    });
  };

  const setDayShift = (dayNum: string, shift: string) => {
    setDays(prev => ({ ...prev, [dayNum]: { active: true, shift } }));
  };

  const saveSchedule = async () => {
    setSaving(true);
    try {
      const activeDays = Object.entries(days).map(([dayNum, d]) => ({
        date: `${selectedMonth}-${dayNum.padStart(2, '0')}`,
        shift: d.shift,
      }));
      await api.post(`/api/doctors/${doctorId}/schedule`, {
        month: selectedMonth,
        days: activeDays,
        requiredDays: activeDays.length,
      });
      toast.success('تم حفظ الجدول بنجاح');
      load();
    } catch (err: any) { toast.error(err.message); }
    finally { setSaving(false); }
  };

  const daysInMonth = getDaysInMonth(selectedMonth);
  const presentCount = attendance.filter((a: any) => a.status === 'present').length;
  const absentCount = attendance.filter((a: any) => a.status === 'absent').length;

  if (loading) return <div className="flex items-center justify-center py-20"><RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" /></div>;
  if (!doctor) return <div className="text-center py-20 text-muted-foreground">الطبيب غير موجود</div>;

  return (
    <div className="space-y-6">
      {/* Doctor Info */}
      <div className="bg-card border rounded-xl p-6">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-primary/10 rounded-xl flex items-center justify-center">
              <Stethoscope className="w-7 h-7 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold">{doctor.fullName}</h2>
              <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground flex-wrap">
                <span className="flex items-center gap-1"><Hash className="w-3.5 h-3.5" />{doctor.code}</span>
                <span className="flex items-center gap-1"><Building2 className="w-3.5 h-3.5" />{doctor.department?.name || 'بدون قسم'}</span>
                {doctor.phone && <span className="flex items-center gap-1" dir="ltr"><Phone className="w-3.5 h-3.5" />{doctor.phone}</span>}
              </div>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="text-center px-3">
              <p className="text-2xl font-bold text-green-600">{presentCount}</p>
              <p className="text-xs text-muted-foreground">حاضر</p>
            </div>
            <div className="text-center px-3">
              <p className="text-2xl font-bold text-red-600">{absentCount}</p>
              <p className="text-xs text-muted-foreground">غائب</p>
            </div>
            <div className="text-center px-3">
              <p className="text-2xl font-bold">{Object.keys(days).length}</p>
              <p className="text-xs text-muted-foreground">مجدول</p>
            </div>
          </div>
        </div>
      </div>

      {/* Schedule Grid */}
      <div className="bg-card border rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-lg">جدول {getMonthName(selectedMonth)}</h3>
          <button onClick={saveSchedule} disabled={saving}
            className="flex items-center gap-2 h-9 px-4 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors">
            {saving && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
            حفظ الجدول
          </button>
        </div>
        <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-7 lg:grid-cols-10 gap-2">
          {Array.from({ length: daysInMonth }, (_, i) => {
            const dayNum = String(i + 1);
            const dayData = days[dayNum];
            const dateStr = `${selectedMonth}-${dayNum.padStart(2, '0')}`;
            const dayOfWeek = new Date(dateStr + 'T00:00:00').getDay();
            const isWeekend = dayOfWeek === 5; // Friday
            const isActive = !!dayData?.active;
            const isEvening = dayData?.shift === 'evening';

            return (
              <div key={i} className={`rounded-lg border p-2 text-center transition-all cursor-pointer ${isActive ? (isEvening ? 'bg-purple-50 border-purple-300 dark:bg-purple-900/20 dark:border-purple-700' : 'bg-sky-50 border-sky-300 dark:bg-sky-900/20 dark:border-sky-700') : isWeekend ? 'bg-red-50/50 border-red-200 dark:bg-red-900/10 dark:border-red-900' : 'bg-gray-50 border-gray-200 dark:bg-gray-900/20 dark:border-gray-700'} hover:shadow-sm`}
                onClick={() => toggleDay(dayNum)}>
                <p className="text-xs font-medium text-muted-foreground">{dayNum}</p>
                <p className="text-[10px] text-muted-foreground/60 mb-1">
                  {['أح', 'إث', 'ثل', 'أر', 'خم', 'جمع', 'سبت'][dayOfWeek]}
                </p>
                {isActive && (
                  <div onClick={e => e.stopPropagation()}>
                    <select value={dayData.shift} onChange={e => setDayShift(dayNum, e.target.value)}
                      className="w-full text-[10px] px-0 py-0 bg-transparent border-0 text-center focus:outline-none cursor-pointer">
                      <option value="morning">صباحي</option>
                      <option value="evening">مسائي</option>
                    </select>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <div className="flex gap-4 mt-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-sky-100 border border-sky-300 dark:bg-sky-900/30" /> صباحي</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-purple-100 border border-purple-300 dark:bg-purple-900/30" /> مسائي</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-gray-100 border border-gray-200 dark:bg-gray-800" /> فارغ</span>
        </div>
      </div>

      {/* Change Requests */}
      {changeRequests.length > 0 && (
        <div className="bg-card border rounded-xl p-6">
          <h3 className="font-bold text-lg mb-4">طلبات التغيير</h3>
          <div className="space-y-2">
            {changeRequests.slice(0, 5).map((cr: any) => (
              <div key={cr.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 text-sm">
                <div>
                  <span className="font-medium">{cr.originalDate}</span> <ArrowLeftRight className="w-3.5 h-3.5 inline mx-1" /> <span className="font-medium">{cr.requestedDate}</span>
                  <p className="text-xs text-muted-foreground mt-1">{cr.reason}</p>
                </div>
                <StatusBadge status={cr.status} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// DEPARTMENTS PAGE
// ============================================================
function DepartmentsPage() {
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ name: '', description: '' });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      const res = await api.get('/api/departments');
      setDepartments(res.departments || []);
    } catch (err: any) { toast.error(err.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const openAdd = () => { setForm({ name: '', description: '' }); setEditing(null); setDialogOpen(true); };
  const openEdit = (d: any) => { setForm({ name: d.name, description: d.description || '' }); setEditing(d); setDialogOpen(true); };

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error('اسم القسم مطلوب'); return; }
    setSaving(true);
    try {
      if (editing) {
        await api.put(`/api/departments/${editing.id}`, form);
        toast.success('تم تحديث القسم');
      } else {
        await api.post('/api/departments', form);
        toast.success('تم إضافة القسم');
      }
      setDialogOpen(false);
      load();
    } catch (err: any) { toast.error(err.message); }
    finally { setSaving(false); }
  };

  const toggleActive = async (d: any) => {
    try {
      await api.put(`/api/departments/${d.id}`, { active: !d.active });
      toast.success(d.active ? 'تم تعطيل القسم' : 'تم تفعيل القسم');
      load();
    } catch (err: any) { toast.error(err.message); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا القسم؟')) return;
    try { await api.del(`/api/departments/${id}`); toast.success('تم حذف القسم'); load(); }
    catch (err: any) { toast.error(err.message); }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">{departments.length} قسم</p>
        <button onClick={openAdd} className="flex items-center gap-2 h-9 px-4 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 transition-colors">
          <Plus className="w-4 h-4" /> إضافة قسم
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-full flex items-center justify-center py-12"><RefreshCw className="w-5 h-5 animate-spin text-muted-foreground" /></div>
        ) : departments.map(d => (
          <div key={d.id} className="bg-card border rounded-xl p-5 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="font-bold">{d.name}</h3>
                {d.description && <p className="text-sm text-muted-foreground mt-1">{d.description}</p>}
              </div>
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${d.active ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-600'}`}>
                {d.active ? 'نشط' : 'معطّل'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground flex items-center gap-1">
                <Users className="w-3.5 h-3.5" />
                {d._count?.doctors || 0} طبيب
              </span>
              <div className="flex gap-1">
                <button onClick={() => openEdit(d)} className="p-1.5 rounded-md hover:bg-accent transition-colors"><Pencil className="w-4 h-4 text-muted-foreground" /></button>
                <button onClick={() => toggleActive(d)} className="p-1.5 rounded-md hover:bg-accent transition-colors">
                  {d.active ? <EyeOff className="w-4 h-4 text-muted-foreground" /> : <Eye className="w-4 h-4 text-muted-foreground" />}
                </button>
                <button onClick={() => handleDelete(d.id)} className="p-1.5 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"><Trash2 className="w-4 h-4 text-red-500" /></button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {dialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50" onClick={() => setDialogOpen(false)} />
          <div className="relative bg-card rounded-xl border shadow-xl w-full max-w-md p-6 space-y-4 z-10">
            <h2 className="text-lg font-bold">{editing ? 'تعديل القسم' : 'إضافة قسم جديد'}</h2>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium">اسم القسم *</label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full h-9 px-3 mt-1 rounded-md border border-input bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-ring/50" />
              </div>
              <div>
                <label className="text-sm font-medium">الوصف</label>
                <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  className="w-full px-3 py-2 mt-1 rounded-md border border-input bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-ring/50 min-h-[80px]" />
              </div>
            </div>
            <div className="flex gap-3 justify-end pt-2">
              <button onClick={() => setDialogOpen(false)} className="h-9 px-4 rounded-md border text-sm font-medium hover:bg-accent">إلغاء</button>
              <button onClick={handleSave} disabled={saving}
                className="h-9 px-4 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2">
                {saving && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                {editing ? 'تحديث' : 'إضافة'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// MONTHLY SCHEDULE PAGE
// ============================================================
function MonthlySchedulePage({ onSelectDoctor }: { onSelectDoctor: (id: string) => void }) {
  const { selectedMonth } = useAppStore();
  const [doctors, setDoctors] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [deptFilter, setDeptFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<any>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ active: 'true' });
      if (deptFilter) params.set('departmentId', deptFilter);
      const [dRes, deptRes] = await Promise.all([
        api.get(`/api/doctors?${params.toString()}`),
        api.get('/api/departments'),
      ]);
      setDoctors(dRes.doctors || []);
      setDepartments(deptRes.departments || []);
    } catch {}
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [selectedMonth, deptFilter]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadResult(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await api.post('/api/doctors/upload-schedule', fd);
      setUploadResult(res);
      toast.success('تم استيراد الجدول بنجاح');
      load();
    } catch (err: any) { toast.error(err.message); }
    finally { setUploading(false); }
  };

  const daysInMonth = getDaysInMonth(selectedMonth);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex gap-3 items-center flex-wrap">
          <select value={deptFilter} onChange={e => setDeptFilter(e.target.value)}
            className="h-9 px-3 rounded-md border border-input bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-ring/50">
            <option value="">كل الأقسام</option>
            {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
          <span className="text-sm text-muted-foreground">{doctors.length} طبيب</span>
        </div>
        <button onClick={() => setUploadOpen(true)}
          className="flex items-center gap-2 h-9 px-4 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 transition-colors">
          <Upload className="w-4 h-4" /> رفع جدول من ملف
        </button>
      </div>

      <div className="bg-card border rounded-xl overflow-hidden">
        <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 sticky top-0">
              <tr>
                <th className="text-right p-3 font-medium min-w-[150px] sticky right-0 bg-muted/50 z-10">الطبيب</th>
                <th className="text-right p-3 font-medium min-w-[60px]">القسم</th>
                {Array.from({ length: daysInMonth }, (_, i) => (
                  <th key={i} className="text-center p-1 font-medium min-w-[32px] text-xs">{i + 1}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading ? (
                <tr><td colSpan={daysInMonth + 2} className="p-8 text-center"><RefreshCw className="w-5 h-5 animate-spin mx-auto text-muted-foreground" /></td></tr>
              ) : doctors.map(d => (
                <DoctorScheduleRow key={d.id} doctor={d} month={selectedMonth} onSelect={() => onSelectDoctor(d.id)} />
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Upload Dialog */}
      {uploadOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50" onClick={() => setUploadOpen(false)} />
          <div className="relative bg-card rounded-xl border shadow-xl w-full max-w-lg p-6 space-y-4 z-10">
            <h2 className="text-lg font-bold">رفع جدول من ملف</h2>
            <div className="bg-muted/50 rounded-lg p-4 space-y-2 text-sm text-muted-foreground">
              <p className="font-medium text-foreground">التنسيقات المدعومة:</p>
              <p>• <strong>Excel (.xlsx, .xls)</strong> أو <strong>CSV (.csv)</strong></p>
              <p>• التنسيق الأول: عمود الرمز، عمود الاسم، أعمدة 1-31 (ص/م)</p>
              <p>• التنسيق الثاني: عمود الرمز، عمود الاسم، عمود التاريخ، عمود الوردية</p>
            </div>
            {!uploadResult ? (
              <>
                <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleUpload} className="hidden" />
                <button onClick={() => fileRef.current?.click()} disabled={uploading}
                  className="w-full h-12 border-2 border-dashed border-primary/30 rounded-lg flex items-center justify-center gap-3 text-primary hover:bg-primary/5 transition-colors disabled:opacity-50">
                  {uploading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <FileSpreadsheet className="w-5 h-5" />}
                  {uploading ? 'جاري الرفع...' : 'اختر ملف للرفع'}
                </button>
              </>
            ) : (
              <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 space-y-1 text-sm">
                <p className="font-medium text-green-800 dark:text-green-400">تم الاستيراد بنجاح!</p>
                <p>إجمالي الأطباء: {uploadResult.summary?.totalDoctors || 0}</p>
                <p>جداول جديدة: {uploadResult.summary?.createdSchedules || 0}</p>
                <p>جداول محدثة: {uploadResult.summary?.updatedSchedules || 0}</p>
                {uploadResult.summary?.errors?.length > 0 && (
                  <div className="mt-2 text-red-600 dark:text-red-400">
                    <p className="font-medium">أخطاء:</p>
                    {uploadResult.summary.errors.map((e: string, i: number) => <p key={i} className="text-xs">{e}</p>)}
                  </div>
                )}
              </div>
            )}
            <div className="flex gap-3 justify-end">
              {uploadResult && (
                <button onClick={() => { setUploadResult(null); if (fileRef.current) fileRef.current.value = ''; }}
                  className="h-9 px-4 rounded-md border text-sm font-medium hover:bg-accent">رفع ملف آخر</button>
              )}
              <button onClick={() => setUploadOpen(false)} className="h-9 px-4 rounded-md border text-sm font-medium hover:bg-accent">إغلاق</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Doctor schedule row - fetches schedule for one doctor
function DoctorScheduleRow({ doctor, month, onSelect }: { doctor: any; month: string; onSelect: () => void }) {
  const [scheduleDays, setScheduleDays] = useState<any[]>([]);
  const daysInMonth = getDaysInMonth(month);

  useEffect(() => {
    api.get(`/api/doctors/${doctor.id}/schedule?month=${month}`)
      .then(res => setScheduleDays(res.schedule?.scheduleDays || []))
      .catch(() => {});
  }, [doctor.id, month]);

  const scheduleMap = new Map<string, string>();
  scheduleDays.forEach((sd: any) => { scheduleMap.set(sd.date, sd.shift); });

  return (
    <tr className="hover:bg-muted/30 transition-colors">
      <td className="p-3 sticky right-0 bg-card z-10 border-l">
        <button onClick={onSelect} className="text-primary hover:underline font-medium text-right text-sm">{doctor.fullName}</button>
      </td>
      <td className="p-3 text-xs text-muted-foreground">{doctor.department?.name || '—'}</td>
      {Array.from({ length: daysInMonth }, (_, i) => {
        const dayNum = String(i + 1).padStart(2, '0');
        const dateStr = `${month}-${dayNum}`;
        const shift = scheduleMap.get(dateStr);
        return (
          <td key={i} className="p-1 text-center">
            {shift && (
              <span className={`inline-block w-6 h-6 rounded text-[10px] leading-6 font-medium ${shift === 'morning' ? 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400' : 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'}`}>
                {shift === 'morning' ? 'ص' : 'م'}
              </span>
            )}
          </td>
        );
      })}
    </tr>
  );
}

// ============================================================
// TODAY'S ATTENDANCE PAGE
// ============================================================
function TodayAttendancePage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'morning' | 'evening'>('morning');
  const [recordDialog, setRecordDialog] = useState<any>(null);
  const [editDialog, setEditDialog] = useState<any>(null);
  const [editForm, setEditForm] = useState({ status: '', checkInTime: '', checkOutTime: '', notes: '' });

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/attendance/today');
      setData(res);
    } catch {}
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const recordAttendance = async (entry: any) => {
    try {
      const shift = activeTab;
      const now = new Date().toISOString();
      if (entry.attendance) {
        // Check out
        await api.put(`/api/attendance/${entry.attendance.id}`, { checkOutTime: now, status: 'present' });
        toast.success('تم تسجيل الانصراف');
      } else {
        // Check in
        await api.post('/api/attendance', {
          doctorId: entry.doctorId,
          doctorName: entry.doctorName,
          departmentId: entry.departmentId || null,
          departmentName: entry.departmentName || null,
          date: data?.date || getTodayStr(),
          shift,
          checkInTime: now,
          status: 'present',
          isOfficialAttendance: true,
          scheduleDayId: entry.scheduleDayId,
        });
        toast.success('تم تسجيل الحضور');
      }
      load();
      setRecordDialog(null);
    } catch (err: any) { toast.error(err.message); }
  };

  const updateAttendance = async () => {
    if (!editDialog) return;
    try {
      await api.put(`/api/attendance/${editDialog.attendance.id}`, editForm);
      toast.success('تم تحديث سجل الحضور');
      setEditDialog(null);
      load();
    } catch (err: any) { toast.error(err.message); }
  };

  const openEdit = (entry: any) => {
    setEditForm({
      status: entry.attendance?.status || 'present',
      checkInTime: entry.attendance?.checkInTime || '',
      checkOutTime: entry.attendance?.checkOutTime || '',
      notes: entry.attendance?.notes || '',
    });
    setEditDialog(entry);
  };

  const entries = activeTab === 'morning' ? (data?.morning || []) : (data?.evening || []);
  const hasCheckin = (entry: any) => !!entry.attendance?.checkInTime;
  const hasCheckout = (entry: any) => !!entry.attendance?.checkOutTime;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-bold">{formatDateAr(data?.date || getTodayStr())}</h2>
          <button onClick={load} className="p-1.5 rounded-md hover:bg-accent transition-colors"><RefreshCw className="w-4 h-4 text-muted-foreground" /></button>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setActiveTab('morning')}
            className={`h-9 px-4 rounded-md text-sm font-medium transition-colors ${activeTab === 'morning' ? 'bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-400' : 'hover:bg-accent'}`}>
            وردية الصباح
          </button>
          <button onClick={() => setActiveTab('evening')}
            className={`h-9 px-4 rounded-md text-sm font-medium transition-colors ${activeTab === 'evening' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400' : 'hover:bg-accent'}`}>
            وردية المساء
          </button>
        </div>
      </div>

      <div className="bg-card border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-right p-3 font-medium">الطبيب</th>
                <th className="text-right p-3 font-medium hidden sm:table-cell">القسم</th>
                <th className="text-right p-3 font-medium">الوردية</th>
                <th className="text-right p-3 font-medium">وقت الحضور</th>
                <th className="text-right p-3 font-medium">وقت الانصراف</th>
                <th className="text-right p-3 font-medium">الحالة</th>
                <th className="text-right p-3 font-medium">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading ? (
                <tr><td colSpan={7} className="p-8 text-center"><RefreshCw className="w-5 h-5 animate-spin mx-auto text-muted-foreground" /></td></tr>
              ) : entries.length === 0 ? (
                <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">لا يوجد أطباء مجدولين في هذه الوردية</td></tr>
              ) : entries.map((e: any, i: number) => (
                <tr key={i} className="hover:bg-muted/30 transition-colors">
                  <td className="p-3 font-medium">{e.doctorName}</td>
                  <td className="p-3 hidden sm:table-cell text-muted-foreground">{e.departmentName || '—'}</td>
                  <td className="p-3"><ShiftBadge shift={activeTab} /></td>
                  <td className="p-3 text-xs">{formatTime(e.attendance?.checkInTime)}</td>
                  <td className="p-3 text-xs">{formatTime(e.attendance?.checkOutTime)}</td>
                  <td className="p-3"><StatusBadge status={e.attendance?.status || 'absent'} /></td>
                  <td className="p-3">
                    <div className="flex gap-1">
                      {!hasCheckout(e) && (
                        <button onClick={() => recordAttendance(e)}
                          className="p-1.5 rounded-md bg-green-50 hover:bg-green-100 dark:bg-green-900/20 dark:hover:bg-green-900/30 transition-colors"
                          title={hasCheckin(e) ? 'تسجيل الانصراف' : 'تسجيل الحضور'}>
                          {hasCheckin(e) ? <LogOut className="w-4 h-4 text-green-600" /> : <UserPlus className="w-4 h-4 text-green-600" />}
                        </button>
                      )}
                      {e.attendance && (
                        <button onClick={() => openEdit(e)} className="p-1.5 rounded-md hover:bg-accent transition-colors" title="تعديل">
                          <Pencil className="w-4 h-4 text-muted-foreground" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Dialog */}
      {editDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50" onClick={() => setEditDialog(null)} />
          <div className="relative bg-card rounded-xl border shadow-xl w-full max-w-md p-6 space-y-4 z-10">
            <h2 className="text-lg font-bold">تعديل سجل الحضور</h2>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium">الحالة</label>
                <select value={editForm.status} onChange={e => setEditForm(f => ({ ...f, status: e.target.value }))}
                  className="w-full h-9 px-3 mt-1 rounded-md border border-input bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-ring/50">
                  <option value="present">حاضر</option>
                  <option value="absent">غائب</option>
                  <option value="incomplete">غير مكتمل</option>
                  <option value="outside_schedule">خارج الجدول</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">ملاحظات</label>
                <textarea value={editForm.notes} onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))}
                  className="w-full px-3 py-2 mt-1 rounded-md border border-input bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-ring/50 min-h-[60px]" />
              </div>
            </div>
            <div className="flex gap-3 justify-end pt-2">
              <button onClick={() => setEditDialog(null)} className="h-9 px-4 rounded-md border text-sm font-medium hover:bg-accent">إلغاء</button>
              <button onClick={updateAttendance} className="h-9 px-4 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90">حفظ</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// MANUAL ATTENDANCE ENTRY
// ============================================================
function ManualAttendancePage() {
  const [doctors, setDoctors] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [form, setForm] = useState({ doctorId: '', date: getTodayStr(), shift: 'morning' as string, action: 'checkin' as string, notes: '' });
  const [saving, setSaving] = useState(false);
  const [todayEntries, setTodayEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [doctorSearch, setDoctorSearch] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    Promise.all([api.get('/api/doctors'), api.get('/api/departments'), api.get(`/api/attendance?date=${getTodayStr()}`)])
      .then(([dRes, deptRes, aRes]) => {
        setDoctors(dRes.doctors || []);
        setDepartments(deptRes.departments || []);
        setTodayEntries(aRes.records || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setShowDropdown(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const selectedDoctor = doctors.find(d => d.id === form.doctorId);
  const filteredDoctors = doctors.filter(d =>
    d.fullName.includes(doctorSearch) || d.code.includes(doctorSearch) || (d.department?.name || '').includes(doctorSearch)
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.doctorId) { toast.error('اختر الطبيب'); return; }

    // Check 9 AM restriction for morning check-in
    if (form.shift === 'morning' && form.action === 'checkin') {
      const now = new Date();
      if (now.getHours() >= 9) {
        toast.error('لا يمكن تسجيل الحضور الصباحي بعد الساعة 9 صباحاً');
        return;
      }
    }

    setSaving(true);
    try {
      const doc = doctors.find(d => d.id === form.doctorId);
      const now = new Date().toISOString();

      if (form.action === 'checkout') {
        // Find existing record for this doctor today
        const existing = todayEntries.find((e: any) =>
          e.doctorId === form.doctorId && e.shift === form.shift && e.checkInTime && !e.checkOutTime
        );
        if (existing) {
          await api.put(`/api/attendance/${existing.id}`, { checkOutTime: now });
          toast.success('تم تسجيل الانصراف');
        } else {
          toast.error('لم يتم العثور على سجل حضور لهذا الطبيب اليوم');
        }
      } else {
        // Check if already has check-in for today
        const existing = todayEntries.find((e: any) =>
          e.doctorId === form.doctorId && e.shift === form.shift && e.checkInTime
        );
        if (existing) {
          toast.error('هذا الطبيب مسجل حضور بالفعل في هذه الوردية');
          setSaving(false);
          return;
        }
        await api.post('/api/attendance', {
          doctorId: form.doctorId,
          doctorName: doc?.fullName || '',
          departmentId: doc?.departmentId || null,
          departmentName: doc?.department?.name || null,
          date: form.date,
          shift: form.shift,
          checkInTime: now,
          status: 'present',
          isOfficialAttendance: false,
          notes: form.notes,
        });
        toast.success('تم تسجيل الحضور');
      }
      setForm(f => ({ ...f, doctorId: '', doctorSearch: '', notes: '' }));
      const aRes = await api.get(`/api/attendance?date=${form.date}`);
      setTodayEntries(aRes.records || []);
    } catch (err: any) { toast.error(err.message); }
    finally { setSaving(false); }
  };

  // Group today entries by doctor+shift to show check-in/check-out in one row
  const groupedEntries = todayEntries.reduce((acc: any[], e: any) => {
    const key = `${e.doctorId}_${e.shift}`;
    const existing = acc.find(a => a.key === key);
    if (existing) {
      if (e.checkInTime && !existing.checkInTime) existing.checkInTime = e.checkInTime;
      if (e.checkOutTime && !existing.checkOutTime) existing.checkOutTime = e.checkOutTime;
      existing.status = e.status;
    } else {
      acc.push({ key, doctorId: e.doctorId, doctorName: e.doctorName, shift: e.shift, checkInTime: e.checkInTime, checkOutTime: e.checkOutTime, status: e.status, notes: e.notes });
    }
    return acc;
  }, []);

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="bg-card border rounded-xl p-6 space-y-4">
        <h2 className="font-bold text-lg">تسجيل حضور يدوي</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="sm:col-span-2 lg:col-span-1" ref={dropdownRef}>
            <label className="text-sm font-medium">الطبيب *</label>
            <div className="relative mt-1">
              <div className="relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  value={showDropdown ? doctorSearch : (selectedDoctor ? `${selectedDoctor.fullName} (${selectedDoctor.code})` : '')}
                  onChange={e => { setDoctorSearch(e.target.value); setShowDropdown(true); setForm(f => ({ ...f, doctorId: '' })); }}
                  onFocus={() => setShowDropdown(true)}
                  placeholder="ابحث بالاسم أو الرمز..."
                  className="w-full h-9 pr-9 pl-4 rounded-md border border-input bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-ring/50" />
              </div>
              {showDropdown && filteredDoctors.length > 0 && (
                <div className="absolute z-50 top-full mt-1 w-full bg-card border rounded-md shadow-lg max-h-48 overflow-y-auto">
                  {filteredDoctors.map(d => (
                    <button key={d.id} type="button"
                      onClick={() => { setForm(f => ({ ...f, doctorId: d.id })); setShowDropdown(false); setDoctorSearch(''); }}
                      className={`w-full text-right px-3 py-2 text-sm hover:bg-accent transition-colors ${!d.active ? 'opacity-50' : ''}`}>
                      {d.fullName} <span className="text-muted-foreground">({d.code})</span>
                      {d.department?.name && <span className="text-xs text-muted-foreground mr-2">- {d.department.name}</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div>
            <label className="text-sm font-medium">التاريخ</label>
            <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
              className="w-full h-9 px-3 mt-1 rounded-md border border-input bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-ring/50" />
          </div>
          <div>
            <label className="text-sm font-medium">الوردية</label>
            <select value={form.shift} onChange={e => setForm(f => ({ ...f, shift: e.target.value }))}
              className="w-full h-9 px-3 mt-1 rounded-md border border-input bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-ring/50">
              <option value="morning">صباحي</option>
              <option value="evening">مسائي</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-medium">النوع</label>
            <select value={form.action} onChange={e => setForm(f => ({ ...f, action: e.target.value }))}
              className="w-full h-9 px-3 mt-1 rounded-md border border-input bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-ring/50">
              <option value="checkin">حضور</option>
              <option value="checkout">انصراف</option>
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="text-sm font-medium">ملاحظات</label>
            <input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              className="w-full h-9 px-3 mt-1 rounded-md border border-input bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-ring/50" />
          </div>
        </div>
        <button type="submit" disabled={saving}
          className="flex items-center gap-2 h-9 px-4 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors">
          {saving && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
          {form.action === 'checkin' ? 'تسجيل الحضور' : 'تسجيل الانصراف'}
        </button>
        {form.shift === 'morning' && form.action === 'checkin' && new Date().getHours() >= 9 && (
          <p className="text-xs text-red-500">لا يمكن تسجيل الحضور الصباحي بعد الساعة 9 صباحاً</p>
        )}
      </form>

      <div className="bg-card border rounded-xl overflow-hidden">
        <div className="p-4 border-b"><h3 className="font-bold">سجلات اليوم</h3></div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-right p-3 font-medium">الطبيب</th>
                <th className="text-right p-3 font-medium">الوردية</th>
                <th className="text-right p-3 font-medium">وقت الحضور</th>
                <th className="text-right p-3 font-medium">وقت الانصراف</th>
                <th className="text-right p-3 font-medium">الحالة</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {groupedEntries.length === 0 ? (
                <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">لا توجد سجلات</td></tr>
              ) : groupedEntries.map((e: any) => (
                <tr key={e.key}>
                  <td className="p-3 font-medium">{e.doctorName}</td>
                  <td className="p-3"><ShiftBadge shift={e.shift} /></td>
                  <td className="p-3 text-xs">{formatTime(e.checkInTime)}</td>
                  <td className="p-3 text-xs">{formatTime(e.checkOutTime)}</td>
                  <td className="p-3"><StatusBadge status={e.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// CHANGE REQUESTS PAGE
// ============================================================
function ChangeRequestsPage() {
  const { selectedMonth } = useAppStore();
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('pending');
  const [actionDialog, setActionDialog] = useState<{ id: string; action: 'approved' | 'rejected' } | null>(null);
  const [managerNote, setManagerNote] = useState('');
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (tab !== 'all') params.set('status', tab);
      if (selectedMonth) params.set('month', selectedMonth);
      const res = await api.get(`/api/change-requests?${params.toString()}`);
      setRequests(res.changeRequests || []);
    } catch {}
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [tab, selectedMonth]);

  const handleAction = async () => {
    if (!actionDialog) return;
    setSaving(true);
    try {
      await api.put(`/api/change-requests/${actionDialog.id}`, {
        status: actionDialog.action,
        managerNote,
      });
      toast.success(actionDialog.action === 'approved' ? 'تم قبول الطلب' : 'تم رفض الطلب');
      setActionDialog(null);
      setManagerNote('');
      load();
    } catch (err: any) { toast.error(err.message); }
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap">
        {['pending', 'approved', 'rejected', 'all'].map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`h-8 px-3 rounded-md text-sm font-medium transition-colors ${tab === t ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'}`}>
            {{ pending: 'معلّق', approved: 'معتمد', rejected: 'مرفوض', all: 'الكل' }[t]}
          </button>
        ))}
      </div>

      <div className="bg-card border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-right p-3 font-medium">الطبيب</th>
                <th className="text-right p-3 font-medium hidden sm:table-cell">القسم</th>
                <th className="text-right p-3 font-medium">التاريخ الأصلي</th>
                <th className="text-right p-3 font-medium">التاريخ المطلوب</th>
                <th className="text-right p-3 font-medium hidden md:table-cell">السبب</th>
                <th className="text-right p-3 font-medium">الحالة</th>
                <th className="text-right p-3 font-medium">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading ? (
                <tr><td colSpan={7} className="p-8 text-center"><RefreshCw className="w-5 h-5 animate-spin mx-auto text-muted-foreground" /></td></tr>
              ) : requests.length === 0 ? (
                <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">لا توجد طلبات</td></tr>
              ) : requests.map(r => (
                <tr key={r.id} className="hover:bg-muted/30 transition-colors">
                  <td className="p-3 font-medium">{r.doctorName}</td>
                  <td className="p-3 hidden sm:table-cell text-muted-foreground">{r.departmentName || '—'}</td>
                  <td className="p-3 text-xs">{r.originalDate} <ShiftBadge shift={r.originalShift} /></td>
                  <td className="p-3 text-xs">{r.requestedDate} <ShiftBadge shift={r.requestedShift} /></td>
                  <td className="p-3 hidden md:table-cell text-xs text-muted-foreground max-w-[200px] truncate">{r.reason}</td>
                  <td className="p-3"><StatusBadge status={r.status} /></td>
                  <td className="p-3">
                    {r.status === 'pending' && (
                      <div className="flex gap-1">
                        <button onClick={() => setActionDialog({ id: r.id, action: 'approved' })}
                          className="p-1.5 rounded-md bg-green-50 hover:bg-green-100 dark:bg-green-900/20 dark:hover:bg-green-900/30 transition-colors" title="قبول">
                          <Check className="w-4 h-4 text-green-600" />
                        </button>
                        <button onClick={() => setActionDialog({ id: r.id, action: 'rejected' })}
                          className="p-1.5 rounded-md bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/30 transition-colors" title="رفض">
                          <X className="w-4 h-4 text-red-600" />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {actionDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50" onClick={() => setActionDialog(null)} />
          <div className="relative bg-card rounded-xl border shadow-xl w-full max-w-md p-6 space-y-4 z-10">
            <h2 className="text-lg font-bold">
              {actionDialog.action === 'approved' ? 'قبول طلب التغيير' : 'رفض طلب التغيير'}
            </h2>
            <div>
              <label className="text-sm font-medium">ملاحظة المدير</label>
              <textarea value={managerNote} onChange={e => setManagerNote(e.target.value)}
                className="w-full px-3 py-2 mt-1 rounded-md border border-input bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-ring/50 min-h-[80px]" />
            </div>
            <div className="flex gap-3 justify-end pt-2">
              <button onClick={() => setActionDialog(null)} className="h-9 px-4 rounded-md border text-sm font-medium hover:bg-accent">إلغاء</button>
              <button onClick={handleAction} disabled={saving}
                className={`h-9 px-4 rounded-md text-sm font-medium text-white disabled:opacity-50 flex items-center gap-2 ${actionDialog.action === 'approved' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}>
                {saving && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                {actionDialog.action === 'approved' ? 'قبول' : 'رفض'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// REPORTS PAGE
// ============================================================
function ReportsPage() {
  const { selectedMonth } = useAppStore();
  const [departments, setDepartments] = useState<any[]>([]);
  const [deptFilter, setDeptFilter] = useState('');
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get('/api/departments').then(res => setDepartments(res.departments || [])).catch(() => {});
  }, []);

  const generateReport = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ month: selectedMonth });
      if (deptFilter) params.set('departmentId', deptFilter);
      const res = await api.get(`/api/reports?${params.toString()}`);
      setReport(res);
    } catch (err: any) { toast.error(err.message); }
    finally { setLoading(false); }
  };

  const exportCSV = () => {
    window.open(`/api/reports?month=${selectedMonth}&format=csv${deptFilter ? `&departmentId=${deptFilter}` : ''}`, '_blank');
  };

  return (
    <div className="space-y-4">
      <div className="bg-card border rounded-xl p-6 space-y-4">
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-end">
          <div>
            <label className="text-sm font-medium">القسم</label>
            <select value={deptFilter} onChange={e => setDeptFilter(e.target.value)}
              className="w-full h-9 px-3 mt-1 rounded-md border border-input bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-ring/50">
              <option value="">كل الأقسام</option>
              {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
          <button onClick={generateReport} disabled={loading}
            className="flex items-center gap-2 h-9 px-4 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors">
            {loading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
            إنشاء التقرير
          </button>
        </div>
      </div>

      {report && (
        <>
          {/* Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-card border rounded-xl p-5">
              <p className="text-sm text-muted-foreground">إجمالي الأطباء</p>
              <p className="text-3xl font-bold mt-1">{report.summary?.totalDoctors || 0}</p>
            </div>
            <div className="bg-card border rounded-xl p-5">
              <p className="text-sm text-muted-foreground">متوسط نسبة الحضور</p>
              <p className="text-3xl font-bold mt-1 text-green-600">{report.summary?.averagePercentage || 0}%</p>
            </div>
            <div className="bg-card border rounded-xl p-5">
              <p className="text-sm text-muted-foreground">إجمالي أيام الحضور</p>
              <p className="text-3xl font-bold mt-1">{report.summary?.totalPresent || 0}</p>
            </div>
            <div className="bg-card border rounded-xl p-5">
              <p className="text-sm text-muted-foreground">إجمالي أيام الغياب</p>
              <p className="text-3xl font-bold mt-1 text-red-600">{report.summary?.totalAbsent || 0}</p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button onClick={exportCSV}
              className="flex items-center gap-2 h-9 px-4 border rounded-md text-sm font-medium hover:bg-accent transition-colors">
              <Download className="w-4 h-4" /> تصدير CSV
            </button>
            <button onClick={() => window.print()}
              className="flex items-center gap-2 h-9 px-4 border rounded-md text-sm font-medium hover:bg-accent transition-colors">
              <Printer className="w-4 h-4" /> طباعة
            </button>
          </div>

          {/* Table */}
          <div className="bg-card border rounded-xl overflow-hidden print:shadow-none">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-right p-3 font-medium">الطبيب</th>
                    <th className="text-right p-3 font-medium hidden sm:table-cell">الرمز</th>
                    <th className="text-right p-3 font-medium hidden md:table-cell">القسم</th>
                    <th className="text-right p-3 font-medium text-center">المطلوب</th>
                    <th className="text-right p-3 font-medium text-center">المجدول</th>
                    <th className="text-right p-3 font-medium text-center">الحضور</th>
                    <th className="text-right p-3 font-medium text-center">الغياب</th>
                    <th className="text-right p-3 font-medium text-center">النسبة</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {(report.doctors || []).map((d: any) => (
                    <tr key={d.doctorId} className="hover:bg-muted/30 transition-colors">
                      <td className="p-3 font-medium">{d.doctorName}</td>
                      <td className="p-3 hidden sm:table-cell font-mono text-xs">{d.doctorCode}</td>
                      <td className="p-3 hidden md:table-cell text-muted-foreground">{d.departmentName}</td>
                      <td className="p-3 text-center">{d.requiredDays}</td>
                      <td className="p-3 text-center">{d.scheduledDays}</td>
                      <td className="p-3 text-center text-green-600 font-medium">{d.presentDays}</td>
                      <td className="p-3 text-center text-red-600 font-medium">{d.absentDays}</td>
                      <td className="p-3 text-center">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${d.percentage >= 80 ? 'bg-green-100 text-green-800' : d.percentage >= 50 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}`}>
                          {d.percentage}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {!report && !loading && (
        <div className="text-center py-20 text-muted-foreground">
          <BarChart3 className="w-12 h-12 mx-auto mb-4 opacity-30" />
          <p>اختر الشهر واضغط &quot;إنشاء التقرير&quot;</p>
        </div>
      )}
    </div>
  );
}

// ============================================================
// USERS MANAGEMENT PAGE
// ============================================================
function UsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [roleFilter, setRoleFilter] = useState('');
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'worker' });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      const params = new URLSearchParams();
      if (roleFilter) params.set('role', roleFilter);
      const res = await api.get(`/api/users?${params.toString()}`);
      setUsers(res.users || []);
    } catch (err: any) { toast.error(err.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [roleFilter]);

  const handleAdd = async () => {
    if (!form.name || !form.email || !form.password) { toast.error('جميع الحقول مطلوبة'); return; }
    setSaving(true);
    try {
      await api.post('/api/users', form);
      toast.success('تم إنشاء المستخدم');
      setDialogOpen(false);
      setForm({ name: '', email: '', password: '', role: 'worker' });
      load();
    } catch (err: any) { toast.error(err.message); }
    finally { setSaving(false); }
  };

  const toggleActive = async (u: any) => {
    try {
      await api.put(`/api/users/${u.id}`, { active: !u.active });
      toast.success(u.active ? 'تم تعطيل المستخدم' : 'تم تفعيل المستخدم');
      load();
    } catch (err: any) { toast.error(err.message); }
  };

  const changeRole = async (u: any, newRole: string) => {
    try {
      await api.put(`/api/users/${u.id}`, { role: newRole });
      toast.success('تم تغيير الدور');
      load();
    } catch (err: any) { toast.error(err.message); }
  };

  const resetPassword = async (u: any) => {
    if (!confirm(`هل تريد إعادة تعيين كلمة مرور ${u.name}؟`)) return;
    try {
      await api.put(`/api/users/${u.id}`, {});
      toast.success('تم إعادة تعيين كلمة المرور');
    } catch (err: any) { toast.error(err.message); }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex gap-3 items-center">
          <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)}
            className="h-9 px-3 rounded-md border border-input bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-ring/50">
            <option value="">كل الأدوار</option>
            <option value="super_admin">مدير عام</option>
            <option value="manager">مدير</option>
            <option value="worker">موظف</option>
          </select>
          <span className="text-sm text-muted-foreground">{users.length} مستخدم</span>
        </div>
        <button onClick={() => setDialogOpen(true)}
          className="flex items-center gap-2 h-9 px-4 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 transition-colors">
          <Plus className="w-4 h-4" /> إضافة مستخدم
        </button>
      </div>

      <div className="bg-card border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-right p-3 font-medium">الاسم</th>
                <th className="text-right p-3 font-medium">البريد الإلكتروني</th>
                <th className="text-right p-3 font-medium">الدور</th>
                <th className="text-right p-3 font-medium">الحالة</th>
                <th className="text-right p-3 font-medium">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading ? (
                <tr><td colSpan={5} className="p-8 text-center"><RefreshCw className="w-5 h-5 animate-spin mx-auto text-muted-foreground" /></td></tr>
              ) : users.map(u => (
                <tr key={u.id} className="hover:bg-muted/30 transition-colors">
                  <td className="p-3 font-medium">{u.name}</td>
                  <td className="p-3 text-xs" dir="ltr">{u.email}</td>
                  <td className="p-3">
                    <select value={u.role} onChange={e => changeRole(u, e.target.value)}
                      className="h-7 px-2 rounded-md border border-input bg-transparent text-xs focus:outline-none focus:ring-1 focus:ring-ring/50">
                      <option value="super_admin">مدير عام</option>
                      <option value="manager">مدير</option>
                      <option value="worker">موظف</option>
                    </select>
                  </td>
                  <td className="p-3">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${u.active ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-600'}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${u.active ? 'bg-green-500' : 'bg-gray-400'}`} />
                      {u.active ? 'نشط' : 'معطّل'}
                    </span>
                  </td>
                  <td className="p-3">
                    <div className="flex gap-1">
                      <button onClick={() => toggleActive(u)} className="p-1.5 rounded-md hover:bg-accent transition-colors" title={u.active ? 'تعطيل' : 'تفعيل'}>
                        {u.active ? <EyeOff className="w-4 h-4 text-muted-foreground" /> : <Eye className="w-4 h-4 text-muted-foreground" />}
                      </button>
                      <button onClick={() => resetPassword(u)} className="p-1.5 rounded-md hover:bg-accent transition-colors" title="إعادة تعيين كلمة المرور">
                        <Shield className="w-4 h-4 text-muted-foreground" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {dialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50" onClick={() => setDialogOpen(false)} />
          <div className="relative bg-card rounded-xl border shadow-xl w-full max-w-md p-6 space-y-4 z-10">
            <h2 className="text-lg font-bold">إضافة مستخدم جديد</h2>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium">الاسم *</label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full h-9 px-3 mt-1 rounded-md border border-input bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-ring/50" />
              </div>
              <div>
                <label className="text-sm font-medium">البريد الإلكتروني *</label>
                <input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} dir="ltr"
                  className="w-full h-9 px-3 mt-1 rounded-md border border-input bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-ring/50" />
              </div>
              <div>
                <label className="text-sm font-medium">كلمة المرور *</label>
                <input type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  className="w-full h-9 px-3 mt-1 rounded-md border border-input bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-ring/50" />
              </div>
              <div>
                <label className="text-sm font-medium">الدور</label>
                <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
                  className="w-full h-9 px-3 mt-1 rounded-md border border-input bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-ring/50">
                  <option value="worker">موظف</option>
                  <option value="manager">مدير</option>
                  <option value="super_admin">مدير عام</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 justify-end pt-2">
              <button onClick={() => setDialogOpen(false)} className="h-9 px-4 rounded-md border text-sm font-medium hover:bg-accent">إلغاء</button>
              <button onClick={handleAdd} disabled={saving}
                className="h-9 px-4 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2">
                {saving && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                إضافة
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// ACCOUNT SETTINGS PAGE
// ============================================================
function AccountSettingsPage() {
  const { user, updateUser, logout } = useAppStore();
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!oldPassword || !newPassword || !confirmPassword) { toast.error('جميع الحقول مطلوبة'); return; }
    if (newPassword !== confirmPassword) { toast.error('كلمة المرور غير متطابقة'); return; }
    if (newPassword.length < 6) { toast.error('كلمة المرور يجب أن تكون 6 أحرف على الأقل'); return; }
    setSaving(true);
    try {
      await api.post('/api/auth', { action: 'change-password', oldPassword, newPassword });
      toast.success('تم تغيير كلمة المرور بنجاح');
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) { toast.error(err.message); }
    finally { setSaving(false); }
  };

  return (
    <div className="max-w-2xl space-y-6">
      {/* User Info */}
      <div className="bg-card border rounded-xl p-6">
        <h2 className="font-bold text-lg mb-4">معلومات الحساب</h2>
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 bg-primary/10 rounded-xl flex items-center justify-center">
            <Stethoscope className="w-8 h-8 text-primary" />
          </div>
          <div>
            <h3 className="text-xl font-bold">{user?.name}</h3>
            <p className="text-sm text-muted-foreground" dir="ltr">{user?.email}</p>
            <RoleBadge role={user?.role || ''} />
          </div>
        </div>
      </div>

      {/* Change Password */}
      <form onSubmit={handleChangePassword} className="bg-card border rounded-xl p-6 space-y-4">
        <h2 className="font-bold text-lg">تغيير كلمة المرور</h2>
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium">كلمة المرور الحالية</label>
            <div className="relative mt-1">
              <input type={showOld ? 'text' : 'password'} value={oldPassword} onChange={e => setOldPassword(e.target.value)}
                className="w-full h-9 px-3 pl-9 rounded-md border border-input bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-ring/50" />
              <button type="button" onClick={() => setShowOld(!showOld)} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                {showOld ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium">كلمة المرور الجديدة</label>
            <div className="relative mt-1">
              <input type={showNew ? 'text' : 'password'} value={newPassword} onChange={e => setNewPassword(e.target.value)}
                className="w-full h-9 px-3 pl-9 rounded-md border border-input bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-ring/50" />
              <button type="button" onClick={() => setShowNew(!showNew)} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium">تأكيد كلمة المرور الجديدة</label>
            <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
              className="w-full h-9 px-3 mt-1 rounded-md border border-input bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-ring/50" />
          </div>
        </div>
        <button type="submit" disabled={saving}
          className="flex items-center gap-2 h-9 px-4 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors">
          {saving && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
          تغيير كلمة المرور
        </button>
      </form>
    </div>
  );
}

// ============================================================
// MAIN PAGE (SPA Router)
// ============================================================
export default function Home() {
  const { user, currentPage, setCurrentPage, setSelectedDoctor, selectedDoctorId, token } = useAppStore();
  const hydrated = useRef(false);
  const [ready, setReady] = useState(false);

  // Hydrate from persisted state
  useEffect(() => {
    if (hydrated.current) return;
    hydrated.current = true;

    // If user exists but no token (old session data), force logout
    if (user && !token) {
      useAppStore.getState().logout();
      setReady(true);
      return;
    }

    // Run seed only once on app initialization (creates default users if not exist)
    fetch('/api/auth/seed', { method: 'POST' }).catch(() => {});

    // Check if session is still valid
    if (user && token) {
      api.get('/api/auth')
        .then(data => {
          if (data.user) {
            setCurrentPage(currentPage === 'login' ? 'dashboard' : currentPage);
          } else {
            useAppStore.getState().logout();
          }
        })
        .catch(() => {
          useAppStore.getState().logout();
        })
        .finally(() => setReady(true));
    } else {
      // No user in state, show login immediately
      setReady(true);
    }
  }, []);

  const handleLogin = (userData: any, authToken: string) => {
    useAppStore.getState().login(userData, authToken);
  };

  const handleNavigate = (page: string) => {
    setCurrentPage(page);
  };

  const handleSelectDoctor = (id: string) => {
    setSelectedDoctor(id);
  };

  // Wait for hydration
  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-teal-50 via-white to-emerald-50 dark:from-gray-950 dark:via-gray-900 dark:to-teal-950">
        <RefreshCw className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Not authenticated
  if (!user) {
    return <LoginView onLogin={handleLogin} />;
  }

  // Must change password
  if (user.mustChangePassword) {
    return <ChangePasswordView />;
  }

  // Render current page
  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <DashboardPage onNavigate={handleNavigate} />;
      case 'doctors':
        return <DoctorsPage onNavigate={handleNavigate} onSelectDoctor={handleSelectDoctor} />;
      case 'doctor-detail':
        return selectedDoctorId ? <DoctorDetailPage doctorId={selectedDoctorId} /> : <DoctorsPage onNavigate={handleNavigate} onSelectDoctor={handleSelectDoctor} />;
      case 'departments':
        return <DepartmentsPage />;
      case 'monthly-schedule':
        return <MonthlySchedulePage onSelectDoctor={handleSelectDoctor} />;
      case 'today-attendance':
        return <TodayAttendancePage />;
      case 'manual-attendance':
        return <ManualAttendancePage />;
      case 'change-requests':
        return <ChangeRequestsPage />;
      case 'reports':
        return <ReportsPage />;
      case 'users':
        return <UsersPage />;
      case 'account-settings':
        return <AccountSettingsPage />;
      default:
        return <DashboardPage onNavigate={handleNavigate} />;
    }
  };

  return (
    <div className="min-h-screen flex bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col min-h-screen min-w-0">
        <Header />
        <main className="flex-1 p-4 lg:p-6 overflow-auto">
          {renderPage()}
        </main>
      </div>
    </div>
  );
}
