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
        <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--kahoot-purple)] p-4">
            <h1 className="text-4xl md:text-6xl font-black text-white mb-12 italic uppercase tracking-tighter text-center">Arena do Conhecimento</h1>
            <div className="kahoot-card w-full max-w-md">
                <h2 className="text-2xl font-bold mb-6 text-center">Login do Professor</h2>
                <form onSubmit={handleLogin} className="flex flex-col gap-4">
                    <input
                        type="password"
                        placeholder="Senha do Professor"
                        className="p-3 border-2 border-gray-200 rounded-lg outline-none focus:border-[var(--kahoot-purple)]"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                    />
                    {error && <p className="text-red-500 text-sm">{error}</p>}
                    <button type="submit" className="kahoot-button btn-purple w-full">
                        Entrar
                    </button>
                </form>
            </div>
        </div>
    );
}
