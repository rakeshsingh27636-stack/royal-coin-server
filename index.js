const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const mongoose = require('mongoose');

const app = express();
app.use(cors());
app.use(express.static(__dirname));

// ✅ SCALABILITY UPGRADE: Crash Protection (Prevents server from stopping on minor errors)
process.on('uncaughtException', (err) => console.log("[System Warning] Caught exception: ", err));
process.on('unhandledRejection', (err) => console.log("[System Warning] Caught rejection: ", err));

// ✅ SCALABILITY UPGRADE: MongoDB High Concurrency Connection
const dbURI = "mongodb+srv://royaladmin:royal123@cluster0.xdnwkjr.mongodb.net/royalcasino?retryWrites=true&w=majority";

mongoose.connect(dbURI, { 
    maxPoolSize: 50, // Pehle 10 tha, ab 50 ek sath queries process hongi
    serverSelectionTimeoutMS: 10000,
    socketTimeoutMS: 45000 // Slow internet walo ke connection zinda rakhega
})
.then(() => console.log("✅ MongoDB High-Concurrency DB Connected!"))
.catch((err) => console.log("❌ Database Connection Error: ", err));

const txSchema = new mongoose.Schema({
    txId: String,
    type: String, 
    amount: Number,
    status: { type: String, default: 'Processing ⏳' }, 
    detail: String, 
    date: { type: String }
});

const playerSchema = new mongoose.Schema({
    name: String,
    phone: { type: String, unique: true },
    balance: { type: Number, default: 0 },
    matchesPlayed: { type: Number, default: 0 },
    totalWon: { type: Number, default: 0 },
    totalLost: { type: Number, default: 0 },
    transactions: [txSchema] 
});
const Player = mongoose.model('Player', playerSchema);

app.get('/', (req, res) => { res.sendFile(path.join(__dirname, 'index.html')); });

