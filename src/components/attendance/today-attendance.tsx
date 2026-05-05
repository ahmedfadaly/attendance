'use client';

import { useState, useMemo, useCallback } from 'react';
import { useAppStore } from '@/lib/store';
import { ShiftType, ScheduleDay, AttendanceRecord } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import {
  Search, UserCheck, UserX, LogIn, LogOut, Clock, AlertTriangle,
  CheckCircle2, XCircle, Calendar, Filter
} from 'lucide-react';

const SHIFT_LABELS: Record<ShiftType, string> = { morning: 'صباحي', evening: 'مسائي' };
const ARABIC_DAYS = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

function getAttendanceBadge(status: string) {
  switch (status) {
    case 'present':
      return <Badge className="bg-green-100 text-green-700 border-green-300">حضر وانصرف</Badge>;
    case 'incomplete':
      return <Badge className="bg-amber-100 text-amber-700 border-amber-300">حضر ولم ينصرف</Badge>;
    case 'not_attended':
      return <Badge className="bg-gray-100 text-gray-500 border-gray-300">لم يحضر</Badge>;
    case 'outside_schedule':
      return <Badge className="bg-orange-100 text-orange-700 border-orange-300">خارج الجدول</Badge>;
    case 'changed_day':
      return <Badge className="bg-blue-100 text-blue-700 border-blue-300">يوم بديل</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

interface DoctorAttendanceRow {
  doctorId: string;
  doctorName: string;
  code: string;
  departmentId: string;
  departmentName: string;
  scheduleDayId: string | null;
  attendanceId: string | null;
  checkInTime: string | null;
  checkOutTime: string | null;
  status: 'present' | 'incomplete' | 'not_attended' | 'outside_schedule' | 'changed_day';
  shift: ShiftType;
}

export function TodayAttendance() {
  const currentUser = useAppStore(s => s.currentUser);
  const doctors = useAppStore(s => s.doctors);
  const scheduleDays = useAppStore(s => s.scheduleDays);
  const attendanceRecords = useAppStore(s => s.attendanceRecords);
  const monthlySchedules = useAppStore(s => s.monthlySchedules);
  const departments = useAppStore(s => s.departments);
  const checkIn = useAppStore(s => s.checkIn);
  const checkOut = useAppStore(s => s.checkOut);
  const deleteAttendance = useAppStore(s => s.deleteAttendance);

  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [selectedShift, setSelectedShift] = useState<ShiftType>('morning');
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('all');
  const [undoId, setUndoId] = useState<string | null>(null);

  const activeDepartments = departments.filter(d => d.active);

  const attendanceRows = useMemo(() => {
    const rows: DoctorAttendanceRow[] = [];
    const todayMonth = selectedDate.substring(0, 7);

    // Get scheduled doctors for this date and shift
    const activeDoctors = doctors.filter(d => d.active);
    for (const doctor of activeDoctors) {
      // Find schedule day
      const schedule = monthlySchedules.find(ms => ms.doctorId === doctor.doctorId && ms.month === todayMonth);
      if (schedule) {
        const sDay = scheduleDays.find(
          sd => sd.scheduleId === schedule.scheduleId && sd.date === selectedDate && sd.shift === selectedShift
        );
        if (sDay) {
          // Check if changed_from
          if (sDay.status === 'changed_from') {
            rows.push({
              doctorId: doctor.doctorId,
              doctorName: doctor.fullName,
              code: doctor.code,
              departmentId: doctor.departmentId,
              departmentName: doctor.departmentName,
              scheduleDayId: sDay.scheduleDayId,
              attendanceId: null,
              checkInTime: null,
              checkOutTime: null,
              status: 'changed_day',
              shift: selectedShift,
            });
            continue;
          }

          // Find attendance record
          const attRecord = attendanceRecords.find(
            ar => ar.doctorId === doctor.doctorId && ar.date === selectedDate && ar.shift === selectedShift
          );

          rows.push({
            doctorId: doctor.doctorId,
            doctorName: doctor.fullName,
            code: doctor.code,
            departmentId: doctor.departmentId,
            departmentName: doctor.departmentName,
            scheduleDayId: sDay.scheduleDayId,
            attendanceId: attRecord?.attendanceId || null,
            checkInTime: attRecord?.checkInTime || null,
            checkOutTime: attRecord?.checkOutTime || null,
            status: attRecord?.status || 'not_attended',
            shift: selectedShift,
          });
          continue;
        }
      }

      // Check for outside schedule attendance
      const outsideAtt = attendanceRecords.find(
        ar => ar.doctorId === doctor.doctorId && ar.date === selectedDate && ar.shift === selectedShift && !ar.isOfficialAttendance
      );
      if (outsideAtt) {
        rows.push({
          doctorId: doctor.doctorId,
          doctorName: outsideAtt.doctorName,
          code: doctor.code,
          departmentId: doctor.departmentId,
          departmentName: doctor.departmentName,
          scheduleDayId: null,
          attendanceId: outsideAtt.attendanceId,
          checkInTime: outsideAtt.checkInTime,
          checkOutTime: outsideAtt.checkOutTime,
          status: 'outside_schedule',
          shift: selectedShift,
        });
      }
    }

    // Also find doctors with attendance but no schedule at all
    for (const ar of attendanceRecords) {
      if (ar.date === selectedDate && ar.shift === selectedShift) {
        const exists = rows.some(r => r.attendanceId === ar.attendanceId);
        if (!exists) {
          rows.push({
            doctorId: ar.doctorId,
            doctorName: ar.doctorName,
            code: '',
            departmentId: ar.departmentId,
            departmentName: ar.departmentName,
            scheduleDayId: null,
            attendanceId: ar.attendanceId,
            checkInTime: ar.checkInTime,
            checkOutTime: ar.checkOutTime,
            status: 'outside_schedule',
            shift: selectedShift,
          });
        }
      }
    }

    return rows;
  }, [doctors, scheduleDays, attendanceRecords, monthlySchedules, selectedDate, selectedShift]);

  const filteredRows = useMemo(() => {
    return attendanceRows.filter(row => {
      const matchSearch = !search || row.doctorName.includes(search) || row.code.includes(search);
      const matchDept = deptFilter === 'all' || row.departmentId === deptFilter;
      return matchSearch && matchDept;
    });
  }, [attendanceRows, search, deptFilter]);

  const summaryStats = useMemo(() => {
    const scheduled = attendanceRows.filter(r => r.status !== 'outside_schedule' && r.status !== 'changed_day');
    return {
      total: attendanceRows.length,
      present: attendanceRows.filter(r => r.status === 'present').length,
      incomplete: attendanceRows.filter(r => r.status === 'incomplete').length,
      absent: scheduled.filter(r => r.status === 'not_attended').length,
      outside: attendanceRows.filter(r => r.status === 'outside_schedule').length,
      changed: attendanceRows.filter(r => r.status === 'changed_day').length,
    };
  }, [attendanceRows]);

  const handleCheckIn = useCallback((row: DoctorAttendanceRow) => {
    if (!currentUser) return;
    const result = checkIn(
      row.doctorId, selectedDate, selectedShift,
      row.departmentId, row.departmentName,
      row.scheduleDayId, currentUser.uid, currentUser.role
    );
    if (result) {
      toast.success(`تم تسجيل حضور ${row.doctorName}`);
    } else {
      toast.error('يوجد سجل حضور لهذا الطبيب في نفس اليوم والشيفت');
    }
  }, [currentUser, checkIn, selectedDate, selectedShift]);

  const handleCheckOut = useCallback((row: DoctorAttendanceRow) => {
    if (!row.attendanceId) return;
    checkOut(row.attendanceId);
    toast.success(`تم تسجيل انصراف ${row.doctorName}`);
  }, [checkOut]);

  const handleUndo = useCallback(() => {
    if (undoId) {
      deleteAttendance(undoId);
      toast.success('تم حذف سجل الحضور');
      setUndoId(null);
    }
  }, [undoId, deleteAttendance]);

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
        <Card className="p-3">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-teal-600" />
            <div>
              <p className="text-xs text-muted-foreground">الإجمالي</p>
              <p className="text-xl font-bold">{summaryStats.total}</p>
            </div>
          </div>
        </Card>
        <Card className="p-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <div>
              <p className="text-xs text-muted-foreground">حاضر</p>
              <p className="text-xl font-bold text-green-600">{summaryStats.present}</p>
            </div>
          </div>
        </Card>
        <Card className="p-3">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-amber-600" />
            <div>
              <p className="text-xs text-muted-foreground">ناقص</p>
              <p className="text-xl font-bold text-amber-600">{summaryStats.incomplete}</p>
            </div>
          </div>
        </Card>
        <Card className="p-3">
          <div className="flex items-center gap-2">
            <XCircle className="h-4 w-4 text-red-600" />
            <div>
              <p className="text-xs text-muted-foreground">غائب</p>
              <p className="text-xl font-bold text-red-600">{summaryStats.absent}</p>
            </div>
          </div>
        </Card>
        <Card className="p-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-orange-600" />
            <div>
              <p className="text-xs text-muted-foreground">خارج الجدول</p>
              <p className="text-xl font-bold text-orange-600">{summaryStats.outside}</p>
            </div>
          </div>
        </Card>
        <Card className="p-3">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-blue-600" />
            <div>
              <p className="text-xs text-muted-foreground">يوم بديل</p>
              <p className="text-xl font-bold text-blue-600">{summaryStats.changed}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3 items-end">
            <div className="space-y-1">
              <Label className="text-sm">التاريخ</Label>
              <Input
                type="date"
                value={selectedDate}
                onChange={e => setSelectedDate(e.target.value)}
                className="w-44"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-sm">الشيفت</Label>
              <Select value={selectedShift} onValueChange={(v: ShiftType) => setSelectedShift(v)}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="morning">صباحي</SelectItem>
                  <SelectItem value="evening">مسائي</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="بحث بالاسم أو الكود..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pr-10"
              />
            </div>
            <Select value={deptFilter} onValueChange={setDeptFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="القسم" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع الأقسام</SelectItem>
                {activeDepartments.map(d => (
                  <SelectItem key={d.departmentId} value={d.departmentId}>{d.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Attendance Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto max-h-[500px]">
            <Table>
              <TableHeader className="sticky top-0 bg-card z-10">
                <TableRow>
                  <TableHead className="text-right w-10">#</TableHead>
                  <TableHead className="text-right">اسم الطبيب</TableHead>
                  <TableHead className="text-right">الكود</TableHead>
                  <TableHead className="text-right">القسم</TableHead>
                  <TableHead className="text-right">الحالة</TableHead>
                  <TableHead className="text-right">وقت الحضور</TableHead>
                  <TableHead className="text-right">وقت الانصراف</TableHead>
                  <TableHead className="text-center">إجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                      لا يوجد أطباء مجدولين في هذا اليوم والشيفت
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredRows.map((row, idx) => {
                    const dayOfWeek = new Date(selectedDate).getDay();
                    return (
                      <TableRow
                        key={row.doctorId}
                        className={
                          row.status === 'not_attended' ? 'bg-red-50/50' :
                          row.status === 'present' ? 'bg-green-50/50' :
                          row.status === 'incomplete' ? 'bg-amber-50/50' :
                          ''
                        }
                      >
                        <TableCell className="text-muted-foreground">{idx + 1}</TableCell>
                        <TableCell className="font-medium">{row.doctorName}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="font-mono text-xs">{row.code}</Badge>
                        </TableCell>
                        <TableCell className="text-sm">{row.departmentName}</TableCell>
                        <TableCell>{getAttendanceBadge(row.status)}</TableCell>
                        <TableCell className="text-sm" dir="ltr">
                          {row.checkInTime ? new Date(row.checkInTime).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '-'}
                        </TableCell>
                        <TableCell className="text-sm" dir="ltr">
                          {row.checkOutTime ? new Date(row.checkOutTime).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '-'}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-center gap-1">
                            {row.status === 'not_attended' && (
                              <Button
                                size="sm"
                                onClick={() => handleCheckIn(row)}
                                className="bg-green-600 hover:bg-green-700 text-white h-9 gap-1"
                              >
                                <LogIn className="h-3.5 w-3.5" />
                                تسجيل حضور
                              </Button>
                            )}
                            {row.status === 'incomplete' && (
                              <Button
                                size="sm"
                                onClick={() => handleCheckOut(row)}
                                className="bg-red-600 hover:bg-red-700 text-white h-9 gap-1"
                              >
                                <LogOut className="h-3.5 w-3.5" />
                                تسجيل انصراف
                              </Button>
                            )}
                            {row.status === 'outside_schedule' && row.attendanceId && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setUndoId(row.attendanceId)}
                                className="text-red-500 h-9"
                              >
                                حذف
                              </Button>
                            )}
                            {row.status === 'present' && row.attendanceId && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setUndoId(row.attendanceId)}
                                className="text-red-500 h-9"
                              >
                                حذف
                              </Button>
                            )}
                          </div>
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

      <div className="text-sm text-muted-foreground">
        عدد النتائج: {filteredRows.length}
      </div>

      {/* Delete Attendance Dialog */}
      <AlertDialog open={!!undoId} onOpenChange={() => setUndoId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد حذف سجل الحضور</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من حذف هذا السجل؟ لا يمكن التراجع عن هذا الإجراء.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={handleUndo} className="bg-red-600 hover:bg-red-700 text-white">
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
