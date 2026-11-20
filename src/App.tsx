import React, { useEffect, useState } from 'react';
import {
  LayoutDashboard,
  Users,
  CalendarClock,
  Receipt,
  Package,
  Settings,
  LogOut,
  Menu,
  X,
} from 'lucide-react';
import { apiFetch, getAuthToken, setAuthToken } from './api';
import type { ClinicSettings, User } from './types';
import { SuwasiriLogo } from './components/Logo';
import { LoginPage } from './components/LoginPage';
import { DashboardPage } from './components/DashboardPage';
import { PatientsPage } from './components/PatientsPage';
import { AppointmentsPage } from './components/AppointmentsPage';
import { BillingPage } from './components/BillingPage';
import { InventoryPage } from './components/InventoryPage';
import { StaffSettingsPage } from './components/StaffSettingsPage';

type TabKey = 'dashboard' | 'patients' | 'appointments' | 'billing' | 'inventory' | 'settings';

const DEFAULT_SETTINGS: ClinicSettings = {
  clinic_name: 'Suwasiri Ayurvedic Wellness Center',
  tagline: 'Natural Healing for a Healthier Tomorrow',
  phone: '076 667 7779',
  address: 'Colombo, Sri Lanka',
  currency: 'Rs.',
  consultation_fee: '1500',
};

export function App() {
  const [user, setUser] = useState<User | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>('dashboard');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [settings, setSettings] = useState<ClinicSettings>(DEFAULT_SETTINGS);

  // Cross-page triggers
  const [patientCreateSignal, setPatientCreateSignal] = useState(0);
  const [apptCreateSignal, setApptCreateSignal] = useState(0);
  const [prefillApptPatientId, setPrefillApptPatientId] = useState<number | null>(null);
  const [prefillBill, setPrefillBill] = useState<{ patientId: number; appointmentId?: number } | null>(null);

  async function loadSessionAndSettings() {
    const token = getAuthToken();
    if (!token) {
      setCheckingAuth(false);
      return;
    }
    try {
      const [meRes, settingsRes] = await Promise.all([
        apiFetch<{ user: User }>('/api/auth/me'),
        apiFetch<{ settings: ClinicSettings }>('/api/settings'),
      ]);
      setUser(meRes.user);
      setSettings({ ...DEFAULT_SETTINGS, ...settingsRes.settings });
    } catch {
      setAuthToken(null);
      setUser(null);
    } finally {
      setCheckingAuth(false);
    }
  }

  useEffect(() => {
    loadSessionAndSettings();
  }, []);

  async function handleLoginSuccess(loggedInUser: User) {
    setUser(loggedInUser);
    try {
      const res = await apiFetch<{ settings: ClinicSettings }>('/api/settings');
      setSettings({ ...DEFAULT_SETTINGS, ...res.settings });
    } catch {
      // keep defaults
    }
    setActiveTab('dashboard');
  }

  function handleLogout() {
    setAuthToken(null);
    setUser(null);
  }

  if (checkingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FBF9F5] text-[#1B4332] font-medium">
        Starting Suwasiri Clinic Manager...
      </div>
    );
  }

  if (!user) {
    return <LoginPage onSuccess={handleLoginSuccess} />;
  }

  const navItems: Array<{ id: TabKey; label: string; icon: React.FC<{ className?: string }> }> = [
    { id: 'dashboard', label: 'Overview', icon: LayoutDashboard },
    { id: 'patients', label: 'Patients', icon: Users },
    { id: 'appointments', label: 'Queue & Tokens', icon: CalendarClock },
    { id: 'billing', label: 'Billing & Receipts', icon: Receipt },
    { id: 'inventory', label: 'Herbs & Therapies', icon: Package },
    { id: 'settings', label: 'Staff & Settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#FBF9F5]">
      {/* Mobile Header */}
      <header className="md:hidden bg-[#1B4332] text-white px-4 py-3 flex items-center justify-between no-print">
        <div className="flex items-center gap-2.5">
          <SuwasiriLogo className="w-8 h-8" />
          <span className="font-bold text-sm">{settings.clinic_name}</span>
        </div>
        <button
          onClick={() => setMobileNavOpen(!mobileNavOpen)}
          className="p-1.5 rounded-lg hover:bg-white/10 cursor-pointer"
        >
          {mobileNavOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </header>

      {/* Sidebar */}
      <aside
        className={`${
          mobileNavOpen ? 'block' : 'hidden'
        } md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 bg-[#1B4332] text-white z-30 no-print`}
      >
        <div className="p-5 border-b border-white/10 flex items-center gap-3">
          <SuwasiriLogo className="w-10 h-10 shrink-0" />
          <div className="min-w-0">
            <p className="font-bold text-sm leading-tight truncate">SUWASIRI</p>
            <p className="text-[11px] text-[#B7E4C7] truncate">Ayurvedic Wellness Center</p>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  setMobileNavOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors cursor-pointer ${
                  active
                    ? 'bg-white text-[#1B4332] font-semibold shadow-xs'
                    : 'text-[#D8F3DC] hover:bg-white/10'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-white/10 space-y-3">
          <div className="px-2">
            <p className="text-xs font-semibold text-white truncate">{user.full_name}</p>
            <p className="text-[11px] text-[#B7E4C7] capitalize">{user.role}</p>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold text-white transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" /> Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 md:pl-64 print:pl-0">
        <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 print:p-0">
          {activeTab === 'dashboard' && (
            <DashboardPage
              settings={settings}
              onNavigate={(tab) => setActiveTab(tab)}
              onNewPatient={() => {
                setActiveTab('patients');
                setPatientCreateSignal((n) => n + 1);
              }}
              onNewAppointment={() => {
                setActiveTab('appointments');
                setApptCreateSignal((n) => n + 1);
              }}
              onQuickBill={(pid, apptId) => {
                setPrefillBill({ patientId: pid, appointmentId: apptId });
                setActiveTab('billing');
              }}
            />
          )}

          {activeTab === 'patients' && (
            <PatientsPage
              settings={settings}
              openCreateSignal={patientCreateSignal}
              onBookToken={(pid) => {
                setPrefillApptPatientId(pid);
                setActiveTab('appointments');
              }}
              onCreateBill={(pid) => {
                setPrefillBill({ patientId: pid });
                setActiveTab('billing');
              }}
            />
          )}

          {activeTab === 'appointments' && (
            <AppointmentsPage
              prefillPatientId={prefillApptPatientId}
              openCreateSignal={apptCreateSignal}
              onClearPrefill={() => setPrefillApptPatientId(null)}
              onBillAppointment={(pid, apptId) => {
                setPrefillBill({ patientId: pid, appointmentId: apptId });
                setActiveTab('billing');
              }}
            />
          )}

          {activeTab === 'billing' && (
            <BillingPage
              settings={settings}
              prefill={prefillBill}
              onClearPrefill={() => setPrefillBill(null)}
            />
          )}

          {activeTab === 'inventory' && <InventoryPage settings={settings} userRole={user.role} />}

          {activeTab === 'settings' && (
            <StaffSettingsPage
              currentUser={user}
              settings={settings}
              onSettingsUpdated={(next) => setSettings(next)}
            />
          )}
        </div>
      </main>
    </div>
  );
}

export default App;
