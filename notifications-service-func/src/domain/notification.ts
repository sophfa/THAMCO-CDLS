// Notification Domain Model - Pure Functional Approach

/**
 * Notification value object representing an immutable notification entity
 */
export interface Notification {
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
 * Input parameters for creating a Notification
 */
export interface CreateNotificationParams {
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
 * Validation error type for notification creation
 */
export interface NotificationValidationError {
  readonly field: string;
  readonly message: string;
}

/**
 * Result type for notification creation - Either success or validation errors
 */
export type NotificationCreationResult =
  | { success: true; notification: Notification }
  | { success: false; errors: NotificationValidationError[] };

/**
 * Validates a notification name
 */
const validateName = (name: string): NotificationValidationError[] => {
  const errors: NotificationValidationError[] = [];

  if (!name || name.trim().length === 0) {
    errors.push({ field: 'name', message: 'Notification name is required' });
  } else if (name.trim().length < 2) {
    errors.push({
      field: 'name',
      message: 'Notification name must be at least 2 characters long',
    });
  } else if (name.trim().length > 100) {
    errors.push({
      field: 'name',
      message: 'Notification name cannot exceed 100 characters',
    });
  }

  return errors;
};

/**
 * Validates a notification price
 */
const validatePrice = (price: number): NotificationValidationError[] => {
  const errors: NotificationValidationError[] = [];

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
 * Validates a notification ID
 */
const validateId = (id: string): NotificationValidationError[] => {
  const errors: NotificationValidationError[] = [];

  if (!id || id.trim().length === 0) {
    errors.push({ field: 'id', message: 'Notification ID is required' });
  } else if (!/^[a-zA-Z0-9-_]+$/.test(id.trim())) {
    errors.push({
      field: 'id',
      message:
        'Notification ID can only contain alphanumeric characters, hyphens, and underscores',
    });
  }

  return errors;
};

/**
 * Validates a notification category
 */
const validateCategory = (category: string): NotificationValidationError[] => {
  const errors: NotificationValidationError[] = [];

  if (!category || category.trim().length === 0) {
    errors.push({
      field: 'category',
      message: 'Notification category is required',
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
): NotificationValidationError[] => {
  const errors: NotificationValidationError[] = [];

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
const validateNotification = (
  params: CreateNotificationParams
): NotificationValidationError[] => {
  return [
    ...validateId(params.id),
    ...validateName(params.name),
    ...validatePrice(params.price),
    ...validateCategory(params.category),
    ...validateDescription(params.description),
  ];
};

/**
 * Factory function to create a Notification with validation
 * Returns either a valid Notification or validation errors
 */
export const createNotification = (
  params: CreateNotificationParams
): NotificationCreationResult => {
  const errors = validateNotification(params);

  if (errors.length > 0) {
    return { success: false, errors };
  }

  const notification: Notification = {
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

  return { success: true, notification };
};

/**
 * Pure function to update notification price
 */
export const updateNotificationPrice = (
  notification: Notification,
  newPrice: number
): NotificationCreationResult => {
  const priceErrors = validatePrice(newPrice);

  if (priceErrors.length > 0) {
    return { success: false, errors: priceErrors };
  }

  const updatedNotification: Notification = {
    ...notification,
    price: newPrice,
  };

  return { success: true, notification: updatedNotification };
};

/**
 * Pure function to update notification stock status
 */
export const updateNotificationStock = (
  notification: Notification,
  inStock: boolean
): Notification => {
  return {
    ...notification,
    inStock,
  };
};

/**
 * Pure function to check if notification is available
 */
export const isNotificationAvailable = (
  notification: Notification
): boolean => {
  return notification.inStock && notification.price > 0;
};

/**
 * Pure function to format notification for display
 */
export const formatNotificationDisplay = (
  notification: Notification
): string => {
  const stockStatus = notification.inStock ? 'In Stock' : 'Out of Stock';
  const price = notification.price.toFixed(2);

  return `${notification.name} - $${price} (${stockStatus})`;
};

/**
 * Pure function to calculate discounted price
 */
export const calculateDiscountedPrice = (
  notification: Notification,
  discountPercent: number
): number => {
  if (discountPercent < 0 || discountPercent > 100) {
    throw new Error('Discount percentage must be between 0 and 100');
  }

  return notification.price * (1 - discountPercent / 100);
};
