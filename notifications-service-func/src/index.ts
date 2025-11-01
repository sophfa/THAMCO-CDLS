// Main entry point for the Notifications Service Azure Functions App
// This file imports all function modules to register them with the Azure Functions runtime

// Import all HTTP trigger functions
import './functions/get-notification-http';
import './functions/getNotificationsByUserHttp';
import './functions/list-notification-http';

// Export app instance for Azure Functions runtime
export { app } from '@azure/functions';