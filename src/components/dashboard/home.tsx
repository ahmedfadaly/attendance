'use client';

import { useMemo } from 'react';
import { useAppStore } from '@/lib/store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Stethoscope, Building2, UserCheck, UserX, ArrowLeftRight,
  AlertTriangle, CalendarDays, ClipboardCheck, UserPlus, FileBarChart
} from 'lucide-react';

function StatCard({ title, value, icon, color, onClick }: {
  title: string; value: number; icon: React.ReactNode; color: string; onClick?: () => void;
}) {
  return (
    <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={onClick}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <div className={`p-2 rounded-lg ${color}`}>{icon}</div>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold">{value}</div>
      </CardContent>
    </Card>
  );
}

export function DashboardHome() {
  const currentUser = useAppStore(s => s.currentUser);
  const navigateTo = useAppStore(s => s.navigateTo);
  const doctors = useAppStore(s => s.doctors);
  const departments = useAppStore(s => s.departments);
  const attendanceRecords = useAppStore(s => s.attendanceRecords);
  const changeRequests = useAppStore(s => s.changeRequests);

  const today = new Date().toISOString().split('T')[0];

  const stats = useMemo(() => {
    const todayRecords = attendanceRecords.filter(ar => ar.date === today);
    const presentToday = todayRecords.filter(ar => ar.status === 'present');
    const absentDoctors = doctors.filter(d => {
      if (!d.active) return false;
      const hasRecord = todayRecords.some(ar => ar.doctorId === d.doctorId);
      return !hasRecord;
    });
    const pendingRequests = changeRequests.filter(cr => cr.status === 'pending');
    const outsideSchedule = todayRecords.filter(ar => !ar.isOfficialAttendance);
    const approvedRequests = changeRequests.filter(cr => cr.status === 'approved');
    const rejectedRequests = changeRequests.filter(cr => cr.status === 'rejected');

    return {
      totalDoctors: doctors.filter(d => d.active).length,
      totalDepartments: departments.filter(d => d.active).length,
      presentToday: presentToday.length,
      absentToday: absentDoctors.length,
      pendingRequests: pendingRequests.length,
      outsideSchedule: outsideSchedule.length,
      approvedRequests,
      rejectedRequests,
      pendingRequestsList: pendingRequests,
    };
  }, [doctors, departments, attendanceRecords, changeRequests, today]);

  if (currentUser?.role === 'super_admin') {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <StatCard title="عدد الأطباء" value={stats.totalDoctors} icon={<Stethoscope className="h-4 w-4 text-teal-700" />} color="bg-teal-100" onClick={() => navigateTo('doctors')} />
          <StatCard title="عدد الأقسام" value={stats.totalDepartments} icon={<Building2 className="h-4 w-4 text-emerald-700" />} color="bg-emerald-100" onClick={() => navigateTo('departments')} />
          <StatCard title="حضور اليوم" value={stats.presentToday} icon={<UserCheck className="h-4 w-4 text-green-700" />} color="bg-green-100" onClick={() => navigateTo('today-attendance')} />
          <StatCard title="غياب اليوم" value={stats.absentToday} icon={<UserX className="h-4 w-4 text-red-700" />} color="bg-red-100" onClick={() => navigateTo('today-attendance')} />
          <StatCard title="طلبات تغيير معلقة" value={stats.pendingRequests} icon={<ArrowLeftRight className="h-4 w-4 text-amber-700" />} color="bg-amber-100" onClick={() => navigateTo('change-requests')} />
          <StatCard title="خارج الجدول" value={stats.outsideSchedule} icon={<AlertTriangle className="h-4 w-4 text-orange-700" />} color="bg-orange-100" onClick={() => navigateTo('today-attendance')} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigateTo('today-attendance')}>
            <CardContent className="flex items-center gap-4 p-6">
              <div className="p-3 rounded-xl bg-teal-100">
                <ClipboardCheck className="h-6 w-6 text-teal-700" />
              </div>
              <div>
                <h3 className="font-semibold">تحضير اليوم</h3>
                <p className="text-sm text-muted-foreground">تسجيل حضور وانصراف الأطباء</p>
              </div>
            </CardContent>
          </Card>
          <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigateTo('reports')}>
            <CardContent className="flex items-center gap-4 p-6">
              <div className="p-3 rounded-xl bg-emerald-100">
                <FileBarChart className="h-6 w-6 text-emerald-700" />
              </div>
              <div>
                <h3 className="font-semibold">التقارير الشهرية</h3>
                <p className="text-sm text-muted-foreground">عرض وتصدير التقارير</p>
              </div>
            </CardContent>
          </Card>
          <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigateTo('schedules')}>
            <CardContent className="flex items-center gap-4 p-6">
              <div className="p-3 rounded-xl bg-green-100">
                <CalendarDays className="h-6 w-6 text-green-700" />
              </div>
              <div>
                <h3 className="font-semibold">إدارة الجداول</h3>
                <p className="text-sm text-muted-foreground">إنشاء وتعديل الجداول الشهرية</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (currentUser?.role === 'manager') {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard title="طلبات التغيير المعلقة" value={stats.pendingRequests} icon={<ArrowLeftRight className="h-4 w-4 text-amber-700" />} color="bg-amber-100" onClick={() => navigateTo('change-requests')} />
          <StatCard title="طلبات مقبولة" value={stats.approvedRequests.length} icon={<UserCheck className="h-4 w-4 text-green-700" />} color="bg-green-100" onClick={() => navigateTo('change-requests')} />
          <StatCard title="طلبات مرفوضة" value={stats.rejectedRequests.length} icon={<UserX className="h-4 w-4 text-red-700" />} color="bg-red-100" onClick={() => navigateTo('change-requests')} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigateTo('change-requests')}>
            <CardContent className="flex items-center gap-4 p-6">
              <div className="p-3 rounded-xl bg-amber-100">
                <ArrowLeftRight className="h-6 w-6 text-amber-700" />
              </div>
              <div>
                <h3 className="font-semibold">مراجعة طلبات التغيير</h3>
                <p className="text-sm text-muted-foreground">قاعة طلبات تغيير الأيام بانتظار المراجعة</p>
              </div>
            </CardContent>
          </Card>
          <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigateTo('reports')}>
            <CardContent className="flex items-center gap-4 p-6">
              <div className="p-3 rounded-xl bg-teal-100">
                <FileBarChart className="h-6 w-6 text-teal-700" />
              </div>
              <div>
                <h3 className="font-semibold">التقارير الشهرية</h3>
                <p className="text-sm text-muted-foreground">عرض وتصدير التقارير</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent pending requests */}
        {stats.pendingRequestsList.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">آخر الطلبات المعلقة</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {stats.pendingRequestsList.slice(0, 5).map(cr => (
                  <div key={cr.requestId} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div>
                      <p className="font-medium text-sm">{cr.doctorName}</p>
                      <p className="text-xs text-muted-foreground">
                        من: {cr.originalDate} ← إلى: {cr.requestedDate} | {cr.departmentName}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50">
                      معلق
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  // Worker
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <StatCard title="تحضير اليوم" value={stats.presentToday} icon={<ClipboardCheck className="h-4 w-4 text-teal-700" />} color="bg-teal-100" onClick={() => navigateTo('today-attendance')} />
        <StatCard title="عدد الأطباء" value={stats.totalDoctors} icon={<Stethoscope className="h-4 w-4 text-emerald-700" />} color="bg-emerald-100" onClick={() => navigateTo('doctors')} />
        <StatCard title="عدد الأقسام" value={stats.totalDepartments} icon={<Building2 className="h-4 w-4 text-green-700" />} color="bg-green-100" onClick={() => navigateTo('departments')} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigateTo('today-attendance')}>
          <CardContent className="flex items-center gap-4 p-6">
            <div className="p-3 rounded-xl bg-teal-100">
              <ClipboardCheck className="h-6 w-6 text-teal-700" />
            </div>
            <div>
              <h3 className="font-semibold">تحضير اليوم</h3>
              <p className="text-sm text-muted-foreground">تسجيل حضور وانصراف الأطباء</p>
            </div>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigateTo('doctor-add')}>
          <CardContent className="flex items-center gap-4 p-6">
            <div className="p-3 rounded-xl bg-emerald-100">
              <UserPlus className="h-6 w-6 text-emerald-700" />
            </div>
            <div>
              <h3 className="font-semibold">إضافة طبيب جديد</h3>
              <p className="text-sm text-muted-foreground">تسجيل طبيب امتياز جديد</p>
            </div>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigateTo('reports')}>
          <CardContent className="flex items-center gap-4 p-6">
            <div className="p-3 rounded-xl bg-green-100">
              <FileBarChart className="h-6 w-6 text-green-700" />
            </div>
            <div>
              <h3 className="font-semibold">التقارير الشهرية</h3>
              <p className="text-sm text-muted-foreground">عرض التقارير</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
