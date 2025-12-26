import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";
import { COSMOS_OPTIONS } from "../config/cosmosOptions";
import { Product } from "../domain/product";
import { ProductRepo } from "../domain/product-repo";
import { CosmosProductRepo } from "../infra/cosmos-product-repo";

const productRepo: ProductRepo = new CosmosProductRepo(COSMOS_OPTIONS);

/**
 * Response format for product list API
 */
interface ListProductsResponse {
  readonly success: boolean;
  readonly data?: Product[];
  readonly error?: {
    readonly code: string;
    readonly message: string;
  };
  readonly metadata?: {
    readonly count: number;
    readonly timestamp: string;
  };
}

/**
 * Azure Function to list all products
 *
 * GET /api/products
 *
 * Returns a list of all products in the system
 */
export async function listProductsHttp(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  context.log("HTTP trigger function processed a request to list products");

  try {
    const result = await productRepo.list();

    if (!result.success) {
      throw new Error(
        (result as any).error?.message || "Failed to fetch products"
      );
    }

    if (!result.data) {
      throw new Error("No data returned from repository");
    }

    const response: ListProductsResponse = {
      success: true,
      data: result.data,
      metadata: {
        count: result.data.length,
        timestamp: new Date().toISOString(),
      },
    };

    return {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-cache",
      },
      body: JSON.stringify(response, null, 2),
    };
  } catch (error: any) {
    context.log("Error listing products:", error);
    const errorResponse: ListProductsResponse = {
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: "An unexpected error occurred while listing products",
      },
    };
    return {
      status: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(errorResponse, null, 2),
    };
  }
}

// Register the function with Azure Functions runtime
app.http("listProducts", {
  methods: ["GET", "OPTIONS"],
  authLevel: "anonymous",
  route: "products",
  handler: listProductsHttp,
});
