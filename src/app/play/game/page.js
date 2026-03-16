'use client';

import { useState, useEffect, useRef } from 'react';
import { useSocket } from '@/lib/useSocket';
import { useRouter } from 'next/navigation';

const SYMBOLS = ['A', 'B', 'C', 'D'];
const COLORS = ['bg-accent-1', 'bg-accent-2', 'bg-accent-3', 'bg-accent-4'];

export default function PlayerGame() {
    const [question, setQuestion] = useState(null);
    const [totalQuestions, setTotalQuestions] = useState(0);
    const [currentQuestionNumber, setCurrentQuestionNumber] = useState(0);
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
                // Always allow late joiners to answer the next question
                setQuestion(q);
                setStatus('ANSWERING');
                setFeedback(null);
                setSelectedAnswer(null);
                sessionStorage.removeItem('selectedAnswer');
                sessionStorage.removeItem('lastFeedback');
                if (q.totalQuestions) setTotalQuestions(q.totalQuestions);
                if (q.currentQuestionNumber) setCurrentQuestionNumber(q.currentQuestionNumber);
            });

            socket.on('answerFeedback', (data) => {
                // Late joiners should stay on WAITING_NEXT, not transition to FEEDBACK
                if (statusRef.current === 'WAITING_NEXT') return;
                setFeedback(data);
                setStatus('FEEDBACK');
                if (data) sessionStorage.setItem('lastFeedback', JSON.stringify(data));
            });

            socket.on('questionResults', (data) => {
                const currentStatus = statusRef.current;
                // Late joiners should stay on WAITING_NEXT through the results phase
                if (currentStatus === 'WAITING_NEXT') return;
                if (currentStatus === 'ANSWERING') {
                    setStatus('TIMEOUT');
                } else if (currentStatus === 'SUBMITTED') {
                    // Fallback: if we are stuck in SUBMITTED when results arrive,
                    // it means we might have missed the 'answerFeedback' event.
                    socket.emit('getGameState', { playerId: sessionStorage.getItem('playerId') });
                }
            });

            socket.on('finalRanking', (data) => {
                if (data.position) sessionStorage.setItem('finalPosition', data.position.toString());
                if (data.totalPlayers) sessionStorage.setItem('totalPlayers', data.totalPlayers.toString());
                if (data.score !== undefined) sessionStorage.setItem('finalScore', data.score.toString());
                router.push('/play/final');
            });

            socket.on('gameStateUpdate', (data) => {
                const currentStatus = statusRef.current;
                // Only update if we are not in a final state for the current question
                if (data.currentQuestion) {
                    setQuestion(data.currentQuestion);
                    if (data.totalQuestions) setTotalQuestions(data.totalQuestions);
                    if (data.currentQuestionNumber) setCurrentQuestionNumber(data.currentQuestionNumber);

                    if (data.status === 'PLAYING') {
                        if (data.joinedLate) {
                            setStatus('WAITING_NEXT');
                        } else if (data.hasAnswered) {
                            // Restore SUBMITTED state if player already answered
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
                            } else if (currentStatus !== 'SUBMITTED' && currentStatus !== 'FEEDBACK' && currentStatus !== 'TIMEOUT' && currentStatus !== 'WAITING_NEXT') {
                                setStatus('ANSWERING');
                            }
                        }
                    } else if (data.status === 'RESULTS' || data.status === 'FINAL_RANKING') {
                        // Late joiners should stay on WAITING_NEXT through the results phase
                        if (currentStatus === 'WAITING_NEXT') return;
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

    if (status === 'WAITING_NEXT') {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--arena-primary-dark)] text-white p-6 text-center">
                <div className="w-20 h-20 border-4 border-white/20 border-t-amber-400 rounded-full animate-spin mb-8"></div>
                <h2 className="text-3xl md:text-5xl font-black mb-6 uppercase tracking-tight text-amber-400">Jogo em Andamento</h2>
                <div className="bg-white/10 p-6 rounded-2xl border border-white/20 backdrop-blur-sm max-w-md">
                    <p className="text-xl md:text-2xl font-bold leading-relaxed">Espere a próxima questão ser iniciada para responder.</p>
                    <div className="w-12 h-1 bg-white/20 mx-auto my-4 rounded-full"></div>
                    <p className="text-lg opacity-80 italic">Você começará com 0 pontos.</p>
                </div>
            </div>
        );
    }

    if (status === 'SUBMITTED') {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--arena-primary-dark)] text-white p-6 text-center relative">
                {totalQuestions > 0 && (
                    <div className="absolute top-4 right-6">
                        <span className="bg-white/20 text-white px-4 py-2 rounded-xl text-sm font-black tracking-wider border border-white/30">
                            {currentQuestionNumber} de {totalQuestions}
                        </span>
                    </div>
                )}
                <div className={`w-32 h-32 ${selectedAnswer !== null ? COLORS[selectedAnswer] : 'bg-white/10'} rounded-3xl flex items-center justify-center mb-8 shadow-2xl animate-bounce border-4 border-white/20`}>
                    <span translate="no" className="text-7xl font-black">
                        {selectedAnswer !== null ? SYMBOLS[selectedAnswer] : '✔'}
                    </span>
                </div>
                <h2 className="text-3xl md:text-5xl font-black mb-4 uppercase tracking-tight">Resposta Enviada!</h2>
                <p className="text-xl opacity-60 mb-10">Mantenha o foco, os outros jogadores estão respondendo...</p>

                {selectedAnswer !== null && (
                    <div className="bg-white/5 px-8 py-4 rounded-2xl border border-white/10 backdrop-blur-md">
                        <span className="font-bold text-lg text-white/80 uppercase tracking-widest">Sua escolha: <span translate="no" className="text-white text-2xl ml-2 font-black leading-none">{SYMBOLS[selectedAnswer]}</span></span>
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
                {totalQuestions > 0 && (
                    <span className="bg-[var(--arena-primary)] text-white px-4 py-2 rounded-xl text-sm font-black tracking-wider shadow-lg">
                        {currentQuestionNumber} de {totalQuestions}
                    </span>
                )}
            </div>

            <div className="flex-1 grid grid-cols-2 gap-4 p-4">
                {question.options.map((_, i) => (
                    <button
                        key={i}
                        onClick={() => handleAnswer(i)}
                        disabled={status !== 'ANSWERING'}
                        className={`option-card ${COLORS[i]} h-full active:brightness-90 flex items-center justify-center group focus:ring-8 focus:ring-white/50 outline-none`}
                    >
                        <span translate="no" className="text-9xl sm:text-[10rem] md:text-[14rem] font-black leading-none drop-shadow-lg group-hover:scale-110 transition-transform">
                            {SYMBOLS[i]}
                        </span>
                    </button>
                ))}
            </div>
        </div>
    );
}
