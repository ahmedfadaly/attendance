'use client';

import { useState, useMemo } from 'react';
import { useAppStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import {
  ArrowRight, Edit, Phone, Mail, Building2, Calendar, UserCheck, UserX, AlertTriangle,
  Clock, CheckCircle2, XCircle, ArrowLeftRight
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { format, getDay } from 'date-fns';
import { ar } from 'date-fns/locale';

const ARABIC_DAYS = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

const SHIFT_LABELS = { morning: 'صباحي', evening: 'مسائي' };
const STATUS_COLORS: Record<string, string> = {
  present: 'bg-green-100 text-green-700 border-green-300',
  absent: 'bg-red-100 text-red-700 border-red-300',
  incomplete: 'bg-amber-100 text-amber-700 border-amber-300',
  outside_schedule: 'bg-orange-100 text-orange-700 border-orange-300',
  scheduled: 'bg-teal-100 text-teal-700 border-teal-300',
  changed_from: 'bg-purple-100 text-purple-700 border-purple-300',
  changed_to: 'bg-blue-100 text-blue-700 border-blue-300',
};
const STATUS_LABELS: Record<string, string> = {
  present: 'حاضر',
  absent: 'غائب',
  incomplete: 'ناقص',
  outside_schedule: 'خارج الجدول',
  scheduled: 'مجدول',
  changed_from: 'تم تغييره',
  changed_to: 'يوم بديل',
};

interface DoctorDetailProps {
  doctorId: string;
  onBack: () => void;
}

export function DoctorDetail({ doctorId, onBack }: DoctorDetailProps) {
  const doctor = useAppStore(s => s.doctors.find(d => d.doctorId === doctorId));
  const departments = useAppStore(s => s.departments);
  const scheduleDays = useAppStore(s => s.scheduleDays);
  const attendanceRecords = useAppStore(s => s.attendanceRecords);
  const changeRequests = useAppStore(s => s.changeRequests);
  const monthlySchedules = useAppStore(s => s.monthlySchedules);
  const navigateTo = useAppStore(s => s.navigateTo);

  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  const doctorSchedule = useMemo(() => {
    const sch = monthlySchedules.find(
      ms => ms.doctorId === doctorId && ms.month === selectedMonth
    );
    if (!sch) return [];
    return scheduleDays.filter(sd => sd.scheduleId === sch.scheduleId);
  }, [doctorId, selectedMonth, monthlySchedules, scheduleDays]);

  const doctorAttendance = useMemo(() => {
    return attendanceRecords.filter(
      ar => ar.doctorId === doctorId && ar.date.startsWith(selectedMonth)
    );
  }, [doctorId, selectedMonth, attendanceRecords]);

  const doctorChangeRequests = useMemo(() => {
    return changeRequests.filter(
      cr => cr.doctorId === doctorId && cr.month === selectedMonth
    );
  }, [doctorId, selectedMonth, changeRequests]);

  const summaryStats = useMemo(() => {
    const present = doctorAttendance.filter(ar => ar.status === 'present').length;
    const incomplete = doctorAttendance.filter(ar => ar.status === 'incomplete').length;
    const outside = doctorAttendance.filter(ar => ar.status === 'outside_schedule' || !ar.isOfficialAttendance).length;
    const scheduledDays = doctorSchedule.filter(sd => sd.status === 'scheduled').length;
    const changedFrom = doctorSchedule.filter(sd => sd.status === 'changed_from').length;
    const absent = scheduledDays - doctorAttendance.filter(ar =>
      ar.isOfficialAttendance && ar.status === 'present'
    ).length;

    return { present, incomplete, outside, scheduledDays, changedFrom, absent: Math.max(0, absent) };
  }, [doctorAttendance, doctorSchedule]);

  if (!doctor) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">لم يتم العثور على الطبيب</p>
        <Button variant="outline" onClick={onBack} className="mt-4 gap-2">
          <ArrowRight className="h-4 w-4" />
          العودة
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Button variant="ghost" onClick={onBack} className="gap-2 mb-2">
        <ArrowRight className="h-4 w-4" />
        العودة لقائمة الأطباء
      </Button>

      {/* Doctor Info Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row gap-6">
              <div className="flex flex-col items-center gap-2">
                <div className="w-32 h-32 bg-teal-50 rounded-xl flex items-center justify-center border-2 border-teal-200">
                  <QRCodeSVG value={doctor.doctorId} size={110} />
                </div>
                <Badge variant="outline" className="font-mono text-xs">{doctor.code}</Badge>
              </div>
              <div className="flex-1 space-y-3">
                <div>
                  <h2 className="text-2xl font-bold">{doctor.fullName}</h2>
                  <Badge className={doctor.active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>
                    {doctor.active ? 'نشط' : 'غير نشط'}
                  </Badge>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Building2 className="h-4 w-4" />
                    <span>{doctor.departmentName}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Phone className="h-4 w-4" />
                    <span dir="ltr">{doctor.phone}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Mail className="h-4 w-4" />
                    <span dir="ltr">{doctor.email || 'غير محدد'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>الأيام المطلوبة: {doctor.requiredDaysPerMonth}</span>
                  </div>
                </div>
                <Button
                  variant="outline"
                  onClick={() => navigateTo('doctor-edit')}
                  className="gap-2 mt-2"
                >
                  <Edit className="h-4 w-4" />
                  تعديل البيانات
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Summary Stats */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">ملخص الشهر</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <span>حضور</span>
              </div>
              <Badge className="bg-green-100 text-green-700">{summaryStats.present}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm">
                <XCircle className="h-4 w-4 text-red-600" />
                <span>غياب</span>
              </div>
              <Badge className="bg-red-100 text-red-700">{summaryStats.absent}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-amber-600" />
                <span>ناقص</span>
              </div>
              <Badge className="bg-amber-100 text-amber-700">{summaryStats.incomplete}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm">
                <AlertTriangle className="h-4 w-4 text-orange-600" />
                <span>خارج الجدول</span>
              </div>
              <Badge className="bg-orange-100 text-orange-700">{summaryStats.outside}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm">
                <ArrowLeftRight className="h-4 w-4 text-purple-600" />
                <span>أيام بديلة</span>
              </div>
              <Badge className="bg-purple-100 text-purple-700">{summaryStats.changedFrom}</Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Month selector */}
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium">الشهر:</span>
        <Input
          type="month"
          value={selectedMonth}
          onChange={e => setSelectedMonth(e.target.value)}
          className="w-48"
        />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="schedule" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="schedule">الجدول الشهري</TabsTrigger>
          <TabsTrigger value="attendance">سجل الحضور</TabsTrigger>
          <TabsTrigger value="changes">طلبات التغيير</TabsTrigger>
        </TabsList>

        <TabsContent value="schedule">
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto max-h-96">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-right">التاريخ</TableHead>
                      <TableHead className="text-right">اليوم</TableHead>
                      <TableHead className="text-right">الشيفت</TableHead>
                      <TableHead className="text-right">القسم</TableHead>
                      <TableHead className="text-right">الحالة</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {doctorSchedule.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                          لا يوجد جدول لهذا الشهر
                        </TableCell>
                      </TableRow>
                    ) : (
                      doctorSchedule.sort((a, b) => a.date.localeCompare(b.date)).map(sd => {
                        const dateObj = new Date(sd.date);
                        const dayName = ARABIC_DAYS[getDay(dateObj)];
                        return (
                          <TableRow key={sd.scheduleDayId}>
                            <TableCell>{sd.date}</TableCell>
                            <TableCell>{dayName}</TableCell>
                            <TableCell>
                              <Badge variant="outline">{SHIFT_LABELS[sd.shift]}</Badge>
                            </TableCell>
                            <TableCell>{sd.departmentName}</TableCell>
                            <TableCell>
                              <Badge className={STATUS_COLORS[sd.status] || ''}>
                                {STATUS_LABELS[sd.status] || sd.status}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="attendance">
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto max-h-96">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-right">التاريخ</TableHead>
                      <TableHead className="text-right">الشيفت</TableHead>
                      <TableHead className="text-right">وقت الحضور</TableHead>
                      <TableHead className="text-right">وقت الانصراف</TableHead>
                      <TableHead className="text-right">الحالة</TableHead>
                      <TableHead className="text-right">رسمي</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {doctorAttendance.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          لا يوجد سجلات حضور لهذا الشهر
                        </TableCell>
                      </TableRow>
                    ) : (
                      doctorAttendance.sort((a, b) => b.date.localeCompare(a.date)).map(ar => (
                        <TableRow key={ar.attendanceId}>
                          <TableCell>{ar.date}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{SHIFT_LABELS[ar.shift]}</Badge>
                          </TableCell>
                          <TableCell className="text-sm" dir="ltr">
                            {ar.checkInTime ? new Date(ar.checkInTime).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }) : '-'}
                          </TableCell>
                          <TableCell className="text-sm" dir="ltr">
                            {ar.checkOutTime ? new Date(ar.checkOutTime).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }) : '-'}
                          </TableCell>
                          <TableCell>
                            <Badge className={STATUS_COLORS[ar.status] || ''}>
                              {STATUS_LABELS[ar.status] || ar.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {ar.isOfficialAttendance ? (
                              <Badge className="bg-green-100 text-green-700">نعم</Badge>
                            ) : (
                              <Badge className="bg-gray-100 text-gray-700">لا</Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="changes">
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto max-h-96">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-right">التاريخ الأصلي</TableHead>
                      <TableHead className="text-right">التاريخ الجديد</TableHead>
                      <TableHead className="text-right">السبب</TableHead>
                      <TableHead className="text-right">الحالة</TableHead>
                      <TableHead className="text-right">ملاحظة المدير</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {doctorChangeRequests.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                          لا يوجد طلبات تغيير لهذا الشهر
                        </TableCell>
                      </TableRow>
                    ) : (
                      doctorChangeRequests.map(cr => (
                        <TableRow key={cr.requestId}>
                          <TableCell>
                            {cr.originalDate} ({SHIFT_LABELS[cr.originalShift]})
                          </TableCell>
                          <TableCell>
                            {cr.requestedDate} ({SHIFT_LABELS[cr.requestedShift]})
                          </TableCell>
                          <TableCell className="max-w-[200px] truncate">{cr.reason}</TableCell>
                          <TableCell>
                            <Badge className={
                              cr.status === 'approved' ? 'bg-green-100 text-green-700' :
                              cr.status === 'rejected' ? 'bg-red-100 text-red-700' :
                              'bg-amber-100 text-amber-700'
                            }>
                              {cr.status === 'approved' ? 'مقبول' : cr.status === 'rejected' ? 'مرفوض' : 'معلق'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm">{cr.managerNote || '-'}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
