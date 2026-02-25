'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function PlayerFinal() {
    const [name, setName] = useState('');
    const router = useRouter();

    useEffect(() => {
        setName(sessionStorage.getItem('playerName') || 'Jogador');
    }, []);

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--arena-primary-dark)] p-8 text-white text-center">
            <h1 className="text-5xl md:text-7xl font-black mb-12 uppercase tracking-tighter text-center italic">Fim de Jogo!</h1>

            <div className="arena-card p-10 md:p-16 rounded-[3rem] mb-12 w-full max-w-lg shadow-[0_32px_64px_-16px_rgba(0,0,0,0.5)] relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-3 bg-gradient-to-r from-emerald-500 via-emerald-400 to-emerald-600"></div>
                <p className="text-emerald-600 font-black uppercase tracking-[0.3em] text-sm mb-6">Grande Finalista</p>
                <p className="text-4xl md:text-6xl font-black mb-10 text-slate-800 break-words drop-shadow-sm">{name}</p>
                <div className="w-full h-px bg-slate-100 mb-8"></div>
                <p className="text-xl md:text-2xl font-bold text-slate-500 leading-relaxed italic">Confira sua posição no ranking projetado na tela principal!</p>
            </div>

            <button
                onClick={() => {
                    sessionStorage.clear();
                    router.push('/');
                }}
                className="arena-button bg-white text-slate-900 border-b-8 border-slate-200 text-2xl px-16 py-6 font-black shadow-2xl hover:scale-110 active:scale-95 transition-all"
            >
                SAIR DA ARENA
            </button>
        </div>
    );
}
