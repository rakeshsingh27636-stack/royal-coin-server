const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

// Har player ka apna alag balance track karne ke liye
const players = {}; 
// Private Rooms track karne ke liye
const rooms = {};

const maleNames = ["Aarav", "Vihaan", "Aditya", "Sai", "Arjun", "Rohan", "Rahul", "Amit", "Vikram", "Karan"];
const femaleNames = ["Aditi", "Priya", "Anjali", "Neha", "Pooja", "Simran", "Shruti", "Sneha", "Kavya", "Riya"];
const lastNames = ["Sharma", "Singh", "Patel", "Kumar", "Gupta", "Mishra", "Jain", "Verma", "Yadav", "Reddy"];
const maleAvatars = ["👨", "👦", "🧔", "👳‍♂️", "👱‍♂️"];
const femaleAvatars = ["👩", "👧", "🧕", "👱‍♀️", "👩‍🦱"];

function getRandomBot() {
    const isMale = Math.random() < 0.5;
    let firstName = isMale ? maleNames[Math.floor(Math.random() * maleNames.length)] : femaleNames[Math.floor(Math.random() * femaleNames.length)];
    let avatar = isMale ? maleAvatars[Math.floor(Math.random() * maleAvatars.length)] : femaleAvatars[Math.floor(Math.random() * femaleAvatars.length)];
    const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
    return { name: `${firstName} ${lastName}`, avatar: avatar };
}

app.get('/', (req, res) => { res.send('Royal Coin Toss PvP Backend Live! 🚀'); });

// Live Ticker
setInterval(() => {
    const randomWinner = getRandomBot();
    const randomPrize = Math.floor(Math.random() * 45000) + 10500; 
    const actions = ["won", "withdrew", "jackpot hit"];
    io.emit('liveTickerUpdate', { text: `🔥 ${randomWinner.avatar} ${randomWinner.name} just ${actions[Math.floor(Math.random() * actions.length)]} ₹${randomPrize.toLocaleString('en-IN')}! ` });
}, 3500);

io.on('connection', (socket) => {
    // Naya player aate hi usko 500 rs do
    players[socket.id] = { balance: 500 };
    socket.emit('updateBalance', { newBalance: players[socket.id].balance });

    socket.on('depositFunds', (data) => {
        players[socket.id].balance += data.amount; // Custom deposit amount add kiya
        socket.emit('updateBalance', { newBalance: players[socket.id].balance });
    });
    socket.on('withdrawFunds', (data) => {
        if(data.amount <= players[socket.id].balance && data.amount > 0) {
            players[socket.id].balance -= data.amount;
            socket.emit('updateBalance', { newBalance: players[socket.id].balance });
            socket.emit('withdrawSuccess', { amount: data.amount });
        } else {
            socket.emit('error', { message: "Cashout Failed! Wallet funds insufficient." });
        }
    });

    // --- SOLO PLAY (VS BOT) ---
    socket.on('placeBet', (data) => {
        const userChoice = data.side; 
        const betAmount = data.amount;

        if (betAmount > players[socket.id].balance) {
            socket.emit('error', { message: "Balance kam hai!" }); return;
        }

        const randomBot = getRandomBot();
        socket.emit('matchmakingStarted', { bot: randomBot });

        setTimeout(() => {
            const systemToss = Math.random() < 0.5 ? "heads" : "tails";
            let status = systemToss === userChoice ? "won" : "lost";
            
            if (status === "won") players[socket.id].balance += betAmount;
            else players[socket.id].balance -= betAmount;

            socket.emit('gameResult', { status, tossResult: systemToss, newBalance: players[socket.id].balance });
        }, 3500); 
    });

    // --- PVP (FRIEND MODE) ---
    // 1. Host creates room
    socket.on('createRoom', (data) => {
        if (data.amount > players[socket.id].balance) {
            socket.emit('error', { message: "Balance kam hai room banane ke liye!" }); return;
        }
        const roomCode = Math.floor(1000 + Math.random() * 9000).toString(); // 4 digit code
        rooms[roomCode] = { host: socket.id, wager: data.amount, hostSide: data.side, guest: null };
        socket.join(roomCode);
        socket.emit('roomCreated', { code: roomCode, wager: data.amount, side: data.side });
    });

    // 2. Guest joins room
    socket.on('joinRoom', (data) => {
        const code = data.code;
        const room = rooms[code];

        if (!room) {
            socket.emit('error', { message: "Invalid Room Code!" }); return;
        }
        if (room.guest) {
            socket.emit('error', { message: "Room is already full!" }); return;
        }
        if (players[socket.id].balance < room.wager) {
            socket.emit('error', { message: `Aapke pas ₹${room.wager} nahi hain ye room join karne ke liye!` }); return;
        }

        // Guest joined successfully
        room.guest = socket.id;
        socket.join(code);
        
        const guestSide = room.hostSide === 'heads' ? 'tails' : 'heads';

        // Notify both players
        io.to(code).emit('pvpMatchStarted', { 
            message: "Friend Connected! Tossing Coin...",
            hostSide: room.hostSide, guestSide: guestSide, wager: room.wager
        });

        // Toss coin after 2 seconds
        setTimeout(() => {
            const systemToss = Math.random() < 0.5 ? "heads" : "tails";
            
            // Host logic
            let hostStatus = systemToss === room.hostSide ? "won" : "lost";
            if (hostStatus === "won") players[room.host].balance += room.wager;
            else players[room.host].balance -= room.wager;
            
            // Guest logic
            let guestStatus = systemToss === guestSide ? "won" : "lost";
            if (guestStatus === "won") players[room.guest].balance += room.wager;
            else players[room.guest].balance -= room.wager;

            // Send results
            io.to(room.host).emit('gameResult', { status: hostStatus, tossResult: systemToss, newBalance: players[room.host].balance });
            io.to(room.guest).emit('gameResult', { status: guestStatus, tossResult: systemToss, newBalance: players[room.guest].balance });
            
            delete rooms[code]; // Game over, delete room
        }, 3500);
    });

    socket.on('disconnect', () => { delete players[socket.id]; });
});

server.listen(3000, () => { console.log('PvP Server Live! Pata: http://localhost:3000 🚀'); });