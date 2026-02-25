import { useState } from 'react';
import { getStore, setStore, generateId, STORAGE_KEYS } from '@/lib/storage';
import type { ClinicSettings, WorkShift } from '@/types';
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
    const shifts: WorkShift[] = stored.shifts?.length
      ? stored.shifts
      : [{ id: 'default', startTime: stored.startTime, endTime: stored.endTime }];
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

  const updateShift = (index: number, field: 'startTime' | 'endTime', value: string) => {
    const shifts = settings.shifts.map((s, i) =>
      i === index ? { ...s, [field]: value } : s
    );
    save({ ...settings, shifts, startTime: shifts[0].startTime, endTime: shifts[0].endTime });
  };

  const addShift = () => {
    const newShift: WorkShift = {
      id: generateId(),
      startTime: '18:00',
      endTime: '21:00',
    };
    const shifts = [...settings.shifts, newShift];
    save({ ...settings, shifts });
    toast.success('تمت إضافة فترة');
  };

  const removeShift = (index: number) => {
    if (settings.shifts.length <= 1) {
      toast.error('يجب أن تبقى فترة واحدة على الأقل');
      return;
    }
    const shifts = settings.shifts.filter((_, i) => i !== index);
    save({ ...settings, shifts, startTime: shifts[0].startTime, endTime: shifts[0].endTime });
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

      {/* Working Hours - multiple shifts */}
      <div className="bg-card rounded-xl border border-border p-6 space-y-4 hover-lift">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-primary" />
          ساعات العمل
        </h2>
        <p className="text-sm text-muted-foreground">يمكنك إضافة أكثر من فترة (مثلاً: 9–5 و 6–9)</p>
        <div className="space-y-3">
          {settings.shifts.map((shift, index) => (
            <div key={shift.id} className="flex gap-3 items-end flex-wrap rounded-lg border border-border p-3 bg-muted/30">
              <div>
                <Label className="text-xs text-muted-foreground">من</Label>
                <Input
                  type="time"
                  value={shift.startTime}
                  onChange={e => updateShift(index, 'startTime', e.target.value)}
                  className="w-36"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">إلى</Label>
                <Input
                  type="time"
                  value={shift.endTime}
                  onChange={e => updateShift(index, 'endTime', e.target.value)}
                  className="w-36"
                />
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="text-destructive hover:bg-destructive/10"
                onClick={() => removeShift(index)}
                disabled={settings.shifts.length <= 1}
                title="حذف الفترة"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          ))}
          <Button type="button" variant="outline" size="sm" onClick={addShift}>
            <Plus className="w-4 h-4 ml-1" /> إضافة فترة
          </Button>
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
