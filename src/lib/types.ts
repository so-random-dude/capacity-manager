export interface Pharmacy {
  id: number;
  name: string;
  zone: string;
  code: string;
  slot_length_minutes: number;
  operating_start_time: string;
  operating_end_time: string;
  default_labor_strength: number;
  capacity_factor: number;
  created_at: Date;
  updated_at: Date;
}

export interface PharmacyShift {
  id: number;
  pharmacy_id: number;
  day_of_week?: number; // 0 = Sunday, 1 = Monday, etc. (null for date-specific)
  specific_date?: string; // YYYY-MM-DD format (null for day-of-week)
  start_time: string;
  end_time: string;
  default_labor_strength: number;
  created_at: Date;
}

export interface CapacitySlot {
  id: number;
  pharmacy_id: number;
  slot_date: string;
  slot_time: string;
  configured_capacity: number;
  consumed_capacity: number;
  fulfilled_capacity: number;
  is_available: boolean;
  labor_strength: number;
  created_at: Date;
  updated_at: Date;
}

export interface WorkforceTracking {
  id: number;
  pharmacy_id: number;
  shift_date: string;
  shift_start_time: string;
  shift_end_time: string;
  signed_in_strength: number;
  created_at: Date;
  updated_at: Date;
}

export interface PharmacyFormData {
  name: string;
  zone: string;
  code: string;
  slot_length_minutes: number;
  operating_start_time: string;
  operating_end_time: string;
  default_labor_strength: number;
  capacity_factor?: number;
  shifts: ShiftFormData[];
}

export interface ShiftFormData {
  day_of_week?: number;
  specific_date?: string;
  start_time: string;
  end_time: string;
  default_labor_strength: number;
}

export interface PharmacyOverride {
  id: number;
  pharmacy_id: number;
  day_of_week?: number;
  specific_date?: string;
  operating_start_time?: string;
  operating_end_time?: string;
  default_labor_strength?: number;
  capacity_factor?: number;
  slot_length_minutes?: number;
  created_at: Date;
  updated_at: Date;
}

export interface PharmacyOverrideFormData {
  day_of_week?: number;
  specific_date?: string;
  operating_start_time?: string;
  operating_end_time?: string;
  default_labor_strength?: number;
  capacity_factor?: number;
  slot_length_minutes?: number;
}

export interface CapacityView {
  date: string;
  slots: SlotCapacityView[];
}

export interface SlotCapacityView {
  time: string;
  configured: number;
  consumed: number;
  fulfilled: number;
  available: number;
  is_available: boolean;
  can_reassign_unfulfilled: boolean;
}

export interface CapacityOperation {
  pharmacy_id: number;
  slot_date: string;
  slot_time?: string;
  amount: number;
}

export const DAYS_OF_WEEK = [
  'Sunday',
  'Monday', 
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday'
];