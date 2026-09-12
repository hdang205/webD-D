import dotenv from 'dotenv';
dotenv.config();

export const SERVER_CONFIG = {
  PORT: process.env.PORT ? parseInt(process.env.PORT, 10) : 3000,
  JWT_SECRET: process.env.JWT_SECRET || 'dd-fashion-erp-jwt-secret-key-2026-secure',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '24h',
  NODE_ENV: process.env.NODE_ENV || 'development',
};

export default SERVER_CONFIG;
