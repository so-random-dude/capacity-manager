export async function GET({ params }) {
    const { storeNumber } = params;

    // Mock data for demonstration
    const storeData = {
        'Store 1': {
            baseCapacity: 100,
            dayOverrides: { SUNDAY: 120, MONDAY: 110 },
            dateOverrides: [{ startDate: '2023-12-01', endDate: '2023-12-10', capacity: 150 }]
        },
        'Store 2': {
            baseCapacity: 200,
            dayOverrides: { TUESDAY: 180, WEDNESDAY: 190 },
            dateOverrides: [{ startDate: '2023-12-15', endDate: '2023-12-20', capacity: 250 }]
        }
    };

    if (storeData[storeNumber]) {
        return new Response(JSON.stringify(storeData[storeNumber]), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
    } else {
        return new Response(JSON.stringify({ error: 'Store not found' }), {
            status: 404,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

export async function POST({ params, request }) {
    const storeNumber = decodeURIComponent(params.storeNumber);
    const updatedData = await request.json();

    console.log(`Updated data for ${storeNumber}:`, updatedData);

    return new Response(JSON.stringify({ message: 'Data saved successfully!' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
    });
}