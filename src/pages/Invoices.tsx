import { useState, useMemo } from 'react';
import { getStore, STORAGE_KEYS, formatInvoiceNo } from '@/lib/storage';
import type { Invoice, Patient, Doctor, Payment } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Printer, Eye } from 'lucide-react';
import { format } from 'date-fns';

export default function InvoicesPage() {
  const invoices = getStore<Invoice[]>(STORAGE_KEYS.invoices, []);
  const patients = getStore<Patient[]>(STORAGE_KEYS.patients, []);
  const doctors = getStore<Doctor[]>(STORAGE_KEYS.doctors, []);
  const payments = getStore<Payment[]>(STORAGE_KEYS.payments, []);

  const [dateFrom, setDateFrom] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [dateTo, setDateTo] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [detailsInvoice, setDetailsInvoice] = useState<Invoice | null>(null);

  const filtered = useMemo(() =>
    invoices.filter(i => i.date >= dateFrom && i.date <= dateTo).sort((a, b) => b.invoiceNo - a.invoiceNo),
    [invoices, dateFrom, dateTo]
  );

  const getPatientName = (id: string) => patients.find(p => p.id === id)?.fullName || '-';
  const getDoctorName = (id: string) => doctors.find(d => d.id === id)?.name || '-';
  const getPaymentsForInvoice = (invoiceId: string) => payments.filter(p => p.invoiceId === invoiceId);

  const statusColors: Record<string, string> = {
    unpaid: 'bg-destructive text-destructive-foreground',
    partial: 'bg-warning text-warning-foreground',
    paid: 'bg-success text-success-foreground',
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">الفواتير</h1>
      <div className="flex gap-3 items-center flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-sm">من:</span>
          <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="w-40" />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm">إلى:</span>
          <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="w-40" />
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-start p-3 font-medium">#</th>
              <th className="text-start p-3 font-medium">المريض</th>
              <th className="text-start p-3 font-medium">الطبيب</th>
              <th className="text-start p-3 font-medium">التاريخ</th>
              <th className="text-start p-3 font-medium">الإجمالي</th>
              <th className="text-start p-3 font-medium">المدفوع</th>
              <th className="text-start p-3 font-medium">المتبقي</th>
              <th className="text-start p-3 font-medium">الحالة</th>
              <th className="text-start p-3 font-medium">إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={9} className="p-8 text-center text-muted-foreground">لا توجد فواتير</td></tr>
            ) : filtered.map(inv => (
              <tr key={inv.id} className="border-b border-border hover:bg-muted/30">
                <td className="p-3">{formatInvoiceNo(inv.invoiceNo)}</td>
                <td className="p-3 font-medium">{getPatientName(inv.patientId)}</td>
                <td className="p-3">{getDoctorName(inv.doctorId)}</td>
                <td className="p-3">{inv.date}</td>
                <td className="p-3">{inv.total.toLocaleString()}</td>
                <td className="p-3">{inv.paid.toLocaleString()}</td>
                <td className="p-3">{(inv.total - inv.paid).toLocaleString()}</td>
                <td className="p-3"><Badge className={statusColors[inv.status]}>{inv.status === 'unpaid' ? 'غير مدفوعة' : inv.status === 'partial' ? 'جزئي' : 'مدفوعة'}</Badge></td>
                <td className="p-3 flex gap-1">
                  <Button variant="ghost" size="icon" onClick={() => setDetailsInvoice(inv)} title="عرض التفاصيل"><Eye className="w-4 h-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => window.print()}><Printer className="w-4 h-4" /></Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={!!detailsInvoice} onOpenChange={open => !open && setDetailsInvoice(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>تفاصيل الفاتورة</DialogTitle></DialogHeader>
          {detailsInvoice && (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <div><span className="text-muted-foreground">رقم الفاتورة:</span> {formatInvoiceNo(detailsInvoice.invoiceNo)}</div>
                <div><span className="text-muted-foreground">التاريخ:</span> {detailsInvoice.date}</div>
                <div><span className="text-muted-foreground">المريض:</span> {getPatientName(detailsInvoice.patientId)}</div>
                <div><span className="text-muted-foreground">الطبيب:</span> {getDoctorName(detailsInvoice.doctorId)}</div>
                <div><span className="text-muted-foreground">العلاج:</span> {detailsInvoice.treatmentName}</div>
                <div><span className="text-muted-foreground">السعر الأساسي:</span> {detailsInvoice.basePrice.toLocaleString()}</div>
                <div><span className="text-muted-foreground">رسوم تشخيص:</span> {detailsInvoice.diagnosticFee.toLocaleString()}</div>
                <div><span className="text-muted-foreground">الخصم:</span> {detailsInvoice.discount.toLocaleString()}</div>
                <div><span className="text-muted-foreground">الإجمالي:</span> {detailsInvoice.total.toLocaleString()}</div>
                <div><span className="text-muted-foreground">المدفوع:</span> {detailsInvoice.paid.toLocaleString()}</div>
                <div><span className="text-muted-foreground">المتبقي:</span> {(detailsInvoice.total - detailsInvoice.paid).toLocaleString()}</div>
                <div><span className="text-muted-foreground">الحالة:</span> <Badge className={statusColors[detailsInvoice.status]}>{detailsInvoice.status === 'unpaid' ? 'غير مدفوعة' : detailsInvoice.status === 'partial' ? 'جزئي' : 'مدفوعة'}</Badge></div>
              </div>
              <div>
                <p className="font-medium mb-2">الدفعات المسجلة</p>
                {getPaymentsForInvoice(detailsInvoice.id).length === 0 ? (
                  <p className="text-muted-foreground">لا توجد دفعات</p>
                ) : (
                  <ul className="space-y-1">
                    {getPaymentsForInvoice(detailsInvoice.id).map(p => (
                      <li key={p.id} className="flex justify-between text-muted-foreground">
                        <span>{p.date}</span>
                        <span>{p.amount.toLocaleString()} — {p.method === 'cash' ? 'نقد' : 'أخرى'}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
