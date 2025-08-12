<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import type { CapacityView } from '$lib/types.js';

  let capacityData: CapacityView[] = [];
  let loading = false;
  let error = '';
  let success = '';
  let pharmacy: any = null;

  const pharmacyId = $page.params.id;

  // Form data
  let consumeAmount = 1;
  let consumeDate = '';
  let fulfillAmount = 1;
  let fulfillDate = '';
  let fulfillTime = '';

  onMount(async () => {
    await loadData();
    
    // Set default dates to today
    const today = new Date().toISOString().split('T')[0];
    consumeDate = today;
    fulfillDate = today;
  });

  async function loadData() {
    try {
      loading = true;
      
      const [pharmacyResponse, capacityResponse] = await Promise.all([
        fetch(`/api/pharmacies`).then(r => r.json()),
        fetch(`/api/pharmacies/${pharmacyId}/capacity`).then(r => r.json())
      ]);

      pharmacy = pharmacyResponse.find((p: any) => p.id === parseInt(pharmacyId));
      capacityData = capacityResponse;
    } catch (err) {
      error = 'Failed to load data';
      console.error('Error loading data:', err);
    } finally {
      loading = false;
    }
  }

  async function consumeCapacity() {
    error = '';
    success = '';

    try {
      const response = await fetch(`/api/pharmacies/${pharmacyId}/capacity`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'consume',
          amount: consumeAmount,
          slotDate: consumeDate || undefined
        })
      });

      const result = await response.json();

      if (response.ok) {
        success = `${result.message}${result.slotTime ? ` at ${result.slotTime}` : ''}`;
        await loadData(); // Refresh data
      } else {
        error = result.error;
      }
    } catch (err) {
      error = 'Failed to consume capacity';
      console.error('Error consuming capacity:', err);
    }
  }

  async function fulfillCapacity() {
    error = '';
    success = '';

    if (!fulfillTime) {
      error = 'Please select a time slot for fulfillment';
      return;
    }

    try {
      const response = await fetch(`/api/pharmacies/${pharmacyId}/capacity`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'fulfill',
          amount: fulfillAmount,
          slotDate: fulfillDate,
          slotTime: fulfillTime
        })
      });

      const result = await response.json();

      if (response.ok) {
        success = result.message;
        await loadData(); // Refresh data
      } else {
        error = result.error;
      }
    } catch (err) {
      error = 'Failed to fulfill capacity';
      console.error('Error fulfilling capacity:', err);
    }
  }

  async function simulateTimeAdvancement() {
    error = '';
    success = '';

    try {
      const response = await fetch(`/api/pharmacies/${pharmacyId}/capacity`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'redistribute'
        })
      });

      const result = await response.json();

      if (response.ok) {
        success = 'Time advancement simulated - unfulfilled capacity redistributed';
        await loadData(); // Refresh data
      } else {
        error = result.error;
      }
    } catch (err) {
      error = 'Failed to simulate time advancement';
      console.error('Error simulating time advancement:', err);
    }
  }

  function getAvailableTimeSlots(dateStr: string): Array<{time: string, consumed: number, available: number}> {
    const dayData = capacityData.find(d => d.date === dateStr);
    if (!dayData) return [];
    
    return dayData.slots
      .filter(slot => slot.consumed > slot.fulfilled)
      .map(slot => ({
        time: slot.time,
        consumed: slot.consumed,
        available: slot.consumed - slot.fulfilled
      }));
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

  // Get next 14 days for date selection
  function getNext14Days(): Array<{value: string, label: string}> {
    const days = [];
    for (let i = 0; i < 14; i++) {
      const date = new Date();
      date.setDate(date.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];
      days.push({
        value: dateStr,
        label: formatDate(dateStr)
      });
    }
    return days;
  }
</script>

<div class="min-h-screen bg-gray-50 py-8">
  <div class="max-w-4xl mx-auto px-4">
    <!-- Header -->
    <div class="bg-white rounded-lg shadow-md p-6 mb-6">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold text-gray-900">Test Interface</h1>
          <p class="text-gray-600">
            {pharmacy?.name} • Test capacity operations and time simulation
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

    <!-- Test Operations -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <!-- Consume Capacity -->
      <div class="bg-white rounded-lg shadow-md p-6">
        <h2 class="text-lg font-medium text-gray-900 mb-4">Consume Capacity</h2>
        <p class="text-sm text-gray-600 mb-4">
          Add capacity consumption to the next available slot
        </p>

        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              Amount to Consume
            </label>
            <input
              type="number"
              bind:value={consumeAmount}
              min="1"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              Target Date (optional)
            </label>
            <select
              bind:value={consumeDate}
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Today (auto-select)</option>
              {#each getNext14Days() as day}
                <option value={day.value}>{day.label}</option>
              {/each}
            </select>
          </div>

          <button
            on:click={consumeCapacity}
            disabled={loading}
            class="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            Consume Capacity
          </button>
        </div>
      </div>

      <!-- Fulfill Capacity -->
      <div class="bg-white rounded-lg shadow-md p-6">
        <h2 class="text-lg font-medium text-gray-900 mb-4">Fulfill Capacity</h2>
        <p class="text-sm text-gray-600 mb-4">
          Mark capacity as fulfilled for a specific slot
        </p>

        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              Amount to Fulfill
            </label>
            <input
              type="number"
              bind:value={fulfillAmount}
              min="1"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              Date
            </label>
            <select
              bind:value={fulfillDate}
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {#each getNext14Days() as day}
                <option value={day.value}>{day.label}</option>
              {/each}
            </select>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              Time Slot
            </label>
            <select
              bind:value={fulfillTime}
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select a time slot</option>
              {#each getAvailableTimeSlots(fulfillDate) as slot}
                <option value={slot.time}>
                  {slot.time} (Unfulfilled: {slot.available})
                </option>
              {/each}
            </select>
          </div>

          <button
            on:click={fulfillCapacity}
            disabled={loading}
            class="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
          >
            Fulfill Capacity
          </button>
        </div>
      </div>
    </div>

    <!-- Time Simulation -->
    <div class="mt-6 bg-white rounded-lg shadow-md p-6">
      <h2 class="text-lg font-medium text-gray-900 mb-4">Time Simulation</h2>
      <p class="text-sm text-gray-600 mb-4">
        Simulate the passage of time to trigger redistribution of unfulfilled capacity. 
        Normally this happens automatically when time advances, but you can test it manually here.
      </p>
      
      <button
        on:click={simulateTimeAdvancement}
        disabled={loading}
        class="px-6 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 disabled:opacity-50"
      >
        Simulate Time Advancement
      </button>
    </div>

    <!-- Current Status Overview -->
    <div class="mt-6 bg-white rounded-lg shadow-md p-6">
      <h2 class="text-lg font-medium text-gray-900 mb-4">Today's Status</h2>
      
      {#if loading}
        <div class="text-gray-500">Loading...</div>
      {:else if capacityData.length > 0}
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
          {#each capacityData[0].slots as slot}
            <div class="bg-gray-50 p-3 rounded-md">
              <div class="text-sm font-medium">{slot.time}</div>
              <div class="text-xs space-y-1 mt-1">
                <div>Configured: {slot.configured}</div>
                <div>Consumed: {slot.consumed}</div>
                <div>Fulfilled: {slot.fulfilled}</div>
                <div class="font-bold text-blue-600">Available: {slot.available}</div>
                {#if slot.can_reassign_unfulfilled}
                  <div class="text-orange-600 font-bold">
                    Unfulfilled: {slot.consumed - slot.fulfilled}
                  </div>
                {/if}
              </div>
            </div>
          {/each}
        </div>
      {:else}
        <div class="text-gray-500">No capacity data available</div>
      {/if}
    </div>
  </div>
</div>