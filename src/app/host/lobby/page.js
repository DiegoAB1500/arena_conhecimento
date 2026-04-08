'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useSocket } from '@/lib/useSocket';
import QRCode from 'react-qr-code';

function LobbyContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const pin = searchParams.get('pin');
    const [players, setPlayers] = useState([]);
    const [joinUrl, setJoinUrl] = useState('');
    const { socket } = useSocket();

    useEffect(() => {
        if (typeof window !== 'undefined') {
            // Using the hardcoded render URL provided by the user
            setJoinUrl(`https://arena-conhecimento.onrender.com/?pin=${pin}`);
        }

        if (socket) {
            socket.on('playerJoined', (updatedPlayers) => {
                setPlayers(updatedPlayers);
            });

            socket.on('newQuestion', () => {
                router.push('/host/game');
            });
        }
        return () => {
            if (socket) {
                socket.off('playerJoined');
                socket.off('newQuestion');
            }
        };
    }, [socket, router]);

    const handleStart = () => {
        if (socket) {
            socket.emit('startGame');
        }
    };

    return (
        <div className="min-h-screen bg-[var(--arena-primary-dark)] flex flex-col font-sans">
            <div className="bg-white p-6 md:p-10 shadow-xl flex flex-col md:flex-row justify-between items-center px-6 md:px-16 gap-6 border-b-8 border-[var(--arena-primary)]">
                <div className="flex items-center gap-8">
                    <div className="flex flex-col items-center md:items-start">
                        <span className="text-slate-400 font-black uppercase text-xs md:text-sm tracking-widest">Código da Arena:</span>
                        <span className="text-5xl md:text-7xl font-black text-slate-800 tracking-tighter">{pin}</span>
                    </div>

                    {joinUrl && (
                        <div className="hidden md:flex bg-white p-3 rounded-2xl shadow-inner border-2 border-slate-100 flex-col items-center gap-2">
                            <div className="w-32 h-32">
                                <QRCode
                                    value={joinUrl}
                                    size={128}
                                    style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                                    viewBox={`0 0 128 128`}
                                />
                            </div>
                            <span className="text-xs font-black uppercase text-slate-400 tracking-widest leading-none">Aponte a<br />Câmera</span>
                        </div>
                    )}
                </div>

                <div className="text-center hidden lg:block">
                    <h2 className="text-2xl font-black uppercase tracking-tight text-slate-400">Arena do Conhecimento</h2>
                    <div className="h-1 w-12 bg-[var(--arena-primary)] mx-auto mt-2 rounded-full"></div>
                </div>
                <div className="w-full md:w-auto">
                    <button
                        onClick={handleStart}
                        disabled={players.length === 0}
                        className={`arena-button btn-primary text-xl md:text-3xl py-5 md:py-8 px-10 md:px-16 w-full md:w-auto uppercase tracking-widest shadow-2xl ${players.length === 0 ? 'opacity-30' : 'hover:scale-105 hover:shadow-[0_0_30px_rgba(16,185,129,0.4)]'}`}
                    >
                        {players.length === 0 ? 'Aguardando...' : 'COMEÇAR AGORA'}
                    </button>
                </div>
            </div>

            <div className="flex-1 p-8 md:p-16 overflow-y-auto">
                <div className="flex justify-between items-center mb-12 bg-white/5 border border-white/10 p-6 rounded-3xl backdrop-blur-sm">
                    <h3 className="text-2xl md:text-4xl font-black text-white uppercase tracking-tight">
                        {players.length} {players.length === 1 ? 'Competidor' : 'Competidores'} na Arena
                    </h3>
                    <div className="flex gap-2">
                        <div className="w-3 h-3 bg-emerald-400 rounded-full animate-ping"></div>
                        <div className="w-3 h-3 bg-emerald-400 rounded-full"></div>
                    </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
                    {players.map((player) => (
                        <div key={player.id} className="bg-white/10 backdrop-blur-xl px-6 py-4 rounded-2xl text-white font-black text-xl md:text-2xl border border-white/20 shadow-lg flex items-center justify-center text-center animate-in zoom-in duration-500 hover:bg-white/20 transition-all border-b-4 border-white/10">
                            {player.name}
                        </div>
                    ))}
                    {players.length === 0 && (
                        <div className="col-span-full py-32 text-center">
                            <div className="w-24 h-x-px bg-white/20 mx-auto mb-8"></div>
                            <p className="text-white text-3xl md:text-5xl font-black uppercase tracking-widest animate-pulse opacity-50 italic">Aguardando entrada...</p>
                            <p className="text-white/40 text-xl mt-6 font-bold">Convide os participantes para entrar agora!</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default function HostLobby() {
    return (
        <Suspense fallback={<div>Carregando...</div>}>
            <LobbyContent />
        </Suspense>
    );
}
