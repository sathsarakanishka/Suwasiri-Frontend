export type UserRole = 'admin' | 'doctor' | 'receptionist';

export interface User {
  id: number;
  username: string;
  full_name: string;
  role: UserRole;
  specialty: string;
  phone: string;
  is_active: number;
  created_at?: string;
}

export interface DoctorOption {
  id: number;
  full_name: string;
  specialty: string;
  phone: string;
}

export interface Patient {
  id: number;
  patient_code: string;
  full_name: string;
  date_of_birth: string;
  age: number | null;
  gender: 'Male' | 'Female' | 'Other';
  phone: string;
  nic_passport: string;
  email: string;
  address: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;
  blood_group: string;
  prakriti: string;
  allergies: string;
  chronic_conditions: string;
  notes: string;
  created_at: string;
  updated_at: string;
}

export type AppointmentStatus = 'waiting' | 'in_consultation' | 'completed' | 'cancelled' | 'no_show';

export interface Appointment {
  id: number;
  patient_id: number;
  doctor_id: number | null;
  appointment_date: string;
  appointment_time: string;
  token_number: number;
  visit_type: 'Walk-in' | 'Scheduled' | 'Follow-up' | 'Therapy';
  chief_complaint: string;
  status: AppointmentStatus;
  notes: string;
  patient_code: string;
  patient_name: string;
  patient_phone: string;
  patient_prakriti?: string;
  patient_allergies?: string;
  doctor_name?: string | null;
  created_at: string;
}

export type InventoryCategory = 'medicine' | 'treatment' | 'supplement';

export interface InventoryItem {
  id: number;
  sku: string;
  name: string;
  category: InventoryCategory;
  unit: string;
  unit_price: number;
  stock_quantity: number;
  reorder_level: number;
  expiry_date: string;
  supplier: string;
  description: string;
  is_active: number;
  created_at: string;
  updated_at: string;
}

export interface InventoryLog {
  id: number;
  item_id: number;
  change_amount: number;
  reason: string;
  reference_id: string;
  notes: string;
  user_name: string | null;
  created_at: string;
}

export interface Invoice {
  id: number;
  invoice_number: string;
  patient_id: number;
  appointment_id: number | null;
  consultation_fee: number;
  subtotal: number;
  discount: number;
  total_amount: number;
  paid_amount: number;
  payment_method: 'cash' | 'card' | 'bank_transfer';
  payment_status: 'paid' | 'partial' | 'pending' | 'void';
  notes: string;
  patient_code: string;
  patient_name: string;
  patient_phone: string;
  patient_address?: string;
  patient_prakriti?: string;
  created_by_name?: string;
  created_at: string;
}

export interface InvoiceItem {
  id: number;
  invoice_id: number;
  inventory_item_id: number | null;
  description: string;
  category: string;
  quantity: number;
  unit_price: number;
  line_total: number;
}

export interface ClinicSettings {
  clinic_name: string;
  tagline: string;
  phone: string;
  address: string;
  currency: string;
  consultation_fee: string;
}

export interface DashboardData {
  today: string;
  stats: {
    totalPatients: number;
    todayAppointments: number;
    waitingCount: number;
    inConsultationCount: number;
    completedCount: number;
    revenueToday: number;
    revenueMonth: number;
    outstandingBalance: number;
    lowStockCount: number;
  };
  lowStockItems: InventoryItem[];
  todayQueue: Appointment[];
  recentPatients: Array<{
    id: number;
    patient_code: string;
    full_name: string;
    phone: string;
    prakriti: string;
    created_at: string;
  }>;
}
