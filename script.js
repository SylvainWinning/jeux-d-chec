/* Chess Starter — jeu d’échecs simple pour débutants (v2 neutral theme)
 * - Corrige l’affichage du plateau et des pièces (fallbacks sans OKLCH)
 * - Pions du joueur en ROSE, pions de l’adversaire en BLANC (quel que soit le camp choisi)
 * - Reste : règles, roque, en passant, promotion, annuler/rétablir, PGN, IA simple
 */

const FILES = ['a','b','c','d','e','f','g','h'];
const RANKS = ['8','7','6','5','4','3','2','1']; // visuellement du haut vers le bas

const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

const PIECE_UNICODE = {
  'wP':'♙','wR':'♖','wN':'♘','wB':'♗','wQ':'♕','wK':'♔',
  'bP':'♟','bR':'♜','bN':'♞','bB':'♝','bQ':'♛','bK':'♚'
};

const VALUES = { P:100, N:320, B:330, R:500, Q:900, K:10000 };

// --------- State & persistence
let state = createInitialState();
let history = [];    // stack of past states (for undo)
let future = [];     // stack for redo
let orientation = 'w'; // 'w' bottom; can be flipped
let showHints = true;
let vsCpu = false;
let playerSide = 'w'; // utilisé pour colorer les pions (rose joueur, blanc adversaire)

const boardEl = document.getElementById('board');
const statusEl = document.getElementById('status');
const movesListEl = document.getElementById('movesList');
const announceEl = document.getElementById('announce');

const newGameBtn = document.getElementById('newGameBtn');
const undoBtn = document.getElementById('undoBtn');
const redoBtn = document.getElementById('redoBtn');
const exportBtn = document.getElementById('exportBtn');
const copyLinkBtn = document.getElementById('copyLinkBtn');

const hintToggle = document.getElementById('hintToggle');
const flipToggle = document.getElementById('flipToggle');
const vsCpuToggle = document.getElementById('vsCpuToggle');
const sideSelect = document.getElementById('sideSelect');

// Basic helpers
const idx = (r,c) => r*8 + c;
const rcOf = (i) => [Math.floor(i/8), i%8];
const inside = (r,c) => r>=0 && r<8 && c>=0 && c<8;
const clone = (o) => JSON.parse(JSON.stringify(o));
const colorOf = (p) => p ? p[0] : null;
const typeOf = (p) => p ? p[1] : null;
const algebraic = (i) => FILES[i%8] + (8 - Math.floor(i/8));
const indexFromAlgebraic = (sq) => {
  const file = FILES.indexOf(sq[0]);
  const rank = parseInt(sq[1], 10);
  return idx(8 - rank, file);
};

function createInitialState(){
  return fenToState(START_FEN);
}

function fenToState(fen){
  const [boardPart, turn, castling, ep, half, full] = fen.split(' ');
  const rows = boardPart.split('/');
  const board = new Array(64).fill(null);
  for(let r=0;r<8;r++){
    let c=0;
    for(const ch of rows[r]){
      if(/[1-8]/.test(ch)){ c += parseInt(ch,10); }
      else{
        const isUpper = ch === ch.toUpperCase();
        const piece = (isUpper?'w':'b') + ch.toUpperCase();
        board[idx(r,c)] = piece;
        c++;
      }
    }
  }
  const rights = { wK:false,wQ:false,bK:false,bQ:false };
  if(castling.includes('K')) rights.wK = true;
  if(castling.includes('Q')) rights.wQ = true;
  if(castling.includes('k')) rights.bK = true;
  if(castling.includes('q')) rights.bQ = true;
  const epIdx = ep !== '-' ? indexFromAlgebraic(ep) : null;
  return {
    board, turn, castling:rights, ep: epIdx, half:parseInt(half,10), full:parseInt(full,10),
    lastMove:null, // {from,to}
    pgn: [],
    selected: null
  };
}

