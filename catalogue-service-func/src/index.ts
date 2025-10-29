// Entry point for Azure Functions v4
// This file imports all function definitions to register them with the runtime

import './functions/list-products-http.js';
import './functions/get-product-http.js';

// Export the app object for Azure Functions runtime
export { app } from '@azure/functions';