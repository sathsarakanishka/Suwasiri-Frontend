import React, { useEffect, useState } from 'react';
import {
  Plus,
  Printer,
  Search,
  Trash2,
  CreditCard,
  X,
  Receipt,
} from 'lucide-react';
import { apiFetch, formatMoney } from '../api';
import type { ClinicSettings, InventoryItem, Invoice, InvoiceItem, Patient } from '../types';
import { SuwasiriLogo } from './Logo';

interface BillingPageProps {
  settings: ClinicSettings;
  prefill: { patientId: number; appointmentId?: number } | null;
  onClearPrefill: () => void;
}

interface DraftLine {
  inventory_item_id: number | null;
  description: string;
  category: string;
  quantity: number;
  unit_price: number;
}

export const BillingPage: React.FC<BillingPageProps> = ({ settings, prefill, onClearPrefill }) => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);

  // Create Invoice Modal
  const [builderOpen, setBuilderOpen] = useState(false);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [catalog, setCatalog] = useState<InventoryItem[]>([]);
  const [patientId, setPatientId] = useState<number | ''>('');
  const [appointmentId, setAppointmentId] = useState<number | null>(null);
  const [consultationFee, setConsultationFee] = useState(settings.consultation_fee || '1500');
  const [discount, setDiscount] = useState('0');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'bank_transfer'>('cash');
  const [lines, setLines] = useState<DraftLine[]>([]);
  const [paidAmount, setPaidAmount] = useState<string>('');
  const [autoPayFull, setAutoPayFull] = useState(true);
  const [notes, setNotes] = useState('');
  const [selectedCatalogId, setSelectedCatalogId] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [builderError, setBuilderError] = useState('');

  // Receipt / Detail Modal
  const [receiptData, setReceiptData] = useState<{
    invoice: Invoice;
    items: InvoiceItem[];
    clinic: Partial<ClinicSettings>;
  } | null>(null);
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState<'cash' | 'card' | 'bank_transfer'>('cash');

  const currency = settings.currency || 'Rs.';

  async function loadInvoices(status = statusFilter, q = query) {
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      if (status) qs.set('status', status);
      if (q.trim()) qs.set('q', q.trim());
      const res = await apiFetch<{ invoices: Invoice[] }>(`/api/billing?${qs.toString()}`);
      setInvoices(res.invoices);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadInvoices(statusFilter, query);
  }, [statusFilter]);

  useEffect(() => {
    if (prefill) {
      openBuilder(prefill.patientId, prefill.appointmentId ?? null);
      onClearPrefill();
    }
  }, [prefill]);

  async function openBuilder(pid: number | '' = '', apptId: number | null = null) {
    const [pRes, cRes] = await Promise.all([
      apiFetch<{ patients: Patient[] }>('/api/patients'),
      apiFetch<{ items: InventoryItem[] }>('/api/inventory'),
    ]);
    setPatients(pRes.patients);
    setCatalog(cRes.items);
    setPatientId(pid);
    setAppointmentId(apptId);
    setConsultationFee(settings.consultation_fee || '1500');
    setDiscount('0');
    setPaymentMethod('cash');
    setLines([]);
    setAutoPayFull(true);
    setPaidAmount('');
    setNotes('');
    setSelectedCatalogId('');
    setBuilderError('');
    setBuilderOpen(true);
  }

  function addCatalogItem() {
    if (!selectedCatalogId) return;
    const item = catalog.find((c) => c.id === Number(selectedCatalogId));
    if (!item) return;

    const existingIdx = lines.findIndex((l) => l.inventory_item_id === item.id);
    if (existingIdx >= 0) {
      const next = [...lines];
      next[existingIdx] = { ...next[existingIdx], quantity: next[existingIdx].quantity + 1 };
      setLines(next);
    } else {
      setLines([
        ...lines,
        {
          inventory_item_id: item.id,
          description: item.name,
          category: item.category,
          quantity: 1,
          unit_price: item.unit_price,
        },
      ]);
    }
    setSelectedCatalogId('');
  }

  function addCustomLine() {
    setLines([
      ...lines,
      {
        inventory_item_id: null,
        description: '',
        category: 'treatment',
        quantity: 1,
        unit_price: 0,
      },
    ]);
  }

  const consultNum = Math.max(0, Number(consultationFee) || 0);
  const itemsSubtotal = lines.reduce((sum, l) => sum + l.quantity * l.unit_price, 0);
  const subtotal = consultNum + itemsSubtotal;
  const discountNum = Math.max(0, Number(discount) || 0);
  const grandTotal = Math.max(0, subtotal - discountNum);

  async function handleCreateInvoice(e: React.FormEvent) {
    e.preventDefault();
    if (!patientId) {
      setBuilderError('Please select a patient');
      return;
    }
    setSaving(true);
    setBuilderError('');
    try {
      const paid = autoPayFull ? grandTotal : Math.max(0, Number(paidAmount) || 0);
      const res = await apiFetch<{ invoice: Invoice }>('/api/billing', {
        method: 'POST',
        body: JSON.stringify({
          patient_id: Number(patientId),
          appointment_id: appointmentId,
          consultation_fee: consultNum,
          discount: discountNum,
          paid_amount: paid,
          payment_method: paymentMethod,
          notes,
          items: lines,
        }),
      });
      setBuilderOpen(false);
      await loadInvoices(statusFilter, query);
      await openReceipt(res.invoice.id);
    } catch (err) {
      setBuilderError(err instanceof Error ? err.message : 'Failed to create invoice');
    } finally {
      setSaving(false);
    }
  }

  async function openReceipt(id: number) {
    const res = await apiFetch<{ invoice: Invoice; items: InvoiceItem[]; clinic: Partial<ClinicSettings> }>(
      `/api/billing/${id}`
    );
    setReceiptData(res);
    const remaining = Math.max(0, res.invoice.total_amount - res.invoice.paid_amount);
    setPayAmount(String(remaining));
  }

  async function recordBalancePayment(e: React.FormEvent) {
    e.preventDefault();
    if (!receiptData) return;
    try {
      await apiFetch(`/api/billing/${receiptData.invoice.id}/payment`, {
        method: 'PATCH',
        body: JSON.stringify({
          amount: Number(payAmount),
          payment_method: payMethod,
        }),
      });
      await openReceipt(receiptData.invoice.id);
      await loadInvoices(statusFilter, query);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Payment update failed');
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 no-print">
        <div>
          <h1 className="text-2xl font-bold text-[#1B4332]">Billing, Payments & Receipts</h1>
          <p className="text-sm text-[#5C6B62]">
            Generate itemized invoices, auto-deduct herbal medicine stock, and print clinic receipts
          </p>
        </div>
        <button
          onClick={() => openBuilder('', null)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#1B4332] hover:bg-[#2D5A27] text-white text-sm font-semibold cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          New Invoice / Bill
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 no-print">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            loadInvoices(statusFilter, query);
          }}
          className="flex gap-2 flex-1"
        >
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[#6B7C72] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                if (e.target.value === '') loadInvoices(statusFilter, '');
              }}
              placeholder="Search by invoice #, patient name, or Patient ID..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#D6CFC0] bg-white text-sm"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2.5 rounded-xl bg-[#2D5A27] text-white text-sm font-semibold cursor-pointer"
          >
            Search
          </button>
        </form>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3.5 py-2.5 rounded-xl border border-[#D6CFC0] bg-white text-sm"
        >
          <option value="">All Payment Statuses</option>
          <option value="paid">Paid</option>
          <option value="partial">Partial</option>
          <option value="pending">Pending</option>
          <option value="void">Voided</option>
        </select>
      </div>

      {/* Invoice List */}
      <div className="bg-white rounded-2xl border border-[#E5DFD0] shadow-xs overflow-hidden no-print">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#F7F4EC] border-b border-[#E5DFD0] text-xs font-semibold uppercase tracking-wider text-[#5C6B62]">
                <th className="py-3.5 px-4">Invoice #</th>
                <th className="py-3.5 px-4">Date</th>
                <th className="py-3.5 px-4">Patient</th>
                <th className="py-3.5 px-4">Total</th>
                <th className="py-3.5 px-4">Paid</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Receipt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F0EBE0] text-sm">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-[#5C6B62]">
                    Loading invoices...
                  </td>
                </tr>
              ) : invoices.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-[#5C6B62]">
                    No invoices found. Click <strong>New Invoice / Bill</strong> to create one.
                  </td>
                </tr>
              ) : (
                invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-[#FAF8F3]">
                    <td className="py-3.5 px-4 font-mono text-xs font-semibold text-[#1B4332]">
                      {inv.invoice_number}
                    </td>
                    <td className="py-3.5 px-4 text-xs text-[#5C6B62]">{inv.created_at}</td>
                    <td className="py-3.5 px-4">
                      <p className="font-semibold text-[#1B2B22]">{inv.patient_name}</p>
                      <p className="text-xs text-[#5C6B62]">{inv.patient_code}</p>
                    </td>
                    <td className="py-3.5 px-4 font-semibold">{formatMoney(inv.total_amount, currency)}</td>
                    <td className="py-3.5 px-4 text-[#34463C]">{formatMoney(inv.paid_amount, currency)}</td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase ${
                          inv.payment_status === 'paid'
                            ? 'bg-emerald-100 text-emerald-800'
                            : inv.payment_status === 'partial'
                              ? 'bg-amber-100 text-amber-800'
                              : inv.payment_status === 'void'
                                ? 'bg-gray-200 text-gray-600'
                                : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {inv.payment_status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => openReceipt(inv.id)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#EDF5EF] hover:bg-[#D8F3DC] text-[#1B4332] text-xs font-semibold cursor-pointer"
                      >
                        <Receipt className="w-3.5 h-3.5" /> View / Print
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Invoice Modal */}
      {builderOpen && (
        <div className="fixed inset-0 z-50 bg-black/45 flex items-center justify-center p-4 overflow-y-auto no-print">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden">
            <div className="px-6 py-4 bg-[#1B4332] text-white flex items-center justify-between">
              <h2 className="text-lg font-bold">Create Patient Invoice</h2>
              <button onClick={() => setBuilderOpen(false)} className="p-1 rounded-lg hover:bg-white/10 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateInvoice} className="p-6 overflow-y-auto space-y-5">
              {builderError && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
                  {builderError}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#34463C] mb-1">Patient *</label>
                  <select
                    required
                    value={patientId}
                    onChange={(e) => setPatientId(e.target.value ? Number(e.target.value) : '')}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#D6CFC0] bg-white text-sm"
                  >
                    <option value="">-- Select Patient --</option>
                    {patients.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.full_name} ({p.patient_code})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#34463C] mb-1">
                    Consultation Fee ({currency})
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={consultationFee}
                    onChange={(e) => setConsultationFee(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#D6CFC0] text-sm"
                  />
                </div>
              </div>

              {/* Add Treatments / Herbal Medicines */}
              <div className="p-4 rounded-xl bg-[#FAF8F3] border border-[#E5DFD0] space-y-3">
                <div className="flex flex-col sm:flex-row gap-2">
                  <select
                    value={selectedCatalogId}
                    onChange={(e) => setSelectedCatalogId(e.target.value)}
                    className="flex-1 px-3 py-2 rounded-xl border border-[#D6CFC0] bg-white text-sm"
                  >
                    <option value="">-- Add Treatment or Herbal Medicine from Catalog --</option>
                    {catalog.map((item) => (
                      <option key={item.id} value={item.id}>
                        [{item.category.toUpperCase()}] {item.name} &mdash; {formatMoney(item.unit_price, currency)}
                        {item.category !== 'treatment' ? ` (Stock: ${item.stock_quantity})` : ''}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={addCatalogItem}
                    className="px-4 py-2 rounded-xl bg-[#2D5A27] text-white text-xs font-semibold cursor-pointer"
                  >
                    + Add Item
                  </button>
                  <button
                    type="button"
                    onClick={addCustomLine}
                    className="px-3 py-2 rounded-xl border border-[#D6CFC0] bg-white text-xs font-semibold cursor-pointer"
                  >
                    + Custom Line
                  </button>
                </div>

                {lines.length > 0 && (
                  <div className="space-y-2 pt-2">
                    {lines.map((line, idx) => (
                      <div key={idx} className="grid grid-cols-12 gap-2 items-center bg-white p-2.5 rounded-xl border border-[#E5DFD0]">
                        <div className="col-span-5">
                          <input
                            required
                            value={line.description}
                            onChange={(e) => {
                              const next = [...lines];
                              next[idx] = { ...next[idx], description: e.target.value };
                              setLines(next);
                            }}
                            placeholder="Item or service description"
                            className="w-full px-2.5 py-1.5 rounded-lg border border-[#D6CFC0] text-xs"
                          />
                        </div>
                        <div className="col-span-2">
                          <input
                            type="number"
                            min="1"
                            step="1"
                            value={line.quantity}
                            onChange={(e) => {
                              const next = [...lines];
                              next[idx] = { ...next[idx], quantity: Math.max(1, Number(e.target.value) || 1) };
                              setLines(next);
                            }}
                            className="w-full px-2.5 py-1.5 rounded-lg border border-[#D6CFC0] text-xs"
                          />
                        </div>
                        <div className="col-span-2">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={line.unit_price}
                            onChange={(e) => {
                              const next = [...lines];
                              next[idx] = { ...next[idx], unit_price: Math.max(0, Number(e.target.value) || 0) };
                              setLines(next);
                            }}
                            className="w-full px-2.5 py-1.5 rounded-lg border border-[#D6CFC0] text-xs"
                          />
                        </div>
                        <div className="col-span-2 text-right text-xs font-bold text-[#1B2B22]">
                          {formatMoney(line.quantity * line.unit_price, currency)}
                        </div>
                        <div className="col-span-1 text-right">
                          <button
                            type="button"
                            onClick={() => setLines(lines.filter((_, i) => i !== idx))}
                            className="p-1 text-red-600 hover:bg-red-50 rounded cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Totals & Payment */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#34463C] mb-1">Payment Method</label>
                    <select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value as typeof paymentMethod)}
                      className="w-full px-3 py-2 rounded-xl border border-[#D6CFC0] bg-white text-sm"
                    >
                      <option value="cash">Cash</option>
                      <option value="card">Card</option>
                      <option value="bank_transfer">Bank Transfer / QR</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#34463C] mb-1">Discount ({currency})</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={discount}
                      onChange={(e) => setDiscount(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-[#D6CFC0] text-sm"
                    />
                  </div>
                  <div>
                    <label className="flex items-center gap-2 text-xs font-semibold text-[#34463C] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={autoPayFull}
                        onChange={(e) => setAutoPayFull(e.target.checked)}
                      />
                      Paid in Full ({formatMoney(grandTotal, currency)})
                    </label>
                    {!autoPayFull && (
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={paidAmount}
                        onChange={(e) => setPaidAmount(e.target.value)}
                        placeholder="Amount paid today"
                        className="mt-2 w-full px-3 py-2 rounded-xl border border-[#D6CFC0] text-sm"
                      />
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#34463C] mb-1">Notes</label>
                    <input
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Optional prescription or payment note"
                      className="w-full px-3 py-2 rounded-xl border border-[#D6CFC0] text-sm"
                    />
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-[#EDF5EF] border border-[#C9E2CF] space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-[#34463C]">Consultation Fee</span>
                    <span>{formatMoney(consultNum, currency)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#34463C]">Medicines & Therapies</span>
                    <span>{formatMoney(itemsSubtotal, currency)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#34463C]">Discount</span>
                    <span>- {formatMoney(discountNum, currency)}</span>
                  </div>
                  <div className="pt-2 border-t border-[#B8D8C0] flex justify-between text-lg font-bold text-[#1B4332]">
                    <span>Total Payable</span>
                    <span>{formatMoney(grandTotal, currency)}</span>
                  </div>
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setBuilderOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-[#D6CFC0] text-sm font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2.5 rounded-xl bg-[#1B4332] hover:bg-[#2D5A27] text-white text-sm font-semibold cursor-pointer disabled:opacity-60"
                >
                  {saving ? 'Generating Bill...' : 'Finalize & Print Receipt'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Printable Receipt Modal */}
      {receiptData && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 overflow-y-auto print:static print:bg-white print:p-0">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden print-only-area">
            {/* Non-print Action Bar */}
            <div className="px-6 py-3 bg-[#1B4332] text-white flex items-center justify-between no-print">
              <span className="font-bold text-sm">Invoice Receipt &mdash; {receiptData.invoice.invoice_number}</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-white text-[#1B4332] text-xs font-bold cursor-pointer"
                >
                  <Printer className="w-4 h-4" /> Print Receipt
                </button>
                <button
                  onClick={() => setReceiptData(null)}
                  className="p-1 rounded-lg hover:bg-white/10 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Receipt Body */}
            <div className="p-8 space-y-6">
              <div className="flex items-start justify-between border-b border-[#E5DFD0] pb-5">
                <div className="flex items-center gap-3">
                  <SuwasiriLogo className="w-12 h-12" />
                  <div>
                    <h2 className="text-xl font-bold text-[#1B4332]">
                      {receiptData.clinic.clinic_name || settings.clinic_name}
                    </h2>
                    <p className="text-xs italic text-[#2D5A27]">
                      {receiptData.clinic.tagline || settings.tagline}
                    </p>
                    <p className="text-xs text-[#5C6B62] mt-1">
                      {receiptData.clinic.address || settings.address} &bull; Tel:{' '}
                      {receiptData.clinic.phone || settings.phone}
                    </p>
                  </div>
                </div>
                <div className="text-right text-xs">
                  <p className="font-bold text-sm text-[#1B4332]">RECEIPT</p>
                  <p className="font-mono font-semibold mt-1">{receiptData.invoice.invoice_number}</p>
                  <p className="text-[#5C6B62] mt-0.5">{receiptData.invoice.created_at}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs bg-[#FAF8F3] p-4 rounded-xl border border-[#ECE6D8]">
                <div>
                  <p className="text-[#5C6B62]">Patient Name</p>
                  <p className="font-bold text-sm text-[#1B2B22]">{receiptData.invoice.patient_name}</p>
                  <p className="text-[#5C6B62] mt-0.5">
                    ID: {receiptData.invoice.patient_code} &bull; {receiptData.invoice.patient_phone}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[#5C6B62]">Payment Method</p>
                  <p className="font-semibold uppercase text-[#1B2B22]">{receiptData.invoice.payment_method}</p>
                  <p className="text-[#5C6B62] mt-0.5 uppercase font-bold">
                    Status: {receiptData.invoice.payment_status}
                  </p>
                </div>
              </div>

              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-[#D6CFC0] text-xs uppercase text-[#5C6B62]">
                    <th className="py-2">Description</th>
                    <th className="py-2 text-right">Qty</th>
                    <th className="py-2 text-right">Unit Price</th>
                    <th className="py-2 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F0EBE0]">
                  {receiptData.invoice.consultation_fee > 0 && (
                    <tr>
                      <td className="py-2.5 font-medium">Ayurvedic Physician Consultation</td>
                      <td className="py-2.5 text-right">1</td>
                      <td className="py-2.5 text-right">
                        {formatMoney(receiptData.invoice.consultation_fee, currency)}
                      </td>
                      <td className="py-2.5 text-right font-semibold">
                        {formatMoney(receiptData.invoice.consultation_fee, currency)}
                      </td>
                    </tr>
                  )}
                  {receiptData.items.map((item) => (
                    <tr key={item.id}>
                      <td className="py-2.5">
                        <span className="font-medium">{item.description}</span>
                        <span className="ml-2 text-[11px] text-[#5C6B62] capitalize">({item.category})</span>
                      </td>
                      <td className="py-2.5 text-right">{item.quantity}</td>
                      <td className="py-2.5 text-right">{formatMoney(item.unit_price, currency)}</td>
                      <td className="py-2.5 text-right font-semibold">{formatMoney(item.line_total, currency)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="border-t border-[#D6CFC0] pt-4 space-y-1.5 text-sm max-w-xs ml-auto">
                <div className="flex justify-between text-[#5C6B62]">
                  <span>Subtotal</span>
                  <span>{formatMoney(receiptData.invoice.subtotal, currency)}</span>
                </div>
                {receiptData.invoice.discount > 0 && (
                  <div className="flex justify-between text-[#5C6B62]">
                    <span>Discount</span>
                    <span>- {formatMoney(receiptData.invoice.discount, currency)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-base text-[#1B4332] pt-1 border-t border-[#ECE6D8]">
                  <span>Total</span>
                  <span>{formatMoney(receiptData.invoice.total_amount, currency)}</span>
                </div>
                <div className="flex justify-between text-emerald-700 font-medium">
                  <span>Paid</span>
                  <span>{formatMoney(receiptData.invoice.paid_amount, currency)}</span>
                </div>
                {receiptData.invoice.total_amount - receiptData.invoice.paid_amount > 0 && (
                  <div className="flex justify-between text-red-700 font-bold">
                    <span>Balance Due</span>
                    <span>
                      {formatMoney(receiptData.invoice.total_amount - receiptData.invoice.paid_amount, currency)}
                    </span>
                  </div>
                )}
              </div>

              {/* Balance Settlement Form (Non-Print) */}
              {receiptData.invoice.total_amount - receiptData.invoice.paid_amount > 0 &&
                receiptData.invoice.payment_status !== 'void' && (
                  <form
                    onSubmit={recordBalancePayment}
                    className="no-print p-4 rounded-xl bg-amber-50 border border-amber-200 flex flex-wrap items-end gap-3"
                  >
                    <div>
                      <label className="block text-xs font-semibold text-amber-900 mb-1">
                        Settle Remaining Balance ({currency})
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="1"
                        required
                        value={payAmount}
                        onChange={(e) => setPayAmount(e.target.value)}
                        className="px-3 py-1.5 rounded-lg border border-amber-300 bg-white text-sm w-36"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-amber-900 mb-1">Method</label>
                      <select
                        value={payMethod}
                        onChange={(e) => setPayMethod(e.target.value as typeof payMethod)}
                        className="px-3 py-1.5 rounded-lg border border-amber-300 bg-white text-sm"
                      >
                        <option value="cash">Cash</option>
                        <option value="card">Card</option>
                        <option value="bank_transfer">Bank Transfer</option>
                      </select>
                    </div>
                    <button
                      type="submit"
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#1B4332] text-white text-xs font-semibold cursor-pointer"
                    >
                      <CreditCard className="w-3.5 h-3.5" /> Record Payment
                    </button>
                  </form>
                )}

              <div className="pt-4 border-t border-[#ECE6D8] text-center text-xs text-[#5C6B62]">
                Thank you for visiting {receiptData.clinic.clinic_name || settings.clinic_name}. Wishing you good health!
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
