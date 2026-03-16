'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSocket } from '@/lib/useSocket';

export default function HostDashboard() {
    const [config, setConfig] = useState({
        mode: 'misto',
        enableSpeedBonus: true,
        basePoints: 1000,
        speedBonusMax: 500
    });
    const [uploadFour, setUploadFour] = useState({ success: false, count: 0, message: '' });
    const [uploadTwo, setUploadTwo] = useState({ success: false, count: 0, message: '' });
    const router = useRouter();
    const { socket, connected } = useSocket();

    useEffect(() => {
        if (socket) {
            socket.on('gameCreated', ({ pin }) => {
                router.push(`/host/lobby?pin=${pin}`);
            });
            socket.on('error', (err) => {
                alert(err.message);
            });
        }
        return () => {
            if (socket) {
                socket.off('gameCreated');
                socket.off('error');
            }
        };
    }, [socket, router]);

    const handleFileUpload = async (e, type) => {
        const file = e.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('file', file);

        try {
            const res = await fetch(`/api/host/upload?type=${type}`, {
                method: 'POST',
                body: formData,
            });
            const data = await res.json();
            if (type === 'four') setUploadFour(data);
            else setUploadTwo(data);
        } catch (error) {
            const err = { success: false, message: 'Erro na conexão.' };
            if (type === 'four') setUploadFour(err);
            else setUploadTwo(err);
        }
    };

    const handleCreate = () => {
        if (socket) {
            socket.emit('createGame', config);
        }
    };

    const isReady = uploadFour.success || uploadTwo.success;

    return (
        <div className="min-h-screen bg-[#dcfce7] p-6 md:p-10 font-sans">
            <div className="max-w-5xl mx-auto">
                <div className="text-center mb-12">
                    <h1 className="text-4xl md:text-6xl font-black text-slate-800 uppercase tracking-tight mb-2">Painel de Controle</h1>
                    <p className="text-slate-400 font-bold uppercase tracking-widest text-sm">Arena do Conhecimento</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
                    {/* Upload 4 Options */}
                    <div className={`arena-card border-t-8 transition-all relative ${uploadFour.success ? 'border-emerald-500' : 'border-slate-200'}`}>
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Perguntas (4 Opções)</h3>
                                <p className="text-sm text-slate-400 font-bold italic">Planilha: "Quatro Alternativas"</p>
                            </div>
                            <div className="text-3xl">📝</div>
                        </div>

                        <div className="flex flex-col gap-4 mt-8">
                            <label htmlFor="upload-four" className={`arena-button w-full py-4 text-center cursor-pointer transition-all uppercase tracking-widest font-black ${uploadFour.success ? 'bg-emerald-50 text-emerald-600 border-2 border-dashed border-emerald-200 shadow-none' : 'btn-primary shadow-xl hover:scale-[1.02]'}`}>
                                {uploadFour.success ? 'ARQUIVO CARREGADO' : 'SELECIONAR EXCEL'}
                                <input id="upload-four" type="file" accept=".xlsx" onChange={(e) => handleFileUpload(e, 'four')} className="hidden" />
                            </label>

                            {uploadFour.message && (
                                <div className={`p-4 rounded-2xl text-center font-bold ${uploadFour.success ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                                    {uploadFour.success ? `🚀 ${uploadFour.count} questões prontas!` : uploadFour.message}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Upload 2 Options */}
                    <div className={`arena-card border-t-8 transition-all relative ${uploadTwo.success ? 'border-emerald-500' : 'border-slate-200'}`}>
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Perguntas (2 Opções)</h3>
                                <p className="text-sm text-slate-400 font-bold italic">Planilha: "Duas Alternativas"</p>
                            </div>
                            <div className="text-3xl">🎯</div>
                        </div>

                        <div className="flex flex-col gap-4 mt-8">
                            <label htmlFor="upload-two" className={`arena-button w-full py-4 text-center cursor-pointer transition-all uppercase tracking-widest font-black ${uploadTwo.success ? 'bg-emerald-50 text-emerald-600 border-2 border-dashed border-emerald-200 shadow-none' : 'btn-primary shadow-xl hover:scale-[1.02]'}`}>
                                {uploadTwo.success ? 'ARQUIVO CARREGADO' : 'SELECIONAR EXCEL'}
                                <input id="upload-two" type="file" accept=".xlsx" onChange={(e) => handleFileUpload(e, 'two')} className="hidden" />
                            </label>

                            {uploadTwo.message && (
                                <div className={`p-4 rounded-2xl text-center font-bold ${uploadTwo.success ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                                    {uploadTwo.success ? `🚀 ${uploadTwo.count} questões prontas!` : uploadTwo.message}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="arena-card grid grid-cols-1 md:grid-cols-2 gap-12 bg-white/80 backdrop-blur-sm border-b-8 border-slate-100">
                    <div>
                        <h3 className="text-xl font-black text-slate-800 mb-8 uppercase tracking-widest border-b pb-4">Modo de Batalha</h3>
                        <div className="flex flex-col gap-4">
                            {[
                                { id: 'quatro', label: 'Apenas 4 Alternativas', ready: uploadFour.success },
                                { id: 'duas', label: 'Apenas 2 Alternativas', ready: uploadTwo.success },
                                { id: 'misto', label: 'Modo Misto (Ambos)', ready: uploadFour.success && uploadTwo.success }
                            ].map((mode) => (
                                <label key={mode.id} className={`p-5 border-2 rounded-2xl cursor-pointer transition-all flex items-center justify-between group ${config.mode === mode.id ? 'border-[var(--arena-primary)] bg-emerald-50 shadow-inner' : 'border-slate-100 hover:border-slate-200'} ${!mode.ready ? 'opacity-30 grayscale cursor-not-allowed' : ''}`}>
                                    <input type="radio" name="mode" value={mode.id} disabled={!mode.ready} checked={config.mode === mode.id} onChange={() => setConfig({ ...config, mode: mode.id })} className="hidden" />
                                    <span className={`text-lg font-black ${config.mode === mode.id ? 'text-emerald-700' : 'text-slate-500'}`}>{mode.label}</span>
                                    {config.mode === mode.id && <div className="w-4 h-4 rounded-full bg-emerald-500"></div>}
                                </label>
                            ))}
                        </div>
                    </div>

                    <div className="flex flex-col">
                        <h3 className="text-xl font-black text-slate-800 mb-8 uppercase tracking-widest border-b pb-4">Regras da Arena</h3>
                        <div className="flex flex-col gap-8 flex-1">
                            <label className="flex items-center gap-4 cursor-pointer group bg-slate-50 p-4 rounded-2xl hover:bg-slate-100 transition-all">
                                <div className="relative">
                                    <input type="checkbox" checked={config.enableSpeedBonus} onChange={(e) => setConfig({ ...config, enableSpeedBonus: e.target.checked })} className="w-8 h-8 rounded-xl accent-emerald-500 cursor-pointer" />
                                </div>
                                <div>
                                    <span className="font-black text-slate-700 block text-lg">Bônus de Resposta Rápida</span>
                                    <span className="text-sm text-slate-400 font-bold italic">Ganha até +500 pontos por agilidade</span>
                                </div>
                            </label>

                            <div className="mt-auto">
                                <button
                                    onClick={handleCreate}
                                    disabled={!connected || !isReady}
                                    className={`arena-button btn-primary w-full text-2xl py-6 uppercase tracking-[0.2em] font-black shadow-2xl transition-all ${(!connected || !isReady) ? 'opacity-30 cursor-not-allowed grayscale' : 'hover:scale-[1.02] hover:shadow-[0_20px_40px_rgba(16,185,129,0.3)]'}`}
                                >
                                    {!connected ? 'Sincronizando...' : !isReady ? 'Aguardando Perguntas' : 'Iniciar Arena'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="arena-card mt-10 bg-gradient-to-br from-emerald-600 to-emerald-800 text-white border-none shadow-emerald-200/50">
                    <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-10 gap-8">
                        <div className="flex items-center gap-4">
                            <span className="text-4xl text-white drop-shadow-lg">📚</span>
                            <div>
                                <h3 className="text-2xl font-black uppercase tracking-tight">Padrão de Planilhas</h3>
                                <p className="text-emerald-200/80 font-bold text-sm">Use nossos modelos para evitar erros de importação</p>
                            </div>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
                            <a
                                href="/modelo_4_opcoes.xlsx"
                                download="modelo_arena_4_alternativas.xlsx"
                                className="bg-white text-emerald-700 hover:bg-emerald-50 px-5 py-3 rounded-xl font-black text-[10px] sm:text-xs shadow-xl transition-all flex items-center justify-center gap-2 border-2 border-white/20 uppercase tracking-widest sm:flex-1 lg:flex-none"
                            >
                                <span className="text-base">📊</span> Download 4 Opções
                            </a>
                            <a
                                href="/modelo_2_opcoes.xlsx"
                                download="modelo_arena_2_alternativas.xlsx"
                                className="bg-white text-emerald-700 hover:bg-emerald-50 px-5 py-3 rounded-xl font-black text-[10px] sm:text-xs shadow-xl transition-all flex items-center justify-center gap-2 border-2 border-white/20 uppercase tracking-widest sm:flex-1 lg:flex-none"
                            >
                                <span className="text-base">🎯</span> Download 2 Opções
                            </a>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                        <div className="bg-black/10 p-6 rounded-2xl border border-white/5">
                            <p className="font-black text-emerald-300 mb-4 uppercase tracking-widest text-xs">Estrutura (4 Opções):</p>
                            <ul className="space-y-3 text-sm font-semibold opacity-90">
                                <li className="flex gap-2"><span>✅</span> Aba: Quatro Alternativas</li>
                                <li className="flex gap-2"><span>✅</span> Colunas: Question, Answer 1 a 4</li>
                                <li className="flex gap-2"><span>✅</span> Coluna Correct: 1, 2, 3 ou 4</li>
                                <li className="flex gap-2"><span>✅</span> Coluna Time (sec): Tempo por pergunta</li>
                                <li className="flex gap-2"><span>✅</span> Coluna Assunto (NOVA): Assunto da questão</li>
                            </ul>
                        </div>
                        <div className="bg-black/10 p-6 rounded-2xl border border-white/5">
                            <p className="font-black text-emerald-300 mb-4 uppercase tracking-widest text-xs">Estrutura (2 Opções):</p>
                            <ul className="space-y-3 text-sm font-semibold opacity-90">
                                <li className="flex gap-2"><span>✅</span> Aba: Duas Alternativas</li>
                                <li className="flex gap-2"><span>✅</span> Colunas: Question, Answer 1 e 2</li>
                                <li className="flex gap-2"><span>✅</span> Coluna Correct: 1 ou 2</li>
                                <li className="flex gap-2"><span>✅</span> Coluna Time (sec): Tempo por pergunta</li>
                                <li className="flex gap-2"><span>✅</span> Coluna Assunto (NOVA): Assunto da questão</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
