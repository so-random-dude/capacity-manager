import { json } from '@sveltejs/kit';
import { pool, initializeDatabase } from '$lib/db.js';
import type { PharmacyFormData, Pharmacy } from '$lib/types.js';

export async function GET() {
  const client = await pool.connect();
  
  try {
    const result = await client.query('SELECT * FROM pharmacies ORDER BY name');
    return json(result.rows);
  } catch (error) {
    console.error('Error fetching pharmacies:', error);
    return json({ error: 'Failed to fetch pharmacies' }, { status: 500 });
  } finally {
    client.release();
  }
}

export async function POST({ request }) {
  await initializeDatabase();
  
  const client = await pool.connect();
  
  try {
    const data: PharmacyFormData = await request.json();
    
    await client.query('BEGIN');

    // Insert pharmacy
    const pharmacyResult = await client.query(`
      INSERT INTO pharmacies 
      (name, zone, code, slot_length_minutes, operating_start_time, operating_end_time, 
       default_labor_strength, capacity_factor)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `, [
      data.name,
      data.zone,
      data.code,
      data.slot_length_minutes,
      data.operating_start_time,
      data.operating_end_time,
      data.default_labor_strength,
      data.capacity_factor || 10.0
    ]);

    const pharmacy: Pharmacy = pharmacyResult.rows[0];

    // Insert shifts if provided
    if (data.shifts && data.shifts.length > 0) {
      for (const shift of data.shifts) {
        await client.query(`
          INSERT INTO pharmacy_shifts 
          (pharmacy_id, day_of_week, start_time, end_time, default_labor_strength)
          VALUES ($1, $2, $3, $4, $5)
        `, [
          pharmacy.id,
          shift.day_of_week,
          shift.start_time,
          shift.end_time,
          shift.default_labor_strength
        ]);
      }
    }

    await client.query('COMMIT');
    
    return json({ success: true, pharmacy });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating pharmacy:', error);
    return json({ error: 'Failed to create pharmacy' }, { status: 500 });
  } finally {
    client.release();
  }
}