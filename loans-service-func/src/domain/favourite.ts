// Favourite Domain Model - Pure Functional Approach

/**
 * Favourite value object representing an immutable favourite entity
 */
export interface Favourite {
  readonly id: string;
  readonly deviceId: string;
  readonly userId: string;
  readonly addedAt: Date;
}

/**
 * Input parameters for creating a Favourite
 */
export interface CreateFavouriteParams {
  readonly id: string;
  readonly deviceId: string;
  readonly userId: string;
  readonly addedAt: Date;
}

/**
 * Validation error type for favourite creation
 */
export interface FavouriteValidationError {
  readonly field: string;
  readonly message: string;
}

/**
 * Result type for favourite creation - Either success or validation errors
 */
export type FavouriteCreationResult =
  | { success: true; favourite: Favourite }
  | { success: false; errors: FavouriteValidationError[] };

/**
 * Validates a favourite device ID
 */
const validateDeviceId = (deviceId: string): FavouriteValidationError[] => {
  const errors: FavouriteValidationError[] = [];

  if (!deviceId || deviceId.trim().length === 0) {
    errors.push({ field: "deviceId", message: "Device ID is required" });
  }

  return errors;
};

/**
 * Validates a favourite added date
 */
const validateAddedAt = (addedAt: Date): FavouriteValidationError[] => {
  const errors: FavouriteValidationError[] = [];

  if (!addedAt || isNaN(addedAt.getTime())) {
    errors.push({ field: "addedAt", message: "Added date is required" });
  }

  return errors;
};

/**
 * Validates a favourite device ID
 */
const validateId = (id: string): FavouriteValidationError[] => {
  const errors: FavouriteValidationError[] = [];

  if (!id || id.trim().length === 0) {
    errors.push({ field: "id", message: "ID is required" });
  } else if (!/^[a-zA-Z0-9-_]+$/.test(id.trim())) {
    errors.push({
      field: "id",
      message:
        "ID can only contain alphanumeric characters, hyphens, and underscores",
    });
  }

  return errors;
};
/**
 * Validates a user ID
 */
const validateUserId = (id: string): FavouriteValidationError[] => {
  const errors: FavouriteValidationError[] = [];

  if (!id || id.trim().length === 0) {
    errors.push({ field: "id", message: "User ID is required" });
  } else if (!/^[a-zA-Z0-9-_]+$/.test(id.trim())) {
    errors.push({
      field: "id",
      message:
        "User ID can only contain alphanumeric characters, hyphens, and underscores",
    });
  }

  return errors;
};

/**
 * Combines all validation results
 */
const validateFavourite = (
  params: CreateFavouriteParams
): FavouriteValidationError[] => {
  return [
    ...validateId(params.id),
    ...validateDeviceId(params.deviceId),
    ...validateUserId(params.userId),
    ...validateAddedAt(params.addedAt),
  ];
};

/**
 * Factory function to create a Favourite with validation
 * Returns either a valid Favourite or validation errors
 */
export const createFavourite = (
  params: CreateFavouriteParams
): FavouriteCreationResult => {
  const errors = validateFavourite(params);

  if (errors.length > 0) {
    return { success: false, errors };
  }

  const favourite: Favourite = {
    id: params.id.trim(),
    deviceId: params.deviceId,
    userId: params.userId,
    addedAt: params.addedAt,
  };

  return { success: true, favourite: favourite };
};
