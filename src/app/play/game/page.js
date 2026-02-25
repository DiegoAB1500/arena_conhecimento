'use client';

import { useState, useEffect, useRef } from 'react';
import { useSocket } from '@/lib/useSocket';
import { useRouter } from 'next/navigation';

const SYMBOLS = ['A', 'B', 'C', 'D'];
const COLORS = ['bg-accent-1', 'bg-accent-2', 'bg-accent-3', 'bg-accent-4'];

export default function PlayerGame() {
    const [question, setQuestion] = useState(null);
    const [status, setStatus] = useState(() => {
        if (typeof window === 'undefined') return 'WAITING';
        if (sessionStorage.getItem('lastFeedback')) return 'FEEDBACK';
        return sessionStorage.getItem('selectedAnswer') !== null ? 'SUBMITTED' : 'WAITING';
    });
    const [feedback, setFeedback] = useState(() => {
        if (typeof window === 'undefined') return null;
        const saved = sessionStorage.getItem('lastFeedback');
        return saved ? JSON.parse(saved) : null;
    });
    const [selectedAnswer, setSelectedAnswer] = useState(() => {
        if (typeof window === 'undefined') return null;
        const saved = sessionStorage.getItem('selectedAnswer');
        return saved !== null ? parseInt(saved) : null;
    });
    const statusRef = useRef(status);
    const { socket } = useSocket();
    const router = useRouter();

    // Keep statusRef updated
    useEffect(() => {
        statusRef.current = status;
    }, [status]);

    useEffect(() => {
        if (socket) {
            socket.on('connect', () => {
                console.log('Socket conectado, tentando reentrar...');
                const savedPin = sessionStorage.getItem('gamePin');
                const savedName = sessionStorage.getItem('playerName');
                const savedPlayerId = sessionStorage.getItem('playerId');
                if (savedPin && savedName && savedPlayerId) {
                    socket.emit('joinRoom', { pin: savedPin, name: savedName, playerId: savedPlayerId });
                }
            });

            socket.on('error', (msg) => {
                console.error('Erro de conexão:', msg);
                // If the PIN is invalid or game ended, go back to join
                router.push('/');
            });

            socket.on('newQuestion', (q) => {
                setQuestion(q);
                setStatus('ANSWERING');
                setFeedback(null);
                setSelectedAnswer(null); // Clear previous selection
                sessionStorage.removeItem('selectedAnswer'); // Clear persistence
                sessionStorage.removeItem('lastFeedback'); // Clear feedback persistence
            });

            socket.on('answerFeedback', (data) => {
                setFeedback(data);
                setStatus('FEEDBACK');
                if (data) sessionStorage.setItem('lastFeedback', JSON.stringify(data));
            });

            socket.on('questionResults', (data) => {
                const currentStatus = statusRef.current;
                if (currentStatus === 'ANSWERING') {
                    setStatus('TIMEOUT');
                } else if (currentStatus === 'SUBMITTED') {
                    // Fallback: if we are stuck in SUBMITTED when results arrive, 
                    // it means we might have missed the 'answerFeedback' event.
                    socket.emit('getGameState', { playerId: sessionStorage.getItem('playerId') });
                }
            });

            socket.on('finalRanking', () => {
                router.push('/play/final');
            });

            socket.on('gameStateUpdate', (data) => {
                const currentStatus = statusRef.current;
                // Only update if we are not in a final state for the current question
                if (data.currentQuestion) {
                    setQuestion(data.currentQuestion);

                    if (data.status === 'PLAYING') {
                        // Restore SUBMITTED state if player already answered
                        if (data.hasAnswered) {
                            // Only set to SUBMITTED if we're not already in a more final state
                            if (currentStatus !== 'FEEDBACK' && currentStatus !== 'TIMEOUT') {
                                const option = data.selectedOption !== null ? data.selectedOption : parseInt(sessionStorage.getItem('selectedAnswer'));
                                setSelectedAnswer(option);
                                setStatus('SUBMITTED');
                            }
                        } else {
                            // Recovery from sessionStorage if server didn't catch it yet
                            const savedAnswer = sessionStorage.getItem('selectedAnswer');
                            if (savedAnswer !== null) {
                                setSelectedAnswer(parseInt(savedAnswer));
                                setStatus('SUBMITTED');
                            } else if (currentStatus !== 'SUBMITTED' && currentStatus !== 'FEEDBACK' && currentStatus !== 'TIMEOUT') {
                                setStatus('ANSWERING');
                            }
                        }
                    } else if (data.status === 'RESULTS' || data.status === 'FINAL_RANKING') {
                        // Restore FEEDBACK state if available
                        const fb = data.myFeedback || feedback || { correct: false, points: 0, totalScore: 0, isDefault: true };
                        setFeedback(fb);
                        sessionStorage.setItem('lastFeedback', JSON.stringify(fb));
                        setStatus('FEEDBACK');
                    } else if (data.status === 'LOBBY') {
                        router.push('/play/waiting');
                    }
                }
            });

            socket.on('joinedSuccess', (data) => {
                if (data.isReconnection) {
                    console.log('Reconexão bem-sucedida!');
                    // Only submut if we have a saved answer and server doesn't know it yet
                    const savedAnswer = sessionStorage.getItem('selectedAnswer');
                    if (savedAnswer !== null) {
                        socket.emit('submitAnswer', { optionIndex: parseInt(savedAnswer) });
                    }
                }
            });

            // Auto-rejoin on refresh
            const savedPin = sessionStorage.getItem('gamePin');
            const savedName = sessionStorage.getItem('playerName');
            const savedPlayerId = sessionStorage.getItem('playerId');

            if (savedPin && savedName && savedPlayerId) {
                socket.emit('joinRoom', { pin: savedPin, name: savedName, playerId: savedPlayerId });
            } else {
                socket.emit('getGameState', { playerId: savedPlayerId });
            }
        }

        return () => {
            if (socket) {
                socket.off('connect');
                socket.off('error');
                socket.off('newQuestion');
                socket.off('answerFeedback');
                socket.off('questionResults');
                socket.off('finalRanking');
                socket.off('gameStateUpdate');
                socket.off('joinedSuccess');
            }
        };
    }, [socket, router]);

    const handleAnswer = (index) => {
        if (status === 'ANSWERING' && socket) {
            socket.emit('submitAnswer', { optionIndex: index });
            setSelectedAnswer(index);
            setStatus('SUBMITTED');
            sessionStorage.setItem('selectedAnswer', index.toString());
        }
    };

    if (status === 'WAITING' || !question) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[var(--arena-primary-dark)] text-white p-4 text-center">
                <div className="flex flex-col items-center">
                    <div className="w-20 h-20 border-4 border-white/20 border-t-white rounded-full animate-spin mb-8"></div>
                    <h2 className="text-3xl font-black uppercase tracking-widest animate-pulse">Prepare-se para a Arena!</h2>
                </div>
            </div>
        );
    }

    if (status === 'SUBMITTED') {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--arena-primary-dark)] text-white p-6 text-center">
                <div className={`w-32 h-32 ${selectedAnswer !== null ? COLORS[selectedAnswer] : 'bg-white/10'} rounded-3xl flex items-center justify-center mb-8 shadow-2xl animate-bounce border-4 border-white/20`}>
                    <span className="text-7xl font-black">
                        {selectedAnswer !== null ? SYMBOLS[selectedAnswer] : '✔'}
                    </span>
                </div>
                <h2 className="text-3xl md:text-5xl font-black mb-4 uppercase tracking-tight">Resposta Enviada!</h2>
                <p className="text-xl opacity-60 mb-10">Mantenha o foco, os outros jogadores estão respondendo...</p>

                {selectedAnswer !== null && (
                    <div className="bg-white/5 px-8 py-4 rounded-2xl border border-white/10 backdrop-blur-md">
                        <span className="font-bold text-lg text-white/80 uppercase tracking-widest">Sua escolha: <span className="text-white text-2xl ml-2 font-black leading-none">{SYMBOLS[selectedAnswer]}</span></span>
                    </div>
                )}
            </div>
        );
    }

    if (status === 'TIMEOUT') {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-gray-500 text-white p-4 text-center">
                <h2 className="text-4xl font-black mb-4 uppercase italic">Tempo Esgotado!</h2>
                <p className="text-xl">Você não respondeu a tempo.</p>
            </div>
        );
    }

    if (status === 'FEEDBACK') {
        // Fallback if data is still missing (should be rare now)
        const displayFeedback = feedback || { correct: false, points: 0, totalScore: 0 };

        return (
            <div className={`min-h-screen flex flex-col items-center justify-center p-6 text-white text-center transition-colors duration-700 ${displayFeedback.correct ? 'bg-emerald-600' : 'bg-rose-600'}`}>
                <div className="mb-8 scale-150 drop-shadow-2xl">
                    <span className="text-9xl">{displayFeedback.correct ? '🎉' : '💤'}</span>
                </div>
                <h2 className="text-5xl md:text-7xl font-black mb-6 uppercase tracking-tighter">
                    {displayFeedback.correct ? 'BRILHANTE!' : 'NÃO FOI DESSA VEZ'}
                </h2>
                <div className="bg-black/25 px-10 py-8 rounded-3xl backdrop-blur-xl border border-white/10 shadow-2xl scale-110">
                    <p className="text-3xl font-black tracking-tight">+{displayFeedback.points} PONTOS</p>
                    <div className="w-full h-px bg-white/20 my-4"></div>
                    <p className="text-xl font-bold opacity-70">PLACAR TOTAL: {displayFeedback.totalScore}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col bg-slate-50">
            <div className="p-5 bg-white shadow-md flex justify-between items-center px-8 border-b-4 border-slate-100">
                <span className="font-black text-[var(--arena-primary)] bg-slate-100 px-4 py-2 rounded-xl uppercase tracking-widest text-sm">Arena - Questão</span>
                <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center font-black text-slate-400">
                    ID
                </div>
            </div>

            <div className="flex-1 grid grid-cols-2 gap-4 p-4">
                {question.options.map((_, i) => (
                    <button
                        key={i}
                        onClick={() => handleAnswer(i)}
                        disabled={status !== 'ANSWERING'}
                        className={`option-card ${COLORS[i]} h-full active:brightness-90 flex items-center justify-center group focus:ring-8 focus:ring-white/50 outline-none`}
                    >
                        <span className="text-9xl sm:text-[10rem] md:text-[14rem] font-black leading-none drop-shadow-lg group-hover:scale-110 transition-transform">
                            {SYMBOLS[i]}
                        </span>
                    </button>
                ))}
            </div>
        </div>
    );
}
