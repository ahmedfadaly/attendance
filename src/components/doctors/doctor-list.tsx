'use client';

import { useState, useMemo } from 'react';
import { useAppStore } from '@/lib/store';
import { Doctor } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
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
import { Plus, Search, Edit, Trash2, Eye, EyeOff } from 'lucide-react';
import { DoctorForm } from './doctor-form';
import { DoctorDetail } from './doctor-detail';

export function DoctorList() {
  const doctors = useAppStore(s => s.doctors);
  const departments = useAppStore(s => s.departments);
  const deleteDoctor = useAppStore(s => s.deleteDoctor);
  const toggleDoctorActive = useAppStore(s => s.toggleDoctorActive);
  const navigateTo = useAppStore(s => s.navigateTo);
  const navigateToDoctorDetail = useAppStore(s => s.navigateToDoctorDetail);
  const currentView = useAppStore(s => s.currentView);

  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [editingDoctor, setEditingDoctor] = useState<Doctor | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [detailDoctorId, setDetailDoctorId] = useState<string | null>(null);

  const activeDepartments = departments.filter(d => d.active);

  const filteredDoctors = useMemo(() => {
    return doctors.filter(d => {
      const matchSearch = !search || d.fullName.includes(search) || d.code.includes(search);
      const matchDept = deptFilter === 'all' || d.departmentId === deptFilter;
      const matchStatus = statusFilter === 'all' ||
        (statusFilter === 'active' && d.active) ||
        (statusFilter === 'inactive' && !d.active);
      return matchSearch && matchDept && matchStatus;
    });
  }, [doctors, search, deptFilter, statusFilter]);

  const handleDelete = () => {
    if (deleteId) {
      deleteDoctor(deleteId);
      toast.success('تم حذف الطبيب بنجاح');
      setDeleteId(null);
    }
  };

  const handleEdit = (doctor: Doctor) => {
    setEditingDoctor(doctor);
    setShowForm(true);
  };

  const handleViewDetail = (doctorId: string) => {
    setDetailDoctorId(doctorId);
    setShowDetail(true);
  };

  const handleToggle = (doctorId: string) => {
    toggleDoctorActive(doctorId);
    const doc = doctors.find(d => d.doctorId === doctorId);
    toast.success(doc?.active ? 'تم تعطيل الطبيب' : 'تم تفعيل الطبيب');
  };

  if (showDetail && detailDoctorId) {
    return <DoctorDetail doctorId={detailDoctorId} onBack={() => setShowDetail(false)} />;
  }

  if (showForm || currentView === 'doctor-add') {
    return (
      <DoctorForm
        doctor={editingDoctor}
        onBack={() => {
          setShowForm(false);
          setEditingDoctor(null);
          navigateTo('doctors');
        }}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-3 flex-1 w-full">
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
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue placeholder="القسم" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">جميع الأقسام</SelectItem>
              {activeDepartments.map(d => (
                <SelectItem key={d.departmentId} value={d.departmentId}>{d.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-36">
              <SelectValue placeholder="الحالة" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">الكل</SelectItem>
              <SelectItem value="active">نشط</SelectItem>
              <SelectItem value="inactive">غير نشط</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button
          onClick={() => { setEditingDoctor(null); setShowForm(true); }}
          className="bg-teal-600 hover:bg-teal-700 text-white whitespace-nowrap"
        >
          <Plus className="h-4 w-4 ml-2" />
          إضافة طبيب
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">الاسم</TableHead>
                  <TableHead className="text-right">الكود</TableHead>
                  <TableHead className="text-right">القسم</TableHead>
                  <TableHead className="text-right">الهاتف</TableHead>
                  <TableHead className="text-right">الحالة</TableHead>
                  <TableHead className="text-center">إجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDoctors.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      لا يوجد أطباء
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredDoctors.map(doctor => (
                    <TableRow
                      key={doctor.doctorId}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleViewDetail(doctor.doctorId)}
                    >
                      <TableCell className="font-medium">{doctor.fullName}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-mono">{doctor.code}</Badge>
                      </TableCell>
                      <TableCell>{doctor.departmentName}</TableCell>
                      <TableCell className="text-sm text-muted-foreground" dir="ltr">{doctor.phone}</TableCell>
                      <TableCell>
                        <Badge className={doctor.active ? 'bg-green-100 text-green-700 border-green-300' : 'bg-red-100 text-red-700 border-red-300'}>
                          {doctor.active ? 'نشط' : 'غير نشط'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center gap-1" onClick={e => e.stopPropagation()}>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleViewDetail(doctor.doctorId)}>
                            <Search className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(doctor)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleToggle(doctor.doctorId)}>
                            {doctor.active ? <EyeOff className="h-4 w-4 text-red-500" /> : <Eye className="h-4 w-4 text-green-500" />}
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setDeleteId(doctor.doctorId)}>
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <div className="text-sm text-muted-foreground">
        إجمالي النتائج: {filteredDoctors.length}
      </div>

      {/* Delete Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد الحذف</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من حذف هذا الطبيب؟ سيتم حذف جميع بياناته بما في ذلك الجداول والسجلات.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700 text-white">
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