function stateToFen(s){
  let out = '';
  for(let r=0;r<8;r++){
    let empty=0;
    for(let c=0;c<8;c++){
      const p = s.board[idx(r,c)];
      if(!p) empty++;
      else{
        if(empty){ out += empty; empty=0; }
        const ch = p[1];
        out += (p[0]==='w') ? ch : ch.toLowerCase();
      }
    }
    if(empty) out += empty;
    if(r<7) out += '/';
  }
  const cast = `${s.castling.wK?'K':''}${s.castling.wQ?'Q':''}${s.castling.bK?'k':''}${s.castling.bQ?'q':''}` || '-';
  const ep = s.ep != null ? algebraic(s.ep) : '-';
  return `${out} ${s.turn} ${cast} ${ep} ${s.half} ${s.full}`;
}

// --------- Rendering
function renderBoard(){
  boardEl.innerHTML = '';
  boardEl.setAttribute('aria-label', `Plateau d’échecs, orientation ${orientation==='w'?'Blancs en bas':'Noirs en bas'}`);
  const order = [];
  for(let r=0;r<8;r++){
    for(let c=0;c<8;c++){
      order.push(idx(r,c));
    }
  }
  const squaresOrder = orientation==='w' ? order : order.reverse();
  for(const sqIndex of squaresOrder){
    const [r,c] = rcOf(sqIndex);
    const cell = document.createElement('button');
    cell.className = 'square ' + ((r+c)%2===0?'light':'dark');
    cell.setAttribute('role','gridcell');
    cell.setAttribute('data-index', sqIndex);
    cell.setAttribute('data-file', FILES[c]);
    cell.setAttribute('data-rank', String(8-r));
    cell.tabIndex = 0;
    if(state.lastMove && (state.lastMove.from===sqIndex || state.lastMove.to===sqIndex)){
      cell.classList.add('lastmove');
    }
    const piece = state.board[sqIndex];
    if(piece){
      const span = document.createElement('span');
      span.className = 'piece ' + (piece[0]==='w' ? 'piece--w' : 'piece--b') + ' piece-' + typeOf(piece);
      if(typeOf(piece)==='P'){
        // Coloration spéciale : pions du joueur = rose, de l'adversaire = blanc
        if(colorOf(piece)===playerSide) span.classList.add('pawn--player');
        else span.classList.add('pawn--opp');
      }
      span.textContent = PIECE_UNICODE[piece];
      span.setAttribute('aria-label', pieceToName(piece));
      cell.appendChild(span);
    }
    cell.addEventListener('click', onSquareClick);
    cell.addEventListener('keydown', (e)=>{
      if(e.key === 'Enter' || e.key === ' '){
        e.preventDefault(); onSquareClick.call(cell, e);
      }
    });
    boardEl.appendChild(cell);
  }
  drawHints();
  updateStatus();
}

function pieceToName(p){
  const color = p[0]==='w' ? 'Blanc' : 'Noir';
  const type = {P:'Pion', R:'Tour', N:'Cavalier', B:'Fou', Q:'Dame', K:'Roi'}[p[1]];
  return `${type} ${color}`;
}

function drawHints(){
  for(const el of boardEl.querySelectorAll('.dot')) el.remove();
  for(const el of boardEl.querySelectorAll('.selected')) el.classList.remove('selected');

  if(!showHints || state.selected==null) return;
  const legal = legalMovesFor(state.selected, state.turn);
  const cells = boardEl.querySelectorAll('.square');
  const currentIdx = state.selected;
  const currentCell = [...cells].find(c => parseInt(c.dataset.index,10)===currentIdx);
  if(currentCell) currentCell.classList.add('selected');
  for(const m of legal){
    const toCell = [...cells].find(c => parseInt(c.dataset.index,10)===m.to);
    if(toCell){
      const dot = document.createElement('div');
      dot.className = 'dot';
      toCell.appendChild(dot);
    }
  }
}

function updateStatus(){
  const check = inCheck(state.turn);
  const legal = allLegalMoves(state.turn);
  let text = state.turn==='w' ? 'Au tour des Blancs' : 'Au tour des Noirs';
  if(legal.length===0){
    if(check){
      text = 'Échec et mat – ' + (state.turn==='w'?'Noirs':'Blancs') + ' gagnent';
    }else{
      text = 'Pat – match nul';
    }
  }else if(check){
    text += ' – Échec !';
  }
  statusEl.textContent = text;
}

