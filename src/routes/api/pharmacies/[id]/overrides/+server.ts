import { json } from '@sveltejs/kit';
import { pool } from '$lib/db.js';
import type { PharmacyOverrideFormData } from '$lib/types.js';

export async function GET({ params, url }) {
  const pharmacyId = parseInt(params.id);
  const showAll = url.searchParams.get('all') === 'true';
  
  const client = await pool.connect();
  
  try {
    let query = 'SELECT * FROM pharmacy_overrides WHERE pharmacy_id = $1';
    const queryParams = [pharmacyId];
    
    if (!showAll) {
      // Only show future and current overrides
      query += ' AND (specific_date IS NULL OR specific_date >= CURRENT_DATE)';
    }
    
    query += ' ORDER BY specific_date NULLS LAST, day_of_week NULLS LAST';
    
    const result = await client.query(query, queryParams);
    return json(result.rows);
  } catch (error) {
    console.error('Error fetching pharmacy overrides:', error);
    return json({ error: 'Failed to fetch pharmacy overrides' }, { status: 500 });
  } finally {
    client.release();
  }
}

export async function POST({ params, request }) {
  const pharmacyId = parseInt(params.id);
  const data: PharmacyOverrideFormData = await request.json();

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Validation: either day_of_week OR specific_date must be provided, not both
    if ((!data.day_of_week && !data.specific_date) || (data.day_of_week && data.specific_date)) {
      await client.query('ROLLBACK');
      return json({ error: 'Must provide either day_of_week OR specific_date, not both' }, { status: 400 });
    }

    // Insert or update override
    const result = await client.query(`
      INSERT INTO pharmacy_overrides 
      (pharmacy_id, day_of_week, specific_date, operating_start_time, operating_end_time, 
       default_labor_strength, capacity_factor, slot_length_minutes)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (pharmacy_id, day_of_week, specific_date)
      DO UPDATE SET 
        operating_start_time = COALESCE(EXCLUDED.operating_start_time, pharmacy_overrides.operating_start_time),
        operating_end_time = COALESCE(EXCLUDED.operating_end_time, pharmacy_overrides.operating_end_time),
        default_labor_strength = COALESCE(EXCLUDED.default_labor_strength, pharmacy_overrides.default_labor_strength),
        capacity_factor = COALESCE(EXCLUDED.capacity_factor, pharmacy_overrides.capacity_factor),
        slot_length_minutes = COALESCE(EXCLUDED.slot_length_minutes, pharmacy_overrides.slot_length_minutes),
        updated_at = NOW()
      RETURNING *
    `, [
      pharmacyId,
      data.day_of_week || null,
      data.specific_date || null,
      data.operating_start_time || null,
      data.operating_end_time || null,
      data.default_labor_strength || null,
      data.capacity_factor || null,
      data.slot_length_minutes || null
    ]);

    await client.query('COMMIT');
    
    return json({ 
      success: true, 
      message: 'Pharmacy override saved successfully',
      override: result.rows[0]
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error saving pharmacy override:', error);
    return json({ error: 'Failed to save pharmacy override' }, { status: 500 });
  } finally {
    client.release();
  }
}

export async function DELETE({ params, url }) {
  const pharmacyId = parseInt(params.id);
  const overrideId = url.searchParams.get('overrideId');

  if (!overrideId) {
    return json({ error: 'Override ID is required' }, { status: 400 });
  }

  const client = await pool.connect();

  try {
    const result = await client.query(
      'DELETE FROM pharmacy_overrides WHERE id = $1 AND pharmacy_id = $2 RETURNING *',
      [parseInt(overrideId), pharmacyId]
    );

    if (result.rows.length === 0) {
      return json({ error: 'Override not found' }, { status: 404 });
    }

    return json({ 
      success: true, 
      message: 'Pharmacy override deleted successfully' 
    });
  } catch (error) {
    console.error('Error deleting pharmacy override:', error);
    return json({ error: 'Failed to delete pharmacy override' }, { status: 500 });
  } finally {
    client.release();
  }
}