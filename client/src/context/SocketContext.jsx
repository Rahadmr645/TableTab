import { useEffect, useState } from "react";
import { createContext } from "react";

import { io } from "socket.io-client";

export const SocketContext = createContext();


export const SocketContextProvider =  ({ children }) => {


    const [socket, setSocket] = useState(null)


    const URL = 'http://10.229.115.227:5000';

    // connect with socket 
     useEffect(() => {
        const newSocket = io(URL, { transports: ["websocket"] }); // lowercase 'websocket'

        newSocket.on('connect', () => {
            console.log('Socket connected:', newSocket.id);
        });

        newSocket.on('disconnect', () => {
            console.log('Socket disconnected:', newSocket.id);
        });

        setSocket(newSocket);

        return () => {
            newSocket.disconnect();
        };
    }, []);



    const socketContextVelue = {
        URL,
        socket,

    }



    return (
        <SocketContext.Provider value={socketContextVelue}>
            {children}
        </SocketContext.Provider>
    )
}

