'use client';

import { useState, useEffect } from 'react';
import { useAppStore } from '@/lib/store';
import { Doctor } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { ArrowRight, Save } from 'lucide-react';

interface DoctorFormProps {
  doctor: Doctor | null;
  onBack: () => void;
}

export function DoctorForm({ doctor, onBack }: DoctorFormProps) {
  const addDoctor = useAppStore(s => s.addDoctor);
  const updateDoctor = useAppStore(s => s.updateDoctor);
  const doctors = useAppStore(s => s.doctors);
  const departments = useAppStore(s => s.departments);
  const navigateTo = useAppStore(s => s.navigateTo);

  const [fullName, setFullName] = useState('');
  const [code, setCode] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [requiredDays, setRequiredDays] = useState('12');
  const [saving, setSaving] = useState(false);

  const activeDepartments = departments.filter(d => d.active);
  const isEditing = !!doctor;

  useEffect(() => {
    if (doctor) {
      setFullName(doctor.fullName);
      setCode(doctor.code);
      setPhone(doctor.phone);
      setEmail(doctor.email);
      setDepartmentId(doctor.departmentId);
      setRequiredDays(String(doctor.requiredDaysPerMonth));
    }
  }, [doctor]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!fullName.trim()) {
      toast.error('يرجى إدخال اسم الطبيب');
      return;
    }
    if (!code.trim()) {
      toast.error('يرجى إدخال كود الطبيب');
      return;
    }
    if (!departmentId) {
      toast.error('يرجى اختيار القسم');
      return;
    }

    // Check unique code
    const existing = doctors.find(d => d.code === code.trim() && d.doctorId !== doctor?.doctorId);
    if (existing) {
      toast.error('الكود مستخدم بالفعل، يرجى اختيار كود آخر');
      return;
    }

    const dept = departments.find(d => d.departmentId === departmentId);
    if (!dept) return;

    setSaving(true);
    setTimeout(() => {
      try {
        if (isEditing && doctor) {
          updateDoctor(doctor.doctorId, {
            fullName: fullName.trim(),
            code: code.trim(),
            phone: phone.trim(),
            email: email.trim(),
            departmentId,
            departmentName: dept.name,
            requiredDaysPerMonth: parseInt(requiredDays) || 12,
          });
          toast.success('تم تعديل بيانات الطبيب بنجاح');
        } else {
          addDoctor({
            fullName: fullName.trim(),
            code: code.trim(),
            phone: phone.trim(),
            email: email.trim(),
            departmentId,
            departmentName: dept.name,
            active: true,
            requiredDaysPerMonth: parseInt(requiredDays) || 12,
          });
          toast.success('تم إضافة الطبيب بنجاح');
        }
        onBack();
      } catch {
        toast.error('حدث خطأ أثناء الحفظ');
      } finally {
        setSaving(false);
      }
    }, 200);
  };

  return (
    <div className="max-w-2xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            {isEditing ? 'تعديل بيانات الطبيب' : 'إضافة طبيب جديد'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">الاسم الكامل</Label>
              <Input
                id="fullName"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                placeholder="أدخل اسم الطبيب الكامل"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="code">الكود</Label>
                <Input
                  id="code"
                  value={code}
                  onChange={e => setCode(e.target.value)}
                  placeholder="مثال: DOC007"
                  required
                  className="font-mono"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">رقم الهاتف</Label>
                <Input
                  id="phone"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="05XXXXXXXX"
                  dir="ltr"
                  className="text-left"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">البريد الإلكتروني</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="doctor@hospital.com"
                dir="ltr"
                className="text-left"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>القسم</Label>
                <Select value={departmentId} onValueChange={setDepartmentId}>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر القسم" />
                  </SelectTrigger>
                  <SelectContent>
                    {activeDepartments.map(d => (
                      <SelectItem key={d.departmentId} value={d.departmentId}>{d.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="requiredDays">عدد الأيام المطلوبة/شهر</Label>
                <Input
                  id="requiredDays"
                  type="number"
                  min="1"
                  max="31"
                  value={requiredDays}
                  onChange={e => setRequiredDays(e.target.value)}
                />
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={onBack}
                className="gap-2"
              >
                <ArrowRight className="h-4 w-4" />
                إلغاء
              </Button>
              <Button
                type="submit"
                className="bg-teal-600 hover:bg-teal-700 text-white gap-2"
                disabled={saving}
              >
                <Save className="h-4 w-4" />
                {saving ? 'جارِ الحفظ...' : 'حفظ'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
