import 'dotenv/config';
import { CosmosClient } from '@azure/cosmos';

const endpoint = process.env.COSMOS_ENDPOINT!;
const key = process.env.COSMOS_KEY!;
const databaseId = process.env.COSMOS_DATABASE || 'inventory-db';
const containerId = process.env.COSMOS_CONTAINER || 'Inventory';

const client = new CosmosClient({ endpoint, key });

async function seed() {
  const container = client.database(databaseId).container(containerId);
  const items = [
    { id: 'INV-001', deviceId: 'DEV-001', stock: 5, location: 'Main Campus' },
    { id: 'INV-002', deviceId: 'DEV-002', stock: 3, location: 'Library' },
    { id: 'INV-003', deviceId: 'DEV-003', stock: 2, location: 'Media Dept' },
    { id: 'INV-004', deviceId: 'DEV-004', stock: 6, location: 'IT Hub' },
  ];

  for (const item of items) {
    await container.items.upsert(item);
    console.log(`Seeded inventory for ${item.deviceId}`);
  }
  console.log('Inventory seeding complete.');
}

seed().catch(console.error);
