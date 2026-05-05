'use client';

import { useState, useMemo } from 'react';
import { useAppStore } from '@/lib/store';
import { ShiftType, ScheduleDay } from '@/lib/types';
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
import { Plus, Trash2, Save, CalendarDays } from 'lucide-react';

export function ScheduleManager() {
  const doctors = useAppStore(s => s.doctors);
  const departments = useAppStore(s => s.departments);
  const createSchedule = useAppStore(s => s.createSchedule);
  const deleteScheduleDay = useAppStore(s => s.deleteScheduleDay);
  const getScheduleForDoctor = useAppStore(s => s.getScheduleForDoctor);
  const monthlySchedules = useAppStore(s => s.monthlySchedules);

  const [selectedDoctor, setSelectedDoctor] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  // New schedule form
  const [isCreating, setIsCreating] = useState(false);
  const [newDays, setNewDays] = useState<Array<{ date: string; shift: ShiftType; departmentId: string }>>([]);
  const [newDayCount, setNewDayCount] = useState('12');
  const [defaultDept, setDefaultDept] = useState('');

  // Delete
  const [deleteDayId, setDeleteDayId] = useState<string | null>(null);

  const activeDoctors = doctors.filter(d => d.active);
  const activeDepartments = departments.filter(d => d.active);

  const currentSchedule = useMemo(() => {
    if (!selectedDoctor || !selectedMonth) return [];
    return getScheduleForDoctor(selectedDoctor, selectedMonth);
  }, [selectedDoctor, selectedMonth, getScheduleForDoctor]);

  const existingSchedule = useMemo(() => {
    return monthlySchedules.find(
      ms => ms.doctorId === selectedDoctor && ms.month === selectedMonth
    );
  }, [monthlySchedules, selectedDoctor, selectedMonth]);

  const doctorData = doctors.find(d => d.doctorId === selectedDoctor);

  const handleStartCreate = () => {
    if (!selectedDoctor) {
      toast.error('يرجى اختيار طبيب أولاً');
      return;
    }
    if (!defaultDept) {
      toast.error('يرجى اختيار القسم الافتراضي');
      return;
    }
    if (existingSchedule) {
      toast.error('يوجد جدول بالفعل لهذا الطبيب في هذا الشهر');
      return;
    }

    const days = [];
    const year = parseInt(selectedMonth.split('-')[0]);
    const month = parseInt(selectedMonth.split('-')[1]);
    let d = 1;
    const count = parseInt(newDayCount) || 12;

    while (days.length < count && d <= 31) {
      const dateObj = new Date(year, month - 1, d);
      if (dateObj.getMonth() === month - 1 && dateObj.getDay() !== 5) {
        days.push({
          date: `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
          shift: (days.length % 2 === 0 ? 'evening' : 'morning') as ShiftType,
          departmentId: defaultDept,
        });
      }
      d++;
    }

    setNewDays(days);
    setIsCreating(true);
  };

  const handleSaveSchedule = () => {
    if (!selectedDoctor || !selectedMonth) return;

    // Check for duplicates
    const duplicateCheck = newDays.filter(
      (d, i) => newDays.findIndex(nd => nd.date === d.date && nd.shift === d.shift) !== i
    );
    if (duplicateCheck.length > 0) {
      toast.error('يوجد أيام مكررة في الجدول');
      return;
    }

    const dept = departments.find(d => d.departmentId === defaultDept);
    if (!dept) return;

    const scheduleDaysData = newDays.map(day => {
      const dayDept = departments.find(d => d.departmentId === day.departmentId);
      return {
        doctorId: selectedDoctor,
        date: day.date,
        shift: day.shift,
        departmentId: day.departmentId,
        departmentName: dayDept?.name || '',
        status: 'scheduled' as const,
        isCounted: true,
        changeRequestId: null,
        notes: '',
      };
    });

    createSchedule(selectedDoctor, selectedMonth, scheduleDaysData);
    toast.success('تم إنشاء الجدول بنجاح');
    setIsCreating(false);
    setNewDays([]);
  };

  const handleDeleteDay = () => {
    if (deleteDayId) {
      deleteScheduleDay(deleteDayId);
      toast.success('تم حذف اليوم من الجدول');
      setDeleteDayId(null);
    }
  };

  const updateNewDay = (index: number, field: string, value: string) => {
    setNewDays(prev => prev.map((d, i) => i === index ? { ...d, [field]: value } : d));
  };

  const SHIFT_LABELS = { morning: 'صباحي', evening: 'مسائي' };
  const ARABIC_DAYS = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3 items-end">
            <div className="flex-1 space-y-1">
              <Label className="text-sm">اختر الطبيب</Label>
              <Select value={selectedDoctor} onValueChange={setSelectedDoctor}>
                <SelectTrigger>
                  <SelectValue placeholder="اختر طبيب" />
                </SelectTrigger>
                <SelectContent>
                  {activeDoctors.map(d => (
                    <SelectItem key={d.doctorId} value={d.doctorId}>
                      {d.fullName} ({d.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-sm">الشهر</Label>
              <Input
                type="month"
                value={selectedMonth}
                onChange={e => setSelectedMonth(e.target.value)}
                className="w-48"
              />
            </div>
            {!existingSchedule && selectedDoctor && (
              <div className="flex gap-2">
                <div className="space-y-1">
                  <Label className="text-sm">عدد الأيام</Label>
                  <Input
                    type="number"
                    min="1"
                    max="31"
                    value={newDayCount}
                    onChange={e => setNewDayCount(e.target.value)}
                    className="w-24"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-sm">القسم الافتراضي</Label>
                  <Select value={defaultDept} onValueChange={setDefaultDept}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="القسم" />
                    </SelectTrigger>
                    <SelectContent>
                      {activeDepartments.map(d => (
                        <SelectItem key={d.departmentId} value={d.departmentId}>{d.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  onClick={handleStartCreate}
                  className="bg-teal-600 hover:bg-teal-700 text-white gap-2 mt-auto"
                >
                  <CalendarDays className="h-4 w-4" />
                  إنشاء جدول
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Creating Schedule */}
      {isCreating && newDays.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">تعديل الجدول قبل الحفظ</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto max-h-96">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">#</TableHead>
                    <TableHead className="text-right">التاريخ</TableHead>
                    <TableHead className="text-right">اليوم</TableHead>
                    <TableHead className="text-right">الشيفت</TableHead>
                    <TableHead className="text-right">القسم</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {newDays.map((day, i) => {
                    const dateObj = new Date(day.date);
                    return (
                      <TableRow key={i}>
                        <TableCell>{i + 1}</TableCell>
                        <TableCell className="font-mono text-sm">{day.date}</TableCell>
                        <TableCell className="text-sm">{ARABIC_DAYS[dateObj.getDay()]}</TableCell>
                        <TableCell>
                          <Select
                            value={day.shift}
                            onValueChange={v => updateNewDay(i, 'shift', v)}
                          >
                            <SelectTrigger className="w-28">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="morning">صباحي</SelectItem>
                              <SelectItem value="evening">مسائي</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Select
                            value={day.departmentId}
                            onValueChange={v => updateNewDay(i, 'departmentId', v)}
                          >
                            <SelectTrigger className="w-36">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {activeDepartments.map(d => (
                                <SelectItem key={d.departmentId} value={d.departmentId}>{d.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
          <div className="flex gap-2 p-4 justify-end">
            <Button variant="outline" onClick={() => { setIsCreating(false); setNewDays([]); }}>
              إلغاء
            </Button>
            <Button onClick={handleSaveSchedule} className="bg-teal-600 hover:bg-teal-700 text-white gap-2">
              <Save className="h-4 w-4" />
              حفظ الجدول ({newDays.length} يوم)
            </Button>
          </div>
        </Card>
      )}

      {/* Existing Schedule */}
      {currentSchedule.length > 0 && !isCreating && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <CalendarDays className="h-5 w-5" />
              جدول {doctorData?.fullName || ''} - {selectedMonth}
              <Badge variant="outline" className="mr-2">{currentSchedule.length} يوم</Badge>
            </CardTitle>
          </CardHeader>
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
                    <TableHead className="text-center">إجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currentSchedule.sort((a, b) => a.date.localeCompare(b.date)).map(sd => {
                    const dateObj = new Date(sd.date);
                    return (
                      <TableRow key={sd.scheduleDayId}>
                        <TableCell className="font-mono text-sm">{sd.date}</TableCell>
                        <TableCell className="text-sm">{ARABIC_DAYS[dateObj.getDay()]}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{SHIFT_LABELS[sd.shift]}</Badge>
                        </TableCell>
                        <TableCell>{sd.departmentName}</TableCell>
                        <TableCell>
                          <Badge className={
                            sd.status === 'scheduled' ? 'bg-teal-100 text-teal-700' :
                            sd.status === 'changed_from' ? 'bg-purple-100 text-purple-700' :
                            'bg-blue-100 text-blue-700'
                          }>
                            {sd.status === 'scheduled' ? 'مجدول' : sd.status === 'changed_from' ? 'تم تغييره' : 'يوم بديل'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          {sd.status === 'scheduled' && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => setDeleteDayId(sd.scheduleDayId)}
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {!currentSchedule.length && !isCreating && selectedDoctor && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <CalendarDays className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>لا يوجد جدول لهذا الطبيب في هذا الشهر</p>
            <p className="text-sm mt-1">اختر القسم الافتراضي وانقر &quot;إنشاء جدول&quot;</p>
          </CardContent>
        </Card>
      )}

      {/* Delete Dialog */}
      <AlertDialog open={!!deleteDayId} onOpenChange={() => setDeleteDayId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد الحذف</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من حذف هذا اليوم من الجدول؟
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteDay} className="bg-red-600 hover:bg-red-700 text-white">
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
