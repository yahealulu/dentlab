import { useState, useEffect, useMemo } from 'react';
import { Outlet, Link, useLocation, useNavigate, Navigate } from 'react-router-dom';
import {
  LayoutDashboard, Users, Calendar, Settings, DollarSign, FlaskConical,
  UserCog, ChevronDown, Stethoscope, FileText, CreditCard, Receipt,
  TrendingUp, ClipboardList, TestTube, Menu, ArrowUp, Moon, Sun, LogOut
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { getSession, clearSession, hasPermission } from '@/lib/auth';
import { Button } from '@/components/ui/button';

interface NavGroup {
  label: string;
  icon: React.ElementType;
  items: { label: string; path: string; icon: React.ElementType }[];
}

const navGroups: NavGroup[] = [
  {
    label: 'الإعدادات',
    icon: Settings,
    items: [
      { label: 'إعدادات العيادة', path: '/settings/clinic', icon: Settings },
      { label: 'الإجراءات العلاجية', path: '/settings/treatments', icon: ClipboardList },
      { label: 'الأطباء', path: '/settings/doctors', icon: Stethoscope },
      { label: 'العاملين', path: '/settings/staff', icon: UserCog },
    ],
  },
  {
    label: 'المالية',
    icon: DollarSign,
    items: [
      { label: 'الفواتير', path: '/finance/invoices', icon: FileText },
      { label: 'المدفوعات', path: '/finance/payments', icon: CreditCard },
      { label: 'المصروفات', path: '/finance/expenses', icon: Receipt },
      { label: 'حسابات الأطباء', path: '/finance/doctor-accounting', icon: Stethoscope },
      { label: 'التقارير', path: '/finance/reports', icon: TrendingUp },
    ],
  },
  {
    label: 'المخابر',
    icon: FlaskConical,
    items: [
      { label: 'إعدادات المخابر', path: '/labs/settings', icon: Settings },
      { label: 'طلبات المخابر', path: '/labs/orders', icon: TestTube },
      { label: 'حسابات المخابر', path: '/labs/financials', icon: CreditCard },
    ],
  },
];

const topLinks = [
  { label: 'لوحة التحكم', path: '/', icon: LayoutDashboard },
  { label: 'المرضى', path: '/patients', icon: Users },
  { label: 'المواعيد', path: '/appointments', icon: Calendar },
];

export default function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const session = getSession();

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openGroups, setOpenGroups] = useState<string[]>([]);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [dark, setDark] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('theme') === 'dark';
    }
    return false;
  });

  const filteredTopLinks = useMemo(
    () => (session ? topLinks.filter(link => hasPermission(link.path, session)) : []),
    [session]
  );

  const filteredNavGroups = useMemo(() => {
    if (!session) return [];
    return navGroups
      .map(group => ({
        ...group,
        items: group.items.filter(item => hasPermission(item.path, session)),
      }))
      .filter(group => group.items.length > 0);
  }, [session]);

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  const roleLabel = session.role === 'owner' ? 'مالك' : 'ممرض';
  const identityLabel = session.staffName ? `${roleLabel}: ${session.staffName}` : roleLabel;

  const handleSignOut = () => {
    clearSession();
    navigate('/login', { replace: true });
  };

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    localStorage.setItem('theme', dark ? 'dark' : 'light');
  }, [dark]);

  useEffect(() => {
    const handleScroll = () => setShowBackToTop(window.scrollY > 300);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const toggleGroup = (label: string) => {
    setOpenGroups(prev =>
      prev.includes(label) ? prev.filter(g => g !== label) : [...prev, label]
    );
  };

  const isActive = (path: string) => location.pathname === path;
  const isGroupActive = (items: { path: string }[]) =>
    items.some(item => location.pathname.startsWith(item.path));

  const SidebarContent = () => (
    <nav className="flex flex-col h-full">
      <div className="p-4 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
            <Stethoscope className="w-5 h-5 text-primary-foreground" />
          </div>
          {sidebarOpen && <h1 className="text-lg font-bold text-sidebar-foreground">إدارة العيادة</h1>}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
        {filteredTopLinks.map(link => (
          <Link
            key={link.path}
            to={link.path}
            className={cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
              isActive(link.path)
                ? 'bg-sidebar-accent text-primary'
                : 'text-sidebar-foreground hover:bg-sidebar-accent/50'
            )}
          >
            <link.icon className="w-5 h-5 shrink-0" />
            {sidebarOpen && <span>{link.label}</span>}
          </Link>
        ))}

        <div className="pt-2">
          {filteredNavGroups.map(group => (
            <div key={group.label} className="mb-1">
              <button
                onClick={() => toggleGroup(group.label)}
                className={cn(
                  'flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
                  isGroupActive(group.items)
                    ? 'bg-sidebar-accent text-primary'
                    : 'text-sidebar-foreground hover:bg-sidebar-accent/50'
                )}
              >
                <group.icon className="w-5 h-5 shrink-0" />
                {sidebarOpen && (
                  <>
                    <span className="flex-1 text-start">{group.label}</span>
                    <ChevronDown className={cn('w-4 h-4 transition-transform', openGroups.includes(group.label) && 'rotate-180')} />
                  </>
                )}
              </button>
              {sidebarOpen && openGroups.includes(group.label) && (
                <div className="mr-4 mt-1 space-y-0.5 border-r-2 border-sidebar-border pr-3">
                  {group.items.map(item => (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={cn(
                        'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all',
                        isActive(item.path)
                          ? 'bg-primary/10 text-primary font-medium'
                          : 'text-muted-foreground hover:text-foreground hover:bg-sidebar-accent/50'
                      )}
                    >
                      <item.icon className="w-4 h-4 shrink-0" />
                      <span>{item.label}</span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </nav>
  );

  return (
    <div className="flex min-h-screen">
      {/* Desktop Sidebar */}
      <aside
        className={cn(
          'hidden lg:flex flex-col border-l border-sidebar-border bg-sidebar transition-all duration-300 sticky top-0 h-screen',
          sidebarOpen ? 'w-64' : 'w-20'
        )}
      >
        <SidebarContent />
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-3 border-t border-sidebar-border text-muted-foreground hover:text-foreground text-xs"
        >
          {sidebarOpen ? 'طي القائمة' : '→'}
        </button>
      </aside>

      {/* Mobile Sidebar */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-foreground/20" onClick={() => setMobileOpen(false)} />
          <aside className="relative w-72 bg-sidebar shadow-xl z-10">
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Top Bar */}
        <header className="glass sticky top-0 z-40 border-b border-border px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => setMobileOpen(true)}
            className="lg:hidden p-2 rounded-lg hover:bg-accent"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex-1" />
          <span className="text-sm text-muted-foreground hidden sm:inline">{identityLabel}</span>
          <Button
            variant="outline"
            size="sm"
            onClick={handleSignOut}
            className="gap-2"
          >
            <LogOut className="w-4 h-4" />
            تسجيل الخروج
          </Button>
          <button
            onClick={() => setDark(!dark)}
            className="p-2.5 rounded-xl border border-border hover:bg-accent transition-all hover:scale-105"
            title={dark ? 'الوضع الفاتح' : 'الوضع الداكن'}
          >
            {dark ? <Sun className="w-5 h-5 text-warning" /> : <Moon className="w-5 h-5 text-muted-foreground" />}
          </button>
        </header>

        <main className="flex-1 p-4 md:p-6 animate-slide-in">
          <Outlet />
        </main>
      </div>

      {/* Back to Top */}
      {showBackToTop && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="fixed bottom-6 left-6 z-50 w-10 h-10 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:scale-110 transition-transform"
        >
          <ArrowUp className="w-5 h-5" />
        </button>
      )}
    </div>
  );
}
