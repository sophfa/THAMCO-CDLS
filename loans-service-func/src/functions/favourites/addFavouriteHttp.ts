// Azure Function - Add Favourite HTTP Trigger

import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from '@azure/functions';
import { Favourite } from '../../domain/favourite';
import { FavouriteRepo } from '../../domain/favourites-repo';
import { CosmosFavouriteRepo } from '../../infra/cosmos-favourite-repo';

// Configuration from environment variables
const cosmosOptions = {
  endpoint: process.env.COSMOS_ENDPOINT || 'https://localhost:8081',
  databaseId: process.env.COSMOS_DATABASE || 'loans-db',
  containerId: process.env.COSMOS_CONTAINER_FAVOURITES || 'Favourites',
  key: process.env.COSMOS_KEY,
};

// Initialize repository
const favouriteRepo: FavouriteRepo = new CosmosFavouriteRepo(cosmosOptions);

/**
 * Response format for add favourite API
 */
interface AddFavouriteResponse {
  readonly success: boolean;
  readonly data?: Favourite[];
  readonly error?: {
    readonly code: string;
    readonly message: string;
  };
}

/**
 * Request body format for adding a favourite
 */
interface AddFavouriteRequest {
  readonly userId: string;
  readonly deviceId: string;
}

/**
 * Azure Function to add a new favourite
 *
 * POST /api/favourites
 *
 * Adds a new favourite and returns the updated list of favourites for the user
 */
export async function addFavouriteHttp(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  context.log('HTTP trigger function processed a request to add favourite');

  try {
    // Parse request body
    const requestBody = await request.json() as AddFavouriteRequest;
    const { userId, deviceId } = requestBody;

    // Validate input parameters
    if (!userId || userId.trim().length === 0) {
      const errorResponse: AddFavouriteResponse = {
        success: false,
        error: {
          code: 'INVALID_INPUT',
          message: 'userId is required',
        },
      };

      return {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(errorResponse, null, 2),
      };
    }

    if (!deviceId || deviceId.trim().length === 0) {
      const errorResponse: AddFavouriteResponse = {
        success: false,
        error: {
          code: 'INVALID_INPUT',
          message: 'deviceId is required',
        },
      };

      return {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(errorResponse, null, 2),
      };
    }

    // Create new favourite object
    const newFavourite: Favourite = {
      userId: userId.trim(),
      deviceId: deviceId.trim(),
      addedAt: new Date(),
    };

    // Add favourite to repository
    const createResult = await favouriteRepo.create(newFavourite);

    if (createResult.success) {
      // Get updated list of favourites for the user
      const listResult = await favouriteRepo.list();
      
      if (listResult.success) {
        // Filter favourites for this user
        const userFavourites = listResult.data.filter(fav => fav.userId === userId.trim());
        
        const response: AddFavouriteResponse = {
          success: true,
          data: userFavourites,
        };

        return {
          status: 201,
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(response, null, 2),
        };
      }

      // If we can't get the list, just return the created favourite as array
      const response: AddFavouriteResponse = {
        success: true,
        data: [createResult.data],
      };

      return {
        status: 201,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(response, null, 2),
      };
    }

    // Handle repository errors
    const error = (createResult as { success: false; error: any }).error;
    const statusCode = error.code === 'ALREADY_EXISTS' ? 409 : 500;

   
    const errorResponse: AddFavouriteResponse = {
      success: false,
      error: {
        code: error.code,
        message: error.message,
      },
    };

    return {
      status: statusCode,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(errorResponse, null, 2),
    };
  } catch (error: any) {
    context.log('Error adding favourite:', error);

    const errorResponse: AddFavouriteResponse = {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred while adding the favourite',
      },
    };

    return {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(errorResponse, null, 2),
    };
  }
}

// Register the function with Azure Functions runtime
app.http('addFavourite', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'favourites',
  handler: addFavouriteHttp,
});
