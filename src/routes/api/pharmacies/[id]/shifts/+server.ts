import { json } from '@sveltejs/kit';
import { pool } from '$lib/db.js';
import type { ShiftFormData } from '$lib/types.js';

export async function GET({ params, url }) {
  const pharmacyId = parseInt(params.id);
  const showAll = url.searchParams.get('all') === 'true';
  
  const client = await pool.connect();
  
  try {
    let query = 'SELECT * FROM pharmacy_shifts WHERE pharmacy_id = $1';
    const queryParams = [pharmacyId];
    
    if (!showAll) {
      // Only show future and current shifts for date-specific ones
      query += ' AND (day_of_week IS NOT NULL OR specific_date >= CURRENT_DATE)';
    }
    
    query += ' ORDER BY specific_date NULLS LAST, day_of_week NULLS LAST, start_time';
    
    const result = await client.query(query, queryParams);
    return json(result.rows);
  } catch (error) {
    console.error('Error fetching pharmacy shifts:', error);
    return json({ error: 'Failed to fetch pharmacy shifts' }, { status: 500 });
  } finally {
    client.release();
  }
}

export async function POST({ params, request }) {
  const pharmacyId = parseInt(params.id);
  const data: ShiftFormData = await request.json();

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Validation: either day_of_week OR specific_date must be provided, not both
    if ((!data.day_of_week && !data.specific_date) || (data.day_of_week && data.specific_date)) {
      await client.query('ROLLBACK');
      return json({ error: 'Must provide either day_of_week OR specific_date, not both' }, { status: 400 });
    }

    // Insert shift
    const result = await client.query(`
      INSERT INTO pharmacy_shifts 
      (pharmacy_id, day_of_week, specific_date, start_time, end_time, default_labor_strength)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [
      pharmacyId,
      data.day_of_week || null,
      data.specific_date || null,
      data.start_time,
      data.end_time,
      data.default_labor_strength
    ]);

    await client.query('COMMIT');
    
    return json({ 
      success: true, 
      message: 'Shift saved successfully',
      shift: result.rows[0]
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error saving shift:', error);
    return json({ error: 'Failed to save shift' }, { status: 500 });
  } finally {
    client.release();
  }
}

export async function DELETE({ params, url }) {
  const pharmacyId = parseInt(params.id);
  const shiftId = url.searchParams.get('shiftId');

  if (!shiftId) {
    return json({ error: 'Shift ID is required' }, { status: 400 });
  }

  const client = await pool.connect();

  try {
    const result = await client.query(
      'DELETE FROM pharmacy_shifts WHERE id = $1 AND pharmacy_id = $2 RETURNING *',
      [parseInt(shiftId), pharmacyId]
    );

    if (result.rows.length === 0) {
      return json({ error: 'Shift not found' }, { status: 404 });
    }

    return json({ 
      success: true, 
      message: 'Shift deleted successfully' 
    });
  } catch (error) {
    console.error('Error deleting shift:', error);
    return json({ error: 'Failed to delete shift' }, { status: 500 });
  } finally {
    client.release();
  }
}