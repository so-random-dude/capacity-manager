# Pharmacy Capacity Tracker

A comprehensive system to track manual labor capacity across multiple pharmacies with shift management, capacity allocation, and real-time monitoring.

## Features

- **Multi-Pharmacy Management**: Configure up to 20 pharmacies with individual settings
- **Flexible Shift Configuration**: Set different shifts per day of the week with custom labor strength
- **Three-Tier Capacity System**:
  - **Configured Capacity**: Based on workforce strength and capacity factor
  - **Consumed Capacity**: Orders allocated to time slots
  - **Fulfilled Capacity**: Actual completed work
- **Automatic Redistribution**: Unfulfilled capacity automatically moves to available slots
- **Real-time Monitoring**: 14-day capacity dashboard with visual status indicators
- **Test Interface**: Simulate capacity operations and time advancement

## Prerequisites

- Node.js 18+ 
- PostgreSQL database
- npm or yarn

## Setup

1. **Clone and Install Dependencies**
   ```bash
   npm install
   ```

2. **Database Configuration**
   - Copy `.env.example` to `.env`
   - Update database connection settings:
   ```env
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=capacity_tracker
   DB_USER=postgres
   DB_PASSWORD=postgres
   ```

3. **Database Setup**
   The database schema will be automatically created when you first run the application.

## Running the Application

```bash
# Development server
npm run dev

# Production build
npm run build
npm run preview
```

## Usage

### 1. Set Up Pharmacy
- Navigate to the setup page to configure a new pharmacy
- Set basic info: name, zone, 3-letter code
- Configure operating hours and slot length (default 60 minutes)
- Set default labor strength and capacity factor
- Optionally add custom shifts for different days of the week

### 2. Monitor Capacity (Dashboard)
- View 14-day capacity overview in table format
- See all three capacity types: Configured, Consumed, Fulfilled
- Toggle slot availability on/off
- Visual indicators for capacity status (green/yellow/red/gray)
- Alerts for unfulfilled capacity that needs reassignment

### 3. Test Operations
- Consume capacity: Allocate work to next available slot
- Fulfill capacity: Mark work as completed for specific slots
- Simulate time advancement: Trigger redistribution manually

## System Architecture

### Capacity Calculation
```
Configured Capacity = (Labor Strength × Capacity Factor) ÷ Total Slots per Shift
```

### Automatic Redistribution
When time advances from one slot to the next:
1. Calculate unfulfilled capacity (Consumed - Fulfilled)
2. Find next available slots in the same day
3. Redistribute to available slots with capacity
4. If no slots available, add to last slot of the day

### Database Schema
- **pharmacies**: Core pharmacy configuration
- **pharmacy_shifts**: Custom shifts per day of week
- **capacity_slots**: Time slot capacity tracking
- **workforce_tracking**: Labor strength per shift

## API Endpoints

- `GET/POST /api/pharmacies` - Pharmacy management
- `GET/POST /api/pharmacies/[id]/capacity` - Capacity operations
- `PATCH /api/pharmacies/[id]/slots/[date]/[time]` - Slot availability
- `GET/POST /api/pharmacies/[id]/workforce` - Workforce tracking

## Development

```bash
# Type checking
npm run check

# Build for production
npm run build
```

## Architecture Notes

- **SvelteKit**: Full-stack web framework
- **PostgreSQL**: Data persistence with automatic schema creation
- **Tailwind CSS**: Styling and responsive design
- **TypeScript**: Type safety throughout the application
- **Background Scheduler**: Automatic capacity redistribution every minute
