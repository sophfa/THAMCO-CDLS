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
      id: 'INV-001',
      deviceIds: ['PROD-001'],
      stock: 5,
      lastAdjustedAt: '2025-11-21T00:00:00Z',
      lastAdjustedBy: 'Sophie Feakes',
      lastAdjustmentReason: 'DAMAGED',
      lastAdjustmentRef: 'TICKET-1234',
    },

    {
      id: 'INV-002',
      deviceIds: ['PROD-002'],
      stock: 3,
      lastAdjustedAt: '2025-11-21T00:00:00Z',
      lastAdjustedBy: 'System',
      lastAdjustmentReason: 'INITIAL_LOAD',
      lastAdjustmentRef: 'SEED-INV-002',
    },
    {
      id: 'INV-003',
      deviceIds: ['PROD-003'],
      stock: 2,
      lastAdjustedAt: '2025-11-21T00:00:00Z',
      lastAdjustedBy: 'System',
      lastAdjustmentReason: 'INITIAL_LOAD',
      lastAdjustmentRef: 'SEED-INV-003',
    },
    {
      id: 'INV-004',
      deviceIds: ['PROD-004'],
      stock: 6,
      lastAdjustedAt: '2025-11-21T00:00:00Z',
      lastAdjustedBy: 'System',
      lastAdjustmentReason: 'INITIAL_LOAD',
      lastAdjustmentRef: 'SEED-INV-004',
    },
    {
      id: 'INV-005',
      deviceIds: ['PROD-005'],
      stock: 4,
      lastAdjustedAt: '2025-11-21T00:00:00Z',
      lastAdjustedBy: 'System',
      lastAdjustmentReason: 'INITIAL_LOAD',
      lastAdjustmentRef: 'SEED-INV-005',
    },
    {
      id: 'INV-006',
      deviceIds: ['PROD-006'],
      stock: 7,
      lastAdjustedAt: '2025-11-21T00:00:00Z',
      lastAdjustedBy: 'System',
      lastAdjustmentReason: 'INITIAL_LOAD',
      lastAdjustmentRef: 'SEED-INV-006',
    },
    {
      id: 'INV-007',
      deviceIds: ['PROD-007'],
      stock: 1,
      lastAdjustedAt: '2025-11-21T00:00:00Z',
      lastAdjustedBy: 'System',
      lastAdjustmentReason: 'INITIAL_LOAD',
      lastAdjustmentRef: 'SEED-INV-007',
    },
    {
      id: 'INV-008',
      deviceIds: ['PROD-008'],
      stock: 8,
      lastAdjustedAt: '2025-11-21T00:00:00Z',
      lastAdjustedBy: 'System',
      lastAdjustmentReason: 'INITIAL_LOAD',
      lastAdjustmentRef: 'SEED-INV-008',
    },
    {
      id: 'INV-009',
      deviceIds: ['PROD-009'],
      stock: 2,
      lastAdjustedAt: '2025-11-21T00:00:00Z',
      lastAdjustedBy: 'System',
      lastAdjustmentReason: 'INITIAL_LOAD',
      lastAdjustmentRef: 'SEED-INV-009',
    },
    {
      id: 'INV-010',
      deviceIds: ['PROD-010'],
      stock: 5,
      lastAdjustedAt: '2025-11-21T00:00:00Z',
      lastAdjustedBy: 'System',
      lastAdjustmentReason: 'INITIAL_LOAD',
      lastAdjustmentRef: 'SEED-INV-010',
    },
    {
      id: 'INV-011',
      deviceIds: ['PROD-011'],
      stock: 3,
      lastAdjustedAt: '2025-11-21T00:00:00Z',
      lastAdjustedBy: 'System',
      lastAdjustmentReason: 'INITIAL_LOAD',
      lastAdjustmentRef: 'SEED-INV-011',
    },
    {
      id: 'INV-012',
      deviceIds: ['PROD-012'],
      stock: 4,
      lastAdjustedAt: '2025-11-21T00:00:00Z',
      lastAdjustedBy: 'System',
      lastAdjustmentReason: 'INITIAL_LOAD',
      lastAdjustmentRef: 'SEED-INV-012',
    },
  ];

  for (const item of items) {
    await container.items.upsert(item);
    console.log(`Seeded inventory for ${item.deviceIds}`);
  }
  console.log('Inventory seeding complete.');
}

seed().catch(console.error);
