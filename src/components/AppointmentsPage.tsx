import React, { useEffect, useState } from 'react';
import {
  CalendarPlus,
  Play,
  CheckCircle2,
  XCircle,
  Receipt,
  X,
  Search,
} from 'lucide-react';
import { apiFetch } from '../api';
import type { Appointment, AppointmentStatus, DoctorOption, Patient } from '../types';

interface AppointmentsPageProps {
  prefillPatientId: number | null;
  openCreateSignal: number;
  onClearPrefill: () => void;
  onBillAppointment: (patientId: number, appointmentId: number) => void;
}

function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function currentTimeHm(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

const STATUS_BADGE: Record<AppointmentStatus, { label: string; classes: string }> = {
  waiting: { label: 'Waiting', classes: 'bg-amber-100 text-amber-800' },
  in_consultation: { label: 'With Doctor', classes: 'bg-emerald-100 text-emerald-800' },
  completed: { label: 'Completed', classes: 'bg-slate-100 text-slate-700' },
  cancelled: { label: 'Cancelled', classes: 'bg-red-100 text-red-700' },
  no_show: { label: 'No Show', classes: 'bg-orange-100 text-orange-800' },
};

export const AppointmentsPage: React.FC<AppointmentsPageProps> = ({
  prefillPatientId,
  openCreateSignal,
  onClearPrefill,
  onBillAppointment,
}) => {
  const [date, setDate] = useState(todayIso());
  const [statusFilter, setStatusFilter] = useState('');
  const [doctorFilter, setDoctorFilter] = useState('');
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [doctors, setDoctors] = useState<DoctorOption[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [patientSearch, setPatientSearch] = useState('');
  const [selectedPatientId, setSelectedPatientId] = useState<number | ''>('');
  const [doctorId, setDoctorId] = useState<string>('');
  const [apptDate, setApptDate] = useState(todayIso());
  const [apptTime, setApptTime] = useState(currentTimeHm());
  const [visitType, setVisitType] = useState<'Walk-in' | 'Scheduled' | 'Follow-up' | 'Therapy'>('Walk-in');
  const [chiefComplaint, setChiefComplaint] = useState('');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  async function loadData(targetDate = date, targetStatus = statusFilter, targetDoctor = doctorFilter) {
    setLoading(true);
    try {
      const qs = new URLSearchParams({ date: targetDate });
      if (targetStatus) qs.set('status', targetStatus);
      if (targetDoctor) qs.set('doctorId', targetDoctor);
      const [apptRes, docRes] = await Promise.all([
        apiFetch<{ appointments: Appointment[] }>(`/api/appointments?${qs.toString()}`),
        apiFetch<{ doctors: DoctorOption[] }>('/api/auth/doctors'),
      ]);
      setAppointments(apptRes.appointments);
      setDoctors(docRes.doctors);
    } finally {
      setLoading(false);
    }
  }

  async function loadPatientList() {
    const res = await apiFetch<{ patients: Patient[] }>('/api/patients');
    setPatients(res.patients);
  }

  useEffect(() => {
    loadData(date, statusFilter, doctorFilter);
  }, [date, statusFilter, doctorFilter]);

  useEffect(() => {
    if (prefillPatientId || openCreateSignal > 0) {
      openBookingModal(prefillPatientId);
    }
  }, [prefillPatientId, openCreateSignal]);

  async function openBookingModal(pid: number | null = null) {
    await loadPatientList();
    setSelectedPatientId(pid ?? '');
    setPatientSearch('');
    setApptDate(date);
    setApptTime(currentTimeHm());
    setVisitType('Walk-in');
    setChiefComplaint('');
    setFormError('');
    if (doctors.length > 0 && !doctorId) {
      setDoctorId(String(doctors[0].id));
    }
    setModalOpen(true);
    if (pid) onClearPrefill();
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedPatientId) {
      setFormError('Please select a patient');
      return;
    }
    setSaving(true);
    setFormError('');
    try {
      await apiFetch('/api/appointments', {
        method: 'POST',
        body: JSON.stringify({
          patient_id: Number(selectedPatientId),
          doctor_id: doctorId ? Number(doctorId) : null,
          appointment_date: apptDate,
          appointment_time: apptTime,
          visit_type: visitType,
          chief_complaint: chiefComplaint,
        }),
      });
      setModalOpen(false);
      setDate(apptDate);
      await loadData(apptDate, statusFilter);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to issue token');
    } finally {
      setSaving(false);
    }
  }

  async function updateStatus(id: number, status: AppointmentStatus) {
    try {
      await apiFetch(`/api/appointments/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      await loadData(date, statusFilter);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update status');
    }
  }

  const filteredPatients = patients.filter((p) => {
    const q = patientSearch.trim().toLowerCase();
    if (!q) return true;
    return (
      p.full_name.toLowerCase().includes(q) ||
      p.phone.toLowerCase().includes(q) ||
      p.patient_code.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#1B4332]">Appointments & Daily Queue</h1>
          <p className="text-sm text-[#5C6B62]">
            Automatic sequential daily token numbers, doctor assignment, and visit status tracking
          </p>
        </div>
        <button
          onClick={() => openBookingModal(null)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#1B4332] hover:bg-[#2D5A27] text-white text-sm font-semibold cursor-pointer"
        >
          <CalendarPlus className="w-4 h-4" />
          Check-In / Book Token
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-2xl border border-[#E5DFD0] flex flex-wrap items-center gap-3">
        <div>
          <label className="block text-[11px] font-semibold uppercase text-[#5C6B62] mb-1">Date</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="px-3 py-2 rounded-xl border border-[#D6CFC0] text-sm"
          />
        </div>
        <div>
          <label className="block text-[11px] font-semibold uppercase text-[#5C6B62] mb-1">Status</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-[#D6CFC0] text-sm bg-white"
          >
            <option value="">All Statuses</option>
            <option value="waiting">Waiting</option>
            <option value="in_consultation">With Doctor</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
            <option value="no_show">No Show</option>
          </select>
        </div>
        <div>
          <label className="block text-[11px] font-semibold uppercase text-[#5C6B62] mb-1">Doctor</label>
          <select
            value={doctorFilter}
            onChange={(e) => setDoctorFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-[#D6CFC0] text-sm bg-white"
          >
            <option value="">All Doctors</option>
            {doctors.map((d) => (
              <option key={d.id} value={d.id}>
                {d.full_name}
              </option>
            ))}
          </select>
        </div>
        <button
          onClick={() => setDate(todayIso())}
          className="mt-4 px-3.5 py-2 rounded-xl bg-[#EDF5EF] text-[#1B4332] text-xs font-semibold cursor-pointer"
        >
          Jump to Today
        </button>
      </div>

      {/* Queue List */}
      <div className="bg-white rounded-2xl border border-[#E5DFD0] shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-sm text-[#5C6B62]">Loading daily schedule...</div>
        ) : appointments.length === 0 ? (
          <div className="p-10 text-center text-sm text-[#5C6B62]">
            No appointments or walk-in tokens for <strong>{date}</strong>.
          </div>
        ) : (
          <div className="divide-y divide-[#F0EBE0]">
            {appointments.map((appt) => {
              const badge = STATUS_BADGE[appt.status];
              return (
                <div
                  key={appt.id}
                  className="p-4 sm:px-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4 hover:bg-[#FAF8F3]"
                >
                  <div className="flex items-start sm:items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-[#1B4332] text-white flex flex-col items-center justify-center shrink-0">
                      <span className="text-[10px] uppercase tracking-wider text-[#B7E4C7]">Token</span>
                      <span className="text-lg font-bold leading-none">
                        #{String(appt.token_number).padStart(2, '0')}
                      </span>
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-[#1B2B22]">{appt.patient_name}</span>
                        <span className="text-xs font-mono text-[#5C6B62]">{appt.patient_code}</span>
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${badge.classes}`}>
                          {badge.label}
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-[#F4EFE6] text-[#5C4B32] text-xs font-medium">
                          {appt.visit_type}
                        </span>
                      </div>
                      <p className="text-xs text-[#5C6B62] mt-1">
                        Time: <strong>{appt.appointment_time}</strong> &bull; Phone: {appt.patient_phone}
                        {appt.doctor_name ? ` • Doctor: ${appt.doctor_name}` : ''}
                      </p>
                      {appt.chief_complaint && (
                        <p className="text-xs text-[#34463C] mt-1">
                          <strong>Reason / Complaint:</strong> {appt.chief_complaint}
                        </p>
                      )}
                      {appt.patient_allergies && (
                        <p className="text-xs text-red-700 font-medium mt-0.5">
                          Allergy Alert: {appt.patient_allergies}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    {appt.status === 'waiting' && (
                      <button
                        onClick={() => updateStatus(appt.id, 'in_consultation')}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#EDF5EF] hover:bg-[#D8F3DC] text-[#1B4332] text-xs font-semibold cursor-pointer"
                      >
                        <Play className="w-3.5 h-3.5" /> Call In
                      </button>
                    )}
                    {(appt.status === 'waiting' || appt.status === 'in_consultation') && (
                      <>
                        <button
                          onClick={() => onBillAppointment(appt.patient_id, appt.id)}
                          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#1B4332] hover:bg-[#2D5A27] text-white text-xs font-semibold cursor-pointer"
                        >
                          <Receipt className="w-3.5 h-3.5" /> Bill & Complete
                        </button>
                        <button
                          onClick={() => updateStatus(appt.id, 'completed')}
                          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[#D6CFC0] hover:bg-[#F4EFE6] text-xs font-semibold cursor-pointer"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" /> Mark Done
                        </button>
                        <button
                          onClick={() => updateStatus(appt.id, 'cancelled')}
                          className="inline-flex items-center gap-1 px-2.5 py-2 rounded-xl text-red-600 hover:bg-red-50 text-xs font-semibold cursor-pointer"
                        >
                          <XCircle className="w-3.5 h-3.5" /> Cancel
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Issue Token Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/45 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden">
            <div className="px-6 py-4 bg-[#1B4332] text-white flex items-center justify-between">
              <h2 className="text-lg font-bold">Issue Queue Token / Appointment</h2>
              <button onClick={() => setModalOpen(false)} className="p-1 rounded-lg hover:bg-white/10 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
                  {formError}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-[#34463C] mb-1">Find & Select Patient *</label>
                <div className="relative mb-2">
                  <Search className="w-4 h-4 text-[#6B7C72] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={patientSearch}
                    onChange={(e) => setPatientSearch(e.target.value)}
                    placeholder="Filter patients by name, phone, or ID..."
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-[#D6CFC0] text-sm"
                  />
                </div>
                <select
                  required
                  value={selectedPatientId}
                  onChange={(e) => setSelectedPatientId(e.target.value ? Number(e.target.value) : '')}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#D6CFC0] bg-white text-sm"
                >
                  <option value="">-- Choose Registered Patient --</option>
                  {filteredPatients.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.full_name} ({p.patient_code}) &mdash; {p.phone}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#34463C] mb-1">Date</label>
                  <input
                    type="date"
                    required
                    value={apptDate}
                    onChange={(e) => setApptDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-[#D6CFC0] text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#34463C] mb-1">Time</label>
                  <input
                    type="time"
                    required
                    value={apptTime}
                    onChange={(e) => setApptTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-[#D6CFC0] text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#34463C] mb-1">Visit Type</label>
                  <select
                    value={visitType}
                    onChange={(e) => setVisitType(e.target.value as typeof visitType)}
                    className="w-full px-3 py-2 rounded-xl border border-[#D6CFC0] bg-white text-sm"
                  >
                    <option value="Walk-in">Walk-in</option>
                    <option value="Scheduled">Scheduled</option>
                    <option value="Follow-up">Follow-up</option>
                    <option value="Therapy">Therapy Session</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#34463C] mb-1">Doctor / Physician</label>
                  <select
                    value={doctorId}
                    onChange={(e) => setDoctorId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-[#D6CFC0] bg-white text-sm"
                  >
                    <option value="">Any Available Doctor</option>
                    {doctors.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.full_name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#34463C] mb-1">
                  Chief Complaint / Therapy Purpose
                </label>
                <input
                  value={chiefComplaint}
                  onChange={(e) => setChiefComplaint(e.target.value)}
                  placeholder="e.g. Knee joint pain, Shirodhara session, routine checkup"
                  className="w-full px-3.5 py-2 rounded-xl border border-[#D6CFC0] text-sm"
                />
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-[#D6CFC0] text-sm font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2.5 rounded-xl bg-[#1B4332] hover:bg-[#2D5A27] text-white text-sm font-semibold cursor-pointer disabled:opacity-60"
                >
                  {saving ? 'Issuing Token...' : 'Confirm & Issue Token'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
