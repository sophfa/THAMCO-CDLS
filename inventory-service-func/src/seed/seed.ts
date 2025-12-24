import "dotenv/config";
import { CosmosClient } from "@azure/cosmos";
import { DefaultAzureCredential } from "@azure/identity";

const endpoint = process.env.COSMOS_ENDPOINT;
const databaseId = process.env.COSMOS_DATABASE;
const containerId = process.env.COSMOS_CONTAINER;

const client = new CosmosClient({
  endpoint,
  aadCredentials: new DefaultAzureCredential(),
});

async function seed() {
  const container = client.database(databaseId).container(containerId);
  const items = [
    {
      id: "PROD-001",
      deviceIds: ["INV-001", "INV-002", "INV-003", "INV-004", "INV-005"],
      stock: 5,
      lastAdjustedAt: "2025-11-21T00:00:00Z",
      lastAdjustedBy: "Sophie Feakes",
      lastAdjustmentReason: "DAMAGED",
      lastAdjustmentRef: "TICKET-1234",
    },

    {
      id: "PROD-002",
      deviceIds: ["INV-006", "INV-007", "INV-008"],
      stock: 3,
      lastAdjustedAt: "2025-11-21T00:00:00Z",
      lastAdjustedBy: "System",
      lastAdjustmentReason: "INITIAL_LOAD",
      lastAdjustmentRef: "SEED-PROD-002",
    },
    {
      id: "PROD-003",
      deviceIds: ["INV-009", "INV-010"],
      stock: 2,
      lastAdjustedAt: "2025-11-21T00:00:00Z",
      lastAdjustedBy: "System",
      lastAdjustmentReason: "INITIAL_LOAD",
      lastAdjustmentRef: "SEED-PROD-003",
    },
    {
      id: "PROD-004",
      deviceIds: [
        "INV-011",
        "INV-012",
        "INV-013",
        "INV-014",
        "INV-015",
        "INV-016",
      ],
      stock: 6,
      lastAdjustedAt: "2025-11-21T00:00:00Z",
      lastAdjustedBy: "System",
      lastAdjustmentReason: "INITIAL_LOAD",
      lastAdjustmentRef: "SEED-PROD-004",
    },
    {
      id: "PROD-005",
      deviceIds: ["INV-017", "INV-018", "INV-019", "INV-020"],
      stock: 4,
      lastAdjustedAt: "2025-11-21T00:00:00Z",
      lastAdjustedBy: "System",
      lastAdjustmentReason: "INITIAL_LOAD",
      lastAdjustmentRef: "SEED-PROD-005",
    },
    {
      id: "PROD-006",
      deviceIds: [
        "INV-021",
        "INV-022",
        "INV-023",
        "INV-024",
        "INV-025",
        "INV-026",
        "INV-027",
      ],
      stock: 7,
      lastAdjustedAt: "2025-11-21T00:00:00Z",
      lastAdjustedBy: "System",
      lastAdjustmentReason: "INITIAL_LOAD",
      lastAdjustmentRef: "SEED-PROD-006",
    },
    {
      id: "PROD-007",
      deviceIds: ["INV-028"],
      stock: 1,
      lastAdjustedAt: "2025-11-21T00:00:00Z",
      lastAdjustedBy: "System",
      lastAdjustmentReason: "INITIAL_LOAD",
      lastAdjustmentRef: "SEED-PROD-007",
    },
    {
      id: "PROD-008",
      deviceIds: [
        "INV-029",
        "INV-030",
        "INV-031",
        "INV-032",
        "INV-033",
        "INV-034",
        "INV-035",
        "INV-036",
      ],
      stock: 8,
      lastAdjustedAt: "2025-11-21T00:00:00Z",
      lastAdjustedBy: "System",
      lastAdjustmentReason: "INITIAL_LOAD",
      lastAdjustmentRef: "SEED-PROD-008",
    },
    {
      id: "PROD-009",
      deviceIds: ["INV-037", "INV-038"],
      stock: 2,
      lastAdjustedAt: "2025-11-21T00:00:00Z",
      lastAdjustedBy: "System",
      lastAdjustmentReason: "INITIAL_LOAD",
      lastAdjustmentRef: "SEED-PROD-009",
    },
    {
      id: "PROD-010",
      deviceIds: ["INV-039", "INV-040", "INV-041", "INV-042", "INV-043"],
      stock: 5,
      lastAdjustedAt: "2025-11-21T00:00:00Z",
      lastAdjustedBy: "System",
      lastAdjustmentReason: "INITIAL_LOAD",
      lastAdjustmentRef: "SEED-PROD-010",
    },
    {
      id: "PROD-011",
      deviceIds: ["INV-044", "INV-045", "INV-046"],
      stock: 3,
      lastAdjustedAt: "2025-11-21T00:00:00Z",
      lastAdjustedBy: "System",
      lastAdjustmentReason: "INITIAL_LOAD",
      lastAdjustmentRef: "SEED-PROD-011",
    },
    {
      id: "PROD-012",
      deviceIds: ["INV-047", "INV-048", "INV-049", "INV-050"],
      stock: 4,
      lastAdjustedAt: "2025-11-21T00:00:00Z",
      lastAdjustedBy: "System",
      lastAdjustmentReason: "INITIAL_LOAD",
      lastAdjustmentRef: "SEED-PROD-012",
    },
  ];

  for (const item of items) {
    await container.items.upsert(item);
    console.log(`Seeded inventory for ${item.deviceIds}`);
  }
  console.log("Inventory seeding complete.");
}

seed().catch(console.error);