// 👑 SECRET ADMIN PANEL ROUTE
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
                .refresh-btn { background: #00ff99; color: #000; border: none; box-shadow: 0 0 10px rgba(0,255,153,0.5); }
                .tab-content { display: none; }
                .tab-content.active { display: block; }
                .req-card { background: #250006; border: 1px solid #ffd700; padding: 15px; margin: 15px auto; max-width: 500px; border-radius: 10px; text-align: left; }
                button.action { padding: 10px 20px; font-weight: bold; cursor: pointer; border: none; border-radius: 5px; margin-right: 10px;}
                .app-btn { background: #00ff99; color: #000; }
                .rej-btn { background: #ff3366; color: #fff; }
                .resolve-btn { background: #00b4db; color: #000; width: 100%; margin-top: 10px;}
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
                    <button class="tab-btn active" onclick="switchTab('tab-deposits', this)">📥 DEPOSITS</button>
                    <button class="tab-btn" onclick="switchTab('tab-withdrawals', this)">📤 WITHDRAWS</button>
                    <button class="tab-btn" onclick="switchTab('tab-support', this)">🎧 SUPPORT TICKETS</button>
                    <button class="tab-btn" onclick="switchTab('tab-database', this)">📊 DB</button>
                    <button class="tab-btn refresh-btn" onclick="refreshAdminData()">🔄 REFRESH DATA</button>
                </div>
                <div id="tab-deposits" class="tab-content active"><div id="deposits-container"></div></div>
                <div id="tab-withdrawals" class="tab-content"><div id="withdrawals-container"></div></div>
                <div id="tab-support" class="tab-content"><div id="support-container"></div></div>
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
                function switchTab(id, btn) { document.querySelectorAll('.tab-content').forEach(t=>t.classList.remove('active')); document.querySelectorAll('.tab-btn:not(.refresh-btn)').forEach(b=>b.classList.remove('active')); document.getElementById(id).classList.add('active'); btn.classList.add('active'); }
                
                function refreshAdminData() {
                    socket.emit('registerAdmin'); 
                    let btn = document.querySelector('.refresh-btn');
                    btn.innerText = "⏳ FETCHING...";
                    setTimeout(() => { btn.innerText = "🔄 REFRESH DATA"; }, 1000);
                }

                socket.on('adminViewRequests', (reqs) => { const c = document.getElementById('deposits-container'); c.innerHTML=''; if(Object.keys(reqs).length === 0) c.innerHTML = '<p style="color:#aaa;">No pending deposits.</p>'; for(let id in reqs) { c.innerHTML += \`<div class="req-card"><p><strong>Player:</strong> \${reqs[id].name} (\${reqs[id].phone})</p><p><strong>Amount:</strong> ₹\${reqs[id].amount} | UTR: <span style="color:#ffd700;">\${reqs[id].utr}</span></p><div style="margin-top:15px;"><button class="action app-btn" onclick="socket.emit('adminDepAction',{requestId:'\${id}',action:'approve'})">APPROVE</button><button class="action rej-btn" onclick="socket.emit('adminDepAction',{requestId:'\${id}',action:'reject'})">REJECT</button></div></div>\`; } });
                socket.on('adminViewWithdrawals', (wits) => { const c = document.getElementById('withdrawals-container'); c.innerHTML=''; if(Object.keys(wits).length === 0) c.innerHTML = '<p style="color:#aaa;">No pending withdrawals.</p>'; for(let id in wits) { c.innerHTML += \`<div class="req-card" style="border-color:#ff3366;"><p><strong>Player:</strong> \${wits[id].name} (\${wits[id].phone})</p><p><strong>Amount:</strong> <span style="color:#00ff99;">₹\${wits[id].amount}</span> | UPI: <span style="color:#ffd700;">\${wits[id].upi}</span></p><div style="margin-top:15px;"><button class="action app-btn" onclick="socket.emit('adminWithAction',{requestId:'\${id}',action:'approve'})">PAID</button><button class="action rej-btn" onclick="socket.emit('adminWithAction',{requestId:'\${id}',action:'reject'})">REFUND</button></div></div>\`; } });
                socket.on('adminViewSupport', (tickets) => { const c = document.getElementById('support-container'); c.innerHTML=''; if(Object.keys(tickets).length === 0) c.innerHTML = '<p style="color:#aaa;">No active support tickets.</p>'; for(let id in tickets) { c.innerHTML += \`<div class="req-card" style="border-color:#00b4db;"><p><strong>Player:</strong> \${tickets[id].name} (\${tickets[id].phone})</p><p style="color:#aaa; font-size:12px;">\${tickets[id].date}</p><p style="background:#000; padding:10px; border-radius:5px; border-left:3px solid #00b4db; margin-top:10px;">\${tickets[id].message}</p><button class="action resolve-btn" onclick="socket.emit('adminResolveTicket',{ticketId:'\${id}'})">✅ MARK RESOLVED</button></div>\`; } });
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
let pendingSupport = {}; 
let rooms = {};
let adminSocketId = null;

// ✅ SCALABILITY UPGRADE: Anti-Spam Rate Limiting State
let rateLimits = {};

function isSpam(socketId, action, cooldownMs) {
    if (!rateLimits[socketId]) rateLimits[socketId] = {};
    const now = Date.now();
    if (rateLimits[socketId][action] && (now - rateLimits[socketId][action] < cooldownMs)) {
        return true; // Request blocked
    }
    rateLimits[socketId][action] = now;
    return false; // Request allowed
}

const firstNames = ["Rahul", "Vikram", "Aarav", "Priya", "Neha", "Kabir", "Amit", "Raj", "Karan", "Rohan", "Anjali", "Ravi", "Suresh", "Ramesh", "Sunil", "Vikas", "Pooja", "Kavita", "Sanjay", "Ajay", "Vijay", "Anita", "Sunita", "Deepak", "Manoj", "Anil", "Mukesh", "Dinesh", "Gaurav", "Saurabh", "Ashish", "Manish", "Nitin", "Sachin", "Vishal", "Yogesh", "Pankaj", "Tarun", "Varun", "Arun", "Akash", "Rishabh", "Shubham", "Abhishek", "Aditya", "Nikhil", "Prashant", "Sumit", "Mohit", "Rohit"];
const tags = ["_Pro", "_King", "_Ace", "_777", "_007", "_Win", "_Casino", "_HighRoller", "_Bet", "_Spins", "_99", "_Master", "_Gamer", "_Vip", "_Boss", "_Lucky", "_Don", "_Shark", "_Star", "_Ninja"];
let fakeRealNames = [];
firstNames.forEach(name => { tags.forEach(tag => { fakeRealNames.push(name + tag); }); });

setInterval(() => {
    io.emit('liveTickerUpdate', { text: `🔥 ${fakeRealNames[Math.floor(Math.random()*fakeRealNames.length)]} won ₹${Math.floor(Math.random()*4500)+500}!` });
}, 4500);

async function getAndUpdateUser(phone, name) {
    if(!phone) return null;
    let u = await Player.findOne({ phone: phone });
    if(!u) { u = new Player({ name: name || "Player", phone: phone, balance: 0, totalLost: 0, transactions: [] }); await u.save(); }
    return u;
}

function getFormattedDate() {
    const d = new Date();
    return d.toLocaleDateString('en-IN') + ' ' + d.toLocaleTimeString('en-IN', {hour: '2-digit', minute:'2-digit'});
}

io.on('connection', (socket) => {
    players[socket.id] = { currentRoom: null };
    
    socket.on('registerAdmin', async () => {
        adminSocketId = socket.id;
        socket.emit('adminViewRequests', pendingDeposits);
        socket.emit('adminViewWithdrawals', pendingWithdrawals);
        socket.emit('adminViewSupport', pendingSupport);
        Player.find({}).then(all => socket.emit('adminViewPlayers', all)).catch(e=>{});
    });

    socket.on('setUserData', async (data) => {
        if(isSpam(socket.id, 'setUserData', 1000)) return; // Prevents rapid re-logins
        let user = await getAndUpdateUser(data.phone, data.name);
        if(user) {
            socket.emit('updateBalance', { newBalance: user.balance });
            socket.emit('updateHistory', user.transactions); 
            if(adminSocketId) Player.find({}).then(all => io.to(adminSocketId).emit('adminViewPlayers', all));
        }
    });

    socket.on('submitSupportTicket', async (data) => {
        if (isSpam(socket.id, 'support', 5000)) return socket.emit('error', { message: 'Please wait before sending another ticket.' });
        if(!data.phone) return;
        let u = await Player.findOne({ phone: data.phone });
        if(u) {
            let ticketId = "TKT" + Math.floor(1000 + Math.random() * 9000);
            pendingSupport[ticketId] = { name: u.name, phone: u.phone, message: data.message, date: getFormattedDate(), socketId: socket.id };
            
            if(adminSocketId) io.to(adminSocketId).emit('adminViewSupport', pendingSupport);
            socket.emit('supportTicketResult', { status: 'success', message: 'Ticket submitted successfully! Admin will review it shortly.' });
        }
    });

    socket.on('adminResolveTicket', (data) => {
        if(socket.id !== adminSocketId) return;
        if(pendingSupport[data.ticketId]) {
            let userSocket = pendingSupport[data.ticketId].socketId;
            io.to(userSocket).emit('supportTicketResult', { status: 'resolved', message: 'Admin has reviewed and resolved your support ticket.' });
            delete pendingSupport[data.ticketId];
        }
        socket.emit('adminViewSupport', pendingSupport);
    });

    socket.on('fetchHistory', async (data) => {
        if(!data.phone) return;
        let user = await Player.findOne({ phone: data.phone });
        if(user) socket.emit('updateHistory', user.transactions.reverse()); 
    });

    socket.on('submitManualDeposit', async (data) => { 
        if (isSpam(socket.id, 'deposit', 5000)) return socket.emit('error', { message: 'Too many requests. Please wait.' });
        if(!data.phone) return;
        let u = await getAndUpdateUser(data.phone, "Player");
        if(u) {
            let txId = "DEP" + Math.floor(100000 + Math.random() * 900000);
            u.transactions.push({ txId: txId, type: 'Deposit', amount: data.amount, status: 'Processing ⏳', detail: 'UTR: ' + data.utr, date: getFormattedDate() });
            await u.save();

            pendingDeposits[txId] = { name: u.name, phone: u.phone, amount: data.amount, utr: data.utr, dbId: u._id, requestSocket: socket.id }; 
            
            socket.emit('updateHistory', u.transactions.reverse());
            if(adminSocketId) io.to(adminSocketId).emit('adminViewRequests', pendingDeposits); 
        }
    });
    
    socket.on('adminDepAction', async (data) => {
        if(socket.id !== adminSocketId) return;
        const dep = pendingDeposits[data.requestId];
        if(dep) {
            let u = await Player.findById(dep.dbId);
            if(u) {
                let tx = u.transactions.find(t => t.txId === data.requestId);
                if (tx) tx.status = (data.action === 'approve') ? 'Success ✅' : 'Rejected ❌';

                if(data.action === 'approve') u.balance += parseInt(dep.amount);
                await u.save();

                io.to(dep.requestSocket).emit('updateBalance', { newBalance: u.balance });
                io.to(dep.requestSocket).emit('updateHistory', u.transactions.reverse());
                if(adminSocketId) Player.find({}).then(all => io.to(adminSocketId).emit('adminViewPlayers', all));
            }
        }
        delete pendingDeposits[data.requestId]; socket.emit('adminViewRequests', pendingDeposits);
    });

    socket.on('withdrawFunds', async (data) => {
        if (isSpam(socket.id, 'withdraw', 5000)) return socket.emit('error', { message: 'Processing previous request...' });
        if(!data.phone) return;
        let u = await getAndUpdateUser(data.phone, "Player");
        if(u && u.balance >= data.amount) {
            u.balance -= data.amount; 
            
            let txId = "WIT" + Math.floor(100000 + Math.random() * 900000);
            u.transactions.push({ txId: txId, type: 'Withdraw', amount: data.amount, status: 'Processing ⏳', detail: 'UPI: ' + data.upi, date: getFormattedDate() });
            await u.save();

            socket.emit('updateBalance', { newBalance: u.balance });
            socket.emit('updateHistory', u.transactions.reverse());
            
            pendingWithdrawals[txId] = { name: u.name, phone: u.phone, amount: data.amount, upi: data.upi, dbId: u._id, requestSocket: socket.id };
            if(adminSocketId) io.to(adminSocketId).emit('adminViewWithdrawals', pendingWithdrawals);
        }
    });
    
    socket.on('adminWithAction', async (data) => {
        if(socket.id !== adminSocketId) return;
        const wit = pendingWithdrawals[data.requestId];
        if(wit) {
            let u = await Player.findById(wit.dbId);
            if(u) {
                let tx = u.transactions.find(t => t.txId === data.requestId);
                if (tx) tx.status = (data.action === 'approve') ? 'Success ✅' : 'Rejected ❌ (Refunded)';

                if(data.action === 'reject') { u.balance += parseInt(wit.amount); } 
                await u.save();

                io.to(wit.requestSocket).emit('updateBalance', { newBalance: u.balance });
                io.to(wit.requestSocket).emit('updateHistory', u.transactions.reverse());
            }
        }
        delete pendingWithdrawals[data.requestId]; socket.emit('adminViewWithdrawals', pendingWithdrawals);
        if(adminSocketId) Player.find({}).then(all => io.to(adminSocketId).emit('adminViewPlayers', all));
    });

    socket.on('cancelWithdrawal', async (data) => {
        if (isSpam(socket.id, 'cancelWith', 2000)) return;
        if(!data.phone) return;
        let u = await Player.findOne({ phone: data.phone });
        if(u) {
            let tx = u.transactions.find(t => t.txId === data.txId);
            if(tx && tx.status === 'Processing ⏳' && tx.type === 'Withdraw') {
                tx.status = 'Cancelled 🚫 (Refunded)';
                u.balance += tx.amount; 
                await u.save();
                
                delete pendingWithdrawals[data.txId];
                if(adminSocketId) io.to(adminSocketId).emit('adminViewWithdrawals', pendingWithdrawals);
                
                socket.emit('updateBalance', { newBalance: u.balance });
                socket.emit('updateHistory', u.transactions.reverse());
            }
        }
    });

    socket.on('redeemCoupon', async (data) => {
        if (isSpam(socket.id, 'coupon', 3000)) return socket.emit('couponResult', { status: 'error', message: 'Wait a moment...' });
        if(!data.phone) return socket.emit('couponResult', { status: 'error', message: '❌ Invalid Session! Please refresh the page.' });
        if(data.code === 'ROYAL20K') {
            let user = await getAndUpdateUser(data.phone, data.name);
            if(user) {
                user.balance += 20000; 
                let txId = "BONUS" + Math.floor(1000 + Math.random() * 9000);
                user.transactions.push({ txId: txId, type: 'Coupon', amount: 20000, status: 'Success ✅', detail: 'Code: ROYAL20K', date: getFormattedDate() });
                await user.save();
                
                socket.emit('updateBalance', { newBalance: user.balance });
                socket.emit('updateHistory', user.transactions.reverse());
                socket.emit('couponResult', { status: 'success', message: '🎉 EXCELLENT! Special Coupon Code Applied. ₹20,000 cash balance added to your wallet!' });
                if(adminSocketId) Player.find({}).then(all => io.to(adminSocketId).emit('adminViewPlayers', all));
            }
        } else {
            socket.emit('couponResult', { status: 'error', message: '❌ Invalid Coupon Code! Please try again.' });
        }
    });

    // 🎲 GLOBAL MATCH TOSS
    socket.on('placeBet', async (data) => {
        // ✅ ANTI-SPAM: Blocks rapidly fired game requests
        if (isSpam(socket.id, 'placeBet', 3000)) return socket.emit('error', { message: 'Too many requests! Game is processing.' });
        
        if(!data.phone) return socket.emit('error', { message: 'Session Error! Refresh page.' });
        let u = await getAndUpdateUser(data.phone, data.name);
        if(!u || u.balance < data.amount) return socket.emit('error', { message: 'Insufficient balance!' });
        
        u.balance -= data.amount;
        await u.save();
        socket.emit('updateBalance', { newBalance: u.balance }); 

        setTimeout(() => {
            let randomOpponent = fakeRealNames[Math.floor(Math.random() * fakeRealNames.length)];
            socket.emit('matchmakingStarted', { bot: { name: randomOpponent, avatar: "😎" } });
            
            setTimeout(async () => {
                let freshU = await Player.findById(u._id);
                if(!freshU) return;

                let sideRes;
                const rand = Math.random(); 
                if (rand < 0.70) { sideRes = (data.side === 'heads') ? 'tails' : 'heads'; } 
                else { sideRes = data.side; }

                let status = (sideRes === data.side) ? 'won' : 'lost';
                freshU.matchesPlayed += 1;
                if(status === 'won') { freshU.balance += (data.amount * 2); freshU.totalWon += data.amount; } 
                else { freshU.totalLost += data.amount; }
                
                await freshU.save();
                socket.emit('updateBalance', { newBalance: freshU.balance }); 
                socket.emit('gameResult', { tossResult: sideRes, status: status, newBalance: freshU.balance, isPvp: false });
                if(adminSocketId) Player.find({}).then(all => io.to(adminSocketId).emit('adminViewPlayers', all));
            }, 5000); 
        }, 3500); 
    });

    // ⚔️ PVP FRIENDS CORE ENGINE
    socket.on('createRoom', async (data) => {
        if (isSpam(socket.id, 'room', 2000)) return;
        if(!data.phone) return;
        let u = await getAndUpdateUser(data.phone);
        if(!u || u.balance < data.amount) return socket.emit('error', { message: 'Balance low!' });
        
        let code = Math.floor(1000 + Math.random() * 9000).toString();
        rooms[code] = { host: socket.id, hostPhone: data.phone, guest: null, guestPhone: null, wager: data.amount, selectorSide: data.side, turn: socket.id };
        players[socket.id].currentRoom = code;
        socket.join(code); socket.emit('roomCreated', { code: code, wager: data.amount, side: data.side });
    });

    socket.on('joinRoom', async (data) => {
        if (isSpam(socket.id, 'room', 2000)) return;
        let room = rooms[data.code];
        if(!room || room.guest || socket.id === room.host) return socket.emit('error', { message: 'Invalid Room!' });
        if(!data.phone) return; 
        
        let u = await getAndUpdateUser(data.phone);
        if(!u || u.balance < room.wager) return socket.emit('error', { message: 'Balance low!' });

        room.guest = socket.id; room.guestPhone = data.phone; 
        players[socket.id].currentRoom = data.code; 
        socket.join(data.code);
        
        socket.emit('pvpShowChallengePop', { wager: room.wager, side: room.selectorSide });
    });

    socket.on('pvpAcceptChallenge', () => {
        let code = players[socket.id] ? players[socket.id].currentRoom : null;
        if(code && rooms[code]) executePvpToss(code);
    });

    async function executePvpToss(roomCode) {
        let room = rooms[roomCode]; if(!room) return;
        
        let hostDb = await getAndUpdateUser(room.hostPhone);
        let guestDb = await getAndUpdateUser(room.guestPhone);
        
        if(!hostDb || !guestDb || hostDb.balance < room.wager || guestDb.balance < room.wager) {
            io.to(roomCode).emit('pvpRoomClosedNotify', 'Insufficient user funds. Match terminated.'); 
            return delete rooms[roomCode];
        }

        hostDb.balance -= room.wager; guestDb.balance -= room.wager;
        hostDb.matchesPlayed += 1; guestDb.matchesPlayed += 1;
        await hostDb.save(); await guestDb.save();

        io.to(roomCode).emit('pvpRematchMatchStarted', { message: "Coin In The Air! Tossing..." });

        setTimeout(async () => {
            let hFresh = await Player.findById(hostDb._id);
            let gFresh = await Player.findById(guestDb._id);

            const result = Math.random() < 0.5 ? 'heads' : 'tails';
            let selectorWon = (result === room.selectorSide);
            let winnerSocketId = selectorWon ? room.turn : (room.turn === room.host ? room.guest : room.host);
            let pot = room.wager * 2;

            if (winnerSocketId === room.host) { 
                hFresh.balance += pot; hFresh.totalWon += room.wager; gFresh.totalLost += room.wager; 
            } else { 
                gFresh.balance += pot; gFresh.totalWon += room.wager; hFresh.totalLost += room.wager; 
            }

            await hFresh.save(); await gFresh.save();

            io.to(room.host).emit('updateBalance', { newBalance: hFresh.balance });
            io.to(room.guest).emit('updateBalance', { newBalance: gFresh.balance });
            io.to(room.host).emit('gameResult', { tossResult: result, status: (winnerSocketId === room.host ? 'won' : 'lost'), newBalance: hFresh.balance, isPvp: true });
            io.to(room.guest).emit('gameResult', { tossResult: result, status: (winnerSocketId === room.guest ? 'won' : 'lost'), newBalance: gFresh.balance, isPvp: true });
            
            if(adminSocketId) Player.find({}).then(all => io.to(adminSocketId).emit('adminViewPlayers', all));
        }, 5000);
    }

    socket.on('pvpRequestRematch', () => {
        if (isSpam(socket.id, 'rematch', 2000)) return;
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
        room.wager = parseInt(data.wager); room.selectorSide = data.side; 
        
        let targetId = (socket.id === room.host) ? room.guest : room.host;
        io.to(targetId).emit('pvpShowChallengePop', { wager: room.wager, side: room.selectorSide });
    });

    socket.on('pvpExitRoom', () => {
        let code = players[socket.id] ? players[socket.id].currentRoom : null; if(code && rooms[code]) { io.to(code).emit('pvpRoomClosedNotify', 'Lobby closed.'); delete rooms[code]; }
    });

    // ✅ CLEANUP: Remove rate limit memory when user disconnects to save RAM
    socket.on('disconnect', () => { 
        delete players[socket.id]; 
        delete rateLimits[socket.id];
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => { console.log(`Server running on port ${PORT}`); });