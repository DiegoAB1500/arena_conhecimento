'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSocket } from '@/lib/useSocket';

export default function PlayerWaiting() {
    const [name, setName] = useState('');
    const router = useRouter();
    const { socket } = useSocket();

    useEffect(() => {
        setName(sessionStorage.getItem('playerName') || 'Jogador');

        if (socket) {
            socket.on('newQuestion', () => {
                router.push('/play/game');
            });

            socket.on('gameStateUpdate', (data) => {
                if (data.status === 'PLAYING' || data.status === 'RESULTS') {
                    router.push('/play/game');
                }
            });

            // Auto-rejoin on refresh
            const savedPin = sessionStorage.getItem('gamePin');
            const savedName = sessionStorage.getItem('playerName');
            const savedPlayerId = sessionStorage.getItem('playerId');

            if (savedPin && savedName && savedPlayerId) {
                socket.emit('joinRoom', { pin: savedPin, name: savedName, playerId: savedPlayerId });
            }
        }

        return () => {
            if (socket) {
                socket.off('newQuestion');
                socket.off('gameStateUpdate');
            }
        };
    }, [socket, router]);

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--arena-primary-dark)] p-4 text-white text-center">
            <h2 className="text-3xl md:text-5xl font-black mb-8 uppercase tracking-tighter italic">Você está na Arena!</h2>

            <div className="arena-card p-8 md:p-12 rounded-[2.5rem] mb-10 w-full max-w-sm shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-emerald-500 to-emerald-400"></div>
                <p className="text-emerald-600 font-black uppercase tracking-widest text-sm mb-4">Guerreiro Conectado</p>
                <p className="text-4xl md:text-5xl font-black text-slate-800 drop-shadow-sm">{name}</p>
            </div>

            <div className="flex flex-col items-center gap-6">
                <div className="flex justify-center gap-3">
                    <div className="w-4 h-4 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-4 h-4 bg-emerald-300 rounded-full animate-bounce" style={{ animationDelay: '200ms' }}></div>
                    <div className="w-4 h-4 bg-emerald-200 rounded-full animate-bounce" style={{ animationDelay: '400ms' }}></div>
                </div>
                <p className="text-xl md:text-2xl font-bold text-emerald-100/80 animate-pulse uppercase tracking-wide">Aguardando o início da batalha...</p>
            </div>
        </div>
    );
}
