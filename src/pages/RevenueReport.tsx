import { useState, useMemo } from 'react';
import { getStore, STORAGE_KEYS } from '@/lib/storage';
import type { Payment, Expense, DoctorPayment, LabPayment } from '@/types';
import { DollarSign, TrendingUp, TrendingDown } from 'lucide-react';
import { format, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns';

export default function RevenueReport() {
  const [period, setPeriod] = useState<'daily' | 'monthly' | 'yearly'>('monthly');
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  const payments = getStore<Payment[]>(STORAGE_KEYS.payments, []);
  const expenses = getStore<Expense[]>(STORAGE_KEYS.expenses, []);
  const doctorPayments = getStore<DoctorPayment[]>(STORAGE_KEYS.doctorPayments, []);
  const labPayments = getStore<LabPayment[]>(STORAGE_KEYS.labPayments, []);

  const { dateFrom, dateTo } = useMemo(() => {
    const d = new Date(selectedDate);
    if (period === 'daily') return { dateFrom: selectedDate, dateTo: selectedDate };
    if (period === 'monthly') return { dateFrom: format(startOfMonth(d), 'yyyy-MM-dd'), dateTo: format(endOfMonth(d), 'yyyy-MM-dd') };
    return { dateFrom: format(startOfYear(d), 'yyyy-MM-dd'), dateTo: format(endOfYear(d), 'yyyy-MM-dd') };
  }, [period, selectedDate]);

  const totalRevenue = payments.filter(p => p.date >= dateFrom && p.date <= dateTo).reduce((s, p) => s + p.amount, 0);
  const totalExpenses = expenses.filter(e => e.date >= dateFrom && e.date <= dateTo).reduce((s, e) => s + e.amount, 0);
  const totalDoctorPay = doctorPayments.filter(p => p.date >= dateFrom && p.date <= dateTo).reduce((s, p) => s + p.amount, 0);
  const totalLabPay = labPayments.filter(p => p.date >= dateFrom && p.date <= dateTo).reduce((s, p) => s + p.amount, 0);

  const totalAllExpenses = totalExpenses + totalDoctorPay + totalLabPay;
  const netProfit = totalRevenue - totalAllExpenses;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">الأرباح والتقارير</h1>

      <div className="flex gap-3 flex-wrap items-center">
        <div className="flex gap-1 bg-muted/50 p-1 rounded-lg">
          {(['daily', 'monthly', 'yearly'] as const).map(p => (
            <button key={p} onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium ${period === p ? 'bg-card shadow-sm' : 'text-muted-foreground'}`}>
              {p === 'daily' ? 'يومي' : p === 'monthly' ? 'شهري' : 'سنوي'}
            </button>
          ))}
        </div>
        <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)}
          className="border border-input rounded-lg px-3 py-1.5 text-sm bg-background" />
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="stat-card">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-success/10"><TrendingUp className="w-5 h-5 text-success" /></div>
            <span className="text-sm text-muted-foreground">إجمالي الإيرادات</span>
          </div>
          <p className="text-2xl font-bold text-success">{totalRevenue.toLocaleString()}</p>
        </div>

        <div className="stat-card">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-destructive/10"><TrendingDown className="w-5 h-5 text-destructive" /></div>
            <span className="text-sm text-muted-foreground">إجمالي المصاريف</span>
          </div>
          <p className="text-2xl font-bold text-destructive">{totalAllExpenses.toLocaleString()}</p>
          <div className="text-xs text-muted-foreground mt-1 space-y-0.5">
            <div>مصاريف عامة: {totalExpenses.toLocaleString()}</div>
            <div>أطباء: {totalDoctorPay.toLocaleString()}</div>
            <div>مخابر: {totalLabPay.toLocaleString()}</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-primary/10"><DollarSign className="w-5 h-5 text-primary" /></div>
            <span className="text-sm text-muted-foreground">صافي الربح</span>
          </div>
          <p className={`text-2xl font-bold ${netProfit >= 0 ? 'text-success' : 'text-destructive'}`}>
            {netProfit.toLocaleString()}
          </p>
        </div>
      </div>

      {/* Formula */}
      <div className="bg-card rounded-xl border border-border p-6">
        <h3 className="font-semibold mb-3">معادلة صافي الربح</h3>
        <div className="bg-muted/50 rounded-lg p-4 text-center text-sm">
          <span className="text-success font-bold">إيرادات المرضى ({totalRevenue.toLocaleString()})</span>
          {' − ('}
          <span className="text-destructive">مصاريف عامة ({totalExpenses.toLocaleString()})</span>
          {' + '}
          <span className="text-destructive">أطباء ({totalDoctorPay.toLocaleString()})</span>
          {' + '}
          <span className="text-destructive">مخابر ({totalLabPay.toLocaleString()})</span>
          {') = '}
          <span className={`font-bold ${netProfit >= 0 ? 'text-success' : 'text-destructive'}`}>{netProfit.toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
}
