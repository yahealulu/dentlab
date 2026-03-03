import { useState, useMemo } from 'react';
import { getStore, setStore, generateId, getNextOrderNo, STORAGE_KEYS } from '@/lib/storage';
import type { LabOrder, Lab, LabWorkType, Patient } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { toast } from 'sonner';
import { Plus, MessageSquare, Search, Calendar, Archive, ListTodo, Pencil } from 'lucide-react';
import { format, startOfDay, endOfDay, subDays, startOfMonth, endOfMonth, startOfYear, endOfYear, getDaysInMonth, parseISO, isWithinInterval, differenceInDays } from 'date-fns';

const statusLabels: Record<string, string> = { pending: 'قيد الانتظار', received: 'تم الاستلام', cancelled: 'ملغي' };
const statusColors: Record<string, string> = { pending: 'bg-warning text-warning-foreground', received: 'bg-success text-success-foreground', cancelled: 'bg-destructive text-destructive-foreground' };

type DeliveryStatus = 'remaining' | 'today' | 'delayed';

function getDeliveryStatus(dueDateStr: string): { status: DeliveryStatus; days: number; label: string } {
  if (!dueDateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dueDateStr)) {
    return { status: 'delayed', days: 0, label: '—' };
  }
  const due = startOfDay(parseISO(dueDateStr));
  const today = startOfDay(now);
  const days = differenceInDays(due, today);
  if (days > 0) {
    const dayWord = days === 1 ? 'يوم' : 'أيام';
    return { status: 'remaining', days, label: `متبقي ${days} ${dayWord}` };
  }
  if (days === 0) {
    return { status: 'today', days: 0, label: 'تاريخ الاستلام اليوم' };
  }
  const delayDays = Math.abs(days);
  const dayWord = delayDays === 1 ? 'يوم' : 'أيام';
  return { status: 'delayed', days: delayDays, label: `متأخر ${delayDays} ${dayWord}` };
}

const deliveryBadgeClasses: Record<DeliveryStatus, string> = {
  remaining: 'bg-green-100 text-green-800 border-green-200',
  today: 'bg-amber-100 text-amber-800 border-amber-200',
  delayed: 'bg-red-100 text-red-800 border-red-200',
};

const deliveryDotClasses: Record<DeliveryStatus, string> = {
  remaining: 'bg-green-500',
  today: 'bg-amber-500',
  delayed: 'bg-red-500',
};

type DateFilterMode = 'all' | 'today' | 'last7' | 'last30' | 'day' | 'month' | 'year';

const now = new Date();
const currentYear = now.getFullYear();
const MONTHS_AR = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];

function getOrderDate(order: LabOrder): Date {
  const dateStr = order.sentDate || order.createdAt;
  if (order.sentDate && /^\d{4}-\d{2}-\d{2}$/.test(order.sentDate)) {
    return startOfDay(parseISO(order.sentDate));
  }
  return parseISO(order.createdAt);
}

