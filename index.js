<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover" />
  <title>Lucky Royal Premium</title>
  <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;800&family=Cinzel:wght@700;900&display=swap" rel="stylesheet">
  <script src="/socket.io/socket.io.js"></script>
  
  <style>
    /* 🎨 ULTRA PREMIUM 3D COLOR PALETTE */
    :root { 
      --bg-main: #090c15; --bg-card: #141b2d; --bg-card-hover: #1e293b;
      --gold-light: #fcf6ba; --gold-mid: #bf953f; --gold-dark: #b38728;
      --text-main: #ffffff; --text-muted: #94a3b8; --neon-blue: #00f0ff;
      --gold-gradient: linear-gradient(to right, #bf953f, #fcf6ba, #b38728, #fbf5b7, #aa771c);
      --red-gradient: linear-gradient(135deg, #ef4444, #991b1b);
    }
    
    * { box-sizing: border-box; font-family: 'Poppins', sans-serif; user-select: none; }
    body { background: #000; margin: 0; color: var(--text-main); display: flex; justify-content: center; }
    ::-webkit-scrollbar { display: none; }
    
    .app-container { width: 100%; max-width: 400px; height: 100vh; background: var(--bg-main); display: flex; flex-direction: column; overflow: hidden; position: relative; }

    /* --- COMMON CLASSES --- */
    .big-btn { width: 100%; padding: 14px; border-radius: 10px; border: none; background: var(--gold-gradient); color: #000; font-weight: 800; font-size: 14px; cursor: pointer; box-shadow: 0 5px 15px rgba(191, 149, 63, 0.4); text-transform: uppercase; }
    .input-field { width: 100%; padding: 14px; margin: 10px 0; background: #000; border: 1px solid #333; color: #fff; border-radius: 10px; text-align: center; outline: none; font-weight: bold; }
    .input-field:focus { border-color: var(--gold-mid); }
    .page-header { font-size: 18px; font-weight: 800; color: var(--gold-light); text-align: center; padding: 15px 0; border-bottom: 1px solid rgba(255,255,255,0.05); background: var(--bg-card);}

    /* --- 👑 TOP HEADER & WALLET --- */
    .header { display: flex; justify-content: space-between; align-items: center; padding: 15px 20px 10px; }
    .profile-info { display: flex; align-items: center; gap: 12px; }
    .avatar { width: 45px; height: 45px; border-radius: 50%; border: 2px solid var(--gold-mid); background: #000; display: flex; justify-content: center; align-items: center; font-size: 24px; box-shadow: 0 0 10px rgba(191,149,63,0.4); }
    .user-name { font-size: 16px; font-weight: 800; margin: 0; }
    .vip-tag { font-size: 11px; color: var(--gold-light); font-weight: 600; background: rgba(191, 149, 63, 0.15); padding: 2px 8px; border-radius: 10px; border: 1px solid rgba(191,149,63,0.3); }
    .wallet-card { margin: 10px 20px; background: linear-gradient(135deg, #1a2235, #0d121f); border-radius: 16px; padding: 20px; border: 1px solid rgba(255,255,255,0.05); box-shadow: 0 10px 30px rgba(0,0,0,0.5); position: relative; }
    .wallet-title { font-size: 12px; color: var(--text-muted); font-weight: 600; margin-bottom: 5px; }
    .balance-amt { font-size: 28px; font-weight: 800; color: #fff; }
    .shield-icon { position: absolute; right: 10px; top: 10px; font-size: 70px; opacity: 0.8; filter: drop-shadow(0 10px 15px rgba(0,0,0,0.5)); }

    /* --- 🏆 LIVE WINNERS (Animated) --- */
    .section-title { font-size: 14px; font-weight: 800; margin: 0 20px 10px; }
    .winners-scroll { display: flex; gap: 10px; overflow-x: auto; padding: 0 20px 10px; }
    .winner-card { min-width: 140px; background: var(--bg-card); border-radius: 12px; padding: 10px; display: flex; align-items: center; gap: 10px; border: 1px solid rgba(255,255,255,0.03); transition: opacity 0.5s; }
    .win-info h4 { margin: 0; font-size: 10px; color: var(--text-muted); font-weight: 600; }
    .win-info .amt { margin: 0; font-size: 13px; color: var(--gold-mid); font-weight: 800; }

    /* --- 🎮 GAMES GRID --- */
    .games-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; padding: 0 20px 20px; }
    .game-card { background: var(--bg-card); border-radius: 16px; position: relative; border: 1px solid rgba(255,255,255,0.05); box-shadow: 0 5px 15px rgba(0,0,0,0.3); padding-bottom: 10px; text-align: center; cursor: pointer; }
    .game-icon-area { width: 100%; height: 85px; display: flex; justify-content: center; align-items: center; font-size: 50px; border-top-left-radius: 16px; border-top-right-radius: 16px;}
    .bg-coin { background: radial-gradient(circle, #2d2613, #11141d); }
    .bg-wingo { background: radial-gradient(circle, #1e3a5f, #11141d); }
    .game-name { font-size: 11px; font-weight: 800; margin: 8px 0 2px; }
    .tag-hot { position: absolute; top:0; right:0; background:#ef4444; color:#fff; font-size:8px; padding:2px 6px; border-bottom-left-radius:8px; font-weight:800; }

    /* --- 🧭 BOTTOM NAV --- */
    .bottom-nav { position: fixed; bottom: 0; width: 100%; max-width: 400px; height: 65px; background: rgba(15,23,42,0.95); backdrop-filter: blur(10px); border-top: 1px solid rgba(255,255,255,0.05); display: flex; justify-content: space-around; align-items: center; z-index: 100; }
    .nav-item { display: flex; flex-direction: column; align-items: center; color: var(--text-muted); font-size: 10px; font-weight: 600; cursor: pointer; width: 20%; gap: 2px;}
    .nav-item.active { color: var(--gold-mid); }
    .nav-icon { font-size: 20px; transition: 0.3s; }
    .nav-item.active .nav-icon { transform: translateY(-2px); filter: drop-shadow(0 0 5px rgba(191,149,63,0.8)); }

    /* --- 🖥️ VIEWS & MODALS --- */
    .view-section { display: none; width: 100%; height: 100%; overflow-y: auto; flex-direction: column; padding-bottom: 80px; }
    .view-section.active { display: flex; }
    .modal-overlay { display: none; position: fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.9); z-index:200; justify-content:center; align-items:center; padding:20px; box-sizing:border-box; }
    .modal-content { background: var(--bg-card); border: 1px solid var(--gold-dark); border-radius: 20px; padding: 25px; width: 100%; max-width: 340px; text-align: center; box-shadow: 0 10px 40px rgba(0,0,0,0.8); max-height: 85vh; overflow-y:auto; }

    /* --- 🪙 COIN TOSS ARENA --- */
    .ct-arena { height: 100vh; background: radial-gradient(circle at center, #1a2235, var(--bg-main)); display: flex; flex-direction: column; }
    .ct-header { padding: 15px; border-bottom: 1px solid rgba(255,255,255,0.05); }
    .vs-box { display: flex; justify-content: space-between; align-items: center; background: rgba(0,0,0,0.4); margin: 15px; padding: 15px; border-radius: 16px; border: 1px solid rgba(255,255,255,0.05); }
    .player-col { text-align: center; }
    .player-col .avt { width: 45px; height: 45px; border-radius: 50%; background: #000; border: 2px solid var(--gold-mid); display: flex; justify-content: center; align-items: center; font-size: 20px; margin: 0 auto 5px; }
    .vs-txt { font-size: 22px; font-weight: 900; color: var(--gold-mid); font-family: 'Cinzel'; }
    
    .coin-wrapper { flex: 1; display: flex; justify-content: center; align-items: center; perspective: 1200px; }
    .coin-3d { width: 150px; height: 150px; position: relative; transform-style: preserve-3d; border-radius: 50%; box-shadow: 0 20px 50px rgba(0,0,0,0.8); }
    .c-face { position: absolute; width: 100%; height: 100%; backface-visibility: hidden; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-family: 'Cinzel'; font-size: 26px; font-weight: 900; border: 8px solid #b38728; box-sizing: border-box; }
    .c-heads { background: radial-gradient(circle, #fff, #fcf6ba, #aa771c); color: #3a2700; transform: rotateY(0deg); }
    .c-tails { background: radial-gradient(circle, #fff, #cbd5e1, #64748b); color: #0f172a; border-color: #94a3b8; transform: rotateY(180deg); }
    .flipping { animation: flipAnim 0.18s infinite linear; }
    @keyframes flipAnim { 0% { transform: rotateY(0deg); } 50% { transform: rotateY(180deg) translateY(-25px); } 100% { transform: rotateY(360deg); } }
    .stop-h { transform: rotateY(0deg); transition: transform 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275); }
    .stop-t { transform: rotateY(180deg); transition: transform 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275); }

    .bottom-controls { background: var(--bg-card); border-top-left-radius: 24px; border-top-right-radius: 24px; padding: 20px; }
    .amt-row { display: flex; justify-content: space-between; align-items: center; background: #000; padding: 8px 15px; border-radius: 12px; margin-bottom: 12px; border: 1px solid #333; }
    .amt-btn { background: none; border: none; color: var(--gold-mid); font-size: 24px; font-weight: bold; cursor: pointer; }
    .amt-inp { background: none; border: none; color: #fff; font-size: 20px; font-weight: 800; width: 100px; text-align: center; outline: none; }
    .side-row { display: flex; gap: 10px; margin-bottom: 12px; }
    .side-btn { flex: 1; padding: 12px; background: #000; color: var(--text-muted); border: 2px solid #333; border-radius: 12px; font-weight: 800; cursor: pointer; }
    .side-btn.active { background: rgba(191,149,63,0.1); color: var(--gold-light); border-color: var(--gold-mid); box-shadow: 0 0 10px rgba(191, 149, 63, 0.3); }
    
    /* Transaction Item */
    .tx-item { background: #000; border: 1px solid #333; border-radius: 10px; padding: 12px; margin-bottom: 10px; text-align: left; font-size:12px; }
    .tx-header { display: flex; justify-content: space-between; font-weight: 800; margin-bottom: 5px; }
    .tx-date { font-size: 10px; color: var(--text-muted); }
  </style>
</head>
<body>

  <div class="app-container">

    <div id="view-home" class="view-section active">
      <div class="header">
        <div class="profile-info">
          <div class="avatar">👨‍💻</div>
          <div><h3 class="user-name" id="home-name">Guest</h3><div class="vip-tag">💎 VIP Gold</div></div>
        </div>
        <div style="font-size:24px; color:var(--gold-mid);" onclick="openModal('helpModal')">🎧</div>
      </div>

      <div class="wallet-card">
        <div class="shield-icon">🛡️</div>
        <div class="wallet-title">Wallet Balance</div>
        <div class="balance-amt">₹ <span id="display-balance">0.00</span></div>
      </div>

      <div class="section-title" style="margin-top:10px;">Live Winners</div>
      <div class="winners-scroll" id="live-winners-box">
        </div>

      <div class="section-title" style="margin-top:10px;">Popular Games</div>
      <div class="games-grid">
        <div class="game-card" onclick="switchView('view-cointoss')">
          <div class="tag-hot">HOT</div>
          <div class="game-icon-area bg-coin">🪙</div>
          <div class="game-name">Royal Coin Toss</div>
        </div>
        <div class="game-card" onclick="alert('Wingo Lottery unlocking soon!')">
          <div class="game-icon-area bg-wingo"><span style="color:#fff; font-size:40px;">5</span></div>
          <div class="game-name">Wingo Lottery</div>
        </div>
        <div class="game-card" onclick="alert('7 Up 7 Down in maintenance')">
          <div class="game-icon-area" style="background:#2d1b3a;">🎲</div>
          <div class="game-name">7 Up 7 Down</div>
        </div>
      </div>
    </div>

    <div id="view-wallet" class="view-section">
      <div class="page-header">ROYAL WALLET</div>
      <div class="wallet-card" style="text-align:center;">
        <div class="wallet-title">Available Cash</div>
        <div class="balance-amt" style="font-size:36px; color:var(--gold-mid);">₹ <span id="wallet-balance">0.00</span></div>
      </div>
      <div style="padding:0 20px; display:flex; gap:10px;">
        <button class="big-btn" style="background: linear-gradient(135deg, #0ea5e9, #2563eb); color:#fff;" onclick="openModal('depositModal')">📥 DEPOSIT</button>
        <button class="big-btn" style="background: var(--red-gradient); color:#fff;" onclick="openModal('withdrawModal')">📤 WITHDRAW</button>
      </div>
      <h3 style="color:var(--text-muted); font-size:12px; margin:20px 20px 5px; text-transform:uppercase;">Redeem Coupon</h3>
      <div style="padding:0 20px; display:flex; gap:10px;">
        <input type="text" id="coupon-val" class="input-field" placeholder="Enter Code" style="margin:0;" />
        <button class="big-btn" style="width:40%; margin:0; padding:10px;" onclick="applyCoupon()">APPLY</button>
      </div>
      <h3 style="color:var(--text-muted); font-size:12px; margin:20px 20px 5px; text-transform:uppercase;">Recent Transactions</h3>
      <div id="tx-history-box" style="padding:0 20px;"></div>
    </div>

    <div id="view-profile" class="view-section">
      <div class="page-header">ACCOUNT CENTER</div>
      <div style="padding:20px; text-align:center;">
        <div class="avatar" style="width:80px;height:80px;font-size:40px;margin:0 auto 10px;">👨‍💻</div>
        <h2 style="margin:0; color:#fff;" id="prof-name">Guest</h2>
        <p style="color:var(--text-muted); font-size:12px;" id="prof-phone">UID: ----</p>
      </div>
      <div style="padding:0 20px;">
        <button class="big-btn" style="margin-bottom:15px; background:#1e293b; color:#fff;" onclick="openModal('helpModal')">🎧 Support Center</button>
        <button class="big-btn" style="background:#1e293b; color:#fff;" onclick="alert('Rewards & VIP System updating...')">🎁 My Rewards</button>
      </div>
    </div>

    <div id="view-cointoss" class="view-section">
      <div class="ct-arena">
        <div class="ct-header"><button class="big-btn" style="width:auto; padding:8px 20px; background:#141b2d; color:#fff;" onclick="switchView('view-home')">⬅ Lobby</button></div>
        
        <div class="vs-box">
          <div class="player-col"><div class="avt" id="bot-avt" style="border-color:#ef4444;">🤖</div><div class="nme" id="bot-nme">System</div></div>
          <div class="vs-txt">VS</div>
          <div class="player-col"><div class="avt">👨‍💻</div><div class="nme" id="ct-p-name">You</div></div>
        </div>

        <div class="coin-wrapper">
          <div class="coin-3d" id="c-obj">
            <div class="c-face c-heads">HEADS</div><div class="c-face c-tails">TAILS</div>
          </div>
        </div>

        <div class="bottom-controls">
          <div style="text-align:center; font-size:14px; font-weight:800; color:var(--gold-light); margin-bottom:15px;" id="ct-status">AWAITING PREDICTION...</div>
          <div class="amt-row">
            <button class="amt-btn" onclick="adjWager(-100)">-</button>
            <div style="color:var(--gold-mid); font-weight:800;">₹ <input type="number" id="inp-wager" class="amt-inp" value="100" readonly/></div>
            <button class="amt-btn" onclick="adjWager(100)">+</button>
          </div>
          <div class="side-row">
            <button class="side-btn" id="btn-heads" onclick="pickSide('heads')">HEADS</button>
            <button class="side-btn" id="btn-tails" onclick="pickSide('tails')">TAILS</button>
          </div>
          <button class="big-btn" id="btn-play" onclick="playGame()" style="margin-bottom:10px;">PLAY GLOBAL</button>
          <button class="big-btn" style="background:transparent; border:1px solid var(--neon-blue); color:var(--neon-blue);" onclick="openModal('pvpMenuModal')">⚔️ PLAY WITH FRIEND</button>
        </div>
      </div>
    </div>

    <div class="bottom-nav">
      <div class="nav-item active" onclick="switchView('view-home')"><div class="nav-icon">🏠</div><span>Home</span></div>
      <div class="nav-item" onclick="switchView('view-wallet')"><div class="nav-icon">💼</div><span>Wallet</span></div>
      <div class="nav-item" onclick="switchView('view-profile')"><div class="nav-icon">👤</div><span>Profile</span></div>
    </div>

    <div class="modal-overlay" id="loginModal" style="display:flex;">
      <div class="modal-content">
        <div style="font-size:50px;">👑</div><h2 style="color:#fff; margin:5px 0;">LUCKY ROYAL</h2>
        <input type="text" id="log-name" class="input-field" placeholder="Enter Nickname" />
        <input type="number" id="log-phone" class="input-field" placeholder="Mobile Number" />
        <button class="big-btn" onclick="doLogin()">START PLAYING</button>
      </div>
    </div>

    <div class="modal-overlay" id="depositModal">
      <div class="modal-content">
        <h2 style="color:var(--gold-mid); margin:0 0 15px;">ADD FUNDS</h2>
        <div id="dep-stage-1">
          <input type="number" id="dep-amt" class="input-field" placeholder="Amount (Min ₹100)" />
          <button class="big-btn" onclick="genUPI()">PAY VIA UPI</button>
        </div>
        <div id="dep-stage-2" style="display:none;">
          <h3 style="color:#fff;">PAY ₹<span id="pay-show"></span></h3>
          <a id="upi-link" href="#" class="big-btn" style="display:block; text-decoration:none; background:#3b82f6; color:#fff; margin-bottom:15px;">🚀 OPEN UPI APP</a>
          <input type="number" id="utr-inp" class="input-field" placeholder="Enter 12-Digit UTR" />
          <button class="big-btn" onclick="subUTR()">SUBMIT UTR</button>
        </div>
        <p style="color:var(--text-muted); font-size:12px; margin-top:15px; cursor:pointer;" onclick="closeModal('depositModal')">Close</p>
      </div>
    </div>

    <div class="modal-overlay" id="withdrawModal">
      <div class="modal-content">
        <h2 style="color:var(--gold-mid); margin:0 0 15px;">WITHDRAW</h2>
        <input type="number" id="wit-amt" class="input-field" placeholder="Amount (Min ₹1000)" />
        <input type="text" id="wit-upi" class="input-field" placeholder="Your UPI ID" />
        <button class="big-btn" style="background: var(--red-gradient); color:#fff;" onclick="subWithdraw()">REQUEST WITHDRAW</button>
        <p style="color:var(--text-muted); font-size:12px; margin-top:15px; cursor:pointer;" onclick="closeModal('withdrawModal')">Cancel</p>
      </div>
    </div>

    <div class="modal-overlay" id="helpModal">
      <div class="modal-content">
        <h2 style="color:var(--gold-mid); margin:0 0 15px;">SUPPORT 🎧</h2>
        <textarea id="sup-msg" class="input-field" placeholder="Describe your issue..." style="height:80px; resize:none;"></textarea>
        <button class="big-btn" onclick="subTicket()">SEND TICKET</button>
        <p style="color:var(--text-muted); font-size:12px; margin-top:15px; cursor:pointer;" onclick="closeModal('helpModal')">Close</p>
      </div>
    </div>

    <div class="modal-overlay" id="pvpMenuModal">
      <div class="modal-content">
        <h2 style="color:var(--gold-mid); margin:0 0 15px;">PVP MENU ⚔️</h2>
        <button class="big-btn" style="margin-bottom:10px;" onclick="pvpCreate()">🏠 CREATE ROOM</button>
        <p style="color:var(--text-muted); font-size:12px; margin:5px 0;">OR</p>
        <input type="number" id="join-code" class="input-field" placeholder="4-Digit Code" />
        <button class="big-btn" style="background:#3b82f6; color:#fff;" onclick="pvpJoin()">🤝 JOIN ROOM</button>
        <p style="color:var(--text-muted); font-size:12px; margin-top:15px; cursor:pointer;" onclick="closeModal('pvpMenuModal')">Cancel</p>
      </div>
    </div>

    <div class="modal-overlay" id="pvpWaitModal">
      <div class="modal-content">
        <h2 style="color:#fff; margin:0 0 5px;">ROOM CREATED</h2>
        <div style="font-size:32px; font-weight:900; color:var(--neon-blue); letter-spacing:3px;" id="pvp-code-show">----</div>
        <p style="color:var(--text-muted); font-size:12px;">⏳ Waiting for friend...</p>
        <button class="big-btn" style="background:var(--red-gradient); color:#fff; margin-top:15px;" onclick="pvpExit()">CANCEL</button>
      </div>
    </div>
    
    <div class="modal-overlay" id="pvpChallengeModal">
      <div class="modal-content">
        <h2 style="color:var(--gold-mid);">CHALLENGE ⚔️</h2>
        <p style="color:#fff; font-size:18px; font-weight:800;">₹<span id="ch-amt">0</span> on <span id="ch-side" style="color:var(--neon-blue);">HEADS</span></p>
        <button class="big-btn" onclick="pvpAccept()">✅ ACCEPT & PLAY</button>
        <button class="big-btn" style="background:var(--red-gradient); color:#fff; margin-top:10px;" onclick="pvpExit()">❌ REJECT</button>
      </div>
    </div>

    <div class="modal-overlay" id="pvpEndModal">
      <div class="modal-content">
        <h2 id="pvp-res-txt" style="font-size:22px; margin:0 0 15px;">RESULT</h2>
        <button class="big-btn" onclick="pvpReqRematch()">🔄 PLAY AGAIN</button>
        <button class="big-btn" style="background:var(--bg-card-hover); color:#fff; margin-top:10px;" onclick="pvpExit()">⬅ EXIT</button>
      </div>
    </div>

  </div> <script>
    const socket = io();
    let balance = 0; let wager = 100; let side = null;
    let uName = localStorage.getItem('rName') || ""; let uPhone = localStorage.getItem('rPhone') || "";
    const MY_UPI_ID = "royalcasino@ybl"; 

    // --- AUDIO ENGINE ---
    const aCtx = new (window.AudioContext || window.webkitAudioContext)();
    function playSnd(t) {
        try {
            if(aCtx.state === 'suspended') aCtx.resume();
            const o = aCtx.createOscillator(); const g = aCtx.createGain(); o.connect(g); g.connect(aCtx.destination);
            if(t === 'click') { o.frequency.setValueAtTime(800, aCtx.currentTime); g.gain.setValueAtTime(0.1, aCtx.currentTime); o.start(); o.stop(aCtx.currentTime + 0.05); }
            else if(t === 'flip') { o.type='sine'; o.frequency.setValueAtTime(350, aCtx.currentTime); o.frequency.exponentialRampToValueAtTime(150, aCtx.currentTime+0.12); g.gain.setValueAtTime(0.04, aCtx.currentTime); g.gain.exponentialRampToValueAtTime(0.001, aCtx.currentTime+0.12); o.start(); o.stop(aCtx.currentTime + 0.12); }
            else if(t === 'win') { o.frequency.setValueAtTime(587.33, aCtx.currentTime); g.gain.setValueAtTime(0.1, aCtx.currentTime); o.start(); o.stop(aCtx.currentTime + 0.4); }
            else if(t === 'loss') { o.type='sawtooth'; o.frequency.setValueAtTime(150, aCtx.currentTime); g.gain.setValueAtTime(0.1, aCtx.currentTime); o.start(); o.stop(aCtx.currentTime + 0.4); }
        } catch(e) {}
    }

    // --- UI ROUTING & MODALS ---
    function switchView(vid) {
        playSnd('click');
        document.querySelectorAll('.view-section').forEach(v => v.classList.remove('active'));
        document.getElementById(vid).classList.add('active');
        document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
        if(vid==='view-home') document.querySelectorAll('.nav-item')[0].classList.add('active');
        if(vid==='view-wallet') document.querySelectorAll('.nav-item')[1].classList.add('active');
        if(vid==='view-profile') document.querySelectorAll('.nav-item')[2].classList.add('active');
        if(vid==='view-wallet' || vid==='view-profile') socket.emit('fetchHistory', {phone: uPhone});
    }
    function openModal(id) { playSnd('click'); document.getElementById(id).style.display = 'flex'; }
    function closeModal(id) { playSnd('click'); document.getElementById(id).style.display = 'none'; }

    // --- SESSION ---
    window.onload = () => { if(uName && uPhone) { document.getElementById('loginModal').style.display = 'none'; syncUser(); } initTicker(); }
    function doLogin() {
        let n = document.getElementById('log-name').value; let p = document.getElementById('log-phone').value;
        if(!n || !p) return alert('Fill details!'); playSnd('click');
        localStorage.setItem('rName', n); localStorage.setItem('rPhone', p);
        uName = n; uPhone = p; closeModal('loginModal'); syncUser();
    }
    function syncUser() {
        document.getElementById('home-name').innerText = uName; document.getElementById('prof-name').innerText = uName; document.getElementById('ct-p-name').innerText = uName;
        document.getElementById('prof-phone').innerText = "UID: " + uPhone;
        socket.emit('setUserData', { name: uName, phone: uPhone });
    }

    // --- DATA SYNC ---
    socket.on('updateBalance', (d) => { balance = d.newBalance; document.getElementById('display-balance').innerText = balance+".00"; document.getElementById('wallet-balance').innerText = balance+".00"; });
    socket.on('error', (e) => { alert(e.message); document.getElementById('btn-play').disabled = false; });
    
    socket.on('updateHistory', (list) => {
        const box = document.getElementById("tx-history-box"); box.innerHTML = "";
        if(list.length===0) return box.innerHTML = "<p style='color:#aaa; font-size:12px;'>No records.</p>";
        list.forEach(tx => {
            let col = "#aaa"; if(tx.status.includes("Success")) col="#22c55e"; if(tx.status.includes("Reject")||tx.status.includes("Cancel")) col="#ef4444";
            box.innerHTML += `<div class="tx-item"><div class="tx-header"><span style="color:var(--gold-light);">${tx.type}</span><span>₹${tx.amount}</span></div><div class="tx-date">${tx.date} | ${tx.detail}</div><div style="color:${col}; font-weight:800; margin-top:5px;">${tx.status}</div></div>`;
        });
    });

    // --- DYNAMIC WINNERS TICKER ---
    const botNames = ["Rahul_Pro", "Vikram_777", "Aarav_King", "Priya_Win", "Neha_Ace", "Kabir_Boss", "Amit_Shark", "Raj_007", "Karan_Vip"];
    function initTicker() {
        setInterval(() => {
            const box = document.getElementById('live-winners-box'); box.innerHTML = '';
            for(let i=0; i<4; i++){
                let n = botNames[Math.floor(Math.random()*botNames.length)]; let a = Math.floor(Math.random()*45000)+5000;
                box.innerHTML += `<div class="winner-card"><div class="avatar" style="width:30px;height:30px;font-size:16px;">🔥</div><div class="win-info"><h4>${n} won</h4><p class="amt">₹ ${a}</p></div></div>`;
            }
        }, 3500);
    }

    // --- WALLET FUNCTIONS ---
    function genUPI() {
        let a = parseInt(document.getElementById('dep-amt').value); if(isNaN(a) || a<100) return alert('Min ₹100'); playSnd('click');
        document.getElementById('pay-show').innerText = a; document.getElementById('upi-link').href = `upi://pay?pa=${MY_UPI_ID}&pn=LuckyRoyal&am=${a}&cu=INR`;
        document.getElementById('dep-stage-1').style.display='none'; document.getElementById('dep-stage-2').style.display='block';
    }
    function subUTR() {
        let a = parseInt(document.getElementById('dep-amt').value); let u = document.getElementById('utr-inp').value;
        if(u.length!==12) return alert('Invalid 12-Digit UTR'); playSnd('click');
        socket.emit('submitManualDeposit', {amount: a, utr: u, phone: uPhone});
        alert('Request Sent to Admin!'); closeModal('depositModal'); document.getElementById('dep-stage-1').style.display='block'; document.getElementById('dep-stage-2').style.display='none';
    }
    function subWithdraw() {
        let a = parseInt(document.getElementById('wit-amt').value); let u = document.getElementById('wit-upi').value;
        if(isNaN(a)||a<1000||!u) return alert('Min ₹1000 & valid UPI needed'); if(a>balance) return alert('Low Balance'); playSnd('click');
        socket.emit('withdrawFunds', {amount: a, upi: u, phone: uPhone}); alert('Withdraw Request Sent!'); closeModal('withdrawModal');
    }
    function applyCoupon() {
        let c = document.getElementById('coupon-val').value.toUpperCase(); if(!c) return; playSnd('click');
        socket.emit('redeemCoupon', {code: c, phone: uPhone, name: uName});
    }
    socket.on('couponResult', (d) => { alert(d.message); if(d.status==='success') document.getElementById('coupon-val').value = ''; });
    function subTicket() { let m=document.getElementById('sup-msg').value; if(m.length<5) return; playSnd('click'); socket.emit('submitSupportTicket',{phone:uPhone, message:m}); alert('Ticket Sent!'); closeModal('helpModal'); }
    socket.on('supportTicketResult', (d) => alert(d.message));

    // --- COIN TOSS LOGIC ---
    function adjWager(v) { playSnd('click'); wager+=v; if(wager<100) wager=100; document.getElementById('inp-wager').value=wager; }
    function pickSide(s) { playSnd('click'); side=s; document.getElementById('btn-heads').classList.remove('active'); document.getElementById('btn-tails').classList.remove('active'); document.getElementById('btn-'+s).classList.add('active'); document.getElementById('ct-status').innerText='LOCKED: '+s.toUpperCase(); }
    
    function playGame() {
        if(!side) return alert('Select Side!'); if(wager>balance) return alert('Low Balance!'); playSnd('click');
        document.getElementById('btn-play').disabled=true; document.getElementById('ct-status').innerText='SEARCHING LOBBY...';
        socket.emit('placeBet', {side:side, amount:wager, phone:uPhone, name:uName});
    }

    socket.on('matchmakingStarted', (d) => { 
      document.getElementById('bot-nme').innerText = d.bot.name; 
      document.getElementById('bot-avt').innerText = d.bot.avatar;
      document.getElementById('ct-status').innerText = 'TOSSING...';
      let fInt = setInterval(()=>playSnd('flip'), 140); setTimeout(()=>clearInterval(fInt), 5000);
      document.getElementById('c-obj').className = 'coin-3d flipping'; 
    });
    
    socket.on('gameResult', (d) => {
        const c = document.getElementById('c-obj'); c.className = d.tossResult==='heads' ? 'coin-3d stop-h' : 'coin-3d stop-t';
        setTimeout(() => {
            if(d.status==='won') playSnd('win'); else playSnd('loss');
            document.getElementById('ct-status').innerText = d.status==='won' ? '🎉 YOU WON!' : '❌ YOU LOST';
            document.getElementById('ct-status').style.color = d.status==='won' ? '#22c55e' : '#ef4444';
            setTimeout(() => { 
                document.getElementById('ct-status').innerText='AWAITING PREDICTION...'; document.getElementById('ct-status').style.color='var(--gold-light)';
                document.getElementById('btn-play').disabled=false; document.getElementById('bot-nme').innerText='System'; document.getElementById('bot-avt').innerText='🤖';
                if(d.isPvp) { closeModal('pvpChallengeModal'); document.getElementById('pvp-res-txt').innerText=d.status==='won'?"🎉 WON MATCH!":"❌ LOST MATCH!"; document.getElementById('pvp-res-txt').style.color=d.status==='won'?'#22c55e':'#ef4444'; openModal('pvpEndModal'); }
            }, 3000);
        }, 600);
    });

    // --- PVP LOGIC ---
    function pvpCreate() { if(!side) return alert('Select Side in Arena first!'); if(wager>balance) return alert('Low Balance!'); playSnd('click'); socket.emit('createRoom', {amount:wager, side:side, phone:uPhone}); closeModal('pvpMenuModal'); }
    socket.on('roomCreated', (d) => { document.getElementById('pvp-code-show').innerText=d.code; openModal('pvpWaitModal'); });
    function pvpJoin() { let c=document.getElementById('join-code').value; if(c.length!==4) return; playSnd('click'); socket.emit('joinRoom', {code:c, phone:uPhone}); closeModal('pvpMenuModal'); }
    socket.on('pvpShowChallengePop', (d) => { closeModal('pvpWaitModal'); closeModal('pvpEndModal'); document.getElementById('ch-amt').innerText=d.wager; document.getElementById('ch-side').innerText=d.side.toUpperCase(); openModal('pvpChallengeModal'); });
    function pvpAccept() { playSnd('click'); closeModal('pvpChallengeModal'); socket.emit('pvpAcceptChallenge'); }
    function pvpReqRematch() { playSnd('click'); document.getElementById('pvp-res-txt').innerText='WAITING...'; socket.emit('pvpRequestRematch'); }
    function pvpExit() { playSnd('click'); socket.emit('pvpExitRoom'); closeModal('pvpWaitModal'); closeModal('pvpChallengeModal'); closeModal('pvpEndModal'); }
    socket.on('pvpRematchMatchStarted', () => { closeModal('pvpWaitModal'); document.getElementById('bot-nme').innerText='Friend'; document.getElementById('bot-avt').innerText='😎'; document.getElementById('ct-status').innerText='TOSSING...'; let fInt=setInterval(()=>playSnd('flip'),140); setTimeout(()=>clearInterval(fInt),5000); document.getElementById('c-obj').className='coin-3d flipping'; });
    socket.on('pvpRoomClosedNotify', (m) => { alert(m); pvpExit(); });
  </script>
</body>
</html>