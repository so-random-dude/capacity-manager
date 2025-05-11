<script lang="ts">
    import { page } from '$app/stores';
    import { onMount } from 'svelte';

    let storeNumber: string;
    let storeData: {
        baseCapacity: number;
        dayOverrides: Record<string, number | null>;
        dateOverrides: { startDate: string; endDate: string; capacity: number }[];
        channelOverrides: Record<string, { dayOverrides: Record<string, number | null>; dateOverrides: { startDate: string; endDate: string; percentage: number }[] }>;
        error?: string;
    } | null = null;

    const allDays = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
    const channels = ['Channel 1', 'Channel 2'];
    let expandedChannel: string | null = null;
    let errorMessage = '';

    // Fetch store details on mount
    onMount(async () => {
        storeNumber = $page.params.storeNumber;

        const response = await fetch(`/api/store/${storeNumber}`);
        if (response.ok) {
            storeData = await response.json();

            // Initialize dayOverrides and channelOverrides
            storeData.dayOverrides = storeData.dayOverrides || {};
            allDays.forEach((day) => {
                if (!(day in storeData.dayOverrides)) {
                    storeData.dayOverrides[day] = null;
                }
            });

            storeData.channelOverrides = storeData.channelOverrides || {};
            channels.forEach((channel) => {
                if (!storeData.channelOverrides[channel]) {
                    storeData.channelOverrides[channel] = {
                        dayOverrides: {},
                        dateOverrides: []
                    };
                }
                allDays.forEach((day) => {
                    if (!(day in storeData.channelOverrides[channel].dayOverrides)) {
                        storeData.channelOverrides[channel].dayOverrides[day] = null;
                    }
                });
            });
        } else {
            storeData = { error: 'Store data not found.' };
        }
    });

    function toggleAccordion(channel: string) {
        expandedChannel = expandedChannel === channel ? null : channel;
    }

    function addDateOverride() {
        if (storeData) {
            storeData.dateOverrides = [
                ...storeData.dateOverrides,
                { startDate: '', endDate: '', capacity: 0 }
            ];
        }
    }

    function removeDateOverride(index: number) {
        if (storeData) {
            storeData.dateOverrides = storeData.dateOverrides.filter((_, i) => i !== index);
        }
    }

    function addChannelDateOverride(channel: string) {
        if (storeData) {
            storeData.channelOverrides[channel].dateOverrides = [
                ...storeData.channelOverrides[channel].dateOverrides,
                { startDate: '', endDate: '', percentage: 0 }
            ];
        }
    }

    function removeChannelDateOverride(channel: string, index: number) {
        if (storeData) {
            storeData.channelOverrides[channel].dateOverrides = storeData.channelOverrides[channel].dateOverrides.filter((_, i) => i !== index);
        }
    }

    function validateDateOverrides() {
        if (!storeData) return true;

        const dateRanges = storeData.dateOverrides.map(({ startDate, endDate }) => ({
            start: new Date(startDate).getTime(),
            end: new Date(endDate).getTime()
        }));

        for (let i = 0; i < dateRanges.length; i++) {
            for (let j = i + 1; j < dateRanges.length; j++) {
                if (
                    (dateRanges[i].start <= dateRanges[j].end && dateRanges[i].end >= dateRanges[j].start) ||
                    (dateRanges[j].start <= dateRanges[i].end && dateRanges[j].end >= dateRanges[i].start)
                ) {
                    errorMessage = 'Conflicting date ranges detected.';
                    return false;
                }
            }
        }

        errorMessage = '';
        return true;
    }

    async function saveData() {
        if (!validateDateOverrides()) {
            alert(errorMessage);
            return;
        }

        const response = await fetch(`/api/store/${storeNumber}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(storeData)
        });

        if (response.ok) {
            alert('Data saved successfully!');
        } else {
            alert('Failed to save data.');
        }
    }
</script>

<div class="container mx-auto p-6">
    <h1 class="text-3xl font-bold mb-6">Store Details: {storeNumber}</h1>

    {#if storeData}
        {#if storeData.error}
            <div class="bg-red-100 text-red-700 p-4 rounded mb-4">{storeData.error}</div>
        {:else}
            <section class="bg-white p-6 rounded-lg shadow mb-8">
                <h2 class="text-2xl font-semibold mb-4">Labor Capacity</h2>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <label class="block">
                        <span class="font-medium">Base Capacity:</span>
                        <input type="number" bind:value={storeData.baseCapacity} class="mt-1 border rounded w-full p-2" />
                    </label>

                    <div>
                        <h3 class="font-medium mb-2">Day Overrides</h3>
                        <div class="grid grid-cols-2 gap-2">
                            {#each allDays as day}
                                <div class="flex items-center justify-between border rounded p-2">
                                    <span class="capitalize">{day.toLowerCase()}</span>
                                    {#if storeData.dayOverrides[day] !== null}
                                        <input type="number" bind:value={storeData.dayOverrides[day]} class="border rounded p-1 w-20" />
                                        <button class="ml-2 text-red-500" on:click={() => (storeData.dayOverrides[day] = null)}>✕</button>
                                    {:else}
                                        <button class="text-blue-500" on:click={() => (storeData.dayOverrides[day] = 0)}>Add</button>
                                    {/if}
                                </div>
                            {/each}
                        </div>
                    </div>
                </div>

                <div class="mt-6">
                    <h3 class="font-medium mb-2">Date Overrides</h3>
                    {#each storeData.dateOverrides as override, idx}
                        <div class="flex gap-2 items-center mb-2">
                            <input type="date" bind:value={override.startDate} class="border rounded p-2" />
                            <span>to</span>
                            <input type="date" bind:value={override.endDate} class="border rounded p-2" />
                            <input type="number" bind:value={override.capacity} class="border rounded p-2 w-24" placeholder="Capacity" />
                            <button class="text-red-500" on:click={() => removeDateOverride(idx)}>✕</button>
                        </div>
                    {/each}
                    <button class="mt-2 bg-blue-500 text-white py-1 px-3 rounded" on:click={addDateOverride}>Add Date Override</button>
                </div>
            </section>

            <section class="bg-white p-6 rounded-lg shadow">
                <h2 class="text-2xl font-semibold mb-4">Manage Channel Capacities</h2>
                {#each channels as channel}
                    <div class="mb-4 border rounded">
                        <div class="bg-gray-100 p-4 cursor-pointer flex justify-between" on:click={() => toggleAccordion(channel)}>
                            <span>{channel}</span>
                            <span>{expandedChannel === channel ? '▲' : '▼'}</span>
                        </div>

                        {#if expandedChannel === channel}
                            <div class="p-4">
                                <div class="mb-4">
                                    <h4 class="font-medium mb-2">Day Overrides</h4>
                                    <div class="grid grid-cols-2 gap-2">
                                        {#each allDays as day}
                                            <div class="flex items-center justify-between border rounded p-2">
                                                <span class="capitalize">{day.toLowerCase()}</span>
                                                {#if storeData.channelOverrides[channel].dayOverrides[day] !== null}
                                                    <input type="number" min="0" max="100" bind:value={storeData.channelOverrides[channel].dayOverrides[day]} class="border rounded p-1 w-20" />
                                                    <button class="ml-2 text-red-500" on:click={() => (storeData.channelOverrides[channel].dayOverrides[day] = null)}>✕</button>
                                                {:else}
                                                    <button class="text-blue-500" on:click={() => (storeData.channelOverrides[channel].dayOverrides[day] = 0)}>Add</button>
                                                {/if}
                                            </div>
                                        {/each}
                                    </div>
                                </div>

                                <div>
                                    <h4 class="font-medium mb-2">Date Overrides</h4>
                                    {#each storeData.channelOverrides[channel].dateOverrides as override, idx}
                                        <div class="flex gap-2 items-center mb-2">
                                            <input type="date" bind:value={override.startDate} class="border rounded p-2" />
                                            <span>to</span>
                                            <input type="date" bind:value={override.endDate} class="border rounded p-2" />
                                            <input type="number" min="0" max="100" bind:value={override.percentage} class="border rounded p-2 w-24" placeholder="%" />
                                            <button class="text-red-500" on:click={() => removeChannelDateOverride(channel, idx)}>✕</button>
                                        </div>
                                    {/each}
                                    <button class="mt-2 bg-blue-500 text-white py-1 px-3 rounded" on:click={() => addChannelDateOverride(channel)}>Add Date Override</button>
                                </div>
                            </div>
                        {/if}
                    </div>
                {/each}
            </section>

            {#if errorMessage}
                <div class="mt-4 bg-red-100 text-red-700 p-3 rounded">{errorMessage}</div>
            {/if}

            <button class="mt-6 bg-green-500 text-white py-2 px-6 rounded" on:click={saveData}>Save Changes</button>
        {/if}
    {:else}
        <div class="text-center py-6">Loading...</div>
    {/if}
</div>