import 'dotenv/config';
import { CosmosClient } from '@azure/cosmos';

const endpoint = process.env.COSMOS_ENDPOINT!;
const key = process.env.COSMOS_KEY!;
const databaseId = process.env.COSMOS_DATABASE;
const containerId = process.env.COSMOS_CONTAINER;

const client = new CosmosClient({ endpoint, key });

async function seed() {
  const container = client.database(databaseId).container(containerId);
  const items = [
    {
      id: 'NOTIF-001',
      userId: 'USR-101',
      message: 'Your device loan (DEV-001) has been approved.',
      type: 'Loan Confirmation',
      sentAt: '2025-10-01T09:35:00Z',
    },
    {
      id: 'NOTIF-002',
      userId: 'USR-202',
      message: 'Device DEV-001 is now available for loan.',
      type: 'Waitlist Notification',
      sentAt: '2025-10-05T12:20:00Z',
    },
    {
      id: 'NOTIF-003',
      userId: 'USR-104',
      message: 'Please return your device DEV-003 by the due date.',
      type: 'Reminder',
      sentAt: '2025-10-12T08:00:00Z',
    },
  ];

  for (const item of items) {
    await container.items.upsert(item);
    console.log(`Seeded notification ${item.id}`);
  }
  console.log('Notifications seeding complete.');
}

seed().catch(console.error);
