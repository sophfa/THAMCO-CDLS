// Inventory Domain Model - Pure Functional Approach

/**
 * Inventory value object representing an immutable inventory entity
 */
export interface Inventory {
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
}

/**
 * Input parameters for creating a Inventory
 */
export interface CreateInventoryParams {
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
}

/**
 * Validation error type for inventory creation
 */
export interface InventoryValidationError {
  readonly field: string;
  readonly message: string;
}

/**
 * Result type for inventory creation - Either success or validation errors
 */
export type InventoryCreationResult =
  | { success: true; inventory: Inventory }
  | { success: false; errors: InventoryValidationError[] };

/**
 * Validates a inventory name
 */
const validateName = (name: string): InventoryValidationError[] => {
  const errors: InventoryValidationError[] = [];

  if (!name || name.trim().length === 0) {
    errors.push({ field: 'name', message: 'Inventory name is required' });
  } else if (name.trim().length < 2) {
    errors.push({
      field: 'name',
      message: 'Inventory name must be at least 2 characters long',
    });
  } else if (name.trim().length > 100) {
    errors.push({
      field: 'name',
      message: 'Inventory name cannot exceed 100 characters',
    });
  }

  return errors;
};

/**
 * Validates a inventory price
 */
const validatePrice = (price: number): InventoryValidationError[] => {
  const errors: InventoryValidationError[] = [];

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
 * Validates a inventory ID
 */
const validateId = (id: string): InventoryValidationError[] => {
  const errors: InventoryValidationError[] = [];

  if (!id || id.trim().length === 0) {
    errors.push({ field: 'id', message: 'Inventory ID is required' });
  } else if (!/^[a-zA-Z0-9-_]+$/.test(id.trim())) {
    errors.push({
      field: 'id',
      message:
        'Inventory ID can only contain alphanumeric characters, hyphens, and underscores',
    });
  }

  return errors;
};

/**
 * Validates a inventory category
 */
const validateCategory = (category: string): InventoryValidationError[] => {
  const errors: InventoryValidationError[] = [];

  if (!category || category.trim().length === 0) {
    errors.push({
      field: 'category',
      message: 'Inventory category is required',
    });
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
): InventoryValidationError[] => {
  const errors: InventoryValidationError[] = [];

  if (description && description.length > 500) {
    errors.push({
      field: 'description',
      message: 'Description cannot exceed 500 characters',
    });
  }

  return errors;
};

/**
 * Combines all validation results
 */
const validateInventory = (
  params: CreateInventoryParams
): InventoryValidationError[] => {
  return [
    ...validateId(params.id),
    ...validateName(params.name),
    ...validatePrice(params.price),
    ...validateCategory(params.category),
    ...validateDescription(params.description),
  ];
};

/**
 * Factory function to create a Inventory with validation
 * Returns either a valid Inventory or validation errors
 */
export const createInventory = (
  params: CreateInventoryParams
): InventoryCreationResult => {
  const errors = validateInventory(params);

  if (errors.length > 0) {
    return { success: false, errors };
  }

  const inventory: Inventory = {
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

  return { success: true, inventory };
};

/**
 * Pure function to update inventory price
 */
export const updateInventoryPrice = (
  inventory: Inventory,
  newPrice: number
): InventoryCreationResult => {
  const priceErrors = validatePrice(newPrice);

  if (priceErrors.length > 0) {
    return { success: false, errors: priceErrors };
  }

  const updatedInventory: Inventory = {
    ...inventory,
    price: newPrice,
  };

  return { success: true, inventory: updatedInventory };
};

/**
 * Pure function to update inventory stock status
 */
export const updateInventoryStock = (
  inventory: Inventory,
  inStock: boolean
): Inventory => {
  return {
    ...inventory,
    inStock,
  };
};

/**
 * Pure function to check if inventory is available
 */
export const isInventoryAvailable = (inventory: Inventory): boolean => {
  return inventory.inStock && inventory.price > 0;
};

/**
 * Pure function to format inventory for display
 */
export const formatInventoryDisplay = (inventory: Inventory): string => {
  const stockStatus = inventory.inStock ? 'In Stock' : 'Out of Stock';
  const price = inventory.price.toFixed(2);

  return `${inventory.name} - $${price} (${stockStatus})`;
};

/**
 * Pure function to calculate discounted price
 */
export const calculateDiscountedPrice = (
  inventory: Inventory,
  discountPercent: number
): number => {
  if (discountPercent < 0 || discountPercent > 100) {
    throw new Error('Discount percentage must be between 0 and 100');
  }

  return inventory.price * (1 - discountPercent / 100);
};
