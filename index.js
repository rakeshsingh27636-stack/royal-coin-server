const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());

// YAHI WO LINE HAI JO ICON BHEJNE KI PERMISSION DETI HAI
app.use(express.static(__dirname));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*", methods: ["GET", "POST"] } });

let players = {};

function getRandomBot() {
    const bots = ["CryptoKing", "LuckySpinner", "RajaBet", "CoinMaster", "RiskTaker"];
    return bots[Math.floor(Math.random() * bots.length)];
}

setInterval(() => {
    const randomWinner = getRandomBot();
    const randomPrize = Math.floor(Math.random() * 4500) + 500;
    const actions = ["won", "withdrew", "jackpot hit"];
    const randomAction = actions[Math.floor(Math.random() * actions.length)];
    io.emit('liveTickerUpdate', { text: `🔥 ${randomWinner} ${randomAction} ₹${randomPrize}! ` });
}, 3500);

io.on('connection', (socket) => {
    players[socket.id] = { balance: 500 };
    socket.emit('updateBalance', { newBalance: players[socket.id].balance });

    socket.on('depositFunds', (data) => {
        if(players[socket.id]) {
            players[socket.id].balance += data.amount; 
            socket.emit('updateBalance', { newBalance: players[socket.id].balance });
        }
    });

    socket.on('withdrawFunds', (data) => {
        if(players[socket.id] && players[socket.id].balance >= data.amount) {
            players[socket.id].balance -= data.amount;
            socket.emit('withdrawSuccess', { amount: data.amount });
            socket.emit('updateBalance', { newBalance: players[socket.id].balance });
        }
    });

    socket.on('placeBet', (data) => {
        if(!players[socket.id] || players[socket.id].balance < data.amount) {
            socket.emit('error', { message: 'Insufficient balance' }); return;
        }
        socket.emit('matchmakingStarted', { bot: { name: getRandomBot(), avatar: "🤖" } });
        setTimeout(() => {
            const outcomes = ['heads', 'tails'];
            const tossResult = outcomes[Math.floor(Math.random() * outcomes.length)];
            let status = 'lost';
            if(tossResult === data.side) { players[socket.id].balance += data.amount; status = 'won'; } 
            else { players[socket.id].balance -= data.amount; }
            socket.emit('gameResult', { tossResult: tossResult, status: status, newBalance: players[socket.id].balance });
        }, 2500);
    });

    socket.on('createRoom', (data) => {
        socket.emit('roomCreated', { code: "1234", wager: data.amount, side: data.side });
        setTimeout(() => {
            socket.emit('pvpMatchStarted', { message: "Friend Joined! Match starting..." });
            setTimeout(() => {
                const outcomes = ['heads', 'tails'];
                const tossResult = outcomes[Math.floor(Math.random() * outcomes.length)];
                let status = (tossResult === data.side) ? 'won' : 'lost';
                if(status === 'won') players[socket.id].balance += data.amount; else players[socket.id].balance -= data.amount;
                socket.emit('gameResult', { tossResult: tossResult, status: status, newBalance: players[socket.id].balance });
            }, 2500);
        }, 4000);
    });

    socket.on('joinRoom', (data) => {
        socket.emit('pvpMatchStarted', { message: "Joined Room! Match starting..." });
        setTimeout(() => {
            const outcomes = ['heads', 'tails'];
            const tossResult = outcomes[Math.floor(Math.random() * outcomes.length)];
            socket.emit('gameResult', { tossResult: tossResult, status: 'lost', newBalance: players[socket.id].balance });
        }, 2500);
    });

    socket.on('disconnect', () => { delete players[socket.id]; });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => { console.log(`Server running on port ${PORT}`); });