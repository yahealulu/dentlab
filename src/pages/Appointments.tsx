import { useState, useMemo, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
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
import { Plus, ChevronLeft, ChevronRight, Search, Trash2, Filter, XCircle } from 'lucide-react';
import { format, addDays, subDays, startOfWeek, addWeeks, subWeeks } from 'date-fns';
import { ar } from 'date-fns/locale';
import { formatTime12, formatTimeRange12 } from '@/utils/formatTime';

const GRID_SLOT_MINUTES = 15; // grid rows every 15 min so any chosen time has a row
const DURATION_OPTIONS = [15, 30, 45, 60, 90, 120];

const statusColors: Record<string, string> = {
  scheduled: 'bg-info/80', waiting: 'bg-warning/80', in_progress: 'bg-primary/80', completed: 'bg-success/80', cancelled: 'bg-destructive/30',
};
const statusLabels: Record<string, string> = {
  scheduled: 'مجدول', waiting: 'انتظار', in_progress: 'جاري', completed: 'مكتمل', cancelled: 'ملغي',
};

const statusMap: Record<string, { label: string; class: string }> = {
  scheduled: { label: 'مجدول', class: 'bg-info text-info-foreground' },
  waiting: { label: 'قائمة انتظار', class: 'bg-warning text-warning-foreground' },
  in_progress: { label: 'جاري العمل', class: 'bg-primary text-primary-foreground' },
  completed: { label: 'مكتمل', class: 'bg-success text-success-foreground' },
  cancelled: { label: 'ملغي', class: 'bg-destructive text-destructive-foreground' },
};
const nextStatus: Record<string, string> = {
  scheduled: 'waiting',
  waiting: 'in_progress',
  in_progress: 'completed',
};
const canCancel = (status: string) => status === 'scheduled' || status === 'waiting';

function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

/** Check if two time ranges overlap (same day, same doctor). */
function appointmentsOverlap(
  time1: string,
  duration1: number,
  time2: string,
  duration2: number
): boolean {
  const start1 = timeToMinutes(time1);
  const end1 = start1 + duration1;
  const start2 = timeToMinutes(time2);
  const end2 = start2 + duration2;
  return start1 < end2 && end1 > start2;
}

/** Returns another appointment that overlaps the given slot for the same doctor, or null. */
function getConflictingAppointment(
  appointments: Appointment[],
  date: string,
  time: string,
  duration: number,
  doctorId: string,
  excludeId?: string
): Appointment | null {
  return appointments.find(
    (a) =>
      a.doctorId === doctorId &&
      a.date === date &&
      a.id !== excludeId &&
      appointmentsOverlap(time, duration, a.time, a.duration)
  ) ?? null;
}

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
  const activeDoctors = useMemo(() => doctors.filter(d => d.isActive !== false), [doctors]);
  const patients = getStore<Patient[]>(STORAGE_KEYS.patients, []);
  const groups = getStore<TreatmentGroup[]>(STORAGE_KEYS.treatmentGroups, []);

  const [viewMode, setViewMode] = useState<'daily' | 'weekly'>('daily');
  const [currentDate, setCurrentDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [filterDoctor, setFilterDoctor] = useState('all');
  const [bookingOpen, setBookingOpen] = useState(false);
  const [patientMode, setPatientMode] = useState<'existing' | 'new'>('existing');
  const [searchPatient, setSearchPatient] = useState('');

  const [form, setForm] = useState({
    treatmentType: 'فحص', doctorId: '', date: format(new Date(), 'yyyy-MM-dd'),
    time: settings.startTime ?? '09:00', duration: 30, patientId: '', tempPatientName: '', notes: '',
  });

  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [editForm, setEditForm] = useState({ date: '', time: '', duration: 30 });
  const [conflictError, setConflictError] = useState<string | null>(null);

  const save = useCallback((a: Appointment[]) => {
    setAppointments(a);
    setStore(STORAGE_KEYS.appointments, a);
  }, []);

  // Grid rows every 15 min so any start time fits in a row
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
        m += GRID_SLOT_MINUTES;
        if (m >= 60) { h++; m -= 60; }
      }
    }
    return slots;
  }, [settings]);

  /** Appointments that start in this row's 15-min window (same date, optional same doctor). */
  const getAppointmentsAt = useCallback((date: string, time: string, doctorId?: string) => {
    const rowStart = timeToMinutes(time);
    const rowEnd = rowStart + GRID_SLOT_MINUTES;
    return appointments.filter((a) => {
      if (a.date !== date || (doctorId && a.doctorId !== doctorId)) return false;
      const start = timeToMinutes(a.time);
      return start >= rowStart && start < rowEnd;
    });
  }, [appointments]);

  const handleBook = () => {
    setConflictError(null);
    if (!form.doctorId) { toast.error('اختر الطبيب'); return; }
    if (patientMode === 'existing' && !form.patientId) { toast.error('اختر المريض'); return; }
    if (patientMode === 'new' && !form.tempPatientName) { toast.error('أدخل اسم المريض'); return; }
    if (!form.time?.trim()) { toast.error('أدخل وقت الموعد'); return; }
    if (form.duration < 15 || form.duration > 240) {
      toast.error('المدة بين ١٥ و ٢٤٠ دقيقة');
      return;
    }

    const conflict = getConflictingAppointment(
      appointments,
      form.date,
      form.time,
      form.duration,
      form.doctorId
    );
    if (conflict) {
      setConflictError('هذا التوقيت يتعارض مع موعد آخر لهذا الطبيب. اختر وقتاً أو مدة مختلفة.');
      toast.error('تعارض: التوقيت محجوز لهذا الطبيب');
      return;
    }

    const newApt: Appointment = {
      id: generateId(),
      date: form.date,
      time: form.time,
      duration: form.duration,
      doctorId: form.doctorId,
      patientId: patientMode === 'existing' ? form.patientId : null,
      tempPatientName: patientMode === 'new' ? form.tempPatientName : null,
      treatmentType: form.treatmentType,
      status: 'scheduled',
      notes: form.notes,
    };
    save([...appointments, newApt]);
    setBookingOpen(false);
    toast.success('تم حجز الموعد');
  };

  const openDetailModal = (apt: Appointment) => {
    setSelectedAppointment(apt);
    setEditForm({ date: apt.date, time: apt.time, duration: apt.duration });
    setConflictError(null);
  };

  const handleUpdateAppointment = () => {
    if (!selectedAppointment) return;
    setConflictError(null);
    if (!editForm.time?.trim()) { toast.error('أدخل وقت الموعد'); return; }
    if (editForm.duration < 15 || editForm.duration > 240) {
      toast.error('المدة بين ١٥ و ٢٤٠ دقيقة');
      return;
    }
    const conflict = getConflictingAppointment(
      appointments,
      editForm.date,
      editForm.time,
      editForm.duration,
      selectedAppointment.doctorId,
      selectedAppointment.id
    );
    if (conflict) {
      setConflictError('هذا التوقيت يتعارض مع موعد آخر لهذا الطبيب. اختر وقتاً أو مدة مختلفة.');
      toast.error('تعارض: التوقيت محجوز لهذا الطبيب');
      return;
    }
    const updated = appointments.map((a) =>
      a.id === selectedAppointment.id
        ? { ...a, date: editForm.date, time: editForm.time, duration: editForm.duration }
        : a
    );
    save(updated);
    setSelectedAppointment(null);
    toast.success('تم تحديث الموعد');
  };

  const handleDeleteAppointment = () => {
    if (!selectedAppointment) return;
    if (!window.confirm('هل تريد حذف هذا الموعد نهائياً؟ لا يمكن التراجع.')) return;
    save(appointments.filter((a) => a.id !== selectedAppointment.id));
    setSelectedAppointment(null);
    toast.success('تم حذف الموعد');
  };

  const getPatientName = (a: Appointment) => {
    if (a.tempPatientName) return a.tempPatientName;
    return patients.find(p => p.id === a.patientId)?.fullName || '-';
  };

  const getDoctorName = (id: string) => doctors.find(d => d.id === id)?.name || '-';

  const listAppointments = useMemo(() => {
    let filtered = appointments.filter(a => a.date === currentDate);
    if (filterDoctor !== 'all') filtered = filtered.filter(a => a.doctorId === filterDoctor);
    return filtered.sort((a, b) => a.time.localeCompare(b.time));
  }, [appointments, currentDate, filterDoctor]);

  const handleStatusChange = (appointmentId: string) => {
    const updated = appointments.map(a => {
      if (a.id === appointmentId && nextStatus[a.status]) {
        return { ...a, status: nextStatus[a.status] as Appointment['status'] };
      }
      return a;
    });
    save(updated);
    toast.success('تم تحديث حالة الموعد');
  };

  const handleCancel = (appointmentId: string) => {
    const updated = appointments.map(a =>
      a.id === appointmentId ? { ...a, status: 'cancelled' as const } : a
    );
    save(updated);
    toast.success('تم إلغاء الموعد');
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
    setConflictError(null);
    setForm({ ...form, date, time });
    setBookingOpen(true);
  };

  const openNewBooking = () => {
    setConflictError(null);
    const firstSlot = timeSlots[0] ?? settings.startTime ?? '09:00';
    setForm({ ...form, time: firstSlot });
    setBookingOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold">إدارة المواعيد</h1>
        <Button onClick={openNewBooking}><Plus className="w-4 h-4 ml-2" /> حجز موعد</Button>
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
                {activeDoctors.length > 0 ? activeDoctors.map(d => (
                  <th key={d.id} className="p-3 text-start font-medium">{d.name}</th>
                )) : <th className="p-3 text-start font-medium">المواعيد</th>}
              </tr>
            </thead>
            <tbody>
              {!isWorkDay(currentDate) || isHoliday(currentDate) ? (
                <tr><td colSpan={activeDoctors.length + 1} className="p-8 text-center text-muted-foreground">يوم عطلة</td></tr>
              ) : timeSlots.map(time => (
                <tr key={time} className="border-b border-border/50 hover:bg-muted/20">
                  <td className="p-2 text-muted-foreground font-mono text-xs">{formatTime12(time)}</td>
                  {(activeDoctors.length > 0 ? activeDoctors : [{ id: '' }]).map((d, di) => {
                    const apts = getAppointmentsAt(currentDate, time, d.id || undefined);
                    return (
                      <td key={di} className="p-1 min-w-[150px]" onClick={() => apts.length === 0 && openBookingAt(currentDate, time)}>
                        {apts.length > 0 ? apts.map(a => (
                          <TooltipProvider key={a.id}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div
                                  role="button"
                                  tabIndex={0}
                                  onClick={(e) => { e.stopPropagation(); openDetailModal(a); }}
                                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openDetailModal(a); } }}
                                  className={`${statusColors[a.status]} text-white rounded-lg p-2 text-xs mb-1 cursor-pointer ${a.tempPatientName ? 'border-2 border-destructive' : ''}`}
                                >
                                  <div className="font-medium">{getPatientName(a)}</div>
                                  <div className="opacity-80">{a.treatmentType}</div>
                                </div>
                              </TooltipTrigger>
                              <TooltipContent>
                                {a.tempPatientName ? 'مريض مؤقت — يحتاج فتح ملف' : getPatientName(a)} — انقر للتعديل
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
                  <td className="p-2 text-muted-foreground font-mono text-xs">{formatTime12(time)}</td>
                  {weekDays.map(day => {
                    const apts = getAppointmentsAt(day, time);
                    const off = !isWorkDay(day) || isHoliday(day);
                    return (
                      <td key={day} className={`p-1 min-w-[100px] ${off ? 'bg-muted/30' : ''}`} onClick={() => !off && apts.length === 0 && openBookingAt(day, time)}>
                        {off ? null : apts.map(a => (
                          <div
                            key={a.id}
                            role="button"
                            tabIndex={0}
                            onClick={(e) => { e.stopPropagation(); openDetailModal(a); }}
                            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openDetailModal(a); } }}
                            className={`${statusColors[a.status]} text-white rounded p-1 text-[10px] mb-0.5 cursor-pointer ${a.tempPatientName ? 'border border-destructive' : ''}`}
                            title={a.tempPatientName ? 'مريض مؤقت — انقر للتعديل' : 'انقر للتعديل'}
                          >
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

      {/* Same list table as Dashboard (12-hour time) — under the calendar */}
      <div className="bg-card rounded-xl border border-border shadow-sm">
        <div className="p-4 border-b border-border flex flex-wrap items-center gap-3">
          <h2 className="text-lg font-bold flex-1">جدول المواعيد</h2>
          <Select value={filterDoctor} onValueChange={setFilterDoctor}>
            <SelectTrigger className="w-40">
              <Filter className="w-4 h-4 ml-2" />
              <SelectValue placeholder="كل الأطباء" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">كل الأطباء</SelectItem>
              {doctors.map(d => (
                <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-start p-3 font-medium">الوقت</th>
                <th className="text-start p-3 font-medium">المريض</th>
                <th className="text-start p-3 font-medium">الطبيب</th>
                <th className="text-start p-3 font-medium">الإجراء</th>
                <th className="text-start p-3 font-medium">الحالة</th>
                <th className="text-start p-3 font-medium">إجراء</th>
              </tr>
            </thead>
            <tbody>
              {listAppointments.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-muted-foreground">
                    لا توجد مواعيد في هذا اليوم
                  </td>
                </tr>
              ) : (
                listAppointments.map(apt => (
                  <tr key={apt.id} className={`border-b border-border hover:bg-muted/30 ${apt.tempPatientName ? 'border-r-4 border-r-destructive' : ''}`}>
                    <td className="p-3">{formatTimeRange12(apt.time, apt.duration ?? 30)}</td>
                    <td className="p-3">
                      {apt.patientId ? (
                        <Link to={`/patients/${apt.patientId}`} className="text-primary hover:underline font-medium">
                          {getPatientName(apt)}
                        </Link>
                      ) : (
                        <span className="text-destructive font-medium">{apt.tempPatientName} (جديد)</span>
                      )}
                    </td>
                    <td className="p-3">{getDoctorName(apt.doctorId)}</td>
                    <td className="p-3">{apt.treatmentType || 'فحص'}</td>
                    <td className="p-3">
                      <Badge className={statusMap[apt.status]?.class}>{statusMap[apt.status]?.label}</Badge>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        {nextStatus[apt.status] && (
                          <Button size="sm" variant="outline" onClick={() => handleStatusChange(apt.id)}>
                            {statusMap[nextStatus[apt.status]]?.label} ←
                          </Button>
                        )}
                        {canCancel(apt.status) && (
                          <Button size="sm" variant="outline" className="text-destructive border-destructive/50 hover:bg-destructive/10" onClick={() => handleCancel(apt.id)}>
                            <XCircle className="w-4 h-4 ms-1" />
                            إلغاء
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
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
                <SelectContent>{activeDoctors.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="flex gap-3">
              <div className="flex-1"><Label>التاريخ</Label><Input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} /></div>
              <div className="flex-1">
                <Label>الوقت</Label>
                <Input
                  type="time"
                  value={form.time}
                  onChange={e => { setForm({ ...form, time: e.target.value }); setConflictError(null); }}
                />
              </div>
              <div className="w-28">
                <Label>المدة (دقيقة)</Label>
                <Select value={String(form.duration)} onValueChange={v => { setForm({ ...form, duration: Number(v) }); setConflictError(null); }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DURATION_OPTIONS.map(m => (<SelectItem key={m} value={String(m)}>{m} د</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {conflictError && <p className="text-sm text-destructive">{conflictError}</p>}

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

      {/* Appointment detail / edit modal */}
      <Dialog open={!!selectedAppointment} onOpenChange={(open) => !open && setSelectedAppointment(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>تفاصيل الموعد — تعديل الوقت</DialogTitle></DialogHeader>
          {selectedAppointment && (
            <div className="space-y-4">
              <div className="rounded-lg bg-muted/50 p-3 text-sm">
                <p><span className="font-medium text-muted-foreground">المريض:</span> {getPatientName(selectedAppointment)}</p>
                <p><span className="font-medium text-muted-foreground">الطبيب:</span> {doctors.find(d => d.id === selectedAppointment.doctorId)?.name ?? '-'}</p>
                <p><span className="font-medium text-muted-foreground">نوع العلاج:</span> {selectedAppointment.treatmentType}</p>
                <p><span className="font-medium text-muted-foreground">الحالة:</span> {statusLabels[selectedAppointment.status]}</p>
                <p><span className="font-medium text-muted-foreground">المدة:</span> {selectedAppointment.duration} دقيقة</p>
                {selectedAppointment.notes && <p><span className="font-medium text-muted-foreground">ملاحظات:</span> {selectedAppointment.notes}</p>}
              </div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <Label>التاريخ</Label>
                  <Input
                    type="date"
                    value={editForm.date}
                    onChange={e => { setEditForm(f => ({ ...f, date: e.target.value })); setConflictError(null); }}
                  />
                </div>
                <div className="flex-1">
                  <Label>الوقت</Label>
                  <Input
                    type="time"
                    value={editForm.time}
                    onChange={e => { setEditForm(f => ({ ...f, time: e.target.value })); setConflictError(null); }}
                  />
                </div>
                <div className="w-28">
                  <Label>المدة (دقيقة)</Label>
                  <Select
                    value={String(editForm.duration)}
                    onValueChange={v => { setEditForm(f => ({ ...f, duration: Number(v) })); setConflictError(null); }}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {DURATION_OPTIONS.map(m => (<SelectItem key={m} value={String(m)}>{m} د</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {conflictError && <p className="text-sm text-destructive">{conflictError}</p>}
              <div className="flex gap-2 justify-between pt-2">
                <Button type="button" variant="destructive" onClick={handleDeleteAppointment}>
                  <Trash2 className="w-4 h-4 ml-2" /> حذف الموعد
                </Button>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setSelectedAppointment(null)}>إلغاء</Button>
                  <Button onClick={handleUpdateAppointment}>حفظ التغييرات</Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
