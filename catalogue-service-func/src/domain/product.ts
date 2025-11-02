// Product Domain Model - Pure Functional Approach with Category-Specific Properties

/**
 * Base product interface with common properties for all product types
 */
export interface Product {
  readonly id: string;
  readonly name: string;
  readonly brand: string;
  readonly category: string;
  readonly model: string;
  readonly processor: string;
  readonly ram: string;
  readonly storage: string;
  readonly gpu: string;
  readonly display: string;
  readonly os: string;
  readonly batteryLife: string;
  readonly weight: string;
  readonly ports: string[];
  readonly connectivity: string[];
  readonly description?: string;
  readonly imageUrl?: string;
  readonly price: number;
  readonly inStock: boolean;
  readonly createdAt: Date;

  // Cosmos DB metadata (optional for domain model, required for persistence)
  readonly _rid?: string;
  readonly _self?: string;
  readonly _etag?: string;
  readonly _attachments?: string;
  readonly _ts?: number;

  // Tablet-specific properties (optional)
  readonly cameras?: {
    readonly rear?: string;
    readonly front?: string;
    readonly video?: string;
  };
  readonly sensors?: string[];
  readonly materials?: string[];
  readonly accessories?: string[];

  // Camera-specific properties (optional)
  readonly sensor?: string;
  readonly imageProcessor?: string;
  readonly isoRange?: string;
  readonly lensMount?: string;
  readonly lens?: string;
  readonly stabilization?: string;
  readonly video?: string;
  readonly photo?: string;
  readonly waterproof?: string;
}

/**
 * Category-narrowed product variants
 */
export interface LaptopProduct extends Product {
  readonly category: "Laptop";
}

export interface TabletProduct extends Product {
  readonly category: "Tablet";
  readonly cameras?: {
    readonly rear?: string;
    readonly front?: string;
    readonly video?: string;
  };
  readonly sensors?: string[];
  readonly materials?: string[];
  readonly accessories?: string[];
}

export interface CameraProduct extends Product {
  readonly category: "Camera";
  readonly sensor?: string;
  readonly imageProcessor?: string;
  readonly isoRange?: string;
  readonly lensMount?: string;
  readonly lens?: string;
  readonly stabilization?: string;
  readonly video?: string;
  readonly photo?: string;
  readonly waterproof?: string;
}

/**
 * Union type for all category-specific products
 */
export type CategoryProduct = LaptopProduct | TabletProduct | CameraProduct;

/**
 * Type guards for product categories
 */
export function isTablet(product: Product): product is TabletProduct {
  return product?.category === "Tablet";
}

export function isCamera(product: Product): product is CameraProduct {
  return product?.category === "Camera";
}

export function isLaptop(product: Product): product is LaptopProduct {
  return product?.category === "Laptop";
}

/**
 * Input parameters for creating a Product with category-specific properties
 */
export interface CreateProductParams {
  readonly id: string;
  readonly name: string;
  readonly brand: string;
  readonly category: string;
  readonly model: string;
  readonly processor: string;
  readonly ram: string;
  readonly storage: string;
  readonly gpu: string;
  readonly display: string;
  readonly os: string;
  readonly batteryLife: string;
  readonly weight: string;
  readonly ports: string[];
  readonly connectivity: string[];
  readonly description?: string;
  readonly imageUrl?: string;
  readonly price: number;
  readonly inStock: boolean;
  readonly createdAt: Date;

  // Tablet-specific properties (optional)
  readonly cameras?: {
    readonly rear?: string;
    readonly front?: string;
    readonly video?: string;
  };
  readonly sensors?: string[];
  readonly materials?: string[];
  readonly accessories?: string[];

  // Camera-specific properties (optional)
  readonly sensor?: string;
  readonly imageProcessor?: string;
  readonly isoRange?: string;
  readonly lensMount?: string;
  readonly lens?: string;
  readonly stabilization?: string;
  readonly video?: string;
  readonly photo?: string;
  readonly waterproof?: string;
}

/**
 * Validation error type for product creation
 */
