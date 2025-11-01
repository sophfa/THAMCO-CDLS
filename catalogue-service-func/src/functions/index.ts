// Aggregator for all Azure Functions
// This file imports all function definitions to register them with the runtime

import './list-products-http';
import './get-product-http';

// Export the app object for Azure Functions runtime
export { app } from '@azure/functions';