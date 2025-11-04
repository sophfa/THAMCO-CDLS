/**
 * Notification Domain Model with type-specific payloads and messages.
 */

export const NOTIFICATION_TYPES = [
  'Reservation',
  'Accepted',
  'Rejected',
  'Cancelled',
  'Collected',
  'Returned',
  'Waitlist',
  'Custom',
] as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export interface ReservationPayload {
  readonly deviceName: string;
  readonly from: string;
  readonly till: string;
  readonly location?: string;
  readonly notes?: string;
}

export interface AcceptedPayload extends ReservationPayload {
  readonly approvedBy?: string;
  readonly approvedAt?: string;
}

export interface RejectedPayload extends ReservationPayload {
  readonly reason: string;
}

export interface CancelledPayload extends ReservationPayload {
  readonly cancelledBy?: string;
  readonly reason?: string;
}

export interface CollectedPayload extends ReservationPayload {
  readonly collectedAt?: string;
}

export interface ReturnedPayload extends ReservationPayload {
  readonly returnedAt?: string;
  readonly condition?: string;
}

export interface WaitlistPayload {
  readonly deviceName: string;
  readonly requestedFrom: string;
  readonly requestedTill: string;
  readonly position: number;
}

export interface CustomPayload {
  readonly subject?: string;
  readonly message: string;
  readonly metadata?: Record<string, unknown>;
}

export type NotificationPayloadMap = {
  Reservation: ReservationPayload;
  Accepted: AcceptedPayload;
  Rejected: RejectedPayload;
  Cancelled: CancelledPayload;
  Collected: CollectedPayload;
  Returned: ReturnedPayload;
  Waitlist: WaitlistPayload;
  Custom: CustomPayload;
};

export type NotificationPayload<T extends NotificationType = NotificationType> =
  NotificationPayloadMap[T];

export interface Notification<T extends NotificationType = NotificationType> {
  readonly id: string;
  readonly userId: string;
  readonly type: T;
  readonly message: string;
  readonly payload: NotificationPayloadMap[T];
  readonly createdAt: string;
}

export interface CreateNotificationParams<
  T extends NotificationType = NotificationType,
> {
  readonly id?: string;
  readonly userId: string;
  readonly type: T;
  readonly payload: NotificationPayloadMap[T];
  readonly message?: string;
  readonly createdAt?: string | Date;
}

export interface NotificationValidationError {
  readonly field: string;
  readonly message: string;
}

export type NotificationCreationResult<
  T extends NotificationType = NotificationType,
> =
  | { success: true; notification: Notification<T> }
  | { success: false; errors: NotificationValidationError[] };

export const createNotification = <T extends NotificationType>(
  params: CreateNotificationParams<T>,
): NotificationCreationResult<T> => {
  const errors = validateParams(params);

  if (errors.length > 0) {
    return { success: false, errors };
  }

  const createdAt = normalizeCreatedAt(params.createdAt);
  const message = params.message ?? buildMessage(params.type, params.payload);

  const notification: Notification<T> = {
    id: params.id?.trim() || generateNotificationId(),
    userId: params.userId.trim(),
    type: params.type,
    message,
    payload: normalizePayload(params.type, params.payload),
    createdAt,
  };

  return { success: true, notification };
};

const validateParams = <T extends NotificationType>(
  params: CreateNotificationParams<T>,
): NotificationValidationError[] => {
  const errors: NotificationValidationError[] = [];

  errors.push(...validateUserId(params.userId));

  if (!NOTIFICATION_TYPES.includes(params.type)) {
    errors.push({
      field: 'type',
      message: `Notification type must be one of: ${NOTIFICATION_TYPES.join(', ')}`,
    });
  }

  errors.push(...validatePayload(params.type, params.payload));

  if (params.message !== undefined && typeof params.message !== 'string') {
    errors.push({ field: 'message', message: 'message must be a string' });
  }

  if (params.id !== undefined) {
    const idErrors = validateId(params.id);
    errors.push(...idErrors);
  }

  if (params.createdAt !== undefined) {
    const createdAt = toDate(params.createdAt);
    if (!createdAt) {
      errors.push({
        field: 'createdAt',
        message: 'createdAt must be a valid ISO date string or Date',
      });
    }
  }

  return errors;
};

