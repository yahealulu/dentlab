import { useState, useMemo } from 'react';
import { getStore, setStore, STORAGE_KEYS, generateId } from '@/lib/storage';
import type { Staff, Doctor } from '@/types';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Shield, UserCog, UserPlus } from 'lucide-react';

const ALL_PERMISSIONS = [
  { key: 'patients', label: 'المرضى' },
  { key: 'appointments', label: 'المواعيد' },
  { key: 'invoices', label: 'الفواتير' },
  { key: 'payments', label: 'المدفوعات' },
  { key: 'expenses', label: 'المصروفات' },
  { key: 'labs', label: 'المخابر' },
  { key: 'settings', label: 'الإعدادات' },
];

const defaultAddNurse = {
  name: '',
  phone: '',
  hasLogin: true,
  permissions: [] as string[],
};

export default function StaffManagement() {
  const [staff, setStaff] = useState<Staff[]>(() => getStore(STORAGE_KEYS.staff, []));
  const doctors = getStore<Doctor[]>(STORAGE_KEYS.doctors, []);
  const [permOpen, setPermOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null);
  const [editPermissions, setEditPermissions] = useState<string[]>([]);
  const [addOpen, setAddOpen] = useState(false);
  const [addForm, setAddForm] = useState(defaultAddNurse);

  const save = (s: Staff[]) => { setStaff(s); setStore(STORAGE_KEYS.staff, s); };

  // Auto-generated accounts list: owner + doctors + nurses from staff
  const accounts = useMemo(() => {
    const list: { name: string; role: string; phone: string; hasLogin: boolean; isActive: boolean; staffId?: string; permissions: string[] }[] = [];
    
    // Owner account
    list.push({ name: 'المالك (Admin)', role: 'مالك', phone: '-', hasLogin: true, isActive: true, permissions: ALL_PERMISSIONS.map(p => p.key) });
    
    // Doctors (no login)
    doctors.forEach(d => {
      list.push({ name: d.name, role: 'طبيب', phone: d.phone || '-', hasLogin: false, isActive: true, permissions: [] });
    });
    
    // Nurses from staff
    staff.filter(s => s.role === 'nurse').forEach(s => {
      list.push({ name: s.name, role: 'ممرض/مساعد', phone: s.phone || '-', hasLogin: s.hasLogin, isActive: s.isActive, staffId: s.id, permissions: s.permissions });
    });
    
    return list;
  }, [doctors, staff]);

  const toggleActive = (staffId: string) => {
    save(staff.map(x => x.id === staffId ? { ...x, isActive: !x.isActive } : x));
    toast.success('تم تحديث الحالة');
  };

  const openPermissions = (staffId: string) => {
    const s = staff.find(x => x.id === staffId);
    if (!s) return;
    setEditingStaff(s);
    setEditPermissions([...s.permissions]);
    setPermOpen(true);
  };

  const togglePermission = (perm: string) => {
    setEditPermissions(prev => prev.includes(perm) ? prev.filter(p => p !== perm) : [...prev, perm]);
  };

  const savePermissions = () => {
    if (!editingStaff) return;
    save(staff.map(s => s.id === editingStaff.id ? { ...s, permissions: editPermissions } : s));
    setPermOpen(false);
    toast.success('تم حفظ الصلاحيات');
  };

  const openAddNurse = () => {
    setAddForm(defaultAddNurse);
    setAddOpen(true);
  };

  const toggleAddPermission = (key: string) => {
    setAddForm(prev => ({
      ...prev,
      permissions: prev.permissions.includes(key)
        ? prev.permissions.filter(p => p !== key)
        : [...prev.permissions, key],
    }));
  };

  const addNurse = () => {
    const name = addForm.name.trim();
    if (!name) {
      toast.error('الاسم مطلوب');
      return;
    }
    const newStaff: Staff = {
      id: generateId(),
      name,
      role: 'nurse',
      phone: addForm.phone.trim() || '',
      isActive: true,
      hasLogin: addForm.hasLogin,
      permissions: addForm.permissions,
      doctorId: null,
    };
    save([...staff, newStaff]);
    setAddOpen(false);
    toast.success('تم إضافة الممرض بنجاح');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-primary/10">
            <UserCog className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">العاملون والصلاحيات</h1>
            <p className="text-sm text-muted-foreground">الحسابات تظهر تلقائياً - يمكنك إضافة ممرضين وتحديد صلاحياتهم</p>
          </div>
        </div>
        <Button onClick={openAddNurse} className="gap-2">
          <UserPlus className="w-4 h-4" />
          إضافة ممرض
        </Button>
      </div>

      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-start p-3 font-medium">الاسم</th>
              <th className="text-start p-3 font-medium">الدور</th>
              <th className="text-start p-3 font-medium">الهاتف</th>
              <th className="text-start p-3 font-medium">الحالة</th>
              <th className="text-start p-3 font-medium">صلاحية الدخول</th>
              <th className="text-start p-3 font-medium">الصلاحيات</th>
              <th className="text-start p-3 font-medium">إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {accounts.map((acc, i) => (
              <tr key={i} className="border-b border-border hover:bg-muted/30">
                <td className="p-3 font-medium">{acc.name}</td>
                <td className="p-3">
                  <Badge variant="secondary" className={acc.role === 'مالك' ? 'bg-primary/10 text-primary' : acc.role === 'طبيب' ? 'bg-info/10 text-info' : 'bg-warning/10 text-warning'}>
                    {acc.role}
                  </Badge>
                </td>
                <td className="p-3 text-muted-foreground" dir="ltr">{acc.phone}</td>
                <td className="p-3">
                  <Badge className={acc.isActive ? 'bg-success text-success-foreground' : 'bg-muted text-muted-foreground'}>
                    {acc.isActive ? 'نشط' : 'غير نشط'}
                  </Badge>
                </td>
                <td className="p-3">
                  {acc.hasLogin ? (
                    <Badge variant="outline" className="border-success text-success">نعم</Badge>
                  ) : (
                    <span className="text-muted-foreground text-xs">لا</span>
                  )}
                </td>
                <td className="p-3">
                  {acc.role === 'مالك' ? (
                    <span className="text-xs text-muted-foreground">جميع الصلاحيات</span>
                  ) : acc.role === 'طبيب' ? (
                    <span className="text-xs text-muted-foreground">-</span>
                  ) : (
                    <div className="flex flex-wrap gap-1">
                      {acc.permissions.length > 0
                        ? acc.permissions.map(p => <Badge key={p} variant="outline" className="text-xs">{ALL_PERMISSIONS.find(ap => ap.key === p)?.label}</Badge>)
                        : <span className="text-xs text-muted-foreground">لم تحدد بعد</span>
                      }
                    </div>
                  )}
                </td>
                <td className="p-3">
                  {acc.staffId && acc.role === 'ممرض/مساعد' && (
                    <div className="flex gap-1">
                      <Button variant="outline" size="sm" onClick={() => openPermissions(acc.staffId!)}>
                        <Shield className="w-3 h-3 ml-1" /> صلاحيات
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => toggleActive(acc.staffId!)}>
                        {acc.isActive ? 'تعطيل' : 'تفعيل'}
                      </Button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="bg-muted/30 rounded-xl border border-border p-4 text-sm text-muted-foreground">
        <p>💡 <strong>ملاحظة:</strong> حسابات الأطباء والممرضين يتم إنشاؤها يدوياً من قبل صاحب المشروع. الأطباء لا يملكون صلاحية دخول للنظام.</p>
        <p className="mt-1">تغيير كلمة المرور سيكون متاحاً في تحديث قادم.</p>
      </div>

      {/* Add Nurse Modal */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>إضافة ممرض / مساعد</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="add-name">الاسم</Label>
              <Input
                id="add-name"
                value={addForm.name}
                onChange={e => setAddForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="اسم الممرض أو المساعد"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="add-phone">الهاتف</Label>
              <Input
                id="add-phone"
                value={addForm.phone}
                onChange={e => setAddForm(prev => ({ ...prev, phone: e.target.value }))}
                placeholder="رقم الهاتف"
                dir="ltr"
              />
            </div>
            <label className="flex items-center gap-3 cursor-pointer">
              <Checkbox
                checked={addForm.hasLogin}
                onCheckedChange={checked => setAddForm(prev => ({ ...prev, hasLogin: !!checked }))}
              />
              <span className="text-sm font-medium">صلاحية الدخول للنظام</span>
            </label>
            <div className="space-y-2">
              <Label>الصلاحيات</Label>
              <p className="text-xs text-muted-foreground">حدد الأقسام التي يمكن للممرض الوصول إليها</p>
              <div className="space-y-2 mt-2">
                {ALL_PERMISSIONS.map(p => (
                  <label
                    key={p.key}
                    className={`flex items-center gap-3 cursor-pointer p-2.5 rounded-lg border transition-all ${addForm.permissions.includes(p.key) ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/30'}`}
                  >
                    <Checkbox
                      checked={addForm.permissions.includes(p.key)}
                      onCheckedChange={() => toggleAddPermission(p.key)}
                    />
                    <span className="text-sm">{p.label}</span>
                  </label>
                ))}
              </div>
            </div>
            <Button onClick={addNurse} className="w-full">
              إضافة الممرض
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Permissions Modal */}
      <Dialog open={permOpen} onOpenChange={setPermOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>تحديد صلاحيات {editingStaff?.name}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">حدد الأقسام التي يمكن للممرض/المساعد الوصول إليها</p>
            <div className="space-y-3">
              {ALL_PERMISSIONS.map(p => (
                <label key={p.key} className={`flex items-center gap-3 cursor-pointer p-3 rounded-xl border-2 transition-all ${editPermissions.includes(p.key) ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/30'}`}>
                  <Checkbox checked={editPermissions.includes(p.key)} onCheckedChange={() => togglePermission(p.key)} />
                  <span className="text-sm font-medium">{p.label}</span>
                </label>
              ))}
            </div>
            <Button onClick={savePermissions} className="w-full">حفظ الصلاحيات</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
