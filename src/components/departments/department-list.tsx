'use client';

import { useState, useMemo } from 'react';
import { useAppStore } from '@/lib/store';
import { Department } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Plus, Edit, Trash2, Building2 } from 'lucide-react';

export function DepartmentList() {
  const departments = useAppStore(s => s.departments);
  const addDepartment = useAppStore(s => s.addDepartment);
  const updateDepartment = useAppStore(s => s.updateDepartment);
  const deleteDepartment = useAppStore(s => s.deleteDepartment);
  const toggleDepartmentActive = useAppStore(s => s.toggleDepartmentActive);
  const doctors = useAppStore(s => s.doctors);

  const [showDialog, setShowDialog] = useState(false);
  const [editing, setEditing] = useState<Department | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [formName, setFormName] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formActive, setFormActive] = useState(true);

  const deptWithDoctorCount = useMemo(() => {
    return departments.map(dept => ({
      ...dept,
      doctorCount: doctors.filter(d => d.departmentId === dept.departmentId).length,
    }));
  }, [departments, doctors]);

  const openAdd = () => {
    setEditing(null);
    setFormName('');
    setFormDesc('');
    setFormActive(true);
    setShowDialog(true);
  };

  const openEdit = (dept: Department) => {
    setEditing(dept);
    setFormName(dept.name);
    setFormDesc(dept.description);
    setFormActive(dept.active);
    setShowDialog(true);
  };

  const handleSave = () => {
    if (!formName.trim()) {
      toast.error('يرجى إدخال اسم القسم');
      return;
    }

    // Check duplicate name
    const existing = departments.find(
      d => d.name === formName.trim() && d.departmentId !== editing?.departmentId
    );
    if (existing) {
      toast.error('اسم القسم مستخدم بالفعل');
      return;
    }

    if (editing) {
      updateDepartment(editing.departmentId, {
        name: formName.trim(),
        description: formDesc.trim(),
        active: formActive,
      });
      toast.success('تم تعديل القسم بنجاح');
    } else {
      addDepartment({
        name: formName.trim(),
        description: formDesc.trim(),
        active: formActive,
      });
      toast.success('تم إضافة القسم بنجاح');
    }
    setShowDialog(false);
  };

  const handleDelete = () => {
    if (deleteId) {
      const deptDoctors = doctors.filter(d => d.departmentId === deleteId);
      if (deptDoctors.length > 0) {
        toast.error(`لا يمكن حذف هذا القسم لأنه يحتوي على ${deptDoctors.length} طبيب`);
        setDeleteId(null);
        return;
      }
      deleteDepartment(deleteId);
      toast.success('تم حذف القسم بنجاح');
      setDeleteId(null);
    }
  };

  const handleToggle = (deptId: string) => {
    toggleDepartmentActive(deptId);
    const dept = departments.find(d => d.departmentId === deptId);
    toast.success(dept?.active ? 'تم تعطيل القسم' : 'تم تفعيل القسم');
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={openAdd} className="bg-teal-600 hover:bg-teal-700 text-white gap-2">
          <Plus className="h-4 w-4" />
          إضافة قسم
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {deptWithDoctorCount.map(dept => (
          <Card key={dept.departmentId} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-teal-50">
                    <Building2 className="h-5 w-5 text-teal-600" />
                  </div>
                  <div>
                    <CardTitle className="text-base">{dept.name}</CardTitle>
                    <p className="text-xs text-muted-foreground mt-1">{dept.doctorCount} طبيب</p>
                  </div>
                </div>
                <Badge className={dept.active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>
                  {dept.active ? 'نشط' : 'غير نشط'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              {dept.description && (
                <p className="text-sm text-muted-foreground mb-4">{dept.description}</p>
              )}
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={() => openEdit(dept)} className="gap-1">
                  <Edit className="h-3.5 w-3.5" />
                  تعديل
                </Button>
                <Button variant="ghost" size="sm" onClick={() => handleToggle(dept.departmentId)} className="gap-1">
                  {dept.active ? (
                    <><Trash2 className="h-3.5 w-3.5 text-red-500" /> تعطيل</>
                  ) : (
                    <><Building2 className="h-3.5 w-3.5 text-green-500" /> تفعيل</>
                  )}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setDeleteId(dept.departmentId)} className="gap-1 mr-auto">
                  <Trash2 className="h-3.5 w-3.5 text-red-500" />
                  حذف
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'تعديل القسم' : 'إضافة قسم جديد'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>اسم القسم</Label>
              <Input
                value={formName}
                onChange={e => setFormName(e.target.value)}
                placeholder="أدخل اسم القسم"
              />
            </div>
            <div className="space-y-2">
              <Label>الوصف</Label>
              <Textarea
                value={formDesc}
                onChange={e => setFormDesc(e.target.value)}
                placeholder="وصف مختصر للقسم"
                rows={3}
              />
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={formActive} onCheckedChange={setFormActive} />
              <Label>{formActive ? 'نشط' : 'غير نشط'}</Label>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowDialog(false)}>إلغاء</Button>
            <Button onClick={handleSave} className="bg-teal-600 hover:bg-teal-700 text-white">
              حفظ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد الحذف</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من حذف هذا القسم؟ لا يمكن التراجع عن هذا الإجراء.
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
