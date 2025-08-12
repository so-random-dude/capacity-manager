import { pool } from './db.js';
import { CapacityEngine } from './capacity.js';

export class CapacityScheduler {
  private static intervalId: NodeJS.Timeout | null = null;
  private static isRunning = false;

  static start() {
    if (this.isRunning) return;
    
    this.isRunning = true;
    console.log('Starting capacity scheduler...');

    // Run every minute to check for time slot transitions
    this.intervalId = setInterval(async () => {
      await this.checkAndRedistributeCapacity();
    }, 60000); // 1 minute

    // Also run immediately on startup
    this.checkAndRedistributeCapacity();
  }

  static stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
    console.log('Capacity scheduler stopped');
  }

  private static async checkAndRedistributeCapacity() {
    const client = await pool.connect();
    
    try {
      // Get all active pharmacies
      const pharmaciesResult = await client.query('SELECT id FROM pharmacies');
      const pharmacies = pharmaciesResult.rows;

      for (const pharmacy of pharmacies) {
        try {
          await CapacityEngine.redistributeUnfulfilledCapacity(pharmacy.id);
        } catch (error) {
          console.error(`Error redistributing capacity for pharmacy ${pharmacy.id}:`, error);
        }
      }
    } catch (error) {
      console.error('Error in capacity scheduler:', error);
    } finally {
      client.release();
    }
  }

  static async triggerRedistribution(pharmacyId?: number) {
    if (pharmacyId) {
      await CapacityEngine.redistributeUnfulfilledCapacity(pharmacyId);
    } else {
      await this.checkAndRedistributeCapacity();
    }
  }
}