export default function LabOrders() {
  const [orders, setOrders] = useState<LabOrder[]>(() => getStore(STORAGE_KEYS.labOrders, []));
  const labs = getStore<Lab[]>(STORAGE_KEYS.labs, []).filter(l => l.isActive);
  const workTypes = getStore<LabWorkType[]>(STORAGE_KEYS.labWorkTypes, []);
  const patients = getStore<Patient[]>(STORAGE_KEYS.patients, []);

  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<LabOrder | null>(null);
  const [receiveOpen, setReceiveOpen] = useState(false);
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null);
  const [cost, setCost] = useState(0);
  const [searchP, setSearchP] = useState('');

  const [viewMode, setViewMode] = useState<'active' | 'archive'>('active');
  const [dateFilterMode, setDateFilterMode] = useState<DateFilterMode>('all');
  const [filterDay, setFilterDay] = useState(now.getDate());
  const [filterMonth, setFilterMonth] = useState(now.getMonth() + 1);
  const [filterYear, setFilterYear] = useState(currentYear);

  const daysInFilterMonth = getDaysInMonth(new Date(filterYear, filterMonth - 1));
  const safeFilterDay = Math.min(filterDay, daysInFilterMonth);

  const ordersByView = useMemo(() => {
    if (viewMode === 'active') {
      return orders.filter(o => o.status === 'pending');
    }
    return orders.filter(o => o.status === 'received' || o.status === 'cancelled');
  }, [orders, viewMode]);

  const [form, setForm] = useState({
    patientId: '', labId: '', workTypeId: '', quantity: 1,
    sentDate: format(new Date(), 'yyyy-MM-dd'), dueDate: '', notes: '',
  });

  const save = (o: LabOrder[]) => { setOrders(o); setStore(STORAGE_KEYS.labOrders, o); };

  const handleSubmit = () => {
    if (!form.patientId || !form.labId || !form.workTypeId || !form.dueDate) {
      toast.error('يرجى ملء جميع الحقول'); return;
    }
    save([...orders, {
      id: generateId(), orderNo: getNextOrderNo(), patientId: form.patientId,
      labId: form.labId, workTypeId: form.workTypeId, quantity: form.quantity,
      sentDate: form.sentDate, dueDate: form.dueDate, status: 'pending',
      cost: null, notes: form.notes, createdAt: new Date().toISOString(),
    }]);
    setOpen(false);
    toast.success('تم إضافة الطلب');
  };

  const handleReceive = () => {
    if (!activeOrderId || cost <= 0) { toast.error('أدخل التكلفة'); return; }
    save(orders.map(o => o.id === activeOrderId ? { ...o, status: 'received' as const, cost } : o));
    setReceiveOpen(false);
    toast.success('تم تأكيد الاستلام');
  };

  const cancelOrder = (id: string) => {
    save(orders.map(o => o.id === id ? { ...o, status: 'cancelled' as const } : o));
    toast.success('تم إلغاء الطلب');
  };

  const openEdit = (order: LabOrder) => {
    setEditingOrder(order);
    setForm({
      patientId: order.patientId,
      labId: order.labId,
      workTypeId: order.workTypeId,
      quantity: order.quantity,
      sentDate: order.sentDate || format(new Date(), 'yyyy-MM-dd'),
      dueDate: order.dueDate,
      notes: order.notes || '',
    });
    setEditOpen(true);
  };

  const handleEditSubmit = () => {
    if (!editingOrder || !form.dueDate) {
      toast.error('يرجى إدخال تاريخ الاستلام المتوقع');
      return;
    }
    save(orders.map(o =>
      o.id === editingOrder.id
        ? { ...o, sentDate: form.sentDate, dueDate: form.dueDate, notes: form.notes, quantity: form.quantity }
        : o
    ));
    setEditOpen(false);
    setEditingOrder(null);
    toast.success('تم تحديث الطلب');
  };

  const getPatientName = (id: string) => patients.find(p => p.id === id)?.fullName || '-';
  const getLabName = (id: string) => labs.find(l => l.id === id)?.name || getStore<Lab[]>(STORAGE_KEYS.labs, []).find(l => l.id === id)?.name || '-';
  const getWorkTypeName = (id: string) => workTypes.find(w => w.id === id)?.name || '-';

  const filteredOrders = useMemo(() => {
    const sorted = [...ordersByView].sort((a, b) => b.orderNo - a.orderNo);
    if (dateFilterMode === 'all') return sorted;

    const today = startOfDay(now);
    const endToday = endOfDay(now);

    if (dateFilterMode === 'today') {
      return sorted.filter(o => {
        const d = getOrderDate(o);
        return isWithinInterval(d, { start: today, end: endToday });
      });
    }
    if (dateFilterMode === 'last7') {
      const start = startOfDay(subDays(now, 6));
      return sorted.filter(o => {
        const d = getOrderDate(o);
        return isWithinInterval(d, { start, end: endToday });
      });
    }
    if (dateFilterMode === 'last30') {
      const start = startOfDay(subDays(now, 29));
      return sorted.filter(o => {
        const d = getOrderDate(o);
        return isWithinInterval(d, { start, end: endToday });
      });
    }
    if (dateFilterMode === 'day') {
      const targetStart = startOfDay(new Date(filterYear, filterMonth - 1, safeFilterDay));
      const targetEnd = endOfDay(targetStart);
      return sorted.filter(o => {
        const d = getOrderDate(o);
        return isWithinInterval(d, { start: targetStart, end: targetEnd });
      });
    }
    if (dateFilterMode === 'month') {
      const start = startOfMonth(new Date(filterYear, filterMonth - 1));
      const end = endOfMonth(start);
      return sorted.filter(o => {
        const d = getOrderDate(o);
        return isWithinInterval(d, { start, end });
      });
    }
    if (dateFilterMode === 'year') {
      const start = startOfYear(new Date(filterYear, 0));
      const end = endOfYear(start);
      return sorted.filter(o => {
        const d = getOrderDate(o);
        return isWithinInterval(d, { start, end });
      });
    }
    return sorted;
  }, [ordersByView, dateFilterMode, filterDay, filterMonth, filterYear, safeFilterDay]);

  const filteredPatients = patients.filter(p => p.fullName.includes(searchP) || p.phone.includes(searchP)).slice(0, 8);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-bold">طلبات المخابر</h1>
        <div className="flex items-center gap-2">
          <Button
            variant={viewMode === 'archive' ? 'default' : 'outline'}
            onClick={() => setViewMode(viewMode === 'archive' ? 'active' : 'archive')}
          >
            {viewMode === 'archive' ? (
              <><ListTodo className="w-4 h-4 ml-2" /> الطلبات الحالية</>
            ) : (
              <><Archive className="w-4 h-4 ml-2" /> السجل</>
            )}
          </Button>
          {viewMode === 'active' && (
            <Dialog open={open} onOpenChange={(isOpen) => {
              setOpen(isOpen);
              if (isOpen) setForm({ patientId: '', labId: '', workTypeId: '', quantity: 1, sentDate: format(new Date(), 'yyyy-MM-dd'), dueDate: '', notes: '' });
            }}>
              <DialogTrigger asChild><Button><Plus className="w-4 h-4 ml-2" /> طلب جديد</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>إضافة طلب مخبري</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>المريض</Label>
                <Input value={searchP} onChange={e => setSearchP(e.target.value)} placeholder="بحث..." />
                {searchP && (
                  <div className="border rounded-lg mt-1 max-h-32 overflow-y-auto">
                    {filteredPatients.map(p => (
                      <button key={p.id} onClick={() => { setForm({ ...form, patientId: p.id }); setSearchP(p.fullName); }}
                        className={`w-full text-start px-3 py-1.5 text-sm hover:bg-muted/50 ${form.patientId === p.id ? 'bg-accent' : ''}`}>
                        {p.fullName}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <Label>المخبر</Label>
                <Select value={form.labId} onValueChange={v => setForm({ ...form, labId: v })}>
                  <SelectTrigger><SelectValue placeholder="اختر" /></SelectTrigger>
                  <SelectContent>{labs.map(l => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>نوع العمل</Label>
                <Select value={form.workTypeId} onValueChange={v => setForm({ ...form, workTypeId: v })}>
                  <SelectTrigger><SelectValue placeholder="اختر" /></SelectTrigger>
                  <SelectContent>{workTypes.map(w => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>عدد القطع</Label><Input type="number" value={form.quantity} onChange={e => setForm({ ...form, quantity: Number(e.target.value) })} min={1} /></div>
              <div className="flex gap-2">
                <div className="flex-1"><Label>تاريخ التسليم</Label><Input type="date" value={form.sentDate} onChange={e => setForm({ ...form, sentDate: e.target.value })} /></div>
                <div className="flex-1"><Label>تاريخ الاستلام المتوقع</Label><Input type="date" value={form.dueDate} onChange={e => setForm({ ...form, dueDate: e.target.value })} /></div>
              </div>
              <div><Label>ملاحظات</Label><Input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
              <Button onClick={handleSubmit} className="w-full">إضافة الطلب</Button>
            </div>
          </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-muted/30 p-4">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Calendar className="w-4 h-4" />
          <span className="text-sm font-medium">تصفية حسب التاريخ:</span>
        </div>
        <Select value={dateFilterMode} onValueChange={(v) => setDateFilterMode(v as DateFilterMode)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">الكل</SelectItem>
            <SelectItem value="today">اليوم</SelectItem>
            <SelectItem value="last7">آخر 7 أيام</SelectItem>
            <SelectItem value="last30">آخر 30 يوم</SelectItem>
            <SelectItem value="day">يوم محدد</SelectItem>
            <SelectItem value="month">شهر محدد</SelectItem>
            <SelectItem value="year">سنة محددة</SelectItem>
          </SelectContent>
        </Select>
        {dateFilterMode === 'day' && (
          <div className="flex items-center gap-2">
            <Select value={String(safeFilterDay)} onValueChange={(v) => setFilterDay(Number(v))}>
              <SelectTrigger className="w-[80px]"><SelectValue placeholder="اليوم" /></SelectTrigger>
              <SelectContent>
                {Array.from({ length: daysInFilterMonth }, (_, i) => i + 1).map((d) => (
                  <SelectItem key={d} value={String(d)}>{d}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={String(filterMonth)} onValueChange={(v) => setFilterMonth(Number(v))}>
              <SelectTrigger className="w-[130px]"><SelectValue placeholder="الشهر" /></SelectTrigger>
              <SelectContent>
                {MONTHS_AR.map((name, i) => (
                  <SelectItem key={i} value={String(i + 1)}>{name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={String(filterYear)} onValueChange={(v) => setFilterYear(Number(v))}>
              <SelectTrigger className="w-[100px]"><SelectValue placeholder="السنة" /></SelectTrigger>
              <SelectContent>
                {Array.from({ length: 6 }, (_, i) => currentYear - i).map((y) => (
                  <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        {dateFilterMode === 'month' && (
          <div className="flex items-center gap-2">
            <Select value={String(filterMonth)} onValueChange={(v) => setFilterMonth(Number(v))}>
              <SelectTrigger className="w-[130px]"><SelectValue placeholder="الشهر" /></SelectTrigger>
              <SelectContent>
                {MONTHS_AR.map((name, i) => (
                  <SelectItem key={i} value={String(i + 1)}>{name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={String(filterYear)} onValueChange={(v) => setFilterYear(Number(v))}>
              <SelectTrigger className="w-[100px]"><SelectValue placeholder="السنة" /></SelectTrigger>
              <SelectContent>
                {Array.from({ length: 6 }, (_, i) => currentYear - i).map((y) => (
                  <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        {dateFilterMode === 'year' && (
          <Select value={String(filterYear)} onValueChange={(v) => setFilterYear(Number(v))}>
            <SelectTrigger className="w-[120px]"><SelectValue placeholder="السنة" /></SelectTrigger>
            <SelectContent>
              {Array.from({ length: 6 }, (_, i) => currentYear - i).map((y) => (
                <SelectItem key={y} value={String(y)}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <span className="text-sm text-muted-foreground ms-auto">
          النتيجة: {filteredOrders.length} طلب
          {viewMode === 'active' && (
            <span className="me-2 text-muted-foreground/80">(قيد الانتظار)</span>
          )}
          {viewMode === 'archive' && (
            <span className="me-2 text-muted-foreground/80">(السجل)</span>
          )}
        </span>
      </div>

      <div className="bg-card rounded-xl border border-border overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-start p-3 font-medium">#</th>
              <th className="text-start p-3 font-medium">المريض</th>
              <th className="text-start p-3 font-medium">المخبر</th>
              <th className="text-start p-3 font-medium">العمل</th>
              <th className="text-start p-3 font-medium">حالة التسليم</th>
              <th className="text-start p-3 font-medium">الحالة</th>
              <th className="text-start p-3 font-medium">ملاحظات</th>
              <th className="text-start p-3 font-medium">إجراء</th>
            </tr>
          </thead>
          <tbody>
            {filteredOrders.length === 0 ? (
              <tr>
                <td colSpan={8} className="p-8 text-center text-muted-foreground">
                  {viewMode === 'active'
                    ? (dateFilterMode === 'all' ? 'لا توجد طلبات قيد الانتظار' : 'لا توجد طلبات قيد الانتظار في الفترة المحددة')
                    : (dateFilterMode === 'all' ? 'لا توجد طلبات في السجل' : 'لا توجد طلبات في السجل للفترة المحددة')}
                </td>
              </tr>
            ) : filteredOrders.map(o => (
              <tr key={o.id} className="border-b border-border hover:bg-muted/30">
                <td className="p-3">{o.orderNo}</td>
                <td className="p-3 font-medium">{getPatientName(o.patientId)}</td>
                <td className="p-3">{getLabName(o.labId)}</td>
                <td className="p-3">{getWorkTypeName(o.workTypeId)}</td>
                <td className="p-3">
                  {(() => {
                    const delivery = getDeliveryStatus(o.dueDate);
                    return (
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${deliveryBadgeClasses[delivery.status]}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${deliveryDotClasses[delivery.status]}`} />
                        {delivery.label}
                      </span>
                    );
                  })()}
                </td>
                <td className="p-3"><Badge className={statusColors[o.status]}>{statusLabels[o.status]}</Badge></td>
                <td className="p-3">
                  {o.notes && (
                    <Popover>
                      <PopoverTrigger asChild><Button variant="ghost" size="icon"><MessageSquare className="w-4 h-4" /></Button></PopoverTrigger>
                      <PopoverContent className="w-64 text-sm">{o.notes}</PopoverContent>
                    </Popover>
                  )}
                </td>
                <td className="p-3 flex gap-1 flex-wrap">
                  {o.status === 'pending' && (
                    <>
                      <Button size="sm" variant="outline" onClick={() => openEdit(o)} className="gap-1">
                        <Pencil className="w-3.5 h-3.5" /> تعديل
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => { setActiveOrderId(o.id); setCost(0); setReceiveOpen(true); }}>استلام</Button>
                      <Button size="sm" variant="ghost" onClick={() => cancelOrder(o.id)} className="text-destructive">إلغاء</Button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={receiveOpen} onOpenChange={setReceiveOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>تأكيد الاستلام</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>تكلفة العمل</Label><Input type="number" value={cost} onChange={e => setCost(Number(e.target.value))} /></div>
            <Button onClick={handleReceive} className="w-full">تأكيد الاستلام</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={editOpen} onOpenChange={(open) => { setEditOpen(open); if (!open) setEditingOrder(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>تعديل الطلب</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>تاريخ التسليم</Label><Input type="date" value={form.sentDate} onChange={e => setForm({ ...form, sentDate: e.target.value })} /></div>
            <div><Label>تاريخ الاستلام المتوقع</Label><Input type="date" value={form.dueDate} onChange={e => setForm({ ...form, dueDate: e.target.value })} /></div>
            <div><Label>عدد القطع</Label><Input type="number" value={form.quantity} onChange={e => setForm({ ...form, quantity: Number(e.target.value) })} min={1} /></div>
            <div><Label>ملاحظات</Label><Input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="ملاحظات..." /></div>
            <Button onClick={handleEditSubmit} className="w-full">حفظ التعديلات</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
