import { useState } from 'react';
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
import { Plus, MessageSquare, Search } from 'lucide-react';
import { format } from 'date-fns';

const statusLabels: Record<string, string> = { pending: 'قيد الانتظار', received: 'تم الاستلام', cancelled: 'ملغي' };
const statusColors: Record<string, string> = { pending: 'bg-warning text-warning-foreground', received: 'bg-success text-success-foreground', cancelled: 'bg-destructive text-destructive-foreground' };

export default function LabOrders() {
  const [orders, setOrders] = useState<LabOrder[]>(() => getStore(STORAGE_KEYS.labOrders, []));
  const labs = getStore<Lab[]>(STORAGE_KEYS.labs, []).filter(l => l.isActive);
  const workTypes = getStore<LabWorkType[]>(STORAGE_KEYS.labWorkTypes, []);
  const patients = getStore<Patient[]>(STORAGE_KEYS.patients, []);

  const [open, setOpen] = useState(false);
  const [receiveOpen, setReceiveOpen] = useState(false);
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null);
  const [cost, setCost] = useState(0);
  const [searchP, setSearchP] = useState('');

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

  const getPatientName = (id: string) => patients.find(p => p.id === id)?.fullName || '-';
  const getLabName = (id: string) => labs.find(l => l.id === id)?.name || getStore<Lab[]>(STORAGE_KEYS.labs, []).find(l => l.id === id)?.name || '-';
  const getWorkTypeName = (id: string) => workTypes.find(w => w.id === id)?.name || '-';

  const filteredPatients = patients.filter(p => p.fullName.includes(searchP) || p.phone.includes(searchP)).slice(0, 8);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">طلبات المخابر</h1>
        <Dialog open={open} onOpenChange={setOpen}>
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
      </div>

      <div className="bg-card rounded-xl border border-border overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-start p-3 font-medium">#</th>
              <th className="text-start p-3 font-medium">المريض</th>
              <th className="text-start p-3 font-medium">المخبر</th>
              <th className="text-start p-3 font-medium">العمل</th>
              <th className="text-start p-3 font-medium">الاستلام</th>
              <th className="text-start p-3 font-medium">الحالة</th>
              <th className="text-start p-3 font-medium">ملاحظات</th>
              <th className="text-start p-3 font-medium">إجراء</th>
            </tr>
          </thead>
          <tbody>
            {orders.length === 0 ? (
              <tr><td colSpan={8} className="p-8 text-center text-muted-foreground">لا توجد طلبات</td></tr>
            ) : orders.sort((a, b) => b.orderNo - a.orderNo).map(o => (
              <tr key={o.id} className="border-b border-border hover:bg-muted/30">
                <td className="p-3">{o.orderNo}</td>
                <td className="p-3 font-medium">{getPatientName(o.patientId)}</td>
                <td className="p-3">{getLabName(o.labId)}</td>
                <td className="p-3">{getWorkTypeName(o.workTypeId)}</td>
                <td className="p-3">{o.dueDate}</td>
                <td className="p-3"><Badge className={statusColors[o.status]}>{statusLabels[o.status]}</Badge></td>
                <td className="p-3">
                  {o.notes && (
                    <Popover>
                      <PopoverTrigger asChild><Button variant="ghost" size="icon"><MessageSquare className="w-4 h-4" /></Button></PopoverTrigger>
                      <PopoverContent className="w-64 text-sm">{o.notes}</PopoverContent>
                    </Popover>
                  )}
                </td>
                <td className="p-3 flex gap-1">
                  {o.status === 'pending' && (
                    <>
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
    </div>
  );
}
