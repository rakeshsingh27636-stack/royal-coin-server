const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.static(__dirname));

// Game Frontend Route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// SECRET ADMIN PANEL ROUTE
app.get('/admin-secret-panel', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Royal Casino - Admin Panel</title>
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
                body { font-family: Arial; background: #120002; color: #fff; text-align: center; padding: 20px; }
                h1 { color: #ffd700; text-shadow: 0 0 10px rgba(255,215,0,0.5); }
                .req-card { background: #250006; border: 1px solid #ffd700; padding: 15px; margin: 15px auto; max-width: 500px; border-radius: 10px; text-align: left; }
                button { padding: 10px 20px; font-weight: bold; cursor: pointer; margin-right: 10px; border: none; border-radius: 5px; }
                .app-btn { background: #00ff99; color: #000; }
                .rej-btn { background: #ff3366; color: #fff; }
                .no-req { color: #aaa; margin-top: 30px; }
            </style>
            <script src="/socket.io/socket.io.js"></script>
        </head>
        <body>
            <h1>ROYAL ADMIN DASHBOARD 👑</h1>
            <h3>Pending Deposit Verification Requests</h3>
            <div id="requests-container"></div>

            <script>
                const socket = io();
                
                // Request admin identification
                socket.emit('registerAdmin');

                socket.on('adminViewRequests', (requests) => {
                    const container = document.getElementById('requests-container');
                    container.innerHTML = '';
                    
                    if(Object.keys(requests).length === 0) {
                        container.innerHTML = '<p class="no-req">No pending requests at the moment.</p>';
                        return;
                    }

                    for(let id in requests) {
                        const req = requests[id];
                        const card = document.createElement('div');
                        card.className = 'req-card';
                        card.innerHTML = \`
                            <p><strong>Player Name:</strong> \${req.name}</p>
                            <p><strong>Mobile:</strong> \${req.phone}</p>
                            <p><strong>Amount Requested:</strong> ₹\${req.amount}</p>
                            <p><strong>Submitted UTR:</strong> <span style="color:#ffd700; font-size:18px; font-family:monospace;">\${req.utr}</span></p>
                            <div style="margin-top:15px;">
                                <button class="app-btn" onclick="approve('\${id}')">✅ APPROVE & ADD BALANCE</button>
                                <button class="rej-btn" onclick="reject('\${id}')">❌ REJECT</button>
                            </div>
                        \`;
                        container.appendChild(card);
                    }
                });

                function approve(reqId) {
                    socket.emit('adminAction', { requestId: reqId, action: 'approve' });
                }
                function reject(reqId) {
                    socket.emit('adminAction', { requestId: reqId, action: 'reject' });
                }
            </script>
        </body>
        </html>
    `);
});

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*", methods: ["GET", "POST"] } });

let players = {};
let pendingDeposits = {};
let adminSocketId = null;

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
    // START WITH 0 RS BALANCE FOR NEW USERS
    players[socket.id] = { balance: 0, name: "Guest", phone: "" };
    socket.emit('updateBalance', { newBalance: players[socket.id].balance });

    socket.on('registerAdmin', () => {
        adminSocketId = socket.id;
        socket.emit('adminViewRequests', pendingDeposits);
    });

    socket.on('setUserData', (data) => {
        if(players[socket.id]) {
            players[socket.id].name = data.name;
            players[socket.id].phone = data.phone;
        }
    });

    // Handle Manual Deposit Submission
    socket.on('submitManualDeposit', (data) => {
        if(players[socket.id]) {
            pendingDeposits[socket.id] = {
                name: players[socket.id].name,
                phone: players[socket.id].phone,
                amount: data.amount,
                utr: data.utr
            };
            if(adminSocketId) {
                io.to(adminSocketId).emit('adminViewRequests', pendingDeposits);
            }
        }
    });

    // Admin Action Logic (Approve / Reject)
    socket.on('adminAction', (data) => {
        if(socket.id !== adminSocketId) return;
        
        const targetPlayerId = data.requestId;
        const depositData = pendingDeposits[targetPlayerId];

        if(depositData && players[targetPlayerId]) {
            if(data.action === 'approve') {
                players[targetPlayerId].balance += parseInt(depositData.amount);
                io.to(targetPlayerId).emit('updateBalance', { newBalance: players[targetPlayerId].balance });
                io.to(targetPlayerId).emit('depositResult', { status: 'success', amount: depositData.amount });
            } else {
                io.to(targetPlayerId).emit('depositResult', { status: 'failed' });
            }
            delete pendingDeposits[targetPlayerId];
            socket.emit('adminViewRequests', pendingDeposits);
        }
    });

    socket.on('withdrawFunds', (data) => {
        if(players[socket.id] && players[socket.id].balance >= data.amount) {
            players[socket.id].balance -= data.amount;
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
        if(!players[socket.id] || players[socket.id].balance < data.amount) {
            socket.emit('error', { message: 'Insufficient balance' }); return;
        }
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

    socket.on('disconnect', () => { 
        delete players[socket.id]; 
        if(pendingDeposits[socket.id]) {
            delete pendingDeposits[socket.id];
            if(adminSocketId) io.to(adminSocketId).emit('adminViewRequests', pendingDeposits);
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => { console.log(`Server running on port ${PORT}`); });