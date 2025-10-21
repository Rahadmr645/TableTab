import { Server } from "socket.io"

let io ;


export const initSocket = (server) => 
{
   io = new Server(server, {
     cors: {
       origin : [
         "*"
         ],
         methods: ["GET","POST"],
     },
   });
   
   io.on("connection", (socket) => {
     console.log("connected:", socket.id);
  
   
   //new order from client
   socket.on("newOrder", (order) => {
     console.log("newOrder:", order);
     
     //send to the orderboard
     io.emit("OrderAdded", order);
   });
   
      //chefs update
      socket.on("updateStatus", (updatesOrder) => {
        console.log("status upadted:", updatedOrder);
        
        //broadcast updat 
        io.emit("orderUpdated", updatedOrder);
      });
      
      socket.on("disconnect", () => {
        console.log("disconnect : ",  socket.id)
      })
   });
   
   return io;
   
}

export const getIo = () => io;