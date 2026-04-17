import { Server } from "socket.io";

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

    // Do not relay client-supplied "newOrder" / "updateStatus" payloads — they can lack
    // dailyOrderNumber, invoiceSerial, etc. Broadcasts only from orderController after DB save.

    socket.on("disconnect", () => {
      console.log("disconnect : ", socket.id);
    });
  });

  return io;
};

export const getIo = () => io;
