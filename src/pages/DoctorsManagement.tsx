import { useState } from 'react';
import { getStore, setStore, generateId, STORAGE_KEYS } from '@/lib/storage';
import type { Doctor } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Plus, Pencil, UserX, UserCheck } from 'lucide-react';

const OWNER_ID = 'owner';

function ensureOwner(doctors: Doctor[]): Doctor[] {
  const hasOwner = doctors.some(d => d.isOwner || d.id === OWNER_ID);
  if (hasOwner) return doctors;
  const owner: Doctor = {
    id: OWNER_ID,
    name: 'مالك العيادة',
    specialty: '',
    phone: '',
    isOwner: true,
    isActive: true,
  };
  return [owner, ...doctors];
}

export default function DoctorsManagement() {
  const [doctors, setDoctors] = useState<Doctor[]>(() => {
    const stored = getStore<Doctor[]>(STORAGE_KEYS.doctors, []);
    const withOwner = ensureOwner(stored);
    if (withOwner.length !== stored.length || (stored.length === 0 && withOwner.length > 0)) {
      setStore(STORAGE_KEYS.doctors, withOwner);
    }
    return withOwner;
  });
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Doctor | null>(null);
  const [form, setForm] = useState({ name: '', specialty: '', phone: '' });

  const save = (d: Doctor[]) => {
    setDoctors(d);
    setStore(STORAGE_KEYS.doctors, d);
  };

  const handleSubmit = () => {
    if (!form.name) {
      toast.error('الاسم مطلوب');
      return;
    }
    if (editing) {
      save(doctors.map(d => (d.id === editing.id ? { ...d, ...form } : d)));
      toast.success('تم التعديل');
    } else {
      save([
        ...doctors,
        {
          id: generateId(),
          ...form,
          isOwner: false,
          isActive: true,
        },
      ]);
      toast.success('تم الإضافة');
    }
    setOpen(false);
    setEditing(null);
    setForm({ name: '', specialty: '', phone: '' });
  };

  const toggleActive = (d: Doctor) => {
    if (d.isOwner) return;
    save(
      doctors.map(doc =>
        doc.id === d.id ? { ...doc, isActive: doc.isActive === false } : doc
      )
    );
    const next = d.isActive === false;
    toast.success(next ? 'تم تفعيل الطبيب' : 'تم تعطيل الطبيب');
  };

  const openEdit = (d: Doctor) => {
    setEditing(d);
    setForm({ name: d.name, specialty: d.specialty, phone: d.phone });
    setOpen(true);
  };
  const openAdd = () => {
    setEditing(null);
    setForm({ name: '', specialty: '', phone: '' });
    setOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">إدارة الأطباء</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={openAdd}>
              <Plus className="w-4 h-4 ml-2" /> إضافة طبيب
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editing ? 'تعديل طبيب' : 'إضافة طبيب'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>الاسم</Label>
                <Input
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div>
                <Label>التخصص</Label>
                <Input
                  value={form.specialty}
                  onChange={e => setForm({ ...form, specialty: e.target.value })}
                />
              </div>
              <div>
                <Label>الهاتف</Label>
                <Input
                  value={form.phone}
                  onChange={e => setForm({ ...form, phone: e.target.value })}
                />
              </div>
              <Button onClick={handleSubmit} className="w-full">
                {editing ? 'تعديل' : 'إضافة'}
              </Button>
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
              <th className="text-start p-3 font-medium">الحالة</th>
              <th className="text-start p-3 font-medium">إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {doctors.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-8 text-center text-muted-foreground">
                  لا يوجد أطباء
                </td>
              </tr>
            ) : (
              doctors.map(d => (
                <tr
                  key={d.id}
                  className={`border-b border-border hover:bg-muted/30 ${d.isActive === false ? 'opacity-60' : ''}`}
                >
                  <td className="p-3 font-medium">{d.name}</td>
                  <td className="p-3 text-muted-foreground">{d.specialty}</td>
                  <td className="p-3">{d.phone}</td>
                  <td className="p-3">
                    {d.isOwner ? (
                      <Badge variant="secondary">مالك العيادة</Badge>
                    ) : d.isActive === false ? (
                      <Badge variant="outline" className="text-muted-foreground">
                        معطّل
                      </Badge>
                    ) : (
                      <Badge className="bg-green-600/90">نشط</Badge>
                    )}
                  </td>
                  <td className="p-3 flex gap-2">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(d)} title="تعديل">
                      <Pencil className="w-4 h-4" />
                    </Button>
                    {!d.isOwner && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => toggleActive(d)}
                        title={d.isActive === false ? 'تفعيل' : 'تعطيل'}
                        className={d.isActive === false ? 'text-green-600' : 'text-muted-foreground'}
                      >
                        {d.isActive === false ? (
                          <UserCheck className="w-4 h-4" />
                        ) : (
                          <UserX className="w-4 h-4" />
                        )}
                      </Button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