export interface ProductValidationError {
  readonly field: string;
  readonly message: string;
}

/**
 * Result type for product creation - Either success or validation errors
 */
export type ProductCreationResult =
  | { success: true; product: Product }
  | { success: false; errors: ProductValidationError[] };

/**
 * Validates a product name
 */
const validateName = (name: string): ProductValidationError[] => {
  const errors: ProductValidationError[] = [];

  if (!name || name.trim().length === 0) {
    errors.push({ field: 'name', message: 'Product name is required' });
  } else if (name.trim().length < 2) {
    errors.push({
      field: 'name',
      message: 'Product name must be at least 2 characters long',
    });
  } else if (name.trim().length > 100) {
    errors.push({
      field: 'name',
      message: 'Product name cannot exceed 100 characters',
    });
  }

  return errors;
};

/**
 * Validates a product price
 */
const validatePrice = (price: number): ProductValidationError[] => {
  const errors: ProductValidationError[] = [];

  if (typeof price !== 'number' || isNaN(price)) {
    errors.push({ field: 'price', message: 'Price must be a valid number' });
  } else if (price < 0) {
    errors.push({ field: 'price', message: 'Price cannot be negative' });
  } else if (price > 1000000) {
    errors.push({ field: 'price', message: 'Price cannot exceed 1,000,000' });
  }

  return errors;
};

/**
 * Validates a product ID
 */
const validateId = (id: string): ProductValidationError[] => {
  const errors: ProductValidationError[] = [];

  if (!id || id.trim().length === 0) {
    errors.push({ field: 'id', message: 'Product ID is required' });
  } else if (!/^[a-zA-Z0-9-_]+$/.test(id.trim())) {
    errors.push({
      field: 'id',
      message:
        'Product ID can only contain alphanumeric characters, hyphens, and underscores',
    });
  }

  return errors;
};

/**
 * Validates a product category
 */
const validateCategory = (category: string): ProductValidationError[] => {
  const errors: ProductValidationError[] = [];

  if (!category || category.trim().length === 0) {
    errors.push({ field: 'category', message: 'Product category is required' });
  } else if (category.trim().length < 2) {
    errors.push({
      field: 'category',
      message: 'Category must be at least 2 characters long',
    });
  }

  return errors;
};

/**
 * Validates optional description
 */
const validateDescription = (
  description?: string
): ProductValidationError[] => {
  const errors: ProductValidationError[] = [];

  if (description && description.length > 500) {
    errors.push({
      field: 'description',
      message: 'Description cannot exceed 500 characters',
    });
  }

  return errors;
};

/**
 * Combines all validation results including category-specific validation
 */
const validateProduct = (
  params: CreateProductParams
): ProductValidationError[] => {
  return [
    ...validateId(params.id),
    ...validateName(params.name),
    ...validatePrice(params.price),
    ...validateCategory(params.category),
    ...validateDescription(params.description),
    ...validateCategorySpecificProperties(params),
  ];
};

/**
 * Factory function to create a Product with validation and category-specific properties
 * Returns either a valid Product or validation errors
 */
