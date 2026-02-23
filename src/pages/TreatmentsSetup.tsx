import { useState } from 'react';
import { getStore, setStore, generateId, STORAGE_KEYS } from '@/lib/storage';
import type { TreatmentGroup, Treatment } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, ChevronDown, ChevronUp } from 'lucide-react';

const effectLabels: Record<string, string> = {
  tooth: 'سن', jaw: 'فك', both_jaws: 'فكين', none: 'لا يوجد', dynamic: 'حسب الحالة',
};

export default function TreatmentsSetup() {
  const [groups, setGroups] = useState<TreatmentGroup[]>(() => getStore(STORAGE_KEYS.treatmentGroups, []));
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [currentGroupId, setCurrentGroupId] = useState<string | null>(null);
  const [editingTreatment, setEditingTreatment] = useState<Treatment | null>(null);
  const [form, setForm] = useState({ name: '', price: 0 });

  const saveGroups = (g: TreatmentGroup[]) => { setGroups(g); setStore(STORAGE_KEYS.treatmentGroups, g); };

  const openAddTreatment = (groupId: string) => {
    setCurrentGroupId(groupId); setEditingTreatment(null); setForm({ name: '', price: 0 }); setModalOpen(true);
  };

  const openEditTreatment = (groupId: string, treatment: Treatment) => {
    setCurrentGroupId(groupId); setEditingTreatment(treatment); setForm({ name: treatment.name, price: treatment.price }); setModalOpen(true);
  };

  const handleSubmit = () => {
    if (!form.name || !currentGroupId) { toast.error('الاسم مطلوب'); return; }
    const group = groups.find(g => g.id === currentGroupId);
    if (!group) return;

    if (editingTreatment) {
      const updated = groups.map(g => g.id === currentGroupId ? {
        ...g, treatments: g.treatments.map(t => t.id === editingTreatment.id ? { ...t, name: form.name, price: form.price } : t),
      } : g);
      saveGroups(updated);
      toast.success('تم التعديل');
    } else {
      const nextNum = group.treatments.length + 1;
      const code = `${group.code}${nextNum}`;
      const newTreatment: Treatment = { id: generateId(), code, name: form.name, price: form.price };
      const updated = groups.map(g => g.id === currentGroupId ? { ...g, treatments: [...g.treatments, newTreatment] } : g);
      saveGroups(updated);
      toast.success('تم الإضافة');
    }
    setModalOpen(false);
  };

  const deleteTreatment = (groupId: string, treatmentId: string) => {
    const updated = groups.map(g => g.id === groupId ? { ...g, treatments: g.treatments.filter(t => t.id !== treatmentId) } : g);
    saveGroups(updated);
    toast.success('تم الحذف');
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">الإجراءات العلاجية</h1>

      <div className="space-y-3">
        {groups.map(group => (
          <div key={group.id} className="bg-card rounded-xl border border-border overflow-hidden">
            <button
              className="w-full flex items-center gap-3 p-4 hover:bg-muted/30 transition-colors"
              onClick={() => setExpandedGroup(expandedGroup === group.id ? null : group.id)}
            >
              <div className="flex-1 text-start">
                <span className="font-bold">{group.nameAr}</span>
                <span className="text-muted-foreground text-sm mr-2">({group.nameEn})</span>
                <Badge variant="outline" className="mr-2">{group.code}</Badge>
                <Badge variant="secondary">{effectLabels[group.effect] ?? group.effect}</Badge>
                {group.isSystem && (
                  <span className="text-xs text-muted-foreground mr-2">— مجموعة نظامية، لا يمكن تعديل الاسم أو الرمز</span>
                )}
              </div>
              <span className="text-sm text-muted-foreground">{group.treatments.length} علاج</span>
              {expandedGroup === group.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {expandedGroup === group.id && (
              <div className="border-t border-border p-4 space-y-3">
                <Button size="sm" onClick={() => openAddTreatment(group.id)}>
                  <Plus className="w-4 h-4 ml-1" /> إضافة علاج
                </Button>

                {group.treatments.length > 0 && (
                  <table className="w-full text-sm">
                    <thead className="bg-muted/30">
                      <tr>
                        <th className="text-start p-2 font-medium">الرمز</th>
                        <th className="text-start p-2 font-medium">الاسم</th>
                        <th className="text-start p-2 font-medium">السعر</th>
                        <th className="text-start p-2 font-medium">إجراءات</th>
                      </tr>
                    </thead>
                    <tbody>
                      {group.treatments.map(t => (
                        <tr key={t.id} className="border-b border-border/50">
                          <td className="p-2"><Badge variant="outline">{t.code}</Badge></td>
                          <td className="p-2">{t.name}</td>
                          <td className="p-2">{t.price.toLocaleString()}</td>
                          <td className="p-2 flex gap-1">
                            <Button variant="ghost" size="icon" onClick={() => openEditTreatment(group.id, t)}><Pencil className="w-3 h-3" /></Button>
                            <Button variant="ghost" size="icon" onClick={() => deleteTreatment(group.id, t.id)}><Trash2 className="w-3 h-3 text-destructive" /></Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingTreatment ? 'تعديل علاج' : 'إضافة علاج'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>اسم العلاج</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="مثال: تاج زركون" /></div>
            <div><Label>السعر</Label><Input type="number" value={form.price} onChange={e => setForm({ ...form, price: Number(e.target.value) })} /></div>
            {!editingTreatment && currentGroupId && (
              <p className="text-sm text-muted-foreground">
                الرمز: {groups.find(g => g.id === currentGroupId)?.code}{(groups.find(g => g.id === currentGroupId)?.treatments.length || 0) + 1}
              </p>
            )}
            <Button onClick={handleSubmit} className="w-full">{editingTreatment ? 'تعديل' : 'إضافة'}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
