export interface WorkShift {
  id: string;
  startTime: string;
  endTime: string;
}

export interface ClinicSettings {
  workDays: number[];
  startTime: string;
  endTime: string;
  shifts: WorkShift[];
  holidays: string[];
  logo: string | null;
  tags: string[];
  slotDuration: number;
}

export interface Doctor {
  id: string;
  name: string;
  specialty: string;
  phone: string;
  /** Clinic owner; always shown first and cannot be deactivated */
  isOwner?: boolean;
  /** When false, doctor does not appear in dropdowns when adding treatments/appointments; name still shown on linked records */
  isActive?: boolean;
}

export interface TreatmentGroup {
  id: string;
  code: string;
  nameAr: string;
  nameEn: string;
  effect: 'tooth' | 'jaw' | 'both_jaws' | 'none' | 'dynamic';
  isSystem: boolean;
  treatments: Treatment[];
}

export interface Treatment {
  id: string;
  code: string;
  name: string;
  price: number;
}

export interface Patient {
  id: string;
  fileNo: number;
  fullName: string;
  phone: string;
  countryCode: string;
  gender: 'male' | 'female';
  birthYear: number;
  birthDate?: string; // ISO date yyyy-MM-dd for full DOB
  address: string;
  medicalHistory: string;
  distinctMark: string;
  tags: string[];
  createdBy: string;
  createdAt: string;
}

export interface Appointment {
  id: string;
  date: string;
  time: string;
  duration: number;
  doctorId: string;
  patientId: string | null;
  tempPatientName: string | null;
  treatmentType: string;
  status: 'scheduled' | 'waiting' | 'in_progress' | 'completed' | 'cancelled';
  notes: string;
}

export interface PatientTreatment {
  id: string;
  patientId: string;
  groupId: string;
  treatmentId: string;
  treatmentName: string;
  toothNumber: number | null;
  jaw: 'upper' | 'lower' | 'both' | null;
  status: 'planned' | 'in_progress' | 'completed';
  doctorId: string;
  invoiceId: string | null;
  sessions: TreatmentSession[];
  isOldTreatment: boolean;
  createdAt: string;
  /** Notes added by the doctor when completing the treatment (for future reference). */
  completedNotes?: string;
}

export interface TreatmentSession {
  id: string;
  date: string;
  notes: string;
}

export interface Invoice {
  id: string;
  invoiceNo: number;
  patientId: string;
  doctorId: string;
  treatmentId: string;
  treatmentName: string;
  basePrice: number;
  diagnosticFee: number;
  discount: number;
  discountType: 'percentage' | 'fixed';
  total: number;
  paid: number;
  status: 'unpaid' | 'partial' | 'paid';
  date: string;
  createdAt: string;
}

export interface Payment {
  id: string;
  invoiceId: string;
  patientId: string;
  amount: number;
  method: 'cash' | 'other';
  date: string;
  notes: string;
  receiptNo?: number; // sequential; display as RCP-0001
  createdAt: string;
}

export interface Expense {
  id: string;
  type: string;
  customType: string;
  amount: number;
  date: string;
  notes: string;
  createdAt: string;
}

export interface Staff {
  id: string;
  name: string;
  role: 'doctor' | 'nurse';
  phone: string;
  isActive: boolean;
  hasLogin: boolean;
  permissions: string[];
  doctorId: string | null;
}

export interface AuthSession {
  role: 'owner' | 'nurse';
  staffId?: string;
  staffName?: string;
  permissions: string[];
}

export interface Prescription {
  id: string;
  patientId: string;
  medications: Medication[];
  date: string;
}

export interface Medication {
  name: string;
  dosage: string;
  type: string;
  duration: number;
  notes: string;
}

export interface PatientFile {
  id: string;
  patientId: string;
  fileData: string;
  title: string;
  notes: string;
  fileType: 'file' | 'xray';
  createdAt: string;
}

export interface Lab {
  id: string;
  name: string;
  phone: string;
  isActive: boolean;
}

export interface LabWorkType {
  id: string;
  name: string;
}

export interface LabOrder {
  id: string;
  orderNo: number;
  patientId: string;
  labId: string;
  workTypeId: string;
  quantity: number;
  sentDate: string;
  dueDate: string;
  status: 'pending' | 'received' | 'cancelled';
  cost: number | null;
  notes: string;
  createdAt: string;
}

export interface LabPayment {
  id: string;
  labId: string;
  amount: number;
  date: string;
  notes: string;
  createdAt: string;
}

export interface DoctorPayment {
  id: string;
  doctorId: string;
  amount: number;
  date: string;
  notes: string;
  createdAt: string;
}
