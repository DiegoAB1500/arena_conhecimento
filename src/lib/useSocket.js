import { useEffect, useState } from 'react';
import io from 'socket.io-client';

let socket;

export const useSocket = () => {
    const [connected, setConnected] = useState(socket ? socket.connected : false);

    useEffect(() => {
        if (!socket) {
            socket = io({
                reconnection: true,
                reconnectionAttempts: Infinity,
                reconnectionDelay: 1000,
                reconnectionDelayMax: 5000,
                timeout: 20000,
            });
        } else {
            // Se o socket já existe, sincroniza o estado de conexão imediatamente
            setConnected(socket.connected);
        }

        const onConnect = () => setConnected(true);
        const onDisconnect = () => setConnected(false);

        socket.on('connect', onConnect);
        socket.on('disconnect', onDisconnect);

        return () => {
            // Remove apenas os listeners deste componente para evitar vazamento de memória e estado preso
            socket.off('connect', onConnect);
            socket.off('disconnect', onDisconnect);
        };
    }, []);

    return { socket, connected };
};