// --------- Interaction
function onSquareClick(e){
  const sq = parseInt(this.dataset.index,10);
  const piece = state.board[sq];
  const myColor = state.turn;

  if(state.selected==null){
    if(piece && colorOf(piece)===myColor){
      state.selected = sq;
      drawHints();
    }
    return;
  }

  if(piece && colorOf(piece)===myColor){
    state.selected = sq;
    drawHints();
    return;
  }

  const legal = legalMovesFor(state.selected, myColor);
  const chosen = legal.find(m => m.to===sq);
  if(!chosen){
    announce(`Coup illégal`);
    state.selected = null;
    drawHints();
    return;
  }
  playMove(chosen);
  state.selected = null;
  drawHints();
  maybeCpuMoves();
}

function maybeCpuMoves(){
  if(!vsCpu) return;
  const sideToPlay = state.turn;
  if(sideToPlay !== playerSide){
    setTimeout(()=>{
      const m = chooseCpuMove(sideToPlay);
      if(m){
        playMove(m);
        maybeCpuMoves();
      }
    }, 200);
  }
}

function playMove(move){
  history.push(clone(state));
  future = [];

  applyMove(state, move);
  state.lastMove = { from: move.from, to: move.to };
  state.turn = state.turn==='w' ? 'b' : 'w';
  if(state.turn==='w') state.full += 1;

  appendMoveToLog(move);

  saveLocal();
  renderBoard();
}

function appendMoveToLog(move){
  const san = moveToSAN(move, history[history.length-1], state);
  state.pgn.push(san);
  renderMovesList();
}

function renderMovesList(){
  movesListEl.innerHTML = '';
  for(let i=0;i<state.pgn.length;i+=2){
    const li = document.createElement('li');
    const w = state.pgn[i] || '';
    const b = state.pgn[i+1] || '';
    li.textContent = `${w}${b ? '  •  '+b : ''}`;
    movesListEl.appendChild(li);
  }
}

function announce(msg){
  announceEl.textContent = msg;
}

// --------- Move generation (legal)
function allLegalMoves(color){
  const res = [];
  for(let i=0;i<64;i++){
    const p = state.board[i];
    if(!p || colorOf(p)!==color) continue;
    const list = legalMovesFor(i, color);
    for(const m of list) res.push(m);
  }
  return res;
}

function legalMovesFor(from, color){
  const piece = state.board[from];
  if(!piece || colorOf(piece)!==color) return [];
  const pseudo = pseudoMovesFor(from, piece);
  const legal = [];
  for(const m of pseudo){
    const snapshot = clone(state);
    applyMove(state, m);
    const ok = !inCheck(color);
    state = snapshot;
    if(ok) legal.push(m);
  }
  return legal;
}

