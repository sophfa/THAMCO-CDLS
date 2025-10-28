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
      loaned: true,
      userId: 'USR-101',
      waitlist: ['USR-202', 'USR-203'],
      lastLoanedDate: '2025-10-01T09:30:00Z',
    },
    {
      id: 'LOAN-002',
      deviceId: 'DEV-002',
      loaned: false,
      userId: null,
      waitlist: [],
      lastLoanedDate: '2025-09-20T12:00:00Z',
    },
    {
      id: 'LOAN-003',
      deviceId: 'DEV-003',
      loaned: true,
      userId: 'USR-104',
      waitlist: ['USR-301'],
      lastLoanedDate: '2025-10-10T15:45:00Z',
    },
    {
      id: 'LOAN-004',
      deviceId: 'DEV-004',
      loaned: false,
      userId: null,
      waitlist: ['USR-111'],
      lastLoanedDate: '2025-08-15T08:10:00Z',
    },
  ];

  for (const item of items) {
    await container.items.upsert(item);
    console.log(`Seeded loan record ${item.id}`);
  }
  console.log('Loans seeding complete.');
}

seed().catch(console.error);
