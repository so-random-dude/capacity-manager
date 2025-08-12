import { json } from '@sveltejs/kit';
import { pool } from '$lib/db.js';

export async function GET({ params, url }) {
  const pharmacyId = parseInt(params.id);
  const date = url.searchParams.get('date') || new Date().toISOString().split('T')[0];
  
  const client = await pool.connect();
  
  try {
    const result = await client.query(`
      SELECT * FROM workforce_tracking 
      WHERE pharmacy_id = $1 AND shift_date = $2
      ORDER BY shift_start_time
    `, [pharmacyId, date]);

    return json(result.rows);
  } catch (error) {
    console.error('Error fetching workforce tracking:', error);
    return json({ error: 'Failed to fetch workforce tracking' }, { status: 500 });
  } finally {
    client.release();
  }
}

export async function POST({ params, request }) {
  const pharmacyId = parseInt(params.id);
  const { shift_date, shift_start_time, shift_end_time, signed_in_strength } = await request.json();

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Upsert workforce tracking
    const result = await client.query(`
      INSERT INTO workforce_tracking 
      (pharmacy_id, shift_date, shift_start_time, shift_end_time, signed_in_strength)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (pharmacy_id, shift_date, shift_start_time)
      DO UPDATE SET 
        shift_end_time = EXCLUDED.shift_end_time,
        signed_in_strength = EXCLUDED.signed_in_strength,
        updated_at = NOW()
      RETURNING *
    `, [pharmacyId, shift_date, shift_start_time, shift_end_time, signed_in_strength]);

    const workforceRecord = result.rows[0];

    // Update capacity slots for this shift based on new strength
    const pharmacyResult = await client.query('SELECT * FROM pharmacies WHERE id = $1', [pharmacyId]);
    const pharmacy = pharmacyResult.rows[0];

    if (pharmacy) {
      // Get shift configuration for this day
      const dateObj = new Date(shift_date);
      const dayOfWeek = dateObj.getDay();

      const shiftResult = await client.query(`
        SELECT * FROM pharmacy_shifts 
        WHERE pharmacy_id = $1 AND day_of_week = $2 
        AND start_time = $3
      `, [pharmacyId, dayOfWeek, shift_start_time]);

      let shiftConfig = shiftResult.rows[0];
      
      // If no specific shift config, use default pharmacy settings
      if (!shiftConfig) {
        shiftConfig = {
          start_time: shift_start_time,
          end_time: shift_end_time,
          default_labor_strength: signed_in_strength
        };
      }

      // Calculate slots for this shift
      const slots = generateTimeSlots(
        shift_start_time, 
        shift_end_time, 
        pharmacy.slot_length_minutes
      );

      const totalSlots = slots.length;
      const configuredCapacity = Math.floor(
        (signed_in_strength * pharmacy.capacity_factor) / totalSlots
      );

      // Update configured capacity for all slots in this shift
      for (const slotTime of slots) {
        await client.query(`
          UPDATE capacity_slots 
          SET configured_capacity = $1, 
              labor_strength = $2, 
              updated_at = NOW()
          WHERE pharmacy_id = $3 
            AND slot_date = $4 
            AND slot_time = $5
        `, [configuredCapacity, signed_in_strength, pharmacyId, shift_date, slotTime]);
      }
    }

    await client.query('COMMIT');
    
    return json({ 
      success: true, 
      message: 'Workforce strength updated successfully',
      workforce: workforceRecord
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error updating workforce strength:', error);
    return json({ error: 'Failed to update workforce strength' }, { status: 500 });
  } finally {
    client.release();
  }
}

function generateTimeSlots(startTime: string, endTime: string, intervalMinutes: number): string[] {
  const slots: string[] = [];
  const start = timeStringToMinutes(startTime);
  const end = timeStringToMinutes(endTime);

  for (let minutes = start; minutes < end; minutes += intervalMinutes) {
    slots.push(minutesToTimeString(minutes));
  }

  return slots;
}

function timeStringToMinutes(timeStr: string): number {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
}

function minutesToTimeString(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}