function pseudoMovesFor(from, piece){
  const color = colorOf(piece);
  const type = typeOf(piece);
  const [r,c] = rcOf(from);
  const board = state.board;
  const out = [];
  const forward = color==='w' ? -1 : +1;
  const startRow = color==='w' ? 6 : 1;
  const promoRow = color==='w' ? 0 : 7;

  if(type==='P'){
    const r1 = r + forward;
    if(inside(r1,c) && !board[idx(r1,c)]){
      if(r1===promoRow){
        out.push({from, to: idx(r1,c), promote:'Q'});
      }else{
        out.push({from, to: idx(r1,c)});
        if(r===startRow){
          const r2 = r + 2*forward;
          if(inside(r2,c) && !board[idx(r2,c)]){
            out.push({from, to: idx(r2,c), epSet: idx(r1,c)});
          }
        }
      }
    }
    for(const dc of [-1, +1]){
      const cc = c + dc;
      const rr = r + forward;
      if(!inside(rr,cc)) continue;
      const target = board[idx(rr,cc)];
      if(target && colorOf(target)!==color){
        if(rr===promoRow) out.push({from, to: idx(rr,cc), capture:true, promote:'Q'});
        else out.push({from, to: idx(rr,cc), capture:true});
      }
      if(state.ep != null && idx(rr,cc) === state.ep){
        out.push({from, to: idx(rr,cc), enpassant:true, capture:true});
      }
    }
  }
  else if(type==='N'){
    const jumps = [[-2,-1],[-2,+1],[-1,-2],[-1,+2],[+1,-2],[+1,+2],[+2,-1],[+2,+1]];
    for(const [dr,dc] of jumps){
      const rr = r+dr, cc = c+dc;
      if(!inside(rr,cc)) continue;
      const t = board[idx(rr,cc)];
      if(!t || colorOf(t)!==color){
        out.push({from, to: idx(rr,cc), capture: !!t});
      }
    }
  }
  else if(type==='B' || type==='R' || type==='Q'){
    const dirs = [];
    if(type==='B' || type==='Q'){ dirs.push([-1,-1],[-1,+1],[+1,-1],[+1,+1]); }
    if(type==='R' || type==='Q'){ dirs.push([-1,0],[+1,0],[0,-1],[0,+1]); }
    for(const [dr,dc] of dirs){
      let rr=r+dr, cc=c+dc;
      while(inside(rr,cc)){
        const t = board[idx(rr,cc)];
        if(!t){ out.push({from, to: idx(rr,cc)}); }
        else{
          if(colorOf(t)!==color) out.push({from, to: idx(rr,cc), capture:true});
          break;
        }
        rr+=dr; cc+=dc;
      }
    }
  }
  else if(type==='K'){
    for(const dr of [-1,0,1]) for(const dc of [-1,0,1]){
      if(dr===0 && dc===0) continue;
      const rr=r+dr, cc=c+dc;
      if(!inside(rr,cc)) continue;
      const t = board[idx(rr,cc)];
      if(!t || colorOf(t)!==color){
        out.push({from, to: idx(rr,cc), capture: !!t});
      }
    }
    const rights = state.castling;
    const inCheckNow = inCheck(color);
    if(!inCheckNow){
      if(color==='w' && rights.wK){
        if(!board[61] && !board[62] && !attacked(61,'b') && !attacked(62,'b')){
          out.push({from, to: 62, castle:'K'});
        }
      }
      if(color==='w' && rights.wQ){
        if(!board[57] && !board[58] && !board[59] && !attacked(59,'b') && !attacked(58,'b')){
          out.push({from, to: 58, castle:'Q'});
        }
      }
      if(color==='b' && rights.bK){
        if(!board[5] && !board[6] && !attacked(5,'w') && !attacked(6,'w')){
          out.push({from, to: 6, castle:'K'});
        }
      }
      if(color==='b' && rights.bQ){
        if(!board[1] && !board[2] && !board[3] && !attacked(3,'w') && !attacked(2,'w')){
          out.push({from, to: 2, castle:'Q'});
        }
      }
    }
  }
  return out;
}

function attacked(square, byColor){
  const [r,c] = rcOf(square);
  const b = state.board;

  const dir = byColor==='w' ? -1 : +1;
  for(const dc of [-1,+1]){
    const rr=r+dir, cc=c+dc;
    if(inside(rr,cc)){
      const p = b[idx(rr,cc)];
      if(p === byColor+'P') return true;
    }
  }

  const jumps = [[-2,-1],[-2,+1],[-1,-2],[-1,+2],[+1,-2],[+1,+2],[+2,-1],[+2,+1]];
  for(const [dr,dc] of jumps){
    const rr=r+dr, cc=c+dc;
    if(!inside(rr,cc)) continue;
    const p = b[idx(rr,cc)];
    if(p === byColor+'N') return true;
  }

  for(const [dr,dc] of [[-1,-1],[-1,+1],[+1,-1],[+1,+1]]){
    let rr=r+dr, cc=c+dc;
    while(inside(rr,cc)){
      const p = b[idx(rr,cc)];
      if(p){
        if(colorOf(p)===byColor && (typeOf(p)==='B' || typeOf(p)==='Q')) return true;
        break;
      }
      rr+=dr; cc+=dc;
    }
  }

  for(const [dr,dc] of [[-1,0],[+1,0],[0,-1],[0,+1]]){
    let rr=r+dr, cc=c+dc;
    while(inside(rr,cc)){
      const p = b[idx(rr,cc)];
      if(p){
        if(colorOf(p)===byColor && (typeOf(p)==='R' || typeOf(p)==='Q')) return true;
        break;
      }
      rr+=dr; cc+=dc;
    }
  }

  for(const dr of [-1,0,1]) for(const dc of [-1,0,1]){
    if(dr===0 && dc===0) continue;
    const rr=r+dr, cc=c+dc;
    if(!inside(rr,cc)) continue;
    const p = b[idx(rr,cc)];
    if(p === byColor+'K') return true;
  }
  return false;
}

