import io from 'socket.io-client';

export default defineNuxtPlugin(() => {
  // Initialize socket connection
  const socket = io('/', {
    path: '/socket.io/',
    transports: ['polling', 'websocket'],
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000
  });

  // Connection events for debugging
  socket.on('connect', () => {
    console.log('[Socket Client] Connected to server with ID:', socket.id);
  });

  socket.on('disconnect', (reason) => {
    console.log('[Socket Client] Disconnected:', reason);
  });

  socket.on('connect_error', (error) => {
    console.error('[Socket Client] Connection error:', error.message);
  });

  // Test pong handler
  socket.on('pong', (data) => {
    console.log('[Socket Client] Received pong:', data);
  });

  // Provide socket to the app
  return {
    provide: {
      socket
    }
  };
});