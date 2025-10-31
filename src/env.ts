/**
 * Environment variable validation and configuration
 * Following LEGENDARYUM pattern for env validation
 */

import pc from 'picocolors';

interface Env {
  NODE_ENV: string;
  PORT: string;
  HOST: string;
  MONGODB_URL: string;
  CORS_ORIGIN: string;
  LOG_LEVEL: string;
  SERVICE_NAME: string;
  JWT_SECRET_KEY: string;
}

/**
 * Get environment variable or fail with error
 */
export function getEnvOrFail(key: keyof Env): string {
  const value = process.env[key];
  if (!value) {
    console.error(pc.red(`❌ Missing required environment variable: ${key}`));
    process.exit(1);
  }
  return value;
}

/**
 * Get environment variable with default value
 */
export function getEnv(key: keyof Env, defaultValue: string): string {
  return process.env[key] ?? defaultValue;
}

/**
 * Validate all required environment variables at startup
 */
export function validateEnv(): void {
  const required: (keyof Env)[] = ['MONGODB_URL', 'PORT', 'NODE_ENV', 'JWT_SECRET_KEY'];

  let hasErrors = false;

  required.forEach((key) => {
    if (!process.env[key]) {
      console.error(pc.red(`❌ Missing required environment variable: ${key}`));
      hasErrors = true;
    }
  });

  if (hasErrors) {
    console.error(
      pc.red(
        '\n⚠️  Please check your .env file and ensure all required variables are set.\n'
      )
    );
    process.exit(1);
  }

  console.log(pc.green('✓ Environment variables validated successfully'));
}

/**
 * Get current environment
 */
export function isDevelopment(): boolean {
  return getEnv('NODE_ENV', 'development') === 'development';
}

export function isProduction(): boolean {
  return getEnv('NODE_ENV', 'development') === 'production';
}