const validateUserId = (userId: string): NotificationValidationError[] => {
  const errors: NotificationValidationError[] = [];

  if (!userId || userId.trim().length === 0) {
    errors.push({ field: 'userId', message: 'userId is required' });
    return errors;
  }

  // Allow Auth0-style subject IDs like "auth0|..." by including the pipe character
  if (!/^[a-zA-Z0-9-_.@|]+$/.test(userId.trim())) {
    errors.push({
      field: 'userId',
      message:
        'userId can only contain alphanumeric characters, hyphens, underscores, periods, and @',
    });
  }

  return errors;
};

const validateId = (id: string): NotificationValidationError[] => {
  const errors: NotificationValidationError[] = [];

  if (!/^[A-Za-z0-9-_]{3,120}$/.test(id.trim())) {
    errors.push({
      field: 'id',
      message: 'id must be 3-120 characters using alphanumeric, hyphen, or underscore',
    });
  }

  return errors;
};

const validatePayload = <T extends NotificationType>(
  type: T,
  payload: NotificationPayloadMap[T],
): NotificationValidationError[] => {
  const errors: NotificationValidationError[] = [];

  if (!payload || typeof payload !== 'object') {
    errors.push({ field: 'payload', message: 'payload is required' });
    return errors;
  }

  switch (type) {
    case 'Reservation':
    case 'Accepted':
    case 'Rejected':
    case 'Cancelled':
    case 'Collected':
    case 'Returned': {
      const base = payload as ReservationPayload;
      errors.push(...validateRequiredString(base.deviceName, 'payload.deviceName', 2, 160));
      errors.push(...validateRequiredDate(base.from, 'payload.from'));
      errors.push(...validateRequiredDate(base.till, 'payload.till'));
      errors.push(...validateOptionalString(base.location, 'payload.location', 160));
      errors.push(...validateOptionalString(base.notes, 'payload.notes', 500));

      if (type === 'Rejected') {
        const rejected = payload as RejectedPayload;
        errors.push(...validateRequiredString(rejected.reason, 'payload.reason', 3, 500));
      }

      if (type === 'Cancelled') {
        const cancelled = payload as CancelledPayload;
        errors.push(...validateOptionalString(cancelled.cancelledBy, 'payload.cancelledBy', 160));
        errors.push(...validateOptionalString(cancelled.reason, 'payload.reason', 500));
      }

      if (type === 'Accepted') {
        const accepted = payload as AcceptedPayload;
        errors.push(...validateOptionalString(accepted.approvedBy, 'payload.approvedBy', 160));
        errors.push(...validateOptionalDate(accepted.approvedAt, 'payload.approvedAt'));
      }

      if (type === 'Collected') {
        const collected = payload as CollectedPayload;
        errors.push(...validateOptionalDate(collected.collectedAt, 'payload.collectedAt'));
      }

      if (type === 'Returned') {
        const returned = payload as ReturnedPayload;
        errors.push(...validateOptionalDate(returned.returnedAt, 'payload.returnedAt'));
        errors.push(...validateOptionalString(returned.condition, 'payload.condition', 200));
      }

      break;
    }
    case 'Waitlist': {
      const waitlist = payload as WaitlistPayload;
      errors.push(
        ...validateRequiredString(waitlist.deviceName, 'payload.deviceName', 2, 160),
      );
      errors.push(
        ...validateOptionalDate(waitlist.requestedFrom, 'payload.requestedFrom'),
      );
      errors.push(
        ...validateOptionalDate(waitlist.requestedTill, 'payload.requestedTill'),
      );
      if (typeof waitlist.position !== 'number' || waitlist.position < 1) {
        errors.push({ field: 'payload.position', message: 'payload.position must be a positive number' });
      }
      break;
    }
    case 'Custom': {
      const custom = payload as CustomPayload;
      errors.push(...validateRequiredString(custom.message, 'payload.message', 3, 2000));
      errors.push(...validateOptionalString(custom.subject, 'payload.subject', 160));
      if (custom.metadata && typeof custom.metadata !== 'object') {
        errors.push({ field: 'payload.metadata', message: 'payload.metadata must be an object' });
      }
      break;
    }
    default:
      break;
  }

  return errors.filter(Boolean);
};

const validateRequiredString = (
  value: unknown,
  field: string,
  min: number,
  max: number,
): NotificationValidationError[] => {
  if (typeof value !== 'string') {
    return [{ field, message: `${field} must be a string` }];
  }

  const trimmed = value.trim();

  if (trimmed.length < min) {
    return [{ field, message: `${field} must be at least ${min} characters` }];
  }

  if (trimmed.length > max) {
    return [{ field, message: `${field} cannot exceed ${max} characters` }];
  }

  return [];
};

