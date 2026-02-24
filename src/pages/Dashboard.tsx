import { useState, useMemo, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { getStore, setStore, STORAGE_KEYS } from '@/lib/storage';
import type { Appointment, Patient, Doctor, Expense, LabOrder } from '@/types';
import { Calendar, Users, DollarSign, FlaskConical, ChevronLeft, ChevronRight, Filter, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { format, addDays, subDays } from 'date-fns';
import { ar } from 'date-fns/locale';
import { toast } from 'sonner';

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

/** Cancel allowed only for scheduled and waiting — not for in_progress, completed, or cancelled */
const canCancel = (status: string) => status === 'scheduled' || status === 'waiting';

function formatTimeRange(time: string, durationMinutes: number): string {
  const [h, m] = time.split(':').map(Number);
  const totalM = h * 60 + m + (durationMinutes || 30);
  const endH = Math.floor(totalM / 60) % 24;
  const endM = totalM % 60;
  const end = `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;
  return `${time} - ${end}`;
}

export default function Dashboard() {
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [filterDoctor, setFilterDoctor] = useState('all');
  const [appointments, setAppointments] = useState<Appointment[]>(() => getStore<Appointment[]>(STORAGE_KEYS.appointments, []));

  const patients = getStore<Patient[]>(STORAGE_KEYS.patients, []);
  const doctors = getStore<Doctor[]>(STORAGE_KEYS.doctors, []);
  const expenses = getStore<Expense[]>(STORAGE_KEYS.expenses, []);
  const labOrders = getStore<LabOrder[]>(STORAGE_KEYS.labOrders, []);

  const syncAppointmentsFromStorage = useCallback(() => {
    setAppointments(getStore<Appointment[]>(STORAGE_KEYS.appointments, []));
  }, []);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEYS.appointments && e.newValue) {
        try {
          setAppointments(JSON.parse(e.newValue));
        } catch {
          syncAppointmentsFromStorage();
        }
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [syncAppointmentsFromStorage]);

  const todayAppointments = useMemo(() => {
    let filtered = appointments.filter(a => a.date === selectedDate);
    if (filterDoctor !== 'all') filtered = filtered.filter(a => a.doctorId === filterDoctor);
    return filtered.sort((a, b) => a.time.localeCompare(b.time));
  }, [appointments, selectedDate, filterDoctor]);

  const todayExpenses = expenses
    .filter(e => e.date === format(new Date(), 'yyyy-MM-dd'))
    .reduce((sum, e) => sum + e.amount, 0);

  const pendingLabOrders = labOrders.filter(o => o.status === 'pending').length;

  const getPatientName = (id: string | null, temp: string | null) => {
    if (temp) return temp;
    if (!id) return '-';
    return patients.find(p => p.id === id)?.fullName || '-';
  };
  const getDoctorName = (id: string) => doctors.find(d => d.id === id)?.name || '-';

  const persistAppointments = useCallback((updated: Appointment[]) => {
    setStore(STORAGE_KEYS.appointments, updated);
    setAppointments(updated);
  }, []);

  const handleStatusChange = (appointmentId: string) => {
    setAppointments(prev => {
      const updated = prev.map(a => {
        if (a.id === appointmentId && nextStatus[a.status]) {
          return { ...a, status: nextStatus[a.status] as Appointment['status'] };
        }
        return a;
      });
      setStore(STORAGE_KEYS.appointments, updated);
      toast.success('تم تحديث حالة الموعد');
      return updated;
    });
  };

  const handleCancel = (appointmentId: string) => {
    setAppointments(prev => {
      const updated = prev.map(a =>
        a.id === appointmentId ? { ...a, status: 'cancelled' as const } : a
      );
      setStore(STORAGE_KEYS.appointments, updated);
      toast.success('تم إلغاء الموعد');
      return updated;
    });
  };

  const stats = [
    { label: 'مواعيد اليوم', value: appointments.filter(a => a.date === format(new Date(), 'yyyy-MM-dd')).length, icon: Calendar, color: 'text-info' },
    { label: 'مصاريف اليوم', value: todayExpenses.toLocaleString(), icon: DollarSign, color: 'text-destructive' },
    { label: 'طلبات مخبر منتظرة', value: pendingLabOrders, icon: FlaskConical, color: 'text-warning' },
    { label: 'إجمالي المرضى', value: patients.length, icon: Users, color: 'text-primary' },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">لوحة التحكم</h1>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s, i) => (
          <div key={i} className="stat-card flex items-center gap-4">
            <div className={`p-3 rounded-xl bg-accent ${s.color}`}>
              <s.icon className="w-6 h-6" />
            </div>
            <div>
              <p className="text-2xl font-bold">{s.value}</p>
              <p className="text-sm text-muted-foreground">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Today's Appointments */}
      <div className="bg-card rounded-xl border border-border shadow-sm">
        <div className="p-4 border-b border-border flex flex-wrap items-center gap-3">
          <h2 className="text-lg font-bold flex-1">جدول المواعيد</h2>

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => setSelectedDate(format(subDays(new Date(selectedDate), 1), 'yyyy-MM-dd'))}>
              <ChevronRight className="w-4 h-4" />
            </Button>
            <input
              type="date"
              value={selectedDate}
              onChange={e => setSelectedDate(e.target.value)}
              className="border border-input rounded-lg px-3 py-1.5 text-sm bg-background"
            />
            <Button variant="ghost" size="icon" onClick={() => setSelectedDate(format(addDays(new Date(selectedDate), 1), 'yyyy-MM-dd'))}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => setSelectedDate(format(new Date(), 'yyyy-MM-dd'))}>
              اليوم
            </Button>
          </div>

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
              {todayAppointments.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-muted-foreground">
                    لا توجد مواعيد في هذا اليوم
                  </td>
                </tr>
              ) : (
                todayAppointments.map(apt => (
                  <tr key={apt.id} className={`border-b border-border hover:bg-muted/30 ${apt.tempPatientName ? 'border-r-4 border-r-destructive' : ''}`}>
                    <td className="p-3">{formatTimeRange(apt.time, apt.duration ?? 30)}</td>
                    <td className="p-3">
                      {apt.patientId ? (
                        <Link to={`/patients/${apt.patientId}`} className="text-primary hover:underline font-medium">
                          {getPatientName(apt.patientId, apt.tempPatientName)}
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
    </div>
  );
}
