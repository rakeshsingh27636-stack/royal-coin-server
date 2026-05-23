const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const mongoose = require('mongoose');

const app = express();
app.use(cors());
app.use(express.static(__dirname));

// Database URI - Agar ye galat bhi hua, ab server crash nahi hoga!
const dbURI = "mongodb+srv://royalcoin:db_Hemant%40321@cluster0.xdnwkjr.mongodb.net/royalcasino?retryWrites=true&w=majority";

mongoose.connect(dbURI, { 
    maxPoolSize: 10, 
    serverSelectionTimeoutMS: 2000 // 2 second me fail hoke RAM mode me jayega
})
.then(() => console.log("✅ MongoDB Connected!"))
.catch((err) => console.log("⚠️ DB Offline: Server running in RAM-Mode!"));

const playerSchema = new mongoose.Schema({
    name: String, phone: { type: String, unique: true },
    balance: { type: Number, default: 0 },
    matchesPlayed: { type: Number, default: 0 },
    totalWon: { type: Number, default: 0 }, totalLost: { type: Number, default: 0 }
});
const Player = mongoose.model('Player', playerSchema);

// RAM Database (DB fail hone par ye game ko zinda rakhega)
let ramDB = {}; 
let players = {};
let pendingDeposits = {}; let pendingWithdrawals = {}; let rooms = {};
let adminSocketId = null;

// Safe User Fetcher (RAM + DB Hybrid)
async function getAndUpdateUser(phone, name) {
    if(!phone) return null;
    // RAM me initialize karo
    if(!ramDB[phone]) ramDB[phone] = { name: name || "Player", phone: phone, balance: 0, totalWon: 0, totalLost: 0, matchesPlayed: 0 };
    
    try {
        if(mongoose.connection.readyState === 1) {
            let u = await Player.findOne({ phone: phone });
            if(!u) { u = new Player(ramDB[phone]); await u.save(); }
            ramDB[phone].balance = u.balance; // Sync with DB
            return u;
        }
    } catch(e) { console.log("Query fallback to RAM for:", phone); }
    return ramDB[phone]; // DB fail hone par RAM wala data bhej do
}

async function saveUser(userObj) {
    try { if(userObj.save && mongoose.connection.readyState === 1) await userObj.save(); } 
    catch(e) {} // Ignore DB save errors, game RAM me chalega
}

app.get('/', (req, res) => { res.sendFile(path.join(__dirname, 'index.html')); });
// Admin Panel Route (Basic structure)
app.get('/admin-secret-panel', (req, res) => { res.send(`<h1>Admin Panel Active - Live Data Only</h1>`); });

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*", methods: ["GET", "POST"] } });

setInterval(() => {
    const bots = ["CryptoKing", "LuckySpinner", "RajaBet", "CoinMaster"];
    io.emit('liveTickerUpdate', { text: `🔥 ${bots[Math.floor(Math.random()*bots.length)]} won ₹${Math.floor(Math.random()*4500)+500}!` });
}, 3500);

