import { Server } from "socket.io";
import mongoose from "mongoose";
import { createAdapter } from "@socket.io/redis-adapter";
import { getRedisClient } from "../config/redis.js";

let io;

export const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
    transports: ["polling", "websocket"],
  });

  const redisClient = getRedisClient();
  if (redisClient) {
    try {
      const pubClient = redisClient;
      const subClient = redisClient.duplicate();
      subClient.connect()
        .then(() => {
          io.adapter(createAdapter(pubClient, subClient));
          console.log("Socket.io Redis adapter initialized successfully");
        })
        .catch((err) => {
          console.warn("Failed to connect Socket.io subClient. Fallback to default in-memory adapter. Error:", err.message);
        });
    } catch (err) {
      console.warn("Failed to initialize Socket.io Redis adapter. Fallback to default in-memory adapter. Error:", err.message);
    }
  }

  io.on("connection", (socket) => {
    console.log("connected:", socket.id);

    /**
     * Clients join `tenant:<mongoId>` so kitchen/admin apps only receive realtime events
     * for their restaurant (see `orderController` emits).
     */
    socket.on("joinTenant", (tenantId) => {
      if (tenantId && mongoose.Types.ObjectId.isValid(String(tenantId))) {
        socket.join(`tenant:${String(tenantId)}`);
      }
    });

    socket.on("disconnect", () => {
      console.log("disconnect : ", socket.id);
    });
  });

  return io;
};

export const getIo = () => io;
