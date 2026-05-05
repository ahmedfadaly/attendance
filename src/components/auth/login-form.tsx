'use client';

import { useState } from 'react';
import { useAppStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Lock, Mail, Eye, EyeOff } from 'lucide-react';
import Image from 'next/image';

export function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const login = useAppStore(s => s.login);
  const navigateTo = useAppStore(s => s.navigateTo);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    setTimeout(() => {
      const success = login(email, password);
      if (success) {
        toast.success('تم تسجيل الدخول بنجاح');
        navigateTo('home');
      } else {
        toast.error('البريد الإلكتروني أو كلمة المرور غير صحيحة');
      }
      setLoading(false);
    }, 300);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-teal-50 via-white to-emerald-50 p-4">
      <Card className="w-full max-w-md shadow-xl border-teal-100">
        <CardHeader className="text-center space-y-4 pb-2">
          <div className="mx-auto w-24 h-24 relative">
            <Image
              src="/logo.png"
              alt="شعار المستشفى"
              fill
              className="object-contain rounded-full"
            />
          </div>
          <div>
            <CardTitle className="text-2xl font-bold text-teal-800">
              نظام مراجعة حضور أطباء الامتياز
            </CardTitle>
            <CardDescription className="text-teal-600 mt-2">
              سجّل دخولك للمتابعة
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-right">البريد الإلكتروني</Label>
              <div className="relative">
                <Mail className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="أدخل بريدك الإلكتروني"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="pr-10 text-right"
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-right">كلمة المرور</Label>
              <div className="relative">
                <Lock className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="أدخل كلمة المرور"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="pr-10 pl-10 text-right"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <Button
              type="submit"
              className="w-full bg-teal-600 hover:bg-teal-700 text-white h-11 text-base font-medium"
              disabled={loading}
            >
              {loading ? 'جارِ تسجيل الدخول...' : 'تسجيل الدخول'}
            </Button>
          </form>
          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => navigateTo('change-request-public')}
              className="text-sm text-teal-600 hover:text-teal-800 hover:underline transition-colors"
            >
              طلب تغيير يوم الحضور (بدون تسجيل دخول)
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
