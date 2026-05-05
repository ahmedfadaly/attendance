'use client';

import { useState } from 'react';
import { useAppStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { User, Lock, LogOut, Shield, Mail, Save } from 'lucide-react';

const ROLE_LABELS: Record<string, string> = {
  super_admin: 'مدير النظام',
  manager: 'مدير',
  worker: 'موظف',
};

const ROLE_COLORS: Record<string, string> = {
  super_admin: 'bg-purple-100 text-purple-700',
  manager: 'bg-teal-100 text-teal-700',
  worker: 'bg-gray-100 text-gray-700',
};

export function AccountSettings() {
  const currentUser = useAppStore(s => s.currentUser);
  const updatePassword = useAppStore(s => s.updatePassword);
  const logout = useAppStore(s => s.logout);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);

  if (!currentUser) return null;

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();

    if (currentPassword !== currentUser.password) {
      toast.error('كلمة المرور الحالية غير صحيحة');
      return;
    }
    if (newPassword.length < 6) {
      toast.error('كلمة المرور الجديدة يجب أن تكون 6 أحرف على الأقل');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('كلمة المرور الجديدة غير متطابقة');
      return;
    }

    setSaving(true);
    setTimeout(() => {
      updatePassword(currentUser.uid, newPassword);
      toast.success('تم تغيير كلمة المرور بنجاح');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setSaving(false);
    }, 300);
  };

  const handleLogout = () => {
    logout();
    toast.success('تم تسجيل الخروج بنجاح');
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Account Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <User className="h-5 w-5 text-teal-600" />
            معلومات الحساب
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label className="text-sm text-muted-foreground">الاسم</Label>
              <p className="font-medium">{currentUser.name}</p>
            </div>
            <div className="space-y-1">
              <Label className="text-sm text-muted-foreground">البريد الإلكتروني</Label>
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <p className="font-medium" dir="ltr">{currentUser.email}</p>
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-sm text-muted-foreground">الدور</Label>
              <Badge className={ROLE_COLORS[currentUser.role]}>{ROLE_LABELS[currentUser.role]}</Badge>
            </div>
            <div className="space-y-1">
              <Label className="text-sm text-muted-foreground">الحالة</Label>
              <Badge className={currentUser.active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>
                {currentUser.active ? 'نشط' : 'غير نشط'}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Change Password */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Lock className="h-5 w-5 text-teal-600" />
            تغيير كلمة المرور
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="currentPassword">كلمة المرور الحالية</Label>
              <Input
                id="currentPassword"
                type="password"
                value={currentPassword}
                onChange={e => setCurrentPassword(e.target.value)}
                placeholder="أدخل كلمة المرور الحالية"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="newPassword">كلمة المرور الجديدة</Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="أدخل كلمة المرور الجديدة (6 أحرف على الأقل)"
                required
                minLength={6}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">تأكيد كلمة المرور الجديدة</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="أعد إدخال كلمة المرور الجديدة"
                required
              />
            </div>
            <Button
              type="submit"
              className="bg-teal-600 hover:bg-teal-700 text-white gap-2"
              disabled={saving}
            >
              <Save className="h-4 w-4" />
              {saving ? 'جارِ الحفظ...' : 'تغيير كلمة المرور'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Logout */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium">تسجيل الخروج</h3>
              <p className="text-sm text-muted-foreground">تسجيل الخروج من حسابك</p>
            </div>
            <Button variant="outline" onClick={handleLogout} className="gap-2 text-red-600 border-red-300 hover:bg-red-50">
              <LogOut className="h-4 w-4" />
              تسجيل الخروج
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
