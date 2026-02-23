import { useState } from 'react';
import { getStore, setStore, generateId, STORAGE_KEYS } from '@/lib/storage';
import type { Doctor, Invoice, PatientTreatment, Appointment, DoctorPayment } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2 } from 'lucide-react';

export default function DoctorsManagement() {
  const [doctors, setDoctors] = useState<Doctor[]>(() => getStore(STORAGE_KEYS.doctors, []));
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Doctor | null>(null);
  const [form, setForm] = useState({ name: '', specialty: '', phone: '' });

  const save = (d: Doctor[]) => { setDoctors(d); setStore(STORAGE_KEYS.doctors, d); };

  const handleSubmit = () => {
    if (!form.name) { toast.error('الاسم مطلوب'); return; }
    if (editing) {
      save(doctors.map(d => d.id === editing.id ? { ...d, ...form } : d));
      toast.success('تم التعديل');
    } else {
      save([...doctors, { id: generateId(), ...form }]);
      toast.success('تم الإضافة');
    }
    setOpen(false); setEditing(null); setForm({ name: '', specialty: '', phone: '' });
  };

  const handleDelete = (id: string) => {
    const invoices = getStore<Invoice[]>(STORAGE_KEYS.invoices, []);
    const treatments = getStore<PatientTreatment[]>(STORAGE_KEYS.patientTreatments, []);
    const appointments = getStore<Appointment[]>(STORAGE_KEYS.appointments, []);
    const doctorPayments = getStore<DoctorPayment[]>(STORAGE_KEYS.doctorPayments, []);
    if (
      invoices.some(i => i.doctorId === id) ||
      treatments.some(t => t.doctorId === id) ||
      appointments.some(a => a.doctorId === id) ||
      doctorPayments.some(p => p.doctorId === id)
    ) {
      toast.error('لا يمكن الحذف، يوجد سجلات مرتبطة');
      return;
    }
    save(doctors.filter(d => d.id !== id));
    toast.success('تم الحذف');
  };

  const openEdit = (d: Doctor) => { setEditing(d); setForm({ name: d.name, specialty: d.specialty, phone: d.phone }); setOpen(true); };
  const openAdd = () => { setEditing(null); setForm({ name: '', specialty: '', phone: '' }); setOpen(true); };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">إدارة الأطباء</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={openAdd}><Plus className="w-4 h-4 ml-2" /> إضافة طبيب</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{editing ? 'تعديل طبيب' : 'إضافة طبيب'}</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label>الاسم</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
              <div><Label>التخصص</Label><Input value={form.specialty} onChange={e => setForm({ ...form, specialty: e.target.value })} /></div>
              <div><Label>الهاتف</Label><Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></div>
              <Button onClick={handleSubmit} className="w-full">{editing ? 'تعديل' : 'إضافة'}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-start p-3 font-medium">الاسم</th>
              <th className="text-start p-3 font-medium">التخصص</th>
              <th className="text-start p-3 font-medium">الهاتف</th>
              <th className="text-start p-3 font-medium">إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {doctors.length === 0 ? (
              <tr><td colSpan={4} className="p-8 text-center text-muted-foreground">لا يوجد أطباء</td></tr>
            ) : doctors.map(d => (
              <tr key={d.id} className="border-b border-border hover:bg-muted/30">
                <td className="p-3 font-medium">{d.name}</td>
                <td className="p-3 text-muted-foreground">{d.specialty}</td>
                <td className="p-3">{d.phone}</td>
                <td className="p-3 flex gap-2">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(d)}><Pencil className="w-4 h-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(d.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
