// Azure Function - Get Product by ID HTTP Trigger

import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";
import { Product } from "../domain/product";
import { ProductRepo } from "../domain/product-repo";
import { CosmosProductRepo } from "../infra/cosmos-product-repo";

// Configuration from environment variables
const cosmosOptions = {
  endpoint: process.env.COSMOS_ENDPOINT,
  databaseId: process.env.COSMOS_DATABASE,
  containerId: process.env.COSMOS_CONTAINER,
  key: process.env.COSMOS_KEY,
};

// Initialize repository
const productRepo: ProductRepo = new CosmosProductRepo(cosmosOptions);

/**
 * Response format for single product API
 */
interface GetProductResponse {
  readonly success: boolean;
  readonly data?: Product;
  readonly error?: {
    readonly code: string;
    readonly message: string;
  };
}

/**
 * Azure Function to get a product by ID
 *
 * GET /api/products/{id}
 *
 * Returns a single product by its ID
 */
export async function getProductByIdHttp(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  const productId = request.params.id;

  context.log(
    `HTTP trigger function processed a request to get product: ${productId}`
  );

  // Validate product ID parameter
  if (!productId || productId.trim().length === 0) {
    const errorResponse: GetProductResponse = {
      success: false,
      error: {
        code: "INVALID_INPUT",
        message: "Product ID is required",
      },
    };

    return {
      status: 400,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(errorResponse, null, 2),
    };
  }

  const lookupIds = buildLookupCandidates(productId.trim());

  try {
    let lastError: { code: string; message: string } | null = null;

    for (const candidateId of lookupIds) {
      context.log(
        `Attempting to find product using identifier '${candidateId}'`
      );

      const result = await productRepo.get(candidateId);

      if (result.success) {
        const response: GetProductResponse = {
          success: true,
          data: result.data,
        };

        return {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            "Cache-Control": "public, max-age=300", // Cache for 5 minutes
            "X-Resolved-Product-Id": candidateId,
          },
          body: JSON.stringify(response, null, 2),
        };
      }

      lastError = (result as { success: false; error: any }).error;

      // Only try alternative identifiers when the error was NOT_FOUND
      if (lastError.code !== "NOT_FOUND") {
        break;
      }
    }

    const errorResponse: GetProductResponse = {
      success: false,
      error: {
        code: lastError?.code ?? "INTERNAL_ERROR",
        message:
          lastError?.message ??
          "Product could not be retrieved with the provided identifier",
      },
    };

    const statusCode = lastError?.code === "NOT_FOUND" ? 404 : 500;

    return {
      status: statusCode,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(errorResponse, null, 2),
    };
  } catch (error: any) {
    context.log("Error getting product:", error);

    const errorResponse: GetProductResponse = {
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: "An unexpected error occurred while retrieving the product",
      },
    };

    return {
      status: 500,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(errorResponse, null, 2),
    };
  }
}

// Register the function with Azure Functions runtime
app.http("getProductById", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: "products/{id}",
  handler: getProductByIdHttp,
});

/**
 * Builds a list of candidate identifiers to try when fetching products.
 * Handles DEV- vs PROD- mismatches between services by falling back to the
 * corresponding identifier if the primary lookup fails.
 */
function buildLookupCandidates(id: string): string[] {
  const candidates = new Set<string>();
  if (id) {
    candidates.add(id);
    const alternateId = deriveAlternateProductId(id);
    if (alternateId) {
      candidates.add(alternateId);
    }
  }
  return Array.from(candidates);
}

function deriveAlternateProductId(id: string): string | undefined {
  const devMatch = /^DEV-(\d+)$/i.exec(id);
  if (devMatch) {
    return `PROD-${devMatch[1]}`;
  }

  const prodMatch = /^PROD-(\d+)$/i.exec(id);
  if (prodMatch) {
    return `DEV-${prodMatch[1]}`;
  }

  return undefined;
}
