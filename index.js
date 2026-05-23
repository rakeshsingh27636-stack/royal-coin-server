const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const mongoose = require('mongoose');

const app = express();
app.use(cors());
app.use(express.static(__dirname));

// MONGODB CONNECTION (Aapka theek kiya hua Link)
const dbURI = "mongodb+srv://royalcoin:db_Hemant%40321@cluster0.xdnwkjr.mongodb.net/royalcasino?retryWrites=true&w=majority";
mongoose.connect(dbURI)
    .then(() => console.log("✅ MongoDB Database Connected Successfully!"))
    .catch((err) => console.log("❌ Database Connection Error: ", err));

// PLAYER DATABASE SCHEMA (Ye lifetime save rahega)
const playerSchema = new mongoose.Schema({
    name: String,
    phone: { type: String, unique: true },
    balance: { type: Number, default: 0 },
    matchesPlayed: { type: Number, default: 0 },
    totalWon: { type: Number, default: 0 }
});
const Player = mongoose.model('Player', playerSchema);

// Game Frontend Route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// SECRET ADMIN PANEL ROUTE (Ab isme Player Tracker bhi hai)
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
                table { width: 100%; max-width: 800px; margin: 30px auto; border-collapse: collapse; background: #250006; }
                th, td { border: 1px solid #ffd700; padding: 10px; text-align: center; }
                th { background: #ffd700; color: #000; }
            </style>
            <script src="/socket.io/socket.io.js"></script>
        </head>
        <body>
            <h1>ROYAL ADMIN DASHBOARD 👑</h1>
            
            <h3>📥 Pending Deposit Requests</h3>
            <div id="requests-container"></div>

            <hr style="border-color:#ffd700; margin:40px 0;">

            <h3>📊 All Players Database</h3>
            <table>
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>Mobile</th>
                        <th>Balance (₹)</th>
                        <th>Matches Played</th>
                        <th>Total Won (₹)</th>
                    </tr>
                </thead>
                <tbody id="players-table"></tbody>
            </table>

            <script>
                const socket = io();
                socket.emit('registerAdmin');

                // Deposit Requests Handle
                socket.on('adminViewRequests', (requests) => {
                    const container = document.getElementById('requests-container');
                    container.innerHTML = '';
                    if(Object.keys(requests).length === 0) {
                        container.innerHTML = '<p class="no-req">No pending requests at the moment.</p>'; return;
                    }
                    for(let id in requests) {
                        const req = requests[id];
                        container.innerHTML += \`
                            <div class="req-card">
                                <p><strong>Player:</strong> \${req.name} (\${req.phone})</p>
                                <p><strong>Amount:</strong> ₹\${req.amount} | <strong>UTR:</strong> <span style="color:#ffd700;">\${req.utr}</span></p>
                                <div style="margin-top:15px;">
                                    <button class="app-btn" onclick="approve('\${id}')">✅ APPROVE</button>
                                    <button class="rej-btn" onclick="reject('\${id}')">❌ REJECT</button>
                                </div>
                            </div>
                        \`;
                    }
                });

                // Players Table Handle
                socket.on('adminViewPlayers', (playersList) => {
                    const tbody = document.getElementById('players-table');
                    tbody.innerHTML = '';
                    playersList.forEach(p => {
                        tbody.innerHTML += \`
                            <tr>
                                <td>\${p.name}</td>
                                <td>\${p.phone}</td>
                                <td style="color:#00ff99; font-weight:bold;">₹\${p.balance}</td>
                                <td>\${p.matchesPlayed}</td>
                                <td style="color:#ffd700;">₹\${p.totalWon}</td>
                            </tr>
                        \`;
                    });
                });

                function approve(reqId) { socket.emit('adminAction', { requestId: reqId, action: 'approve' }); }
                function reject(reqId) { socket.emit('adminAction', { requestId: reqId, action: 'reject' }); }
            </script>
        </body>
        </html>
    `);
});

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*", methods: ["GET", "POST"] } });

let players = {};
let pendingDeposits = {};
let rooms = {}; 
let adminSocketId = null;

function getRandomBot() {
    const bots = ["CryptoKing", "LuckySpinner", "RajaBet", "CoinMaster"];
    return bots[Math.floor(Math.random() * bots.length)];
}

io.on('connection', (socket) => {
    players[socket.id] = { dbId: null, balance: 0, name: "Guest", phone: "" };

    socket.on('registerAdmin', async () => {
        adminSocketId = socket.id;
        socket.emit('adminViewRequests', pendingDeposits);
        // DB se saare players utha kar admin ko bhejo
        try {
            const allPlayers = await Player.find({});
            socket.emit('adminViewPlayers', allPlayers);
        } catch(e) { console.log(e); }
    });

    // SMART LOGIN (Save to Database)
    socket.on('setUserData', async (data) => {
        try {
            // Check if user exists in DB by Phone Number
            let user = await Player.findOne({ phone: data.phone });
            
            // Agar Naya user hai toh DB me Save karo
            if(!user) {
                user = new Player({ name: data.name, phone: data.phone, balance: 0 });
                await user.save();
            }
            
            // Server ki temporary memory me DB link kardo
            players[socket.id] = { dbId: user._id, name: user.name, phone: user.phone, balance: user.balance };
            socket.emit('updateBalance', { newBalance: user.balance });
            
            // Admin panel update karo
            if(adminSocketId) {
                const allPlayers = await Player.find({});
                io.to(adminSocketId).emit('adminViewPlayers', allPlayers);
            }
        } catch(e) { console.error("DB Login Error:", e); }
    });

    socket.on('submitManualDeposit', (data) => {
        if(players[socket.id]) {
            pendingDeposits[socket.id] = {
                name: players[socket.id].name, phone: players[socket.id].phone,
                amount: data.amount, utr: data.utr, dbId: players[socket.id].dbId
            };
            if(adminSocketId) io.to(adminSocketId).emit('adminViewRequests', pendingDeposits);
        }
    });

    socket.on('adminAction', async (data) => {
        if(socket.id !== adminSocketId) return;
        const targetPlayerId = data.requestId;
        const depositData = pendingDeposits[targetPlayerId];

        if(depositData) {
            if(data.action === 'approve') {
                try {
                    // Update Database Balance
                    let user = await Player.findById(depositData.dbId);
                    if(user) {
                        user.balance += parseInt(depositData.amount);
                        await user.save();
                        
                        // Update Live Game Memory
                        if(players[targetPlayerId]) players[targetPlayerId].balance = user.balance;
                        
                        io.to(targetPlayerId).emit('updateBalance', { newBalance: user.balance });
                        io.to(targetPlayerId).emit('depositResult', { status: 'success', amount: depositData.amount });
                        
                        // Refresh Admin Table
                        const allPlayers = await Player.find({});
                        socket.emit('adminViewPlayers', allPlayers);
                    }
                } catch(e) { console.log("Approval Error", e); }
            } else {
                io.to(targetPlayerId).emit('depositResult', { status: 'failed' });
            }
            delete pendingDeposits[targetPlayerId];
            socket.emit('adminViewRequests', pendingDeposits);
        }
    });

    // GLOBAL TOSS MATCH
    socket.on('placeBet', async (data) => {
        if(!players[socket.id] || players[socket.id].balance < data.amount) return;
        
        socket.emit('matchmakingStarted', { bot: { name: getRandomBot(), avatar: "🤖" } });
        
        setTimeout(async () => {
            const outcomes = ['heads', 'tails'];
            const tossResult = outcomes[Math.floor(Math.random() * outcomes.length)];
            let status = 'lost';
            
            try {
                let user = await Player.findById(players[socket.id].dbId);
                if(user) {
                    user.matchesPlayed += 1;
                    
                    if(tossResult === data.side) { 
                        user.balance += data.amount; 
                        user.totalWon += data.amount;
                        status = 'won'; 
                    } else { 
                        user.balance -= data.amount; 
                    }
                    await user.save();
                    
                    players[socket.id].balance = user.balance;
                    socket.emit('gameResult', { tossResult: tossResult, status: status, newBalance: user.balance });
                    
                    // Update Admin Tracker Live
                    if(adminSocketId) {
                        const allPlayers = await Player.find({});
                        io.to(adminSocketId).emit('adminViewPlayers', allPlayers);
                    }
                }
            } catch(e) { console.log(e); }
        }, 2500);
    });

    // PVP MATCH SETUP
    socket.on('createRoom', (data) => {
        if(!players[socket.id] || players[socket.id].balance < data.amount) return;
        let roomCode = Math.floor(1000 + Math.random() * 9000).toString();
        rooms[roomCode] = { host: socket.id, wager: data.amount, hostSide: data.side };
        socket.join(roomCode);
        socket.emit('roomCreated', { code: roomCode, wager: data.amount, side: data.side });
    });

    socket.on('joinRoom', (data) => {
        let roomCode = data.code; let room = rooms[roomCode];
        if(!room || !players[socket.id] || players[socket.id].balance < room.wager) return;
        
        room.guest = socket.id; socket.join(roomCode);
        io.to(roomCode).emit('pvpMatchStarted', { message: "Match Started! Tossing Coin..." });

        setTimeout(async () => {
            const outcomes = ['heads', 'tails'];
            const tossResult = outcomes[Math.floor(Math.random() * outcomes.length)];
            let hostWon = (tossResult === room.hostSide);
            let prize = room.wager * 2;

            try {
                let hostDb = await Player.findById(players[room.host].dbId);
                let guestDb = await Player.findById(players[room.guest].dbId);
                
                if(hostDb && guestDb) {
                    hostDb.balance -= room.wager; guestDb.balance -= room.wager;
                    hostDb.matchesPlayed += 1; guestDb.matchesPlayed += 1;

                    if(hostWon) {
                        hostDb.balance += prize; hostDb.totalWon += prize;
                        io.to(room.host).emit('gameResult', { tossResult: tossResult, status: 'won', newBalance: hostDb.balance });
                        io.to(room.guest).emit('gameResult', { tossResult: tossResult, status: 'lost', newBalance: guestDb.balance });
                    } else {
                        guestDb.balance += prize; guestDb.totalWon += prize;
                        io.to(room.guest).emit('gameResult', { tossResult: tossResult, status: 'won', newBalance: guestDb.balance });
                        io.to(room.host).emit('gameResult', { tossResult: tossResult, status: 'lost', newBalance: hostDb.balance });
                    }
                    await hostDb.save(); await guestDb.save();
                    players[room.host].balance = hostDb.balance; players[room.guest].balance = guestDb.balance;
                }
            } catch(e) {}
            delete rooms[roomCode];
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