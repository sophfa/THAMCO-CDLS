// Add this line FIRST — it loads your .env file
import 'dotenv/config';
import { CosmosClient } from '@azure/cosmos';

// Read environment variables (now available thanks to dotenv)
const endpoint = process.env.COSMOS_ENDPOINT!;
const key = process.env.COSMOS_KEY!;
const databaseId = process.env.COSMOS_DATABASE || 'loans-db';
const containerId = process.env.COSMOS_CONTAINER || 'Loans';

const client = new CosmosClient({ endpoint, key });

async function seed() {
  const container = client.database(databaseId).container(containerId);
  const items = [
    {
      id: 'LOAN-001',
      deviceId: 'DEV-001',
      userId: 'USR-101',
      createdAt: '2025-09-28T09:30:00Z',
      from: '2025-10-01T09:30:00Z',
      till: '2025-10-10T17:00:00Z',
      status: 'Collected',
    },
    {
      id: 'LOAN-002',
      deviceId: 'DEV-002',
      userId: 'USR-000',
      createdAt: '2025-09-18T12:00:00Z',
      from: '2025-09-20T12:00:00Z',
      till: '2025-09-27T17:00:00Z',
      status: 'Returned',
    },
    {
      id: 'LOAN-003',
      deviceId: 'DEV-003',
      userId: 'USR-104',
      createdAt: '2025-10-08T15:00:00Z',
      from: '2025-10-10T15:45:00Z',
      till: '2025-10-20T10:00:00Z',
      status: 'Approved',
    },
    {
      id: 'LOAN-004',
      deviceId: 'DEV-004',
      userId: 'USR-111',
      createdAt: '2025-08-10T08:10:00Z',
      from: '2025-08-15T08:10:00Z',
      till: '2025-08-25T17:00:00Z',
      status: 'Rejected',
    },
  ];

  for (const item of items) {
    await container.items.upsert(item);
    console.log(`Seeded loan record ${item.id}`);
  }
  console.log('Loans seeding complete.');
}

seed().catch(console.error);