const validateOptionalString = (
  value: unknown,
  field: string,
  max: number,
): NotificationValidationError[] => {
  if (value === undefined || value === null) {
    return [];
  }

  if (typeof value !== 'string') {
    return [{ field, message: `${field} must be a string` }];
  }

  if (value.trim().length > max) {
    return [{ field, message: `${field} cannot exceed ${max} characters` }];
  }

  return [];
};

const validateRequiredDate = (
  value: unknown,
  field: string,
): NotificationValidationError[] => {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return [{ field, message: `${field} must be an ISO date string` }];
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return [{ field, message: `${field} must be a valid ISO date string` }];
  }

  return [];
};

const validateOptionalDate = (
  value: unknown,
  field: string,
): NotificationValidationError[] => {
  if (value === undefined || value === null || value === '') {
    return [];
  }

  if (typeof value !== 'string') {
    return [{ field, message: `${field} must be an ISO date string` }];
  }

  return validateRequiredDate(value, field);
};

const normalizePayload = <T extends NotificationType>(
  type: T,
  payload: NotificationPayloadMap[T],
): NotificationPayloadMap[T] => {
  if (type === 'Custom') {
    const custom = payload as CustomPayload;
    return {
      subject: custom.subject?.trim(),
      message: custom.message.trim(),
      metadata: custom.metadata,
    } as NotificationPayloadMap[T];
  }

  if (type === 'Waitlist') {
    const waitlist = payload as WaitlistPayload;
    return {
      deviceName: waitlist.deviceName.trim(),
      requestedFrom: waitlist.requestedFrom
        ? new Date(waitlist.requestedFrom).toISOString()
        : undefined,
      requestedTill: waitlist.requestedTill
        ? new Date(waitlist.requestedTill).toISOString()
        : undefined,
      position: waitlist.position,
    } as NotificationPayloadMap[T];
  }

  const base = payload as ReservationPayload;
  const normalizedBase: ReservationPayload = {
    deviceName: base.deviceName.trim(),
    from: new Date(base.from).toISOString(),
    till: new Date(base.till).toISOString(),
    location: base.location?.trim() || undefined,
    notes: base.notes?.trim() || undefined,
  };

  switch (type) {
    case 'Reservation':
      return normalizedBase as NotificationPayloadMap[T];
    case 'Accepted': {
      const accepted = payload as AcceptedPayload;
      return {
        ...normalizedBase,
        approvedBy: accepted.approvedBy?.trim() || undefined,
        approvedAt: accepted.approvedAt
          ? new Date(accepted.approvedAt).toISOString()
          : undefined,
      } as NotificationPayloadMap[T];
    }
    case 'Rejected': {
      const rejected = payload as RejectedPayload;
      return {
        ...normalizedBase,
        reason: rejected.reason.trim(),
      } as NotificationPayloadMap[T];
    }
    case 'Cancelled': {
      const cancelled = payload as CancelledPayload;
      return {
        ...normalizedBase,
        cancelledBy: cancelled.cancelledBy?.trim() || undefined,
        reason: cancelled.reason?.trim() || undefined,
      } as NotificationPayloadMap[T];
    }
    case 'Collected': {
      const collected = payload as CollectedPayload;
      return {
        ...normalizedBase,
        collectedAt: collected.collectedAt
          ? new Date(collected.collectedAt).toISOString()
          : undefined,
      } as NotificationPayloadMap[T];
    }
    case 'Returned': {
      const returned = payload as ReturnedPayload;
      return {
        ...normalizedBase,
        returnedAt: returned.returnedAt
          ? new Date(returned.returnedAt).toISOString()
          : undefined,
        condition: returned.condition?.trim() || undefined,
      } as NotificationPayloadMap[T];
    }
    default:
      return normalizedBase as NotificationPayloadMap[T];
  }
};

