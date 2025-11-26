import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";
import { CosmosClient } from "@azure/cosmos";
import "dotenv/config";

interface AdjustStockRequest {
  delta?: number;
  lastAdjustedBy?: string;
  lastAdjustmentReason?: string;
  lastAdjustmentRef?: string;
}

const client = new CosmosClient({
  endpoint: process.env.COSMOS_ENDPOINT!,
  key: process.env.COSMOS_KEY!,
});

const container = client
  .database(process.env.COSMOS_DATABASE!)
  .container(process.env.COSMOS_CONTAINER!);

function withCors(
  res: HttpResponseInit,
  allowMethods = "POST,OPTIONS"
): HttpResponseInit {
  return {
    ...res,
    headers: {
      ...(res.headers ?? {}),
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": allowMethods,
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  };
}

export async function adjustInventoryStockHttp(
  req: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  if (req.method === "OPTIONS") {
    return withCors({ status: 204 }, "POST,OPTIONS");
  }

  const inventoryId = req.params.id;
  context.log?.("[inventory] adjustInventoryStockHttp", {
    inventoryId,
    method: req.method,
    url: req.url,
  });

  if (!inventoryId || inventoryId.trim().length === 0) {
    context.log?.("[inventory] missing inventoryId");
    return withCors({
      status: 400,
      jsonBody: { success: false, message: "Inventory ID is required" },
    });
  }

  let body: AdjustStockRequest;
  try {
    body = (await req.json()) as AdjustStockRequest;
    context.log?.("[inventory] adjust payload", body);
  } catch {
    context.log?.("[inventory] invalid JSON payload");
    return withCors({
      status: 400,
      jsonBody: { success: false, message: "Request body must be valid JSON" },
    });
  }

  if (body.delta === undefined || body.delta === null) {
    context.log?.("[inventory] delta missing");
    return withCors({
      status: 400,
      jsonBody: { success: false, message: "delta is required" },
    });
  }

  if (!Number.isInteger(body.delta)) {
    context.log?.("[inventory] delta not integer", { delta: body.delta });
    return withCors({
      status: 400,
      jsonBody: { success: false, message: "delta must be an integer" },
    });
  }

  try {
    const response = await container.item(inventoryId, inventoryId).read<any>();

    if (!response.resource) {
      context.log?.("[inventory] inventory not found", { inventoryId });
      return withCors({
        status: 404,
        jsonBody: { success: false, message: "Inventory not found" },
      });
    }

    const current = response.resource;
    if (typeof current.stock !== "number" || Number.isNaN(current.stock)) {
      context.log?.("[inventory] invalid current stock", {
        stock: current.stock,
      });
      return withCors({
        status: 500,
        jsonBody: { success: false, message: "Inventory stock is invalid" },
      });
    }

    const newStock = current.stock + body.delta;
    if (newStock < 0) {
      context.log?.("[inventory] negative stock prevented", {
        current: current.stock,
        delta: body.delta,
      });
      return withCors({
        status: 400,
        jsonBody: {
          success: false,
          message: "Adjustment would result in negative stock",
        },
      });
    }

    const updated = {
      ...current,
      stock: newStock,
      lastAdjustedAt: new Date().toISOString(),
      lastAdjustedBy: body.lastAdjustedBy ?? "admin",
      lastAdjustmentReason: body.lastAdjustmentReason ?? "MANUAL_ADJUSTMENT",
      ...(body.lastAdjustmentRef
        ? { lastAdjustmentRef: body.lastAdjustmentRef }
        : {}),
    };

    const replaceResult = await container
      .item(inventoryId, inventoryId)
      .replace(updated);

    context.log?.("[inventory] stock adjusted", {
      inventoryId,
      previous: current.stock,
      delta: body.delta,
      newStock,
    });

    return withCors({
      status: 200,
      jsonBody: {
        success: true,
        data: replaceResult.resource,
      },
    });
  } catch (error: any) {
    context.log("Error adjusting stock", error);
    return withCors({
      status: 500,
      jsonBody: {
        success: false,
        message: "Failed to adjust stock",
        detail: error?.message,
      },
    });
  }
}

app.http("adjustInventoryStockHttp", {
  route: "inventory/{id}/stock-adjustment",
  methods: ["POST", "OPTIONS"],
  authLevel: "anonymous",
  handler: adjustInventoryStockHttp,
});
