import { NotificationRepo } from '../domain/notification-repo';
import { CosmosNotificationRepo } from './cosmos-notification-repo';

const requiredCosmosEnvVars = [
  'COSMOS_ENDPOINT',
  'COSMOS_DATABASE',
  'COSMOS_CONTAINER',
  'COSMOS_KEY',
] as const;

export class MissingCosmosConfigurationError extends Error {
  readonly missingSettings: readonly string[];

  constructor(missingSettings: readonly string[]) {
    super(
      `Missing Cosmos configuration value(s): ${missingSettings.join(', ')}`
    );
    this.name = 'MissingCosmosConfigurationError';
    this.missingSettings = missingSettings;
  }
}

let cachedRepo: NotificationRepo | null = null;

export function getNotificationRepo(): NotificationRepo {
  if (!cachedRepo) {
    const missingConfig = requiredCosmosEnvVars.filter((setting) => {
      const value = process.env[setting];
      return typeof value !== 'string' || value.trim().length === 0;
    });

    if (missingConfig.length > 0) {
      throw new MissingCosmosConfigurationError(missingConfig);
    }

    cachedRepo = new CosmosNotificationRepo({
      endpoint: process.env.COSMOS_ENDPOINT as string,
      databaseId: process.env.COSMOS_DATABASE as string,
      containerId: process.env.COSMOS_CONTAINER as string,
      key: process.env.COSMOS_KEY,
    });
  }

  return cachedRepo;
}
