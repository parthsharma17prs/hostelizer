import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { AppController } from './app.controller';

// Legacy routes import for backward compatibility
import authRoutes from './routes/auth.routes';
import ownerRoutes from './routes/owner.routes';
import adminRoutes from './routes/admin.routes';
import propertyRoutes from './routes/property.routes';
import bookingRoutes from './routes/booking.routes';
import aiRoutes from './routes/ai.routes';
import studioRoutes from './routes/studio.routes';
import assetRoutes from './routes/asset.routes';
import operationsRoutes from './routes/operations.routes';
import orgRoutes from './routes/org.routes';
import logRoutes from './routes/log.routes';
import v1Router from './v1';

@Module({
  imports: [],
  controllers: [AppController],
  providers: [],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // 1. Request logging middleware
    consumer
      .apply((req: any, res: any, next: any) => {
        console.log(`[NestJS] [${new Date().toISOString()}] ${req.method} ${req.originalUrl || req.url}`);
        next();
      })
      .forRoutes('*');

    // 2. Mount API Routes seamlessly into NestJS Express adapter
    consumer.apply(authRoutes).forRoutes('api/auth');
    consumer.apply(ownerRoutes).forRoutes('api/owners');
    consumer.apply(adminRoutes).forRoutes('api/admin');
    consumer.apply(propertyRoutes).forRoutes('api/properties');
    consumer.apply(bookingRoutes).forRoutes('api/bookings');
    consumer.apply(aiRoutes).forRoutes('api/ai');
    consumer.apply(studioRoutes).forRoutes('api/studio');
    consumer.apply(assetRoutes).forRoutes('api/assets');
    consumer.apply(operationsRoutes).forRoutes('api/operations');
    consumer.apply(orgRoutes).forRoutes('api/orgs');
    consumer.apply(logRoutes).forRoutes('api/log');
    consumer.apply(logRoutes).forRoutes('api/logs');

    // 3. Mount Modular API v1 (Auth, User Profile & KYC Verification)
    consumer.apply(v1Router).forRoutes('api/v1');
  }
}
