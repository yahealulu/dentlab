import { useParams } from 'react-router-dom';
import { getStore, STORAGE_KEYS } from '@/lib/storage';
import type { Patient, PatientTreatment, Invoice } from '@/types';
import { Badge } from '@/components/ui/badge';

export default function SharePatientView() {
  const { token } = useParams<{ token: string }>();
  const tokens = getStore<Record<string, string>>(STORAGE_KEYS.shareTokens, {});
  const patientId = token ? Object.entries(tokens).find(([, t]) => t === token)?.[0] : null;
  const patients = getStore<Patient[]>(STORAGE_KEYS.patients, []);
  const patient = patientId ? patients.find(p => p.id === patientId) : null;
  const treatments = patientId
    ? getStore<PatientTreatment[]>(STORAGE_KEYS.patientTreatments, []).filter(t => t.patientId === patientId)
    : [];
  const invoices = patientId
    ? getStore<Invoice[]>(STORAGE_KEYS.invoices, []).filter(i => i.patientId === patientId)
    : [];

  if (!token || !patient) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
        <div className="text-center text-muted-foreground">
          <p className="text-lg font-medium">رابط غير صالح</p>
          <p className="text-sm mt-2">انتهت صلاحية الرابط أو أنه غير صحيح.</p>
        </div>
      </div>
    );
  }

  const age = patient.birthDate
    ? Math.floor((Date.now() - new Date(patient.birthDate).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
    : new Date().getFullYear() - patient.birthYear;

  return (
    <div className="min-h-screen bg-muted/30 p-4 md:p-8" dir="rtl">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="bg-card rounded-xl border border-border p-6 shadow-sm">
          <h1 className="text-xl font-bold">{patient.fullName} {patient.distinctMark && <span className="text-primary">{patient.distinctMark}</span>}</h1>
          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mt-2">
            <span>رقم الملف: {patient.fileNo}</span>
            <span>العمر: {age} سنة</span>
            <span>الهاتف: <span dir="ltr">{patient.countryCode} {patient.phone}</span></span>
          </div>
          <p className="text-xs text-muted-foreground mt-4">عرض للقراءة فقط — تم المشاركة عبر رابط</p>
        </div>

        <div className="bg-card rounded-xl border border-border p-6">
          <h2 className="font-semibold mb-3">المعلومات الشخصية</h2>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div><span className="text-muted-foreground">الجنس:</span> {patient.gender === 'male' ? 'ذكر' : 'أنثى'}</div>
            <div><span className="text-muted-foreground">تاريخ الميلاد:</span> {patient.birthDate ?? patient.birthYear}</div>
            <div className="col-span-2"><span className="text-muted-foreground">العنوان:</span> {patient.address}</div>
            <div className="col-span-2"><span className="text-muted-foreground">التاريخ الطبي:</span> {patient.medicalHistory}</div>
          </div>
          {patient.tags.length > 0 && (
            <div className="flex gap-1 mt-2 flex-wrap">
              {patient.tags.map(t => <Badge key={t} variant="secondary" className="text-xs">#{t}</Badge>)}
            </div>
          )}
        </div>

        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <h2 className="font-semibold p-4 border-b border-border">العلاجات</h2>
          {treatments.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">لا توجد علاجات مسجلة</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-start p-3 font-medium">العلاج</th>
                  <th className="text-start p-3 font-medium">السن/الفك</th>
                  <th className="text-start p-3 font-medium">الحالة</th>
                </tr>
              </thead>
              <tbody>
                {treatments.map(t => (
                  <tr key={t.id} className="border-b border-border">
                    <td className="p-3">{t.treatmentName}</td>
                    <td className="p-3">{t.toothNumber ?? (t.jaw === 'upper' ? 'علوي' : t.jaw === 'lower' ? 'سفلي' : t.jaw === 'both' ? 'فكين' : '-')}</td>
                    <td className="p-3">{t.status === 'planned' ? 'مخطط' : t.status === 'in_progress' ? 'جاري' : 'مكتمل'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <h2 className="font-semibold p-4 border-b border-border">الفواتير</h2>
          {invoices.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">لا توجد فواتير</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-start p-3 font-medium">#</th>
                  <th className="text-start p-3 font-medium">التاريخ</th>
                  <th className="text-start p-3 font-medium">الإجمالي</th>
                  <th className="text-start p-3 font-medium">المدفوع</th>
                  <th className="text-start p-3 font-medium">الحالة</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map(inv => (
                  <tr key={inv.id} className="border-b border-border">
                    <td className="p-3">{inv.invoiceNo}</td>
                    <td className="p-3">{inv.date}</td>
                    <td className="p-3">{inv.total.toLocaleString()}</td>
                    <td className="p-3">{inv.paid.toLocaleString()}</td>
                    <td className="p-3">{inv.status === 'unpaid' ? 'غير مدفوعة' : inv.status === 'partial' ? 'جزئي' : 'مدفوعة'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
