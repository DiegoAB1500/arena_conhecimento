'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSocket } from '@/lib/useSocket';

export default function PlayerJoin() {
  const [pin, setPin] = useState('');
  const [nickname, setNickname] = useState('');
  const [step, setStep] = useState('pin'); // 'pin' or 'nickname'
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { socket, connected } = useSocket();

  useEffect(() => {
    if (socket) {
      socket.on('joinedSuccess', ({ name }) => {
        sessionStorage.setItem('playerName', name);
        sessionStorage.setItem('gamePin', pin);
        router.push('/play/waiting');
      });

      socket.on('error', (msg) => {
        setError(msg);
        setLoading(false);
      });
    }
    return () => {
      if (socket) {
        socket.off('joinedSuccess');
        socket.off('error');
      }
    };
  }, [socket, router]);

  const handlePinSubmit = (e) => {
    e.preventDefault();
    if (pin.length >= 6) {
      setStep('nickname');
      setError('');
    } else {
      setError('PIN inválido');
    }
  };

  const handleJoin = (e) => {
    e.preventDefault();
    if (!nickname) return setError('Insira um apelido');

    setLoading(true);
    if (socket) {
      let playerId = sessionStorage.getItem('playerId');
      if (!playerId) {
        playerId = 'p_' + Math.random().toString(36).substr(2, 9);
        sessionStorage.setItem('playerId', playerId);
      }
      socket.emit('joinRoom', { pin, name: nickname, playerId });
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--kahoot-purple)] p-4">
      <h1 className="text-4xl md:text-6xl font-black text-white mb-12 italic uppercase tracking-tighter text-center">Arena do Conhecimento</h1>

      <div className="kahoot-card w-full max-w-sm shadow-2xl">
        <form onSubmit={step === 'pin' ? handlePinSubmit : handleJoin} className="flex flex-col gap-4">
          <h2 className="text-2xl font-bold text-center mb-2">
            {step === 'pin' ? 'Digite o PIN' : 'Seu Apelido'}
          </h2>

          {step === 'pin' ? (
            <input
              type="text"
              placeholder="000000"
              maxLength={7}
              className="p-4 border-2 border-gray-200 rounded-lg text-center text-3xl font-black outline-none focus:border-[var(--kahoot-purple)]"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              autoFocus
            />
          ) : (
            <input
              type="text"
              placeholder="Apelido"
              className="p-4 border-2 border-gray-200 rounded-lg text-center text-2xl font-bold outline-none focus:border-[var(--kahoot-purple)]"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              autoFocus
            />
          )}

          {error && <p className="text-red-500 text-center font-bold">{error}</p>}

          <button
            type="submit"
            disabled={loading || !connected}
            className={`kahoot-button bg-neutral-800 text-white w-full text-xl py-4 font-black mt-2 ${loading || !connected ? 'opacity-50' : 'hover:bg-neutral-900'}`}
          >
            {loading ? 'ENTRANDO...' : 'ENTRAR'}
          </button>
        </form>
      </div>

      {!connected && (
        <p className="text-white mt-8 font-medium animate-pulse">Conectando ao servidor...</p>
      )}
    </div>
  );
}
