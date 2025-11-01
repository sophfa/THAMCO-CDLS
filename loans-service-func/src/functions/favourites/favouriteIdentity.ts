import { createHash } from 'node:crypto';

export interface FavouriteIdentity {
  readonly id: string;
  readonly userId: string;
  readonly deviceId: string;
}

export const buildFavouriteIdentity = (
  userId: string,
  deviceId: string,
): FavouriteIdentity => {
  const normalizedUserId = userId.trim();
  const normalizedDeviceId = deviceId.trim();

  const idSource = `${normalizedUserId}:${normalizedDeviceId}`;
  const id = createHash('sha256').update(idSource).digest('hex');

  return {
    id,
    userId: normalizedUserId,
    deviceId: normalizedDeviceId,
  };
};