function findKing(color){
  for(let i=0;i<64;i++){
    if(state.board[i]===color+'K') return i;
  }
  return null;
}

function inCheck(color){
  const k = findKing(color);
  return attacked(k, color==='w' ? 'b' : 'w');
}

function applyMove(s, m){
  const board = s.board;
  const piece = board[m.from];
  const color = colorOf(piece);
  const type = typeOf(piece);

  if(type==='P' || m.capture) s.half = 0; else s.half += 1;
  s.ep = null;

  if(m.enpassant){
    const [rto,cto] = rcOf(m.to);
    const capR = rto + (color==='w'?+1:-1);
    const capIdx = idx(capR, cto);
    board[capIdx] = null;
  }

  if(m.castle){
    if(color==='w' && m.castle==='K'){ board[63] = null; board[61] = 'wR'; }
    else if(color==='w' && m.castle==='Q'){ board[56] = null; board[59] = 'wR'; }
    else if(color==='b' && m.castle==='K'){ board[7] = null; board[5] = 'bR'; }
    else if(color==='b' && m.castle==='Q'){ board[0] = null; board[3] = 'bR'; }
  }

  board[m.to] = piece;
  board[m.from] = null;

  if(type==='P'){
    const [rto] = rcOf(m.to);
    if(rto===0 || rto===7){
      const promo = m.promote || 'Q';
      board[m.to] = color + promo;
    }
  }

  if(type==='P' && Math.abs(rcOf(m.to)[0] - rcOf(m.from)[0])===2){
    const [rfrom,cfrom] = rcOf(m.from);
    const stepR = (color==='w' ? -1 : 1);
    s.ep = idx(rfrom + stepR, cfrom);
  }

  if(piece === 'wK'){ s.castling.wK=false; s.castling.wQ=false; }
  if(piece === 'bK'){ s.castling.bK=false; s.castling.bQ=false; }
  if(m.from===56) s.castling.wQ=false;
  if(m.from===63) s.castling.wK=false;
  if(m.from===0) s.castling.bQ=false;
  if(m.from===7) s.castling.bK=false;
  if(m.to===56) s.castling.wQ=false;
  if(m.to===63) s.castling.wK=false;
  if(m.to===0) s.castling.bQ=false;
  if(m.to===7) s.castling.bK=false;
}

function moveToSAN(move, prevState, nextState){
  const piece = prevState.board[move.from];
  const type = typeOf(piece);
  let san = '';
  if(type !== 'P') san += type;
  if(move.capture) san += 'x';
  san += algebraic(move.to);
  const sideAfter = nextState.turn;
  const legal = allLegalMoves(sideAfter);
  const inChk = inCheck(sideAfter);
  if(legal.length===0){
    san += inChk ? '#' : ' (pat)';
  }else if(inChk){
    san += '+';
  }
  if(move.castle==='K') san = 'O-O';
  if(move.castle==='Q') san = 'O-O-O';
  if(type==='P' && (rcOf(move.to)[0]===0 || rcOf(move.to)[0]===7) && move.promote){
    san += '=' + move.promote;
  }
  return san;
}

// --------- CPU (very simple: material-only greedy)
function evaluate(color){
  let score = 0;
  for(const p of state.board){
    if(!p) continue;
    const val = VALUES[typeOf(p)];
    score += (colorOf(p)==='w') ? val : -val;
  }
  return score;
}

