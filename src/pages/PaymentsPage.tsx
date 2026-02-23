import { useState, useMemo } from 'react';
import { getStore, setStore, STORAGE_KEYS, formatReceiptNo } from '@/lib/storage';
import type { Payment, Patient, Invoice } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Pencil } from 'lucide-react';
import { format } from 'date-fns';

export default function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>(() => getStore(STORAGE_KEYS.payments, []));
  const patients = getStore<Patient[]>(STORAGE_KEYS.patients, []);

  const [dateFilter, setDateFilter] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [methodFilter, setMethodFilter] = useState('all');
  const [editOpen, setEditOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);
  const [editAmount, setEditAmount] = useState(0);

  const filtered = useMemo(() => {
    let result = payments.filter(p => p.date === dateFilter);
    if (methodFilter !== 'all') result = result.filter(p => p.method === methodFilter);
    return result;
  }, [payments, dateFilter, methodFilter]);

  const getPatientName = (id: string) => patients.find(p => p.id === id)?.fullName || '-';

  const handleEdit = () => {
    if (!editingPayment) return;
    const diff = editAmount - editingPayment.amount;
    const updated = payments.map(p => p.id === editingPayment.id ? { ...p, amount: editAmount } : p);
    setPayments(updated);
    setStore(STORAGE_KEYS.payments, updated);

    // Update invoice paid amount
    const invoices = getStore<Invoice[]>(STORAGE_KEYS.invoices, []);
    const updatedInv = invoices.map(i => {
      if (i.id === editingPayment.invoiceId) {
        const newPaid = i.paid + diff;
        return { ...i, paid: newPaid, status: (newPaid >= i.total ? 'paid' : newPaid > 0 ? 'partial' : 'unpaid') as any };
      }
      return i;
    });
    setStore(STORAGE_KEYS.invoices, updatedInv);
    setEditOpen(false);
    toast.success('تم تعديل الدفعة');
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">المدفوعات / الإيرادات</h1>
      <div className="flex gap-3 flex-wrap">
        <Input type="date" value={dateFilter} onChange={e => setDateFilter(e.target.value)} className="w-44" />
        <Select value={methodFilter} onValueChange={setMethodFilter}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">الكل</SelectItem>
            <SelectItem value="cash">نقد</SelectItem>
            <SelectItem value="other">أخرى</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="bg-card rounded-xl border border-border overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-start p-3 font-medium">رقم الإيصال</th>
              <th className="text-start p-3 font-medium">التاريخ</th>
              <th className="text-start p-3 font-medium">المريض</th>
              <th className="text-start p-3 font-medium">المبلغ</th>
              <th className="text-start p-3 font-medium">الطريقة</th>
              <th className="text-start p-3 font-medium">ملاحظات</th>
              <th className="text-start p-3 font-medium">تعديل</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">لا توجد مدفوعات</td></tr>
            ) : filtered.map(p => (
              <tr key={p.id} className="border-b border-border hover:bg-muted/30">
                <td className="p-3 text-muted-foreground">{formatReceiptNo(p.receiptNo)}</td>
                <td className="p-3">{p.date}</td>
                <td className="p-3 font-medium">{getPatientName(p.patientId)}</td>
                <td className="p-3 font-bold">{p.amount.toLocaleString()}</td>
                <td className="p-3">{p.method === 'cash' ? 'نقد' : 'أخرى'}</td>
                <td className="p-3 text-muted-foreground">{p.notes}</td>
                <td className="p-3">
                  <Button variant="ghost" size="icon" onClick={() => { setEditingPayment(p); setEditAmount(p.amount); setEditOpen(true); }}>
                    <Pencil className="w-4 h-4" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="bg-accent/50 rounded-xl p-4 text-lg font-bold">
        إجمالي اليوم: {filtered.reduce((s, p) => s + p.amount, 0).toLocaleString()}
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>تعديل الدفعة</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>المبلغ</Label><Input type="number" value={editAmount} onChange={e => setEditAmount(Number(e.target.value))} /></div>
            <Button onClick={handleEdit} className="w-full">حفظ</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
