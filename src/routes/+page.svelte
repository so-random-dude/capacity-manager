<script>
    import { goto } from '$app/navigation';

    let storeNumber = '';
    let stores = ['Store 1', 'Store 2', 'Store 3']; // Example store list

    function handleGo() {
        if (storeNumber) {
            goto(`/store/${encodeURIComponent(storeNumber)}`);
        } else {
            alert('Please select a store.');
        }
    }
</script>

<div class="p-4">
    <h1 class="text-2xl font-bold mb-4">Select Store</h1>
    <label class="block mb-4">
        <span class="text-lg">Store Number:</span>
        <select bind:value={storeNumber} class="border p-2 rounded w-full">
            <option value="" disabled>Select a store</option>
            {#each stores as store}
                <option value={store}>{store}</option>
            {/each}
        </select>
    </label>
    <button class="bg-blue-500 text-white px-4 py-2 rounded" on:click={handleGo}>
        Go
    </button>
</div>