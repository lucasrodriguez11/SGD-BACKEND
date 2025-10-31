/**
 * MongoDB/Mongoose connection manager
 * Following LEGENDARYUM pattern for database management
 */

import mongoose from 'mongoose';
import { getEnvOrFail } from '@/env';
import { createLogger } from '@/logger';

const logger = createLogger('DATABASE');

export class Mongoose {
  private static instance: Mongoose | null = null;
  private connection: typeof mongoose | null = null;

  private constructor() {}

  /**
   * Initialize MongoDB connection
   */
  private async connect(): Promise<void> {
    try {
      const mongoUrl = getEnvOrFail('MONGODB_URL');

      // Configure mongoose
      mongoose.set('strictQuery', false);

      // Connect to MongoDB
      this.connection = await mongoose.connect(mongoUrl, {
        maxPoolSize: 10,
        minPoolSize: 2,
        socketTimeoutMS: 45000,
        serverSelectionTimeoutMS: 5000,
      });

      // Event listeners
      mongoose.connection.on('connected', () => {
        logger.info('MongoDB connected successfully');
      });

      mongoose.connection.on('error', (err) => {
        logger.error({ err }, 'MongoDB connection error');
      });

      mongoose.connection.on('disconnected', () => {
        logger.warn('MongoDB disconnected');
      });

      logger.info(
        `✓ MongoDB Connected: ${mongoose.connection.host}:${mongoose.connection.port}/${mongoose.connection.name}`
      );
    } catch (error) {
      logger.error({ error }, 'Failed to connect to MongoDB');
      throw error;
    }
  }

  /**
   * Start the database connection
   */
  public static async start(): Promise<void> {
    if (this.instance) {
      logger.warn('MongoDB already initialized');
      return;
    }

    this.instance = new Mongoose();
    await this.instance.connect();
    console.log('\x1b[32m%s\x1b[0m', '🗄️  Database connected');
  }

  /**
   * Stop the database connection
   */
  public static async stop(): Promise<void> {
    if (this.instance?.connection) {
      await mongoose.disconnect();
      this.instance = null;
      logger.info('MongoDB connection closed');
    }
  }

  /**
   * Check if database is healthy
   */
  public static async isHealthy(): Promise<boolean> {
    try {
      if (!this.instance) {
        return false;
      }

      const state = mongoose.connection.readyState;
      // 0 = disconnected, 1 = connected, 2 = connecting, 3 = disconnecting
      return state === 1;
    } catch (error) {
      logger.error({ error }, 'Health check failed');
      return false;
    }
  }

  /**
   * Get mongoose instance
   */
  public static getConnection(): typeof mongoose {
    if (!this.instance?.connection) {
      throw new Error('Database not initialized. Call Mongoose.start() first');
    }
    return this.instance.connection;
  }
}



