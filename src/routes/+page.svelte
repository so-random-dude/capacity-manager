<script lang="ts">
    import { onMount } from 'svelte';
    import { goto } from '$app/navigation';

    let pharmacies: any[] = [];
    let loading = true;
    let error = '';

    onMount(async () => {
        try {
            const response = await fetch('/api/pharmacies');
            if (response.ok) {
                pharmacies = await response.json();
            } else {
                error = 'Failed to load pharmacies';
            }
        } catch (err) {
            error = 'Network error occurred';
            console.error('Error loading pharmacies:', err);
        } finally {
            loading = false;
        }
    });

    function goToPharmacy(pharmacyId: number) {
        goto(`/pharmacy/${pharmacyId}`);
    }
</script>

<div class="min-h-screen bg-gray-50 py-8">
    <div class="max-w-4xl mx-auto px-4">
        <div class="text-center mb-8">
            <h1 class="text-3xl font-bold text-gray-900 mb-2">Pharmacy Capacity Tracker</h1>
            <p class="text-gray-600">Manage manual labor capacity across your pharmacy network</p>
        </div>

        {#if error}
            <div class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
                {error}
            </div>
        {/if}

        <div class="bg-white rounded-lg shadow-md p-6 mb-6">
            <div class="flex items-center justify-between mb-4">
                <h2 class="text-xl font-semibold text-gray-900">Pharmacies</h2>
                <a
                    href="/setup"
                    class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                    + Add Pharmacy
                </a>
            </div>

            {#if loading}
                <div class="text-center py-8">
                    <div class="text-gray-600">Loading pharmacies...</div>
                </div>
            {:else if pharmacies.length === 0}
                <div class="text-center py-8">
                    <div class="text-gray-500 mb-4">No pharmacies configured yet.</div>
                    <a
                        href="/setup"
                        class="inline-block px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                    >
                        Set Up Your First Pharmacy
                    </a>
                </div>
            {:else}
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {#each pharmacies as pharmacy}
                        <div class="border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                             on:click={() => goToPharmacy(pharmacy.id)}
                             on:keydown={(e) => e.key === 'Enter' && goToPharmacy(pharmacy.id)}
                             role="button"
                             tabindex="0">
                            <h3 class="font-semibold text-gray-900 mb-1">{pharmacy.name}</h3>
                            <p class="text-sm text-gray-600 mb-2">
                                {pharmacy.zone} • Code: {pharmacy.code}
                            </p>
                            <div class="text-xs text-gray-500">
                                <div>Hours: {pharmacy.operating_start_time} - {pharmacy.operating_end_time}</div>
                                <div>Slot Length: {pharmacy.slot_length_minutes} min</div>
                            </div>
                        </div>
                    {/each}
                </div>
            {/if}
        </div>

        <div class="bg-white rounded-lg shadow-md p-6">
            <h2 class="text-lg font-semibold text-gray-900 mb-4">System Overview</h2>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
                <div>
                    <h3 class="font-medium text-gray-900 mb-2">Configured Capacity</h3>
                    <p class="text-gray-600">Available workforce × capacity factor ÷ total slots per shift</p>
                </div>
                <div>
                    <h3 class="font-medium text-gray-900 mb-2">Consumed Capacity</h3>
                    <p class="text-gray-600">Orders allocated to time slots but not yet completed</p>
                </div>
                <div>
                    <h3 class="font-medium text-gray-900 mb-2">Fulfilled Capacity</h3>
                    <p class="text-gray-600">Actual work completed - irreversible commitment</p>
                </div>
            </div>
        </div>
    </div>
</div>