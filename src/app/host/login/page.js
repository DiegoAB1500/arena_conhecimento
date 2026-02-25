'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function HostLogin() {
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const router = useRouter();

    const handleLogin = async (e) => {
        e.preventDefault();
        const res = await fetch('/api/host/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password }),
        });

        if (res.ok) {
            localStorage.setItem('hostToken', 'logged-in');
            router.push('/host/dashboard');
        } else {
            setError('Senha incorreta');
        }
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--arena-primary-dark)] p-6">
            <h1 className="text-4xl md:text-7xl font-black text-white mb-16 uppercase tracking-tight text-center">Arena do Conhecimento</h1>
            <div className="arena-card w-full max-w-md shadow-2xl border-t-8 border-[var(--arena-primary)]">
                <h2 className="text-2xl font-black mb-8 text-center uppercase tracking-widest text-slate-400">Portal do Professor</h2>
                <form onSubmit={handleLogin} className="flex flex-col gap-6">
                    <input
                        type="password"
                        placeholder="Insira sua senha de acesso"
                        className="p-4 border-2 border-slate-100 bg-slate-50 rounded-2xl outline-none focus:border-[var(--arena-primary)] focus:bg-white transition-all text-center text-xl font-bold"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        autoFocus
                    />
                    {error && <p className="text-rose-500 text-center font-bold bg-rose-50 p-2 rounded-lg">{error}</p>}
                    <button type="submit" className="arena-button btn-primary w-full py-5 text-xl uppercase tracking-widest font-black shadow-lg">
                        ACESSAR ARENA
                    </button>
                </form>
            </div>
        </div>
    );
}