export const createProduct = (
  params: CreateProductParams
): ProductCreationResult => {
  const errors = validateProduct(params);

  if (errors.length > 0) {
    return { success: false, errors };
  }

  const baseProduct = {
    id: params.id.trim(),
    name: params.name.trim(),
    brand: params.brand.trim(),
    category: params.category.trim(),
    model: params.model.trim(),
    processor: params.processor.trim(),
    ram: params.ram.trim(),
    storage: params.storage.trim(),
    gpu: params.gpu.trim(),
    display: params.display.trim(),
    os: params.os.trim(),
    batteryLife: params.batteryLife.trim(),
    weight: params.weight.trim(),
    ports: [...params.ports],
    connectivity: [...params.connectivity],
    description: params.description?.trim(),
    imageUrl: params.imageUrl?.trim(),
    price: params.price,
    inStock: params.inStock,
    createdAt: params.createdAt,
  };

  // Add category-specific properties based on product type
  const product: Product = {
    ...baseProduct,
    // Tablet-specific properties
    ...(params.cameras && { cameras: { ...params.cameras } }),
    ...(params.sensors && { sensors: [...params.sensors] }),
    ...(params.materials && { materials: [...params.materials] }),
    ...(params.accessories && { accessories: [...params.accessories] }),
    // Camera-specific properties
    ...(params.sensor && { sensor: params.sensor.trim() }),
    ...(params.imageProcessor && { imageProcessor: params.imageProcessor.trim() }),
    ...(params.isoRange && { isoRange: params.isoRange.trim() }),
    ...(params.lensMount && { lensMount: params.lensMount.trim() }),
    ...(params.lens && { lens: params.lens.trim() }),
    ...(params.stabilization && { stabilization: params.stabilization.trim() }),
    ...(params.video && { video: params.video.trim() }),
    ...(params.photo && { photo: params.photo.trim() }),
    ...(params.waterproof && { waterproof: params.waterproof.trim() }),
  };

  return { success: true, product };
};

/**
 * Pure function to update product price
 */
export const updateProductPrice = (
  product: Product,
  newPrice: number
): ProductCreationResult => {
  const priceErrors = validatePrice(newPrice);

  if (priceErrors.length > 0) {
    return { success: false, errors: priceErrors };
  }

  const updatedProduct: Product = {
    ...product,
    price: newPrice,
  };

  return { success: true, product: updatedProduct };
};

/**
 * Pure function to update product stock status
 */
export const updateProductStock = (
  product: Product,
  inStock: boolean
): Product => {
  return {
    ...product,
    inStock,
  };
};

/**
 * Pure function to check if product is available
 */
export const isProductAvailable = (product: Product): boolean => {
  return product.inStock && product.price > 0;
};

/**
 * Pure function to format product for display
 */
export const formatProductDisplay = (product: Product): string => {
  const stockStatus = product.inStock ? 'In Stock' : 'Out of Stock';
  const price = product.price.toFixed(2);

  return `${product.name} - $${price} (${stockStatus})`;
};

/**
 * Pure function to calculate discounted price
 */
export const calculateDiscountedPrice = (
  product: Product,
  discountPercent: number
): number => {
  if (discountPercent < 0 || discountPercent > 100) {
    throw new Error('Discount percentage must be between 0 and 100');
  }

  return product.price * (1 - discountPercent / 100);
};

/**
 * Helper function to get category-specific properties for display
 */
export const getCategorySpecificProperties = (product: Product): Record<string, any> => {
  if (isCamera(product)) {
    return {
      sensor: product.sensor,
      imageProcessor: product.imageProcessor,
      isoRange: product.isoRange,
      lensMount: product.lensMount,
      lens: product.lens,
      stabilization: product.stabilization,
      video: product.video,
      photo: product.photo,
      waterproof: product.waterproof,
    };
  }

  if (isTablet(product)) {
    return {
      cameras: product.cameras,
      sensors: product.sensors,
      materials: product.materials,
      accessories: product.accessories,
    };
  }

  // Laptop or unknown category - return empty object
  return {};
};

/**
 * Helper function to validate category-specific properties
 */
export const validateCategorySpecificProperties = (
  params: CreateProductParams
): ProductValidationError[] => {
  const errors: ProductValidationError[] = [];
  const category = params.category?.toLowerCase();

  // For cameras, some properties might be required
  if (category === 'camera') {
    if (params.sensor && params.sensor.trim().length > 100) {
      errors.push({
        field: 'sensor',
        message: 'Sensor description cannot exceed 100 characters',
      });
    }
  }

  // For tablets, validate arrays if provided
  if (category === 'tablet') {
    if (params.sensors && params.sensors.length > 20) {
      errors.push({
        field: 'sensors',
        message: 'Cannot have more than 20 sensors listed',
      });
    }
    if (params.accessories && params.accessories.length > 10) {
      errors.push({
        field: 'accessories',
        message: 'Cannot have more than 10 accessories listed',
      });
    }
  }

  return errors;
};
