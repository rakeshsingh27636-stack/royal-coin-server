const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');

const app = express();
app.use(express.static(__dirname));

const dbURI = "mongodb+srv://royalcoin:Hemant%40321@cluster0.xdnwkjr.mongodb.net/royalcasino?retryWrites=true&w=majority";

// Connection with error handling
mongoose.connect(dbURI).catch(err => console.log("DB Connection Warning"));

const playerSchema = new mongoose.Schema({
    name: String,
    phone: { type: String, unique: true },
    balance: { type: Number, default: 0 }
});
const Player = mongoose.model('Player', playerSchema);

app.get('/', (req, res) => res.sendFile(__dirname + '/index.html'));

const server = http.createServer(app);
const io = new Server(server);

// Light Memory Storage (RAM me data rakho, DB sync baad me karo)
let players = {}; 

io.on('connection', (socket) => {
    socket.on('setUserData', async (data) => {
        let u = await Player.findOne({ phone: data.phone });
        if(!u) u = await new Player({ name: data.name, phone: data.phone, balance: 0 }).save();
        players[socket.id] = { phone: data.phone, balance: u.balance };
        socket.emit('updateBalance', { newBalance: u.balance });
    });

    socket.on('redeemCoupon', async (data) => {
        if(data.code === 'ROYAL20K') {
            let u = await Player.findOne({ phone: data.phone });
            if(u) {
                u.balance += 20000;
                await u.save();
                socket.emit('updateBalance', { newBalance: u.balance });
                socket.emit('couponResult', { status: 'success', message: '₹20,000 added!' });
            }
        }
    });

    socket.on('placeBet', async (data) => {
        let u = await Player.findOne({ phone: data.phone });
        if(u && u.balance >= data.amount) {
            u.balance -= data.amount;
            const res = Math.random() < 0.5 ? 'heads' : 'tails';
            let won = (res === data.side);
            if(won) u.balance += (data.amount * 2);
            await u.save();
            socket.emit('gameResult', { tossResult: res, status: won ? 'won' : 'lost', newBalance: u.balance });
        }
    });
});

server.listen(3000, () => console.log("Server running..."));