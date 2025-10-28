// Loan Domain Model - Pure Functional Approach

/**
 * Loan value object representing an immutable loan entity
 */
export interface Loan {
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
 * Input parameters for creating a Loan
 */
export interface CreateLoanParams {
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
 * Validation error type for loan creation
 */
export interface LoanValidationError {
  readonly field: string;
  readonly message: string;
}

/**
 * Result type for loan creation - Either success or validation errors
 */
export type LoanCreationResult =
  | { success: true; loan: Loan }
  | { success: false; errors: LoanValidationError[] };

/**
 * Validates a loan name
 */
const validateName = (name: string): LoanValidationError[] => {
  const errors: LoanValidationError[] = [];

  if (!name || name.trim().length === 0) {
    errors.push({ field: 'name', message: 'Loan name is required' });
  } else if (name.trim().length < 2) {
    errors.push({
      field: 'name',
      message: 'Loan name must be at least 2 characters long',
    });
  } else if (name.trim().length > 100) {
    errors.push({
      field: 'name',
      message: 'Loan name cannot exceed 100 characters',
    });
  }

  return errors;
};

/**
 * Validates a loan price
 */
const validatePrice = (price: number): LoanValidationError[] => {
  const errors: LoanValidationError[] = [];

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
 * Validates a loan ID
 */
const validateId = (id: string): LoanValidationError[] => {
  const errors: LoanValidationError[] = [];

  if (!id || id.trim().length === 0) {
    errors.push({ field: 'id', message: 'Loan ID is required' });
  } else if (!/^[a-zA-Z0-9-_]+$/.test(id.trim())) {
    errors.push({
      field: 'id',
      message:
        'Loan ID can only contain alphanumeric characters, hyphens, and underscores',
    });
  }

  return errors;
};

/**
 * Validates a loan category
 */
const validateCategory = (category: string): LoanValidationError[] => {
  const errors: LoanValidationError[] = [];

  if (!category || category.trim().length === 0) {
    errors.push({ field: 'category', message: 'Loan category is required' });
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
const validateDescription = (description?: string): LoanValidationError[] => {
  const errors: LoanValidationError[] = [];

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
const validateLoan = (params: CreateLoanParams): LoanValidationError[] => {
  return [
    ...validateId(params.id),
    ...validateName(params.name),
    ...validatePrice(params.price),
    ...validateCategory(params.category),
    ...validateDescription(params.description),
  ];
};

/**
 * Factory function to create a Loan with validation
 * Returns either a valid Loan or validation errors
 */
export const createLoan = (params: CreateLoanParams): LoanCreationResult => {
  const errors = validateLoan(params);

  if (errors.length > 0) {
    return { success: false, errors };
  }

  const loan: Loan = {
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

  return { success: true, loan };
};

/**
 * Pure function to update loan price
 */
export const updateLoanPrice = (
  loan: Loan,
  newPrice: number
): LoanCreationResult => {
  const priceErrors = validatePrice(newPrice);

  if (priceErrors.length > 0) {
    return { success: false, errors: priceErrors };
  }

  const updatedLoan: Loan = {
    ...loan,
    price: newPrice,
  };

  return { success: true, loan: updatedLoan };
};

/**
 * Pure function to update loan stock status
 */
export const updateLoanStock = (loan: Loan, inStock: boolean): Loan => {
  return {
    ...loan,
    inStock,
  };
};

/**
 * Pure function to check if loan is available
 */
export const isLoanAvailable = (loan: Loan): boolean => {
  return loan.inStock && loan.price > 0;
};

/**
 * Pure function to format loan for display
 */
export const formatLoanDisplay = (loan: Loan): string => {
  const stockStatus = loan.inStock ? 'In Stock' : 'Out of Stock';
  const price = loan.price.toFixed(2);

  return `${loan.name} - $${price} (${stockStatus})`;
};

/**
 * Pure function to calculate discounted price
 */
export const calculateDiscountedPrice = (
  loan: Loan,
  discountPercent: number
): number => {
  if (discountPercent < 0 || discountPercent > 100) {
    throw new Error('Discount percentage must be between 0 and 100');
  }

  return loan.price * (1 - discountPercent / 100);
};
