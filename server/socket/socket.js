import { Server } from "socket.io";
import mongoose from "mongoose";

let io;

export const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
    transports: ["websocket"],
  });

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
