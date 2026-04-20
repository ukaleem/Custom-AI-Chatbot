export default () => ({
  port: parseInt(process.env.PORT ?? '3000', 10),
  nodeEnv: process.env.NODE_ENV ?? 'development',

  database: {
    mongoUri: process.env.MONGODB_URI ?? 'mongodb://localhost:27017/custom-ai-chatbot',
  },

  redis: {
    host: process.env.REDIS_HOST ?? 'localhost',
    port: parseInt(process.env.REDIS_PORT ?? '6379', 10),
  },

  qdrant: {
    url: process.env.QDRANT_URL ?? 'http://localhost:6333',
  },

  security: {
    superAdminKey: process.env.SUPER_ADMIN_KEY ?? '',
    jwtSecret: process.env.JWT_SECRET ?? 'change-me-in-production',
    allowedOrigins: (process.env.ALLOWED_ORIGINS ?? '').split(',').filter(Boolean),
  },
});
