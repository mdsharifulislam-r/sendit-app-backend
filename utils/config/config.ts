/**
 * Typed application configuration helper.
 * All values are read from process.env (loaded by ConfigModule).
 */
export const config = {
  app: {
    name: process.env.APP_NAME || 'NestJS App',
    env: process.env.NODE_ENV || 'development',
    port: Number(process.env.PORT) || 3000,
    ipAddress: process.env.IP_ADDRESS || '0.0.0.0',
    corsOrigin: process.env.CORS_ORIGIN || '*',
  },

  db: {
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER,
    pass: process.env.DB_PASS,
    name: process.env.DB_NAME,
  },

  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRE_IN || '7d',
  },

  email: {
    host: process.env.EMAIL_HOST,
    port: Number(process.env.EMAIL_PORT) || 587,
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
    from: process.env.EMAIL_FROM,
  },

  superAdmin: {
    email: process.env.SUPER_ADMIN_EMAIL,
    password: process.env.SUPER_ADMIN_PASSWORD,
  },

  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: Number(process.env.REDIS_PORT) || 6379,
  },

  kafka: {
    url: process.env.KAFKA_URL,
    groupId: process.env.KAFKA_GROUP_ID || 'nestjs-consumer-group',
  },
};
