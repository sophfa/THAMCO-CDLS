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
    imageUrl: 'https://res.cloudinary.com/do7m4rqdz/image/upload/v1761991877/asus_tvpljk.jpg',
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
    imageUrl: 'https://res.cloudinary.com/do7m4rqdz/image/upload/v1761991878/dell_qydxla.jpg',
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
    imageUrl: 'https://res.cloudinary.com/do7m4rqdz/image/upload/v1761991878/hp_xyxmhb.jpg',
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
    imageUrl: 'https://res.cloudinary.com/do7m4rqdz/image/upload/v1761991879/lenovo_ydcyfz.jpg',
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
    processor: 'Apple A14 Bionic (6-core CPU, 4-core GPU, 16-core Neural Engine)',
    ram: '4 GB LPDDR4X',
    storage: '64 GB NVMe',
    gpu: 'Apple Integrated 4-core GPU',
    display: '10.9" Liquid Retina (2360x1640, 500 nits, True Tone)',
    os: 'iPadOS 17',
    batteryLife: 'Up to 10 hours (web/video)',
    weight: '477 g',
    ports: ['USB-C'],
    connectivity: ['Wi-Fi 6', 'Bluetooth 5.2'],
    cameras: {
      rear: '12 MP Wide f/1.8',
      front: '12 MP Ultra Wide (landscape orientation)',
      video: '4K at 60fps, 1080p HD at 120fps',
    },
    sensors: [
      'Touch ID (Top button)',
      'Accelerometer',
      'Ambient light sensor',
      'Barometer',
      'Gyroscope',
    ],
    accessories: ['Apple Pencil (1st Gen, via USB-C)', 'Magic Keyboard Folio'],
    description:
      'All-screen design iPad with A14 Bionic chip, landscape front camera, and Apple Pencil support.',
    imageUrl: 'https://res.cloudinary.com/do7m4rqdz/image/upload/v1761991878/ipad_hkp0n4.jpg',
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
    processor: 'Qualcomm Snapdragon 695 (Octa-core, 2.2GHz)',
    ram: '8 GB LPDDR4X',
    storage: '128 GB UFS 2.2',
    gpu: 'Adreno 619',
    display: '11" LCD (1920x1200, 90Hz refresh rate)',
    os: 'Android 14 (One UI 6)',
    batteryLife: 'Up to 12 hours',
    weight: '480 g',
    ports: ['USB-C', 'MicroSD slot (up to 1TB)'],
    connectivity: ['Wi-Fi 6', 'Bluetooth 5.1', 'Dolby Atmos'],
    cameras: {
      rear: '8 MP Auto Focus',
      front: '5 MP',
      video: '1080p at 30fps',
    },
    sensors: ['Accelerometer', 'Gyroscope', 'Ambient light sensor', 'GPS'],
    materials: ['Metal unibody', 'Glass front'],
    description:
      'Reliable Android tablet with 90Hz display, Dolby Atmos sound, and expandable storage up to 1TB.',
    imageUrl: 'https://res.cloudinary.com/do7m4rqdz/image/upload/v1761991878/galaxy-tab_nsuor2.jpg',
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
    gpu: 'Intel UHD Graphics 615',
    display: '10.5" PixelSense (1920x1280, 10-point multi-touch)',
    os: 'Windows 11 Home S Mode',
    batteryLife: 'Up to 11 hours',
    weight: '544 g',
    ports: ['USB-C', 'Surface Connect', 'Headphone Jack', 'MicroSDXC slot'],
    connectivity: ['Wi-Fi 6', 'Bluetooth 5.0'],
    cameras: {
      rear: '8 MP Auto Focus',
      front: '5 MP with Windows Hello IR login',
      video: '1080p HD',
    },
    materials: ['Magnesium alloy body', 'Corning Gorilla Glass 3 display'],
    accessories: ['Surface Pen', 'Type Cover keyboard', 'Surface Dock 2'],
    description:
      'Versatile 2-in-1 tablet with Windows performance, Surface Pen support, and detachable keyboard.',
    imageUrl: 'https://res.cloudinary.com/do7m4rqdz/image/upload/v1761991880/surface-go_pfwyge.jpg',
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
    processor: 'Octa-core 2.0GHz MediaTek MT8188J',
    ram: '4 GB LPDDR4X',
    storage: '64 GB (expandable up to 1TB via microSD)',
    gpu: 'ARM Mali-G57',
    display: '10.1" Full HD (1920x1200, 400 nits)',
    os: 'Fire OS 8 (Android 12)',
    batteryLife: 'Up to 13 hours',
    weight: '433 g',
    ports: ['USB-C', 'MicroSD slot'],
    connectivity: ['Wi-Fi 5', 'Bluetooth 5.0'],
    cameras: {
      rear: '5 MP',
      front: '5 MP',
      video: '1080p HD',
    },
    materials: ['Recycled plastic shell', 'Aluminium internal frame'],
    description:
      'Affordable entertainment tablet with Alexa integration, Full HD screen, and expandable storage.',
    imageUrl: 'https://res.cloudinary.com/do7m4rqdz/image/upload/v1761991878/firehd10_dsevct.jpg',
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
    imageProcessor: 'DIGIC 8',
    isoRange: '100–25600 (expandable to 51200)',
    lensMount: 'Canon EF/EF-S',
    display: '3" Vari-angle Touchscreen (1.04M dots)',
    video: '4K UHD at 25p, Full HD at 60p',
    autofocus: 'Dual Pixel CMOS AF with Eye Detection',
    batteryLife: 'Up to 1070 shots (CIPA)',
    weight: '449 g',
    connectivity: ['Wi-Fi', 'Bluetooth 4.1'],
    ports: ['HDMI Mini', 'USB 2.0', 'Mic input'],
    description:
      'Compact DSLR with 4K recording, vari-angle touchscreen, and advanced Dual Pixel Autofocus.',
    imageUrl: 'https://res.cloudinary.com/do7m4rqdz/image/upload/v1761991878/canon250d_cvtpka.jpg',
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
    imageProcessor: 'BIONZ X',
    lens: '24mm f/2.0 wide-angle fixed Zeiss lens',
    stabilization: 'Electronic Active Mode',
    display: '3" Vari-angle LCD Touchscreen',
    video: '4K UHD at 30p, Full HD at 120p',
    autofocus: 'Real-time Eye AF and tracking',
    batteryLife: 'Up to 80 mins continuous recording',
    weight: '229 g',
    connectivity: ['Wi-Fi', 'Bluetooth 4.2', 'USB-C'],
    ports: ['Micro HDMI', '3.5mm Mic input'],
    description:
      'Compact vlogging camera with flip screen, directional mic, 4K video, and fast hybrid autofocus.',
    imageUrl: 'https://res.cloudinary.com/do7m4rqdz/image/upload/v1761991880/sony-zv1f_fngejf.jpg',
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
    imageProcessor: 'EXPEED 6',
    isoRange: '100–51200',
    lensMount: 'Nikon Z mount',
    display: '3.2" Tilting Touchscreen (1.04M dots)',
    video: '4K UHD at 30p, 1080p at 120p slow motion',
    autofocus: '209-point Hybrid AF with Eye Detection',
    batteryLife: 'Up to 320 shots',
    weight: '450 g',
    connectivity: ['Wi-Fi', 'Bluetooth 4.2'],
    ports: ['Micro HDMI', 'USB Type-C', '3.5mm Mic'],
    description:
      'Lightweight mirrorless camera offering excellent low-light performance and 4K recording.',
    imageUrl: 'https://res.cloudinary.com/do7m4rqdz/image/upload/v1761991879/nikon-z50_lir8yh.jpg',
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
    processor: 'GP2 Processor',
    stabilization: 'HyperSmooth 5.0',
    video: '5.3K at 60fps, 4K at 120fps, 2.7K at 240fps',
    photo: 'RAW + HDR support',
    batteryLife: 'Up to 2 hours video',
    weight: '154 g',
    waterproof: 'Up to 10m (33ft) without housing',
    connectivity: ['Wi-Fi', 'Bluetooth', 'USB-C'],
    description:
      'Action camera built for adventure, with 5.3K recording, HDR photos, and next-gen HyperSmooth stabilisation.',
    imageUrl: 'https://res.cloudinary.com/do7m4rqdz/image/upload/v1761991878/gopro11_vzkqb4.jpg',
    price: 429.99,
    inStock: true,
    createdAt: '2025-10-27T12:55:00Z',
  },
];

async function seed() {
  const container = client.database(databaseId).container(containerId);

  console.log('🗑️  Clearing existing data...');
  const { resources } = await container.items.query('SELECT * FROM c').fetchAll();
  for (const item of resources) {
    try {
      await container.item(item.id, item.category).delete();
      console.log(`Deleted: ${item.id}`);
    } catch (error: any) {
      if (error.code !== 404) console.error(`Failed to delete ${item.id}:`, error.message);
    }
  }

  console.log('🌱 Seeding new data...');
  for (const product of products) {
    try {
      await container.items.upsert(product);
      console.log(`Seeded: ${product.id} (${product.category})`);
    } catch (error: any) {
      console.error(`Failed to seed ${product.id}:`, error.message);
    }
  }

  console.log('✅ Seeding complete.');
}

seed().catch(console.error);
