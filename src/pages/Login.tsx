import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { getStore, STORAGE_KEYS } from '@/lib/storage';
import type { Staff } from '@/types';
import { signInAsOwner, signInAsNurse } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Stethoscope } from 'lucide-react';
import { toast } from 'sonner';

type RoleType = 'owner' | 'nurse';

export default function Login() {
  const navigate = useNavigate();
  const [role, setRole] = useState<RoleType>('owner');
  const [staffId, setStaffId] = useState<string>('');
  const [error, setError] = useState<string>('');

  const nurseOptions = useMemo(() => {
    const staff = getStore<Staff[]>(STORAGE_KEYS.staff, []);
    return staff.filter(
      s => s.role === 'nurse' && s.hasLogin && s.isActive
    );
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (role === 'owner') {
      signInAsOwner();
      navigate('/', { replace: true });
      return;
    }
    if (!staffId) {
      setError('اختر الممرض');
      toast.error('اختر الممرض');
      return;
    }
    const session = signInAsNurse(staffId);
    if (!session) {
      setError('لا يمكن الدخول بهذا الحساب');
      toast.error('لا يمكن الدخول بهذا الحساب');
      return;
    }
    navigate('/', { replace: true });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/50 p-4" dir="rtl">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex w-12 h-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Stethoscope className="w-6 h-6" />
          </div>
          <CardTitle className="text-xl">إدارة العيادة السنية</CardTitle>
          <p className="text-sm text-muted-foreground">اختر الدور ثم اضغط دخول</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="role">الدور</Label>
              <Select
                value={role}
                onValueChange={(v: RoleType) => {
                  setRole(v);
                  setStaffId('');
                  setError('');
                }}
              >
                <SelectTrigger id="role" className="w-full">
                  <SelectValue placeholder="اختر الدور" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="owner">مالك</SelectItem>
                  <SelectItem value="nurse">ممرض / مساعد</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {role === 'nurse' && (
              <div className="space-y-2">
                <Label htmlFor="nurse">الممرض</Label>
                {nurseOptions.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-2">
                    لا يوجد ممرضين مفعلين للدخول. أضف ممرضاً من الإعدادات وفعّل له صلاحية الدخول.
                  </p>
                ) : (
                  <Select value={staffId || undefined} onValueChange={v => { setStaffId(v); setError(''); }}>
                    <SelectTrigger id="nurse" className="w-full">
                      <SelectValue placeholder="اختر الممرض" />
                    </SelectTrigger>
                    <SelectContent>
                      {nurseOptions.map(s => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            )}

            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={role === 'nurse' && nurseOptions.length === 0}
            >
              دخول
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
