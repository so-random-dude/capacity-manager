import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'capacity_tracker',
  password: process.env.DB_PASSWORD || 'postgres',
  port: parseInt(process.env.DB_PORT || '5432'),
});

export { pool };

export async function initializeDatabase() {
  const client = await pool.connect();
  try {
    // Create pharmacies table
    await client.query(`
      CREATE TABLE IF NOT EXISTS pharmacies (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        zone VARCHAR(100) NOT NULL,
        code VARCHAR(3) UNIQUE NOT NULL,
        slot_length_minutes INTEGER DEFAULT 60,
        operating_start_time TIME NOT NULL,
        operating_end_time TIME NOT NULL,
        default_labor_strength INTEGER DEFAULT 1,
        capacity_factor DECIMAL(5,2) DEFAULT 10.0,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Create pharmacy shifts table (for different shifts per day of week)
    await client.query(`
      CREATE TABLE IF NOT EXISTS pharmacy_shifts (
        id SERIAL PRIMARY KEY,
        pharmacy_id INTEGER REFERENCES pharmacies(id) ON DELETE CASCADE,
        day_of_week INTEGER CHECK (day_of_week >= 0 AND day_of_week <= 6),
        specific_date DATE,
        start_time TIME NOT NULL,
        end_time TIME NOT NULL,
        default_labor_strength INTEGER DEFAULT 1,
        created_at TIMESTAMP DEFAULT NOW(),
        CONSTRAINT check_day_or_date CHECK (
          (day_of_week IS NOT NULL AND specific_date IS NULL) OR 
          (day_of_week IS NULL AND specific_date IS NOT NULL)
        )
      )
    `);

    // Create capacity slots table
    await client.query(`
      CREATE TABLE IF NOT EXISTS capacity_slots (
        id SERIAL PRIMARY KEY,
        pharmacy_id INTEGER REFERENCES pharmacies(id) ON DELETE CASCADE,
        slot_date DATE NOT NULL,
        slot_time TIME NOT NULL,
        configured_capacity INTEGER DEFAULT 0,
        consumed_capacity INTEGER DEFAULT 0,
        fulfilled_capacity INTEGER DEFAULT 0,
        is_available BOOLEAN DEFAULT true,
        labor_strength INTEGER DEFAULT 1,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(pharmacy_id, slot_date, slot_time)
      )
    `);

    // Create workforce tracking table
    await client.query(`
      CREATE TABLE IF NOT EXISTS workforce_tracking (
        id SERIAL PRIMARY KEY,
        pharmacy_id INTEGER REFERENCES pharmacies(id) ON DELETE CASCADE,
        shift_date DATE NOT NULL,
        shift_start_time TIME NOT NULL,
        shift_end_time TIME NOT NULL,
        signed_in_strength INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(pharmacy_id, shift_date, shift_start_time)
      )
    `);

    // Create pharmacy overrides table
    await client.query(`
      CREATE TABLE IF NOT EXISTS pharmacy_overrides (
        id SERIAL PRIMARY KEY,
        pharmacy_id INTEGER REFERENCES pharmacies(id) ON DELETE CASCADE,
        day_of_week INTEGER CHECK (day_of_week >= 0 AND day_of_week <= 6),
        specific_date DATE,
        operating_start_time TIME,
        operating_end_time TIME,
        default_labor_strength INTEGER,
        capacity_factor DECIMAL(5,2),
        slot_length_minutes INTEGER,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        CONSTRAINT check_pharmacy_day_or_date CHECK (
          (day_of_week IS NOT NULL AND specific_date IS NULL) OR 
          (day_of_week IS NULL AND specific_date IS NOT NULL)
        ),
        UNIQUE(pharmacy_id, day_of_week, specific_date)
      )
    `);

    // Create indexes for performance
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_capacity_slots_pharmacy_date 
      ON capacity_slots(pharmacy_id, slot_date)
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_pharmacy_shifts_pharmacy_dow 
      ON pharmacy_shifts(pharmacy_id, day_of_week)
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_pharmacy_shifts_pharmacy_date 
      ON pharmacy_shifts(pharmacy_id, specific_date)
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_pharmacy_overrides_pharmacy_dow 
      ON pharmacy_overrides(pharmacy_id, day_of_week)
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_pharmacy_overrides_pharmacy_date 
      ON pharmacy_overrides(pharmacy_id, specific_date)
    `);

    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  } finally {
    client.release();
  }
}