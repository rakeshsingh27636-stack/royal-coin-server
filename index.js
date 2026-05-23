const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const mongoose = require('mongoose');

const app = express();
app.use(cors());
app.use(express.static(__dirname));

// MONGODB CONNECTION
const dbURI = "mongodb+srv://royalcoin:db_Hemant%40321@cluster0.xdnwkjr.mongodb.net/royalcasino?retryWrites=true&w=majority";
mongoose.connect(dbURI)
    .then(() => console.log("✅ MongoDB Database Connected Successfully!"))
    .catch((err) => console.log("❌ Database Connection Error: ", err));

// PLAYER DATABASE SCHEMA
const playerSchema = new mongoose.Schema({
    name: String,
    phone: { type: String, unique: true },
    balance: { type: Number, default: 0 },
    matchesPlayed: { type: Number, default: 0 },
    totalWon: { type: Number, default: 0 },
    totalLost: { type: Number, default: 0 }
});
const Player = mongoose.model('Player', playerSchema);

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// SECRET ADMIN PANEL WITH PASSWORD & TABS
app.get('/admin-secret-panel', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Royal Casino - Admin Dashboard</title>
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
                body { font-family: Arial; background: #120002; color: #fff; text-align: center; margin: 0; padding: 0; }
                h1 { color: #ffd700; text-shadow: 0 0 10px rgba(255,215,0,0.5); margin-top: 20px;}
                
                /* Login Screen */
                #login-screen { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; background: #0a0001; }
                .login-box { background: #250006; padding: 40px; border: 2px solid #ffd700; border-radius: 15px; box-shadow: 0 0 30px rgba(255,215,0,0.3); }
                input[type="password"] { padding: 12px; width: 80%; margin: 20px 0; font-size: 18px; text-align: center; background: #000; color: #ffd700; border: 1px solid #ffd700; border-radius: 5px; outline: none; }
                
                /* Dashboard & Tabs */
                #dashboard-screen { display: none; padding: 20px; }
                .tab-container { display: flex; justify-content: center; gap: 10px; margin: 20px 0; flex-wrap: wrap;}
                .tab-btn { padding: 12px 20px; background: #250006; border: 1px solid #ffd700; color: #ffd700; font-weight: bold; border-radius: 8px; cursor: pointer; transition: 0.3s; }
                .tab-btn.active { background: #ffd700; color: #000; box-shadow: 0 0 15px rgba(255,215,0,0.6); }
                .tab-content { display: none; animation: fadeIn 0.5s; }
                .tab-content.active { display: block; }
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

                /* Cards & Tables */
                .req-card { background: #250006; border: 1px solid #ffd700; padding: 15px; margin: 15px auto; max-width: 500px; border-radius: 10px; text-align: left; }
                button.action { padding: 10px 20px; font-weight: bold; cursor: pointer; margin-right: 10px; border: none; border-radius: 5px; }
                .app-btn { background: #00ff99; color: #000; }
                .rej-btn { background: #ff3366; color: #fff; }
                .no-req { color: #aaa; margin-top: 30px; font-style: italic; }
                
                table { width: 100%; max-width: 900px; margin: 20px auto; border-collapse: collapse; background: #250006; }
                th, td { border: 1px solid #ffd700; padding: 12px; text-align: center; }
                th { background: #ffd700; color: #000; }
            </style>
            <script src="/socket.io/socket.io.js"></script>
        </head>
        <body>
            
            <div id="login-screen">
                <div class="login-box">
                    <h1>👑 ADMIN ACCESS</h1>
                    <p style="color:#aaa;">Enter Master Password</p>
                    <input type="password" id="admin-pass" placeholder="Password" />
                    <br>
                    <button class="action app-btn" onclick="verifyPassword()">UNLOCK DASHBOARD</button>
                    <p id="login-err" style="color:#ff3366; display:none; margin-top:10px;">Incorrect Password!</p>
                </div>
            </div>

            <div id="dashboard-screen">
                <h1>ROYAL ADMIN DASHBOARD 👑</h1>
                
                <div class="tab-container">
                    <button class="tab-btn active" onclick="switchTab('tab-deposits', this)">📥 PENDING DEPOSITS</button>
                    <button class="tab-btn" onclick="switchTab('tab-withdrawals', this)">📤 WITHDRAWAL REQUESTS</button>
                    <button class="tab-btn" onclick="switchTab('tab-database', this)">📊 ALL PLAYERS DB</button>
                </div>

                <div id="tab-deposits" class="tab-content active">
                    <h3 style="color:#00ff99;">Deposit Verification</h3>
                    <div id="deposits-container"></div>
                </div>

                <div id="tab-withdrawals" class="tab-content">
                    <h3 style="color:#ff3366;">Cashout Requests</h3>
                    <div id="withdrawals-container"></div>
                </div>

                <div id="tab-database" class="tab-content">
                    <h3 style="color:#ffd700;">Player Records</h3>
                    <div style="overflow-x:auto;">
                        <table>
                            <thead>
                                <tr>
                                    <th>Name</th>
                                    <th>Mobile</th>
                                    <th>Balance (₹)</th>
                                    <th>Matches</th>
                                    <th>Total Won (₹)</th>
                                    <th>Total Lost (₹)</th>
                                </tr>
                            </thead>
                            <tbody id="players-table"></tbody>
                        </table>
                    </div>
                </div>
            </div>

            <script>
                // PASSWORD LOGIC (Password is Royal@123)
                function verifyPassword() {
                    let pass = document.getElementById('admin-pass').value;
                    if(pass === 'Royal@123') {
                        document.getElementById('login-screen').style.display = 'none';
                        document.getElementById('dashboard-screen').style.display = 'block';
                        socket.emit('registerAdmin'); // Only connect DB when logged in
                    } else {
                        document.getElementById('login-err').style.display = 'block';
                    }
                }

                // TAB SWITCHING LOGIC
                function switchTab(tabId, btnElement) {
                    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
                    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
                    document.getElementById(tabId).classList.add('active');
                    btnElement.classList.add('active');
                }

                const socket = io();

                // 1. DEPOSIT HANDLING
                socket.on('adminViewRequests', (requests) => {
                    const container = document.getElementById('deposits-container');
                    container.innerHTML = '';
                    if(Object.keys(requests).length === 0) {
                        container.innerHTML = '<p class="no-req">No pending deposits.</p>'; return;
                    }
                    for(let id in requests) {
                        const req = requests[id];
                        container.innerHTML += \`
                            <div class="req-card">
                                <p><strong>Player:</strong> \${req.name} (\${req.phone})</p>
                                <p><strong>Amount:</strong> ₹\${req.amount} | <strong>UTR:</strong> <span style="color:#ffd700;">\${req.utr}</span></p>
                                <div style="margin-top:15px;">
                                    <button class="action app-btn" onclick="approveDeposit('\${id}')">✅ APPROVE</button>
                                    <button class="action rej-btn" onclick="rejectDeposit('\${id}')">❌ REJECT</button>
                                </div>
                            </div>
                        \`;
                    }
                });

                function approveDeposit(reqId) { socket.emit('adminDepAction', { requestId: reqId, action: 'approve' }); }
                function rejectDeposit(reqId) { socket.emit('adminDepAction', { requestId: reqId, action: 'reject' }); }

                // 2. WITHDRAWAL HANDLING
                socket.on('adminViewWithdrawals', (withdrawals) => {
                    const container = document.getElementById('withdrawals-container');
                    container.innerHTML = '';
                    if(Object.keys(withdrawals).length === 0) {
                        container.innerHTML = '<p class="no-req">No pending withdrawals.</p>'; return;
                    }
                    for(let id in withdrawals) {
                        const req = withdrawals[id];
                        container.innerHTML += \`
                            <div class="req-card" style="border-color:#ff3366;">
                                <p><strong>Player:</strong> \${req.name} (\${req.phone})</p>
                                <p><strong>Cashout Amount:</strong> <span style="color:#00ff99; font-weight:bold;">₹\${req.amount}</span></p>
                                <p><strong>Send To UPI:</strong> <span style="color:#ffd700; font-size:16px;">\${req.upi}</span></p>
                                <div style="margin-top:15px;">
                                    <button class="action app-btn" onclick="approveWithdraw('\${id}')">✅ PAID IT</button>
                                    <button class="action rej-btn" onclick="rejectWithdraw('\${id}')">❌ CANCEL & REFUND</button>
                                </div>
                            </div>
                        \`;
                    }
                });

                function approveWithdraw(reqId) { socket.emit('adminWithAction', { requestId: reqId, action: 'approve' }); }
                function rejectWithdraw(reqId) { socket.emit('adminWithAction', { requestId: reqId, action: 'reject' }); }

                // 3. DATABASE TABLE HANDLING
                socket.on('adminViewPlayers', (playersList) => {
                    const tbody = document.getElementById('players-table');
                    tbody.innerHTML = '';
                    playersList.forEach(p => {
                        let lostAmount = p.totalLost || 0;
                        tbody.innerHTML += \`
                            <tr>
                                <td>\${p.name}</td>
                                <td>\${p.phone}</td>
                                <td style="color:#ffd700; font-weight:bold;">₹\${p.balance}</td>
                                <td>\${p.matchesPlayed}</td>
                                <td style="color:#00ff99; font-weight:bold;">₹\${p.totalWon}</td>
                                <td style="color:#ff3366; font-weight:bold;">₹\${lostAmount}</td>
                            </tr>
                        \`;
                    });
                });
            </script>
        </body>
        </html>
    `);
});

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*", methods: ["GET", "POST"] } });

let players = {};
let pendingDeposits = {};
let pendingWithdrawals = {}; // NAYA: Withdrawal Tracking
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
        socket.emit('adminViewWithdrawals', pendingWithdrawals);
        try {
            const allPlayers = await Player.find({});
            socket.emit('adminViewPlayers', allPlayers);
        } catch(e) { console.log(e); }
    });

    socket.on('setUserData', async (data) => {
        try {
            let user = await Player.findOne({ phone: data.phone });
            if(!user) {
                user = new Player({ name: data.name, phone: data.phone, balance: 0, totalLost: 0 });
                await user.save();
            }
            players[socket.id] = { dbId: user._id, name: user.name, phone: user.phone, balance: user.balance };
            socket.emit('updateBalance', { newBalance: user.balance });
            
            if(adminSocketId) {
                const allPlayers = await Player.find({});
                io.to(adminSocketId).emit('adminViewPlayers', allPlayers);
            }
        } catch(e) {}
    });

    // DEPOSIT LOGIC
    socket.on('submitManualDeposit', (data) => {
        if(players[socket.id]) {
            pendingDeposits[socket.id] = {
                name: players[socket.id].name, phone: players[socket.id].phone,
                amount: data.amount, utr: data.utr, dbId: players[socket.id].dbId
            };
            if(adminSocketId) io.to(adminSocketId).emit('adminViewRequests', pendingDeposits);
        }
    });

    socket.on('adminDepAction', async (data) => {
        if(socket.id !== adminSocketId) return;
        const targetId = data.requestId;
        const depData = pendingDeposits[targetId];

        if(depData) {
            if(data.action === 'approve') {
                try {
                    let user = await Player.findById(depData.dbId);
                    if(user) {
                        user.balance += parseInt(depData.amount);
                        await user.save();
                        if(players[targetId]) players[targetId].balance = user.balance;
                        io.to(targetId).emit('updateBalance', { newBalance: user.balance });
                        io.to(targetId).emit('depositResult', { status: 'success', amount: depData.amount });
                        
                        const allPlayers = await Player.find({});
                        socket.emit('adminViewPlayers', allPlayers);
                    }
                } catch(e) {}
            } else {
                io.to(targetId).emit('depositResult', { status: 'failed' });
            }
            delete pendingDeposits[targetId];
            socket.emit('adminViewRequests', pendingDeposits);
        }
    });

    // WITHDRAWAL LOGIC (NAYA)
    socket.on('withdrawFunds', async (data) => {
        if(players[socket.id] && players[socket.id].balance >= data.amount) {
            try {
                let user = await Player.findById(players[socket.id].dbId);
                if(user && user.balance >= data.amount) {
                    // Turant balance kaato taaki double request na bhej sake
                    user.balance -= data.amount;
                    await user.save();
                    players[socket.id].balance = user.balance;
                    socket.emit('updateBalance', { newBalance: user.balance });

                    // Admin panel me bhejo
                    pendingWithdrawals[socket.id] = {
                        name: players[socket.id].name, phone: players[socket.id].phone,
                        amount: data.amount, upi: data.upi, dbId: players[socket.id].dbId
                    };
                    if(adminSocketId) io.to(adminSocketId).emit('adminViewWithdrawals', pendingWithdrawals);
                }
            } catch(e) {}
        }
    });

    socket.on('adminWithAction', async (data) => {
        if(socket.id !== adminSocketId) return;
        const targetId = data.requestId;
        const withData = pendingWithdrawals[targetId];

        if(withData) {
            if(data.action === 'approve') {
                // Paise pehle hi kat chuke hain, bas list se hata do (Kyunki aapne asli me UPI se pay kar diya hoga)
            } else if(data.action === 'reject') {
                // Refund karo balance
                try {
                    let user = await Player.findById(withData.dbId);
                    if(user) {
                        user.balance += parseInt(withData.amount);
                        await user.save();
                        if(players[targetId]) players[targetId].balance = user.balance;
                        io.to(targetId).emit('updateBalance', { newBalance: user.balance });
                        // Optional: Refund message to user
                    }
                } catch(e) {}
            }
            delete pendingWithdrawals[targetId];
            socket.emit('adminViewWithdrawals', pendingWithdrawals);
            
            const allPlayers = await Player.find({});
            socket.emit('adminViewPlayers', allPlayers);
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
                        user.balance += data.amount; user.totalWon += data.amount; status = 'won'; 
                    } else { 
                        user.balance -= data.amount; user.totalLost += data.amount; 
                    }
                    await user.save();
                    players[socket.id].balance = user.balance;
                    socket.emit('gameResult', { tossResult: tossResult, status: status, newBalance: user.balance });
                    if(adminSocketId) {
                        const allPlayers = await Player.find({});
                        io.to(adminSocketId).emit('adminViewPlayers', allPlayers);
                    }
                }
            } catch(e) {}
        }, 2500);
    });

    // PVP MATCH
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
                        hostDb.balance += prize; hostDb.totalWon += prize; guestDb.totalLost += room.wager;
                        io.to(room.host).emit('gameResult', { tossResult: tossResult, status: 'won', newBalance: hostDb.balance });
                        io.to(room.guest).emit('gameResult', { tossResult: tossResult, status: 'lost', newBalance: guestDb.balance });
                    } else {
                        guestDb.balance += prize; guestDb.totalWon += prize; hostDb.totalLost += room.wager;
                        io.to(room.guest).emit('gameResult', { tossResult: tossResult, status: 'won', newBalance: guestDb.balance });
                        io.to(room.host).emit('gameResult', { tossResult: tossResult, status: 'lost', newBalance: hostDb.balance });
                    }
                    await hostDb.save(); await guestDb.save();
                    players[room.host].balance = hostDb.balance; players[room.guest].balance = guestDb.balance;
                    if(adminSocketId) {
                        const allPlayers = await Player.find({});
                        io.to(adminSocketId).emit('adminViewPlayers', allPlayers);
                    }
                }
            } catch(e) {}
            delete rooms[roomCode];
        }, 2500);
    });

    socket.on('disconnect', () => { 
        delete players[socket.id]; 
        if(pendingDeposits[socket.id]) { delete pendingDeposits[socket.id]; if(adminSocketId) io.to(adminSocketId).emit('adminViewRequests', pendingDeposits); }
        if(pendingWithdrawals[socket.id]) { delete pendingWithdrawals[socket.id]; if(adminSocketId) io.to(adminSocketId).emit('adminViewWithdrawals', pendingWithdrawals); }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => { console.log(`Server running on port ${PORT}`); });