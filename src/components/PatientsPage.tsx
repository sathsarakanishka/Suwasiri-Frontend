import React, { useEffect, useState } from 'react';
import {
  Search,
  UserPlus,
  Edit3,
  Eye,
  CalendarPlus,
  Receipt,
  X,
  Phone,
  HeartPulse,
  Sparkles,
} from 'lucide-react';
import { apiFetch, formatMoney } from '../api';
import type { Appointment, ClinicSettings, Invoice, Patient } from '../types';

interface PatientsPageProps {
  settings: ClinicSettings;
  openCreateSignal: number;
  onBookToken: (patientId: number) => void;
  onCreateBill: (patientId: number) => void;
}

const PRAKRITI_OPTIONS = [
  'Not Assessed',
  'Vata',
  'Pitta',
  'Kapha',
  'Vata-Pitta',
  'Pitta-Kapha',
  'Vata-Kapha',
  'Tridosha',
];

const BLOOD_GROUPS = ['', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

const emptyForm = {
  full_name: '',
  date_of_birth: '',
  age: '',
  gender: 'Female' as 'Male' | 'Female' | 'Other',
  phone: '',
  nic_passport: '',
  email: '',
  address: '',
  emergency_contact_name: '',
  emergency_contact_phone: '',
  blood_group: '',
  prakriti: 'Not Assessed',
  allergies: '',
  chronic_conditions: '',
  notes: '',
};

export const PatientsPage: React.FC<PatientsPageProps> = ({
  settings,
  openCreateSignal,
  onBookToken,
  onCreateBill,
}) => {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);

  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const [detailPatient, setDetailPatient] = useState<{
    patient: Patient;
    appointments: Appointment[];
    invoices: Invoice[];
  } | null>(null);

  async function loadPatients(search = query) {
    setLoading(true);
    try {
      const qs = search.trim() ? `?q=${encodeURIComponent(search.trim())}` : '';
      const res = await apiFetch<{ patients: Patient[] }>(`/api/patients${qs}`);
      setPatients(res.patients);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPatients('');
  }, []);

  useEffect(() => {
    if (openCreateSignal > 0) {
      openRegisterModal();
    }
  }, [openCreateSignal]);

  function openRegisterModal() {
    setEditingId(null);
    setForm(emptyForm);
    setFormError('');
    setFormOpen(true);
  }

  function openEditModal(p: Patient) {
    setEditingId(p.id);
    setForm({
      full_name: p.full_name,
      date_of_birth: p.date_of_birth || '',
      age: p.age !== null && p.age !== undefined ? String(p.age) : '',
      gender: p.gender,
      phone: p.phone,
      nic_passport: p.nic_passport || '',
      email: p.email || '',
      address: p.address || '',
      emergency_contact_name: p.emergency_contact_name || '',
      emergency_contact_phone: p.emergency_contact_phone || '',
      blood_group: p.blood_group || '',
      prakriti: p.prakriti || 'Not Assessed',
      allergies: p.allergies || '',
      chronic_conditions: p.chronic_conditions || '',
      notes: p.notes || '',
    });
    setFormError('');
    setFormOpen(true);
  }

  async function openDetails(id: number) {
    try {
      const res = await apiFetch<{ patient: Patient; appointments: Appointment[]; invoices: Invoice[] }>(
        `/api/patients/${id}`
      );
      setDetailPatient(res);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to load patient details');
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setFormError('');
    try {
      const payload = {
        ...form,
        age: form.age ? Number(form.age) : null,
      };
      if (editingId) {
        await apiFetch(`/api/patients/${editingId}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
      } else {
        await apiFetch('/api/patients', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      }
      setFormOpen(false);
      await loadPatients(query);
      if (detailPatient && editingId === detailPatient.patient.id) {
        await openDetails(editingId);
      }
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to save patient');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#1B4332]">Patient Registration & Profiles</h1>
          <p className="text-sm text-[#5C6B62]">
            Search registered patients, Ayurvedic Prakriti profiles, allergies, and visit history
          </p>
        </div>
        <button
          onClick={openRegisterModal}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#1B4332] hover:bg-[#2D5A27] text-white text-sm font-semibold transition-colors cursor-pointer"
        >
          <UserPlus className="w-4 h-4" />
          Register New Patient
        </button>
      </div>

      {/* Search Bar */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          loadPatients(query);
        }}
        className="flex gap-2"
      >
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-[#6B7C72] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              if (e.target.value === '') loadPatients('');
            }}
            placeholder="Search by patient name, phone number, Patient ID (SW-2026-...), or NIC/Passport..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#D6CFC0] bg-white focus:outline-none focus:ring-2 focus:ring-[#2D5A27]/30"
          />
        </div>
        <button
          type="submit"
          className="px-5 py-2.5 rounded-xl bg-[#2D5A27] hover:bg-[#1B4332] text-white text-sm font-semibold cursor-pointer"
        >
          Search
        </button>
      </form>

      {/* Patient Table */}
      <div className="bg-white rounded-2xl border border-[#E5DFD0] shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#F7F4EC] border-b border-[#E5DFD0] text-xs font-semibold uppercase tracking-wider text-[#5C6B62]">
                <th className="py-3.5 px-4">Patient ID</th>
                <th className="py-3.5 px-4">Name & Contact</th>
                <th className="py-3.5 px-4">Gender / Age</th>
                <th className="py-3.5 px-4">Prakriti (Dosha)</th>
                <th className="py-3.5 px-4">Allergies / Notes</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F0EBE0] text-sm">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-[#5C6B62]">
                    Loading patients...
                  </td>
                </tr>
              ) : patients.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-[#5C6B62]">
                    No patients found. Click <strong>Register New Patient</strong> to add your first patient.
                  </td>
                </tr>
              ) : (
                patients.map((p) => (
                  <tr key={p.id} className="hover:bg-[#FAF8F3]">
                    <td className="py-3.5 px-4 font-mono text-xs font-semibold text-[#1B4332]">
                      {p.patient_code}
                    </td>
                    <td className="py-3.5 px-4">
                      <p className="font-semibold text-[#1B2B22]">{p.full_name}</p>
                      <p className="text-xs text-[#5C6B62] flex items-center gap-1 mt-0.5">
                        <Phone className="w-3 h-3" /> {p.phone}
                        {p.nic_passport ? ` • NIC: ${p.nic_passport}` : ''}
                      </p>
                    </td>
                    <td className="py-3.5 px-4 text-[#34463C]">
                      {p.gender}
                      {p.age ? `, ${p.age} yrs` : ''}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#EDF5EF] text-[#1B4332] text-xs font-medium">
                        <Sparkles className="w-3 h-3" />
                        {p.prakriti || 'Not Assessed'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 max-w-xs truncate text-xs text-[#5C6B62]">
                      {p.allergies ? (
                        <span className="text-red-700 font-medium">Allergy: {p.allergies}</span>
                      ) : (
                        p.chronic_conditions || '—'
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => onBookToken(p.id)}
                          title="Issue Queue Token / Appointment"
                          className="p-2 rounded-lg bg-[#EDF5EF] hover:bg-[#D8F3DC] text-[#1B4332] cursor-pointer"
                        >
                          <CalendarPlus className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => onCreateBill(p.id)}
                          title="Create Bill / Invoice"
                          className="p-2 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 cursor-pointer"
                        >
                          <Receipt className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => openDetails(p.id)}
                          title="View Full Profile"
                          className="p-2 rounded-lg bg-[#F4EFE6] hover:bg-[#E7DFD0] text-[#2D3E35] cursor-pointer"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => openEditModal(p)}
                          title="Edit Patient"
                          className="p-2 rounded-lg bg-[#F4EFE6] hover:bg-[#E7DFD0] text-[#2D3E35] cursor-pointer"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Register / Edit Modal */}
      {formOpen && (
        <div className="fixed inset-0 z-50 bg-black/45 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden">
            <div className="px-6 py-4 bg-[#1B4332] text-white flex items-center justify-between">
              <h2 className="text-lg font-bold">
                {editingId ? 'Edit Patient Profile' : 'Register New Patient'}
              </h2>
              <button onClick={() => setFormOpen(false)} className="p-1 rounded-lg hover:bg-white/10 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 overflow-y-auto space-y-5">
              {formError && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
                  {formError}
                </div>
              )}

              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#2D5A27] mb-3">
                  Personal & Contact Information
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-[#34463C] mb-1">Full Name *</label>
                    <input
                      required
                      value={form.full_name}
                      onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                      placeholder="Patient full name"
                      className="w-full px-3.5 py-2 rounded-xl border border-[#D6CFC0] focus:outline-none focus:ring-2 focus:ring-[#2D5A27]/30"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#34463C] mb-1">Phone Number *</label>
                    <input
                      required
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      placeholder="07X XXX XXXX"
                      className="w-full px-3.5 py-2 rounded-xl border border-[#D6CFC0] focus:outline-none focus:ring-2 focus:ring-[#2D5A27]/30"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#34463C] mb-1">Gender *</label>
                    <select
                      value={form.gender}
                      onChange={(e) => setForm({ ...form, gender: e.target.value as 'Male' | 'Female' | 'Other' })}
                      className="w-full px-3.5 py-2 rounded-xl border border-[#D6CFC0] bg-white"
                    >
                      <option value="Female">Female</option>
                      <option value="Male">Male</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#34463C] mb-1">Age (Years)</label>
                    <input
                      type="number"
                      min="0"
                      max="130"
                      value={form.age}
                      onChange={(e) => setForm({ ...form, age: e.target.value })}
                      placeholder="e.g. 42"
                      className="w-full px-3.5 py-2 rounded-xl border border-[#D6CFC0]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#34463C] mb-1">Date of Birth</label>
                    <input
                      type="date"
                      value={form.date_of_birth}
                      onChange={(e) => setForm({ ...form, date_of_birth: e.target.value })}
                      className="w-full px-3.5 py-2 rounded-xl border border-[#D6CFC0]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#34463C] mb-1">NIC / Passport</label>
                    <input
                      value={form.nic_passport}
                      onChange={(e) => setForm({ ...form, nic_passport: e.target.value })}
                      placeholder="Optional"
                      className="w-full px-3.5 py-2 rounded-xl border border-[#D6CFC0]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#34463C] mb-1">Email</label>
                    <input
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      placeholder="Optional"
                      className="w-full px-3.5 py-2 rounded-xl border border-[#D6CFC0]"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-[#34463C] mb-1">Home Address</label>
                    <input
                      value={form.address}
                      onChange={(e) => setForm({ ...form, address: e.target.value })}
                      placeholder="Street, city"
                      className="w-full px-3.5 py-2 rounded-xl border border-[#D6CFC0]"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-[#ECE6D8]">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#2D5A27] mb-3">
                  Ayurvedic & Medical Profile
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#34463C] mb-1">Prakriti (Dosha Constitution)</label>
                    <select
                      value={form.prakriti}
                      onChange={(e) => setForm({ ...form, prakriti: e.target.value })}
                      className="w-full px-3.5 py-2 rounded-xl border border-[#D6CFC0] bg-white"
                    >
                      {PRAKRITI_OPTIONS.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#34463C] mb-1">Blood Group</label>
                    <select
                      value={form.blood_group}
                      onChange={(e) => setForm({ ...form, blood_group: e.target.value })}
                      className="w-full px-3.5 py-2 rounded-xl border border-[#D6CFC0] bg-white"
                    >
                      {BLOOD_GROUPS.map((bg) => (
                        <option key={bg || 'none'} value={bg}>
                          {bg || 'Not Specified'}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#34463C] mb-1">Known Allergies</label>
                    <input
                      value={form.allergies}
                      onChange={(e) => setForm({ ...form, allergies: e.target.value })}
                      placeholder="e.g. Sesame oil, Penicillin, None"
                      className="w-full px-3.5 py-2 rounded-xl border border-[#D6CFC0]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#34463C] mb-1">Chronic Conditions</label>
                    <input
                      value={form.chronic_conditions}
                      onChange={(e) => setForm({ ...form, chronic_conditions: e.target.value })}
                      placeholder="e.g. Diabetes, Arthritis, Hypertension"
                      className="w-full px-3.5 py-2 rounded-xl border border-[#D6CFC0]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#34463C] mb-1">Emergency Contact Name</label>
                    <input
                      value={form.emergency_contact_name}
                      onChange={(e) => setForm({ ...form, emergency_contact_name: e.target.value })}
                      placeholder="Family member / guardian"
                      className="w-full px-3.5 py-2 rounded-xl border border-[#D6CFC0]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#34463C] mb-1">Emergency Contact Phone</label>
                    <input
                      value={form.emergency_contact_phone}
                      onChange={(e) => setForm({ ...form, emergency_contact_phone: e.target.value })}
                      placeholder="07X XXX XXXX"
                      className="w-full px-3.5 py-2 rounded-xl border border-[#D6CFC0]"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-[#34463C] mb-1">Clinical / Lifestyle Notes</label>
                    <textarea
                      rows={2}
                      value={form.notes}
                      onChange={(e) => setForm({ ...form, notes: e.target.value })}
                      placeholder="Diet habits, sleep pattern, previous treatments..."
                      className="w-full px-3.5 py-2 rounded-xl border border-[#D6CFC0]"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-[#ECE6D8] flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setFormOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-[#D6CFC0] text-sm font-medium hover:bg-[#F4EFE6] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2.5 rounded-xl bg-[#1B4332] hover:bg-[#2D5A27] text-white text-sm font-semibold cursor-pointer disabled:opacity-60"
                >
                  {saving ? 'Saving...' : editingId ? 'Save Changes' : 'Register Patient'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Patient Profile Detail Modal */}
      {detailPatient && (
        <div className="fixed inset-0 z-50 bg-black/45 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden">
            <div className="px-6 py-4 bg-[#1B4332] text-white flex items-center justify-between">
              <div>
                <p className="text-xs text-[#B7E4C7] font-mono">{detailPatient.patient.patient_code}</p>
                <h2 className="text-lg font-bold">{detailPatient.patient.full_name}</h2>
              </div>
              <button
                onClick={() => setDetailPatient(null)}
                className="p-1 rounded-lg hover:bg-white/10 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6">
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => {
                    const id = detailPatient.patient.id;
                    setDetailPatient(null);
                    onBookToken(id);
                  }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#1B4332] text-white text-xs font-semibold cursor-pointer"
                >
                  <CalendarPlus className="w-4 h-4" /> Issue Queue Token
                </button>
                <button
                  onClick={() => {
                    const id = detailPatient.patient.id;
                    setDetailPatient(null);
                    onCreateBill(id);
                  }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-600 text-white text-xs font-semibold cursor-pointer"
                >
                  <Receipt className="w-4 h-4" /> Create Bill
                </button>
                <button
                  onClick={() => openEditModal(detailPatient.patient)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-[#D6CFC0] text-xs font-semibold cursor-pointer"
                >
                  <Edit3 className="w-4 h-4" /> Edit Profile
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-[#FAF8F3] p-4 rounded-xl border border-[#E5DFD0] text-sm">
                <div>
                  <span className="text-xs text-[#5C6B62]">Phone:</span>{' '}
                  <span className="font-medium">{detailPatient.patient.phone}</span>
                </div>
                <div>
                  <span className="text-xs text-[#5C6B62]">Gender / Age:</span>{' '}
                  <span className="font-medium">
                    {detailPatient.patient.gender}
                    {detailPatient.patient.age ? `, ${detailPatient.patient.age} yrs` : ''}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-[#5C6B62]">Prakriti:</span>{' '}
                  <span className="font-semibold text-[#1B4332]">{detailPatient.patient.prakriti}</span>
                </div>
                <div>
                  <span className="text-xs text-[#5C6B62]">Blood Group:</span>{' '}
                  <span className="font-medium">{detailPatient.patient.blood_group || '—'}</span>
                </div>
                <div className="sm:col-span-2">
                  <span className="text-xs text-[#5C6B62]">Address:</span>{' '}
                  <span>{detailPatient.patient.address || '—'}</span>
                </div>
                <div className="sm:col-span-2 flex items-start gap-2">
                  <HeartPulse className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />
                  <div>
                    <span className="text-xs font-semibold text-red-700">Allergies:</span>{' '}
                    <span>{detailPatient.patient.allergies || 'None recorded'}</span>
                    {detailPatient.patient.chronic_conditions && (
                      <p className="text-xs text-[#34463C] mt-1">
                        <strong>Conditions:</strong> {detailPatient.patient.chronic_conditions}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Visit History */}
              <div>
                <h3 className="font-bold text-sm text-[#1B4332] mb-2">
                  Visit & Appointment History ({detailPatient.appointments.length})
                </h3>
                {detailPatient.appointments.length === 0 ? (
                  <p className="text-xs text-[#5C6B62]">No visits recorded yet.</p>
                ) : (
                  <div className="space-y-2">
                    {detailPatient.appointments.map((a) => (
                      <div
                        key={a.id}
                        className="p-3 rounded-xl border border-[#ECE6D8] flex items-center justify-between text-xs"
                      >
                        <div>
                          <span className="font-semibold">{a.appointment_date}</span> at {a.appointment_time} (Token #
                          {a.token_number}) &bull; {a.visit_type}
                          {a.chief_complaint && <p className="text-[#5C6B62] mt-0.5">{a.chief_complaint}</p>}
                        </div>
                        <span className="px-2 py-0.5 rounded-full bg-[#EDF5EF] text-[#1B4332] font-semibold capitalize">
                          {a.status.replace('_', ' ')}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Billing History */}
              <div>
                <h3 className="font-bold text-sm text-[#1B4332] mb-2">
                  Billing History ({detailPatient.invoices.length})
                </h3>
                {detailPatient.invoices.length === 0 ? (
                  <p className="text-xs text-[#5C6B62]">No invoices recorded yet.</p>
                ) : (
                  <div className="space-y-2">
                    {detailPatient.invoices.map((inv) => (
                      <div
                        key={inv.id}
                        className="p-3 rounded-xl border border-[#ECE6D8] flex items-center justify-between text-xs"
                      >
                        <div>
                          <span className="font-mono font-semibold">{inv.invoice_number}</span>
                          <span className="text-[#5C6B62] ml-2">{inv.created_at}</span>
                        </div>
                        <div className="text-right">
                          <span className="font-bold">{formatMoney(inv.total_amount, settings.currency)}</span>
                          <span className="ml-2 px-2 py-0.5 rounded-full bg-[#F4EFE6] uppercase text-[10px] font-bold">
                            {inv.payment_status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
