import { useState, useMemo, useEffect } from 'react';
import { getStore, setStore, generateId, STORAGE_KEYS } from '@/lib/storage';
import type { Appointment, Doctor, Patient, ClinicSettings, TreatmentGroup, WorkShift } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Plus, ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { format, addDays, subDays, startOfWeek, addWeeks, subWeeks } from 'date-fns';
import { ar } from 'date-fns/locale';

const statusColors: Record<string, string> = {
  scheduled: 'bg-info/80', waiting: 'bg-warning/80', in_progress: 'bg-primary/80', completed: 'bg-success/80', cancelled: 'bg-destructive/30',
};
const statusLabels: Record<string, string> = {
  scheduled: 'مجدول', waiting: 'انتظار', in_progress: 'جاري', completed: 'مكتمل', cancelled: 'ملغي',
};

export default function AppointmentsPage() {
  const settings = getStore<ClinicSettings>(STORAGE_KEYS.clinicSettings, { workDays: [0,1,2,3,4], startTime: '09:00', endTime: '17:00', shifts: [{ id: 'default', startTime: '09:00', endTime: '17:00' }], holidays: [], logo: null, tags: [], slotDuration: 30 });
  const [appointments, setAppointments] = useState<Appointment[]>(() => getStore(STORAGE_KEYS.appointments, []));

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEYS.appointments && e.newValue) {
        try {
          setAppointments(JSON.parse(e.newValue));
        } catch {
          setAppointments(getStore(STORAGE_KEYS.appointments, []));
        }
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const doctors = getStore<Doctor[]>(STORAGE_KEYS.doctors, []);
  const patients = getStore<Patient[]>(STORAGE_KEYS.patients, []);
  const groups = getStore<TreatmentGroup[]>(STORAGE_KEYS.treatmentGroups, []);

  const [viewMode, setViewMode] = useState<'daily' | 'weekly'>('daily');
  const [currentDate, setCurrentDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [bookingOpen, setBookingOpen] = useState(false);
  const [patientMode, setPatientMode] = useState<'existing' | 'new'>('existing');
  const [searchPatient, setSearchPatient] = useState('');

  const [form, setForm] = useState({
    treatmentType: 'فحص', doctorId: '', date: format(new Date(), 'yyyy-MM-dd'),
    time: settings.startTime, duration: 30, patientId: '', tempPatientName: '', notes: '',
  });

  const save = (a: Appointment[]) => { setAppointments(a); setStore(STORAGE_KEYS.appointments, a); };

  // Generate time slots
  const timeSlots = useMemo(() => {
    const slots: string[] = [];
    const shifts: WorkShift[] = settings.shifts && settings.shifts.length > 0
      ? settings.shifts
      : [{ id: 'default', startTime: settings.startTime, endTime: settings.endTime }];
    
    for (const shift of shifts) {
      const [startH, startM] = shift.startTime.split(':').map(Number);
      const [endH, endM] = shift.endTime.split(':').map(Number);
      let h = startH, m = startM;
      while (h < endH || (h === endH && m < endM)) {
        slots.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
        m += settings.slotDuration;
        if (m >= 60) { h++; m -= 60; }
      }
    }
    return slots;
  }, [settings]);

  const getAppointmentsAt = (date: string, time: string, doctorId?: string) => {
    return appointments.filter(a => a.date === date && a.time === time && (!doctorId || a.doctorId === doctorId));
  };

  const handleBook = () => {
    if (!form.doctorId) { toast.error('اختر الطبيب'); return; }
    if (patientMode === 'existing' && !form.patientId) { toast.error('اختر المريض'); return; }
    if (patientMode === 'new' && !form.tempPatientName) { toast.error('أدخل اسم المريض'); return; }

    const newApt: Appointment = {
      id: generateId(), date: form.date, time: form.time, duration: form.duration,
      doctorId: form.doctorId, patientId: patientMode === 'existing' ? form.patientId : null,
      tempPatientName: patientMode === 'new' ? form.tempPatientName : null,
      treatmentType: form.treatmentType, status: 'scheduled', notes: form.notes,
    };
    save([...appointments, newApt]);
    setBookingOpen(false);
    toast.success('تم حجز الموعد');
  };

  const getPatientName = (a: Appointment) => {
    if (a.tempPatientName) return a.tempPatientName;
    return patients.find(p => p.id === a.patientId)?.fullName || '-';
  };

  const filteredPatients = patients.filter(p =>
    p.fullName.includes(searchPatient) || p.phone.includes(searchPatient)
  ).slice(0, 10);

  const weekDays = useMemo(() => {
    const start = startOfWeek(new Date(currentDate), { weekStartsOn: 0 });
    return Array.from({ length: 7 }, (_, i) => format(addDays(start, i), 'yyyy-MM-dd'));
  }, [currentDate]);

  const isHoliday = (date: string) => settings.holidays.includes(date);
  const isWorkDay = (date: string) => {
    const day = new Date(date).getDay();
    return settings.workDays.includes(day);
  };

  const openBookingAt = (date: string, time: string) => {
    setForm({ ...form, date, time });
    setBookingOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold">إدارة المواعيد</h1>
        <Button onClick={() => setBookingOpen(true)}><Plus className="w-4 h-4 ml-2" /> حجز موعد</Button>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex gap-1 bg-muted/50 p-1 rounded-lg">
          <button onClick={() => setViewMode('daily')} className={`px-3 py-1.5 rounded-md text-sm font-medium ${viewMode === 'daily' ? 'bg-card shadow-sm' : 'text-muted-foreground'}`}>يومي</button>
          <button onClick={() => setViewMode('weekly')} className={`px-3 py-1.5 rounded-md text-sm font-medium ${viewMode === 'weekly' ? 'bg-card shadow-sm' : 'text-muted-foreground'}`}>أسبوعي</button>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => setCurrentDate(format(viewMode === 'daily' ? subDays(new Date(currentDate), 1) : subWeeks(new Date(currentDate), 1), 'yyyy-MM-dd'))}>
            <ChevronRight className="w-4 h-4" />
          </Button>
          <span className="text-sm font-medium min-w-[120px] text-center">
            {viewMode === 'daily'
              ? format(new Date(currentDate), 'EEEE yyyy/MM/dd', { locale: ar })
              : `أسبوع ${format(new Date(currentDate), 'yyyy/MM/dd')}`
            }
          </span>
          <Button variant="ghost" size="icon" onClick={() => setCurrentDate(format(viewMode === 'daily' ? addDays(new Date(currentDate), 1) : addWeeks(new Date(currentDate), 1), 'yyyy-MM-dd'))}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => setCurrentDate(format(new Date(), 'yyyy-MM-dd'))}>اليوم</Button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex gap-3 flex-wrap text-xs">
        {Object.entries(statusLabels).map(([k, v]) => (
          <div key={k} className="flex items-center gap-1">
            <div className={`w-3 h-3 rounded ${statusColors[k]}`} />
            <span>{v}</span>
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="bg-card rounded-xl border border-border overflow-x-auto">
        {viewMode === 'daily' ? (
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="p-3 text-start font-medium w-20">الوقت</th>
                {doctors.length > 0 ? doctors.map(d => (
                  <th key={d.id} className="p-3 text-start font-medium">{d.name}</th>
                )) : <th className="p-3 text-start font-medium">المواعيد</th>}
              </tr>
            </thead>
            <tbody>
              {!isWorkDay(currentDate) || isHoliday(currentDate) ? (
                <tr><td colSpan={doctors.length + 1} className="p-8 text-center text-muted-foreground">يوم عطلة</td></tr>
              ) : timeSlots.map(time => (
                <tr key={time} className="border-b border-border/50 hover:bg-muted/20">
                  <td className="p-2 text-muted-foreground font-mono text-xs">{time}</td>
                  {(doctors.length > 0 ? doctors : [{ id: '' }]).map((d, di) => {
                    const apts = getAppointmentsAt(currentDate, time, d.id || undefined);
                    return (
                      <td key={di} className="p-1 min-w-[150px]" onClick={() => apts.length === 0 && openBookingAt(currentDate, time)}>
                        {apts.length > 0 ? apts.map(a => (
                          <TooltipProvider key={a.id}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className={`${statusColors[a.status]} text-white rounded-lg p-2 text-xs mb-1 cursor-pointer ${a.tempPatientName ? 'border-2 border-destructive' : ''}`}>
                                  <div className="font-medium">{getPatientName(a)}</div>
                                  <div className="opacity-80">{a.treatmentType}</div>
                                </div>
                              </TooltipTrigger>
                              <TooltipContent>
                                {a.tempPatientName ? 'مريض مؤقت — يحتاج فتح ملف' : getPatientName(a)}
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )) : (
                          <div className="h-8 rounded-lg border border-dashed border-border/50 hover:border-primary/50 cursor-pointer transition-colors" />
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="p-3 text-start font-medium w-20">الوقت</th>
                {weekDays.map(d => (
                  <th key={d} className={`p-3 text-start font-medium ${d === format(new Date(), 'yyyy-MM-dd') ? 'text-primary' : ''}`}>
                    {format(new Date(d), 'EEE dd', { locale: ar })}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {timeSlots.map(time => (
                <tr key={time} className="border-b border-border/50">
                  <td className="p-2 text-muted-foreground font-mono text-xs">{time}</td>
                  {weekDays.map(day => {
                    const apts = getAppointmentsAt(day, time);
                    const off = !isWorkDay(day) || isHoliday(day);
                    return (
                      <td key={day} className={`p-1 min-w-[100px] ${off ? 'bg-muted/30' : ''}`} onClick={() => !off && apts.length === 0 && openBookingAt(day, time)}>
                        {off ? null : apts.map(a => (
                          <div key={a.id} className={`${statusColors[a.status]} text-white rounded p-1 text-[10px] mb-0.5 ${a.tempPatientName ? 'border border-destructive' : ''}`} title={a.tempPatientName ? 'مريض مؤقت — يحتاج فتح ملف' : undefined}>
                            {getPatientName(a)}
                          </div>
                        ))}
                        {!off && apts.length === 0 && (
                          <div className="h-6 rounded border border-dashed border-border/30 hover:border-primary/50 cursor-pointer" />
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Booking Modal */}
      <Dialog open={bookingOpen} onOpenChange={setBookingOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>حجز موعد</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>نوع العلاج</Label>
              <Select value={form.treatmentType} onValueChange={v => setForm({ ...form, treatmentType: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="فحص">فحص</SelectItem>
                  {groups.map(g => <SelectItem key={g.id} value={g.nameAr}>{g.nameAr}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>الطبيب</Label>
              <Select value={form.doctorId} onValueChange={v => setForm({ ...form, doctorId: v })}>
                <SelectTrigger><SelectValue placeholder="اختر الطبيب" /></SelectTrigger>
                <SelectContent>{doctors.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="flex gap-3">
              <div className="flex-1"><Label>التاريخ</Label><Input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} /></div>
              <div className="flex-1"><Label>الوقت</Label><Input type="time" value={form.time} onChange={e => setForm({ ...form, time: e.target.value })} /></div>
              <div className="w-24"><Label>المدة (د)</Label><Input type="number" value={form.duration} onChange={e => setForm({ ...form, duration: Number(e.target.value) })} step={30} /></div>
            </div>

            {/* Patient Mode */}
            <div className="flex gap-1 bg-muted/50 p-1 rounded-lg">
              <button onClick={() => setPatientMode('existing')} className={`flex-1 px-3 py-1.5 rounded-md text-sm font-medium ${patientMode === 'existing' ? 'bg-card shadow-sm' : 'text-muted-foreground'}`}>مريض مسجل</button>
              <button onClick={() => setPatientMode('new')} className={`flex-1 px-3 py-1.5 rounded-md text-sm font-medium ${patientMode === 'new' ? 'bg-card shadow-sm' : 'text-muted-foreground'}`}>مريض جديد</button>
            </div>

            {patientMode === 'existing' ? (
              <div className="space-y-2">
                <div className="relative">
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input value={searchPatient} onChange={e => setSearchPatient(e.target.value)} placeholder="بحث بالاسم أو الرقم..." className="pr-10" />
                </div>
                {searchPatient && (
                  <div className="border border-border rounded-lg max-h-40 overflow-y-auto">
                    {filteredPatients.map(p => (
                      <button key={p.id} onClick={() => { setForm({ ...form, patientId: p.id }); setSearchPatient(p.fullName); }}
                        className={`w-full text-start px-3 py-2 text-sm hover:bg-muted/50 ${form.patientId === p.id ? 'bg-accent' : ''}`}>
                        {p.fullName} - {p.phone}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div><Label>اسم المريض</Label><Input value={form.tempPatientName} onChange={e => setForm({ ...form, tempPatientName: e.target.value })} placeholder="اسم المريض المؤقت" /></div>
            )}

            <Button onClick={handleBook} className="w-full">حجز الموعد</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
