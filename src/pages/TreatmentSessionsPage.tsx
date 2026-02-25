import { useParams, Link } from 'react-router-dom';
import { getStore, STORAGE_KEYS } from '@/lib/storage';
import type { Patient, PatientTreatment } from '@/types';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { ArrowRight } from 'lucide-react';

export default function TreatmentSessionsPage() {
  const { id, treatmentId } = useParams<{ id: string; treatmentId: string }>();
  const patients = getStore<Patient[]>(STORAGE_KEYS.patients, []);
  const allTreatments = getStore<PatientTreatment[]>(STORAGE_KEYS.patientTreatments, []);
  const patient = patients.find(p => p.id === id);
  const treatment = allTreatments.find(t => t.patientId === id && t.id === treatmentId);

  if (!id || !treatmentId || !patient) {
    return (
      <div className="p-8 text-center">
        <p className="text-muted-foreground">المريض غير موجود</p>
        <Button variant="link" asChild className="mt-2">
          <Link to="/patients">العودة للقائمة</Link>
        </Button>
      </div>
    );
  }

  if (!treatment) {
    return (
      <div className="p-8 text-center">
        <p className="text-muted-foreground">العلاج غير موجود</p>
        <Button variant="link" asChild className="mt-2">
          <Link to={`/patients/${id}`}>العودة لملف المريض</Link>
        </Button>
      </div>
    );
  }

  const sessions = treatment.sessions ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link to="/patients" className="hover:text-foreground">المرضى</Link>
        <ArrowRight className="w-4 h-4 rotate-180" />
        <Link to={`/patients/${id}`} className="hover:text-foreground">{patient.fullName}</Link>
        <ArrowRight className="w-4 h-4 rotate-180" />
        <span className="text-foreground font-medium">جلسات العلاج</span>
      </div>

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">جلسات العلاج: {treatment.treatmentName}</h1>
          <p className="text-muted-foreground mt-1">المريض: {patient.fullName}</p>
        </div>
        <Button variant="outline" asChild>
          <Link to={`/patients/${id}`}>العودة لملف المريض</Link>
        </Button>
      </div>

      <div className="bg-card rounded-xl border border-border overflow-hidden">
        {sessions.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">
            لا توجد جلسات مسجلة لهذا العلاج بعد.
          </div>
        ) : (
          <div className="divide-y divide-border">
            {sessions.map((session, index) => (
              <div key={session.id} className="p-6">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-sm font-semibold text-muted-foreground">جلسة {index + 1}</span>
                  <span className="text-sm font-medium">
                    {format(new Date(session.date), 'EEEE، d MMMM yyyy', { locale: ar })}
                  </span>
                </div>
                {session.notes ? (
                  <p className="text-sm text-foreground whitespace-pre-wrap">{session.notes}</p>
                ) : (
                  <p className="text-sm text-muted-foreground">لا توجد ملاحظات</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {treatment.status === 'completed' && (treatment.completedNotes ?? '').trim() && (
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="p-4 border-b border-border">
            <h2 className="font-semibold text-foreground">ملاحظات إنهاء العلاج</h2>
            <p className="text-sm text-muted-foreground mt-0.5">ملاحظات الطبيب عند إنهاء هذا العلاج</p>
          </div>
          <div className="p-6">
            <p className="text-sm text-foreground whitespace-pre-wrap">{treatment.completedNotes}</p>
          </div>
        </div>
      )}
    </div>
  );
}
