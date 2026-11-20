import React, { useEffect, useState } from 'react';
import {
  Users,
  CalendarClock,
  Receipt,
  AlertTriangle,
  UserPlus,
  PlusCircle,
  Play,
  CheckCircle2,
  ArrowRight,
} from 'lucide-react';
import { apiFetch, formatMoney } from '../api';
import type { ClinicSettings, DashboardData } from '../types';

interface DashboardPageProps {
  settings: ClinicSettings;
  onNavigate: (tab: 'patients' | 'appointments' | 'billing' | 'inventory') => void;
  onQuickBill: (patientId: number, appointmentId?: number) => void;
  onNewPatient: () => void;
  onNewAppointment: () => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  settings,
  onNavigate,
  onQuickBill,
  onNewPatient,
  onNewAppointment,
}) => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function loadDashboard() {
    setLoading(true);
    setError('');
    try {
      const res = await apiFetch<DashboardData>('/api/dashboard');
      setData(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDashboard();
  }, []);

  async function updateQueueStatus(appointmentId: number, status: 'in_consultation' | 'completed') {
    try {
      await apiFetch(`/api/appointments/${appointmentId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      await loadDashboard();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update status');
    }
  }

  if (loading && !data) {
    return <div className="p-8 text-center text-[#5C6B62]">Loading clinic overview...</div>;
  }

  if (error && !data) {
    return (
      <div className="p-6 rounded-2xl bg-red-50 border border-red-200 text-red-700">
        {error}
      </div>
    );
  }

  if (!data) return null;
  const currency = settings.currency || 'Rs.';

  return (
    <div className="space-y-6">
      {/* Header + Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#1B4332]">Clinic Overview</h1>
          <p className="text-sm text-[#5C6B62]">
            Today ({data.today}) &mdash; Live queue, registrations, and stock status
          </p>
        </div>
        <div className="flex flex-wrap gap-2.5">
          <button
            onClick={onNewPatient}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#1B4332] hover:bg-[#2D5A27] text-white text-sm font-semibold transition-colors cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            Register Patient
          </button>
          <button
            onClick={onNewAppointment}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-[#D6CFC0] hover:bg-[#F4EFE6] text-[#1B4332] text-sm font-semibold transition-colors cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            Issue Queue Token
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-[#E5DFD0] shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#5C6B62]">
              Total Patients
            </span>
            <div className="p-2 rounded-xl bg-[#EDF5EF] text-[#1B4332]">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <p className="mt-3 text-3xl font-bold text-[#1B2B22]">{data.stats.totalPatients}</p>
          <button
            onClick={() => onNavigate('patients')}
            className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-[#2D5A27] hover:underline cursor-pointer"
          >
            View directory <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-[#E5DFD0] shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#5C6B62]">
              Today&apos;s Queue
            </span>
            <div className="p-2 rounded-xl bg-amber-50 text-amber-700">
              <CalendarClock className="w-5 h-5" />
            </div>
          </div>
          <p className="mt-3 text-3xl font-bold text-[#1B2B22]">
            {data.stats.waitingCount + data.stats.inConsultationCount}
            <span className="text-sm font-normal text-[#5C6B62] ml-2">
              active ({data.stats.completedCount} done)
            </span>
          </p>
          <button
            onClick={() => onNavigate('appointments')}
            className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-[#2D5A27] hover:underline cursor-pointer"
          >
            Open queue <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-[#E5DFD0] shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#5C6B62]">
              Today&apos;s Revenue
            </span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-700">
              <Receipt className="w-5 h-5" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-bold text-[#1B2B22]">
            {formatMoney(data.stats.revenueToday, currency)}
          </p>
          <p className="mt-2 text-xs text-[#5C6B62]">
            This month: <span className="font-semibold text-[#1B2B22]">{formatMoney(data.stats.revenueMonth, currency)}</span>
          </p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-[#E5DFD0] shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#5C6B62]">
              Low Stock Alerts
            </span>
            <div
              className={`p-2 rounded-xl ${
                data.stats.lowStockCount > 0 ? 'bg-red-50 text-red-600' : 'bg-[#EDF5EF] text-[#1B4332]'
              }`}
            >
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <p className="mt-3 text-3xl font-bold text-[#1B2B22]">{data.stats.lowStockCount}</p>
          <button
            onClick={() => onNavigate('inventory')}
            className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-[#2D5A27] hover:underline cursor-pointer"
          >
            Manage herbal stock <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Main Split Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Live Queue */}
        <div className="lg:col-span-8 bg-white rounded-2xl border border-[#E5DFD0] shadow-xs overflow-hidden">
          <div className="px-5 py-4 border-b border-[#EFEAE0] flex items-center justify-between">
            <h2 className="font-bold text-[#1B4332]">Active Waiting Queue</h2>
            <button
              onClick={() => onNavigate('appointments')}
              className="text-xs font-semibold text-[#2D5A27] hover:underline cursor-pointer"
            >
              Full Schedule &rarr;
            </button>
          </div>
          {data.todayQueue.length === 0 ? (
            <div className="p-8 text-center text-sm text-[#5C6B62]">
              No patients currently waiting in today&apos;s queue.
            </div>
          ) : (
            <div className="divide-y divide-[#F2EDE2]">
              {data.todayQueue.map((item) => (
                <div
                  key={item.id}
                  className="px-5 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-[#FAF8F3]"
                >
                  <div className="flex items-center gap-3.5">
                    <span className="w-11 h-11 rounded-xl bg-[#1B4332] text-white font-bold text-sm flex items-center justify-center shrink-0">
                      T-{String(item.token_number).padStart(2, '0')}
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-[#1B2B22]">{item.patient_name}</span>
                        <span className="text-xs text-[#5C6B62]">({item.patient_code})</span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                            item.status === 'in_consultation'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {item.status === 'in_consultation' ? 'With Doctor' : 'Waiting'}
                        </span>
                      </div>
                      <p className="text-xs text-[#5C6B62] mt-0.5">
                        {item.visit_type} &bull; {item.appointment_time}
                        {item.doctor_name ? ` • ${item.doctor_name}` : ''}
                        {item.chief_complaint ? ` — "${item.chief_complaint}"` : ''}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {item.status === 'waiting' && (
                      <button
                        onClick={() => updateQueueStatus(item.id, 'in_consultation')}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#EDF5EF] hover:bg-[#D8F3DC] text-[#1B4332] text-xs font-semibold cursor-pointer"
                      >
                        <Play className="w-3.5 h-3.5" /> Call In
                      </button>
                    )}
                    <button
                      onClick={() => onQuickBill(item.patient_id, item.id)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#1B4332] hover:bg-[#2D5A27] text-white text-xs font-semibold cursor-pointer"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" /> Bill & Complete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Side Widgets */}
        <div className="lg:col-span-4 space-y-6">
          {/* Low Stock Widget */}
          <div className="bg-white rounded-2xl border border-[#E5DFD0] shadow-xs overflow-hidden">
            <div className="px-5 py-4 border-b border-[#EFEAE0] flex items-center justify-between">
              <h2 className="font-bold text-[#1B4332]">Low Stock Medicines</h2>
              <button
                onClick={() => onNavigate('inventory')}
                className="text-xs font-semibold text-[#2D5A27] hover:underline cursor-pointer"
              >
                Restock &rarr;
              </button>
            </div>
            {data.lowStockItems.length === 0 ? (
              <div className="p-5 text-sm text-[#5C6B62]">All herbal medicines are sufficiently stocked.</div>
            ) : (
              <div className="divide-y divide-[#F2EDE2]">
                {data.lowStockItems.map((item) => (
                  <div key={item.id} className="px-5 py-3 flex items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium text-[#1B2B22]">{item.name}</p>
                      <p className="text-xs text-[#5C6B62]">Reorder at {item.reorder_level} {item.unit}</p>
                    </div>
                    <span className="px-2.5 py-1 rounded-lg bg-red-50 text-red-700 text-xs font-bold">
                      {item.stock_quantity} left
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Registrations */}
          <div className="bg-white rounded-2xl border border-[#E5DFD0] shadow-xs overflow-hidden">
            <div className="px-5 py-4 border-b border-[#EFEAE0] flex items-center justify-between">
              <h2 className="font-bold text-[#1B4332]">Recent Registrations</h2>
              <button
                onClick={() => onNavigate('patients')}
                className="text-xs font-semibold text-[#2D5A27] hover:underline cursor-pointer"
              >
                All &rarr;
              </button>
            </div>
            {data.recentPatients.length === 0 ? (
              <div className="p-5 text-sm text-[#5C6B62]">No patients registered yet.</div>
            ) : (
              <div className="divide-y divide-[#F2EDE2]">
                {data.recentPatients.map((p) => (
                  <div key={p.id} className="px-5 py-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-[#1B2B22]">{p.full_name}</p>
                      <p className="text-xs text-[#5C6B62]">{p.patient_code} &bull; {p.phone}</p>
                    </div>
                    <span className="px-2 py-0.5 rounded-md bg-[#F4EFE6] text-[#5C4B32] text-[11px] font-medium">
                      {p.prakriti}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
