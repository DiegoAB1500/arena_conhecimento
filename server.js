const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const next = require('next');
const path = require('path');
const multer = require('multer');
const { parseSpecificQuestions, parseDefaultFile } = require('./src/lib/excel-parser');
require('dotenv').config();

const upload = multer({ storage: multer.memoryStorage() });

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

const port = process.env.PORT || 3000;
const TEACHER_PASSWORD = process.env.TEACHER_PASSWORD || 'professor123';

// Game State
let gameState = {
    status: 'LOBBY', // LOBBY, PLAYING, RESULTS, FINAL_RANKING
    pin: null,
    players: [], // { id, name, score, lastAnswerTime, correctCount, totalTime, answeredCurrent, lastFeedback }
    questions: [],
    currentQuestionIndex: -1,
    config: {
        basePoints: 1000,
        speedBonusMax: 500,
        enableSpeedBonus: true,
        mode: 'misto' // 'quatro', 'duas', 'misto'
    },
    questionStartTime: null,
    answersCount: 0,
    answerDistribution: {}, // { optionIndex: count }
    customQuestions: {
        four: [],
        two: []
    },
    disconnectedPlayers: {} // { playerId: { player, disconnectTime } }
};

app.prepare().then(() => {
    const server = express();
    const httpServer = http.createServer(server);
    const io = new Server(httpServer, {
        cors: {
            origin: "*",
            methods: ["GET", "POST"]
        },
        pingTimeout: 60000,
        pingInterval: 25000
    });

    server.use(express.json());

    // Helper Functions
    function getAllPlayers() {
        const disconnected = Object.values(gameState.disconnectedPlayers || {}).map(d => d.player);
        return [...(gameState.players || []), ...disconnected];
    }

    function getAnswersCount() {
        const all = getAllPlayers();
        return all.filter(p => p.answeredCurrent).length;
    }

    function checkAllPlayersAnswered() {
        if (gameState.status !== 'PLAYING') return;
        // We end the question when all ACTIVE (connected) players have responded
        if (gameState.players.length > 0 && gameState.players.every(p => p.answeredCurrent)) {
            console.log(`[Game] All active players answered. Showing results.`);
            showResults();
        }
    }

    function sendPlayerCurrentState(socket, player) {
        const currentQuestion = gameState.currentQuestionIndex >= 0 ? { ...gameState.questions[gameState.currentQuestionIndex] } : null;
        let timeLeft = 0;
        if (currentQuestion) {
            delete currentQuestion.correctIndex;
            if (gameState.status === 'PLAYING' && gameState.questionStartTime) {
                const elapsed = (Date.now() - gameState.questionStartTime) / 1000;
                timeLeft = Math.max(0, Math.floor(currentQuestion.timeLimit - elapsed));
            }
        }

        // Extremely robust feedback delivery
        let myFeedback = player ? player.lastFeedback : null;
        if (!myFeedback && player && (gameState.status === 'RESULTS' || gameState.status === 'FINAL_RANKING')) {
            myFeedback = { correct: false, points: 0, totalScore: player.score, isDefault: true };
        }

        socket.emit('gameStateUpdate', {
            status: gameState.status,
            currentQuestion: currentQuestion,
            currentQuestionIndex: gameState.currentQuestionIndex,
            players: gameState.players.map(p => ({ name: p.name, score: p.score })),
            answersCount: getAnswersCount(),
            pin: gameState.pin,
            timeLeft: timeLeft,
            hasAnswered: player ? player.answeredCurrent : false,
            selectedOption: player ? player.selectedOption : null,
            myFeedback: myFeedback
        });
    }

    // API Routes for the Host
    server.post('/api/host/login', (req, res) => {
        const { password } = req.body;
        if (password === TEACHER_PASSWORD) {
            res.json({ success: true, token: 'fake-token' });
        } else {
            res.status(401).json({ success: false });
        }
    });

    server.post('/api/host/upload', upload.single('file'), (req, res) => {
        try {
            const { type } = req.query; // 'four' or 'two'
            if (!req.file) {
                return res.status(400).json({ success: false, message: 'Nenhum arquivo enviado.' });
            }
            if (type !== 'four' && type !== 'two') {
                return res.status(400).json({ success: false, message: 'Tipo de arquivo inválido.' });
            }

            const questions = parseSpecificQuestions(req.file.buffer, type);
            gameState.customQuestions[type] = questions;

            res.json({
                success: true,
                message: `Perguntas (${type}) carregadas com sucesso!`,
                count: questions.length
            });
        } catch (error) {
            console.error('Erro ao processar Excel:', error);
            res.status(500).json({ success: false, message: error.message || 'Erro ao processar o arquivo Excel.' });
        }
    });

    // Socket.IO Logic
    io.on('connection', (socket) => {
        console.log('User connected:', socket.id);

        socket.on('joinRoom', ({ pin, name, playerId }) => {
            if (pin === gameState.pin && (gameState.status === 'LOBBY' || gameState.status === 'PLAYING' || gameState.status === 'RESULTS')) {

                // Unified Reconnection / Duplicate join handling
                let player = gameState.players.find(p => p.playerId === playerId) ||
                    (playerId ? gameState.disconnectedPlayers[playerId]?.player : null);

                if (player) {
                    console.log(`[Join] Player ${player.name} re-joining with ID ${socket.id}`);

                    // If they were in disconnected list, move them back
                    if (gameState.disconnectedPlayers[playerId]) {
                        delete gameState.disconnectedPlayers[playerId];
                        gameState.players.push(player);
                    }

                    player.id = socket.id;
                    socket.join('game-room');
                    socket.emit('joinedSuccess', { name: player.name, isReconnection: true });
                    io.emit('playerJoined', gameState.players);

                    sendPlayerCurrentState(socket, player);
                    checkAllPlayersAnswered();
                    return;
                }

                // Normal join (only in LOBBY)
                if (gameState.status !== 'LOBBY') {
                    return socket.emit('error', 'O jogo já começou.');
                }

                let playerName = name;
                const exists = gameState.players.find(p => p.name === name);
                if (exists) {
                    playerName = `${name}_${Math.floor(Math.random() * 1000)}`;
                }

                const newPlayer = {
                    id: socket.id,
                    playerId: playerId,
                    name: playerName,
                    score: 0,
                    totalTime: 0,
                    correctCount: 0,
                    answeredCurrent: false,
                    selectedOption: null,
                    lastFeedback: null
                };

                gameState.players.push(newPlayer);
                socket.join('game-room');
                io.emit('playerJoined', gameState.players);
                socket.emit('joinedSuccess', { name: playerName });
            } else {
                socket.emit('error', 'PIN inválido ou jogo encerrado');
            }
        });

        socket.on('createGame', (config) => {
            const hasFour = gameState.customQuestions.four.length > 0;
            const hasTwo = gameState.customQuestions.two.length > 0;

            if (!hasFour && !hasTwo) {
                return socket.emit('error', { message: 'Você precisa enviar pelo menos um arquivo Excel!' });
            }

            gameState.pin = Math.floor(100000 + Math.random() * 900000).toString();
            gameState.status = 'LOBBY';
            gameState.players = [];
            gameState.disconnectedPlayers = {};
            gameState.config = { ...gameState.config, ...config };

            const { four, two } = gameState.customQuestions;

            if (gameState.config.mode === 'quatro') {
                if (!hasFour) return socket.emit('error', { message: 'Arquivo de 4 alternativas não carregado.' });
                gameState.questions = four;
            } else if (gameState.config.mode === 'duas') {
                if (!hasTwo) return socket.emit('error', { message: 'Arquivo de 2 alternativas não carregado.' });
                gameState.questions = two;
            } else {
                gameState.questions = [...four, ...two];
            }

            gameState.currentQuestionIndex = -1;
            io.emit('gameCreated', { pin: gameState.pin });
            console.log('Game created with PIN:', gameState.pin);
        });

        socket.on('startGame', () => {
            if (gameState.status === 'LOBBY' && gameState.questions.length > 0) {
                nextQuestion();
            }
        });

        socket.on('submitAnswer', ({ optionIndex }) => {
            const player = gameState.players.find(p => p.id === socket.id);
            if (player && gameState.status === 'PLAYING' && !player.answeredCurrent) {
                const question = gameState.questions[gameState.currentQuestionIndex];
                const now = Date.now();
                const timeTaken = (now - gameState.questionStartTime) / 1000;

                player.answeredCurrent = true;
                player.selectedOption = optionIndex;
                gameState.answerDistribution[optionIndex] = (gameState.answerDistribution[optionIndex] || 0) + 1;

                console.log(`[Answer] ${player.name} answered.`);

                if (optionIndex === question.correctIndex) {
                    let points = gameState.config.basePoints;
                    if (gameState.config.enableSpeedBonus) {
                        const timeLeft = Math.max(0, question.timeLimit - timeTaken);
                        const bonus = Math.round((timeLeft / question.timeLimit) * gameState.config.speedBonusMax);
                        points += bonus;
                    }
                    player.score += points;
                    player.correctCount += 1;
                    player.totalTime += timeTaken;
                    player.lastFeedback = { correct: true, points, totalScore: player.score };
                } else {
                    player.lastFeedback = { correct: false, points: 0, totalScore: player.score };
                }

                io.emit('answersUpdate', { count: getAnswersCount() });
                checkAllPlayersAnswered();
            } else {
                console.log(`[Answer] Rejeitada para ${player?.name || 'Inexistente'}. Status: ${gameState.status}, Já respondeu: ${player?.answeredCurrent}`);
            }
        });

        socket.on('nextQuestion', () => {
            nextQuestion();
        });

        socket.on('endGame', () => {
            showFinalRanking();
        });

        socket.on('getGameState', ({ playerId } = {}) => {
            let player = gameState.players.find(p => p.id === socket.id);
            if (!player && playerId) {
                player = gameState.players.find(p => p.playerId === playerId);
                if (player) {
                    player.id = socket.id; // Correct the ID if it changed but we found them by playerId
                }
            }
            sendPlayerCurrentState(socket, player);
        });

        socket.on('disconnect', () => {
            const playerIndex = gameState.players.findIndex(p => p.id === socket.id);
            if (playerIndex !== -1) {
                const player = gameState.players[playerIndex];
                console.log(`Player ${player.name} disconnected. Holding session...`);

                if (player.playerId) {
                    gameState.disconnectedPlayers[player.playerId] = {
                        player: player,
                        disconnectTime: Date.now()
                    };
                }

                gameState.players.splice(playerIndex, 1);
                io.emit('playerJoined', gameState.players);
                checkAllPlayersAnswered();
            }
        });
    });

    // Cleanup disconnected players every minute
    setInterval(() => {
        const now = Date.now();
        const MAX_DISCONNECT_TIME = 2 * 60 * 1000; // 2 minutes

        Object.keys(gameState.disconnectedPlayers).forEach(playerId => {
            if (now - gameState.disconnectedPlayers[playerId].disconnectTime > MAX_DISCONNECT_TIME) {
                console.log(`Cleaning up expired session for Player ID: ${playerId}`);
                delete gameState.disconnectedPlayers[playerId];
            }
        });
    }, 60000);

    function nextQuestion() {
        gameState.currentQuestionIndex++;
        if (gameState.currentQuestionIndex < gameState.questions.length) {
            gameState.status = 'PLAYING';
            gameState.answersCount = 0;
            gameState.answerDistribution = {};
            gameState.questionStartTime = Date.now();

            // Reset ALL players
            const all = getAllPlayers();
            all.forEach(p => {
                p.answeredCurrent = false;
                p.selectedOption = null;
                p.lastFeedback = null;
            });

            const question = { ...gameState.questions[gameState.currentQuestionIndex] };
            const playerQuestion = { ...question };
            delete playerQuestion.correctIndex;

            io.emit('newQuestion', playerQuestion);

            const currentIndex = gameState.currentQuestionIndex;
            setTimeout(() => {
                if (gameState.currentQuestionIndex === currentIndex && gameState.status === 'PLAYING') {
                    showResults();
                }
            }, question.timeLimit * 1000);

        } else {
            showFinalRanking();
        }
    }

    function showResults() {
        gameState.status = 'RESULTS';
        const question = gameState.questions[gameState.currentQuestionIndex];

        const allPlayers = getAllPlayers();
        allPlayers.forEach(player => {
            if (!player.lastFeedback) {
                player.lastFeedback = { correct: false, points: 0, totalScore: player.score };
            }
        });

        const ranking = allPlayers.sort((a, b) => b.score - a.score).slice(0, 5);

        gameState.players.forEach(player => {
            io.to(player.id).emit('answerFeedback', player.lastFeedback);
        });

        io.emit('questionResults', {
            correctIndex: question.correctIndex,
            distribution: gameState.answerDistribution,
            ranking: ranking.map(p => ({ name: p.name, score: p.score }))
        });
    }

    function showFinalRanking() {
        gameState.status = 'FINAL_RANKING';
        const allPlayers = getAllPlayers();
        const ranking = allPlayers.sort((a, b) => {
            if (b.score !== a.score) return b.score - a.score;
            if (b.correctCount !== a.correctCount) return b.correctCount - a.correctCount;
            return a.totalTime - b.totalTime;
        });

        io.emit('finalRanking', { ranking: ranking.slice(0, 10) });
    }

    server.use((req, res) => {
        return handle(req, res);
    });

    httpServer.listen(port, '0.0.0.0', (err) => {
        if (err) throw err;
        console.log(`> Ready on http://localhost:${port}`);
    });
});
