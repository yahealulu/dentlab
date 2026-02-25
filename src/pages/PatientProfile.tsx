import { useState, useMemo, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getStore, setStore, generateId, getNextInvoiceNo, getNextReceiptNo, formatInvoiceNo, formatReceiptNo, STORAGE_KEYS } from '@/lib/storage';
import type { Patient, PatientTreatment, TreatmentGroup, Doctor, Invoice, Payment, Prescription, PatientFile, Appointment } from '@/types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Plus, Play, CheckCircle, FileText, Upload, Printer, ArrowRight, Share2 } from 'lucide-react';
import DentalChartCircular from '@/components/DentalChart/DentalChartCircular';
import { ALL_TEETH } from '@/components/DentalChart/constants';
import { format } from 'date-fns';

const VALID_TOOTH_SET = new Set(ALL_TEETH);
const isValidToothNumber = (value: string): boolean => {
  const num = parseInt(value, 10);
  return !isNaN(num) && VALID_TOOTH_SET.has(num);
};

export default function PatientProfile() {
  const { id } = useParams<{ id: string }>();
  const patients = getStore<Patient[]>(STORAGE_KEYS.patients, []);
  const patient = patients.find(p => p.id === id);
  const doctors = getStore<Doctor[]>(STORAGE_KEYS.doctors, []);
  const groups = getStore<TreatmentGroup[]>(STORAGE_KEYS.treatmentGroups, []);

  const [treatments, setTreatments] = useState<PatientTreatment[]>(() =>
    getStore<PatientTreatment[]>(STORAGE_KEYS.patientTreatments, []).filter(t => t.patientId === id)
  );
  const [invoices, setInvoices] = useState<Invoice[]>(() =>
    getStore<Invoice[]>(STORAGE_KEYS.invoices, []).filter(i => i.patientId === id)
  );
  const [payments, setPayments] = useState<Payment[]>(() =>
    getStore<Payment[]>(STORAGE_KEYS.payments, []).filter(p => p.patientId === id)
  );
  const [prescriptions, setPrescriptions] = useState<Prescription[]>(() =>
    getStore<Prescription[]>(STORAGE_KEYS.prescriptions, []).filter(p => p.patientId === id)
  );
  const [files, setFiles] = useState<PatientFile[]>(() =>
    getStore<PatientFile[]>(STORAGE_KEYS.patientFiles, []).filter(f => f.patientId === id)
  );
  const appointments = getStore<Appointment[]>(STORAGE_KEYS.appointments, []).filter(a => a.patientId === id);

  // Modals
  const [addTreatmentOpen, setAddTreatmentOpen] = useState(false);
  const [invoiceModalOpen, setInvoiceModalOpen] = useState(false);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [prescriptionOpen, setPrescriptionOpen] = useState(false);
  const [fileUploadOpen, setFileUploadOpen] = useState(false);
  const [sessionModalOpen, setSessionModalOpen] = useState(false);

  // Forms
  const [treatmentForm, setTreatmentForm] = useState({ groupId: '', treatmentId: '', toothNumber: '', jaw: '', effectType: '' as '' | 'tooth' | 'jaw', doctorId: '', isOld: false });
  const [invoiceForm, setInvoiceForm] = useState({ basePrice: 0, diagnosticFee: 0, discount: 0, discountType: 'fixed' as 'fixed' | 'percentage' });
  const [paymentForm, setPaymentForm] = useState({ invoiceId: '', amount: 0, method: 'cash' as 'cash' | 'other', date: format(new Date(), 'yyyy-MM-dd'), notes: '' });
  const [prescForm, setPrescForm] = useState({ name: '', dosage: '', type: '', duration: 7, notes: '' });
  const [fileForm, setFileForm] = useState({ title: '', notes: '', fileData: '', fileType: 'file' as 'file' | 'xray' });
  const [sessionForm, setSessionForm] = useState({ notes: '' });
  const [activeTreatmentId, setActiveTreatmentId] = useState<string | null>(null);
  const [chartTab, setChartTab] = useState<'planned' | 'in_progress' | 'completed'>('planned');

  if (!patient) return <div className="p-8 text-center">المريض غير موجود - <Link to="/patients" className="text-primary">العودة</Link></div>;

  const age = patient.birthDate
    ? Math.floor((Date.now() - new Date(patient.birthDate).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
    : new Date().getFullYear() - patient.birthYear;
  const visitCount = appointments.length;

  const selectedGroup = groups.find(g => g.id === treatmentForm.groupId);
  const unpaidOrPartialInvoices = useMemo(() => invoices.filter(i => i.status === 'unpaid' || i.status === 'partial'), [invoices]);

  const saveTreatments = (t: PatientTreatment[]) => {
    setTreatments(t);
    const all = getStore<PatientTreatment[]>(STORAGE_KEYS.patientTreatments, []).filter(x => x.patientId !== id);
    setStore(STORAGE_KEYS.patientTreatments, [...all, ...t]);
  };

  const saveInvoices = (inv: Invoice[]) => {
    setInvoices(inv);
    const all = getStore<Invoice[]>(STORAGE_KEYS.invoices, []).filter(x => x.patientId !== id);
    setStore(STORAGE_KEYS.invoices, [...all, ...inv]);
  };

  const savePayments = (pay: Payment[]) => {
    setPayments(pay);
    const all = getStore<Payment[]>(STORAGE_KEYS.payments, []).filter(x => x.patientId !== id);
    setStore(STORAGE_KEYS.payments, [...all, ...pay]);
  };

  // Add Treatment
  const handleAddTreatment = () => {
    if (!treatmentForm.groupId || !treatmentForm.treatmentId || !treatmentForm.doctorId) {
      toast.error('يرجى ملء جميع الحقول'); return;
    }
    const group = groups.find(g => g.id === treatmentForm.groupId)!;
    const treatment = group.treatments.find(t => t.id === treatmentForm.treatmentId)!;
    const isDynamic = group.effect === 'dynamic';
    const needsTooth = group.effect === 'tooth' || (isDynamic && treatmentForm.effectType === 'tooth');
    if (needsTooth) {
      if (!treatmentForm.toothNumber.trim()) {
        toast.error('رقم السن مطلوب'); return;
      }
      if (!isValidToothNumber(treatmentForm.toothNumber)) {
        toast.error('رقم السن غير صحيح. الأرقام المسموحة: 11-18، 21-28، 31-38، 41-48');
        return;
      }
    }
    const toothNumber = needsTooth && treatmentForm.toothNumber
      ? parseInt(treatmentForm.toothNumber) : null;
    const jaw = (group.effect === 'jaw' || group.effect === 'both_jaws' || (isDynamic && treatmentForm.effectType === 'jaw')) && treatmentForm.jaw
      ? (treatmentForm.jaw as 'upper' | 'lower' | 'both') : null;
    const newT: PatientTreatment = {
      id: generateId(), patientId: id!, groupId: treatmentForm.groupId, treatmentId: treatmentForm.treatmentId,
      treatmentName: treatment.name,
      toothNumber,
      jaw: jaw || null,
      status: treatmentForm.isOld ? 'completed' : 'planned',
      doctorId: treatmentForm.doctorId, invoiceId: null, sessions: [],
      isOldTreatment: treatmentForm.isOld, createdAt: new Date().toISOString(),
    };
    saveTreatments([...treatments, newT]);
    setAddTreatmentOpen(false);
    toast.success(treatmentForm.isOld ? 'تم إضافة علاج قديم' : 'تم إضافة العلاج');
    setTreatmentForm({ groupId: '', treatmentId: '', toothNumber: '', jaw: '', effectType: '', doctorId: '', isOld: false });
  };

  // Start Treatment (create invoice, move to in_progress)
  const startTreatment = (treatmentId: string) => {
    const t = treatments.find(x => x.id === treatmentId);
    if (!t) return;
    const group = groups.find(g => g.id === t.groupId);
    const treatmentItem = group?.treatments.find(x => x.id === t.treatmentId);
    setInvoiceForm({ basePrice: treatmentItem?.price || 0, diagnosticFee: 0, discount: 0, discountType: 'fixed' });
    setActiveTreatmentId(treatmentId);
    setInvoiceModalOpen(true);
  };

  const confirmStartTreatment = () => {
    if (!activeTreatmentId) return;
    const t = treatments.find(x => x.id === activeTreatmentId)!;
    let total = invoiceForm.basePrice + invoiceForm.diagnosticFee;
    if (invoiceForm.discountType === 'percentage') total -= total * (invoiceForm.discount / 100);
    else total -= invoiceForm.discount;
    total = Math.max(0, total);

    const inv: Invoice = {
      id: generateId(), invoiceNo: getNextInvoiceNo(), patientId: id!, doctorId: t.doctorId,
      treatmentId: activeTreatmentId, treatmentName: t.treatmentName,
      basePrice: invoiceForm.basePrice, diagnosticFee: invoiceForm.diagnosticFee,
      discount: invoiceForm.discount, discountType: invoiceForm.discountType,
      total, paid: 0, status: 'unpaid', date: format(new Date(), 'yyyy-MM-dd'),
      createdAt: new Date().toISOString(),
    };
    saveInvoices([...invoices, inv]);
    saveTreatments(treatments.map(x => x.id === activeTreatmentId ? { ...x, status: 'in_progress' as const, invoiceId: inv.id } : x));
    setInvoiceModalOpen(false);
    toast.success('تم بدء العلاج وإنشاء الفاتورة');
  };

  // Complete Treatment
  const completeTreatment = (treatmentId: string) => {
    saveTreatments(treatments.map(x => x.id === treatmentId ? { ...x, status: 'completed' as const } : x));
    toast.success('تم إنهاء العلاج');
  };

  // Add Session
  const addSession = () => {
    if (!activeTreatmentId) return;
    saveTreatments(treatments.map(x => x.id === activeTreatmentId ? {
      ...x, sessions: [...x.sessions, { id: generateId(), date: format(new Date(), 'yyyy-MM-dd'), notes: sessionForm.notes }],
    } : x));
    setSessionModalOpen(false);
    setSessionForm({ notes: '' });
    toast.success('تم إضافة الجلسة');
  };

  // Add Payment
  const handleAddPayment = () => {
    if (!paymentForm.invoiceId || paymentForm.amount <= 0) { toast.error('يرجى ملء البيانات'); return; }
    const pay: Payment = {
      id: generateId(), invoiceId: paymentForm.invoiceId, patientId: id!,
      amount: paymentForm.amount, method: paymentForm.method, date: paymentForm.date,
      notes: paymentForm.notes, receiptNo: getNextReceiptNo(), createdAt: new Date().toISOString(),
    };
    savePayments([...payments, pay]);

    // Update invoice
    const inv = invoices.find(i => i.id === paymentForm.invoiceId)!;
    const newPaid = inv.paid + paymentForm.amount;
    const newStatus = newPaid >= inv.total ? 'paid' : 'partial';
    saveInvoices(invoices.map(i => i.id === paymentForm.invoiceId ? { ...i, paid: newPaid, status: newStatus as any } : i));

    setPaymentModalOpen(false);
    setPaymentForm({ invoiceId: '', amount: 0, method: 'cash', date: format(new Date(), 'yyyy-MM-dd'), notes: '' });
    toast.success('تم إضافة الدفعة');
  };

  // Add Prescription
  const handleAddPrescription = () => {
    if (!prescForm.name) { toast.error('اسم الدواء مطلوب'); return; }
    const existing = prescriptions.find(p => p.date === format(new Date(), 'yyyy-MM-dd'));
    if (existing) {
      const updated = prescriptions.map(p => p.id === existing.id ? {
        ...p, medications: [...p.medications, { ...prescForm, duration: prescForm.duration }],
      } : p);
      setPrescriptions(updated);
      const all = getStore<Prescription[]>(STORAGE_KEYS.prescriptions, []).filter(x => x.patientId !== id);
      setStore(STORAGE_KEYS.prescriptions, [...all, ...updated]);
    } else {
      const newP: Prescription = {
        id: generateId(), patientId: id!, date: format(new Date(), 'yyyy-MM-dd'),
        medications: [{ ...prescForm, duration: prescForm.duration }],
      };
      const updated = [...prescriptions, newP];
      setPrescriptions(updated);
      const all = getStore<Prescription[]>(STORAGE_KEYS.prescriptions, []).filter(x => x.patientId !== id);
      setStore(STORAGE_KEYS.prescriptions, [...all, ...updated]);
    }
    setPrescriptionOpen(false);
    setPrescForm({ name: '', dosage: '', type: '', duration: 7, notes: '' });
    toast.success('تم إضافة الوصفة');
  };

  // File Upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setFileForm(f => ({ ...f, fileData: reader.result as string }));
    reader.readAsDataURL(file);
  };

  const saveFile = () => {
    if (!fileForm.fileData || !fileForm.title) { toast.error('العنوان والملف مطلوبان'); return; }
    const newFile: PatientFile = {
      id: generateId(), patientId: id!, fileData: fileForm.fileData,
      title: fileForm.title, notes: fileForm.notes, fileType: fileForm.fileType,
      createdAt: new Date().toISOString(),
    };
    const updated = [...files, newFile];
    setFiles(updated);
    const all = getStore<PatientFile[]>(STORAGE_KEYS.patientFiles, []).filter(x => x.patientId !== id);
    setStore(STORAGE_KEYS.patientFiles, [...all, ...updated]);
    setFileUploadOpen(false);
    setFileForm({ title: '', notes: '', fileData: '', fileType: 'file' });
    toast.success('تم رفع الملف');
  };

  const getDoctorName = (did: string) => doctors.find(d => d.id === did)?.name || '-';

  const statusColors: Record<string, string> = {
    unpaid: 'bg-destructive text-destructive-foreground',
    partial: 'bg-warning text-warning-foreground',
    paid: 'bg-success text-success-foreground',
  };

  const getToothTreatments = (toothNum: number) => treatments.filter(t => t.toothNumber === toothNum && t.status === chartTab);
  /** SVG fill/stroke classes for 2D dental chart. */
  const getToothColor = (toothNum: number) => {
    const tt = getToothTreatments(toothNum);
    if (tt.length === 0) return 'fill-muted stroke-border';
    if (chartTab === 'planned') return 'fill-primary/30 stroke-primary';
    if (chartTab === 'in_progress') return 'fill-amber-500/40 stroke-amber-600';
    return 'fill-emerald-500/40 stroke-emerald-600';
  };

  const jawOnlyTreatments = treatments.filter(t => !t.toothNumber && (t.jaw === 'upper' || t.jaw === 'lower' || t.jaw === 'both'));
  const treatmentListRef = useRef<HTMLTableSectionElement>(null);
  const [highlightTooth, setHighlightTooth] = useState<number | null>(null);

  const handleToothClick = (toothNumber: number) => {
    setHighlightTooth(toothNumber);
    const firstRow = treatmentListRef.current?.querySelector(`tr[data-tooth="${toothNumber}"]`);
    firstRow?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  };

  const unpaidInvoices = invoices.filter(i => i.status !== 'paid');

  const handleShareProfile = () => {
    const tokens = getStore<Record<string, string>>(STORAGE_KEYS.shareTokens, {});
    let token = tokens[id!];
    if (!token) {
      token = crypto.randomUUID?.() ?? `share-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      setStore(STORAGE_KEYS.shareTokens, { ...tokens, [id!]: token });
    }
    const base = (import.meta as any).env?.BASE_URL ?? '/';
    const url = `${window.location.origin}${base.replace(/\/$/, '')}/share/patient/${token}`;
    navigator.clipboard.writeText(url).then(() => toast.success('تم نسخ رابط العرض للقراءة فقط')).catch(() => toast.error('تعذر النسخ'));
  };

  return (
    <div className="space-y-6">
      {/* Back */}
      <Link to="/patients" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowRight className="w-4 h-4" /> العودة للقائمة
      </Link>

      {/* Header Card */}
      <div className="bg-card rounded-xl border border-border p-6 flex flex-wrap items-center gap-6">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-2xl font-bold text-primary">
          {patient.fullName.charAt(0)}
        </div>
        <div className="flex-1">
          <h1 className="text-xl font-bold">{patient.fullName} {patient.distinctMark && <span className="text-primary">{patient.distinctMark}</span>}</h1>
          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mt-1">
            <span>رقم الملف: {patient.fileNo}</span>
            <span>العمر: {age} سنة</span>
            <span>الزيارات: {visitCount}</span>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={handleShareProfile}>
          <Share2 className="w-4 h-4 ml-2" /> شارك الملف
        </Button>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="dental-chart" className="space-y-4">
        <TabsList className="flex flex-wrap h-auto gap-1 bg-muted/50 p-1 rounded-xl flex-row-reverse">
          <TabsTrigger value="personal">المعلومات</TabsTrigger>
          <TabsTrigger value="dental-chart">مخطط الأسنان</TabsTrigger>
          <TabsTrigger value="appointments">المواعيد</TabsTrigger>
          <TabsTrigger value="prescriptions">الوصفات</TabsTrigger>
          <TabsTrigger value="invoices">الفواتير</TabsTrigger>
          <TabsTrigger value="payments">الدفعات</TabsTrigger>
          <TabsTrigger value="files">الملفات</TabsTrigger>
          <TabsTrigger value="logs">السجلات</TabsTrigger>
          <TabsTrigger value="xray">الأشعة</TabsTrigger>
        </TabsList>

        {/* Tab 1: Personal Info */}
        <TabsContent value="personal">
          <div className="bg-card rounded-xl border border-border p-6 space-y-3 text-sm">
            <div className="grid grid-cols-2 gap-4">
              <div><span className="text-muted-foreground">الهاتف:</span> <span dir="ltr">{patient.countryCode} {patient.phone}</span></div>
              <div><span className="text-muted-foreground">الجنس:</span> {patient.gender === 'male' ? 'ذكر' : 'أنثى'}</div>
              <div><span className="text-muted-foreground">تاريخ الميلاد:</span> {patient.birthDate ?? (patient.birthYear ? `${patient.birthYear}` : '-')}</div>
              <div><span className="text-muted-foreground">العنوان:</span> {patient.address}</div>
            </div>
            <div><span className="text-muted-foreground">التاريخ الطبي:</span> {patient.medicalHistory}</div>
            <div className="flex gap-1">{patient.tags.map(t => <Badge key={t} variant="secondary">#{t}</Badge>)}</div>
          </div>
        </TabsContent>

        {/* Tab 2: Dental Chart */}
        <TabsContent value="dental-chart" className="space-y-4">
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <div className="flex flex-row-reverse gap-1 bg-muted/50 p-1 rounded-lg">
              {(['planned', 'in_progress', 'completed'] as const).map(s => (
                <button key={s} onClick={() => setChartTab(s)} className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${chartTab === s ? 'bg-card shadow-sm' : 'text-muted-foreground'}`}>
                  {s === 'planned' ? 'مخطط' : s === 'in_progress' ? 'جاري العمل' : 'مكتمل'}
                </button>
              ))}
            </div>
            <Button size="sm" onClick={() => { setTreatmentForm({ ...treatmentForm, isOld: false }); setAddTreatmentOpen(true); }}>
              <Plus className="w-4 h-4 ml-1" /> إضافة علاج
            </Button>
            <Button size="sm" variant="outline" onClick={() => { setTreatmentForm({ ...treatmentForm, isOld: true }); setAddTreatmentOpen(true); }}>
              إضافة علاج قديم
            </Button>
          </div>

          {/* Dental Chart Visual — mouth-shaped 2D */}
          <DentalChartCircular
            treatments={treatments}
            statusFilter={chartTab}
            getToothColor={getToothColor}
            onToothClick={handleToothClick}
            highlightTooth={highlightTooth}
            jawOnlyTreatments={jawOnlyTreatments}
          />

          {/* Treatment List */}
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-start p-3 font-medium">العلاج</th>
                  <th className="text-start p-3 font-medium">السن/الفك</th>
                  <th className="text-start p-3 font-medium">الطبيب</th>
                  <th className="text-start p-3 font-medium">الحالة</th>
                  <th className="text-start p-3 font-medium">إجراء</th>
                </tr>
              </thead>
              <tbody ref={treatmentListRef}>
                {treatments.filter(t => t.status === chartTab).map(t => (
                  <tr key={t.id} className="border-b border-border" data-tooth={t.toothNumber ?? undefined}>
                    <td className="p-3 font-medium">{t.treatmentName}</td>
                    <td className="p-3">{t.toothNumber || (t.jaw === 'upper' ? 'علوي' : t.jaw === 'lower' ? 'سفلي' : t.jaw === 'both' ? 'فكين' : '-')}</td>
                    <td className="p-3">{getDoctorName(t.doctorId)}</td>
                    <td className="p-3"><Badge variant="outline">{chartTab === 'planned' ? 'مخطط' : chartTab === 'in_progress' ? 'جاري' : 'مكتمل'}</Badge></td>
                    <td className="p-3 flex gap-1">
                      {t.status === 'planned' && !t.isOldTreatment && (
                        <Button size="sm" variant="outline" onClick={() => startTreatment(t.id)}><Play className="w-3 h-3 ml-1" /> بدء</Button>
                      )}
                      {t.status === 'in_progress' && (
                        <>
                          <Button size="sm" variant="outline" onClick={() => { setActiveTreatmentId(t.id); setSessionModalOpen(true); }}>جلسة</Button>
                          <Button size="sm" variant="outline" onClick={() => completeTreatment(t.id)}><CheckCircle className="w-3 h-3 ml-1" /> إنهاء</Button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
                {treatments.filter(t => t.status === chartTab).length === 0 && (
                  <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">لا توجد علاجات</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </TabsContent>

        {/* Tab 3: Appointments */}
        <TabsContent value="appointments">
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-start p-3 font-medium">التاريخ</th>
                  <th className="text-start p-3 font-medium">الوقت</th>
                  <th className="text-start p-3 font-medium">الطبيب</th>
                  <th className="text-start p-3 font-medium">الإجراء</th>
                  <th className="text-start p-3 font-medium">الحالة</th>
                </tr>
              </thead>
              <tbody>
                {appointments.length === 0 ? (
                  <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">لا توجد مواعيد</td></tr>
                ) : appointments.map(a => (
                  <tr key={a.id} className="border-b border-border">
                    <td className="p-3">{a.date}</td>
                    <td className="p-3">{a.time}</td>
                    <td className="p-3">{getDoctorName(a.doctorId)}</td>
                    <td className="p-3">{a.treatmentType || 'فحص'}</td>
                    <td className="p-3"><Badge variant="outline">{a.status}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>

        {/* Tab 4: Prescriptions */}
        <TabsContent value="prescriptions" className="space-y-4">
          <Button size="sm" onClick={() => setPrescriptionOpen(true)}><Plus className="w-4 h-4 ml-1" /> إضافة وصفة</Button>
          {prescriptions.map(p => (
            <div key={p.id} className="bg-card rounded-xl border border-border p-4">
              <div className="flex items-center justify-between mb-3">
                <Badge variant="secondary">{p.date}</Badge>
                <Button size="sm" variant="ghost" onClick={() => window.print()}><Printer className="w-4 h-4" /></Button>
              </div>
              <table className="w-full text-sm">
                <thead><tr className="text-muted-foreground">
                  <th className="text-start p-2">الدواء</th><th className="text-start p-2">الجرعة</th><th className="text-start p-2">النوع</th><th className="text-start p-2">المدة</th><th className="text-start p-2">ملاحظات</th>
                </tr></thead>
                <tbody>
                  {p.medications.map((m, i) => (
                    <tr key={i} className="border-t border-border/50">
                      <td className="p-2">{m.name}</td><td className="p-2">{m.dosage}</td><td className="p-2">{m.type}</td><td className="p-2">{m.duration} يوم</td><td className="p-2 text-muted-foreground">{m.notes}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </TabsContent>

        {/* Tab 5: Invoices */}
        <TabsContent value="invoices">
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-start p-3 font-medium">#</th>
                  <th className="text-start p-3 font-medium">التاريخ</th>
                  <th className="text-start p-3 font-medium">العلاج</th>
                  <th className="text-start p-3 font-medium">الإجمالي</th>
                  <th className="text-start p-3 font-medium">الخصم</th>
                  <th className="text-start p-3 font-medium">المدفوع</th>
                  <th className="text-start p-3 font-medium">الباقي</th>
                  <th className="text-start p-3 font-medium">الحالة</th>
                  <th className="text-start p-3 font-medium">الطبيب</th>
                  <th className="text-start p-3 font-medium">إجراء</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map(inv => (
                  <tr key={inv.id} className="border-b border-border">
                    <td className="p-3">{formatInvoiceNo(inv.invoiceNo)}</td>
                    <td className="p-3">{inv.date}</td>
                    <td className="p-3">{inv.treatmentName}</td>
                    <td className="p-3">{inv.total.toLocaleString()}</td>
                    <td className="p-3">{inv.discount.toLocaleString()}</td>
                    <td className="p-3">{inv.paid.toLocaleString()}</td>
                    <td className="p-3">{(inv.total - inv.paid).toLocaleString()}</td>
                    <td className="p-3"><Badge className={statusColors[inv.status]}>{inv.status === 'unpaid' ? 'غير مدفوعة' : inv.status === 'partial' ? 'جزئي' : 'مدفوعة'}</Badge></td>
                    <td className="p-3">{getDoctorName(inv.doctorId)}</td>
                    <td className="p-3">
                      {inv.status !== 'paid' && (
                        <Button size="sm" variant="outline" onClick={() => { setPaymentForm({ ...paymentForm, invoiceId: inv.id, date: format(new Date(), 'yyyy-MM-dd') }); setPaymentModalOpen(true); }}>
                          إضافة دفعة
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
                {invoices.length === 0 && <tr><td colSpan={10} className="p-8 text-center text-muted-foreground">لا توجد فواتير</td></tr>}
              </tbody>
            </table>
          </div>
        </TabsContent>

        {/* Tab 6: Payments */}
        <TabsContent value="payments" className="space-y-4">
          <Button size="sm" onClick={() => { setPaymentForm({ invoiceId: '', amount: 0, method: 'cash', date: format(new Date(), 'yyyy-MM-dd'), notes: '' }); setPaymentModalOpen(true); }}><Plus className="w-4 h-4 ml-1" /> إضافة دفعة عامة</Button>
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-start p-3 font-medium">رقم الإيصال</th>
                  <th className="text-start p-3 font-medium">التاريخ</th>
                  <th className="text-start p-3 font-medium">المبلغ</th>
                  <th className="text-start p-3 font-medium">الطريقة</th>
                  <th className="text-start p-3 font-medium">ملاحظات</th>
                </tr>
              </thead>
              <tbody>
                {payments.map(p => (
                  <tr key={p.id} className="border-b border-border">
                    <td className="p-3 text-muted-foreground">{formatReceiptNo(p.receiptNo)}</td>
                    <td className="p-3">{p.date}</td>
                    <td className="p-3 font-medium">{p.amount.toLocaleString()}</td>
                    <td className="p-3">{p.method === 'cash' ? 'نقد' : 'أخرى'}</td>
                    <td className="p-3 text-muted-foreground">{p.notes}</td>
                  </tr>
                ))}
                {payments.length === 0 && <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">لا توجد دفعات</td></tr>}
              </tbody>
            </table>
          </div>
        </TabsContent>

        {/* Tab 7: Files */}
        <TabsContent value="files" className="space-y-4">
          <Button size="sm" onClick={() => { setFileForm({ ...fileForm, fileType: 'file' }); setFileUploadOpen(true); }}>
            <Upload className="w-4 h-4 ml-1" /> رفع ملف
          </Button>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {files.filter(f => f.fileType === 'file').map(f => (
              <div key={f.id} className="bg-card rounded-xl border border-border p-4 hover-lift">
                {f.fileData.startsWith('data:image') ? (
                  <img src={f.fileData} alt={f.title} className="w-full h-32 object-cover rounded-lg mb-2" />
                ) : (
                  <div className="w-full h-32 bg-muted rounded-lg mb-2 flex items-center justify-center"><FileText className="w-8 h-8 text-muted-foreground" /></div>
                )}
                <h3 className="font-medium text-sm">{f.title}</h3>
                <p className="text-xs text-muted-foreground">{f.notes}</p>
              </div>
            ))}
          </div>
        </TabsContent>

        {/* Tab 8: Logs */}
        <TabsContent value="logs">
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-start p-3 font-medium">السن/الفك</th>
                  <th className="text-start p-3 font-medium">العلاج</th>
                  <th className="text-start p-3 font-medium">الحالة</th>
                  <th className="text-start p-3 font-medium">المستخدم</th>
                  <th className="text-start p-3 font-medium">التاريخ</th>
                </tr>
              </thead>
              <tbody>
                {treatments.map(t => (
                  <tr key={t.id} className="border-b border-border">
                    <td className="p-3">{t.toothNumber || (t.jaw === 'upper' ? 'علوي' : t.jaw === 'lower' ? 'سفلي' : t.jaw === 'both' ? 'فكين' : '-')}</td>
                    <td className="p-3">{t.treatmentName} {t.isOldTreatment && <Badge variant="outline" className="text-xs">قديم</Badge>}</td>
                    <td className="p-3">{t.status === 'planned' ? 'مخطط' : t.status === 'in_progress' ? 'جاري' : 'مكتمل'}</td>
                    <td className="p-3">{getDoctorName(t.doctorId)}</td>
                    <td className="p-3 text-muted-foreground">{t.createdAt.split('T')[0]}</td>
                  </tr>
                ))}
                {treatments.length === 0 && <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">لا توجد سجلات</td></tr>}
              </tbody>
            </table>
          </div>
        </TabsContent>

        {/* Tab 9: X-ray */}
        <TabsContent value="xray" className="space-y-4">
          <Button size="sm" onClick={() => { setFileForm({ ...fileForm, fileType: 'xray' }); setFileUploadOpen(true); }}>
            <Upload className="w-4 h-4 ml-1" /> إضافة أشعة
          </Button>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {files.filter(f => f.fileType === 'xray').map(f => (
              <div key={f.id} className="bg-card rounded-xl border border-border p-4 hover-lift">
                <img src={f.fileData} alt={f.title} className="w-full h-40 object-cover rounded-lg mb-2" />
                <h3 className="font-medium text-sm">{f.title}</h3>
                <p className="text-xs text-muted-foreground">{f.notes}</p>
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Modals */}

      {/* Add Treatment Modal */}
      <Dialog open={addTreatmentOpen} onOpenChange={setAddTreatmentOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{treatmentForm.isOld ? 'إضافة علاج قديم' : 'إضافة علاج'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>المجموعة</Label>
              <Select value={treatmentForm.groupId} onValueChange={v => setTreatmentForm({ ...treatmentForm, groupId: v, treatmentId: '' })}>
                <SelectTrigger><SelectValue placeholder="اختر المجموعة" /></SelectTrigger>
                <SelectContent>{groups.map(g => <SelectItem key={g.id} value={g.id}>{g.nameAr}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            {selectedGroup && (
              <div>
                <Label>العلاج</Label>
                <Select value={treatmentForm.treatmentId} onValueChange={v => setTreatmentForm({ ...treatmentForm, treatmentId: v })}>
                  <SelectTrigger><SelectValue placeholder="اختر العلاج" /></SelectTrigger>
                  <SelectContent>{selectedGroup.treatments.map(t => <SelectItem key={t.id} value={t.id}>{t.name} - {t.price}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            )}
            {selectedGroup?.effect === 'dynamic' && (
              <>
                <div>
                  <Label>تأثير: سن أو فك</Label>
                  <Select value={treatmentForm.effectType} onValueChange={v => setTreatmentForm({ ...treatmentForm, effectType: v as 'tooth' | 'jaw', toothNumber: '', jaw: '' })}>
                    <SelectTrigger><SelectValue placeholder="اختر" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="tooth">سن</SelectItem>
                      <SelectItem value="jaw">فك</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {treatmentForm.effectType === 'tooth' && (
                  <div>
                    <Label>رقم السن</Label>
                    <Input
                      type="number"
                      value={treatmentForm.toothNumber}
                      onChange={e => setTreatmentForm({ ...treatmentForm, toothNumber: e.target.value })}
                      min={11}
                      max={48}
                      className={treatmentForm.toothNumber && !isValidToothNumber(treatmentForm.toothNumber) ? 'border-destructive focus-visible:ring-destructive' : ''}
                    />
                    {treatmentForm.toothNumber && !isValidToothNumber(treatmentForm.toothNumber) && (
                      <p className="text-destructive text-sm mt-1">رقم السن غير صحيح. المسموح: 11-18، 21-28، 31-38، 41-48</p>
                    )}
                  </div>
                )}
                {treatmentForm.effectType === 'jaw' && (
                  <div>
                    <Label>الفك</Label>
                    <Select value={treatmentForm.jaw} onValueChange={v => setTreatmentForm({ ...treatmentForm, jaw: v })}>
                      <SelectTrigger><SelectValue placeholder="اختر الفك" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="upper">علوي</SelectItem>
                        <SelectItem value="lower">سفلي</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </>
            )}
            {selectedGroup?.effect === 'tooth' && (
              <div>
                <Label>رقم السن</Label>
                <Input
                  type="number"
                  value={treatmentForm.toothNumber}
                  onChange={e => setTreatmentForm({ ...treatmentForm, toothNumber: e.target.value })}
                  min={11}
                  max={48}
                  className={treatmentForm.toothNumber && !isValidToothNumber(treatmentForm.toothNumber) ? 'border-destructive focus-visible:ring-destructive' : ''}
                />
                {treatmentForm.toothNumber && !isValidToothNumber(treatmentForm.toothNumber) && (
                  <p className="text-destructive text-sm mt-1">رقم السن غير صحيح. المسموح: 11-18، 21-28، 31-38، 41-48</p>
                )}
              </div>
            )}
            {(selectedGroup?.effect === 'jaw' || selectedGroup?.effect === 'both_jaws') && (
              <div>
                <Label>الفك</Label>
                <Select value={treatmentForm.jaw} onValueChange={v => setTreatmentForm({ ...treatmentForm, jaw: v })}>
                  <SelectTrigger><SelectValue placeholder="اختر الفك" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="upper">علوي</SelectItem>
                    <SelectItem value="lower">سفلي</SelectItem>
                    {selectedGroup.effect === 'both_jaws' && <SelectItem value="both">فكين</SelectItem>}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div>
              <Label>الطبيب</Label>
              <Select value={treatmentForm.doctorId} onValueChange={v => setTreatmentForm({ ...treatmentForm, doctorId: v })}>
                <SelectTrigger><SelectValue placeholder="اختر الطبيب" /></SelectTrigger>
                <SelectContent>{doctors.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <Button onClick={handleAddTreatment} className="w-full">إضافة</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Invoice Modal (Start Treatment) */}
      <Dialog open={invoiceModalOpen} onOpenChange={setInvoiceModalOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>إنشاء فاتورة</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>السعر الأساسي</Label><Input type="number" value={invoiceForm.basePrice} onChange={e => setInvoiceForm({ ...invoiceForm, basePrice: Number(e.target.value) })} /></div>
            <div><Label>رسوم تشخيص</Label><Input type="number" value={invoiceForm.diagnosticFee} onChange={e => setInvoiceForm({ ...invoiceForm, diagnosticFee: Number(e.target.value) })} /></div>
            <div className="flex gap-2">
              <div className="flex-1"><Label>حسم</Label><Input type="number" value={invoiceForm.discount} onChange={e => setInvoiceForm({ ...invoiceForm, discount: Number(e.target.value) })} /></div>
              <div className="w-24">
                <Label>النوع</Label>
                <Select value={invoiceForm.discountType} onValueChange={v => setInvoiceForm({ ...invoiceForm, discountType: v as any })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fixed">مبلغ</SelectItem>
                    <SelectItem value="percentage">%</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="bg-muted/50 rounded-lg p-3 text-lg font-bold">
              الصافي: {(() => {
                let t = invoiceForm.basePrice + invoiceForm.diagnosticFee;
                if (invoiceForm.discountType === 'percentage') t -= t * (invoiceForm.discount / 100);
                else t -= invoiceForm.discount;
                return Math.max(0, t).toLocaleString();
              })()}
            </div>
            <Button onClick={confirmStartTreatment} className="w-full">تأكيد وبدء العلاج</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Payment Modal - Step 1: select invoice (unpaid/partial), Step 2: amount, method, date, notes */}
      <Dialog open={paymentModalOpen} onOpenChange={setPaymentModalOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>إضافة دفعة عامة</DialogTitle></DialogHeader>
          <div className="space-y-4">
            {!paymentForm.invoiceId && (
              <div>
                <Label>الخطوة 1: اختر الفاتورة (غير مدفوعة أو جزئية)</Label>
                <Select value={paymentForm.invoiceId} onValueChange={v => setPaymentForm({ ...paymentForm, invoiceId: v })}>
                  <SelectTrigger><SelectValue placeholder="اختر الفاتورة" /></SelectTrigger>
                  <SelectContent>{unpaidOrPartialInvoices.map(i => <SelectItem key={i.id} value={i.id}>{formatInvoiceNo(i.invoiceNo)} - باقي: {(i.total - i.paid).toLocaleString()}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            )}
            {paymentForm.invoiceId && (
              <>
                <p className="text-sm text-muted-foreground">الخطوة 2: تفاصيل الدفعة</p>
                <div><Label>المبلغ</Label><Input type="number" value={paymentForm.amount} onChange={e => setPaymentForm({ ...paymentForm, amount: Number(e.target.value) })} /></div>
                <div><Label>التاريخ</Label><Input type="date" value={paymentForm.date} onChange={e => setPaymentForm({ ...paymentForm, date: e.target.value })} /></div>
                <div>
                  <Label>طريقة الدفع</Label>
                  <Select value={paymentForm.method} onValueChange={v => setPaymentForm({ ...paymentForm, method: v as any })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">نقد</SelectItem>
                      <SelectItem value="other">أخرى</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>ملاحظات</Label><Input value={paymentForm.notes} onChange={e => setPaymentForm({ ...paymentForm, notes: e.target.value })} /></div>
              </>
            )}
            <Button onClick={handleAddPayment} className="w-full" disabled={!paymentForm.invoiceId || paymentForm.amount <= 0}>إضافة الدفعة</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Prescription Modal */}
      <Dialog open={prescriptionOpen} onOpenChange={setPrescriptionOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>إضافة وصفة</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>اسم الدواء</Label><Input value={prescForm.name} onChange={e => setPrescForm({ ...prescForm, name: e.target.value })} /></div>
            <div><Label>الجرعة</Label><Input value={prescForm.dosage} onChange={e => setPrescForm({ ...prescForm, dosage: e.target.value })} /></div>
            <div><Label>النوع</Label><Input value={prescForm.type} onChange={e => setPrescForm({ ...prescForm, type: e.target.value })} placeholder="حبوب، شراب..." /></div>
            <div><Label>المدة (أيام)</Label><Input type="number" value={prescForm.duration} onChange={e => setPrescForm({ ...prescForm, duration: Number(e.target.value) })} /></div>
            <div><Label>ملاحظات</Label><Input value={prescForm.notes} onChange={e => setPrescForm({ ...prescForm, notes: e.target.value })} /></div>
            <Button onClick={handleAddPrescription} className="w-full">إضافة</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Session Modal */}
      <Dialog open={sessionModalOpen} onOpenChange={setSessionModalOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>إضافة ملاحظات جلسة</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>ملاحظات</Label><Textarea value={sessionForm.notes} onChange={e => setSessionForm({ notes: e.target.value })} /></div>
            <Button onClick={addSession} className="w-full">إضافة</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* File Upload Modal */}
      <Dialog open={fileUploadOpen} onOpenChange={setFileUploadOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{fileForm.fileType === 'xray' ? 'إضافة أشعة' : 'رفع ملف'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>العنوان</Label><Input value={fileForm.title} onChange={e => setFileForm({ ...fileForm, title: e.target.value })} /></div>
            <div><Label>ملاحظة</Label><Input value={fileForm.notes} onChange={e => setFileForm({ ...fileForm, notes: e.target.value })} /></div>
            <div>
              <Label>الملف</Label>
              <input type="file" accept={fileForm.fileType === 'xray' ? 'image/*' : 'image/*,.pdf'} onChange={handleFileUpload} className="block w-full text-sm border border-input rounded-lg p-2 mt-1" />
            </div>
            <Button onClick={saveFile} className="w-full">رفع</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
