import { json } from '@sveltejs/kit';
import { pool } from '$lib/db.js';

export async function PATCH({ params, request }) {
  const pharmacyId = parseInt(params.id);
  const { date, time } = params;
  const { is_available } = await request.json();

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Check if slot exists
    const slotResult = await client.query(`
      SELECT * FROM capacity_slots 
      WHERE pharmacy_id = $1 AND slot_date = $2 AND slot_time = $3
    `, [pharmacyId, date, time]);

    if (slotResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return json({ error: 'Slot not found' }, { status: 404 });
    }

    const slot = slotResult.rows[0];

    // If making slot unavailable, check for unfulfilled capacity
    if (!is_available && (slot.consumed_capacity - slot.fulfilled_capacity) > 0) {
      const unfulfilledAmount = slot.consumed_capacity - slot.fulfilled_capacity;

      // Try to find available slots later in the same day
      const availableSlotsResult = await client.query(`
        SELECT * FROM capacity_slots 
        WHERE pharmacy_id = $1 
          AND slot_date = $2 
          AND slot_time > $3
          AND is_available = true
        ORDER BY slot_time ASC
      `, [pharmacyId, date, time]);

      let totalAvailableCapacity = 0;
      for (const availableSlot of availableSlotsResult.rows) {
        totalAvailableCapacity += (availableSlot.configured_capacity - availableSlot.consumed_capacity);
      }

      if (totalAvailableCapacity < unfulfilledAmount) {
        await client.query('ROLLBACK');
        return json({ 
          error: 'Cannot make slot unavailable: insufficient available capacity to reassign unfulfilled orders',
          unfulfilledAmount,
          availableCapacity: totalAvailableCapacity
        }, { status: 400 });
      }

      // Redistribute the unfulfilled capacity
      let remainingUnfulfilled = unfulfilledAmount;
      for (const availableSlot of availableSlotsResult.rows) {
        if (remainingUnfulfilled <= 0) break;

        const availableCapacity = availableSlot.configured_capacity - availableSlot.consumed_capacity;
        const toRedistribute = Math.min(remainingUnfulfilled, availableCapacity);

        await client.query(`
          UPDATE capacity_slots 
          SET consumed_capacity = consumed_capacity + $1, updated_at = NOW()
          WHERE id = $2
        `, [toRedistribute, availableSlot.id]);

        remainingUnfulfilled -= toRedistribute;
      }

      // Clear consumed capacity from the slot being made unavailable
      await client.query(`
        UPDATE capacity_slots 
        SET consumed_capacity = 0, fulfilled_capacity = 0, updated_at = NOW()
        WHERE id = $1
      `, [slot.id]);
    }

    // Update slot availability
    await client.query(`
      UPDATE capacity_slots 
      SET is_available = $1, updated_at = NOW()
      WHERE id = $2
    `, [is_available, slot.id]);

    await client.query('COMMIT');

    return json({ 
      success: true, 
      message: `Slot ${is_available ? 'enabled' : 'disabled'} successfully` 
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error updating slot availability:', error);
    return json({ error: 'Failed to update slot availability' }, { status: 500 });
  } finally {
    client.release();
  }
}