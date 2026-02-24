import { useEffect, useState } from 'react';
import io from 'socket.io-client';

let socket;

export const useSocket = () => {
    const [connected, setConnected] = useState(false);

    useEffect(() => {
        if (!socket) {
            socket = io({
                reconnection: true,
                reconnectionAttempts: Infinity,
                reconnectionDelay: 1000,
                reconnectionDelayMax: 5000,
                timeout: 20000,
            });
        }

        socket.on('connect', () => {
            setConnected(true);
        });

        socket.on('disconnect', () => {
            setConnected(false);
        });

        return () => {
            // Don't disconnect on unmount to keep connection during navigation
            // socket.off('connect');
            // socket.off('disconnect');
        };
    }, []);

    return { socket, connected };
};
