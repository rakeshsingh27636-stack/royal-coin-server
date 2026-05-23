const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const mongoose = require('mongoose');

const app = express();
app.use(cors());
app.use(express.static(__dirname));

// MONGODB ATLAS CONNECTION
const dbURI = "mongodb+srv://royalcoin:db_Hemant%40321@cluster0.xdnwkjr.mongodb.net/royalcasino?retryWrites=true&w=majority";
mongoose.connect(dbURI)
    .then(() => console.log("✅ MongoDB Connected!"))
    .catch((err) => console.log("❌ Database Connection Error: ", err));

const playerSchema = new mongoose.Schema({
    name: String,
    phone: { type: String, unique: true },
    balance: { type: Number, default: 0 },
    matchesPlayed: { type: Number, default: 0 },
    totalWon: { type: Number, default: 0 },
    totalLost: { type: Number, default: 0 }
});
const Player = mongoose.model('Player', playerSchema);

app.get('/', (req, res) => { res.sendFile(path.join(__dirname, 'index.html')); });

// ADMIN PANEL ROUTE
app.get('/admin-secret-panel', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Royal Casino - Admin Panel</title>
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
                body { font-family: Arial; background: #120002; color: #fff; text-align: center; margin: 0; padding: 0; }
                h1 { color: #ffd700; text-shadow: 0 0 10px rgba(255,215,0,0.5); margin-top: 20px;}
                #login-screen { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; background: #0a0001; }
                .login-box { background: #250006; padding: 40px; border: 2px solid #ffd700; border-radius: 15px; }
                input[type="password"] { padding: 12px; font-size: 18px; text-align: center; background: #000; color: #ffd700; border: 1px solid #ffd700; border-radius: 5px; outline: none; }
                #dashboard-screen { display: none; padding: 20px; }
                .tab-container { display: flex; justify-content: center; gap: 10px; margin: 20px 0; flex-wrap: wrap;}
                .tab-btn { padding: 12px 20px; background: #250006; border: 1px solid #ffd700; color: #ffd700; font-weight: bold; border-radius: 8px; cursor: pointer; }
                .tab-btn.active { background: #ffd700; color: #000; box-shadow: 0 0 15px rgba(255,215,0,0.6); }
                .tab-content { display: none; }
                .tab-content.active { display: block; }
                .req-card { background: #250006; border: 1px solid #ffd700; padding: 15px; margin: 15px auto; max-width: 500px; border-radius: 10px; text-align: left; }
                button.action { padding: 10px 20px; font-weight: bold; cursor: pointer; border: none; border-radius: 5px; margin-right: 10px;}
                .app-btn { background: #00ff99; color: #000; }
                .rej-btn { background: #ff3366; color: #fff; }
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
                    <input type="password" id="admin-pass" placeholder="Password" /><br><br>
                    <button class="action app-btn" onclick="verifyPassword()">UNLOCK DASHBOARD</button>
                    <p id="login-err" style="color:#ff3366; display:none; margin-top:10px;">Incorrect Password!</p>
                </div>
            </div>
            <div id="dashboard-screen">
                <h1>ROYAL ADMIN DASHBOARD 👑</h1>
                <div class="tab-container">
                    <button class="tab-btn active" onclick="switchTab('tab-deposits', this)">📥 PENDING DEPOSITS</button>
                    <button class="tab-btn" onclick="switchTab('tab-withdrawals', this)">📤 WITHDRAWALS</button>
                    <button class="tab-btn" onclick="switchTab('tab-database', this)">📊 PLAYERS DB</button>
                </div>
                <div id="tab-deposits" class="tab-content active"><div id="deposits-container"></div></div>
                <div id="tab-withdrawals" class="tab-content"><div id="withdrawals-container"></div></div>
                <div id="tab-database" class="tab-content">
                    <div style="overflow-x:auto;">
                        <table>
                            <thead><tr><th>Name</th><th>Mobile</th><th>Balance (₹)</th><th>Matches</th><th>Total Won (₹)</th><th>Total Lost (₹)</th></tr></thead>
                            <tbody id="players-table"></tbody>
                        </table>
                    </div>
                </div>
            </div>
            <script>
                const socket = io();
                function verifyPassword() { if(document.getElementById('admin-pass').value === 'Royal@123') { document.getElementById('login-screen').style.display='none'; document.getElementById('dashboard-screen').style.display='block'; socket.emit('registerAdmin'); } else { document.getElementById('login-err').style.display = 'block'; } }
                function switchTab(id, btn) { document.querySelectorAll('.tab-content').forEach(t=>t.classList.remove('active')); document.querySelectorAll('.tab-btn').forEach(b=>b.classList.remove('active')); document.getElementById(id).classList.add('active'); btn.classList.add('active'); }
                socket.on('adminViewRequests', (reqs) => { const c = document.getElementById('deposits-container'); c.innerHTML=''; if(Object.keys(reqs).length === 0) c.innerHTML = '<p style="color:#aaa;">No pending deposits.</p>'; for(let id in reqs) { c.innerHTML += \`<div class="req-card"><p><strong>Player:</strong> \${reqs[id].name}</p><p><strong>Amount:</strong> ₹\${reqs[id].amount} | UTR: <span style="color:#ffd700;">\${reqs[id].utr}</span></p><div style="margin-top:15px;"><button class="action app-btn" onclick="socket.emit('adminDepAction',{requestId:'\${id}',action:'approve'})">APPROVE</button><button class="action rej-btn" onclick="socket.emit('adminDepAction',{requestId:'\${id}',action:'reject'})">REJECT</button></div></div>\`; } });
                socket.on('adminViewWithdrawals', (wits) => { const c = document.getElementById('withdrawals-container'); c.innerHTML=''; if(Object.keys(wits).length === 0) c.innerHTML = '<p style="color:#aaa;">No pending withdrawals.</p>'; for(let id in wits) { c.innerHTML += \`<div class="req-card" style="border-color:#ff3366;"><p><strong>Player:</strong> \${wits[id].name}</p><p><strong>Amount:</strong> <span style="color:#00ff99;">₹\${wits[id].amount}</span> | UPI: <span style="color:#ffd700;">\${wits[id].upi}</span></p><div style="margin-top:15px;"><button class="action app-btn" onclick="socket.emit('adminWithAction',{requestId:'\${id}',action:'approve'})">PAID</button><button class="action rej-btn" onclick="socket.emit('adminWithAction',{requestId:'\${id}',action:'reject'})">REFUND</button></div></div>\`; } });
                socket.on('adminViewPlayers', (list) => { const t = document.getElementById('players-table'); t.innerHTML=''; list.forEach(p=>{ let lostAmount = p.totalLost || 0; t.innerHTML+=\`<tr><td>\${p.name}</td><td>\${p.phone}</td><td style="color:#ffd700; font-weight:bold;">₹\${p.balance}</td><td>\${p.matchesPlayed}</td><td style="color:#00ff99; font-weight:bold;">₹\${p.totalWon}</td><td style="color:#ff3366; font-weight:bold;">₹\${lostAmount}</td></tr>\`; }); });
            </script>
        </body>
        </html>
    `);
});

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*", methods: ["GET", "POST"] } });

let players = {};
let pendingDeposits = {};
let pendingWithdrawals = {};
let rooms = {};
let adminSocketId = null;

setInterval(() => {
    const bots = ["CryptoKing", "LuckySpinner", "RajaBet", "CoinMaster"];
    io.emit('liveTickerUpdate', { text: `🔥 ${bots[Math.floor(Math.random()*bots.length)]} won ₹${Math.floor(Math.random()*4500)+500}!` });
}, 3500);

// SAFE DATABASE SYNC FUNCTION (Background processing so app never blocks)
function updateDBAsync(phone, name, balanceChange = 0, matchAdd = 0, wonAdd = 0, lostAdd = 0) {
    if(!phone) return;
    Player.findOne({ phone: phone }).then(user => {
        if(!user) user = new Player({ name: name || "Player", phone: phone, balance: 0, totalLost: 0 });
        user.balance += balanceChange;
        user.matchesPlayed += matchAdd;
        user.totalWon += wonAdd;
        user.totalLost += lostAdd;
        user.save().then(() => {
            if(adminSocketId) Player.find({}).then(all => io.to(adminSocketId).emit('adminViewPlayers', all));
        }).catch(e => console.log("DB save issue ignored"));
    }).catch(e => console.log("DB lookup issue ignored"));
}

io.on('connection', (socket) => {
    players[socket.id] = { name: "Guest", phone: "", balance: 0, currentRoom: null };
    
    socket.on('registerAdmin', async () => {
        adminSocketId = socket.id;
        socket.emit('adminViewRequests', pendingDeposits);
        socket.emit('adminViewWithdrawals', pendingWithdrawals);
        Player.find({}).then(all => socket.emit('adminViewPlayers', all)).catch(e=>{});
    });

    socket.on('setUserData', (data) => {
        if(players[socket.id]) { players[socket.id].name = data.name; players[socket.id].phone = data.phone; }
        Player.findOne({ phone: data.phone }).then(user => {
            if(user) {
                if(players[socket.id]) players[socket.id].balance = user.balance;
                socket.emit('updateBalance', { newBalance: user.balance });
            } else {
                let u = new Player({ name: data.name, phone: data.phone, balance: 0 });
                u.save().catch(e=>{}); socket.emit('updateBalance', { newBalance: 0 });
            }
            if(adminSocketId) Player.find({}).then(all => io.to(adminSocketId).emit('adminViewPlayers', all));
        }).catch(e => { socket.emit('updateBalance', { newBalance: players[socket.id] ? players[socket.id].balance : 0 }); });
    });

    // BULLETPROOF COUPON - Update RAM Instantly, then DB Async
    socket.on('redeemCoupon', (data) => {
        if(data.code === 'ROYAL20K') {
            if(players[socket.id]) {
                players[socket.id].balance += 20000;
                players[socket.id].name = data.name || players[socket.id].name;
                players[socket.id].phone = data.phone || players[socket.id].phone;
                
                socket.emit('updateBalance', { newBalance: players[socket.id].balance });
                socket.emit('couponResult', { status: 'success', message: '🎉 EXCELLENT! Special Coupon Code Applied. ₹20,000 cash balance added to your wallet!' });
                
                // Sync to DB quietly without blocking UI
                updateDBAsync(players[socket.id].phone, players[socket.id].name, 20000);
            }
        } else {
            socket.emit('couponResult', { status: 'error', message: '❌ Invalid Coupon Code! Please try again.' });
        }
    });

    socket.on('submitManualDeposit', (data) => { 
        let p = players[socket.id];
        if(p) { 
            pendingDeposits[socket.id] = { name: p.name || data.name, phone: p.phone || data.phone, amount: data.amount, utr: data.utr }; 
            if(adminSocketId) io.to(adminSocketId).emit('adminViewRequests', pendingDeposits); 
        } 
    });
    
    socket.on('adminDepAction', (data) => {
        if(socket.id !== adminSocketId) return;
        const dep = pendingDeposits[data.requestId];
        if(dep && data.action === 'approve') {
            if(players[data.requestId]) {
                players[data.requestId].balance += parseInt(dep.amount);
                io.to(data.requestId).emit('updateBalance', { newBalance: players[data.requestId].balance });
                io.to(data.requestId).emit('depositResult', { status: 'success', amount: dep.amount });
                updateDBAsync(players[data.requestId].phone, players[data.requestId].name, parseInt(dep.amount));
            }
        } else if (dep) { 
            io.to(data.requestId).emit('depositResult', { status: 'failed' }); 
        }
        delete pendingDeposits[data.requestId]; socket.emit('adminViewRequests', pendingDeposits);
    });

    socket.on('withdrawFunds', (data) => {
        let p = players[socket.id];
        if(p && p.balance >= data.amount) {
            p.balance -= data.amount;
            socket.emit('updateBalance', { newBalance: p.balance });
            pendingWithdrawals[socket.id] = { name: p.name || data.name, phone: p.phone || data.phone, amount: data.amount, upi: data.upi };
            if(adminSocketId) io.to(adminSocketId).emit('adminViewWithdrawals', pendingWithdrawals);
            updateDBAsync(p.phone, p.name, -data.amount);
        }
    });
    
    socket.on('adminWithAction', (data) => {
        if(socket.id !== adminSocketId) return;
        const wit = pendingWithdrawals[data.requestId];
        if(wit && data.action === 'reject') {
            if(players[data.requestId]) {
                players[data.requestId].balance += parseInt(wit.amount);
                io.to(data.requestId).emit('updateBalance', { newBalance: players[data.requestId].balance });
                updateDBAsync(players[data.requestId].phone, players[data.requestId].name, parseInt(wit.amount));
            }
        }
        delete pendingWithdrawals[data.requestId]; socket.emit('adminViewWithdrawals', pendingWithdrawals);
    });

    // RAM-FIRST GLOBAL MATCH TOSS (Lag-free)
    socket.on('placeBet', (data) => {
        if(!players[socket.id] || players[socket.id].balance < data.amount) {
            return socket.emit('error', { message: 'Insufficient balance!' });
        }
        
        // Instantly block spam clicking
        players[socket.id].balance -= data.amount; 
        if(data.phone) players[socket.id].phone = data.phone;
        if(data.name) players[socket.id].name = data.name;

        const bots = ["CryptoKing", "LuckySpinner", "RajaBet", "CoinMaster"];
        socket.emit('matchmakingStarted', { bot: { name: bots[Math.floor(Math.random()*bots.length)], avatar: "🤖" } });
        
        setTimeout(() => {
            const sideRes = Math.random() < 0.5 ? 'heads' : 'tails';
            let status = 'lost';
            let wonAdd = 0, lostAdd = data.amount, balanceChange = -data.amount;

            if(sideRes === data.side) { 
                players[socket.id].balance += (data.amount * 2); 
                status = 'won'; wonAdd = data.amount; lostAdd = 0; balanceChange = data.amount; 
            }
            
            socket.emit('gameResult', { tossResult: sideRes, status: status, newBalance: players[socket.id].balance, isPvp: false });
            updateDBAsync(players[socket.id].phone, players[socket.id].name, balanceChange, 1, wonAdd, lostAdd);
        }, 2500);
    });

    // --- PVP DYNAMIC LOOP ENGINE (RAM First) ---
    socket.on('createRoom', (data) => {
        if(!players[socket.id] || players[socket.id].balance < data.amount) return;
        let code = Math.floor(1000 + Math.random() * 9000).toString();
        rooms[code] = { host: socket.id, guest: null, wager: data.amount, selectorSide: data.side, turn: socket.id };
        players[socket.id].currentRoom = code;
        if(data.phone) players[socket.id].phone = data.phone;
        socket.join(code); socket.emit('roomCreated', { code: code, wager: data.amount, side: data.side });
    });

    socket.on('joinRoom', (data) => {
        let room = rooms[data.code];
        if(!room || room.guest || socket.id === room.host) return socket.emit('error', { message: 'Invalid Room!' });
        if(!players[socket.id] || players[socket.id].balance < room.wager) return socket.emit('error', { message: 'Balance low!' });

        room.guest = socket.id; players[socket.id].currentRoom = data.code; 
        if(data.phone) players[socket.id].phone = data.phone;
        socket.join(data.code); executePvpToss(data.code);
    });

    function executePvpToss(roomCode) {
        let room = rooms[roomCode]; if(!room) return;
        let hostP = players[room.host]; let guestP = players[room.guest];
        
        if(!hostP || !guestP || hostP.balance < room.wager || guestP.balance < room.wager) {
            io.to(roomCode).emit('pvpRoomClosedNotify', 'Insufficient user funds. Match terminated.'); return delete rooms[roomCode];
        }

        hostP.balance -= room.wager; guestP.balance -= room.wager;
        io.to(roomCode).emit('pvpRematchMatchStarted', { message: "Coin In The Air! Tossing..." });

        setTimeout(() => {
            const result = Math.random() < 0.5 ? 'heads' : 'tails';
            let selectorWon = (result === room.selectorSide);
            let winnerId = selectorWon ? room.turn : (room.turn === room.host ? room.guest : room.host);
            let pot = room.wager * 2;
            let hostBalChange = -room.wager; let guestBalChange = -room.wager;
            let hostWonAdd = 0, hostLostAdd = room.wager; let guestWonAdd = 0, guestLostAdd = room.wager;

            if (winnerId === room.host) { hostP.balance += pot; hostBalChange = room.wager; hostWonAdd = room.wager; hostLostAdd = 0; } 
            else { guestP.balance += pot; guestBalChange = room.wager; guestWonAdd = room.wager; guestLostAdd = 0; }

            io.to(room.host).emit('updateBalance', { newBalance: hostP.balance });
            io.to(room.guest).emit('updateBalance', { newBalance: guestP.balance });
            io.to(room.host).emit('gameResult', { tossResult: result, status: (winnerId === room.host ? 'won' : 'lost'), newBalance: hostP.balance, isPvp: true });
            io.to(room.guest).emit('gameResult', { tossResult: result, status: (winnerId === room.guest ? 'won' : 'lost'), newBalance: guestP.balance, isPvp: true });
            
            updateDBAsync(hostP.phone, hostP.name, hostBalChange, 1, hostWonAdd, hostLostAdd);
            updateDBAsync(guestP.phone, guestP.name, guestBalChange, 1, guestWonAdd, guestLostAdd);
        }, 2500);
    }

    socket.on('pvpRequestRematch', () => {
        let code = players[socket.id] ? players[socket.id].currentRoom : null; let room = rooms[code]; if(!room) return;
        let targetId = (socket.id === room.host) ? room.guest : room.host; io.to(targetId).emit('pvpPromptRematchInvite');
    });

    socket.on('pvpRematchResponse', (data) => {
        let code = players[socket.id] ? players[socket.id].currentRoom : null; let room = rooms[code]; if(!room) return;
        if(data.action === 'exit') { io.to(code).emit('pvpRoomClosedNotify', 'Your friend exited the match lobby.'); delete rooms[code]; } 
        else {
            room.turn = (room.turn === room.host) ? room.guest : room.host;
            let waiterId = (room.turn === room.host) ? room.guest : room.host;
            io.to(room.turn).emit('pvpSetupTurnChoice'); io.to(waiterId).emit('pvpWaitingForFriendTurn');
        }
    });

    socket.on('pvpSubmitRematchChoices', (data) => {
        let code = players[socket.id] ? players[socket.id].currentRoom : null; let room = rooms[code]; if(!room) return;
        room.wager = parseInt(data.wager); room.selectorSide = data.side; executePvpToss(code);
    });

    socket.on('pvpExitRoom', () => {
        let code = players[socket.id] ? players[socket.id].currentRoom : null; if(code && rooms[code]) { io.to(code).emit('pvpRoomClosedNotify', 'Lobby closed.'); delete rooms[code]; }
    });

    socket.on('disconnect', () => { 
        delete players[socket.id]; 
        if(pendingDeposits[socket.id]) { delete pendingDeposits[socket.id]; if(adminSocketId) io.to(adminSocketId).emit('adminViewRequests', pendingDeposits); }
        if(pendingWithdrawals[socket.id]) { delete pendingWithdrawals[socket.id]; if(adminSocketId) io.to(adminSocketId).emit('adminViewWithdrawals', pendingWithdrawals); }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => { console.log(`Server running on port ${PORT}`); });