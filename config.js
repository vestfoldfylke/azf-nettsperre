module.exports = {
    appReg: {
        tenantId: process.env.AZURE_APP_TENANT_ID,
        clientId: process.env.AZURE_APP_ID,
        clientSecret: process.env.AZURE_APP_SECRET,
        scope: process.env.AZURE_APP_SCOPE || 'https://graph.microsoft.com/.default',
        grantType: process.env.AZURE_APP_GRANT_TYPE || 'client_credentials',
        issuer: `https://sts.windows.net/${process.env.AZURE_APP_TENANT_ID}/`,
        jwkUri: `https://login.microsoftonline.com/${process.env.AZURE_APP_TENANT_ID}/discovery/v2.0/keys`,
        audience: process.env.AZURE_APP_AUDIENCE || 'Audience'
    },
    mongoDB: {
        connectionString: process.env.MONGODB_CONNECTION_STRING,
        dbName: process.env.MONGODB_DB_NAME,
        blocksCollection: process.env.MONGODB_BLOCKS_COLLECTION,
        historyCollection: process.env.MONGODB_HISTORY_COLLECTION,
    },
    statistics: {
        url: process.env.STATISTICS_URL,
        key: process.env.STATISTICS_KEY
    },
    blockGroup: {
        eksamenID: process.env.NETTPSERRE_EKSAMEN_GROUP_ID,
        proveID: process.env.NETTPSERRE_PROVE_GROUP_ID,
        teamsID: process.env.NETTPSERRE_TEAMS_GROUP_ID,
        offlineID: process.env.NETTPSERRE_OFFLINE_GROUP_ID
    },
    misc: {
        email_domain: process.env.EMAIL_DOMAIN,
        allowedCompanies: (process.env.SKIPVALIDATION && process.env.SKIPVALIDATION.split(',') || [])
    }
}