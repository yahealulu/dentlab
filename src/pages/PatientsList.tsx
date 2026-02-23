import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { getStore, setStore, generateId, getNextFileNo, STORAGE_KEYS } from '@/lib/storage';
import type { Patient, ClinicSettings, Invoice, Appointment, PatientTreatment } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Plus, Search, Pencil, Trash2 } from 'lucide-react';

const COUNTRIES = [
  { code: '+963', name: 'سوريا', digits: 9 },
  { code: '+964', name: 'العراق', digits: 10 },
  { code: '+962', name: 'الأردن', digits: 9 },
  { code: '+961', name: 'لبنان', digits: 8 },
  { code: '+966', name: 'السعودية', digits: 9 },
  { code: '+971', name: 'الإمارات', digits: 9 },
  { code: '+20', name: 'مصر', digits: 10 },
  { code: '+90', name: 'تركيا', digits: 10 },
];

export default function PatientsList() {
  const [patients, setPatients] = useState<Patient[]>(() => getStore(STORAGE_KEYS.patients, []));
  const settings = getStore<ClinicSettings>(STORAGE_KEYS.clinicSettings, { tags: [] } as any);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Patient | null>(null);
  const [search, setSearch] = useState('');
  const [filterTag, setFilterTag] = useState('all');

  const [form, setForm] = useState({
    fullName: '', phone: '', countryCode: '+963', gender: 'male' as 'male' | 'female',
    birthDate: '', address: '', medicalHistory: 'لا يوجد', distinctMark: '', tags: [] as string[],
  });

  const save = (p: Patient[]) => { setPatients(p); setStore(STORAGE_KEYS.patients, p); };

  const selectedCountry = COUNTRIES.find(c => c.code === form.countryCode);

  const handleSubmit = () => {
    if (!form.fullName || !form.phone || !form.address || !form.birthDate) {
      toast.error('يرجى ملء جميع الحقول المطلوبة'); return;
    }
    const birthDate = form.birthDate;
    const year = new Date(birthDate).getFullYear();
    if (year < 1900 || year > new Date().getFullYear()) {
      toast.error('تاريخ الميلاد غير صالح'); return;
    }
    if (selectedCountry && form.phone.length !== selectedCountry.digits) {
      toast.error(`رقم الهاتف يجب أن يكون ${selectedCountry.digits} خانات`); return;
    }

    if (editing) {
      save(patients.map(p => p.id === editing.id ? {
        ...p, fullName: form.fullName, phone: form.phone, countryCode: form.countryCode,
        gender: form.gender, birthYear: year, birthDate, address: form.address,
        medicalHistory: form.medicalHistory, distinctMark: form.distinctMark, tags: form.tags,
      } : p));
      toast.success('تم التعديل');
    } else {
      const newPatient: Patient = {
        id: generateId(), fileNo: getNextFileNo(), fullName: form.fullName,
        phone: form.phone, countryCode: form.countryCode, gender: form.gender,
        birthYear: year, birthDate, address: form.address, medicalHistory: form.medicalHistory,
        distinctMark: form.distinctMark, tags: form.tags, createdBy: 'المالك',
        createdAt: new Date().toISOString(),
      };
      save([...patients, newPatient]);
      toast.success('تم إضافة المريض');
    }
    setOpen(false); resetForm();
  };

  const handleDelete = (id: string) => {
    const invoices = getStore<Invoice[]>(STORAGE_KEYS.invoices, []);
    const appointments = getStore<Appointment[]>(STORAGE_KEYS.appointments, []);
    const patientTreatments = getStore<PatientTreatment[]>(STORAGE_KEYS.patientTreatments, []);
    if (
      invoices.some(i => i.patientId === id) ||
      appointments.some(a => a.patientId === id) ||
      patientTreatments.some(t => t.patientId === id)
    ) {
      toast.error('لا يمكن حذف مريض لديه سجلات مرتبطة'); return;
    }
    save(patients.filter(p => p.id !== id));
    toast.success('تم الحذف');
  };

  const resetForm = () => setForm({ fullName: '', phone: '', countryCode: '+963', gender: 'male', birthDate: '', address: '', medicalHistory: 'لا يوجد', distinctMark: '', tags: [] });

  const openEdit = (p: Patient) => {
    setEditing(p);
    const birthDate = p.birthDate ?? (p.birthYear ? `${p.birthYear}-01-01` : '');
    setForm({ fullName: p.fullName, phone: p.phone, countryCode: p.countryCode, gender: p.gender, birthDate, address: p.address, medicalHistory: p.medicalHistory, distinctMark: p.distinctMark, tags: p.tags });
    setOpen(true);
  };

  const filtered = useMemo(() => {
    let result = patients;
    if (search) result = result.filter(p => p.fullName.includes(search) || p.phone.includes(search));
    if (filterTag !== 'all') result = result.filter(p => p.tags.includes(filterTag));
    return result;
  }, [patients, search, filterTag]);

  const toggleTag = (tag: string) => {
    setForm(f => ({ ...f, tags: f.tags.includes(tag) ? f.tags.filter(t => t !== tag) : [...f.tags, tag] }));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold">إدارة المرضى</h1>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setEditing(null); resetForm(); } }}>
          <DialogTrigger asChild>
            <Button><Plus className="w-4 h-4 ml-2" /> إضافة مريض</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{editing ? 'تعديل مريض' : 'إضافة مريض جديد'}</DialogTitle></DialogHeader>
            <div className="space-y-4">
              {!editing && (
                <div className="bg-muted/50 rounded-lg p-3 text-sm">
                  <span className="font-medium">الرقم الداخلي: </span>{getNextFileNo()}
                </div>
              )}
              <div><Label>الاسم الكامل *</Label><Input value={form.fullName} onChange={e => setForm({ ...form, fullName: e.target.value })} /></div>
              <div className="flex gap-2">
                <div className="w-36">
                  <Label>الدولة</Label>
                  <Select value={form.countryCode} onValueChange={v => setForm({ ...form, countryCode: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{COUNTRIES.map(c => <SelectItem key={c.code} value={c.code}>{c.name} {c.code}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="flex-1">
                  <Label>رقم الهاتف * ({selectedCountry?.digits} خانات)</Label>
                  <Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value.replace(/\D/g, '') })} dir="ltr" />
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex-1">
                  <Label>الجنس *</Label>
                  <Select value={form.gender} onValueChange={v => setForm({ ...form, gender: v as any })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">ذكر</SelectItem>
                      <SelectItem value="female">أنثى</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex-1">
                  <Label>تاريخ الميلاد *</Label>
                  <Input type="date" value={form.birthDate} onChange={e => setForm({ ...form, birthDate: e.target.value })} max={format(new Date(), 'yyyy-MM-dd')} />
                </div>
              </div>
              <div><Label>العنوان *</Label><Input value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} /></div>
              <div><Label>التاريخ الطبي *</Label><Textarea value={form.medicalHistory} onChange={e => setForm({ ...form, medicalHistory: e.target.value })} /></div>
              <div><Label>علامة مميزة</Label><Input value={form.distinctMark} onChange={e => setForm({ ...form, distinctMark: e.target.value })} placeholder="مثال: #" /></div>
              <div>
                <Label>الوسوم</Label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {settings.tags?.map(tag => (
                    <Badge key={tag} variant={form.tags.includes(tag) ? 'default' : 'outline'} className="cursor-pointer" onClick={() => toggleTag(tag)}>
                      #{tag}
                    </Badge>
                  ))}
                </div>
              </div>
              <Button onClick={handleSubmit} className="w-full">{editing ? 'تعديل' : 'إضافة'}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search and Filter */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="بحث بالاسم أو الرقم..." className="pr-10" />
        </div>
        <Select value={filterTag} onValueChange={setFilterTag}>
          <SelectTrigger className="w-40"><SelectValue placeholder="كل الوسوم" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">كل الوسوم</SelectItem>
            {settings.tags?.map(t => <SelectItem key={t} value={t}>#{t}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="bg-card rounded-xl border border-border overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-start p-3 font-medium">#</th>
              <th className="text-start p-3 font-medium">المريض</th>
              <th className="text-start p-3 font-medium">الهاتف</th>
              <th className="text-start p-3 font-medium">العنوان</th>
              <th className="text-start p-3 font-medium">علامة</th>
              <th className="text-start p-3 font-medium">مسجل بواسطة</th>
              <th className="text-start p-3 font-medium">إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">لا يوجد مرضى</td></tr>
            ) : filtered.map(p => (
              <tr key={p.id} className="border-b border-border hover:bg-muted/30">
                <td className="p-3 text-muted-foreground">{p.fileNo}</td>
                <td className="p-3">
                  <Link to={`/patients/${p.id}`} className="text-primary hover:underline font-medium">{p.fullName}</Link>
                  {p.tags.map(t => <Badge key={t} variant="secondary" className="mr-1 text-xs">#{t}</Badge>)}
                </td>
                <td className="p-3" dir="ltr">{p.countryCode} {p.phone}</td>
                <td className="p-3 text-muted-foreground">{p.address}</td>
                <td className="p-3">{p.distinctMark}</td>
                <td className="p-3 text-muted-foreground">{p.createdBy}</td>
                <td className="p-3 flex gap-1">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(p)}><Pencil className="w-4 h-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(p.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
