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
        <div className="min-h-screen bg-[var(--kahoot-purple)] p-8">
            <div className="max-w-4xl mx-auto">
                <div className="text-center">
                    <h2 className="text-lg md:text-2xl font-bold italic uppercase tracking-tighter text-[var(--kahoot-purple)]">Arena do Conhecimento</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                    {/* Upload 4 Options */}
                    <div className={`kahoot-card border-4 transition-all relative ${uploadFour.success ? 'border-green-400' : 'border-white'}`}>
                        <h3 className="text-xl font-bold mb-2">1. Perguntas (4 Alternativas)</h3>
                        <p className="text-sm text-gray-500 mb-4 italic">Aba: "Quatro Alternativas"</p>

                        <div className="flex flex-col gap-3">
                            <label htmlFor="upload-four" className={`kahoot-button w-full py-3 text-center cursor-pointer transition-all ${uploadFour.success ? 'btn-green opacity-50' : 'btn-purple shadow-lg hover:scale-105'}`}>
                                {uploadFour.success ? 'TROCAR ARQUIVO' : 'ESCOLHER ARQUIVO'}
                                <input id="upload-four" type="file" accept=".xlsx" onChange={(e) => handleFileUpload(e, 'four')} className="hidden" />
                            </label>

                            {uploadFour.message && (
                                <div className={`p-2 rounded-lg text-center text-sm font-bold ${uploadFour.success ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                    {uploadFour.success ? `✅ ${uploadFour.count} questões` : uploadFour.message}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Upload 2 Options */}
                    <div className={`kahoot-card border-4 transition-all relative ${uploadTwo.success ? 'border-green-400' : 'border-white'}`}>
                        <h3 className="text-xl font-bold mb-2">2. Perguntas (2 Alternativas)</h3>
                        <p className="text-sm text-gray-500 mb-4 italic">Aba: "Duas Alternativas"</p>

                        <div className="flex flex-col gap-3">
                            <label htmlFor="upload-two" className={`kahoot-button w-full py-3 text-center cursor-pointer transition-all ${uploadTwo.success ? 'btn-green opacity-50' : 'btn-purple shadow-lg hover:scale-105'}`}>
                                {uploadTwo.success ? 'TROCAR ARQUIVO' : 'ESCOLHER ARQUIVO'}
                                <input id="upload-two" type="file" accept=".xlsx" onChange={(e) => handleFileUpload(e, 'two')} className="hidden" />
                            </label>

                            {uploadTwo.message && (
                                <div className={`p-2 rounded-lg text-center text-sm font-bold ${uploadTwo.success ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                    {uploadTwo.success ? `✅ ${uploadTwo.count} questões` : uploadTwo.message}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="kahoot-card grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div>
                        <h3 className="text-xl font-bold mb-4">Modo de Jogo</h3>
                        <div className="flex flex-col gap-3">
                            <label className={`p-4 border-2 rounded-xl cursor-pointer transition-all ${config.mode === 'quatro' ? 'border-[var(--kahoot-purple)] bg-emerald-50' : 'border-gray-100'} ${!uploadFour.success ? 'opacity-30' : ''}`}>
                                <input type="radio" name="mode" value="quatro" disabled={!uploadFour.success} checked={config.mode === 'quatro'} onChange={() => setConfig({ ...config, mode: 'quatro' })} className="hidden" />
                                <span className="font-bold">Apenas 4 Alternativas</span>
                            </label>
                            <label className={`p-4 border-2 rounded-xl cursor-pointer transition-all ${config.mode === 'duas' ? 'border-[var(--kahoot-purple)] bg-emerald-50' : 'border-gray-100'} ${!uploadTwo.success ? 'opacity-30' : ''}`}>
                                <input type="radio" name="mode" value="duas" disabled={!uploadTwo.success} checked={config.mode === 'duas'} onChange={() => setConfig({ ...config, mode: 'duas' })} className="hidden" />
                                <span className="font-bold">Apenas 2 Alternativas</span>
                            </label>
                            <label className={`p-4 border-2 rounded-xl cursor-pointer transition-all ${config.mode === 'misto' ? 'border-[var(--kahoot-purple)] bg-emerald-50' : 'border-gray-100'} ${(!uploadFour.success || !uploadTwo.success) ? 'opacity-30' : ''}`}>
                                <input type="radio" name="mode" value="misto" disabled={!uploadFour.success || !uploadTwo.success} checked={config.mode === 'misto'} onChange={() => setConfig({ ...config, mode: 'misto' })} className="hidden" />
                                <span className="font-bold">Misto (Ambos arquivos)</span>
                            </label>
                        </div>
                    </div>

                    <div className="flex flex-col gap-6">
                        <h3 className="text-xl font-bold">Configurações de Pontos</h3>
                        <div>
                            <label className="flex items-center gap-3 cursor-pointer">
                                <input type="checkbox" checked={config.enableSpeedBonus} onChange={(e) => setConfig({ ...config, enableSpeedBonus: e.target.checked })} className="w-5 h-5 accent-[var(--kahoot-purple)]" />
                                <span className="font-medium">Bônus por Velocidade (até +500)</span>
                            </label>
                        </div>
                        <div className="mt-8">
                            <button
                                onClick={handleCreate}
                                disabled={!connected || !isReady}
                                className={`kahoot-button btn-green w-full text-xl md:text-2xl py-4 md:py-6 ${(!connected || !isReady) ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                                {!connected ? 'CONECTANDO...' : !isReady ? 'ENVIE UM ARQUIVO' : 'CRIAR PARTIDA'}
                            </button>
                        </div>
                    </div>
                </div>

                <div className="kahoot-card mt-8 bg-emerald-50 border-2 border-emerald-200">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                        <h3 className="text-xl font-bold text-emerald-800 flex items-center gap-2">
                            <span>💡</span> Instruções para o Excel
                        </h3>
                        <div className="flex flex-wrap gap-2">
                            <a
                                href="/modelo_4_opcoes.xlsx"
                                download="modelo_arena_4_alternativas.xlsx"
                                className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2 rounded-lg font-bold text-xs shadow-md transition-all flex items-center gap-2"
                            >
                                <span>📥</span> MODELO 4 ALTERNATIVAS
                            </a>
                            <a
                                href="/modelo_2_opcoes.xlsx"
                                download="modelo_arena_2_alternativas.xlsx"
                                className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2 rounded-lg font-bold text-xs shadow-md transition-all flex items-center gap-2"
                            >
                                <span>📥</span> MODELO 2 ALTERNATIVAS
                            </a>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-sm">
                        <div>
                            <p className="font-bold text-emerald-700 mb-2">Arquivo de 4 Alternativas:</p>
                            <ul className="list-disc list-inside space-y-1 text-emerald-900">
                                <li>Nome da aba: <strong>Quatro Alternativas</strong></li>
                                <li>Colunas: <code className="bg-emerald-100 px-1 rounded">Question</code>, <code className="bg-emerald-100 px-1 rounded">Answer 1</code> até <code className="bg-emerald-100 px-1 rounded">4</code></li>
                                <li><code className="bg-emerald-100 px-1 rounded">Correct</code>: número de 1 a 4</li>
                                <li><code className="bg-emerald-100 px-1 rounded">Time (sec)</code>: ex: 180</li>
                            </ul>
                        </div>
                        <div>
                            <p className="font-bold text-emerald-700 mb-2">Arquivo de 2 Alternativas:</p>
                            <ul className="list-disc list-inside space-y-1 text-emerald-900">
                                <li>Nome da aba: <strong>Duas Alternativas</strong></li>
                                <li>Colunas: <code className="bg-emerald-100 px-1 rounded">Question</code>, <code className="bg-emerald-100 px-1 rounded">Answer 1</code>, <code className="bg-emerald-100 px-1 rounded">2</code></li>
                                <li><code className="bg-emerald-100 px-1 rounded">Correct</code>: número 1 ou 2</li>
                                <li><code className="bg-emerald-100 px-1 rounded">Time (sec)</code>: ex: 60</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
