'use client';

import { useState, useMemo, useCallback } from 'react';
import { useAppStore } from '@/lib/store';
import { ShiftType, MonthlyReportDetail } from '@/lib/types';
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
import { toast } from 'sonner';
import {
  Download, Printer, FileBarChart, Calendar, UserCheck, UserX,
  Clock, AlertTriangle, ArrowLeftRight, CheckCircle2, XCircle
} from 'lucide-react';
import Papa from 'papaparse';

const SHIFT_LABELS: Record<ShiftType, string> = { morning: 'صباحي', evening: 'مسائي' };
const ARABIC_DAYS = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

const DETAIL_STATUS_LABELS: Record<string, string> = {
  present: 'حاضر',
  absent: 'غائب',
  incomplete: 'ناقص',
  outside_schedule: 'خارج الجدول',
  scheduled: 'مجدول (لم يحضر بعد)',
  changed_from: 'يوم بديل (تم تغييره)',
  changed_to: 'يوم بديل',
};

const DETAIL_STATUS_COLORS: Record<string, string> = {
  present: 'bg-green-100 text-green-700',
  absent: 'bg-red-100 text-red-700',
  incomplete: 'bg-amber-100 text-amber-700',
  outside_schedule: 'bg-orange-100 text-orange-700',
  scheduled: 'bg-gray-100 text-gray-600',
  changed_from: 'bg-purple-100 text-purple-700',
  changed_to: 'bg-blue-100 text-blue-700',
};

