import { Server, Socket } from 'socket.io';

interface ChatMessagePayload {
  conversationId: string;
  senderId: string;
  content: string;
  propertyId: string;
  senderName?: string;
}

export function initializeSocketChat(io: Server) {
  io.on('connection', (socket: Socket) => {
    console.log(`[Socket.IO] Client connected: ${socket.id}`);

    // Join room for a specific conversation / property
    socket.on('join_conversation', (conversationId: string) => {
      socket.join(conversationId);
      console.log(`[Socket.IO] Socket ${socket.id} joined conversation: ${conversationId}`);
    });

    // Leave room
    socket.on('leave_conversation', (conversationId: string) => {
      socket.leave(conversationId);
    });

    // Send and broadcast chat messages
    socket.on('send_message', (payload: ChatMessagePayload) => {
      const messageData = {
        ...payload,
        id: 'msg_' + Date.now(),
        timestamp: new Date().toISOString()
      };
      
      // Emit to everyone in the conversation room
      io.to(payload.conversationId).emit('new_message', messageData);
    });

    socket.on('disconnect', () => {
      console.log(`[Socket.IO] Client disconnected: ${socket.id}`);
    });
  });
}

