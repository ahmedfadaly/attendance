'use client';

import { useState, useMemo } from 'react';
import { useAppStore } from '@/lib/store';
import { ChangeRequest } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import {
  CheckCircle2, XCircle, Clock, ArrowLeftRight, Search
} from 'lucide-react';

const SHIFT_LABELS = { morning: 'صباحي', evening: 'مسائي' };

export function ChangeRequestList() {
  const currentUser = useAppStore(s => s.currentUser);
  const changeRequests = useAppStore(s => s.changeRequests);
  const departments = useAppStore(s => s.departments);
  const approveChangeRequest = useAppStore(s => s.approveChangeRequest);
  const rejectChangeRequest = useAppStore(s => s.rejectChangeRequest);

  const [statusFilter, setStatusFilter] = useState('all');
  const [monthFilter, setMonthFilter] = useState('');
  const [deptFilter, setDeptFilter] = useState('all');
  const [search, setSearch] = useState('');

  // Dialog
  const [reviewingRequest, setReviewingRequest] = useState<ChangeRequest | null>(null);
  const [reviewNote, setReviewNote] = useState('');
  const [reviewAction, setReviewAction] = useState<'approve' | 'reject' | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const activeDepartments = departments.filter(d => d.active);

  const filteredRequests = useMemo(() => {
    return changeRequests.filter(cr => {
      const matchStatus = statusFilter === 'all' || cr.status === statusFilter;
      const matchMonth = !monthFilter || cr.month === monthFilter;
      const matchDept = deptFilter === 'all' || cr.departmentId === deptFilter;
      const matchSearch = !search ||
        cr.doctorName.includes(search) || cr.originalDate.includes(search) || cr.requestedDate.includes(search);
      return matchStatus && matchMonth && matchDept && matchSearch;
    }).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [changeRequests, statusFilter, monthFilter, deptFilter, search]);

  const pendingCount = changeRequests.filter(cr => cr.status === 'pending').length;

  const handleReview = (cr: ChangeRequest, action: 'approve' | 'reject') => {
    setReviewingRequest(cr);
    setReviewNote('');
    setReviewAction(action);
    setConfirmOpen(true);
  };

  const handleConfirmReview = () => {
    if (!reviewingRequest || !reviewAction || !currentUser) return;

    const success = reviewAction === 'approve'
      ? approveChangeRequest(reviewingRequest.requestId, reviewNote, currentUser.uid)
      : rejectChangeRequest(reviewingRequest.requestId, reviewNote, currentUser.uid);

    if (success) {
      toast.success(reviewAction === 'approve' ? 'تم قبول الطلب بنجاح' : 'تم رفض الطلب');
    } else {
      toast.error('فشل في معالجة الطلب. قد يكون تمت مراجعته بالفعل.');
    }
    setConfirmOpen(false);
    setReviewingRequest(null);
    setReviewAction(null);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge className="bg-amber-100 text-amber-700 border-amber-300 gap-1"><Clock className="h-3 w-3" /> معلق</Badge>;
      case 'approved':
        return <Badge className="bg-green-100 text-green-700 border-green-300 gap-1"><CheckCircle2 className="h-3 w-3" /> مقبول</Badge>;
      case 'rejected':
        return <Badge className="bg-red-100 text-red-700 border-red-300 gap-1"><XCircle className="h-3 w-3" /> مرفوض</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-4">
      {/* Summary */}
      {pendingCount > 0 && (
        <Card className="bg-amber-50 border-amber-200">
          <CardContent className="p-4 flex items-center gap-3">
            <Clock className="h-5 w-5 text-amber-600" />
            <span className="font-medium text-amber-800">
              لديك {pendingCount} طلب تغيير معلق بانتظار المراجعة
            </span>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3 items-end">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="بحث..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pr-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="الحالة" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">الكل</SelectItem>
                <SelectItem value="pending">معلق</SelectItem>
                <SelectItem value="approved">مقبول</SelectItem>
                <SelectItem value="rejected">مرفوض</SelectItem>
              </SelectContent>
            </Select>
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
            <Input
              type="month"
              value={monthFilter}
              onChange={e => setMonthFilter(e.target.value)}
              className="w-44"
              placeholder="الشهر"
            />
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto max-h-[500px]">
            <Table>
              <TableHeader className="sticky top-0 bg-card z-10">
                <TableRow>
                  <TableHead className="text-right">الطبيب</TableHead>
                  <TableHead className="text-right">القسم</TableHead>
                  <TableHead className="text-right">اليوم الأصلي</TableHead>
                  <TableHead className="text-right">اليوم الجديد</TableHead>
                  <TableHead className="text-right">السبب</TableHead>
                  <TableHead className="text-right">الهاتف</TableHead>
                  <TableHead className="text-right">الحالة</TableHead>
                  <TableHead className="text-right">ملاحظة المدير</TableHead>
                  <TableHead className="text-center">إجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRequests.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-12 text-muted-foreground">
                      لا يوجد طلبات تغيير
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredRequests.map(cr => (
                    <TableRow key={cr.requestId}>
                      <TableCell className="font-medium">{cr.doctorName}</TableCell>
                      <TableCell className="text-sm">{cr.departmentName}</TableCell>
                      <TableCell className="text-sm">
                        {cr.originalDate}
                        <Badge variant="outline" className="mr-1 text-xs">{SHIFT_LABELS[cr.originalShift]}</Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {cr.requestedDate}
                        <Badge variant="outline" className="mr-1 text-xs">{SHIFT_LABELS[cr.requestedShift]}</Badge>
                      </TableCell>
                      <TableCell className="max-w-[150px] truncate text-sm">{cr.reason}</TableCell>
                      <TableCell className="text-sm" dir="ltr">{cr.contactPhone}</TableCell>
                      <TableCell>{getStatusBadge(cr.status)}</TableCell>
                      <TableCell className="text-sm max-w-[100px] truncate">{cr.managerNote || '-'}</TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center gap-1">
                          {cr.status === 'pending' && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-green-600 border-green-300 hover:bg-green-50 h-8"
                                onClick={() => handleReview(cr, 'approve')}
                              >
                                <CheckCircle2 className="h-3.5 w-3.5 ml-1" />
                                قبول
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-red-600 border-red-300 hover:bg-red-50 h-8"
                                onClick={() => handleReview(cr, 'reject')}
                              >
                                <XCircle className="h-3.5 w-3.5 ml-1" />
                                رفض
                              </Button>
                            </>
                          )}
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
        عدد النتائج: {filteredRequests.length}
      </div>

      {/* Review Dialog */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {reviewAction === 'approve' ? 'قبول طلب التغيير' : 'رفض طلب التغيير'}
            </DialogTitle>
          </DialogHeader>
          {reviewingRequest && (
            <div className="space-y-4">
              <div className="p-3 rounded-lg bg-muted/50 space-y-1">
                <p className="text-sm"><span className="font-medium">الطبيب:</span> {reviewingRequest.doctorName}</p>
                <p className="text-sm"><span className="font-medium">من:</span> {reviewingRequest.originalDate} ({SHIFT_LABELS[reviewingRequest.originalShift]})</p>
                <p className="text-sm"><span className="font-medium">إلى:</span> {reviewingRequest.requestedDate} ({SHIFT_LABELS[reviewingRequest.requestedShift]})</p>
                <p className="text-sm"><span className="font-medium">السبب:</span> {reviewingRequest.reason}</p>
              </div>
              <div className="space-y-2">
                <Label>ملاحظة (اختياري)</Label>
                <Textarea
                  value={reviewNote}
                  onChange={e => setReviewNote(e.target.value)}
                  placeholder="أضف ملاحظة..."
                  rows={3}
                />
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>إلغاء</Button>
            <Button
              onClick={handleConfirmReview}
              className={reviewAction === 'approve' ? 'bg-green-600 hover:bg-green-700 text-white' : 'bg-red-600 hover:bg-red-700 text-white'}
            >
              {reviewAction === 'approve' ? 'تأكيد القبول' : 'تأكيد الرفض'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