export function MonthlyReport() {
  const doctors = useAppStore(s => s.doctors);
  const departments = useAppStore(s => s.departments);
  const calculateMonthlyReport = useAppStore(s => s.calculateMonthlyReport);

  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [selectedDoctor, setSelectedDoctor] = useState('all');
  const [selectedDept, setSelectedDept] = useState('all');
  const [selectedShift, setSelectedShift] = useState<ShiftType | 'all'>('all');

  const activeDoctors = doctors.filter(d => d.active);
  const activeDepartments = departments.filter(d => d.active);

  const filteredDoctors = useMemo(() => {
    let docs = activeDoctors;
    if (selectedDoctor !== 'all') {
      docs = docs.filter(d => d.doctorId === selectedDoctor);
    }
    if (selectedDept !== 'all') {
      docs = docs.filter(d => d.departmentId === selectedDept);
    }
    return docs;
  }, [activeDoctors, selectedDoctor, selectedDept]);

  const reports = useMemo(() => {
    return filteredDoctors.map(doc => calculateMonthlyReport(doc.doctorId, selectedMonth));
  }, [filteredDoctors, selectedMonth, calculateMonthlyReport]);

  const filteredDetails = useMemo(() => {
    let details: Array<{ report: typeof reports[0]; detail: MonthlyReportDetail }> = [];
    for (const report of reports) {
      for (const detail of report.details) {
        if (selectedShift !== 'all' && detail.shift !== selectedShift) continue;
        details.push({ report, detail });
      }
    }
    return details.sort((a, b) => a.detail.date.localeCompare(b.detail.date));
  }, [reports, selectedShift]);

  const totals = useMemo(() => {
    return {
      requiredDays: reports.reduce((s, r) => s + r.requiredDays, 0),
      presentDays: reports.reduce((s, r) => s + r.presentDays, 0),
      absentDays: reports.reduce((s, r) => s + r.absentDays, 0),
      outsideScheduleDays: reports.reduce((s, r) => s + r.outsideScheduleDays, 0),
      incompleteDays: reports.reduce((s, r) => s + r.incompleteDays, 0),
      approvedChangeRequests: reports.reduce((s, r) => s + r.approvedChangeRequests, 0),
      rejectedChangeRequests: reports.reduce((s, r) => s + r.rejectedChangeRequests, 0),
    };
  }, [reports]);

  const handleExportCSV = useCallback(() => {
    const data = filteredDetails.map(({ report, detail }) => ({
      'اسم الطبيب': report.doctorName,
      'القسم': report.departmentName,
      'التاريخ': detail.date,
      'اليوم': ARABIC_DAYS[new Date(detail.date).getDay()],
      'الشيفت': SHIFT_LABELS[detail.shift as ShiftType] || detail.shift,
      'الحالة': DETAIL_STATUS_LABELS[detail.status] || detail.status,
      'ملاحظة': detail.notes,
    }));

    const csv = Papa.unparse(data, { header: true });
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `تقرير_شهري_${selectedMonth}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('تم تصدير التقرير بنجاح');
  }, [filteredDetails, selectedMonth]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3 items-end flex-wrap">
            <div className="space-y-1">
              <Label className="text-sm">الشهر</Label>
              <Input
                type="month"
                value={selectedMonth}
                onChange={e => setSelectedMonth(e.target.value)}
                className="w-44"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-sm">الطبيب</Label>
              <Select value={selectedDoctor} onValueChange={setSelectedDoctor}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="الكل" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع الأطباء</SelectItem>
                  {activeDoctors.map(d => (
                    <SelectItem key={d.doctorId} value={d.doctorId}>{d.fullName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-sm">القسم</Label>
              <Select value={selectedDept} onValueChange={setSelectedDept}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="الكل" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع الأقسام</SelectItem>
                  {activeDepartments.map(d => (
                    <SelectItem key={d.departmentId} value={d.departmentId}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-sm">الشيفت</Label>
              <Select value={selectedShift} onValueChange={(v: ShiftType | 'all') => setSelectedShift(v)}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">الكل</SelectItem>
                  <SelectItem value="morning">صباحي</SelectItem>
                  <SelectItem value="evening">مسائي</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2 mr-auto">
              <Button variant="outline" size="sm" onClick={handleExportCSV} className="gap-1">
                <Download className="h-4 w-4" />
                تصدير CSV
              </Button>
              <Button variant="outline" size="sm" onClick={handlePrint} className="gap-1">
                <Printer className="h-4 w-4" />
                طباعة
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        <Card className="p-3">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-teal-600" />
            <div>
              <p className="text-xs text-muted-foreground">مطلوبة</p>
              <p className="text-xl font-bold">{totals.requiredDays}</p>
            </div>
          </div>
        </Card>
        <Card className="p-3">
          <div className="flex items-center gap-2">
            <UserCheck className="h-4 w-4 text-green-600" />
            <div>
              <p className="text-xs text-muted-foreground">حضور رسمي</p>
              <p className="text-xl font-bold text-green-600">{totals.presentDays}</p>
            </div>
          </div>
        </Card>
        <Card className="p-3">
          <div className="flex items-center gap-2">
            <UserX className="h-4 w-4 text-red-600" />
            <div>
              <p className="text-xs text-muted-foreground">غياب</p>
              <p className="text-xl font-bold text-red-600">{totals.absentDays}</p>
            </div>
          </div>
        </Card>
        <Card className="p-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-orange-600" />
            <div>
              <p className="text-xs text-muted-foreground">خارج الجدول</p>
              <p className="text-xl font-bold text-orange-600">{totals.outsideScheduleDays}</p>
            </div>
          </div>
        </Card>
        <Card className="p-3">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-amber-600" />
            <div>
              <p className="text-xs text-muted-foreground">ناقص</p>
              <p className="text-xl font-bold text-amber-600">{totals.incompleteDays}</p>
            </div>
          </div>
        </Card>
        <Card className="p-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <div>
              <p className="text-xs text-muted-foreground">موافق عليها</p>
              <p className="text-xl font-bold text-green-600">{totals.approvedChangeRequests}</p>
            </div>
          </div>
        </Card>
        <Card className="p-3">
          <div className="flex items-center gap-2">
            <XCircle className="h-4 w-4 text-red-600" />
            <div>
              <p className="text-xs text-muted-foreground">مرفوضة</p>
              <p className="text-xl font-bold text-red-600">{totals.rejectedChangeRequests}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Per-doctor summary table */}
      {selectedDoctor === 'all' && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">ملخص الأطباء</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto max-h-64">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">الطبيب</TableHead>
                    <TableHead className="text-right">القسم</TableHead>
                    <TableHead className="text-center">مطلوبة</TableHead>
                    <TableHead className="text-center">حضور</TableHead>
                    <TableHead className="text-center">غياب</TableHead>
                    <TableHead className="text-center">ناقص</TableHead>
                    <TableHead className="text-center">خارج الجدول</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reports.map(report => (
                    <TableRow key={report.doctorId}>
                      <TableCell className="font-medium">{report.doctorName}</TableCell>
                      <TableCell className="text-sm">{report.departmentName}</TableCell>
                      <TableCell className="text-center">{report.requiredDays}</TableCell>
                      <TableCell className="text-center">
                        <Badge className="bg-green-100 text-green-700">{report.presentDays}</Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge className="bg-red-100 text-red-700">{report.absentDays}</Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge className="bg-amber-100 text-amber-700">{report.incompleteDays}</Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge className="bg-orange-100 text-orange-700">{report.outsideScheduleDays}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Detailed Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">التفاصيل اليومية</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto max-h-[400px]">
            <Table>
              <TableHeader className="sticky top-0 bg-card z-10">
                <TableRow>
                  <TableHead className="text-right">الطبيب</TableHead>
                  <TableHead className="text-right">التاريخ</TableHead>
                  <TableHead className="text-right">اليوم</TableHead>
                  <TableHead className="text-right">الشيفت</TableHead>
                  <TableHead className="text-right">الحالة</TableHead>
                  <TableHead className="text-right">ملاحظة</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDetails.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                      لا يوجد بيانات للعرض
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredDetails.map(({ report, detail }, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-medium text-sm">{report.doctorName}</TableCell>
                      <TableCell className="font-mono text-sm">{detail.date}</TableCell>
                      <TableCell className="text-sm">{ARABIC_DAYS[new Date(detail.date).getDay()]}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{SHIFT_LABELS[detail.shift as ShiftType] || detail.shift}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={DETAIL_STATUS_COLORS[detail.status] || ''}>
                          {DETAIL_STATUS_LABELS[detail.status] || detail.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{detail.notes || '-'}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
