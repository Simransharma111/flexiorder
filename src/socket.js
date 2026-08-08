import { io } from "socket.io-client";
import { SOCKET_URL } from "./config/env";

const socket = io(SOCKET_URL || undefined, {
  autoConnect: true,
  transports: ["websocket", "polling"],
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 10000,
});

if (!SOCKET_URL && import.meta.env.DEV) {
  console.info("VITE_SOCKET_URL is not configured; Socket.IO uses the current origin.");
}

export default socket;