io.on('connection', (socket) => {
    players[socket.id] = { currentRoom: null };
    
    socket.on('setUserData', async (data) => {
        let user = await getAndUpdateUser(data.phone, data.name);
        if(user) socket.emit('updateBalance', { newBalance: user.balance });
    });

    // 🏆 NEVER-FAIL COUPON SYSTEM
    socket.on('redeemCoupon', async (data) => {
        if(!data.phone) return socket.emit('couponResult', { status: 'error', message: '❌ Invalid Session! Please refresh.' });
        if(data.code === 'ROYAL20K') {
            let user = await getAndUpdateUser(data.phone, data.name);
            if(user) {
                user.balance += 20000;
                ramDB[data.phone].balance = user.balance; // Update RAM explicitly
                await saveUser(user);
                socket.emit('updateBalance', { newBalance: user.balance });
                socket.emit('couponResult', { status: 'success', message: '🎉 EXCELLENT! ₹20,000 added to Wallet!' });
            }
        } else {
            socket.emit('couponResult', { status: 'error', message: '❌ Invalid Coupon Code!' });
        }
    });

    socket.on('placeBet', async (data) => {
        if(!data.phone) return socket.emit('error', { message: 'Session Error! Refresh page.' });
        let user = await getAndUpdateUser(data.phone, data.name);
        
        if(!user || user.balance < data.amount) return socket.emit('error', { message: 'Insufficient balance!' });
        
        user.balance -= data.amount;
        ramDB[data.phone].balance = user.balance;
        await saveUser(user);

        socket.emit('matchmakingStarted', { bot: { name: "System_Bot", avatar: "🤖" } });
        
        setTimeout(async () => {
            const sideRes = Math.random() < 0.5 ? 'heads' : 'tails';
            let status = 'lost';
            
            user.matchesPlayed += 1;
            if(sideRes === data.side) { 
                user.balance += (data.amount * 2); 
                user.totalWon += data.amount;
                status = 'won'; 
            } else {
                user.totalLost += data.amount;
            }
            
            ramDB[data.phone].balance = user.balance;
            await saveUser(user);
            socket.emit('gameResult', { tossResult: sideRes, status: status, newBalance: user.balance, isPvp: false });
        }, 2500);
    });

    // --- PVP LOGIC ---
    socket.on('createRoom', async (data) => {
        if(!data.phone) return;
        let u = await getAndUpdateUser(data.phone);
        if(!u || u.balance < data.amount) return socket.emit('error', { message: 'Balance low!' });
        let code = Math.floor(1000 + Math.random() * 9000).toString();
        rooms[code] = { host: socket.id, hostPhone: data.phone, guest: null, guestPhone: null, wager: data.amount, selectorSide: data.side, turn: socket.id };
        players[socket.id].currentRoom = code;
        socket.join(code); socket.emit('roomCreated', { code: code, wager: data.amount, side: data.side });
    });

    socket.on('joinRoom', async (data) => {
        let room = rooms[data.code];
        if(!room || room.guest || socket.id === room.host) return socket.emit('error', { message: 'Invalid Room!' });
        let u = await getAndUpdateUser(data.phone);
        if(!u || u.balance < room.wager) return socket.emit('error', { message: 'Balance low!' });

        room.guest = socket.id; room.guestPhone = data.phone; 
        players[socket.id].currentRoom = data.code; 
        socket.join(data.code); executePvpToss(data.code);
    });

    async function executePvpToss(roomCode) {
        let room = rooms[roomCode]; if(!room) return;
        let hDb = await getAndUpdateUser(room.hostPhone);
        let gDb = await getAndUpdateUser(room.guestPhone);
        
        if(!hDb || !gDb || hDb.balance < room.wager || gDb.balance < room.wager) {
            io.to(roomCode).emit('pvpRoomClosedNotify', 'Match Terminated.'); return delete rooms[roomCode];
        }

        hDb.balance -= room.wager; gDb.balance -= room.wager;
        ramDB[room.hostPhone].balance = hDb.balance; ramDB[room.guestPhone].balance = gDb.balance;
        await saveUser(hDb); await saveUser(gDb);

        io.to(roomCode).emit('pvpRematchMatchStarted', { message: "Tossing..." });

        setTimeout(async () => {
            const result = Math.random() < 0.5 ? 'heads' : 'tails';
            let selectorWon = (result === room.selectorSide);
            let winnerId = selectorWon ? room.turn : (room.turn === room.host ? room.guest : room.host);
            let pot = room.wager * 2;

            if (winnerId === room.host) { hDb.balance += pot; } else { gDb.balance += pot; }

            ramDB[room.hostPhone].balance = hDb.balance; ramDB[room.guestPhone].balance = gDb.balance;
            await saveUser(hDb); await saveUser(gDb);

            io.to(room.host).emit('updateBalance', { newBalance: hDb.balance });
            io.to(room.guest).emit('updateBalance', { newBalance: gDb.balance });
            io.to(room.host).emit('gameResult', { tossResult: result, status: (winnerId === room.host ? 'won' : 'lost'), newBalance: hDb.balance, isPvp: true });
            io.to(room.guest).emit('gameResult', { tossResult: result, status: (winnerId === room.guest ? 'won' : 'lost'), newBalance: gDb.balance, isPvp: true });
        }, 2500);
    }

    socket.on('pvpRequestRematch', () => { let room = rooms[players[socket.id]?.currentRoom]; if(room) io.to(socket.id === room.host ? room.guest : room.host).emit('pvpPromptRematchInvite'); });
    socket.on('pvpRematchResponse', (data) => { let room = rooms[players[socket.id]?.currentRoom]; if(room) { if(data.action === 'exit') { io.to(players[socket.id].currentRoom).emit('pvpRoomClosedNotify', 'Friend exited.'); delete rooms[players[socket.id].currentRoom]; } else { room.turn = (room.turn === room.host) ? room.guest : room.host; io.to(room.turn).emit('pvpSetupTurnChoice'); io.to(room.turn === room.host ? room.guest : room.host).emit('pvpWaitingForFriendTurn'); } } });
    socket.on('pvpSubmitRematchChoices', (data) => { let room = rooms[players[socket.id]?.currentRoom]; if(room) { room.wager = parseInt(data.wager); room.selectorSide = data.side; executePvpToss(players[socket.id].currentRoom); } });
    socket.on('pvpExitRoom', () => { let c = players[socket.id]?.currentRoom; if(c && rooms[c]) { io.to(c).emit('pvpRoomClosedNotify', 'Lobby closed.'); delete rooms[c]; } });
    socket.on('disconnect', () => { delete players[socket.id]; });
});

// Port properly bound for Render
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => { console.log(`🚀 Server LIVE on Port ${PORT}`); });