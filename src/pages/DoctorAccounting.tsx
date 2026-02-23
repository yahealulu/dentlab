import { useState, useMemo } from 'react';
import { getStore, setStore, generateId, STORAGE_KEYS } from '@/lib/storage';
import type { Doctor, DoctorPayment, Invoice, Expense } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Plus, ArrowRight, Eye, ChevronLeft, ChevronRight, Check, DollarSign, Stethoscope } from 'lucide-react';
import { format, startOfMonth, endOfMonth, addMonths, subMonths } from 'date-fns';
import { ar } from 'date-fns/locale';

export default function DoctorAccounting() {
  const doctors = getStore<Doctor[]>(STORAGE_KEYS.doctors, []);
  const invoices = getStore<Invoice[]>(STORAGE_KEYS.invoices, []);
  const [doctorPayments, setDoctorPayments] = useState<DoctorPayment[]>(() => getStore(STORAGE_KEYS.doctorPayments, []));
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [payOpen, setPayOpen] = useState(false);
  const [form, setForm] = useState({ amount: 0, date: format(new Date(), 'yyyy-MM-dd'), notes: '' });
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // Track which treatments are "settled" (checked off by owner)
  const [settledTreatments, setSettledTreatments] = useState<string[]>(() => {
    try {
      const data = localStorage.getItem('settled_treatments');
      return data ? JSON.parse(data) : [];
    } catch { return []; }
  });

  const getDoctorRevenue = (id: string) => invoices.filter(i => i.doctorId === id).reduce((s, i) => s + i.total, 0);
  const getDoctorPaid = (id: string) => doctorPayments.filter(p => p.doctorId === id).reduce((s, p) => s + p.amount, 0);

  const handlePay = () => {
    if (!selectedDoctor || form.amount <= 0) { toast.error('أدخل المبلغ'); return; }
    const pay: DoctorPayment = { id: generateId(), doctorId: selectedDoctor.id, amount: form.amount, date: form.date, notes: form.notes, createdAt: new Date().toISOString() };
    const updated = [...doctorPayments, pay];
    setDoctorPayments(updated);
    setStore(STORAGE_KEYS.doctorPayments, updated);

    const expenses = getStore<Expense[]>(STORAGE_KEYS.expenses, []);
    expenses.push({ id: generateId(), type: 'مدفوعات أطباء', customType: `دفعة للطبيب ${selectedDoctor.name}`, amount: form.amount, date: form.date, notes: form.notes, createdAt: new Date().toISOString() });
    setStore(STORAGE_KEYS.expenses, expenses);

    setPayOpen(false);
    setForm({ amount: 0, date: format(new Date(), 'yyyy-MM-dd'), notes: '' });
    toast.success('تم تسجيل الدفعة');
  };

  const toggleSettled = (invoiceId: string) => {
    const updated = settledTreatments.includes(invoiceId)
      ? settledTreatments.filter(id => id !== invoiceId)
      : [...settledTreatments, invoiceId];
    setSettledTreatments(updated);
    localStorage.setItem('settled_treatments', JSON.stringify(updated));
  };

  const monthStart = format(startOfMonth(currentMonth), 'yyyy-MM-dd');
  const monthEnd = format(endOfMonth(currentMonth), 'yyyy-MM-dd');

  if (selectedDoctor) {
    const docInvoices = invoices
      .filter(i => i.doctorId === selectedDoctor.id && i.date >= monthStart && i.date <= monthEnd)
      .sort((a, b) => a.date.localeCompare(b.date));
    const docPayments = doctorPayments.filter(p => p.doctorId === selectedDoctor.id);
    const monthTotal = docInvoices.reduce((s, i) => s + i.total, 0);

    return (
      <div className="space-y-6">
        <button onClick={() => setSelectedDoctor(null)} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowRight className="w-4 h-4" /> العودة
        </button>

        {/* Doctor Header */}
        <div className="bg-card rounded-xl border border-border p-6">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center">
              <Stethoscope className="w-7 h-7 text-primary" />
            </div>
            <div className="flex-1">
              <h1 className="text-xl font-bold">{selectedDoctor.name}</h1>
              <p className="text-sm text-muted-foreground">{selectedDoctor.specialty}</p>
            </div>
            <div className="flex gap-4 text-center">
              <div className="px-4 py-2 rounded-xl bg-success/10">
                <p className="text-lg font-bold text-success">{getDoctorRevenue(selectedDoctor.id).toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">إجمالي الإيرادات</p>
              </div>
              <div className="px-4 py-2 rounded-xl bg-destructive/10">
                <p className="text-lg font-bold text-destructive">{getDoctorPaid(selectedDoctor.id).toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">إجمالي المدفوع</p>
              </div>
            </div>
          </div>
        </div>

        <Tabs defaultValue="treatments">
          <TabsList className="bg-muted/50 p-1 rounded-xl">
            <TabsTrigger value="treatments">العلاجات المنجزة</TabsTrigger>
            <TabsTrigger value="payments">المدفوعات</TabsTrigger>
          </TabsList>

          <TabsContent value="treatments" className="space-y-4">
            {/* Month Navigator */}
            <div className="flex items-center gap-3 bg-card rounded-xl border border-border p-3">
              <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
                <ChevronRight className="w-4 h-4" />
              </Button>
              <span className="text-sm font-semibold min-w-[140px] text-center">
                {format(currentMonth, 'MMMM yyyy', { locale: ar })}
              </span>
              <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={() => setCurrentMonth(new Date())}>الشهر الحالي</Button>
              <div className="flex-1" />
              <div className="text-sm">
                إجمالي الشهر: <span className="font-bold text-primary">{monthTotal.toLocaleString()}</span>
              </div>
            </div>

            <div className="bg-card rounded-xl border border-border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-start p-3 font-medium w-12">✓</th>
                    <th className="text-start p-3 font-medium">#</th>
                    <th className="text-start p-3 font-medium">العلاج</th>
                    <th className="text-start p-3 font-medium">قيمة الفاتورة</th>
                    <th className="text-start p-3 font-medium">المدفوع</th>
                    <th className="text-start p-3 font-medium">التاريخ</th>
                    <th className="text-start p-3 font-medium">الحالة</th>
                  </tr>
                </thead>
                <tbody>
                  {docInvoices.length === 0 ? (
                    <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">لا توجد علاجات في هذا الشهر</td></tr>
                  ) : docInvoices.map(i => (
                    <tr key={i.id} className={`border-b border-border transition-colors ${settledTreatments.includes(i.id) ? 'bg-success/5' : 'hover:bg-muted/30'}`}>
                      <td className="p-3">
                        <button
                          onClick={() => toggleSettled(i.id)}
                          className={`w-7 h-7 rounded-lg border-2 flex items-center justify-center transition-all ${settledTreatments.includes(i.id) ? 'bg-success border-success text-success-foreground' : 'border-border hover:border-primary'}`}
                        >
                          {settledTreatments.includes(i.id) && <Check className="w-4 h-4" />}
                        </button>
                      </td>
                      <td className="p-3 text-muted-foreground">{i.invoiceNo}</td>
                      <td className="p-3 font-medium">{i.treatmentName}</td>
                      <td className="p-3 font-bold">{i.total.toLocaleString()}</td>
                      <td className="p-3">{i.paid.toLocaleString()}</td>
                      <td className="p-3">{i.date}</td>
                      <td className="p-3">
                        <Badge className={i.status === 'paid' ? 'bg-success text-success-foreground' : i.status === 'partial' ? 'bg-warning text-warning-foreground' : 'bg-destructive text-destructive-foreground'}>
                          {i.status === 'paid' ? 'مدفوعة' : i.status === 'partial' ? 'جزئي' : 'غير مدفوعة'}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TabsContent>

          <TabsContent value="payments" className="space-y-4">
            <Button size="sm" onClick={() => setPayOpen(true)}>
              <Plus className="w-4 h-4 ml-1" /> إضافة دفعة
            </Button>
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
                  {docPayments.length === 0 ? (
                    <tr><td colSpan={3} className="p-8 text-center text-muted-foreground">لا توجد مدفوعات</td></tr>
                  ) : docPayments.sort((a, b) => b.date.localeCompare(a.date)).map(p => (
                    <tr key={p.id} className="border-b border-border hover:bg-muted/30">
                      <td className="p-3">{p.date}</td>
                      <td className="p-3 font-bold text-destructive">{p.amount.toLocaleString()}</td>
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
            <DialogHeader><DialogTitle>إضافة دفعة للطبيب</DialogTitle></DialogHeader>
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
      <div className="flex items-center gap-3">
        <div className="p-3 rounded-xl bg-primary/10">
          <DollarSign className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">حسابات الأطباء</h1>
          <p className="text-sm text-muted-foreground">عرض العلاجات والفواتير والمدفوعات لكل طبيب</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {doctors.length === 0 ? (
          <div className="col-span-full bg-card rounded-xl border border-border p-12 text-center text-muted-foreground">
            لا يوجد أطباء - أضف أطباء من صفحة إدارة الأطباء
          </div>
        ) : doctors.map(d => {
          const revenue = getDoctorRevenue(d.id);
          const paid = getDoctorPaid(d.id);
          const treatmentCount = invoices.filter(i => i.doctorId === d.id).length;
          return (
            <div key={d.id} className="bg-card rounded-xl border border-border p-5 hover-lift cursor-pointer transition-all" onClick={() => setSelectedDoctor(d)}>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Stethoscope className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-bold">{d.name}</h3>
                  <p className="text-xs text-muted-foreground">{d.specialty}</p>
                </div>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">عدد العلاجات</span>
                  <span className="font-medium">{treatmentCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">إجمالي الإيرادات</span>
                  <span className="font-bold text-success">{revenue.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">إجمالي المدفوع له</span>
                  <span className="font-bold text-destructive">{paid.toLocaleString()}</span>
                </div>
              </div>
              <Button variant="outline" size="sm" className="w-full mt-4">
                <Eye className="w-4 h-4 ml-1" /> تفاصيل
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
