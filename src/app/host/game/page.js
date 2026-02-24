'use client';

import { useState, useEffect } from 'react';
import { useSocket } from '@/lib/useSocket';
import { useRouter } from 'next/navigation';

export default function HostGame() {
    const [phase, setPhase] = useState('QUESTION'); // QUESTION, RESULTS, RANKING, FINAL
    const [question, setQuestion] = useState(null);
    const [timeLeft, setTimeLeft] = useState(0);
    const [answersCount, setAnswersCount] = useState(0);
    const [results, setResults] = useState(null);
    const [ranking, setRanking] = useState([]);
    const [finalRanking, setFinalRanking] = useState([]);
    const { socket } = useSocket();
    const router = useRouter();

    useEffect(() => {
        if (socket) {
            socket.on('newQuestion', (q) => {
                setQuestion(q);
                setTimeLeft(q.timeLimit);
                setPhase('QUESTION');
                setAnswersCount(0);
            });

            socket.on('answersUpdate', ({ count }) => {
                setAnswersCount(count);
            });

            socket.on('questionResults', (data) => {
                setResults(data);
                setRanking(data.ranking);
                setPhase('RESULTS');
            });

            socket.on('finalRanking', (data) => {
                setFinalRanking(data.ranking);
                setPhase('FINAL');
            });

            socket.on('gameStateUpdate', (data) => {
                if (data.currentQuestion) {
                    setQuestion(data.currentQuestion);
                    setAnswersCount(data.answersCount);
                    if (data.timeLeft !== undefined) {
                        setTimeLeft(data.timeLeft);
                    }
                    if (data.status === 'PLAYING') setPhase('QUESTION');
                    if (data.status === 'RESULTS') setPhase('RESULTS');
                    if (data.status === 'FINAL_RANKING') setPhase('FINAL');
                }
            });

            socket.emit('getGameState');
        }

        return () => {
            if (socket) {
                socket.off('newQuestion');
                socket.off('answersUpdate');
                socket.off('questionResults');
                socket.off('finalRanking');
                socket.off('gameStateUpdate');
            }
        };
    }, [socket]);

    useEffect(() => {
        if (phase === 'QUESTION' && timeLeft > 0) {
            const timer = setInterval(() => {
                setTimeLeft((prev) => prev - 1);
            }, 1000);
            return () => clearInterval(timer);
        }
    }, [phase, timeLeft]);

    const handleNext = () => {
        if (phase === 'RESULTS') {
            setPhase('RANKING');
        } else if (phase === 'RANKING') {
            socket.emit('nextQuestion');
        }
    };

    const handleEndGame = () => {
        if (confirm('Tem certeza que deseja encerrar o jogo agora?')) {
            socket.emit('endGame');
        }
    };

    if (phase === 'FINAL') {
        return (
            <div className="min-h-screen bg-[var(--kahoot-purple)] flex flex-col items-center justify-center p-8 text-white">
                <h1 className="text-6xl font-black mb-12 italic uppercase">Podium</h1>
                <div className="flex items-end justify-center gap-4 mb-20 w-full max-w-4xl">
                    {/* 2nd Place */}
                    {finalRanking[1] && (
                        <div className="flex flex-col items-center flex-1">
                            <div className="text-2xl font-bold mb-2">{finalRanking[1].name}</div>
                            <div className="bg-gray-400 w-full h-40 rounded-t-lg flex items-center justify-center text-5xl font-black shadow-lg">2</div>
                            <div className="text-xl mt-2">{finalRanking[1].score} pts</div>
                        </div>
                    )}
                    {/* 1st Place */}
                    {finalRanking[0] && (
                        <div className="flex flex-col items-center flex-1">
                            <div className="text-3xl font-bold mb-2">{finalRanking[0].name}</div>
                            <div className="bg-yellow-500 w-full h-60 rounded-t-lg flex items-center justify-center text-7xl font-black shadow-lg relative">
                                1
                            </div>
                            <div className="text-2xl font-black mt-2">{finalRanking[0].score} pts</div>
                        </div>
                    )}
                    {/* 3rd Place */}
                    {finalRanking[2] && (
                        <div className="flex flex-col items-center flex-1">
                            <div className="text-xl font-bold mb-2">{finalRanking[2].name}</div>
                            <div className="bg-orange-800 w-full h-32 rounded-t-lg flex items-center justify-center text-4xl font-black shadow-lg">3</div>
                            <div className="text-lg mt-2">{finalRanking[2].score} pts</div>
                        </div>
                    )}
                </div>

                <div className="kahoot-card text-black w-full max-w-2xl">
                    <h2 className="text-2xl font-bold mb-4 text-center">Top 10</h2>
                    <div className="flex flex-col gap-2">
                        {finalRanking.slice(3, 10).map((p, i) => (
                            <div key={p.id} className="flex justify-between p-3 border-b border-gray-100 font-bold">
                                <span>{i + 4}. {p.name}</span>
                                <span>{p.score}</span>
                            </div>
                        ))}
                    </div>
                    <button onClick={() => router.push('/host/dashboard')} className="kahoot-button btn-purple w-full mt-8">NOVA PARTIDA</button>
                </div>
            </div>
        );
    }

    if (phase === 'RANKING') {
        return (
            <div className="min-h-screen bg-[var(--kahoot-purple)] flex flex-col p-8">
                <h2 className="text-4xl font-black text-white text-center mb-12 italic uppercase tracking-widest">Ranking Parcial</h2>
                <div className="flex-1 max-w-3xl mx-auto w-full flex flex-col gap-4">
                    {ranking.map((p, i) => (
                        <div key={i} className="bg-white p-4 rounded-lg flex justify-between items-center shadow-md animate-in slide-in-from-right duration-500" style={{ animationDelay: `${i * 100}ms` }}>
                            <span className="text-2xl font-bold">{p.name}</span>
                            <span className="text-2xl font-black p-2 bg-gray-100 rounded min-w-[100px] text-center">{p.score}</span>
                        </div>
                    ))}
                </div>
                <div className="flex justify-center mt-8">
                    <button onClick={handleNext} className="kahoot-button bg-white text-[var(--kahoot-purple)] text-2xl px-12 py-4">PRÓXIMA</button>
                </div>
            </div>
        );
    }

    if (!question) return <div className="min-h-screen flex items-center justify-center">Carregando questão...</div>;

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            <div className="p-4 md:p-8 text-center bg-white shadow-sm min-h-[100px] md:min-h-[150px] flex items-center justify-center">
                <h1 className="text-2xl md:text-4xl font-black">{question.question}</h1>
            </div>

            <div className="flex-1 flex flex-col p-8 relative">
                {phase === 'QUESTION' && (
                    <div className="flex justify-between items-center mb-6 md:mb-12">
                        <div className="w-16 h-16 md:w-24 md:h-24 rounded-full border-4 md:border-8 border-[var(--kahoot-purple)] flex items-center justify-center text-2xl md:text-4xl font-black text-[var(--kahoot-purple)]">
                            {timeLeft}
                        </div>
                        <div className="text-center">
                            <span className="text-4xl md:text-6xl font-black">{answersCount}</span>
                            <p className="text-xs md:font-bold text-gray-500 uppercase md:tracking-widest">Respostas</p>
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1 mb-8">
                    {question.options.map((opt, i) => (
                        <div
                            key={i}
                            className={`option-btn ${['btn-red', 'btn-blue', 'btn-yellow', 'btn-green'][i]} text-3xl font-bold 
                ${phase === 'RESULTS' && i !== results.correctIndex ? 'opacity-30 grayscale' : ''}
                ${phase === 'RESULTS' && i === results.correctIndex ? 'ring-[16px] ring-green-400 z-10' : ''}`}
                        >
                            <div className="flex items-center gap-6 w-full px-6 py-2">
                                <span className="text-6xl font-black opacity-80 shrink-0">{['▲', '◆', '●', '■'][i]}</span>
                                <div className="flex-1 flex flex-col justify-center">
                                    <span className="text-xl md:text-3xl font-bold line-clamp-2">{opt}</span>
                                    {phase === 'RESULTS' && (
                                        <div className="mt-4 w-full bg-black/20 rounded-full h-12 md:h-16 overflow-hidden relative">
                                            <div
                                                className="bg-white/50 h-full transition-all duration-1000"
                                                style={{ width: `${(results.distribution[i] || 0) / (answersCount || 1) * 100}%` }}
                                            ></div>
                                            <span className="absolute inset-0 flex items-center justify-center text-3xl md:text-5xl font-black">{results.distribution[i] || 0}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {phase === 'RESULTS' && (
                    <div className="flex justify-center">
                        <button onClick={handleNext} className="kahoot-button btn-purple text-2xl px-12 py-4 shadow-xl">CONTINUAR</button>
                    </div>
                )}

                {/* Botão de Encerrar Jogo Antecipadamente */}
                <div className="fixed bottom-4 right-4">
                    <button
                        onClick={handleEndGame}
                        className="bg-red-500/20 hover:bg-red-500 text-red-500 hover:text-white px-4 py-2 rounded text-xs font-bold transition-all border border-red-500/50"
                    >
                        ENCERRAR JOGO
                    </button>
                </div>
            </div>
        </div>
    );
}
