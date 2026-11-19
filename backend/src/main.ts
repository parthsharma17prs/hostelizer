import 'reflect-metadata';
import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { connectMongo } from './models/mongoInit';
import { initializeSocketChat } from './sockets/chat.socket';
import { Server } from 'socket.io';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    cors: true,
  });

  // Enable JSON and URL-encoded body parsing
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Connect to MongoDB
  await connectMongo();

  const PORT = process.env.PORT || 5001;
  const server = await app.listen(PORT);

  // Initialize Socket.io chat server using the NestJS underlying HTTP server
  const io = new Server(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });
  initializeSocketChat(io);

  console.log(`🚀 Hostelizer Backend running on NestJS on port ${PORT}`);
}

bootstrap();
