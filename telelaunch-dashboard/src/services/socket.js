// src/services/socket.js — Socket.io client singleton
import { io } from 'socket.io-client'

const getBackendUrl = () => {
  const envUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
  if (typeof window !== 'undefined') {
    const currentHost = window.location.hostname;
    try {
      const url = new URL(envUrl);
      if (url.hostname === 'localhost' && currentHost !== 'localhost') {
        url.hostname = currentHost;
      }
      return url.origin;
    } catch (e) {
      return `${window.location.protocol}//${currentHost}:5000`;
    }
  }
  return envUrl;
};

const SOCKET_URL = getBackendUrl();

let socket = null

export function getSocket() {
  if (!socket) {
    socket = io(SOCKET_URL, {
      autoConnect: false,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 10,
    })
  }
  return socket
}

export function connectSocket() {
  const s = getSocket()
  if (!s.connected) {
    s.connect()
    s.emit('join:dashboard')
  }
  return s
}

export function disconnectSocket() {
  if (socket?.connected) {
    socket.disconnect()
  }
}
