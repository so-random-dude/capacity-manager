<script lang="ts">
  import type { PharmacyFormData, ShiftFormData } from '$lib/types.js';
  import { DAYS_OF_WEEK } from '$lib/types.js';
  import { goto } from '$app/navigation';

  let formData: PharmacyFormData = {
    name: '',
    zone: '',
    code: '',
    slot_length_minutes: 60,
    operating_start_time: '09:00',
    operating_end_time: '18:00',
    default_labor_strength: 1,
    capacity_factor: 10.0,
    shifts: []
  };

  let showShifts = false;
  let loading = false;
  let error = '';
  let success = '';

  function addShift() {
    formData.shifts = [...formData.shifts, {
      day_of_week: 1,
      start_time: '09:00',
      end_time: '18:00',
      default_labor_strength: 1
    }];
  }

  function removeShift(index: number) {
    formData.shifts = formData.shifts.filter((_, i) => i !== index);
  }

  async function submitForm() {
    error = '';
    success = '';
    loading = true;

    try {
      const response = await fetch('/api/pharmacies', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      const result = await response.json();

      if (response.ok) {
        success = 'Pharmacy created successfully!';
        setTimeout(() => {
          goto(`/pharmacy/${result.pharmacy.id}`);
        }, 2000);
      } else {
        error = result.error || 'Failed to create pharmacy';
      }
    } catch (err) {
      error = 'Network error occurred';
      console.error('Error creating pharmacy:', err);
    } finally {
      loading = false;
    }
  }
</script>

<div class="min-h-screen bg-gray-50 py-8">
  <div class="max-w-2xl mx-auto px-4">
    <div class="bg-white rounded-lg shadow-md p-6">
      <h1 class="text-2xl font-bold text-gray-900 mb-6">Set Up New Pharmacy</h1>
      
      {#if error}
        <div class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      {/if}

      {#if success}
        <div class="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded mb-4">
          {success}
        </div>
      {/if}

      <form on:submit|preventDefault={submitForm} class="space-y-6">
        <!-- Basic Information -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label for="name" class="block text-sm font-medium text-gray-700 mb-1">
              Pharmacy Name *
            </label>
            <input
              type="text"
              id="name"
              bind:value={formData.name}
              required
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label for="zone" class="block text-sm font-medium text-gray-700 mb-1">
              Zone *
            </label>
            <input
              type="text"
              id="zone"
              bind:value={formData.zone}
              required
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label for="code" class="block text-sm font-medium text-gray-700 mb-1">
              3-Letter Code *
            </label>
            <input
              type="text"
              id="code"
              bind:value={formData.code}
              maxlength="3"
              required
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label for="slot_length" class="block text-sm font-medium text-gray-700 mb-1">
              Slot Length (minutes)
            </label>
            <input
              type="number"
              id="slot_length"
              bind:value={formData.slot_length_minutes}
              min="15"
              step="15"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <!-- Operating Hours -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label for="operating_start" class="block text-sm font-medium text-gray-700 mb-1">
              Operating Start Time *
            </label>
            <input
              type="time"
              id="operating_start"
              bind:value={formData.operating_start_time}
              required
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label for="operating_end" class="block text-sm font-medium text-gray-700 mb-1">
              Operating End Time *
            </label>
            <input
              type="time"
              id="operating_end"
              bind:value={formData.operating_end_time}
              required
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <!-- Capacity Settings -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label for="labor_strength" class="block text-sm font-medium text-gray-700 mb-1">
              Default Labor Strength
            </label>
            <input
              type="number"
              id="labor_strength"
              bind:value={formData.default_labor_strength}
              min="1"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label for="capacity_factor" class="block text-sm font-medium text-gray-700 mb-1">
              Capacity Factor
            </label>
            <input
              type="number"
              id="capacity_factor"
              bind:value={formData.capacity_factor}
              min="0.1"
              step="0.1"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <!-- Shifts Section -->
        <div class="border-t pt-6">
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-lg font-medium text-gray-900">Custom Shifts (Optional)</h2>
            <button
              type="button"
              on:click={() => showShifts = !showShifts}
              class="text-blue-600 hover:text-blue-800"
            >
              {showShifts ? 'Hide' : 'Configure'} Shifts
            </button>
          </div>

          {#if showShifts}
            <div class="space-y-4">
              {#each formData.shifts as shift, index}
                <div class="bg-gray-50 p-4 rounded-md">
                  <div class="flex items-center justify-between mb-3">
                    <h3 class="text-sm font-medium text-gray-700">Shift {index + 1}</h3>
                    <button
                      type="button"
                      on:click={() => removeShift(index)}
                      class="text-red-600 hover:text-red-800 text-sm"
                    >
                      Remove
                    </button>
                  </div>

                  <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div>
                      <label class="block text-xs font-medium text-gray-600 mb-1">
                        Day of Week
                      </label>
                      <select
                        bind:value={shift.day_of_week}
                        class="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                      >
                        {#each DAYS_OF_WEEK as day, dayIndex}
                          <option value={dayIndex}>{day}</option>
                        {/each}
                      </select>
                    </div>

                    <div>
                      <label class="block text-xs font-medium text-gray-600 mb-1">
                        Start Time
                      </label>
                      <input
                        type="time"
                        bind:value={shift.start_time}
                        class="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label class="block text-xs font-medium text-gray-600 mb-1">
                        End Time
                      </label>
                      <input
                        type="time"
                        bind:value={shift.end_time}
                        class="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label class="block text-xs font-medium text-gray-600 mb-1">
                        Labor Strength
                      </label>
                      <input
                        type="number"
                        bind:value={shift.default_labor_strength}
                        min="1"
                        class="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>
              {/each}

              <button
                type="button"
                on:click={addShift}
                class="w-full py-2 px-4 border border-dashed border-gray-300 rounded-md text-gray-600 hover:border-blue-400 hover:text-blue-600"
              >
                + Add Shift
              </button>
            </div>
          {/if}
        </div>

        <!-- Submit Button -->
        <div class="flex justify-end space-x-3 pt-6 border-t">
          <button
            type="button"
            on:click={() => goto('/')}
            class="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            class="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Creating...' : 'Create Pharmacy'}
          </button>
        </div>
      </form>
    </div>
  </div>
</div>