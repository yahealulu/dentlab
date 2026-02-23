import { useState } from 'react';
import { getStore, setStore, STORAGE_KEYS } from '@/lib/storage';
import type { ClinicSettings } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Plus, X, Upload, Clock } from 'lucide-react';

const DAYS = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

export default function ClinicSettingsPage() {
  const [settings, setSettings] = useState<ClinicSettings>(() => {
    const stored = getStore<ClinicSettings>(STORAGE_KEYS.clinicSettings, {
      workDays: [0, 1, 2, 3, 4], startTime: '09:00', endTime: '17:00', shifts: [], holidays: [], logo: null, tags: [], slotDuration: 30,
    });
    // Normalize to single shift for spec: one From/To for entire clinic
    const shifts = stored.shifts?.length ? [stored.shifts[0]] : [{ id: 'default', startTime: stored.startTime, endTime: stored.endTime }];
    return { ...stored, shifts, startTime: shifts[0].startTime, endTime: shifts[0].endTime };
  });
  const [newHoliday, setNewHoliday] = useState('');
  const [newTag, setNewTag] = useState('');

  const save = (s: ClinicSettings) => {
    setSettings(s);
    setStore(STORAGE_KEYS.clinicSettings, s);
    toast.success('تم الحفظ');
  };

  const toggleDay = (day: number) => {
    const workDays = settings.workDays.includes(day)
      ? settings.workDays.filter(d => d !== day)
      : [...settings.workDays, day];
    save({ ...settings, workDays });
  };

  const handleLogo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => save({ ...settings, logo: reader.result as string });
    reader.readAsDataURL(file);
  };

  const addHoliday = () => {
    if (!newHoliday) return;
    save({ ...settings, holidays: [...settings.holidays, newHoliday] });
    setNewHoliday('');
  };

  const addTag = () => {
    if (!newTag || settings.tags.length >= 10) return;
    save({ ...settings, tags: [...settings.tags, newTag] });
    setNewTag('');
  };

  const updateWorkingHours = (field: 'startTime' | 'endTime', value: string) => {
    const shift = { id: 'default', startTime: field === 'startTime' ? value : settings.startTime, endTime: field === 'endTime' ? value : settings.endTime };
    save({ ...settings, startTime: shift.startTime, endTime: shift.endTime, shifts: [shift] });
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <div className="p-3 rounded-xl bg-primary/10">
          <Clock className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">إعدادات العيادة</h1>
          <p className="text-sm text-muted-foreground">تهيئة أوقات العمل والإعدادات العامة</p>
        </div>
      </div>

      {/* Work Days */}
      <div className="bg-card rounded-xl border border-border p-6 space-y-4 hover-lift">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-primary" />
          أيام العمل
        </h2>
        <div className="flex flex-wrap gap-3">
          {DAYS.map((day, i) => (
            <label key={i} className={`flex items-center gap-2 cursor-pointer px-4 py-2.5 rounded-xl border-2 transition-all ${settings.workDays.includes(i) ? 'border-primary bg-primary/5 shadow-sm' : 'border-border hover:border-primary/30'}`}>
              <Checkbox checked={settings.workDays.includes(i)} onCheckedChange={() => toggleDay(i)} />
              <span className="text-sm font-medium">{day}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Working Hours - single From/To for entire clinic */}
      <div className="bg-card rounded-xl border border-border p-6 space-y-4 hover-lift">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-primary" />
          ساعات العمل
        </h2>
        <p className="text-sm text-muted-foreground">تطبق على العيادة بأكملها</p>
        <div className="flex gap-4 items-center flex-wrap">
          <div>
            <Label className="text-xs text-muted-foreground">من</Label>
            <Input type="time" value={settings.startTime} onChange={e => updateWorkingHours('startTime', e.target.value)} className="w-36" />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">إلى</Label>
            <Input type="time" value={settings.endTime} onChange={e => updateWorkingHours('endTime', e.target.value)} className="w-36" />
          </div>
        </div>
      </div>

      {/* Slot Duration */}
      <div className="bg-card rounded-xl border border-border p-6 space-y-4 hover-lift">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-primary" />
          مدة الفترة الزمنية
        </h2>
        <div className="flex items-center gap-3">
          <Input type="number" value={settings.slotDuration} onChange={e => save({ ...settings, slotDuration: Number(e.target.value) })} className="w-24" min={10} step={5} />
          <span className="text-sm text-muted-foreground">دقيقة</span>
        </div>
      </div>

      {/* Holidays */}
      <div className="bg-card rounded-xl border border-border p-6 space-y-4 hover-lift">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-warning" />
          العطل
        </h2>
        <div className="flex gap-2">
          <Input type="date" value={newHoliday} onChange={e => setNewHoliday(e.target.value)} className="w-48" />
          <Button onClick={addHoliday} size="sm"><Plus className="w-4 h-4 ml-1" /> إضافة</Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {settings.holidays.map((h, i) => (
            <Badge key={i} variant="secondary" className="gap-1 py-1.5 px-3">
              {h}
              <X className="w-3 h-3 cursor-pointer hover:text-destructive transition-colors" onClick={() => save({ ...settings, holidays: settings.holidays.filter((_, j) => j !== i) })} />
            </Badge>
          ))}
        </div>
      </div>

      {/* Logo */}
      <div className="bg-card rounded-xl border border-border p-6 space-y-4 hover-lift">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-info" />
          شعار العيادة
        </h2>
        <div className="flex items-center gap-4">
          {settings.logo && <img src={settings.logo} alt="Logo" className="w-20 h-20 rounded-xl object-cover border-2 border-border shadow-sm" />}
          <label className="cursor-pointer">
            <div className="flex items-center gap-2 px-5 py-3 rounded-xl border-2 border-dashed border-primary/40 text-primary hover:bg-primary/5 transition-all hover:border-primary">
              <Upload className="w-4 h-4" /> رفع صورة
            </div>
            <input type="file" accept="image/*" className="hidden" onChange={handleLogo} />
          </label>
          {settings.logo && <Button variant="ghost" size="sm" onClick={() => save({ ...settings, logo: null })} className="text-destructive">إزالة</Button>}
        </div>
      </div>

      {/* Tags */}
      <div className="bg-card rounded-xl border border-border p-6 space-y-4 hover-lift">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-secondary" />
          الوسوم ({settings.tags.length}/10)
        </h2>
        <div className="flex gap-2">
          <Input value={newTag} onChange={e => setNewTag(e.target.value)} placeholder="وسم جديد..." className="w-48" onKeyDown={e => e.key === 'Enter' && addTag()} />
          <Button onClick={addTag} size="sm" disabled={settings.tags.length >= 10}><Plus className="w-4 h-4 ml-1" /> إضافة</Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {settings.tags.map((t, i) => (
            <Badge key={i} className="gap-1 bg-primary/10 text-primary border-0 py-1.5 px-3">
              #{t}
              <X className="w-3 h-3 cursor-pointer hover:text-destructive transition-colors" onClick={() => save({ ...settings, tags: settings.tags.filter((_, j) => j !== i) })} />
            </Badge>
          ))}
        </div>
      </div>
    </div>
  );
}
