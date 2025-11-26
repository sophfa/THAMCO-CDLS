// Inventory Domain Model

export interface Inventory {
  readonly id: string;
  readonly deviceIds: string[];
  readonly stock: number;
}

export interface CreateInventoryParams {
  readonly id: string;
  readonly deviceIds: string[];
  readonly stock: number;
}

export interface InventoryValidationError {
  readonly field: string;
  readonly message: string;
}

export type InventoryCreationResult =
  | { success: true; inventory: Inventory }
  | { success: false; errors: InventoryValidationError[] };

const validateId = (id: string): InventoryValidationError[] => {
  if (!id || id.trim().length === 0) {
    return [{ field: 'id', message: 'Inventory ID is required' }];
  }

  if (!/^[a-zA-Z0-9-_]+$/.test(id.trim())) {
    return [
      {
        field: 'id',
        message:
          'Inventory ID can only contain alphanumeric characters, hyphens, and underscores',
      },
    ];
  }

  return [];
};

const validateDeviceIds = (deviceIds: string[]): InventoryValidationError[] => {
  if (!Array.isArray(deviceIds) || deviceIds.length === 0) {
    return [{ field: 'deviceIds', message: 'At least one device ID is required' }];
  }

  const trimmed = deviceIds.map((id) => id?.trim()).filter(Boolean) as string[];

  const invalid = trimmed.filter((id) => !/^[a-zA-Z0-9-_]+$/.test(id));
  if (invalid.length > 0) {
    return [
      {
        field: 'deviceIds',
        message:
          'Each device ID can only contain alphanumeric characters, hyphens, and underscores',
      },
    ];
  }

  if (trimmed.length === 0) {
    return [{ field: 'deviceIds', message: 'At least one valid device ID is required' }];
  }

  return [];
};

const validateStock = (stock: number): InventoryValidationError[] => {
  if (stock === null || stock === undefined || Number.isNaN(stock)) {
    return [{ field: 'stock', message: 'Stock is required' }];
  }

  if (!Number.isInteger(stock) || stock < 0) {
    return [{ field: 'stock', message: 'Stock must be a non-negative integer' }];
  }

  return [];
};

const validateInventory = (params: CreateInventoryParams): InventoryValidationError[] => {
  return [
    ...validateId(params.id),
    ...validateDeviceIds(params.deviceIds),
    ...validateStock(params.stock),
  ];
};

export const createInventory = (params: CreateInventoryParams): InventoryCreationResult => {
  const errors = validateInventory(params);

  if (errors.length > 0) {
    return { success: false, errors };
  }

  const inventory: Inventory = {
    id: params.id.trim(),
    deviceIds: params.deviceIds.map((id) => id.trim()),
    stock: params.stock,
  };

  return { success: true, inventory };
};
