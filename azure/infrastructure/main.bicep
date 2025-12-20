// =============================================================================
// ITIYUM PLATFORM - AZURE INFRASTRUCTURE (BICEP)
// =============================================================================
// Main infrastructure template for deploying Itiyum to Azure
// Supports: development, staging, and production environments
// =============================================================================

@description('Environment name')
@allowed(['dev', 'stg', 'prd'])
param environment string = 'dev'

@description('Azure region for resources')
param location string = resourceGroup().location

@description('Project name')
param projectName string = 'itiyum'

@description('PostgreSQL admin username')
param dbAdminUser string = 'itiyum_admin'

@description('PostgreSQL admin password')
@secure()
param dbAdminPassword string

@description('JWT secret for authentication')
@secure()
param jwtSecret string

// -----------------------------------------------------------------------------
// VARIABLES
// -----------------------------------------------------------------------------
var resourceSuffix = '${projectName}-${environment}'
var acrName = '${projectName}acr${environment}'
var appServicePlanName = 'asp-${resourceSuffix}'
var backendAppName = 'app-${projectName}-api-${environment}'
var frontendAppName = 'app-${projectName}-web-${environment}'
var postgresServerName = 'psql-${resourceSuffix}'
var keyVaultName = 'kv-${resourceSuffix}'
var logAnalyticsName = 'log-${resourceSuffix}'
var appInsightsName = 'appi-${resourceSuffix}'
var storageAccountName = '${projectName}storage${environment}'

// SKU configurations per environment
var skuConfig = {
  dev: {
    appServicePlan: 'B1'
    postgres: 'Standard_B1ms'
    postgresTier: 'Burstable'
    postgresStorage: 32
  }
  stg: {
    appServicePlan: 'B2'
    postgres: 'Standard_B2s'
    postgresTier: 'Burstable'
    postgresStorage: 64
  }
  prd: {
    appServicePlan: 'P1v2'
    postgres: 'Standard_D2s_v3'
    postgresTier: 'GeneralPurpose'
    postgresStorage: 128
  }
}

// -----------------------------------------------------------------------------
// LOG ANALYTICS WORKSPACE
// -----------------------------------------------------------------------------
resource logAnalytics 'Microsoft.OperationalInsights/workspaces@2022-10-01' = {
  name: logAnalyticsName
  location: location
  properties: {
    sku: {
      name: 'PerGB2018'
    }
    retentionInDays: 30
  }
}

// -----------------------------------------------------------------------------
// APPLICATION INSIGHTS
// -----------------------------------------------------------------------------
resource appInsights 'Microsoft.Insights/components@2020-02-02' = {
  name: appInsightsName
  location: location
  kind: 'web'
  properties: {
    Application_Type: 'web'
    WorkspaceResourceId: logAnalytics.id
  }
}

// -----------------------------------------------------------------------------
// AZURE CONTAINER REGISTRY
// -----------------------------------------------------------------------------
resource containerRegistry 'Microsoft.ContainerRegistry/registries@2023-01-01-preview' = {
  name: acrName
  location: location
  sku: {
    name: 'Basic'
  }
  properties: {
    adminUserEnabled: true
  }
}

// -----------------------------------------------------------------------------
// KEY VAULT
// -----------------------------------------------------------------------------
resource keyVault 'Microsoft.KeyVault/vaults@2023-02-01' = {
  name: keyVaultName
  location: location
  properties: {
    sku: {
      family: 'A'
      name: 'standard'
    }
    tenantId: subscription().tenantId
    accessPolicies: []
    enableRbacAuthorization: true
  }
}

// -----------------------------------------------------------------------------
// STORAGE ACCOUNT
// -----------------------------------------------------------------------------
resource storageAccount 'Microsoft.Storage/storageAccounts@2023-01-01' = {
  name: storageAccountName
  location: location
  sku: {
    name: 'Standard_LRS'
  }
  kind: 'StorageV2'
  properties: {
    accessTier: 'Hot'
    supportsHttpsTrafficOnly: true
    minimumTlsVersion: 'TLS1_2'
  }
}

// Blob container for uploads
resource blobService 'Microsoft.Storage/storageAccounts/blobServices@2023-01-01' = {
  parent: storageAccount
  name: 'default'
}

resource uploadsContainer 'Microsoft.Storage/storageAccounts/blobServices/containers@2023-01-01' = {
  parent: blobService
  name: 'uploads'
  properties: {
    publicAccess: 'None'
  }
}

