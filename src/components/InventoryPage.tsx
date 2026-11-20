import React, { useEffect, useState } from 'react';
import {
  Plus,
  Search,
  Edit3,
  PackagePlus,
  History,
  AlertTriangle,
  X,
} from 'lucide-react';
import { apiFetch, formatMoney } from '../api';
import type { ClinicSettings, InventoryCategory, InventoryItem, InventoryLog, UserRole } from '../types';

interface InventoryPageProps {
  settings: ClinicSettings;
  userRole: UserRole;
}

const emptyItem = {
  sku: '',
  name: '',
  category: 'medicine' as InventoryCategory,
  unit: 'bottle',
  unit_price: '0',
  stock_quantity: '0',
  reorder_level: '5',
  expiry_date: '',
  supplier: '',
  description: '',
};

export const InventoryPage: React.FC<InventoryPageProps> = ({ settings, userRole }) => {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [category, setCategory] = useState<string>('');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);

  const [itemModalOpen, setItemModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyItem);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [adjustItem, setAdjustItem] = useState<InventoryItem | null>(null);
  const [adjustAmount, setAdjustAmount] = useState('10');
  const [adjustReason, setAdjustReason] = useState<'restock' | 'dispense' | 'adjustment'>('restock');
  const [adjustNotes, setAdjustNotes] = useState('');

  const [logsModal, setLogsModal] = useState<{ item: InventoryItem; logs: InventoryLog[] } | null>(null);

  const canManageCatalog = userRole === 'admin' || userRole === 'doctor';
  const currency = settings.currency || 'Rs.';

  async function loadItems(cat = category, search = query) {
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      if (cat) qs.set('category', cat);
      if (search.trim()) qs.set('q', search.trim());
      const res = await apiFetch<{ items: InventoryItem[] }>(`/api/inventory?${qs.toString()}`);
      setItems(res.items);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadItems(category, query);
  }, [category]);

  function openAddModal() {
    setEditingId(null);
    setForm(emptyItem);
    setError('');
    setItemModalOpen(true);
  }

  function openEditModal(item: InventoryItem) {
    setEditingId(item.id);
    setForm({
      sku: item.sku,
      name: item.name,
      category: item.category,
      unit: item.unit,
      unit_price: String(item.unit_price),
      stock_quantity: String(item.stock_quantity),
      reorder_level: String(item.reorder_level),
      expiry_date: item.expiry_date || '',
      supplier: item.supplier || '',
      description: item.description || '',
    });
    setError('');
    setItemModalOpen(true);
  }

  async function handleSaveItem(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const payload = {
        ...form,
        unit_price: Number(form.unit_price),
        stock_quantity: Number(form.stock_quantity),
        reorder_level: Number(form.reorder_level),
      };
      if (editingId) {
        await apiFetch(`/api/inventory/${editingId}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
      } else {
        await apiFetch('/api/inventory', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      }
      setItemModalOpen(false);
      await loadItems(category, query);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save item');
    } finally {
      setSaving(false);
    }
  }

  async function handleAdjustStock(e: React.FormEvent) {
    e.preventDefault();
    if (!adjustItem) return;
    const raw = Number(adjustAmount);
    if (Number.isNaN(raw) || raw === 0) return;

    const delta = adjustReason === 'dispense' ? -Math.abs(raw) : adjustReason === 'restock' ? Math.abs(raw) : raw;
    try {
      await apiFetch(`/api/inventory/${adjustItem.id}/adjust`, {
        method: 'POST',
        body: JSON.stringify({
          change_amount: delta,
          reason: adjustReason,
          notes: adjustNotes,
        }),
      });
      setAdjustItem(null);
      setAdjustNotes('');
      await loadItems(category, query);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Stock adjustment failed');
    }
  }

  async function viewLogs(item: InventoryItem) {
    const res = await apiFetch<{ logs: InventoryLog[] }>(`/api/inventory/${item.id}/logs`);
    setLogsModal({ item, logs: res.logs });
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#1B4332]">Herbal Medicines & Treatments Catalog</h1>
          <p className="text-sm text-[#5C6B62]">
            Track herbal pharmacy stock, reorder alerts, expiry dates, and Ayurvedic therapy pricing
          </p>
        </div>
        {canManageCatalog && (
          <button
            onClick={openAddModal}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#1B4332] hover:bg-[#2D5A27] text-white text-sm font-semibold cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Add Medicine / Treatment
          </button>
        )}
      </div>

      {/* Category Tabs + Search */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {[
            { id: '', label: 'All Catalog' },
            { id: 'medicine', label: 'Herbal Medicines' },
            { id: 'treatment', label: 'Therapies & Treatments' },
            { id: 'supplement', label: 'Supplements' },
          ].map((tab) => (
            <button
              key={tab.id || 'all'}
              onClick={() => setCategory(tab.id)}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                category === tab.id
                  ? 'bg-[#1B4332] text-white'
                  : 'bg-white border border-[#D6CFC0] text-[#34463C] hover:bg-[#F4EFE6]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            loadItems(category, query);
          }}
          className="flex gap-2"
        >
          <div className="relative">
            <Search className="w-4 h-4 text-[#6B7C72] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                if (e.target.value === '') loadItems(category, '');
              }}
              placeholder="Search name, SKU, supplier..."
              className="pl-9 pr-3 py-2 rounded-xl border border-[#D6CFC0] bg-white text-sm w-64"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 rounded-xl bg-[#2D5A27] text-white text-xs font-semibold cursor-pointer"
          >
            Find
          </button>
        </form>
      </div>

      {/* Inventory Table */}
      <div className="bg-white rounded-2xl border border-[#E5DFD0] shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#F7F4EC] border-b border-[#E5DFD0] text-xs font-semibold uppercase tracking-wider text-[#5C6B62]">
                <th className="py-3.5 px-4">SKU</th>
                <th className="py-3.5 px-4">Item / Therapy Name</th>
                <th className="py-3.5 px-4">Category</th>
                <th className="py-3.5 px-4">Unit Price</th>
                <th className="py-3.5 px-4">Stock Level</th>
                <th className="py-3.5 px-4">Expiry / Supplier</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F0EBE0] text-sm">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-[#5C6B62]">
                    Loading inventory...
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-[#5C6B62]">
                    No catalog items match your filter.
                  </td>
                </tr>
              ) : (
                items.map((item) => {
                  const isLow = item.category !== 'treatment' && item.stock_quantity <= item.reorder_level;
                  return (
                    <tr key={item.id} className="hover:bg-[#FAF8F3]">
                      <td className="py-3.5 px-4 font-mono text-xs font-semibold text-[#1B4332]">
                        {item.sku}
                      </td>
                      <td className="py-3.5 px-4">
                        <p className="font-semibold text-[#1B2B22]">{item.name}</p>
                        {item.description && (
                          <p className="text-xs text-[#5C6B62] truncate max-w-xs">{item.description}</p>
                        )}
                      </td>
                      <td className="py-3.5 px-4 capitalize">
                        <span className="px-2.5 py-1 rounded-full bg-[#EDF5EF] text-[#1B4332] text-xs font-medium">
                          {item.category}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-semibold">
                        {formatMoney(item.unit_price, currency)}{' '}
                        <span className="text-xs font-normal text-[#5C6B62]">/ {item.unit}</span>
                      </td>
                      <td className="py-3.5 px-4">
                        {item.category === 'treatment' ? (
                          <span className="text-xs text-[#5C6B62]">Service</span>
                        ) : (
                          <div className="inline-flex items-center gap-1.5">
                            <span
                              className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                                isLow ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-800'
                              }`}
                            >
                              {item.stock_quantity} {item.unit}
                            </span>
                            {isLow && <AlertTriangle className="w-4 h-4 text-red-600" />}
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-xs text-[#5C6B62]">
                        {item.expiry_date && <p>Exp: {item.expiry_date}</p>}
                        {item.supplier && <p>{item.supplier}</p>}
                        {!item.expiry_date && !item.supplier && '—'}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center justify-end gap-1.5">
                          {item.category !== 'treatment' && (
                            <>
                              <button
                                onClick={() => {
                                  setAdjustItem(item);
                                  setAdjustAmount('10');
                                  setAdjustReason('restock');
                                  setAdjustNotes('');
                                }}
                                title="Adjust Stock"
                                className="p-2 rounded-lg bg-[#EDF5EF] hover:bg-[#D8F3DC] text-[#1B4332] cursor-pointer"
                              >
                                <PackagePlus className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => viewLogs(item)}
                                title="Stock History"
                                className="p-2 rounded-lg bg-[#F4EFE6] hover:bg-[#E7DFD0] text-[#2D3E35] cursor-pointer"
                              >
                                <History className="w-4 h-4" />
                              </button>
                            </>
                          )}
                          {canManageCatalog && (
                            <button
                              onClick={() => openEditModal(item)}
                              title="Edit Item"
                              className="p-2 rounded-lg bg-[#F4EFE6] hover:bg-[#E7DFD0] text-[#2D3E35] cursor-pointer"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Catalog Item Modal */}
      {itemModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/45 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden">
            <div className="px-6 py-4 bg-[#1B4332] text-white flex items-center justify-between">
              <h2 className="text-lg font-bold">
                {editingId ? 'Edit Catalog Item' : 'Add Herbal Medicine / Treatment'}
              </h2>
              <button onClick={() => setItemModalOpen(false)} className="p-1 rounded-lg hover:bg-white/10 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveItem} className="p-6 space-y-4">
              {error && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
                  {error}
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#34463C] mb-1">SKU Code *</label>
                  <input
                    required
                    disabled={!!editingId}
                    value={form.sku}
                    onChange={(e) => setForm({ ...form, sku: e.target.value })}
                    placeholder="MED-105"
                    className="w-full px-3 py-2 rounded-xl border border-[#D6CFC0] text-sm disabled:bg-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#34463C] mb-1">Category *</label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value as InventoryCategory })}
                    className="w-full px-3 py-2 rounded-xl border border-[#D6CFC0] bg-white text-sm"
                  >
                    <option value="medicine">Herbal Medicine</option>
                    <option value="treatment">Ayurvedic Treatment</option>
                    <option value="supplement">Supplement / Tonic</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#34463C] mb-1">Item / Therapy Name *</label>
                <input
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Mahanarayana Thailaya (200ml)"
                  className="w-full px-3 py-2 rounded-xl border border-[#D6CFC0] text-sm"
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#34463C] mb-1">Unit *</label>
                  <input
                    required
                    value={form.unit}
                    onChange={(e) => setForm({ ...form, unit: e.target.value })}
                    placeholder="bottle / session / pack"
                    className="w-full px-3 py-2 rounded-xl border border-[#D6CFC0] text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#34463C] mb-1">Price ({currency}) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={form.unit_price}
                    onChange={(e) => setForm({ ...form, unit_price: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-[#D6CFC0] text-sm"
                  />
                </div>
                {form.category !== 'treatment' && (
                  <div>
                    <label className="block text-xs font-semibold text-[#34463C] mb-1">Reorder Alert At</label>
                    <input
                      type="number"
                      min="0"
                      value={form.reorder_level}
                      onChange={(e) => setForm({ ...form, reorder_level: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-[#D6CFC0] text-sm"
                    />
                  </div>
                )}
              </div>
              {!editingId && form.category !== 'treatment' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#34463C] mb-1">Opening Stock</label>
                    <input
                      type="number"
                      min="0"
                      value={form.stock_quantity}
                      onChange={(e) => setForm({ ...form, stock_quantity: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-[#D6CFC0] text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#34463C] mb-1">Expiry Date</label>
                    <input
                      type="date"
                      value={form.expiry_date}
                      onChange={(e) => setForm({ ...form, expiry_date: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-[#D6CFC0] text-sm"
                    />
                  </div>
                </div>
              )}
              {editingId && form.category !== 'treatment' && (
                <div>
                  <label className="block text-xs font-semibold text-[#34463C] mb-1">Expiry Date</label>
                  <input
                    type="date"
                    value={form.expiry_date}
                    onChange={(e) => setForm({ ...form, expiry_date: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-[#D6CFC0] text-sm"
                  />
                </div>
              )}
              <div>
                <label className="block text-xs font-semibold text-[#34463C] mb-1">Supplier / Source</label>
                <input
                  value={form.supplier}
                  onChange={(e) => setForm({ ...form, supplier: e.target.value })}
                  placeholder="Supplier name"
                  className="w-full px-3 py-2 rounded-xl border border-[#D6CFC0] text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#34463C] mb-1">Description</label>
                <input
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Usage or therapy details"
                  className="w-full px-3 py-2 rounded-xl border border-[#D6CFC0] text-sm"
                />
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setItemModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-[#D6CFC0] text-sm font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-xl bg-[#1B4332] hover:bg-[#2D5A27] text-white text-sm font-semibold cursor-pointer"
                >
                  {saving ? 'Saving...' : 'Save Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Adjust Stock Modal */}
      {adjustItem && (
        <div className="fixed inset-0 z-50 bg-black/45 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 bg-[#1B4332] text-white flex items-center justify-between">
              <h2 className="font-bold">Adjust Stock &mdash; {adjustItem.name}</h2>
              <button onClick={() => setAdjustItem(null)} className="p-1 rounded-lg hover:bg-white/10 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAdjustStock} className="p-6 space-y-4">
              <p className="text-sm text-[#5C6B62]">
                Current Stock: <strong>{adjustItem.stock_quantity} {adjustItem.unit}</strong>
              </p>
              <div>
                <label className="block text-xs font-semibold text-[#34463C] mb-1">Action Type</label>
                <select
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value as typeof adjustReason)}
                  className="w-full px-3 py-2 rounded-xl border border-[#D6CFC0] bg-white text-sm"
                >
                  <option value="restock">Restock (+ Add received stock)</option>
                  <option value="dispense">Dispense (- Remove used stock)</option>
                  <option value="adjustment">Manual Adjustment (+/-)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#34463C] mb-1">Quantity</label>
                <input
                  type="number"
                  step="0.5"
                  required
                  value={adjustAmount}
                  onChange={(e) => setAdjustAmount(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[#D6CFC0] text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#34463C] mb-1">Notes</label>
                <input
                  value={adjustNotes}
                  onChange={(e) => setAdjustNotes(e.target.value)}
                  placeholder="Invoice # / damaged / batch info"
                  className="w-full px-3 py-2 rounded-xl border border-[#D6CFC0] text-sm"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setAdjustItem(null)}
                  className="px-4 py-2 rounded-xl border border-[#D6CFC0] text-sm cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#1B4332] text-white text-sm font-semibold cursor-pointer"
                >
                  Update Stock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Stock Logs Modal */}
      {logsModal && (
        <div className="fixed inset-0 z-50 bg-black/45 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden">
            <div className="px-6 py-4 bg-[#1B4332] text-white flex items-center justify-between">
              <h2 className="font-bold">Stock Log &mdash; {logsModal.item.name}</h2>
              <button onClick={() => setLogsModal(null)} className="p-1 rounded-lg hover:bg-white/10 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 overflow-y-auto space-y-2.5">
              {logsModal.logs.length === 0 ? (
                <p className="text-sm text-[#5C6B62]">No stock movements recorded yet.</p>
              ) : (
                logsModal.logs.map((log) => (
                  <div key={log.id} className="p-3 rounded-xl border border-[#ECE6D8] flex items-center justify-between text-xs">
                    <div>
                      <span className="font-semibold capitalize">{log.reason}</span>
                      {log.notes && <p className="text-[#5C6B62] mt-0.5">{log.notes}</p>}
                      <p className="text-[#7A8A80] mt-0.5">
                        {log.created_at} {log.user_name ? `• ${log.user_name}` : ''}
                      </p>
                    </div>
                    <span
                      className={`font-bold text-sm ${
                        log.change_amount >= 0 ? 'text-emerald-700' : 'text-red-700'
                      }`}
                    >
                      {log.change_amount > 0 ? `+${log.change_amount}` : log.change_amount}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
