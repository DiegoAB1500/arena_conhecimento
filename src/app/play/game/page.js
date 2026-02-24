'use client';

import { useState, useEffect, useRef } from 'react';
import { useSocket } from '@/lib/useSocket';
import { useRouter } from 'next/navigation';

const SYMBOLS = ['▲', '◆', '●', '■'];
const COLORS = ['btn-red', 'btn-blue', 'btn-yellow', 'btn-green'];

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
            <div className="min-h-screen flex items-center justify-center bg-[var(--kahoot-purple)] text-white p-4 text-center">
                <h2 className="text-3xl font-bold animate-pulse uppercase italic">Prepare-se!</h2>
            </div>
        );
    }

    if (status === 'SUBMITTED') {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--kahoot-purple)] text-white p-4 text-center">
                <div className={`w-32 h-32 ${selectedAnswer !== null ? COLORS[selectedAnswer] : 'bg-white/20'} rounded-2xl flex items-center justify-center mb-6 shadow-2xl animate-bounce`}>
                    <span className="text-7xl">
                        {selectedAnswer !== null ? SYMBOLS[selectedAnswer] : '✔'}
                    </span>
                </div>
                <h2 className="text-2xl md:text-4xl font-black mb-2 uppercase italic tracking-tighter text-center">Resposta Selecionada!</h2>
                <p className="text-xl opacity-80 mb-8">Aguardando os outros jogadores...</p>

                {selectedAnswer !== null && (
                    <div className="bg-white/10 px-6 py-3 rounded-full border border-white/20 backdrop-blur-sm">
                        <span className="font-bold text-lg">Você escolheu o símbolo {SYMBOLS[selectedAnswer]}</span>
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
            <div className={`min-h-screen flex flex-col items-center justify-center p-4 text-white text-center transition-colors duration-500 ${displayFeedback.correct ? 'bg-[var(--kahoot-green)]' : 'bg-[var(--kahoot-red)]'}`}>
                <h2 className="text-4xl md:text-6xl font-black mb-4 uppercase italic tracking-tighter">
                    {displayFeedback.correct ? 'CORRETO!' : 'INCORRETO'}
                </h2>
                <div className="text-8xl mb-6">{displayFeedback.correct ? '🔥' : '❌'}</div>
                <div className="bg-black/20 p-6 rounded-2xl backdrop-blur-sm">
                    <p className="text-2xl font-bold">+{displayFeedback.points} pontos</p>
                    <p className="text-lg opacity-80 mt-2">Total: {displayFeedback.totalScore}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col bg-gray-100">
            <div className="p-4 bg-white shadow-sm flex justify-between items-center px-8">
                <span className="font-bold text-[var(--kahoot-purple)]">Questão</span>
                <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center font-black">
                    ?
                </div>
            </div>

            <div className="flex-1 grid grid-cols-2 gap-2 p-2">
                {question.options.map((_, i) => (
                    <button
                        key={i}
                        onClick={() => handleAnswer(i)}
                        disabled={status !== 'ANSWERING'}
                        className={`option-btn ${COLORS[i]} h-full shadow-xl active:brightness-90 flex items-center justify-center`}
                    >
                        <span className="text-7xl sm:text-9xl md:text-[15rem] leading-none transform transition-transform hover:scale-110">
                            {SYMBOLS[i]}
                        </span>
                    </button>
                ))}
            </div>
        </div>
    );
}
