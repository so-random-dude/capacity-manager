<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import type { PharmacyOverride, PharmacyOverrideFormData, PharmacyShift, ShiftFormData } from '$lib/types.js';
  import { DAYS_OF_WEEK } from '$lib/types.js';

  let pharmacyOverrides: PharmacyOverride[] = [];
  let shifts: PharmacyShift[] = [];
  let pharmacy: any = null;
  let loading = true;
  let error = '';
  let success = '';

  const pharmacyId = $page.params.id;

  // Form states
  let showPharmacyOverrideForm = false;
  let showShiftForm = false;
  
  let pharmacyOverrideForm: PharmacyOverrideFormData = {
    day_of_week: undefined,
    specific_date: undefined,
    operating_start_time: undefined,
    operating_end_time: undefined,
    default_labor_strength: undefined,
    capacity_factor: undefined,
    slot_length_minutes: undefined
  };

  let shiftForm: ShiftFormData = {
    day_of_week: undefined,
    specific_date: undefined,
    start_time: '09:00',
    end_time: '17:00',
    default_labor_strength: 1
  };

  let overrideType: 'day' | 'date' = 'day';
  let shiftType: 'day' | 'date' = 'day';

  onMount(async () => {
    await loadData();
  });

  async function loadData() {
    try {
      loading = true;
      
      const [pharmacyResponse, overridesResponse, shiftsResponse] = await Promise.all([
        fetch(`/api/pharmacies`).then(r => r.json()),
        fetch(`/api/pharmacies/${pharmacyId}/overrides`).then(r => r.json()),
        fetch(`/api/pharmacies/${pharmacyId}/shifts`).then(r => r.json()).catch(() => [])
      ]);

      pharmacy = pharmacyResponse.find((p: any) => p.id === parseInt(pharmacyId));
      pharmacyOverrides = overridesResponse;
      shifts = shiftsResponse || [];
    } catch (err) {
      error = 'Failed to load data';
      console.error('Error loading data:', err);
    } finally {
      loading = false;
    }
  }

  async function savePharmacyOverride() {
    error = '';
    success = '';

    try {
      const data = { ...pharmacyOverrideForm };
      
      // Set the appropriate field based on override type
      if (overrideType === 'day') {
        data.specific_date = undefined;
      } else {
        data.day_of_week = undefined;
      }

      // Remove undefined values
      Object.keys(data).forEach(key => {
        if (data[key as keyof PharmacyOverrideFormData] === undefined || data[key as keyof PharmacyOverrideFormData] === '') {
          delete data[key as keyof PharmacyOverrideFormData];
        }
      });

      const response = await fetch(`/api/pharmacies/${pharmacyId}/overrides`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      const result = await response.json();

      if (response.ok) {
        success = 'Pharmacy override saved successfully!';
        showPharmacyOverrideForm = false;
        resetPharmacyOverrideForm();
        await loadData();
      } else {
        error = result.error;
      }
    } catch (err) {
      error = 'Failed to save pharmacy override';
      console.error('Error saving override:', err);
    }
  }

  async function saveShift() {
    error = '';
    success = '';

    try {
      const data = { ...shiftForm };
      
      // Set the appropriate field based on shift type
      if (shiftType === 'day') {
        data.specific_date = undefined;
      } else {
        data.day_of_week = undefined;
      }

      const response = await fetch(`/api/pharmacies/${pharmacyId}/shifts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      const result = await response.json();

      if (response.ok) {
        success = 'Shift saved successfully!';
        showShiftForm = false;
        resetShiftForm();
        await loadData();
      } else {
        error = result.error;
      }
    } catch (err) {
      error = 'Failed to save shift';
      console.error('Error saving shift:', err);
    }
  }

  async function deleteOverride(overrideId: number) {
    if (!confirm('Are you sure you want to delete this override?')) return;

    try {
      const response = await fetch(`/api/pharmacies/${pharmacyId}/overrides?overrideId=${overrideId}`, {
        method: 'DELETE'
      });

      const result = await response.json();

      if (response.ok) {
        success = 'Override deleted successfully!';
        await loadData();
      } else {
        error = result.error;
      }
    } catch (err) {
      error = 'Failed to delete override';
      console.error('Error deleting override:', err);
    }
  }

  async function deleteShift(shiftId: number) {
    if (!confirm('Are you sure you want to delete this shift?')) return;

    try {
      const response = await fetch(`/api/pharmacies/${pharmacyId}/shifts?shiftId=${shiftId}`, {
        method: 'DELETE'
      });

      const result = await response.json();

      if (response.ok) {
        success = 'Shift deleted successfully!';
        await loadData();
      } else {
        error = result.error;
      }
    } catch (err) {
      error = 'Failed to delete shift';
      console.error('Error deleting shift:', err);
    }
  }

  function resetPharmacyOverrideForm() {
    pharmacyOverrideForm = {
      day_of_week: undefined,
      specific_date: undefined,
      operating_start_time: undefined,
      operating_end_time: undefined,
      default_labor_strength: undefined,
      capacity_factor: undefined,
      slot_length_minutes: undefined
    };
    overrideType = 'day';
  }

  function resetShiftForm() {
    shiftForm = {
      day_of_week: undefined,
      specific_date: undefined,
      start_time: '09:00',
      end_time: '17:00',
      default_labor_strength: 1
    };
    shiftType = 'day';
  }

  function formatOverrideTarget(override: PharmacyOverride): string {
    if (override.specific_date) {
      return new Date(override.specific_date).toLocaleDateString();
    } else if (override.day_of_week !== undefined) {
      return DAYS_OF_WEEK[override.day_of_week];
    }
    return 'Unknown';
  }

  function formatShiftTarget(shift: PharmacyShift): string {
    if (shift.specific_date) {
      return new Date(shift.specific_date).toLocaleDateString();
    } else if (shift.day_of_week !== undefined) {
      return DAYS_OF_WEEK[shift.day_of_week];
    }
    return 'Unknown';
  }
</script>

<div class="min-h-screen bg-gray-50 py-8">
  <div class="max-w-6xl mx-auto px-4">
    <!-- Header -->
    <div class="bg-white rounded-lg shadow-md p-6 mb-6">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold text-gray-900">Pharmacy Overrides</h1>
          <p class="text-gray-600">
            {pharmacy?.name} • Manage day-of-week and date-specific overrides
          </p>
        </div>
        <a
          href="/pharmacy/{pharmacyId}"
          class="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
        >
          Back to Dashboard
        </a>
      </div>
    </div>

    <!-- Alerts -->
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

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <!-- Pharmacy Overrides -->
      <div class="bg-white rounded-lg shadow-md p-6">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-lg font-medium text-gray-900">Pharmacy Overrides</h2>
          <button
            on:click={() => showPharmacyOverrideForm = !showPharmacyOverrideForm}
            class="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
          >
            + Add Override
          </button>
        </div>

        {#if showPharmacyOverrideForm}
          <div class="bg-gray-50 p-4 rounded-md mb-4">
            <h3 class="font-medium mb-3">Add Pharmacy Override</h3>
            
            <div class="space-y-3">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">
                  Override Type
                </label>
                <select bind:value={overrideType} class="w-full px-3 py-2 border border-gray-300 rounded text-sm">
                  <option value="day">Day of Week</option>
                  <option value="date">Specific Date</option>
                </select>
              </div>

              {#if overrideType === 'day'}
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Day of Week</label>
                  <select bind:value={pharmacyOverrideForm.day_of_week} class="w-full px-3 py-2 border border-gray-300 rounded text-sm">
                    <option value={undefined}>Select day</option>
                    {#each DAYS_OF_WEEK as day, index}
                      <option value={index}>{day}</option>
                    {/each}
                  </select>
                </div>
              {:else}
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Specific Date</label>
                  <input type="date" bind:value={pharmacyOverrideForm.specific_date} class="w-full px-3 py-2 border border-gray-300 rounded text-sm" />
                </div>
              {/if}

              <div class="grid grid-cols-2 gap-2">
                <div>
                  <label class="block text-xs font-medium text-gray-700 mb-1">Operating Start</label>
                  <input type="time" bind:value={pharmacyOverrideForm.operating_start_time} class="w-full px-2 py-1 border border-gray-300 rounded text-sm" />
                </div>
                <div>
                  <label class="block text-xs font-medium text-gray-700 mb-1">Operating End</label>
                  <input type="time" bind:value={pharmacyOverrideForm.operating_end_time} class="w-full px-2 py-1 border border-gray-300 rounded text-sm" />
                </div>
              </div>

              <div class="grid grid-cols-3 gap-2">
                <div>
                  <label class="block text-xs font-medium text-gray-700 mb-1">Labor Strength</label>
                  <input type="number" bind:value={pharmacyOverrideForm.default_labor_strength} min="1" class="w-full px-2 py-1 border border-gray-300 rounded text-sm" />
                </div>
                <div>
                  <label class="block text-xs font-medium text-gray-700 mb-1">Capacity Factor</label>
                  <input type="number" bind:value={pharmacyOverrideForm.capacity_factor} step="0.1" class="w-full px-2 py-1 border border-gray-300 rounded text-sm" />
                </div>
                <div>
                  <label class="block text-xs font-medium text-gray-700 mb-1">Slot Length (min)</label>
                  <input type="number" bind:value={pharmacyOverrideForm.slot_length_minutes} min="15" step="15" class="w-full px-2 py-1 border border-gray-300 rounded text-sm" />
                </div>
              </div>

              <div class="flex space-x-2">
                <button
                  on:click={savePharmacyOverride}
                  class="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
                >
                  Save Override
                </button>
                <button
                  on:click={() => { showPharmacyOverrideForm = false; resetPharmacyOverrideForm(); }}
                  class="px-3 py-1 bg-gray-500 text-white rounded text-sm hover:bg-gray-600"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        {/if}

        <div class="space-y-2">
          {#if loading}
            <div class="text-gray-500 text-sm">Loading...</div>
          {:else if pharmacyOverrides.length === 0}
            <div class="text-gray-500 text-sm">No pharmacy overrides configured</div>
          {:else}
            {#each pharmacyOverrides as override}
              <div class="border rounded p-3 text-sm">
                <div class="flex items-center justify-between mb-2">
                  <span class="font-medium">{formatOverrideTarget(override)}</span>
                  <button
                    on:click={() => deleteOverride(override.id)}
                    class="text-red-600 hover:text-red-800 text-xs"
                  >
                    Delete
                  </button>
                </div>
                <div class="text-xs text-gray-600 space-y-1">
                  {#if override.operating_start_time || override.operating_end_time}
                    <div>Hours: {override.operating_start_time || 'default'} - {override.operating_end_time || 'default'}</div>
                  {/if}
                  {#if override.default_labor_strength}
                    <div>Labor Strength: {override.default_labor_strength}</div>
                  {/if}
                  {#if override.capacity_factor}
                    <div>Capacity Factor: {override.capacity_factor}</div>
                  {/if}
                  {#if override.slot_length_minutes}
                    <div>Slot Length: {override.slot_length_minutes} min</div>
                  {/if}
                </div>
              </div>
            {/each}
          {/if}
        </div>
      </div>

      <!-- Shift Overrides -->
      <div class="bg-white rounded-lg shadow-md p-6">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-lg font-medium text-gray-900">Shift Overrides</h2>
          <button
            on:click={() => showShiftForm = !showShiftForm}
            class="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
          >
            + Add Shift
          </button>
        </div>

        {#if showShiftForm}
          <div class="bg-gray-50 p-4 rounded-md mb-4">
            <h3 class="font-medium mb-3">Add Shift Override</h3>
            
            <div class="space-y-3">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">
                  Shift Type
                </label>
                <select bind:value={shiftType} class="w-full px-3 py-2 border border-gray-300 rounded text-sm">
                  <option value="day">Day of Week</option>
                  <option value="date">Specific Date</option>
                </select>
              </div>

              {#if shiftType === 'day'}
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Day of Week</label>
                  <select bind:value={shiftForm.day_of_week} class="w-full px-3 py-2 border border-gray-300 rounded text-sm">
                    <option value={undefined}>Select day</option>
                    {#each DAYS_OF_WEEK as day, index}
                      <option value={index}>{day}</option>
                    {/each}
                  </select>
                </div>
              {:else}
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Specific Date</label>
                  <input type="date" bind:value={shiftForm.specific_date} class="w-full px-3 py-2 border border-gray-300 rounded text-sm" />
                </div>
              {/if}

              <div class="grid grid-cols-2 gap-2">
                <div>
                  <label class="block text-xs font-medium text-gray-700 mb-1">Start Time</label>
                  <input type="time" bind:value={shiftForm.start_time} class="w-full px-2 py-1 border border-gray-300 rounded text-sm" />
                </div>
                <div>
                  <label class="block text-xs font-medium text-gray-700 mb-1">End Time</label>
                  <input type="time" bind:value={shiftForm.end_time} class="w-full px-2 py-1 border border-gray-300 rounded text-sm" />
                </div>
              </div>

              <div>
                <label class="block text-xs font-medium text-gray-700 mb-1">Labor Strength</label>
                <input type="number" bind:value={shiftForm.default_labor_strength} min="1" class="w-full px-2 py-1 border border-gray-300 rounded text-sm" />
              </div>

              <div class="flex space-x-2">
                <button
                  on:click={saveShift}
                  class="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
                >
                  Save Shift
                </button>
                <button
                  on:click={() => { showShiftForm = false; resetShiftForm(); }}
                  class="px-3 py-1 bg-gray-500 text-white rounded text-sm hover:bg-gray-600"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        {/if}

        <div class="space-y-2">
          {#if loading}
            <div class="text-gray-500 text-sm">Loading...</div>
          {:else if shifts.length === 0}
            <div class="text-gray-500 text-sm">No shift overrides configured</div>
          {:else}
            {#each shifts as shift}
              <div class="border rounded p-3 text-sm">
                <div class="flex items-center justify-between mb-2">
                  <span class="font-medium">{formatShiftTarget(shift)}</span>
                  <button
                    on:click={() => deleteShift(shift.id)}
                    class="text-red-600 hover:text-red-800 text-xs"
                  >
                    Delete
                  </button>
                </div>
                <div class="text-xs text-gray-600">
                  <div>{shift.start_time} - {shift.end_time}</div>
                  <div>Labor Strength: {shift.default_labor_strength}</div>
                </div>
              </div>
            {/each}
          {/if}
        </div>
      </div>
    </div>

    <!-- Help Section -->
    <div class="mt-6 bg-blue-50 rounded-lg p-4">
      <h3 class="font-medium text-blue-900 mb-2">How Overrides Work</h3>
      <div class="text-sm text-blue-800 space-y-1">
        <p><strong>Pharmacy Overrides:</strong> Override default pharmacy settings for specific days of the week or dates</p>
        <p><strong>Shift Overrides:</strong> Add custom shifts for specific days of the week or dates</p>
        <p><strong>Priority:</strong> Specific date overrides take priority over day-of-week overrides</p>
        <p><strong>Partial Overrides:</strong> Only specify the fields you want to override; others use default values</p>
      </div>
    </div>
  </div>
</div>