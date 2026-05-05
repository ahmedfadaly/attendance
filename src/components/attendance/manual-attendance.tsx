'use client';

import { useState } from 'react';
import { useAppStore } from '@/lib/store';
import { ShiftType } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { LogIn, LogOut, Clock } from 'lucide-react';

export function ManualAttendance() {
  const currentUser = useAppStore(s => s.currentUser);
  const doctors = useAppStore(s => s.doctors);
  const departments = useAppStore(s => s.departments);
  const attendanceRecords = useAppStore(s => s.attendanceRecords);
  const checkIn = useAppStore(s => s.checkIn);
  const checkOut = useAppStore(s => s.checkOut);
  const monthlySchedules = useAppStore(s => s.monthlySchedules);
  const scheduleDays = useAppStore(s => s.scheduleDays);

  const [selectedDoctor, setSelectedDoctor] = useState('');
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [selectedShift, setSelectedShift] = useState<ShiftType>('morning');
  const [lastRecordId, setLastRecordId] = useState<string | null>(null);

  const activeDoctors = doctors.filter(d => d.active);
  const doctorData = doctors.find(d => d.doctorId === selectedDoctor);

  const existingRecord = attendanceRecords.find(
    ar => ar.doctorId === selectedDoctor && ar.date === selectedDate && ar.shift === selectedShift
  );

  const findScheduleDay = () => {
    if (!selectedDoctor || !selectedDate) return null;
    const month = selectedDate.substring(0, 7);
    const schedule = monthlySchedules.find(ms => ms.doctorId === selectedDoctor && ms.month === month);
    if (!schedule) return null;
    return scheduleDays.find(
      sd => sd.scheduleId === schedule.scheduleId && sd.date === selectedDate && sd.shift === selectedShift && sd.status === 'scheduled'
    );
  };

  const handleCheckIn = () => {
    if (!currentUser || !selectedDoctor || !selectedDate) {
      toast.error('يرجى ملء جميع الحقول المطلوبة');
      return;
    }

    if (existingRecord) {
      toast.error('يوجد سجل حضور لهذا الطبيب في نفس اليوم والشيفت');
      return;
    }

    const sd = findScheduleDay();
    const result = checkIn(
      selectedDoctor, selectedDate, selectedShift,
      doctorData?.departmentId || '', doctorData?.departmentName || '',
      sd?.scheduleDayId || null,
      currentUser.uid, currentUser.role
    );

    if (result) {
      setLastRecordId(result.attendanceId);
      toast.success('تم تسجيل الحضور بنجاح');
    } else {
      toast.error('فشل تسجيل الحضور');
    }
  };

  const handleCheckOut = () => {
    if (!existingRecord) {
      toast.error('لم يتم تسجيل حضور بعد');
      return;
    }
    checkOut(existingRecord.attendanceId);
    setLastRecordId(null);
    toast.success('تم تسجيل الانصراف بنجاح');
  };

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock className="h-5 w-5 text-teal-600" />
            تسجيل حضور يدوي
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>اختر الطبيب</Label>
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

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>التاريخ</Label>
              <Input
                type="date"
                value={selectedDate}
                onChange={e => setSelectedDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>الشيفت</Label>
              <Select value={selectedShift} onValueChange={(v: ShiftType) => setSelectedShift(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="morning">صباحي</SelectItem>
                  <SelectItem value="evening">مسائي</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Status */}
          {existingRecord && (
            <div className="p-3 rounded-lg bg-muted/50">
              <p className="text-sm font-medium">
                {existingRecord.status === 'present' ? '✅ تم التسجيل الكامل (حضور + انصراف)' :
                  existingRecord.status === 'incomplete' ? '⏳ تم تسجيل الحضور - بانتظار الانصراف' : ''}
              </p>
              {existingRecord.checkInTime && (
                <p className="text-xs text-muted-foreground mt-1">
                  وقت الحضور: {new Date(existingRecord.checkInTime).toLocaleTimeString('ar-EG')}
                </p>
              )}
              {existingRecord.checkOutTime && (
                <p className="text-xs text-muted-foreground">
                  وقت الانصراف: {new Date(existingRecord.checkOutTime).toLocaleTimeString('ar-EG')}
                </p>
              )}
            </div>
          )}

          <div className="flex gap-3">
            {!existingRecord ? (
              <Button
                onClick={handleCheckIn}
                className="bg-green-600 hover:bg-green-700 text-white gap-2 flex-1"
                disabled={!selectedDoctor}
              >
                <LogIn className="h-4 w-4" />
                تسجيل حضور
              </Button>
            ) : existingRecord.status === 'incomplete' ? (
              <Button
                onClick={handleCheckOut}
                className="bg-red-600 hover:bg-red-700 text-white gap-2 flex-1"
              >
                <LogOut className="h-4 w-4" />
                تسجيل انصراف
              </Button>
            ) : (
              <div className="flex-1 text-center py-2 text-green-600 font-medium">
                ✅ تم اكتمال التسجيل
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
