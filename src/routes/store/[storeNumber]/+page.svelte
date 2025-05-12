<script lang="ts">
    import { page } from '$app/stores';
    import { onMount } from 'svelte';

    let showOverrides = false;
    let expandedChannels = [];
    let channelOverridesVisibility = {};
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

                <div class="flex items-center gap-4">
                    <label class="font-medium">Base Capacity:</label>
                    <input type="number" bind:value={storeData.baseCapacity} class="border rounded p-2 w-32" />
                </div>

                <div class="mt-6">
                    {#if Object.values(storeData.dayOverrides).some(value => value !== null)}
                        <button class="bg-blue-500 text-white py-1 px-3 rounded mb-4" on:click={() => showOverrides = !showOverrides}>
                            {showOverrides ? "Hide Not Overridden Days" : "Show Not Overridden Days"}
                        </button>

                        <table class="table-auto text-sm text-left rtl:text-right text-gray-500 dark:text-gray-400 ">
                            <thead class="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                            <tr>
                                <th scope="col" class="px-6 py-3 w-32">
                                    Day
                                </th>
                                <th scope="col" class="px-6 py-3">
                                    Capacity
                                </th>
                                <th scope="col" class="px-6 py-3">
                                    Action
                                </th>
                            </tr>
                            </thead>
                            <tbody>
                            {#each allDays as day}
                                {#if storeData.dayOverrides[day] !== null || showOverrides}
                                    <tr class="bg-white border-b dark:bg-gray-800 dark:border-gray-700 border-gray-200">
                                        <td class="p-2 capitalize">{day.toLowerCase()}</td>
                                        <td class="p-2">
                                            {#if storeData.dayOverrides[day] !== null}
                                                <input type="text" bind:value={storeData.dayOverrides[day]} class="border rounded p-1 w-24" />
                                            {:else}
                                                <span class="text-gray-500">No Override</span>
                                            {/if}
                                        </td>
                                        <td class="p-2">
                                            {#if storeData.dayOverrides[day] !== null}
                                                <button class="text-red-500" on:click={() => (storeData.dayOverrides[day] = null)}>Remove</button>
                                            {:else}
                                                <button class="text-blue-500" on:click={() => (storeData.dayOverrides[day] = 0)}>Add</button>
                                            {/if}
                                        </td>
                                    </tr>
                                {/if}
                            {/each}
                            </tbody>
                        </table>
                    {:else}
                        <button
                                class="bg-blue-500 text-white py-1 px-3 rounded"
                                on:click={() => {
                allDays.forEach(day => storeData.dayOverrides[day] = 0);
            }}
                        >
                            Add DAY Overrides
                        </button>
                    {/if}
                </div>
            </section>

            <section class="bg-white p-6 rounded-lg shadow">
                <h2 class="text-2xl font-semibold mb-4">Manage Channel Capacities</h2>
                {#each channels as channel}
                    <div class="mb-4 border rounded p-4">
                        <h3 class="text-xl font-semibold mb-2">{channel}</h3>

                        <div class="flex items-center gap-4 mb-4">
                            <label class="font-medium">Max Percentage:</label>
                            <input type="number" min="0" max="100" bind:value={storeData.channelOverrides[channel].maxPercentage} class="border rounded p-2 w-32" placeholder="%" />
                        </div>

                        <button class="bg-blue-500 text-white py-1 px-3 rounded mb-4" on:click={() => channelOverridesVisibility[channel] = !channelOverridesVisibility[channel]}>
                            {channelOverridesVisibility[channel] ? "Hide Not Overridden Days" : "Show Not Overridden Days"}
                        </button>

                        <table class="table-auto w-full border-collapse">
                            <thead>
                            <tr class="bg-gray-100">
                                <th class="border p-2">Day</th>
                                <th class="border p-2">Override Percentage</th>
                                <th class="border p-2">Action</th>
                            </tr>
                            </thead>
                            <tbody>
                            {#each allDays as day}
                                {#if storeData.channelOverrides[channel].dayOverrides[day] !== null || channelOverridesVisibility[channel]}
                                    <tr>
                                        <td class="border p-2 capitalize">{day.toLowerCase()}</td>
                                        <td class="border p-2">
                                            {#if storeData.channelOverrides[channel].dayOverrides[day] !== null}
                                                <input type="number" min="0" max="100" bind:value={storeData.channelOverrides[channel].dayOverrides[day]} class="border rounded p-1 w-24" />
                                            {:else}
                                                <span class="text-gray-500">No Override</span>
                                            {/if}
                                        </td>
                                        <td class="border p-2">
                                            {#if storeData.channelOverrides[channel].dayOverrides[day] !== null}
                                                <button class="text-red-500" on:click={() => (storeData.channelOverrides[channel].dayOverrides[day] = null)}>Remove</button>
                                            {:else}
                                                <button class="text-blue-500" on:click={() => (storeData.channelOverrides[channel].dayOverrides[day] = 0)}>Add</button>
                                            {/if}
                                        </td>
                                    </tr>
                                {/if}
                            {/each}
                            </tbody>
                        </table>
                    </div>
                {/each}
            </section>

            <button class="mt-6 bg-green-500 text-white py-2 px-6 rounded" on:click={saveData}>Save Changes</button>
        {/if}
    {:else}
        <div class="text-center py-6">Loading...</div>
    {/if}
</div>


