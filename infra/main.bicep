param location string = resourceGroup().location
param env string = 'prod'
param appServicePlanName string = 'cdls-functions-${env}'
param signalRSkuName string = 'Free_F1'
param signalRCapacity int = 1
param eventGridTopicName string = 'cdls-events-${env}'
param cosmosAccountName string = toLower(substring('cdlscosmos${env}${uniqueString(resourceGroup().id)}', 0, 44))
param cosmosDatabaseThroughput int = 400
var dbAndFuncAppsNameSuffix = env == 'prod' ? '-prod' : ''
var signalrNameSuffix = env == 'prod' ? '-prod' : '-test'
var cosmosDatabases = [
  {
    name: 'catalogue-db${dbAndFuncAppsNameSuffix}'
    containers: [
      {
        name: 'Devices'
        partitionKey: '/id'
      }
    ]
  }
  {
    name: 'inventory-db${dbAndFuncAppsNameSuffix}'
    containers: [
      {
        name: 'Inventory'
        partitionKey: '/id'
      }
    ]
  }
  {
    name: 'loans-db${dbAndFuncAppsNameSuffix}'
    containers: [
      {
        name: 'Loans'
        partitionKey: '/id'
      }
      {
        name: 'Favourites'
        partitionKey: '/id'
      }
    ]
  }
  {
    name: 'notifications-db${dbAndFuncAppsNameSuffix}'
    containers: [
      {
        name: 'Notifications'
        partitionKey: '/id'
      }
    ]
  }
]
// Flat list of Cosmos containers (avoids nested for loops)
var cosmosContainerSpecs = [
  {
    dbName: 'catalogue-db${dbAndFuncAppsNameSuffix}'
    name: 'Devices'
    partitionKey: '/id'
  }
  {
    dbName: 'inventory-db${dbAndFuncAppsNameSuffix}'
    name: 'Inventory'
    partitionKey: '/id'
  }
  {
    dbName: 'loans-db${dbAndFuncAppsNameSuffix}'
    name: 'Loans'
    partitionKey: '/id'
  }
  {
    dbName: 'loans-db${dbAndFuncAppsNameSuffix}'
    name: 'Favourites'
    partitionKey: '/id'
  }
  {
    dbName: 'notifications-db${dbAndFuncAppsNameSuffix}'
    name: 'Notifications'
    partitionKey: '/id'
  }
]

var functionApps = [
  {
    name: 'catalogue-service-func${dbAndFuncAppsNameSuffix}'
    short: 'cat'
  }
  {
    name: 'inventory-service-func${dbAndFuncAppsNameSuffix}'
    short: 'inv'
  }
  {
    name: 'loans-service-func${dbAndFuncAppsNameSuffix}'
    short: 'loan'
  }
  {
    name: 'notifications-service-func${dbAndFuncAppsNameSuffix}'
    short: 'noti'
  }
]

param tags object = {}

resource appPlan 'Microsoft.Web/serverfarms@2022-09-01' = {
  name: appServicePlanName
  location: location
  kind: 'functionapp'
  sku: {
    name: 'Y1'
    tier: 'Dynamic'
  }
  tags: tags
}

resource storageAccounts 'Microsoft.Storage/storageAccounts@2023-01-01' = [for app in functionApps: {
  name: toLower(substring('cdls${env}${app.short}${uniqueString(resourceGroup().id, app.name)}', 0, 24))
  location: location
  sku: {
    name: 'Standard_LRS'
  }
  kind: 'StorageV2'
  properties: {
    minimumTlsVersion: 'TLS1_2'
    allowBlobPublicAccess: false
  }
  tags: tags
}]

resource functionAppsResources 'Microsoft.Web/sites@2022-09-01' = [for (app, i) in functionApps: {
  name: '${app.name}-${env}'
  location: location
  kind: 'functionapp'
  properties: {
    serverFarmId: appPlan.id
    httpsOnly: true
    siteConfig: {
      ftpsState: 'Disabled'
    }
  }
  tags: tags
}]

resource signalRService 'Microsoft.SignalRService/SignalR@2023-02-01' = {
  name: 'cdls-signalr${signalrNameSuffix}'
  location: location
  sku: {
    name: signalRSkuName
    capacity: signalRCapacity
  }
  properties: {
    features: [
      {
        flag: 'ServiceMode'
        value: 'Serverless'
      }
    ]
  }
  tags: tags
}

resource eventGridTopic 'Microsoft.EventGrid/topics@2022-06-15' = {
  name: eventGridTopicName
  location: location
  tags: tags
}

resource cosmosAccount 'Microsoft.DocumentDB/databaseAccounts@2023-04-15' = {
  name: cosmosAccountName
  location: location
  kind: 'GlobalDocumentDB'
  properties: {
    databaseAccountOfferType: 'Standard'
    enableFreeTier: true
    consistencyPolicy: {
      defaultConsistencyLevel: 'Session'
    }
    locations: [
      {
        locationName: location
        failoverPriority: 0
      }
    ]
  }
  tags: tags
}

resource cosmosDatabasesResources 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases@2023-04-15' = [for db in cosmosDatabases: {
  name: '${cosmosAccount.name}/${db.name}'
  properties: {
    resource: {
      id: db.name
    }
    options: {
      throughput: cosmosDatabaseThroughput
    }
  }
}]

resource cosmosContainers 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases/containers@2023-04-15' = [for containerConfig in cosmosContainerSpecs: {
  name: '${cosmosAccount.name}/${containerConfig.dbName}/${containerConfig.name}'
  properties: {
    resource: {
      id: containerConfig.name
      partitionKey: {
        paths: [
          containerConfig.partitionKey
        ]
        kind: 'Hash'
      }
    }
    options: {}
  }
  dependsOn: [
    cosmosDatabasesResources
  ]
}]

output appServicePlanId string = appPlan.id
output functionAppNames array = [for app in functionApps: '${app.name}-${env}']
output signalRServiceName string = signalRService.name
output eventGridTopicEndpoint string = eventGridTopic.properties.endpoint
output cosmosEndpoint string = cosmosAccount.properties.documentEndpoint
