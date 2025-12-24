// Main entry point for the Inventory Service Azure Functions App
// This file imports all function modules so their registrations run.

import { app } from "@azure/functions";

// HTTP trigger functions
import "./functions/adjust-inventory-stock-http";
import "./functions/get-inventory-http";
import "./functions/getInventoryByProductHttp";
import "./functions/list-inventory-http";

// Event-driven functions
import "./functions/updateInventoryFromLoanEvent";

export { app };
export default app;
