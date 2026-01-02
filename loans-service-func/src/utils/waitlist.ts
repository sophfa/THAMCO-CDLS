import { InvocationContext } from "@azure/functions";
import { loansContainer } from "../config/cosmosClient";

type LogBase = Record<string, unknown>;

export async function getWaitlistForDevice(
  deviceId: string,
  context?: InvocationContext,
  baseLog: LogBase = {}
): Promise<string[] | undefined> {
  if (!deviceId) return undefined;

  try {
    const { resources } = await loansContainer.items
      .query({
        query:
          "SELECT c.waitlist FROM c WHERE c.deviceId = @deviceId AND IS_DEFINED(c.waitlist)",
        parameters: [{ name: "@deviceId", value: deviceId }],
      })
      .fetchAll();

    const unique = new Set<string>();
    for (const item of resources ?? []) {
      const list = (item as { waitlist?: unknown }).waitlist;
      if (!Array.isArray(list)) continue;
      for (const entry of list) {
        if (typeof entry === "string" && entry.trim()) {
          unique.add(entry.trim());
          continue;
        }
        if (
          entry &&
          typeof entry === "object" &&
          "userId" in entry &&
          typeof (entry as { userId?: unknown }).userId === "string"
        ) {
          const userId = (entry as { userId: string }).userId.trim();
          if (userId) unique.add(userId);
        }
      }
    }

    const waitlist = Array.from(unique);
    return waitlist.length ? waitlist : undefined;
  } catch (error: any) {
    if (context) {
      context.log({
        ...baseLog,
        message: "Failed to resolve waitlist for device",
        deviceId,
        error: error?.message ?? String(error),
      });
    }
    return undefined;
  }
}
