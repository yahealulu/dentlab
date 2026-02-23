import type { AuthSession, Staff } from '@/types';
import { getStore, setStore, STORAGE_KEYS } from '@/lib/storage';

const AUTH_SESSION_KEY = STORAGE_KEYS.authSession;

/** Full list of permission keys (same as StaffManagement ALL_PERMISSIONS). */
export const FULL_PERMISSIONS = [
  'patients',
  'appointments',
  'invoices',
  'payments',
  'expenses',
  'labs',
  'settings',
];

/**
 * Path → permission key. Dashboard (/) allows all; specific paths map to one permission.
 */
function getPermissionForPath(path: string): string | null {
  if (path === '/' || path === '') return null; // allow all for dashboard
  if (path.startsWith('/patients')) return 'patients';
  if (path.startsWith('/appointments')) return 'appointments';
  if (path.startsWith('/settings')) return 'settings';
  if (path === '/finance/invoices') return 'invoices';
  if (path === '/finance/payments') return 'payments';
  if (
    path === '/finance/expenses' ||
    path === '/finance/doctor-accounting' ||
    path === '/finance/reports'
  ) {
    return 'expenses';
  }
  if (path.startsWith('/labs')) return 'labs';
  return null;
}

export function getSession(): AuthSession | null {
  return getStore<AuthSession | null>(AUTH_SESSION_KEY, null);
}

export function setSession(session: AuthSession): void {
  setStore(AUTH_SESSION_KEY, session);
}

export function clearSession(): void {
  localStorage.removeItem(AUTH_SESSION_KEY);
}

export function signInAsOwner(): AuthSession {
  const session: AuthSession = {
    role: 'owner',
    permissions: [...FULL_PERMISSIONS],
  };
  setSession(session);
  return session;
}

export function signInAsNurse(staffId: string): AuthSession | null {
  const staffList = getStore<Staff[]>(STORAGE_KEYS.staff, []);
  const staff = staffList.find(s => s.id === staffId);
  if (
    !staff ||
    staff.role !== 'nurse' ||
    !staff.isActive ||
    !staff.hasLogin
  ) {
    return null;
  }
  const session: AuthSession = {
    role: 'nurse',
    staffId: staff.id,
    staffName: staff.name,
    permissions: staff.permissions ?? [],
  };
  setSession(session);
  return session;
}

export function hasPermission(path: string, session: AuthSession): boolean {
  if (session.role === 'owner') return true;
  const perm = getPermissionForPath(path);
  if (perm === null) return true; // dashboard or unknown path allow
  return session.permissions.includes(perm);
}