function chooseCpuMove(color){
  const moves = allLegalMoves(color);
  if(moves.length===0) return null;
  let best = []; let bestScore = (color==='w' ? -Infinity : +Infinity);
  for(const m of moves){
    const snap = clone(state);
    applyMove(state, m);
    const score = evaluate('w');
    state = snap;
    const better = color==='w' ? (score>bestScore) : (score<bestScore);
    if(better){ bestScore=score; best=[m]; }
    else if(score===bestScore){ best.push(m); }
  }
  return best[Math.floor(Math.random()*best.length)];
}

// --------- Persistence + controls
function saveLocal(){
  const payload = { state, history, future, orientation, showHints, vsCpu, playerSide };
  try{ localStorage.setItem('chess-starter', JSON.stringify(payload)); }catch(e){}
}
function loadLocal(){
  try{
    const raw = localStorage.getItem('chess-starter');
    if(!raw) return false;
    const obj = JSON.parse(raw);
    state = obj.state; history = obj.history||[]; future = obj.future||[];
    orientation = obj.orientation||'w';
    showHints = !!obj.showHints;
    vsCpu = !!obj.vsCpu;
    playerSide = obj.playerSide||'w';
    hintToggle.checked = showHints;
    flipToggle.checked = orientation==='b';
    vsCpuToggle.checked = vsCpu;
    sideSelect.value = playerSide;
    return true;
  }catch(e){ return false; }
}

newGameBtn.addEventListener('click', ()=>{
  state = createInitialState();
  history=[]; future=[];
  state.pgn = [];
  state.lastMove = null;
  state.turn = 'w';
  renderBoard();
  if(vsCpu && playerSide==='b'){
    setTimeout(()=>{
      const m = chooseCpuMove('w');
      if(m) playMove(m);
    }, 200);
  }
  saveLocal();
});
undoBtn.addEventListener('click', ()=>{
  if(history.length===0) return;
  future.push(clone(state));
  state = history.pop();
  renderBoard();
  saveLocal();
});
redoBtn.addEventListener('click', ()=>{
  if(future.length===0) return;
  history.push(clone(state));
  state = future.pop();
  renderBoard();
  saveLocal();
});
exportBtn.addEventListener('click', ()=>{
  const pairs = [];
  for(let i=0;i<state.pgn.length;i+=2){
    const no = 1 + (i/2);
    const w = state.pgn[i] || '';
    const b = state.pgn[i+1] || '';
    pairs.push(`${no}. ${w}${b?' '+b:''}`);
  }
  const pgn = pairs.join(' ');
  navigator.clipboard.writeText(pgn).then(()=>{
    announce('PGN copié dans le presse-papier');
  });
});
copyLinkBtn.addEventListener('click', ()=>{
  const link = location.origin + location.pathname + '#fen=' + encodeURIComponent(stateToFen(state));
  navigator.clipboard.writeText(link).then(()=> announce('Lien copié !'));
});

hintToggle.addEventListener('change', (e)=>{ showHints = e.target.checked; saveLocal(); drawHints(); });
flipToggle.addEventListener('change', (e)=>{ orientation = e.target.checked ? 'b' : 'w'; saveLocal(); renderBoard(); });
vsCpuToggle.addEventListener('change', (e)=>{
  vsCpu = e.target.checked;
  saveLocal();
  renderBoard();
  maybeCpuMoves();
});
sideSelect.addEventListener('change', (e)=>{
  playerSide = e.target.value;
  saveLocal();
  renderBoard(); // recolorer les pions selon le nouveau camp choisi
  maybeCpuMoves();
});

window.addEventListener('hashchange', ()=>{
  const m = location.hash.match(/fen=([^&]+)/);
  if(m){
    try{
      const fen = decodeURIComponent(m[1]);
      state = fenToState(fen);
      history = []; future = [];
      renderBoard();
      saveLocal();
    }catch{}
  }
});

function boot(){
  loadLocal();
  renderBoard();
  maybeCpuMoves();
}
boot();
