// Shared application models and API helpers

export interface Loan {
  readonly id: string;
  readonly deviceId: string;
  readonly userId: string;
  readonly createdAt: Date | string;
  readonly from: Date | string;
  readonly till: Date | string;
  readonly status:
    | "Requested"
    | "Approved"
    | "Rejected"
    | "Collected"
    | "Returned";
}

export interface WaitlistEntry {
  id: string;
  deviceId: string;
  userId: string;
  position: number;
  joinedDate: string;
  estimatedAvailability?: string;
  deviceName?: string;
  deviceImage?: string;
}

export interface Product {
  id: string;
  name: string;
  brand: string;
  category: string;
  model: string;
  processor: string;
  ram: string;
  storage: string;
  gpu: string;
  display: string;
  os: string;
  batteryLife: string;
  weight: string;
  ports: string[];
  connectivity: string[];
  description: string;
  imageUrl: string;
  price: number;
  inStock: boolean;
  createdAt: string;
  _rid: string;
  _self: string;
  _etag: string;
  _attachments: string;
  _ts: number;

  // Tablet-specific (optional)
  cameras?: {
    rear?: string;
    front?: string;
    video?: string;
  };
  sensors?: string[];
  materials?: string[];
  accessories?: string[];

  // Camera-specific (optional)
  sensor?: string;
  imageProcessor?: string;
  isoRange?: string;
  lensMount?: string;
  lens?: string;
  stabilization?: string;
  video?: string;
  photo?: string;
  waterproof?: string;
}

// Category-narrowed variants
export interface LaptopProduct extends Product {
  category: "Laptop";
}

export interface TabletProduct extends Product {
  category: "Tablet";
  cameras?: {
    rear?: string;
    front?: string;
    video?: string;
  };
  sensors?: string[];
  materials?: string[];
  accessories?: string[];
}

export interface CameraProduct extends Product {
  category: "Camera";
  sensor?: string;
  imageProcessor?: string;
  isoRange?: string;
  lensMount?: string;
  lens?: string;
  stabilization?: string;
  video?: string;
  photo?: string;
  waterproof?: string;
}

// Type guards
export function isTablet(p: Product): p is TabletProduct {
  return p?.category === "Tablet";
}
export function isCamera(p: Product): p is CameraProduct {
  return p?.category === "Camera";
}
export function isLaptop(p: Product): p is LaptopProduct {
  return p?.category === "Laptop";
}

export type CategoryProduct = LaptopProduct | TabletProduct | CameraProduct;

export type ApiResponse<T> = { success?: boolean; data: T } | T;

export type LoanWithDeviceName = Loan & {
  deviceName: string;
  deviceImage?: string;
};

export interface Reservation {
  id: string;
  deviceId: string;
  userId: string;
  startDate: string; // ISO date
  endDate: string; // ISO date
  status: "reserved" | "collected" | "cancelled";
  createdAt?: string;
}

export type ReservationWithDeviceName = Reservation & {
  deviceName: string;
  deviceImage?: string;
};
