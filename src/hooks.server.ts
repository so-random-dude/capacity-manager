import { CapacityScheduler } from '$lib/scheduler.js';
import { initializeDatabase } from '$lib/db.js';

// Initialize database and start scheduler when server starts
initializeDatabase().then(() => {
  console.log('Database initialized');
  CapacityScheduler.start();
}).catch((error) => {
  console.error('Failed to initialize database:', error);
});

export async function handle({ event, resolve }) {
  return resolve(event);
}