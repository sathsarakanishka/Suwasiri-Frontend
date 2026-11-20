import React, { useEffect, useState } from 'react';
import { Download, KeyRound, ShieldCheck, UserPlus, X } from 'lucide-react';
import { apiFetch, getAuthToken } from '../api';
import type { ClinicSettings, User, UserRole } from '../types';

interface StaffSettingsPageProps {
  currentUser: User;
  settings: ClinicSettings;
  onSettingsUpdated: (next: ClinicSettings) => void;
}

export const StaffSettingsPage: React.FC<StaffSettingsPageProps> = ({
  currentUser,
  settings,
  onSettingsUpdated,
}) => {
  const isAdmin = currentUser.role === 'admin';

  // Clinic settings form
  const [clinicForm, setClinicForm] = useState<ClinicSettings>(settings);
  const [settingsMsg, setSettingsMsg] = useState('');

  // Staff list (Admin only)
  const [staff, setStaff] = useState<User[]>([]);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [newStaff, setNewStaff] = useState({
    username: '',
    full_name: '',
    role: 'doctor' as UserRole,
    password: '',
    specialty: '',
    phone: '',
  });
  const [editingStaff, setEditingStaff] = useState<User | null>(null);
  const [editError, setEditError] = useState('');
  const [staffError, setStaffError] = useState('');

  // Change own password
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [pwMessage, setPwMessage] = useState('');
  const [pwError, setPwError] = useState('');

  useEffect(() => {
    setClinicForm(settings);
  }, [settings]);

  async function loadStaff() {
    if (!isAdmin) return;
    const res = await apiFetch<{ staff: User[] }>('/api/staff');
    setStaff(res.staff);
  }

  useEffect(() => {
    loadStaff();
  }, [isAdmin]);

  async function handleSaveSettings(e: React.FormEvent) {
    e.preventDefault();
    setSettingsMsg('');
    const res = await apiFetch<{ settings: ClinicSettings }>('/api/settings', {
      method: 'PUT',
      body: JSON.stringify(clinicForm),
    });
    onSettingsUpdated(res.settings);
    setSettingsMsg('Clinic details updated successfully.');
  }

  async function handleAddStaff(e: React.FormEvent) {
    e.preventDefault();
    setStaffError('');
    try {
      await apiFetch('/api/staff', {
        method: 'POST',
        body: JSON.stringify(newStaff),
      });
      setAddModalOpen(false);
      setNewStaff({ username: '', full_name: '', role: 'doctor', password: '', specialty: '', phone: '' });
      await loadStaff();
    } catch (err) {
      setStaffError(err instanceof Error ? err.message : 'Failed to create staff account');
    }
  }

  async function handleSaveEditStaff(e: React.FormEvent) {
    e.preventDefault();
    if (!editingStaff) return;
    setEditError('');
    try {
      await apiFetch(`/api/staff/${editingStaff.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          full_name: editingStaff.full_name,
          role: editingStaff.role,
          specialty: editingStaff.specialty,
          phone: editingStaff.phone,
          is_active: editingStaff.is_active,
        }),
      });
      setEditingStaff(null);
      await loadStaff();
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'Failed to update staff account');
    }
  }

  async function toggleStaffActive(member: User) {
    try {
      await apiFetch(`/api/staff/${member.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          full_name: member.full_name,
          role: member.role,
          specialty: member.specialty,
          phone: member.phone,
          is_active: member.is_active ? 0 : 1,
        }),
      });
      await loadStaff();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Update failed');
    }
  }

  async function handleResetStaffPassword(member: User) {
    const pw = window.prompt(`Enter new password (min 6 chars) for ${member.full_name}:`);
    if (!pw) return;
    try {
      await apiFetch(`/api/staff/${member.id}/reset-password`, {
        method: 'POST',
        body: JSON.stringify({ password: pw }),
      });
      alert('Password reset successfully.');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to reset password');
    }
  }

  async function handleChangeOwnPassword(e: React.FormEvent) {
    e.preventDefault();
    setPwMessage('');
    setPwError('');
    try {
      await apiFetch('/api/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      setCurrentPassword('');
      setNewPassword('');
      setPwMessage('Your password has been updated.');
    } catch (err) {
      setPwError(err instanceof Error ? err.message : 'Failed to update password');
    }
  }

  function downloadBackup() {
    const token = getAuthToken();
    if (!token) return;
    window.open(`/api/admin/backup?token=${encodeURIComponent(token)}`, '_blank');
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#1B4332]">Staff & Clinic Settings</h1>
        <p className="text-sm text-[#5C6B62]">
          Manage clinic receipt details, local database backups, staff roles, and account security
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Clinic Settings & DB Backup (Admin) */}
        {isAdmin && (
          <div className="lg:col-span-7 bg-white rounded-2xl border border-[#E5DFD0] p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-[#1B4332]">Clinic & Receipt Settings</h2>
              <button
                type="button"
                onClick={downloadBackup}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#EDF5EF] hover:bg-[#D8F3DC] text-[#1B4332] text-xs font-semibold cursor-pointer"
              >
                <Download className="w-4 h-4" /> Download DB Backup
              </button>
            </div>

            {settingsMsg && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm">
                {settingsMsg}
              </div>
            )}

            <form onSubmit={handleSaveSettings} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-[#34463C] mb-1">Medical Center Name</label>
                <input
                  value={clinicForm.clinic_name || ''}
                  onChange={(e) => setClinicForm({ ...clinicForm, clinic_name: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-[#D6CFC0] text-sm"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-[#34463C] mb-1">Tagline</label>
                <input
                  value={clinicForm.tagline || ''}
                  onChange={(e) => setClinicForm({ ...clinicForm, tagline: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-[#D6CFC0] text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#34463C] mb-1">Clinic Phone</label>
                <input
                  value={clinicForm.phone || ''}
                  onChange={(e) => setClinicForm({ ...clinicForm, phone: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-[#D6CFC0] text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#34463C] mb-1">Address</label>
                <input
                  value={clinicForm.address || ''}
                  onChange={(e) => setClinicForm({ ...clinicForm, address: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-[#D6CFC0] text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#34463C] mb-1">Currency Symbol</label>
                <input
                  value={clinicForm.currency || 'Rs.'}
                  onChange={(e) => setClinicForm({ ...clinicForm, currency: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-[#D6CFC0] text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#34463C] mb-1">Default Consultation Fee</label>
                <input
                  type="number"
                  min="0"
                  value={clinicForm.consultation_fee || '1500'}
                  onChange={(e) => setClinicForm({ ...clinicForm, consultation_fee: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-[#D6CFC0] text-sm"
                />
              </div>
              <div className="sm:col-span-2 flex justify-end">
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-[#1B4332] hover:bg-[#2D5A27] text-white text-sm font-semibold cursor-pointer"
                >
                  Save Clinic Details
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Change Own Password */}
        <div className={`${isAdmin ? 'lg:col-span-5' : 'lg:col-span-6'} bg-white rounded-2xl border border-[#E5DFD0] p-6 space-y-4`}>
          <div className="flex items-center gap-2">
            <KeyRound className="w-5 h-5 text-[#1B4332]" />
            <h2 className="font-bold text-[#1B4332]">Change Your Password</h2>
          </div>
          {pwMessage && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs">
              {pwMessage}
            </div>
          )}
          {pwError && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs">
              {pwError}
            </div>
          )}
          <form onSubmit={handleChangeOwnPassword} className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-[#34463C] mb-1">Current Password</label>
              <input
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-[#D6CFC0] text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#34463C] mb-1">New Password (min 6 chars)</label>
              <input
                type="password"
                required
                minLength={6}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-[#D6CFC0] text-sm"
              />
            </div>
            <button
              type="submit"
              className="w-full py-2.5 rounded-xl bg-[#2D5A27] hover:bg-[#1B4332] text-white text-sm font-semibold cursor-pointer"
            >
              Update Password
            </button>
          </form>
        </div>
      </div>

      {/* Staff Accounts Table (Admin) */}
      {isAdmin && (
        <div className="bg-white rounded-2xl border border-[#E5DFD0] overflow-hidden">
          <div className="px-6 py-4 border-b border-[#EFEAE0] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-[#1B4332]" />
              <h2 className="font-bold text-[#1B4332]">Staff Accounts & Role Permissions</h2>
            </div>
            <button
              onClick={() => {
                setStaffError('');
                setAddModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#1B4332] text-white text-xs font-semibold cursor-pointer"
            >
              <UserPlus className="w-4 h-4" /> Add Staff Account
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-[#F7F4EC] border-b border-[#E5DFD0] text-xs font-semibold uppercase text-[#5C6B62]">
                  <th className="py-3 px-4">Username</th>
                  <th className="py-3 px-4">Full Name</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Specialty / Phone</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F0EBE0]">
                {staff.map((m) => (
                  <tr key={m.id}>
                    <td className="py-3 px-4 font-mono text-xs font-semibold">{m.username}</td>
                    <td className="py-3 px-4 font-medium">{m.full_name}</td>
                    <td className="py-3 px-4">
                      <span className="px-2.5 py-0.5 rounded-full bg-[#EDF5EF] text-[#1B4332] text-xs font-semibold capitalize">
                        {m.role}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-xs text-[#5C6B62]">
                      {m.specialty || '—'} {m.phone ? `• ${m.phone}` : ''}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                          m.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-200 text-gray-600'
                        }`}
                      >
                        {m.is_active ? 'Active' : 'Disabled'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right space-x-2">
                      <button
                        onClick={() => {
                          setEditError('');
                          setEditingStaff({ ...m });
                        }}
                        className="px-2.5 py-1 rounded-lg border border-[#D6CFC0] text-xs font-medium hover:bg-[#F4EFE6] cursor-pointer"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleResetStaffPassword(m)}
                        className="px-2.5 py-1 rounded-lg border border-[#D6CFC0] text-xs font-medium hover:bg-[#F4EFE6] cursor-pointer"
                      >
                        Reset Password
                      </button>
                      {m.id !== currentUser.id && (
                        <button
                          onClick={() => toggleStaffActive(m)}
                          className="px-2.5 py-1 rounded-lg border border-[#D6CFC0] text-xs font-medium hover:bg-[#F4EFE6] cursor-pointer"
                        >
                          {m.is_active ? 'Disable' : 'Enable'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Edit Staff Modal */}
      {editingStaff && (
        <div className="fixed inset-0 z-50 bg-black/45 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 bg-[#1B4332] text-white flex items-center justify-between">
              <h2 className="font-bold">Edit Staff Account ({editingStaff.username})</h2>
              <button onClick={() => setEditingStaff(null)} className="p-1 rounded-lg hover:bg-white/10 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveEditStaff} className="p-6 space-y-3.5">
              {editError && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs">
                  {editError}
                </div>
              )}
              <div>
                <label className="block text-xs font-semibold text-[#34463C] mb-1">Full Name *</label>
                <input
                  required
                  value={editingStaff.full_name}
                  onChange={(e) => setEditingStaff({ ...editingStaff, full_name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-[#D6CFC0] text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#34463C] mb-1">Role *</label>
                <select
                  value={editingStaff.role}
                  onChange={(e) => setEditingStaff({ ...editingStaff, role: e.target.value as UserRole })}
                  className="w-full px-3 py-2 rounded-xl border border-[#D6CFC0] bg-white text-sm"
                >
                  <option value="doctor">Doctor</option>
                  <option value="admin">Admin</option>
                  <option value="receptionist">Receptionist</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#34463C] mb-1">Specialty</label>
                  <input
                    value={editingStaff.specialty || ''}
                    onChange={(e) => setEditingStaff({ ...editingStaff, specialty: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-[#D6CFC0] text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#34463C] mb-1">Phone</label>
                  <input
                    value={editingStaff.phone || ''}
                    onChange={(e) => setEditingStaff({ ...editingStaff, phone: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-[#D6CFC0] text-sm"
                  />
                </div>
              </div>
              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingStaff(null)}
                  className="px-4 py-2 rounded-xl border border-[#D6CFC0] text-sm cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#1B4332] text-white text-sm font-semibold cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Staff Modal */}
      {addModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/45 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 bg-[#1B4332] text-white flex items-center justify-between">
              <h2 className="font-bold">Create Staff Account</h2>
              <button onClick={() => setAddModalOpen(false)} className="p-1 rounded-lg hover:bg-white/10 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddStaff} className="p-6 space-y-3.5">
              {staffError && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs">
                  {staffError}
                </div>
              )}
              <div>
                <label className="block text-xs font-semibold text-[#34463C] mb-1">Full Name *</label>
                <input
                  required
                  value={newStaff.full_name}
                  onChange={(e) => setNewStaff({ ...newStaff, full_name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-[#D6CFC0] text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#34463C] mb-1">Username *</label>
                  <input
                    required
                    value={newStaff.username}
                    onChange={(e) => setNewStaff({ ...newStaff, username: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-[#D6CFC0] text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#34463C] mb-1">Role *</label>
                  <select
                    value={newStaff.role}
                    onChange={(e) => setNewStaff({ ...newStaff, role: e.target.value as UserRole })}
                    className="w-full px-3 py-2 rounded-xl border border-[#D6CFC0] bg-white text-sm"
                  >
                    <option value="receptionist">Receptionist</option>
                    <option value="doctor">Doctor</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#34463C] mb-1">Initial Password *</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={newStaff.password}
                  onChange={(e) => setNewStaff({ ...newStaff, password: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-[#D6CFC0] text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#34463C] mb-1">Specialty</label>
                  <input
                    value={newStaff.specialty}
                    onChange={(e) => setNewStaff({ ...newStaff, specialty: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-[#D6CFC0] text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#34463C] mb-1">Phone</label>
                  <input
                    value={newStaff.phone}
                    onChange={(e) => setNewStaff({ ...newStaff, phone: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-[#D6CFC0] text-sm"
                  />
                </div>
              </div>
              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-[#D6CFC0] text-sm cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#1B4332] text-white text-sm font-semibold cursor-pointer"
                >
                  Create Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
