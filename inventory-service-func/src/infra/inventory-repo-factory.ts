import { InventoryRepo } from "../domain/inventory-repo";
import { CosmosInventoryRepo } from "./cosmos-inventory-repo";
import { getCosmosConfig } from "../config/cosmosConfig";

let cachedRepo: InventoryRepo | undefined;

export function getInventoryRepo(): InventoryRepo {
  if (!cachedRepo) {
    const { endpoint, databaseId, containerId, key } = getCosmosConfig();
    cachedRepo = new CosmosInventoryRepo({
      endpoint,
      databaseId,
      containerId,
      key,
    });
  }
  return cachedRepo;
}
