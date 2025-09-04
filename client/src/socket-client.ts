import { io } from "socket.io-client";

const AGENT_URL = import.meta.env.VITE_AGENT_URL || "http://localhost:8000";
const clientSocket = io(AGENT_URL, {
    autoConnect: true,
    transports: ["websocket"],
    path: "/socket.io",
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelayMax: 5000,
});

export const registerWithAgent = (email: string) => {
    if (!email) return;
    const handler = () => clientSocket.emit('register', { email });
    clientSocket.off('connect', handler);
    clientSocket.on('connect', handler);
    if (clientSocket.connected) handler();
}

export {clientSocket}
