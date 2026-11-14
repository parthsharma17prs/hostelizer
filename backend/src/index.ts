import dotenv from 'dotenv';
dotenv.config();

import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import authRoutes from './routes/auth.routes';
import ownerRoutes from './routes/owner.routes';
import adminRoutes from './routes/admin.routes';
import propertyRoutes from './routes/property.routes';
import bookingRoutes from './routes/booking.routes';
import aiRoutes from './routes/ai.routes';
import studioRoutes from './routes/studio.routes';
import assetRoutes from './routes/asset.routes';
import operationsRoutes from './routes/operations.routes';
import { initializeSocketChat } from './sockets/chat.socket';
import { connectMongo } from './models/mongoInit';

dotenv.config();

const app: Express = express();
const httpServer = createServer(app);

// Configure Socket.IO
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Middleware
app.use(cors());
app.use(express.json());

// Request logging middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', service: 'hostelizer-backend', timestamp: new Date() });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/owners', ownerRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/properties', propertyRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/studio', studioRoutes);
app.use('/api/assets', assetRoutes);
app.use('/api/operations', operationsRoutes);

// Socket.io real-time chat initialization
initializeSocketChat(io);

// Global Error Handler
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('Unhandled server error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error'
  });
});

const PORT = process.env.PORT || 5001;

// Connect to MongoDB for MongoDB Compass Inspection
connectMongo();

if (process.env.NODE_ENV !== 'test') {
  httpServer.listen(PORT, () => {
    console.log(`🚀 Hostelizer Backend running on port ${PORT}`);
  });
}

export { app, httpServer, io };