// -----------------------------------------------------------------------------
// POSTGRESQL FLEXIBLE SERVER
// -----------------------------------------------------------------------------
resource postgresServer 'Microsoft.DBforPostgreSQL/flexibleServers@2022-12-01' = {
  name: postgresServerName
  location: location
  sku: {
    name: skuConfig[environment].postgres
    tier: skuConfig[environment].postgresTier
  }
  properties: {
    version: '14'
    administratorLogin: dbAdminUser
    administratorLoginPassword: dbAdminPassword
    storage: {
      storageSizeGB: skuConfig[environment].postgresStorage
    }
    backup: {
      backupRetentionDays: 7
      geoRedundantBackup: 'Disabled'
    }
    highAvailability: {
      mode: 'Disabled'
    }
  }
}

// PostgreSQL Database
resource postgresDatabase 'Microsoft.DBforPostgreSQL/flexibleServers/databases@2022-12-01' = {
  parent: postgresServer
  name: '${projectName}_${environment}'
}

// PostgreSQL Firewall - Allow Azure services
resource postgresFirewall 'Microsoft.DBforPostgreSQL/flexibleServers/firewallRules@2022-12-01' = {
  parent: postgresServer
  name: 'AllowAzureServices'
  properties: {
    startIpAddress: '0.0.0.0'
    endIpAddress: '0.0.0.0'
  }
}

// -----------------------------------------------------------------------------
// APP SERVICE PLAN
// -----------------------------------------------------------------------------
resource appServicePlan 'Microsoft.Web/serverfarms@2022-09-01' = {
  name: appServicePlanName
  location: location
  kind: 'linux'
  sku: {
    name: skuConfig[environment].appServicePlan
  }
  properties: {
    reserved: true
  }
}

// -----------------------------------------------------------------------------
// BACKEND WEB APP
// -----------------------------------------------------------------------------
resource backendApp 'Microsoft.Web/sites@2022-09-01' = {
  name: backendAppName
  location: location
  properties: {
    serverFarmId: appServicePlan.id
    siteConfig: {
      linuxFxVersion: 'DOCKER|${containerRegistry.properties.loginServer}/${projectName}-backend:latest'
      appSettings: [
        { name: 'WEBSITES_PORT', value: '3001' }
        { name: 'NODE_ENV', value: environment }
        { name: 'DB_HOST', value: '${postgresServerName}.postgres.database.azure.com' }
        { name: 'DB_PORT', value: '5432' }
        { name: 'DB_NAME', value: '${projectName}_${environment}' }
        { name: 'DB_USER', value: dbAdminUser }
        { name: 'DB_PASSWORD', value: dbAdminPassword }
        { name: 'DB_SSL', value: 'true' }
        { name: 'JWT_SECRET', value: jwtSecret }
        { name: 'CORS_ORIGIN', value: 'https://${frontendAppName}.azurewebsites.net' }
        { name: 'FRONTEND_URL', value: 'https://${frontendAppName}.azurewebsites.net' }
        { name: 'DOCKER_REGISTRY_SERVER_URL', value: 'https://${containerRegistry.properties.loginServer}' }
        { name: 'DOCKER_REGISTRY_SERVER_USERNAME', value: containerRegistry.listCredentials().username }
        { name: 'DOCKER_REGISTRY_SERVER_PASSWORD', value: containerRegistry.listCredentials().passwords[0].value }
        { name: 'APPLICATIONINSIGHTS_CONNECTION_STRING', value: appInsights.properties.ConnectionString }
      ]
    }
    httpsOnly: true
  }
}

// -----------------------------------------------------------------------------
// FRONTEND WEB APP
// -----------------------------------------------------------------------------
resource frontendApp 'Microsoft.Web/sites@2022-09-01' = {
  name: frontendAppName
  location: location
  properties: {
    serverFarmId: appServicePlan.id
    siteConfig: {
      linuxFxVersion: 'DOCKER|${containerRegistry.properties.loginServer}/${projectName}-frontend:latest'
      appSettings: [
        { name: 'WEBSITES_PORT', value: '80' }
        { name: 'API_URL', value: 'https://${backendAppName}.azurewebsites.net' }
        { name: 'DOCKER_REGISTRY_SERVER_URL', value: 'https://${containerRegistry.properties.loginServer}' }
        { name: 'DOCKER_REGISTRY_SERVER_USERNAME', value: containerRegistry.listCredentials().username }
        { name: 'DOCKER_REGISTRY_SERVER_PASSWORD', value: containerRegistry.listCredentials().passwords[0].value }
      ]
    }
    httpsOnly: true
  }
}

// -----------------------------------------------------------------------------
// OUTPUTS
// -----------------------------------------------------------------------------
output frontendUrl string = 'https://${frontendApp.properties.defaultHostName}'
output backendUrl string = 'https://${backendApp.properties.defaultHostName}'
output acrLoginServer string = containerRegistry.properties.loginServer
output postgresHost string = '${postgresServer.name}.postgres.database.azure.com'
output keyVaultUri string = keyVault.properties.vaultUri
output appInsightsConnectionString string = appInsights.properties.ConnectionString

