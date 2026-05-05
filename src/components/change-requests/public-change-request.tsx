'use client';

import { useState, useMemo } from 'react';
import { useAppStore } from '@/lib/store';
import { ShiftType } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { Send, CheckCircle } from 'lucide-react';

export function PublicChangeRequest() {
  const doctors = useAppStore(s => s.doctors);
  const departments = useAppStore(s => s.departments);
  const createChangeRequest = useAppStore(s => s.createChangeRequest);
  const monthlySchedules = useAppStore(s => s.monthlySchedules);
  const scheduleDays = useAppStore(s => s.scheduleDays);
  const navigateTo = useAppStore(s => s.navigateTo);

  const activeDoctors = doctors.filter(d => d.active);
  const activeDepartments = departments.filter(d => d.active);

  const [selectedDoctor, setSelectedDoctor] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [originalDate, setOriginalDate] = useState('');
  const [originalShift, setOriginalShift] = useState<ShiftType>('morning');
  const [requestedDate, setRequestedDate] = useState('');
  const [requestedShift, setRequestedShift] = useState<ShiftType>('morning');
  const [reason, setReason] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const doctorData = useMemo(() => {
    return doctors.find(d => d.doctorId === selectedDoctor);
  }, [doctors, selectedDoctor]);

  const availableOriginalDates = useMemo(() => {
    if (!selectedDoctor || !selectedMonth) return [];
    const schedule = monthlySchedules.find(
      ms => ms.doctorId === selectedDoctor && ms.month === selectedMonth
    );
    if (!schedule) return [];
    return scheduleDays.filter(
      sd => sd.scheduleId === schedule.scheduleId && sd.status === 'scheduled'
    );
  }, [selectedDoctor, selectedMonth, monthlySchedules, scheduleDays]);

  const filteredOriginalDates = useMemo(() => {
    return availableOriginalDates.filter(sd => sd.shift === originalShift);
  }, [availableOriginalDates, originalShift]);

  const handleDoctorSelect = (doctorId: string) => {
    setSelectedDoctor(doctorId);
    setOriginalDate('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedDoctor || !originalDate || !requestedDate || !reason.trim() || !contactPhone.trim()) {
      toast.error('يرجى ملء جميع الحقول المطلوبة');
      return;
    }

    setSubmitting(true);
    setTimeout(() => {
      const result = createChangeRequest({
        doctorId: selectedDoctor,
        doctorName: doctorData?.fullName || '',
        departmentId: doctorData?.departmentId || '',
        departmentName: doctorData?.departmentName || '',
        month: selectedMonth,
        originalDate,
        originalShift,
        requestedDate,
        requestedShift,
        reason: reason.trim(),
        contactPhone: contactPhone.trim(),
      });

      if (result) {
        setSubmitted(true);
        toast.success('تم إرسال طلبك بنجاح');
      } else {
        toast.error('فشل إرسال الطلب. تأكد أن اليوم الأصلي موجود في الجدول ولا يوجد طلب معلق.');
      }
      setSubmitting(false);
    }, 300);
  };

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-teal-50 via-white to-emerald-50 p-4">
        <Card className="w-full max-w-md shadow-xl border-teal-100">
          <CardContent className="p-8 text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <h2 className="text-xl font-bold text-teal-800 mb-2">تم إرسال طلبك بنجاح</h2>
            <p className="text-muted-foreground mb-4">
              طلبك في انتظار موافقة المدير. سيتم إبلاغك بالنتيجة.
            </p>
            <div className="flex gap-3 justify-center">
              <Button variant="outline" onClick={() => navigateTo('login')} className="gap-2">
                تسجيل الدخول
              </Button>
              <Button
                onClick={() => { setSubmitted(false); setOriginalDate(''); setRequestedDate(''); setReason(''); }}
                className="bg-teal-600 hover:bg-teal-700 text-white gap-2"
              >
                إرسال طلب آخر
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-teal-50 via-white to-emerald-50 p-4">
      <Card className="w-full max-w-lg shadow-xl border-teal-100">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 relative mb-2">
            <img
              src="/logo.png"
              alt="شعار المستشفى"
              className="w-full h-full object-contain rounded-full"
            />
          </div>
          <CardTitle className="text-xl text-teal-800">طلب تغيير يوم الحضور</CardTitle>
          <CardDescription className="text-teal-600">
            يمكنك طلب تغيير يوم الحضور دون الحاجة لتسجيل الدخول
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>اسم الطبيب *</Label>
              <Select value={selectedDoctor} onValueChange={handleDoctorSelect}>
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

            <div className="space-y-2">
              <Label>الشهر *</Label>
              <Input
                type="month"
                value={selectedMonth}
                onChange={e => setSelectedMonth(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>اليوم الأصلي *</Label>
                <Select value={originalShift} onValueChange={(v: ShiftType) => { setOriginalShift(v); setOriginalDate(''); }}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="morning">صباحي</SelectItem>
                    <SelectItem value="evening">مسائي</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>التاريخ الأصلي *</Label>
                <Select value={originalDate} onValueChange={setOriginalDate} disabled={!originalShift}>
                  <SelectTrigger>
                    <SelectValue placeholder={filteredOriginalDates.length === 0 ? 'لا يوجد أيام' : 'اختر التاريخ'} />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredOriginalDates.map(sd => (
                      <SelectItem key={sd.scheduleDayId} value={sd.date}>
                        {sd.date}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>اليوم الجديد - الشيفت *</Label>
                <Select value={requestedShift} onValueChange={(v: ShiftType) => setRequestedShift(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="morning">صباحي</SelectItem>
                    <SelectItem value="evening">مسائي</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>التاريخ الجديد *</Label>
                <Input
                  type="date"
                  value={requestedDate}
                  onChange={e => setRequestedDate(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>سبب التغيير *</Label>
              <Textarea
                value={reason}
                onChange={e => setReason(e.target.value)}
                placeholder="اكتب سبب التغيير..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>رقم الهاتف للتواصل *</Label>
              <Input
                value={contactPhone}
                onChange={e => setContactPhone(e.target.value)}
                placeholder="05XXXXXXXX"
                dir="ltr"
                className="text-left"
              />
            </div>

            <Button
              type="submit"
              className="w-full bg-teal-600 hover:bg-teal-700 text-white gap-2 h-11"
              disabled={submitting}
            >
              <Send className="h-4 w-4" />
              {submitting ? 'جارِ الإرسال...' : 'إرسال الطلب'}
            </Button>
          </form>

          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={() => navigateTo('login')}
              className="text-sm text-teal-600 hover:text-teal-800 hover:underline"
            >
              العودة لتسجيل الدخول
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
