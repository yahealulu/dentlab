import { useState } from 'react';
import { getStore, setStore, generateId, STORAGE_KEYS } from '@/lib/storage';
import type { Expense } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Plus, X } from 'lucide-react';
import { format } from 'date-fns';

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>(() => getStore(STORAGE_KEYS.expenses, []));
  const [expenseTypes, setExpenseTypes] = useState<string[]>(() => getStore(STORAGE_KEYS.expenseTypes, []));
  const [open, setOpen] = useState(false);
  const [newType, setNewType] = useState('');

  const [form, setForm] = useState({ type: '', customType: '', amount: 0, date: format(new Date(), 'yyyy-MM-dd'), notes: '' });

  const save = (e: Expense[]) => { setExpenses(e); setStore(STORAGE_KEYS.expenses, e); };

  const handleSubmit = () => {
    if (!form.type || form.amount <= 0) { toast.error('يرجى ملء البيانات'); return; }
    if (form.type === 'مصاريف أخرى' && !form.customType) { toast.error('حدد نوع المصروف'); return; }
    save([...expenses, { id: generateId(), ...form, createdAt: new Date().toISOString() }]);
    setOpen(false);
    setForm({ type: '', customType: '', amount: 0, date: format(new Date(), 'yyyy-MM-dd'), notes: '' });
    toast.success('تم إضافة المصروف');
  };

  const addExpenseType = () => {
    if (!newType || expenseTypes.length >= 10) return;
    const updated = [...expenseTypes, newType];
    setExpenseTypes(updated);
    setStore(STORAGE_KEYS.expenseTypes, updated);
    setNewType('');
    toast.success('تم إضافة النوع');
  };

  const removeExpenseType = (index: number) => {
    const updated = expenseTypes.filter((_, i) => i !== index);
    setExpenseTypes(updated);
    setStore(STORAGE_KEYS.expenseTypes, updated);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">المصروفات العامة</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="w-4 h-4 ml-2" /> إضافة مصروف</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>إضافة مصروف</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>نوع المصروف</Label>
                <Select value={form.type} onValueChange={v => setForm({ ...form, type: v, customType: '' })}>
                  <SelectTrigger><SelectValue placeholder="اختر النوع" /></SelectTrigger>
                  <SelectContent>
                    {expenseTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    <SelectItem value="مصاريف أخرى">مصاريف أخرى</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {form.type === 'مصاريف أخرى' && (
                <div><Label>اسم المصروف</Label><Input value={form.customType} onChange={e => setForm({ ...form, customType: e.target.value })} /></div>
              )}
              <div><Label>المبلغ</Label><Input type="number" value={form.amount} onChange={e => setForm({ ...form, amount: Number(e.target.value) })} /></div>
              <div><Label>التاريخ</Label><Input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} /></div>
              <div><Label>ملاحظات</Label><Input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
              <Button onClick={handleSubmit} className="w-full">إضافة</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="bg-card rounded-xl border border-border overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-start p-3 font-medium">التاريخ</th>
              <th className="text-start p-3 font-medium">النوع</th>
              <th className="text-start p-3 font-medium">المبلغ</th>
              <th className="text-start p-3 font-medium">ملاحظات</th>
            </tr>
          </thead>
          <tbody>
            {expenses.length === 0 ? (
              <tr><td colSpan={4} className="p-8 text-center text-muted-foreground">لا توجد مصروفات</td></tr>
            ) : expenses.sort((a, b) => b.date.localeCompare(a.date)).map(e => (
              <tr key={e.id} className="border-b border-border hover:bg-muted/30">
                <td className="p-3">{e.date}</td>
                <td className="p-3 font-medium">{e.type === 'مصاريف أخرى' ? e.customType : e.type}</td>
                <td className="p-3 font-bold">{e.amount.toLocaleString()}</td>
                <td className="p-3 text-muted-foreground">{e.notes}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Expense Types Management */}
      <div className="bg-card rounded-xl border border-border p-6 space-y-4">
        <h2 className="text-lg font-semibold">أنواع المصروفات ({expenseTypes.length}/10)</h2>
        <div className="flex gap-2">
          <Input value={newType} onChange={e => setNewType(e.target.value)} placeholder="نوع جديد..." className="w-48" />
          <Button onClick={addExpenseType} size="sm" disabled={expenseTypes.length >= 10}><Plus className="w-4 h-4 ml-1" /> إضافة</Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {expenseTypes.map((t, i) => (
            <Badge key={i} variant="secondary" className="gap-1">
              {t}
              <X className="w-3 h-3 cursor-pointer" onClick={() => removeExpenseType(i)} />
            </Badge>
          ))}
        </div>
      </div>
    </div>
  );
}
