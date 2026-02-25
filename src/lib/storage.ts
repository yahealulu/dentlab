import type { ClinicSettings, TreatmentGroup, WorkShift, Doctor } from '@/types';

const KEYS = {
  clinicSettings: 'clinic_settings',
  doctors: 'doctors',
  treatmentGroups: 'treatment_groups',
  patients: 'patients',
  appointments: 'appointments',
  invoices: 'invoices',
  payments: 'payments',
  expenses: 'expenses',
  expenseTypes: 'expense_types',
  staff: 'staff',
  prescriptions: 'prescriptions',
  patientFiles: 'patient_files',
  patientTreatments: 'patient_treatments',
  labs: 'labs',
  labWorkTypes: 'lab_work_types',
  labOrders: 'lab_orders',
  labPayments: 'lab_payments',
  doctorPayments: 'doctor_payments',
  shareTokens: 'share_tokens', // { [patientId]: token } for read-only share links
  authSession: 'auth_session',
} as const;

export function getStore<T>(key: string, fallback: T): T {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : fallback;
  } catch {
    return fallback;
  }
}

export function setStore<T>(key: string, value: T): void {
  localStorage.setItem(key, JSON.stringify(value));
}

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

export const STORAGE_KEYS = KEYS;

const DEFAULT_SETTINGS: ClinicSettings = {
  workDays: [0, 1, 2, 3, 4],
  startTime: '09:00',
  endTime: '17:00',
  shifts: [{ id: 'default', startTime: '09:00', endTime: '17:00' }],
  holidays: [],
  logo: null,
  tags: ['VIP', 'دكتور', 'صديق', 'موظف', 'طالب'],
  slotDuration: 30,
};

const DEFAULT_TREATMENT_GROUPS: TreatmentGroup[] = [
  { id: 'g1', code: 'RS', nameAr: 'ترميم', nameEn: 'Restoration', effect: 'tooth', isSystem: true, treatments: [] },
  { id: 'g2', code: 'EN', nameAr: 'علاج عصب', nameEn: 'Endodontics', effect: 'tooth', isSystem: true, treatments: [] },
  { id: 'g3', code: 'IM', nameAr: 'زراعة', nameEn: 'Implant', effect: 'tooth', isSystem: true, treatments: [] },
  { id: 'g4', code: 'ES', nameAr: 'تجميل', nameEn: 'Esthetic', effect: 'tooth', isSystem: true, treatments: [] },
  { id: 'g5', code: 'CR', nameAr: 'تيجان', nameEn: 'Crowns', effect: 'tooth', isSystem: true, treatments: [] },
  { id: 'g6', code: 'OR', nameAr: 'تقويم أسنان', nameEn: 'Orthodontics', effect: 'both_jaws', isSystem: true, treatments: [] },
  { id: 'g7', code: 'SU', nameAr: 'جراحة', nameEn: 'Surgery', effect: 'dynamic', isSystem: true, treatments: [] },
  { id: 'g8', code: 'PR', nameAr: 'أمراض لثة', nameEn: 'Periodontics', effect: 'jaw', isSystem: true, treatments: [] },
  { id: 'g9', code: 'PO', nameAr: 'تركيبات صناعية', nameEn: 'Prosthodontics', effect: 'none', isSystem: true, treatments: [] },
  { id: 'g10', code: 'PD', nameAr: 'أطفال', nameEn: 'Pediatric', effect: 'tooth', isSystem: true, treatments: [] },
  { id: 'g11', code: 'OT', nameAr: 'علاجات أخرى سن', nameEn: 'Other Tooth', effect: 'tooth', isSystem: true, treatments: [] },
  { id: 'g12', code: 'OJ', nameAr: 'علاجات أخرى فك', nameEn: 'Other Jaw', effect: 'jaw', isSystem: true, treatments: [] },
  { id: 'g13', code: 'OB', nameAr: 'علاجات أخرى فكين', nameEn: 'Other Both Jaws', effect: 'both_jaws', isSystem: true, treatments: [] },
];

const DEFAULT_LAB_WORK_TYPES = [
  { id: 'lw1', name: 'تاج زركون' },
  { id: 'lw2', name: 'جسر بورسلين' },
  { id: 'lw3', name: 'طقم كامل' },
  { id: 'lw4', name: 'تقويم متحرك' },
  { id: 'lw5', name: 'واقي أسنان' },
];

const DEFAULT_EXPENSE_TYPES = ['إيجار', 'كهرباء', 'ماء', 'مواد طبية', 'رواتب', 'صيانة', 'مصاريف أخرى'];

const DEFAULT_DOCTORS: Doctor[] = [
  { id: 'owner', name: 'مالك العيادة', specialty: '', phone: '', isOwner: true, isActive: true },
];

export function initializeStorage(): void {
  if (!localStorage.getItem(KEYS.clinicSettings)) {
    setStore(KEYS.clinicSettings, DEFAULT_SETTINGS);
  }
  if (!localStorage.getItem(KEYS.treatmentGroups)) {
    setStore(KEYS.treatmentGroups, DEFAULT_TREATMENT_GROUPS);
  }
  if (!localStorage.getItem(KEYS.labWorkTypes)) {
    setStore(KEYS.labWorkTypes, DEFAULT_LAB_WORK_TYPES);
  }
  if (!localStorage.getItem(KEYS.expenseTypes)) {
    setStore(KEYS.expenseTypes, DEFAULT_EXPENSE_TYPES);
  }
  if (!localStorage.getItem(KEYS.doctors)) {
    setStore(KEYS.doctors, DEFAULT_DOCTORS);
  }
  // Initialize empty arrays for the rest
  const emptyArrayKeys = [KEYS.patients, KEYS.appointments, KEYS.invoices, KEYS.payments, KEYS.expenses, KEYS.staff, KEYS.prescriptions, KEYS.patientFiles, KEYS.patientTreatments, KEYS.labs, KEYS.labOrders, KEYS.labPayments, KEYS.doctorPayments];
  emptyArrayKeys.forEach(key => {
    if (!localStorage.getItem(key)) setStore(key, []);
  });
}

export function getNextFileNo(): number {
  const patients = getStore<{ fileNo: number }[]>(KEYS.patients, []);
  if (patients.length === 0) return 1;
  return Math.max(...patients.map(p => p.fileNo)) + 1;
}

export function getNextInvoiceNo(): number {
  const invoices = getStore<{ invoiceNo: number }[]>(KEYS.invoices, []);
  if (invoices.length === 0) return 1;
  return Math.max(...invoices.map(i => i.invoiceNo)) + 1;
}

export function getNextOrderNo(): number {
  const orders = getStore<{ orderNo: number }[]>(KEYS.labOrders, []);
  if (orders.length === 0) return 1;
  return Math.max(...orders.map(o => o.orderNo)) + 1;
}

export function formatInvoiceNo(n: number): string {
  return `INV-${String(n).padStart(4, '0')}`;
}

export function formatReceiptNo(n: number | undefined): string {
  if (n == null) return '-';
  return `RCP-${String(n).padStart(4, '0')}`;
}

export function getNextReceiptNo(): number {
  const payments = getStore<{ receiptNo?: number }[]>(KEYS.payments, []);
  const withNo = payments.filter(p => p.receiptNo != null) as { receiptNo: number }[];
  if (withNo.length === 0) return 1;
  return Math.max(...withNo.map(p => p.receiptNo)) + 1;
}
