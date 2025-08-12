import { json } from '@sveltejs/kit';
import { CapacityEngine } from '$lib/capacity.js';

export async function GET({ params }) {
  const pharmacyId = parseInt(params.id);
  
  try {
    const capacityView = await CapacityEngine.getCapacityView(pharmacyId, 14);
    return json(capacityView);
  } catch (error) {
    console.error('Error fetching capacity view:', error);
    return json({ error: 'Failed to fetch capacity view' }, { status: 500 });
  }
}

export async function POST({ params, request }) {
  const pharmacyId = parseInt(params.id);
  const { action, amount, slotDate, slotTime } = await request.json();

  try {
    let result;

    switch (action) {
      case 'consume':
        result = await CapacityEngine.consumeCapacity(pharmacyId, amount, slotDate);
        break;
      
      case 'fulfill':
        if (!slotDate || !slotTime) {
          return json({ error: 'slotDate and slotTime required for fulfill action' }, { status: 400 });
        }
        result = await CapacityEngine.fulfillCapacity(pharmacyId, amount, slotDate, slotTime);
        break;
      
      case 'redistribute':
        await CapacityEngine.redistributeUnfulfilledCapacity(pharmacyId);
        result = { success: true, message: 'Capacity redistribution completed' };
        break;
      
      default:
        return json({ error: 'Invalid action' }, { status: 400 });
    }

    return json(result);
  } catch (error) {
    console.error('Error processing capacity operation:', error);
    return json({ error: 'Failed to process capacity operation' }, { status: 500 });
  }
}