const buildMessage = <T extends NotificationType>(
  type: T,
  payload: NotificationPayloadMap[T],
): string => {
  switch (type) {
    case 'Reservation': {
      const data = payload as ReservationPayload;
      return `Reservation created for ${data.deviceName} from ${formatDateForMessage(
        data.from,
      )} to ${formatDateForMessage(data.till)}.`;
    }
    case 'Accepted': {
      const data = payload as AcceptedPayload;
      return `Your reservation for ${data.deviceName} was accepted. Collect between ${formatDateForMessage(
        data.from,
      )} and ${formatDateForMessage(data.till)}.`;
    }
    case 'Rejected': {
      const data = payload as RejectedPayload;
      return `Reservation for ${data.deviceName} was rejected: ${data.reason.trim()}.`;
    }
    case 'Cancelled': {
      const data = payload as CancelledPayload;
      return `Reservation for ${data.deviceName} was cancelled${
        data.reason ? `: ${data.reason.trim()}` : ''
      }.`;
    }
    case 'Collected': {
      const data = payload as CollectedPayload;
      return `Device ${data.deviceName} collected. Return by ${formatDateForMessage(
        data.till,
      )}.`;
    }
    case 'Returned': {
      const data = payload as ReturnedPayload;
      return `Device ${data.deviceName} returned. Thank you!`;
    }
    case 'Waitlist': {
      const data = payload as WaitlistPayload;
      return `You joined the waitlist for ${data.deviceName}. Current position: ${data.position}.`;
    }
    case 'Custom': {
      const data = payload as CustomPayload;
      return data.message.trim();
    }
    default:
      return 'Notification created.';
  }
};

const formatDateForMessage = (value: string): string => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toISOString().split('T')[0];
};

const toDate = (value: string | Date): Date | undefined => {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? undefined : value;
  }

  if (typeof value === 'string') {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? undefined : parsed;
  }

  return undefined;
};

const normalizeCreatedAt = (value?: string | Date): string => {
  if (!value) {
    return new Date().toISOString();
  }

  const parsed = toDate(value);
  return parsed ? parsed.toISOString() : new Date().toISOString();
};

const generateNotificationId = (): string => {
  const randomSegment = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `NOTIF-${Date.now()}-${randomSegment}`;
};

export const createReservationNotification = (
  params: Omit<CreateNotificationParams<'Reservation'>, 'type'>,
): NotificationCreationResult<'Reservation'> =>
  createNotification({ ...params, type: 'Reservation' });

export const createAcceptedNotification = (
  params: Omit<CreateNotificationParams<'Accepted'>, 'type'>,
): NotificationCreationResult<'Accepted'> =>
  createNotification({ ...params, type: 'Accepted' });

export const createRejectedNotification = (
  params: Omit<CreateNotificationParams<'Rejected'>, 'type'>,
): NotificationCreationResult<'Rejected'> =>
  createNotification({ ...params, type: 'Rejected' });

export const createCancelledNotification = (
  params: Omit<CreateNotificationParams<'Cancelled'>, 'type'>,
): NotificationCreationResult<'Cancelled'> =>
  createNotification({ ...params, type: 'Cancelled' });

export const createCollectedNotification = (
  params: Omit<CreateNotificationParams<'Collected'>, 'type'>,
): NotificationCreationResult<'Collected'> =>
  createNotification({ ...params, type: 'Collected' });

export const createReturnedNotification = (
  params: Omit<CreateNotificationParams<'Returned'>, 'type'>,
): NotificationCreationResult<'Returned'> =>
  createNotification({ ...params, type: 'Returned' });

export const createWaitlistNotification = (
  params: Omit<CreateNotificationParams<'Waitlist'>, 'type'>,
): NotificationCreationResult<'Waitlist'> =>
  createNotification({ ...params, type: 'Waitlist' });

export const isNotificationOld = (
  notification: Notification,
  hoursThreshold = 24,
): boolean => {
  const now = Date.now();
  const created = new Date(notification.createdAt).getTime();
  return now - created > hoursThreshold * 60 * 60 * 1000;
};

export const formatNotificationDisplay = (
  notification: Notification,
): string => {
  const timeAgo = getTimeAgo(notification.createdAt);
  return `[${notification.type}] ${notification.message} (${timeAgo})`;
};

const getTimeAgo = (value: string): string => {
  const timestamp = new Date(value).getTime();
  const diffMs = Date.now() - timestamp;
  const diffMinutes = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMinutes < 1) return 'just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
};

export const filterNotificationsByType = <T extends NotificationType>(
  notifications: Notification[],
  type: T,
): Notification<T>[] =>
  notifications.filter(
    (notification): notification is Notification<T> => notification.type === type,
  );

export const sortNotificationsByDate = (
  notifications: Notification[],
): Notification[] =>
  [...notifications].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

export const groupNotificationsByUser = (
  notifications: Notification[],
): Record<string, Notification[]> =>
  notifications.reduce<Record<string, Notification[]>>((groups, item) => {
    if (!groups[item.userId]) {
      groups[item.userId] = [];
    }
    groups[item.userId].push(item);
    return groups;
  }, {});
