<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import type { CapacityView, SlotCapacityView } from '$lib/types.js';

  let capacityData: CapacityView[] = [];
  let loading = true;
  let error = '';
  let pharmacy: any = null;

  const pharmacyId = $page.params.id;

  onMount(async () => {
    await loadData();
  });

  async function loadData() {
    try {
      loading = true;
      
      // Load pharmacy details and capacity data in parallel
      const [pharmacyResponse, capacityResponse] = await Promise.all([
        fetch(`/api/pharmacies`).then(r => r.json()),
        fetch(`/api/pharmacies/${pharmacyId}/capacity`).then(r => r.json())
      ]);

      // Find the specific pharmacy
      pharmacy = pharmacyResponse.find((p: any) => p.id === parseInt(pharmacyId));
      capacityData = capacityResponse;
    } catch (err) {
      error = 'Failed to load capacity data';
      console.error('Error loading data:', err);
    } finally {
      loading = false;
    }
  }

  async function toggleSlotAvailability(date: string, time: string, currentAvailability: boolean) {
    try {
      const response = await fetch(`/api/pharmacies/${pharmacyId}/slots/${date}/${time}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          is_available: !currentAvailability
        })
      });

      const result = await response.json();

      if (!response.ok) {
        if (result.error.includes('insufficient available capacity')) {
          alert(`Cannot disable slot: There are ${result.unfulfilledAmount} unfulfilled orders that cannot be reassigned because there is only ${result.availableCapacity} available capacity left in the day.`);
        } else {
          alert(result.error);
        }
        return;
      }

      // Reload data to reflect changes
      await loadData();
    } catch (err) {
      alert('Failed to update slot availability');
      console.error('Error updating slot:', err);
    }
  }

  function formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return 'Tomorrow';
    } else {
      return date.toLocaleDateString('en-US', { 
        weekday: 'short', 
        month: 'short', 
        day: 'numeric' 
      });
    }
  }

  function getSlotStatusClass(slot: SlotCapacityView): string {
    if (!slot.is_available) return 'bg-gray-100 text-gray-500';
    if (slot.available <= 0) return 'bg-red-50 text-red-700';
    if (slot.available < slot.configured * 0.2) return 'bg-yellow-50 text-yellow-700';
    return 'bg-green-50 text-green-700';
  }
</script>

<div class="min-h-screen bg-gray-50 py-8">
  <div class="max-w-7xl mx-auto px-4">
    <!-- Header -->
    <div class="bg-white rounded-lg shadow-md p-6 mb-6">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold text-gray-900">
            {pharmacy?.name || 'Loading...'}
          </h1>
          {#if pharmacy}
            <p class="text-gray-600">
              {pharmacy.zone} • Code: {pharmacy.code}
            </p>
          {/if}
        </div>
        <div class="flex space-x-3">
          <a
            href="/pharmacy/{pharmacyId}/overrides"
            class="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
          >
            Overrides
          </a>
          <a
            href="/pharmacy/{pharmacyId}/test"
            class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Test Interface
          </a>
          <a
            href="/setup"
            class="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
          >
            Add Pharmacy
          </a>
        </div>
      </div>
    </div>

    {#if loading}
      <div class="text-center py-12">
        <div class="text-gray-600">Loading capacity data...</div>
      </div>
    {:else if error}
      <div class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
        {error}
      </div>
    {:else}
      <!-- Capacity Table -->
      <div class="bg-white rounded-lg shadow-md overflow-hidden">
        <div class="px-6 py-4 bg-gray-50 border-b">
          <h2 class="text-lg font-medium text-gray-900">14-Day Capacity Overview</h2>
          <p class="text-sm text-gray-600 mt-1">
            Green: Available • Yellow: Low capacity • Red: Full • Gray: Unavailable
          </p>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full">
            <thead class="bg-gray-50">
              <tr>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Time Slots
                </th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
              {#each capacityData as dayData}
                <tr>
                  <td class="px-4 py-4 text-sm font-medium text-gray-900 align-top">
                    <div class="sticky left-0 bg-white">
                      {formatDate(dayData.date)}
                      <div class="text-xs text-gray-500">
                        {new Date(dayData.date).toLocaleDateString()}
                      </div>
                    </div>
                  </td>
                  <td class="px-4 py-4">
                    <div class="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
                      {#each dayData.slots as slot}
                        <div class="relative">
                          <div class="p-2 rounded-md text-xs {getSlotStatusClass(slot)}">
                            <div class="font-medium">{slot.time}</div>
                            <div class="mt-1 space-y-0.5">
                              <div>C: {slot.configured}</div>
                              <div>U: {slot.consumed}</div>
                              <div>F: {slot.fulfilled}</div>
                              <div class="font-bold">A: {slot.available}</div>
                            </div>
                            
                            {#if slot.can_reassign_unfulfilled}
                              <div class="mt-1 text-orange-600 text-xs font-bold">
                                !{slot.consumed - slot.fulfilled}
                              </div>
                            {/if}
                          </div>
                          
                          <button
                            on:click={() => toggleSlotAvailability(dayData.date, slot.time, slot.is_available)}
                            class="absolute top-1 right-1 w-3 h-3 rounded-full {slot.is_available ? 'bg-green-500' : 'bg-red-500'}"
                            title={slot.is_available ? 'Click to disable slot' : 'Click to enable slot'}
                          ></button>
                        </div>
                      {/each}
                    </div>
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      </div>

      <!-- Legend -->
      <div class="mt-6 bg-white rounded-lg shadow-md p-4">
        <h3 class="text-sm font-medium text-gray-900 mb-3">Legend</h3>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
          <div>
            <span class="font-medium">C:</span> Configured capacity
          </div>
          <div>
            <span class="font-medium">U:</span> Consumed capacity
          </div>
          <div>
            <span class="font-medium">F:</span> Fulfilled capacity
          </div>
          <div>
            <span class="font-medium">A:</span> Available capacity (C - U)
          </div>
        </div>
        <div class="mt-3 text-xs text-gray-600">
          <span class="font-medium text-orange-600">!X:</span> X unfulfilled orders that need reassignment
        </div>
        <div class="mt-2 text-xs text-gray-600">
          <span class="inline-block w-2 h-2 bg-green-500 rounded-full mr-1"></span> Slot enabled
          <span class="inline-block w-2 h-2 bg-red-500 rounded-full mr-1 ml-3"></span> Slot disabled
        </div>
      </div>
    {/if}
  </div>
</div>