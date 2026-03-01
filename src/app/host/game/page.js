'use client';

import { useState, useEffect } from 'react';
import { useSocket } from '@/lib/useSocket';
import { useRouter } from 'next/navigation';
import QRCode from 'react-qr-code';

export default function HostGame() {
    const [phase, setPhase] = useState('QUESTION'); // QUESTION, RESULTS, RANKING, FINAL
    const [question, setQuestion] = useState(null);
    const [timeLeft, setTimeLeft] = useState(0);
    const [answersCount, setAnswersCount] = useState(0);
    const [results, setResults] = useState(null);
    const [ranking, setRanking] = useState([]);
    const [finalRanking, setFinalRanking] = useState([]);
    const [totalQuestions, setTotalQuestions] = useState(0);
    const [currentQuestionNumber, setCurrentQuestionNumber] = useState(0);
    const [isLastQuestion, setIsLastQuestion] = useState(false);
    const [joinUrl, setJoinUrl] = useState('');
    const [pin, setPin] = useState('');
    const { socket } = useSocket();
    const router = useRouter();

    useEffect(() => {
        if (socket) {
            socket.on('newQuestion', (q) => {
                setQuestion(q);
                setTimeLeft(q.timeLimit);
                setPhase('QUESTION');
                setAnswersCount(0);
                setIsLastQuestion(false);
                if (q.totalQuestions) setTotalQuestions(q.totalQuestions);
                if (q.currentQuestionNumber) setCurrentQuestionNumber(q.currentQuestionNumber);
            });

            socket.on('answersUpdate', ({ count }) => {
                setAnswersCount(count);
            });

            socket.on('questionResults', (data) => {
                setResults(data);
                setRanking(data.ranking);
                setPhase('RESULTS');
                if (data.isLastQuestion) setIsLastQuestion(true);
            });

            socket.on('finalRankingHost', (data) => {
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
                    if (data.totalQuestions) setTotalQuestions(data.totalQuestions);
                    if (data.currentQuestionNumber) setCurrentQuestionNumber(data.currentQuestionNumber);
                    if (data.pin) {
                        setPin(data.pin);
                        if (typeof window !== 'undefined') {
                            setJoinUrl(`https://arena-conhecimento.onrender.com/?pin=${data.pin}`);
                        }
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
                socket.off('finalRankingHost');
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
            <div className="min-h-screen bg-[var(--arena-primary-dark)] flex flex-col items-center justify-center p-8 text-white">
                <h1 className="text-5xl font-black mb-12 uppercase tracking-widest">🏆 Grandes Campeões</h1>

                <div className="flex items-end justify-center gap-6 mb-16 w-full max-w-4xl px-4">
                    {/* 2nd Place */}
                    {finalRanking[1] && (
                        <div className="flex flex-col items-center flex-1">
                            <div className="text-xl font-bold mb-3 truncate max-w-full">{finalRanking[1].name}</div>
                            <div className="bg-slate-300 text-slate-800 w-full h-48 rounded-2xl flex items-center justify-center text-5xl font-black shadow-2xl border-4 border-white/20">2</div>
                            <div className="text-xl mt-3 font-semibold">{finalRanking[1].score} pts</div>
                        </div>
                    )}
                    {/* 1st Place */}
                    {finalRanking[0] && (
                        <div className="flex flex-col items-center flex-1 scale-110">
                            <div className="text-2xl font-black mb-3 truncate max-w-full text-yellow-400">{finalRanking[0].name}</div>
                            <div className="bg-yellow-400 text-yellow-900 w-full h-72 rounded-2xl flex items-center justify-center text-8xl font-black shadow-2xl border-4 border-yellow-200 relative">
                                1
                                <div className="absolute -top-8 text-5xl">👑</div>
                            </div>
                            <div className="text-2xl font-black mt-3">{finalRanking[0].score} pts</div>
                        </div>
                    )}
                    {/* 3rd Place */}
                    {finalRanking[2] && (
                        <div className="flex flex-col items-center flex-1">
                            <div className="text-lg font-bold mb-3 truncate max-w-full">{finalRanking[2].name}</div>
                            <div className="bg-amber-700 text-amber-100 w-full h-36 rounded-2xl flex items-center justify-center text-4xl font-black shadow-2xl border-4 border-white/10">3</div>
                            <div className="text-lg mt-3 font-semibold">{finalRanking[2].score} pts</div>
                        </div>
                    )}
                </div>

                <div className="arena-card text-slate-800 w-full max-w-2xl bg-white/95 backdrop-blur-md flex flex-col max-h-[50vh]">
                    <h2 className="text-2xl font-black mb-6 text-center uppercase text-slate-500 border-b pb-4 shrink-0">Quadro de Honra</h2>
                    <div className="flex flex-col gap-3 overflow-y-auto pr-2 custom-scrollbar flex-1">
                        {finalRanking.slice(3).map((p, i) => (
                            <div key={p.id} className="flex justify-between items-center p-4 rounded-xl bg-slate-50 border border-slate-100 font-bold group hover:bg-white hover:shadow-sm transition-all text-lg shrink-0">
                                <span className="text-slate-400">{i + 4}. <span className="text-slate-800">{p.name}</span></span>
                                <span className="bg-slate-200 px-3 py-1 rounded-lg text-slate-600">{p.score}</span>
                            </div>
                        ))}
                    </div>
                    <button onClick={() => router.push('/host/dashboard')} className="arena-button btn-primary w-full mt-8 shrink-0 text-xl py-4 uppercase">Voltar ao Início</button>
                </div>
            </div>
        );
    }

    if (phase === 'RANKING') {
        return (
            <div className="min-h-screen bg-[var(--arena-primary-dark)] flex flex-col p-8">
                <div className="flex justify-center items-center gap-4 mb-12">
                    <h2 className="text-4xl font-black text-white text-center uppercase tracking-wider">Classificação Atual</h2>
                    {totalQuestions > 0 && (
                        <span className="bg-white/20 text-white px-4 py-2 rounded-xl text-lg font-black tracking-wider border border-white/30">
                            {currentQuestionNumber} de {totalQuestions}
                        </span>
                    )}
                </div>
                <div className="flex-1 max-w-3xl mx-auto w-full flex flex-col gap-3">
                    {ranking.map((p, i) => (
                        <div key={i} className="bg-white p-5 rounded-2xl flex justify-between items-center shadow-lg border-l-8 border-[var(--arena-primary)] animate-in slide-in-from-right duration-500" style={{ animationDelay: `${i * 100}ms` }}>
                            <div className="flex items-center gap-4">
                                <span className="text-xl font-black text-slate-300 w-8">{i + 1}</span>
                                <span className="text-2xl font-bold text-slate-800">{p.name}</span>
                            </div>
                            <span className="text-2xl font-black py-2 px-5 bg-slate-100 text-slate-600 rounded-xl min-w-[120px] text-center shadow-inner">{p.score}</span>
                        </div>
                    ))}
                </div>
                <div className="flex flex-wrap justify-center items-center gap-4 mt-12 pb-10">
                    <button onClick={handleNext} className="arena-button bg-white text-[var(--arena-primary-dark)] text-xl md:text-2xl px-10 md:px-16 py-4 md:py-5 hover:shadow-2xl">PRÓXIMA ETAPA</button>
                    <button
                        onClick={handleEndGame}
                        className="bg-red-500/20 hover:bg-red-500 text-red-500 hover:text-white px-10 md:px-16 py-4 md:py-5 rounded-2xl text-xl md:text-2xl font-black transition-all border border-red-500/50 uppercase tracking-widest shadow-xl scale-75"
                    >
                        ENCERRAR JOGO
                    </button>
                </div>
            </div>
        );
    }

    if (!question) return <div className="min-h-screen flex items-center justify-center">Carregando questão...</div>;

    return (
        <div className="min-h-screen bg-[#dcfce7] flex flex-col font-sans">
            <div className="p-6 md:p-10 text-center bg-white shadow-lg min-h-[120px] md:min-h-[180px] flex flex-col items-center justify-center border-b-8 border-[var(--arena-primary)] relative">

                {/* Discreet QR Code and PIN for late joiners */}
                {joinUrl && (
                    <div className="absolute top-4 left-6 md:left-10 flex items-center gap-4 bg-slate-50 p-2 rounded-xl border border-slate-200 shadow-sm scale-75 md:scale-100 origin-top-left transition-transform hover:scale-110">
                        <div className="w-16 h-16 bg-white p-1 rounded-lg border border-slate-100">
                            <QRCode
                                value={joinUrl}
                                size={64}
                                style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                                viewBox={`0 0 64 64`}
                            />
                        </div>
                        <div className="flex flex-col text-left">
                            <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest leading-none mb-1">Entrar na Arena</span>
                            <span className="text-2xl font-black text-slate-800 tracking-tighter leading-none">{pin}</span>
                        </div>
                    </div>
                )}

                {totalQuestions > 0 && (
                    <div className="absolute top-4 right-6 md:right-10 flex flex-col items-end gap-2 z-20">
                        <span className="bg-[var(--arena-primary)] text-white px-4 py-2 rounded-xl text-sm md:text-lg font-black tracking-wider shadow-lg">
                            {currentQuestionNumber} de {totalQuestions}
                        </span>
                    </div>
                )}

                {/* The text has padding on both sides to avoid going under absolute elements */}
                <h1 className="text-3xl md:text-5xl font-black text-slate-800 leading-tight drop-shadow-sm px-6 md:px-48 lg:px-64 mt-20 md:mt-0 relative z-10 w-full">
                    {question.question}
                </h1>
            </div>

            <div className="flex-1 flex flex-col p-6 md:p-10 relative">
                {phase === 'QUESTION' && (
                    <div className="flex justify-between items-center mb-8 md:mb-16 bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
                        <div className="flex items-center gap-4">
                            <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-[var(--arena-primary)] flex items-center justify-center text-3xl md:text-4xl font-black text-white shadow-lg animate-pulse">
                                {timeLeft}
                            </div>
                            <span className="text-slate-400 font-bold hidden md:block">Segundos</span>
                        </div>
                        <div className="text-right">
                            <span className="text-4xl md:text-6xl font-black text-slate-800">{answersCount}</span>
                            <p className="text-xs md:text-sm font-black text-slate-400 uppercase tracking-widest mt-1">Participantes</p>
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 flex-1 mb-8">
                    {question.options.map((opt, i) => (
                        <div
                            key={i}
                            className={`option-card ${['bg-accent-1', 'bg-accent-2', 'bg-accent-3', 'bg-accent-4'][i]} 
                ${phase === 'RESULTS' && i !== results.correctIndex ? 'opacity-20 grayscale scale-95 shadow-none' : ''}
                ${phase === 'RESULTS' && i === results.correctIndex ? 'ring-8 ring-green-400 z-10 scale-105 shadow-2xl' : ''}`}
                        >
                            <div className="flex items-center gap-6 w-full px-4 py-2">
                                <span translate="no" className="text-6xl font-black opacity-30 shrink-0 select-none">{['A', 'B', 'C', 'D'][i]}</span>
                                <div className="flex-1 flex flex-col justify-center text-left">
                                    <span className="text-xl md:text-3xl font-black drop-shadow-sm">{opt}</span>
                                    {phase === 'RESULTS' && (
                                        <div className="mt-6 w-full bg-black/30 rounded-2xl h-10 md:h-14 overflow-hidden relative border border-white/20">
                                            <div
                                                className="bg-white/40 h-full transition-all duration-1000 ease-out"
                                                style={{ width: `${(results.distribution[i] || 0) / (answersCount || 1) * 100}%` }}
                                            ></div>
                                            <span className="absolute inset-0 flex items-center justify-center text-2xl md:text-3xl font-black">{results.distribution[i] || 0}</span>
                                        </div>
                                    )}
                                </div>
                                {phase === 'RESULTS' && i === results.correctIndex && (
                                    <div className="ml-4 text-4xl md:text-6xl animate-bounce">✔</div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>

                {phase === 'RESULTS' && (
                    <div className="flex flex-wrap justify-center items-center gap-4 mt-4 pb-10">
                        {isLastQuestion ? (
                            <div className="flex flex-col items-center gap-3 animate-pulse">
                                <span className="text-2xl md:text-3xl font-black text-[var(--arena-primary-dark)] uppercase tracking-widest">🏁 Última Questão!</span>
                                <span className="text-lg text-slate-500 font-bold">O ranking final será exibido em instantes...</span>
                            </div>
                        ) : (
                            <>
                                <button onClick={handleNext} className="arena-button btn-primary text-xl md:text-2xl px-10 md:px-16 py-4 md:py-5 shadow-2xl uppercase tracking-widest font-black">CONTINUAR</button>
                                <button
                                    onClick={handleEndGame}
                                    className="bg-red-500/20 hover:bg-red-500 text-red-500 hover:text-white px-10 md:px-16 py-4 md:py-5 rounded-2xl text-xl md:text-2xl font-black transition-all border border-red-500/50 uppercase tracking-widest shadow-xl scale-75"
                                >
                                    ENCERRAR JOGO
                                </button>
                            </>
                        )}
                    </div>
                )}


            </div>
        </div>
    );
}
