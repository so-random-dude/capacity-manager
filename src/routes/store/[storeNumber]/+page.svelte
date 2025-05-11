<script lang="ts">
    import { page } from '$app/stores';
    import { onMount } from 'svelte';

    let storeNumber: string;
    let storeData: {
        baseCapacity: number;
        dayOverrides: Record<string, number | null>;
        dateOverrides: { startDate: string; endDate: string; capacity: number }[];
        error?: string;
    } | null = null;

    const allDays = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
    let errorMessage = '';

    // Fetch store details on mount
    onMount(async () => {
        storeNumber = $page.params.storeNumber;

        const response = await fetch(`/api/store/${storeNumber}`);
        if (response.ok) {
            storeData = await response.json();

            // Ensure all days are initialized in dayOverrides
            storeData.dayOverrides = storeData.dayOverrides || {};
            allDays.forEach((day) => {
                if (!(day in storeData.dayOverrides)) {
                    storeData.dayOverrides[day] = null; // Default to "No Override"
                }
            });
        } else {
            storeData = { error: 'Store data not found.' };
        }
    });

        function addDateOverride() {
            if (storeData) {
                storeData.dateOverrides = [
                    ...storeData.dateOverrides,
                    { startDate: '', endDate: '', capacity: 0 }
                ];
            }
        }

    // Remove a date override
    function removeDateOverride(index: number) {
        if (storeData) {
            storeData.dateOverrides = storeData.dateOverrides.filter((_, i) => i !== index);
        }
    }

    // Validate for conflicting date ranges
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

    // Save updated data
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

<div class="p-4">
    <h1 class="text-2xl font-bold mb-4">Store Details: {storeNumber}</h1>

    {#if storeData}
        {#if storeData.error}
            <p class="text-red-500">{storeData.error}</p>
        {:else}
            <h2 class="text-xl font-semibold">Labor Capacity</h2>
            <label class="block mt-2">
                Base Capacity:
                <input type="number" bind:value={storeData.baseCapacity} class="border p-2 rounded w-full" />
            </label>

            <h3 class="text-lg font-semibold mt-4">Day Overrides:</h3>
            <ul>
                {#each allDays as day}
                    <li>
                        {day}:
                        {#if storeData.dayOverrides[day] !== null}
                            <input
                                    type="number"
                                    bind:value={storeData.dayOverrides[day]}
                                    class="border p-2 rounded"
                            />
                            <button
                                    class="bg-red-500 text-white px-2 py-1 rounded ml-2"
                                    on:click={() => (storeData.dayOverrides[day] = null)}
                            >
                                Remove
                            </button>
                        {:else}
                            <span>No Override</span>
                            <button
                                    class="bg-blue-500 text-white px-2 py-1 rounded ml-2"
                                    on:click={() => (storeData.dayOverrides[day] = 0)}
                            >
                                Add Override
                            </button>
                        {/if}
                    </li>
                {/each}
            </ul>

            <h3 class="text-lg font-semibold mt-4">Date Overrides:</h3>
            <ul>
                {#each storeData.dateOverrides as override, index}
                    <li>
                        <input
                                type="date"
                                bind:value={storeData.dateOverrides[index].startDate}
                                class="border p-2 rounded"
                        />
                        -
                        <input
                                type="date"
                                bind:value={storeData.dateOverrides[index].endDate}
                                class="border p-2 rounded"
                        />
                        Capacity:
                        <input
                                type="number"
                                bind:value={storeData.dateOverrides[index].capacity}
                                class="border p-2 rounded"
                        />
                        <button
                                class="bg-red-500 text-white px-2 py-1 rounded ml-2"
                                on:click={() => removeDateOverride(index)}
                        >
                            Delete
                        </button>
                    </li>
                {/each}
            </ul>
            <button
                    class="bg-blue-500 text-white px-4 py-2 rounded mt-2"
                    on:click={addDateOverride}
            >
                Add Date Override
            </button>

            {#if errorMessage}
                <p class="text-red-500 mt-2">{errorMessage}</p>
            {/if}

            <button
                    class="bg-green-500 text-white px-4 py-2 rounded mt-4"
                    on:click={saveData}
            >
                Save
            </button>
        {/if}
    {:else}
        <p>Loading...</p>
    {/if}
</div>