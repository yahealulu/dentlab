import { useState } from 'react';
import { getStore, setStore, generateId, STORAGE_KEYS } from '@/lib/storage';
import type { Lab, LabOrder, LabPayment, Expense } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Plus, ArrowRight, Eye } from 'lucide-react';
import { format } from 'date-fns';

export default function LabFinancials() {
  const labs = getStore<Lab[]>(STORAGE_KEYS.labs, []);
  const orders = getStore<LabOrder[]>(STORAGE_KEYS.labOrders, []);
  const [labPayments, setLabPayments] = useState<LabPayment[]>(() => getStore(STORAGE_KEYS.labPayments, []));
  const [selectedLab, setSelectedLab] = useState<Lab | null>(null);
  const [payOpen, setPayOpen] = useState(false);
  const [form, setForm] = useState({ amount: 0, date: format(new Date(), 'yyyy-MM-dd'), notes: '' });

  const getLabBalance = (labId: string) => {
    const totalCost = orders.filter(o => o.labId === labId && o.status === 'received' && o.cost).reduce((s, o) => s + (o.cost || 0), 0);
    const totalPaid = labPayments.filter(p => p.labId === labId).reduce((s, p) => s + p.amount, 0);
    return totalCost - totalPaid;
  };

  const handlePay = () => {
    if (!selectedLab || form.amount <= 0) { toast.error('أدخل المبلغ'); return; }
    const pay: LabPayment = { id: generateId(), labId: selectedLab.id, amount: form.amount, date: form.date, notes: form.notes, createdAt: new Date().toISOString() };
    const updated = [...labPayments, pay];
    setLabPayments(updated);
    setStore(STORAGE_KEYS.labPayments, updated);

    // Add to expenses
    const expenses = getStore<Expense[]>(STORAGE_KEYS.expenses, []);
    expenses.push({ id: generateId(), type: 'مصاريف مخابر', customType: `دفعة للمخبر ${selectedLab.name}`, amount: form.amount, date: form.date, notes: form.notes, createdAt: new Date().toISOString() });
    setStore(STORAGE_KEYS.expenses, expenses);

    setPayOpen(false);
    setForm({ amount: 0, date: format(new Date(), 'yyyy-MM-dd'), notes: '' });
    toast.success('تم تسجيل الدفعة');
  };

  if (selectedLab) {
    const labOrders = orders.filter(o => o.labId === selectedLab.id && o.status === 'received');
    const labPays = labPayments.filter(p => p.labId === selectedLab.id);

    return (
      <div className="space-y-6">
        <button onClick={() => setSelectedLab(null)} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowRight className="w-4 h-4" /> العودة
        </button>
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">حساب المخبر: {selectedLab.name}</h1>
          <div className="text-lg font-bold">
            المستحق: <span className={getLabBalance(selectedLab.id) > 0 ? 'text-destructive' : 'text-success'}>{getLabBalance(selectedLab.id).toLocaleString()}</span>
          </div>
        </div>

        <Tabs defaultValue="bills">
          <TabsList>
            <TabsTrigger value="bills">الأعمال</TabsTrigger>
            <TabsTrigger value="payments">المدفوعات</TabsTrigger>
          </TabsList>
          <TabsContent value="bills">
            <div className="bg-card rounded-xl border border-border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-start p-3 font-medium">#</th>
                    <th className="text-start p-3 font-medium">التاريخ</th>
                    <th className="text-start p-3 font-medium">التكلفة</th>
                  </tr>
                </thead>
                <tbody>
                  {labOrders.map(o => (
                    <tr key={o.id} className="border-b border-border">
                      <td className="p-3">{o.orderNo}</td>
                      <td className="p-3">{o.sentDate}</td>
                      <td className="p-3 font-bold">{(o.cost || 0).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TabsContent>
          <TabsContent value="payments" className="space-y-4">
            <Button size="sm" onClick={() => setPayOpen(true)}><Plus className="w-4 h-4 ml-1" /> إضافة دفعة</Button>
            <div className="bg-card rounded-xl border border-border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-start p-3 font-medium">التاريخ</th>
                    <th className="text-start p-3 font-medium">المبلغ</th>
                    <th className="text-start p-3 font-medium">ملاحظات</th>
                  </tr>
                </thead>
                <tbody>
                  {labPays.map(p => (
                    <tr key={p.id} className="border-b border-border">
                      <td className="p-3">{p.date}</td>
                      <td className="p-3 font-bold">{p.amount.toLocaleString()}</td>
                      <td className="p-3 text-muted-foreground">{p.notes}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TabsContent>
        </Tabs>

        <Dialog open={payOpen} onOpenChange={setPayOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>إضافة دفعة للمخبر</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label>المبلغ</Label><Input type="number" value={form.amount} onChange={e => setForm({ ...form, amount: Number(e.target.value) })} /></div>
              <div><Label>التاريخ</Label><Input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} /></div>
              <div><Label>ملاحظات</Label><Input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
              <Button onClick={handlePay} className="w-full">تسجيل الدفعة</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">حسابات المخابر</h1>
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-start p-3 font-medium">المخبر</th>
              <th className="text-start p-3 font-medium">المستحق للدفع</th>
              <th className="text-start p-3 font-medium">إجراء</th>
            </tr>
          </thead>
          <tbody>
            {labs.length === 0 ? (
              <tr><td colSpan={3} className="p-8 text-center text-muted-foreground">لا يوجد مخابر</td></tr>
            ) : labs.map(l => (
              <tr key={l.id} className="border-b border-border hover:bg-muted/30">
                <td className="p-3 font-medium">{l.name} {!l.isActive && <Badge variant="secondary">معطل</Badge>}</td>
                <td className="p-3 font-bold">{getLabBalance(l.id).toLocaleString()}</td>
                <td className="p-3">
                  <Button variant="outline" size="sm" onClick={() => setSelectedLab(l)}>
                    <Eye className="w-4 h-4 ml-1" /> كشف حساب
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
