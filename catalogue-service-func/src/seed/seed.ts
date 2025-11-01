import { CosmosClient } from '@azure/cosmos';
import 'dotenv/config';

const endpoint = process.env.COSMOS_ENDPOINT!;
const key = process.env.COSMOS_KEY!;
const client = new CosmosClient({ endpoint, key });

const databaseId = 'catalogue-db';
const containerId = 'Devices';

const products = [
  // ====== LAPTOPS ======
  {
    id: 'PROD-001',
    name: 'ASUS Chromebook 15 CX1505CKA',
    brand: 'ASUS',
    category: 'Laptop',
    model: 'CX1505CKA-EJ0034',
    processor: 'Intel Celeron N4500 (2 cores, up to 2.8GHz)',
    ram: '4 GB LPDDR4',
    storage: '64 GB eMMC',
    gpu: 'Intel UHD Graphics',
    display: '15.6" Full HD (1920x1080)',
    os: 'Chrome OS',
    batteryLife: 'Up to 10 hours',
    weight: '1.8 kg',
    ports: ['USB-C', 'USB-A', 'microSD', 'Headphone Jack'],
    connectivity: ['Wi-Fi 5', 'Bluetooth 4.2'],
    description:
      'Lightweight Chromebook with full HD display, ideal for study and browsing.',
    imageUrl: 'asus.jpg',
    price: 229.99,
    inStock: true,
    createdAt: '2025-10-27T12:00:00Z',
  },
  {
    id: 'PROD-002',
    name: 'Dell Latitude 5400',
    brand: 'Dell',
    category: 'Laptop',
    model: 'Latitude 5400 i5-8365U',
    processor: 'Intel Core i5-8365U (Quad-core, 1.6GHz up to 4.1GHz)',
    ram: '16 GB DDR4',
    storage: '512 GB SSD',
    gpu: 'Intel UHD Graphics 620',
    display: '14" Full HD (1920x1080)',
    os: 'Windows 11 Pro',
    batteryLife: 'Up to 13 hours',
    weight: '1.6 kg',
    ports: ['USB-C', 'USB 3.1', 'HDMI', 'Ethernet', 'Audio Jack', 'microSD'],
    connectivity: ['Wi-Fi 6', 'Bluetooth 5.0'],
    description:
      'Reliable business laptop, renewed edition with fast SSD storage and Windows 11 Pro.',
    imageUrl: 'dell.jpg',
    price: 479.0,
    inStock: false,
    createdAt: '2025-10-27T12:05:00Z',
  },
  {
    id: 'PROD-003',
    name: 'HP Stream 14s-dq0000sa',
    brand: 'HP',
    category: 'Laptop',
    model: '14s-dq0000sa',
    processor: 'Intel Celeron N4120 (Quad-core, 1.1GHz up to 2.6GHz)',
    ram: '4 GB DDR4',
    storage: '64 GB eMMC',
    gpu: 'Intel UHD Graphics 600',
    display: '14" HD (1366x768)',
    os: 'Windows 11 Home S Mode',
    batteryLife: 'Up to 9 hours',
    weight: '1.47 kg',
    ports: ['USB-C', 'USB 3.1', 'HDMI', 'Headphone Jack'],
    connectivity: ['Wi-Fi 5', 'Bluetooth 4.2'],
    description:
      'Affordable laptop for students with free 12-month Microsoft 365 subscription.',
    imageUrl: 'hp.jpg',
    price: 199.0,
    inStock: true,
    createdAt: '2025-10-27T12:10:00Z',
  },
  {
    id: 'PROD-004',
    name: 'Lenovo V15 ADA',
    brand: 'Lenovo',
    category: 'Laptop',
    model: '82C7000BUK',
    processor: 'AMD Athlon Silver 3150U (Dual-core, up to 3.3GHz)',
    ram: '8 GB DDR4',
    storage: '256 GB SSD',
    gpu: 'AMD Radeon Graphics',
    display: '15.6" Full HD (1920x1080)',
    os: 'Windows 10 Home',
    batteryLife: 'Up to 7.5 hours',
    weight: '1.85 kg',
    ports: ['USB 3.1', 'USB 2.0', 'HDMI', 'Audio Jack'],
    connectivity: ['Wi-Fi 5', 'Bluetooth 5.0'],
    description:
      'Full HD laptop offering solid performance for everyday work and study tasks.',
    imageUrl: 'lenovo.jpg',
    price: 299.0,
    inStock: true,
    createdAt: '2025-10-27T12:15:00Z',
  },

  // ====== TABLETS ======
  {
    id: 'PROD-005',
    name: 'Apple iPad 10.9 (2022)',
    brand: 'Apple',
    category: 'Tablet',
    model: 'A2696',
    processor: 'Apple A14 Bionic',
    ram: '4 GB',
    storage: '64 GB',
    display: '10.9" Liquid Retina (2360x1640)',
    os: 'iPadOS 17',
    batteryLife: 'Up to 10 hours',
    weight: '477 g',
    ports: ['USB-C'],
    connectivity: ['Wi-Fi 6', 'Bluetooth 5.2'],
    description:
      'All-screen design iPad with A14 Bionic chip and vibrant Liquid Retina display.',
    imageUrl: 'ipad.jpg',
    price: 499.99,
    inStock: true,
    createdAt: '2025-10-27T12:20:00Z',
  },
  {
    id: 'PROD-006',
    name: 'Samsung Galaxy Tab A9+',
    brand: 'Samsung',
    category: 'Tablet',
    model: 'SM-X210',
    processor: 'Snapdragon 695 (Octa-core)',
    ram: '8 GB',
    storage: '128 GB',
    display: '11" LCD (1920x1200)',
    os: 'Android 14',
    batteryLife: 'Up to 12 hours',
    weight: '480 g',
    ports: ['USB-C', 'MicroSD'],
    connectivity: ['Wi-Fi 6', 'Bluetooth 5.1'],
    description:
      'Reliable Android tablet with a large display, ideal for study and entertainment.',
    imageUrl: 'galaxy-tab.jpg',
    price: 279.99,
    inStock: true,
    createdAt: '2025-10-27T12:25:00Z',
  },
  {
    id: 'PROD-007',
    name: 'Microsoft Surface Go 3',
    brand: 'Microsoft',
    category: 'Tablet',
    model: '1926',
    processor: 'Intel Pentium Gold 6500Y (Dual-core, up to 3.4GHz)',
    ram: '8 GB LPDDR3',
    storage: '128 GB SSD',
    display: '10.5" PixelSense (1920x1280)',
    os: 'Windows 11 Home S Mode',
    batteryLife: 'Up to 11 hours',
    weight: '544 g',
    ports: ['USB-C', 'Surface Connect', 'Headphone Jack', 'MicroSDXC'],
    connectivity: ['Wi-Fi 6', 'Bluetooth 5.0'],
    description:
      'Versatile 2-in-1 device combining tablet portability with Windows performance.',
    imageUrl: 'surface-go.jpg',
    price: 389.99,
    inStock: true,
    createdAt: '2025-10-27T12:30:00Z',
  },
  {
    id: 'PROD-008',
    name: 'Amazon Fire HD 10 (2023)',
    brand: 'Amazon',
    category: 'Tablet',
    model: 'Fire HD 10 (13th Gen)',
    processor: 'Octa-core 2.0GHz',
    ram: '4 GB',
    storage: '64 GB',
    display: '10.1" Full HD (1920x1200)',
    os: 'Fire OS 8 (Android 12)',
    batteryLife: 'Up to 13 hours',
    weight: '433 g',
    ports: ['USB-C'],
    connectivity: ['Wi-Fi 5', 'Bluetooth 5.0'],
    description:
      'Affordable entertainment tablet with Alexa integration and Full HD display.',
    imageUrl: 'firehd10.jpg',
    price: 179.99,
    inStock: true,
    createdAt: '2025-10-27T12:35:00Z',
  },

  // ====== CAMERAS ======
  {
    id: 'PROD-009',
    name: 'Canon EOS 250D DSLR Camera',
    brand: 'Canon',
    category: 'Camera',
    model: 'EOS 250D',
    sensor: '24.1 MP APS-C CMOS',
    lensMount: 'EF/EF-S',
    display: '3" Vari-angle Touchscreen',
    video: '4K UHD at 25p',
    batteryLife: 'Up to 1070 shots',
    weight: '449 g',
    connectivity: ['Wi-Fi', 'Bluetooth'],
    description:
      'Compact DSLR with 4K recording and Dual Pixel Autofocus, perfect for photography students.',
    imageUrl: 'canon250d.jpg',
    price: 599.99,
    inStock: true,
    createdAt: '2025-10-27T12:40:00Z',
  },
  {
    id: 'PROD-010',
    name: 'Sony ZV-1F Vlogging Camera',
    brand: 'Sony',
    category: 'Camera',
    model: 'ZV-1F',
    sensor: '20.1 MP 1.0-type Exmor RS CMOS',
    lens: '24mm f/2.0 wide-angle fixed',
    video: '4K UHD at 30p',
    batteryLife: 'Up to 80 mins video',
    weight: '229 g',
    connectivity: ['Wi-Fi', 'Bluetooth', 'USB-C'],
    description:
      'Compact vlogging camera with flip screen, 4K video, and strong autofocus performance.',
    imageUrl: 'sony-zv1f.jpg',
    price: 499.99,
    inStock: true,
    createdAt: '2025-10-27T12:45:00Z',
  },
  {
    id: 'PROD-011',
    name: 'Nikon Z50 Mirrorless Camera',
    brand: 'Nikon',
    category: 'Camera',
    model: 'Z50 Kit',
    sensor: '20.9 MP DX CMOS',
    lensMount: 'Nikon Z mount',
    display: '3.2" Tilting Touchscreen',
    video: '4K UHD at 30p',
    batteryLife: 'Up to 320 shots',
    weight: '450 g',
    connectivity: ['Wi-Fi', 'Bluetooth'],
    description:
      'Lightweight mirrorless camera offering excellent image quality and low-light performance.',
    imageUrl: 'nikon-z50.jpg',
    price: 649.99,
    inStock: true,
    createdAt: '2025-10-27T12:50:00Z',
  },
  {
    id: 'PROD-012',
    name: 'GoPro HERO11 Black',
    brand: 'GoPro',
    category: 'Camera',
    model: 'HERO11 Black',
    sensor: '27 MP 1/1.9" CMOS',
    video: '5.3K at 60fps, 4K at 120fps',
    batteryLife: 'Up to 2 hours video',
    weight: '154 g',
    connectivity: ['Wi-Fi', 'Bluetooth'],
    description:
      'Action camera built for adventure, with stunning 5.3K recording and advanced stabilisation.',
    imageUrl: 'gopro11.jpg',
    price: 429.99,
    inStock: true,
    createdAt: '2025-10-27T12:55:00Z',
  },
];

async function seed() {
  const container = client.database(databaseId).container(containerId);

  // Clear existing items
  console.log('🗑️  Clearing existing data...');
  const { resources } = await container.items.query('SELECT * FROM c').fetchAll();
  for (const item of resources) {
    try {
      await container.item(item.id, item.category).delete();
      console.log(`Deleted: ${item.id}`);
    } catch (error: any) {
      if (error.code !== 404) {
        console.error(`Failed to delete ${item.id}:`, error.message);
        throw error;
      }
      // Ignore 404 errors (item already deleted)
    }
  }

  // Insert seed data
  console.log('🌱 Seeding new data...');
  for (const product of products) {
    try {
      await container.items.upsert(product);
      console.log(`Seeded: ${product.id} (${product.category})`);
    } catch (error: any) {
      console.error(`Failed to seed ${product.id}:`, error.message);
      throw error;
    }
  }

  console.log('✅ Seeding complete.');
}

seed().catch(console.error);
