import { pool } from './db.js';
import type { Pharmacy, CapacitySlot, PharmacyShift, CapacityView, SlotCapacityView } from './types.js';

export class CapacityEngine {
  static async calculateConfiguredCapacity(
    laborStrength: number, 
    capacityFactor: number, 
    totalSlots: number
  ): Promise<number> {
    return Math.floor((laborStrength * capacityFactor) / totalSlots);
  }

  static async generateSlotsForDate(pharmacyId: number, date: string): Promise<void> {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // Get pharmacy configuration
      const pharmacyResult = await client.query(
        'SELECT * FROM pharmacies WHERE id = $1',
        [pharmacyId]
      );
      
      if (pharmacyResult.rows.length === 0) {
        throw new Error('Pharmacy not found');
      }

      const pharmacy: Pharmacy = pharmacyResult.rows[0];
      const dateObj = new Date(date);
      const dayOfWeek = dateObj.getDay();

      // Check for pharmacy-level overrides (specific date takes priority over day of week)
      const pharmacyOverride = await this.getPharmacyOverride(client, pharmacyId, date, dayOfWeek);
      
      // Apply overrides to pharmacy settings
      const effectivePharmacy = {
        ...pharmacy,
        operating_start_time: pharmacyOverride?.operating_start_time || pharmacy.operating_start_time,
        operating_end_time: pharmacyOverride?.operating_end_time || pharmacy.operating_end_time,
        default_labor_strength: pharmacyOverride?.default_labor_strength || pharmacy.default_labor_strength,
        capacity_factor: pharmacyOverride?.capacity_factor || pharmacy.capacity_factor,
        slot_length_minutes: pharmacyOverride?.slot_length_minutes || pharmacy.slot_length_minutes
      };

      // Get shifts for this specific date first, then day of week, fallback to default operating hours
      let shiftsResult = await client.query(
        'SELECT * FROM pharmacy_shifts WHERE pharmacy_id = $1 AND specific_date = $2 ORDER BY start_time',
        [pharmacyId, date]
      );

      let shifts: PharmacyShift[] = shiftsResult.rows;
      
      // If no date-specific shifts, try day of week shifts
      if (shifts.length === 0) {
        shiftsResult = await client.query(
          'SELECT * FROM pharmacy_shifts WHERE pharmacy_id = $1 AND day_of_week = $2 ORDER BY start_time',
          [pharmacyId, dayOfWeek]
        );
        shifts = shiftsResult.rows;
      }
      
      // If no shifts defined for this day/date, use effective pharmacy operating hours
      if (shifts.length === 0) {
        shifts = [{
          id: 0,
          pharmacy_id: pharmacyId,
          day_of_week: dayOfWeek,
          start_time: effectivePharmacy.operating_start_time,
          end_time: effectivePharmacy.operating_end_time,
          default_labor_strength: effectivePharmacy.default_labor_strength,
          created_at: new Date()
        }];
      }

      // Generate slots for each shift
      for (const shift of shifts) {
        const slots = this.generateTimeSlots(
          shift.start_time,
          shift.end_time,
          effectivePharmacy.slot_length_minutes
        );

        const totalSlots = slots.length;
        const configuredCapacity = await this.calculateConfiguredCapacity(
          shift.default_labor_strength,
          effectivePharmacy.capacity_factor,
          totalSlots
        );

        for (const slotTime of slots) {
          // Insert or update slot
          await client.query(`
            INSERT INTO capacity_slots 
            (pharmacy_id, slot_date, slot_time, configured_capacity, labor_strength)
            VALUES ($1, $2, $3, $4, $5)
            ON CONFLICT (pharmacy_id, slot_date, slot_time) 
            DO UPDATE SET 
              configured_capacity = EXCLUDED.configured_capacity,
              labor_strength = EXCLUDED.labor_strength,
              updated_at = NOW()
          `, [pharmacyId, date, slotTime, configuredCapacity, shift.default_labor_strength]);
        }
      }

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  static generateTimeSlots(startTime: string, endTime: string, intervalMinutes: number): string[] {
    const slots: string[] = [];
    const start = this.timeStringToMinutes(startTime);
    const end = this.timeStringToMinutes(endTime);

    for (let minutes = start; minutes < end; minutes += intervalMinutes) {
      slots.push(this.minutesToTimeString(minutes));
    }

    return slots;
  }

  static timeStringToMinutes(timeStr: string): number {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  }

  static minutesToTimeString(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  }

  static async getPharmacyOverride(client: any, pharmacyId: number, date: string, dayOfWeek: number): Promise<any> {
    // Check for specific date override first
    let overrideResult = await client.query(
      'SELECT * FROM pharmacy_overrides WHERE pharmacy_id = $1 AND specific_date = $2',
      [pharmacyId, date]
    );

    if (overrideResult.rows.length > 0) {
      return overrideResult.rows[0];
    }

    // Check for day of week override
    overrideResult = await client.query(
      'SELECT * FROM pharmacy_overrides WHERE pharmacy_id = $1 AND day_of_week = $2',
      [pharmacyId, dayOfWeek]
    );

    return overrideResult.rows.length > 0 ? overrideResult.rows[0] : null;
  }

  static async consumeCapacity(pharmacyId: number, amount: number, targetDate?: string): Promise<{ success: boolean; message: string; slotTime?: string }> {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      const date = targetDate || new Date().toISOString().split('T')[0];
      
      // Ensure slots exist for the target date
      await this.generateSlotsForDate(pharmacyId, date);

      // Find next available slot with enough capacity
      const availableSlotResult = await client.query(`
        SELECT * FROM capacity_slots 
        WHERE pharmacy_id = $1 
          AND slot_date = $2 
          AND is_available = true
          AND (configured_capacity - consumed_capacity) >= $3
          AND (slot_date > CURRENT_DATE OR (slot_date = CURRENT_DATE AND slot_time > CURRENT_TIME))
        ORDER BY slot_time ASC
        LIMIT 1
      `, [pharmacyId, date, amount]);

      if (availableSlotResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return { 
          success: false, 
          message: 'No available slots with sufficient capacity for the requested amount' 
        };
      }

      const slot: CapacitySlot = availableSlotResult.rows[0];

      // Update consumed capacity
      await client.query(`
        UPDATE capacity_slots 
        SET consumed_capacity = consumed_capacity + $1, updated_at = NOW()
        WHERE id = $2
      `, [amount, slot.id]);

      await client.query('COMMIT');
      
      return { 
        success: true, 
        message: `Successfully consumed ${amount} capacity units`,
        slotTime: slot.slot_time
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  static async fulfillCapacity(pharmacyId: number, amount: number, slotDate: string, slotTime: string): Promise<{ success: boolean; message: string }> {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // Find the specific slot
      const slotResult = await client.query(`
        SELECT * FROM capacity_slots 
        WHERE pharmacy_id = $1 AND slot_date = $2 AND slot_time = $3
      `, [pharmacyId, slotDate, slotTime]);

      if (slotResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return { success: false, message: 'Slot not found' };
      }

      const slot: CapacitySlot = slotResult.rows[0];

      if (slot.fulfilled_capacity + amount > slot.consumed_capacity) {
        await client.query('ROLLBACK');
        return { 
          success: false, 
          message: 'Cannot fulfill more than consumed capacity' 
        };
      }

      // Update fulfilled capacity
      await client.query(`
        UPDATE capacity_slots 
        SET fulfilled_capacity = fulfilled_capacity + $1, updated_at = NOW()
        WHERE id = $2
      `, [amount, slot.id]);

      await client.query('COMMIT');
      
      return { 
        success: true, 
        message: `Successfully fulfilled ${amount} capacity units` 
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  static async redistributeUnfulfilledCapacity(pharmacyId: number): Promise<void> {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      const currentDate = new Date().toISOString().split('T')[0];
      const currentTime = new Date().toTimeString().slice(0, 5);

      // Find current slot that just passed
      const currentSlotResult = await client.query(`
        SELECT * FROM capacity_slots 
        WHERE pharmacy_id = $1 
          AND slot_date = $2 
          AND slot_time <= $3
          AND (consumed_capacity - fulfilled_capacity) > 0
        ORDER BY slot_time DESC
        LIMIT 1
      `, [pharmacyId, currentDate, currentTime]);

      if (currentSlotResult.rows.length === 0) {
        await client.query('COMMIT');
        return;
      }

      const currentSlot: CapacitySlot = currentSlotResult.rows[0];
      const unfulfilledAmount = currentSlot.consumed_capacity - currentSlot.fulfilled_capacity;

      if (unfulfilledAmount <= 0) {
        await client.query('COMMIT');
        return;
      }

      // Find next available slots with capacity
      const availableSlotsResult = await client.query(`
        SELECT * FROM capacity_slots 
        WHERE pharmacy_id = $1 
          AND slot_date = $2 
          AND slot_time > $3
          AND is_available = true
          AND (configured_capacity - consumed_capacity) > 0
        ORDER BY slot_time ASC
      `, [pharmacyId, currentDate, currentTime]);

      let remainingUnfulfilled = unfulfilledAmount;
      
      for (const slot of availableSlotsResult.rows) {
        if (remainingUnfulfilled <= 0) break;

        const availableCapacity = slot.configured_capacity - slot.consumed_capacity;
        const toRedistribute = Math.min(remainingUnfulfilled, availableCapacity);

        await client.query(`
          UPDATE capacity_slots 
          SET consumed_capacity = consumed_capacity + $1, updated_at = NOW()
          WHERE id = $2
        `, [toRedistribute, slot.id]);

        remainingUnfulfilled -= toRedistribute;
      }

      // If still unfulfilled, add to last slot of the day
      if (remainingUnfulfilled > 0) {
        const lastSlotResult = await client.query(`
          SELECT * FROM capacity_slots 
          WHERE pharmacy_id = $1 AND slot_date = $2
          ORDER BY slot_time DESC
          LIMIT 1
        `, [pharmacyId, currentDate]);

        if (lastSlotResult.rows.length > 0) {
          await client.query(`
            UPDATE capacity_slots 
            SET consumed_capacity = consumed_capacity + $1, updated_at = NOW()
            WHERE id = $2
          `, [remainingUnfulfilled, lastSlotResult.rows[0].id]);
        }
      }

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  static async getCapacityView(pharmacyId: number, days: number = 14): Promise<CapacityView[]> {
    const client = await pool.connect();
    
    try {
      const result: CapacityView[] = [];
      
      for (let i = 0; i < days; i++) {
        const date = new Date();
        date.setDate(date.getDate() + i);
        const dateStr = date.toISOString().split('T')[0];

        // Ensure slots exist for this date
        await this.generateSlotsForDate(pharmacyId, dateStr);

        // Get slots for this date
        const slotsResult = await client.query(`
          SELECT * FROM capacity_slots 
          WHERE pharmacy_id = $1 AND slot_date = $2
          ORDER BY slot_time ASC
        `, [pharmacyId, dateStr]);

        const slots: SlotCapacityView[] = slotsResult.rows.map((slot: CapacitySlot) => ({
          time: slot.slot_time,
          configured: slot.configured_capacity,
          consumed: slot.consumed_capacity,
          fulfilled: slot.fulfilled_capacity,
          available: slot.configured_capacity - slot.consumed_capacity,
          is_available: slot.is_available,
          can_reassign_unfulfilled: (slot.consumed_capacity - slot.fulfilled_capacity) > 0
        }));

        result.push({
          date: dateStr,
          slots
        });
      }

      return result;
    } finally {
      client.release();
    }
  }
}