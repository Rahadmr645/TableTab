import { Server } from "socket.io"

let io;


export const initSocket = (server) => {

  io = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    },
    transports: ["websocket"],
  });

  io.on("connection", (socket) => {
    console.log("connected:", socket.id);



    //new order from client
    socket.on("newOrder", (order) => {
      
       console.log('server accept new order', order)
      //send to the orderboard
      io.emit("newOrder", order);
      
    });

    //chefs update
    socket.on("updateStatus", (updatesOrder) => {
      console.log("status upadted:", updatesOrder);

      //broadcast updat 
      io.emit("orderUpdated", updatesOrder);
    });

    socket.on("disconnect", () => {
      console.log("disconnect : ", socket.id)
    })
  });

  return io;

}

export const getIo = () => io;