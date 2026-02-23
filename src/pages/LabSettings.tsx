import { useState } from 'react';
import { getStore, setStore, generateId, STORAGE_KEYS } from '@/lib/storage';
import type { Lab, LabWorkType } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Plus, Pencil } from 'lucide-react';

export default function LabSettings() {
  const [labs, setLabs] = useState<Lab[]>(() => getStore(STORAGE_KEYS.labs, []));
  const [workTypes, setWorkTypes] = useState<LabWorkType[]>(() => getStore(STORAGE_KEYS.labWorkTypes, []));
  const [labOpen, setLabOpen] = useState(false);
  const [editingLab, setEditingLab] = useState<Lab | null>(null);
  const [labForm, setLabForm] = useState({ name: '', phone: '' });
  const [newWorkType, setNewWorkType] = useState('');

  const saveLabs = (l: Lab[]) => { setLabs(l); setStore(STORAGE_KEYS.labs, l); };
  const saveWorkTypes = (w: LabWorkType[]) => { setWorkTypes(w); setStore(STORAGE_KEYS.labWorkTypes, w); };

  const handleLabSubmit = () => {
    if (!labForm.name || !labForm.phone) { toast.error('جميع الحقول مطلوبة'); return; }
    if (editingLab) {
      saveLabs(labs.map(l => l.id === editingLab.id ? { ...l, ...labForm } : l));
      toast.success('تم التعديل');
    } else {
      saveLabs([...labs, { id: generateId(), name: labForm.name, phone: labForm.phone, isActive: true }]);
      toast.success('تم إضافة المخبر');
    }
    setLabOpen(false); setEditingLab(null); setLabForm({ name: '', phone: '' });
  };

  const toggleLabActive = (id: string) => {
    saveLabs(labs.map(l => l.id === id ? { ...l, isActive: !l.isActive } : l));
  };

  const addWorkType = () => {
    if (!newWorkType) return;
    saveWorkTypes([...workTypes, { id: generateId(), name: newWorkType }]);
    setNewWorkType('');
    toast.success('تم الإضافة');
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">إعدادات المخابر</h1>

      {/* Labs */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h2 className="font-semibold">قائمة المخابر</h2>
          <Dialog open={labOpen} onOpenChange={setLabOpen}>
            <DialogTrigger asChild>
              <Button size="sm" onClick={() => { setEditingLab(null); setLabForm({ name: '', phone: '' }); }}>
                <Plus className="w-4 h-4 ml-1" /> إضافة مخبر
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>{editingLab ? 'تعديل' : 'إضافة مخبر'}</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div><Label>اسم المخبر</Label><Input value={labForm.name} onChange={e => setLabForm({ ...labForm, name: e.target.value })} /></div>
                <div><Label>رقم الهاتف</Label><Input value={labForm.phone} onChange={e => setLabForm({ ...labForm, phone: e.target.value })} /></div>
                <Button onClick={handleLabSubmit} className="w-full">{editingLab ? 'تعديل' : 'إضافة'}</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-start p-3 font-medium">المخبر</th>
              <th className="text-start p-3 font-medium">الهاتف</th>
              <th className="text-start p-3 font-medium">الحالة</th>
              <th className="text-start p-3 font-medium">إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {labs.map(l => (
              <tr key={l.id} className="border-b border-border">
                <td className="p-3 font-medium">{l.name}</td>
                <td className="p-3">{l.phone}</td>
                <td className="p-3"><Badge className={l.isActive ? 'bg-success text-success-foreground' : 'bg-muted text-muted-foreground'}>{l.isActive ? 'نشط' : 'معطل'}</Badge></td>
                <td className="p-3 flex gap-1">
                  <Button variant="ghost" size="icon" onClick={() => { setEditingLab(l); setLabForm({ name: l.name, phone: l.phone }); setLabOpen(true); }}>
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => toggleLabActive(l.id)}>
                    {l.isActive ? 'تعطيل' : 'تفعيل'}
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Work Types */}
      <div className="bg-card rounded-xl border border-border p-6 space-y-4">
        <h2 className="font-semibold">أنواع العمل المخبري</h2>
        <div className="flex gap-2">
          <Input value={newWorkType} onChange={e => setNewWorkType(e.target.value)} placeholder="نوع عمل جديد..." className="w-48" />
          <Button onClick={addWorkType} size="sm"><Plus className="w-4 h-4 ml-1" /> إضافة</Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {workTypes.map(w => (
            <Badge key={w.id} variant="secondary" className="gap-1">{w.name}</Badge>
          ))}
        </div>
      </div>
    </div>
  );
}
