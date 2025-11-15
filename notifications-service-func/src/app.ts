// Main entry point for the Notifications Service Azure Functions App
// This file imports all function modules to register them with the Azure Functions runtime

import { app } from '@azure/functions';

// Import all HTTP trigger functions
import './functions/get-notification-http';
import './functions/getNotificationsByUserHttp';
import './functions/list-notification-http';
import './functions/createNotificationHttp';
import './functions/markNotificationReadHttp';
import './functions/handle-loan-status-event';

// Export the shared app instance so the Azure Functions runtime can discover registered handlers
export { app };
export default app;
