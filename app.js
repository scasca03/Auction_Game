/* The Auction — vanilla JavaScript; PeerJS loads only when creating or joining a room. */
(() => {
'use strict';
const $ = id => document.getElementById(id);
const SAVE_KEY = 'bidxi-game-v2';
const PHOTO_KEY = 'bidxi-photos-v2';
const ROOM_SESSION_KEY = 'bidxi-room-session-v1';
const RARITY = {titan:'TITAN',elite:'ELITE',rare:'STAR',gold:'GOLD'};
const STATS = ['RIT','TIR','PAS','REG','DEF','FIS'];
const GK_STATS = ['EST','MAN','SAQ','REF','VEL','POS'];
const BASKETBALL_STATS = ['TIR','TRI','PAS','REG','DEF','REB'];
const qs = (s, parent=document) => [...parent.querySelectorAll(s)];
const e = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const euro = v => new Intl.NumberFormat('es-ES',{maximumFractionDigits:0}).format(v) + ' €';
const fmt = v => new Intl.NumberFormat('es-ES',{maximumFractionDigits:0}).format(v);
const flag = country => /^[A-Z]{2}$/.test(country) ? [...country].map(c=>String.fromCodePoint(127397+c.charCodeAt(0))).join('') : selectedSport==='basketball'?'🏀':'⚽';
const time = () => new Date().toLocaleTimeString('es-ES',{hour:'2-digit',minute:'2-digit'});
const prefersReducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
let selectedSport = 'football', PLAYERS = FOOTBALL_PLAYERS, game = null, audioEnabled = false, audioContext = null, installPrompt = null, revealTimer = null, toastTimer = null, photoCache = {}, photoRequest = null, currentAlbumFilter = 'all', storageError = false;
let room = {role:null,peer:null,connections:new Map(),hostConn:null,code:'',status:'',owners:{},localPeerId:'',myTeam:null,maxPlayers:0,joinName:'',lobby:null,reconnectTokens:{}};
let guestGameInitialized = false;
let peerScriptRequest = null;
let roomConnectionPending = false;
let clockInterval = null, clockTurnKey = '', resultsText = '';
const brokenPhotoIds = new Set();
const localPhotosLoaded = new Set();

function photoStorageKey(sport=selectedSport) { return sport==='football'?PHOTO_KEY:`${PHOTO_KEY}-${sport}`; }
function gameStorageKey(sport=selectedSport) { return sport==='football'?SAVE_KEY:`${SAVE_KEY}-${sport}`; }
function setSport(sport, persist=true) {
  if(sport!=='football'&&sport!=='basketball')return;
  selectedSport=sport;
  PLAYERS=sport==='basketball'?BASKETBALL_PLAYERS:FOOTBALL_PLAYERS;
  try { photoCache=JSON.parse(localStorage.getItem(photoStorageKey(sport))||'{}')||{}; }
  catch(error) { console.warn('No se pudo recuperar la caché de fotos.',error); photoCache={}; }
  const basketball=sport==='basketball';
  brokenPhotoIds.clear();
  document.body.classList.toggle('sport-basketball',sport==='basketball');
  const themeColor=document.querySelector('meta[name="theme-color"]');
  if(themeColor)themeColor.content=basketball?'#080b13':'#0b0d0a';
  if($('sport')){$('sport').value=sport;$('sport').disabled=Boolean(room.role);}
  if(persist)try{localStorage.setItem('auction-sport',sport);}catch(error){console.warn('No se pudo guardar el deporte seleccionado.',error);}
  $('heroTitle').innerHTML=basketball
    ? 'NO ELIJAS<br><span class="stroke-title">ESTRELLAS.</span><br><span class="lime">CREA</span> LEYENDAS<span class="period">.</span>'
    : 'NO COMPRES<br><span class="stroke-title">JUGADORES.</span><br><span class="lime">GANA</span> LEYENDAS<span class="period">.</span>';
  $('heroDesc').textContent=basketball
    ? '100 estrellas de la NBA. Un presupuesto. Amigos que se convierten en rivales. Cuando aparece una leyenda, solo uno se la lleva.'
    : '100 cracks. Un presupuesto. Amigos que se convierten en rivales. Cuando aparece una estrella, solo uno puede llevársela.';
  $('poolCountLabel').textContent=basketball?'JUGADORES NBA':'FUTBOLISTAS';
  $('sportFootnote').textContent=basketball?'BUILT FOR THE COURT':'BUILT FOR THE BEAUTIFUL GAME';
  $('setupTitle').innerHTML=basketball?'ARMA TU <i>QUINTETO.</i>':'REÚNE A TU <i>ONCE.</i>';
  $('seasonLabel').textContent=basketball?'NBA / LIVE MARKET':'SEASON 26 / LIVE MARKET';
  $('sportBadge').textContent=basketball?'BASKETBALL':'FOOTBALL';
  if(game){render();if(game.started)loadPhotos();}
}
try {
  const preferred=localStorage.getItem('auction-sport');
  if(preferred==='basketball')selectedSport=preferred;
  photoCache=JSON.parse(localStorage.getItem(photoStorageKey())||'{}')||{};
} catch(error) { console.warn('No se pudo recuperar la configuración local.',error); }
PLAYERS=selectedSport==='basketball'?BASKETBALL_PLAYERS:FOOTBALL_PLAYERS;

function shuffle(input) {
  const a = [...input];
  for (let i = a.length-1; i > 0; i--) {
    let j;
    if (window.crypto?.getRandomValues) {
      const k = new Uint32Array(1);
      const bound = Math.floor(4294967296 / (i+1)) * (i+1);
      do { crypto.getRandomValues(k); } while (k[0] >= bound);
      j = k[0] % (i+1);
    } else j = Math.floor(Math.random()*(i+1));
    [a[i],a[j]] = [a[j],a[i]];
  }
  return a;
}
function current() { return game && !game.finished && game.cursor < game.queue.length ? PLAYERS[game.queue[game.cursor]] : null; }
function soldCount() { return Object.values(game.results).filter(r=>r.status==='sold').length; }
function revealedCount() { return Object.keys(game.results).length + (current() && !game.results[current().id] ? 1 : 0); }
function playerStats(p) {
  let hash=17; for(const char of p.name)hash=(hash*31+char.charCodeAt(0))>>>0;
  const base=p.ovr; const gk=p.pos==='POR';
  const footballAdjustments={DC:[8,7,-15,0,-41,3],EI:[8,-1,0,9,-35,-10],ED:[8,-1,0,9,-35,-10],MC:[-4,-4,6,4,0,-3],MCO:[-1,2,6,7,-24,-9],MCD:[-14,-17,7,-9,5,5],DFC:[-17,-34,-17,-18,7,5],LI:[8,-14,-5,-2,5,1],LD:[8,-14,-5,-2,5,1]};
  const basketballAdjustments={PG:[4,3,7,8,-9,-18],SG:[6,5,1,7,-10,-14],SF:[1,0,0,2,0,-4],PF:[-8,-10,-3,-5,9,10],C:[-18,-20,-9,-12,13,16]};
  const adjust=selectedSport==='basketball'?(basketballAdjustments[p.pos]||[0,0,0,0,0,0]):(gk?[1,0,-11,2,-36,2]:(footballAdjustments[p.pos]||[0,0,0,0,0,0]));
  return adjust.map((delta,i)=>Math.max(30,Math.min(99,base+delta+(((hash>>>(i*4))&7)-3))));
}
function photoFor(p) { return brokenPhotoIds.has(p.id) ? null : photoCache[p.id]?.url || null; }
function photoLink(p) { return photoCache[p.id]?.source || ('https://en.wikipedia.org/wiki/'+encodeURIComponent(p.wiki.replace(/ /g,'_'))); }
function photoBroken(id,sport=selectedSport) { if(sport!==selectedSport)return;brokenPhotoIds.add(id);syncPhotosToDOM(); }
function card(p,size='',showPhoto=true) {
  const initials=p.name.split(' ').slice(0,2).map(n=>n[0]).join('').toUpperCase();
  const stats=playerStats(p), labels=selectedSport==='basketball'?BASKETBALL_STATS:(p.pos==='POR'?GK_STATS:STATS);
  const photo=showPhoto ? photoFor(p) : null;
  const sport=selectedSport;
  return `<article class="player-card rarity-${p.rarity} ${size} ${photo?'':'photo-pending'}" aria-label="${e(p.name)}, ${p.pos}, media ${p.ovr}">
    <div class="card-orbit"></div><div class="card-watermark" aria-hidden="true">TA</div>
    <div class="card-photo ${photo?'has-photo':''}" data-photo-id="${p.id}">${photo?`<img src="${e(photo)}" alt="Foto de ${e(p.name)}" loading="${size?'lazy':'eager'}" referrerpolicy="no-referrer" onerror="window.AUCTION?.photoBroken(${p.id},'${sport}');this.parentNode.classList.remove('has-photo');this.remove()">`:''}<span class="photo-fallback">${e(initials)}</span></div>
    <div class="card-grade"><strong>${p.ovr}</strong><span>${e(p.pos)}</span></div>
    <div class="card-flag" title="${e(p.country)}">${flag(p.country)}</div><div class="card-rarity">◆ ${RARITY[p.rarity]}</div>
    <div class="card-nameplate"><strong title="${e(p.name)}">${e(p.name)}</strong><span>${e(p.club)}</span></div>
    <div class="card-attributes">${labels.map((label,i)=>`<span><b>${stats[i]}</b> ${label}</span>`).join('')}</div><div class="card-number">THE AUCTION · ${selectedSport==='basketball'?'NBA':'FOOTBALL'}</div>
  </article>`;
}
function syncPhotosToDOM() {
  qs('[data-photo-id]').forEach(node => {
    const id=Number(node.dataset.photoId), url=photoCache[id]?.url;
    if(!url || brokenPhotoIds.has(id) || node.querySelector('img'))return;
    const img=document.createElement('img'),sport=selectedSport;img.src=url;img.alt='Foto de '+PLAYERS[id].name;img.loading=node.closest('.small')?'lazy':'eager';img.referrerPolicy='no-referrer';
    img.onerror=()=>{if(sport!==selectedSport)return;brokenPhotoIds.add(id);node.classList.remove('has-photo');img.remove();};
    node.prepend(img);node.classList.add('has-photo');node.closest('.player-card')?.classList.remove('photo-pending');
  });
  const p=current(),credit=$('photoSource');
  if(credit&&p){credit.href=photoLink(p);credit.classList.toggle('hidden',!photoFor(p));}
}
// Wikimedia images are retrieved by the user's browser, not copies of commercial game artwork.
// Optional sport-specific manifests generated by tools/fetch-photos.py take priority.
function loadPhotos() {
  const sport=selectedSport, players=PLAYERS, cache=photoCache;
  if(photoRequest?.sport===sport)return photoRequest.request;
  const request=(async()=>{
    if(!localPhotosLoaded.has(sport)){
      localPhotosLoaded.add(sport);
      try{
        let res=await fetch(`./photo-manifest-${sport}.json`,{cache:'no-cache'});
        if(!res.ok&&sport==='football')res=await fetch('./photo-manifest.json',{cache:'no-cache'});
        if(res.ok){
          const photos=await res.json();
          for(const [id,entry] of Object.entries(photos)){
            if(Number.isInteger(+id)&&players[+id]&&entry.url&&entry.source){
              cache[id]={url:entry.url,source:entry.source,author:entry.author||'',license:entry.license||''};
              brokenPhotoIds.delete(+id);
            }
          }
          if(selectedSport===sport&&photoCache===cache)syncPhotosToDOM();
        }
      }catch(_){/* No predownloaded photo manifest: online Wikimedia fallback. */}
    }
    const missing=players.filter(p=>!cache[p.id]);
    const batches=[];
    for(let i=0;i<missing.length;i+=35)batches.push(missing.slice(i,i+35));
    await Promise.allSettled(batches.map(async group=>{
      const titles=group.map(p=>p.wiki);
      const params=new URLSearchParams({origin:'*',action:'query',format:'json',formatversion:'2',prop:'pageimages',piprop:'thumbnail|name',pithumbsize:'600',redirects:'1',titles:titles.join('|')});
      const response=await fetch('https://en.wikipedia.org/w/api.php?'+params,{mode:'cors',credentials:'omit'});
      if(!response.ok)throw Error('Wikipedia status '+response.status);
      const json=await response.json();
      const query=json.query||{};
      const canon=new Map();
      (query.normalized||[]).forEach(item=>canon.set(item.from,item.to));
      (query.redirects||[]).forEach(item=>canon.set(item.from,item.to));
      const pages=new Map((query.pages||[]).filter(pg=>pg.thumbnail?.source).map(pg=>[pg.title,pg]));
      for(const p of group){
        let title=p.wiki;
        for(let j=0;j<4&&canon.has(title);j++)title=canon.get(title);
        const page=pages.get(title)||(query.pages||[]).find(pg=>pg.title.toLocaleLowerCase('es')===title.toLocaleLowerCase('es'));
        if(page?.thumbnail?.source){
          cache[p.id]={url:page.thumbnail.source,source:page.pageimage?('https://commons.wikimedia.org/wiki/File:'+encodeURIComponent(page.pageimage.replace(/ /g,'_'))):('https://en.wikipedia.org/wiki/'+encodeURIComponent(page.title.replace(/ /g,'_')))};
        }
      }
      if(selectedSport===sport&&photoCache===cache)syncPhotosToDOM();
    }));
    try{localStorage.setItem(photoStorageKey(sport),JSON.stringify(cache));}catch(_){}
  })();
  photoRequest={sport,request};
  return request.finally(()=>{if(photoRequest?.request===request)photoRequest=null;});
}
function toast(message,warning=false){const t=$('toast');t.textContent=message;t.style.background=warning?'#ffba9e':'#eafdba';t.classList.remove('hidden');clearTimeout(toastTimer);toastTimer=setTimeout(()=>t.classList.add('hidden'),3600);}
function addLog(type,desc){game.log.unshift({type,desc,at:time()});game.log=game.log.slice(0,20);}
function save(){if(!game||storageError||room.role==='guest')return;try{localStorage.setItem(gameStorageKey(game.sport||'football'),JSON.stringify(game));}catch(_){storageError=true; /* The game continues in memory if browser storage is blocked. */}}
function isFinished(){return game.teams.every(t=>t.players.length>=game.slots) || game.cursor>=game.queue.length || !game.teams.some((t,i)=>canPay(i,1));}
function remainingSlots(i){return Math.max(0,game.slots-game.teams[i].players.length);}
function maxPay(i){const t=game.teams[i];return Math.max(0,t.balance - Math.max(0,remainingSlots(i)-1));}
function canPay(i,amount){return remainingSlots(i)>0 && maxPay(i)>=amount;}
function minBid(){return game.bid ? game.bid+game.inc : 1;}
function eligible(i){return i!==game.leader && !game.passes.includes(i) && canPay(i,minBid());}
function chooseTurn(start){for(let k=0;k<game.teams.length;k++){let i=(start+k)%game.teams.length;if(eligible(i))return i;}return -1;}
function canControlTurn(){
  if(!game||game.turn<0)return false;
  if(game.paused)return false;
  const owner=room.owners[game.turn];
  if(room.role==='guest')return Boolean(room.hostConn?.open&&owner===room.localPeerId);
  if(room.role==='host')return owner==='host';
  return true;
}
function validateSettings(n,budget,slots,inc){
  if(!Number.isInteger(n)||n<2||n>10)return 'Debes elegir entre 2 y 10 participantes.';
  if(!Number.isInteger(slots)||slots<1||slots>15)return 'Elige entre 1 y 15 jugadores por equipo.';
  if(n*slots>PLAYERS.length)return `Solo hay ${PLAYERS.length} jugadores. Reduce las plazas por equipo a un máximo de ${Math.floor(PLAYERS.length/n)}.`;
  if(!Number.isInteger(budget)||budget<slots||budget>10000)return `El presupuesto debe ser de al menos ${slots} € para poder completar un equipo.`;
  if(!Number.isInteger(inc)||inc<1||inc>1000)return 'El incremento mínimo debe estar entre 1 € y 1.000 €.';
  return '';
}
function turnKey(){
  return game?`${game.cursor}:${game.turn}:${game.pendingWin?'win':''}:${game.paused?'paused':''}`:'';
}
function startTurnClock(){
  clearInterval(clockInterval);clockInterval=null;
  clockTurnKey=turnKey();
  if(!game)return;
  if(!game.turnSeconds||game.turn<0||game.pendingWin||game.finished||game.paused){
    game.turnDeadlineAt=0;
    if(!game.turnSeconds||game.turn<0||game.pendingWin||game.finished)game.turnRemainingMs=0;
    updateClockDisplay();return;
  }
  if(!Number.isFinite(game.turnRemainingMs)||game.turnRemainingMs<=0)game.turnRemainingMs=game.turnSeconds*1000;
  game.turnDeadlineAt=Date.now()+game.turnRemainingMs;
  clockInterval=setInterval(tickTurnClock,250);
  updateClockDisplay();
}
function syncTurnClock(){
  if(!game)return;
  const key=turnKey();
  if(room.role==='guest'){
    if(game.turnSeconds&&game.turn>=0&&!game.pendingWin&&!game.finished&&!game.paused){
      clockInterval ||= setInterval(updateClockDisplay,250);
    }else{clearInterval(clockInterval);clockInterval=null;}
    updateClockDisplay();return;
  }
  if(key!==clockTurnKey){
    const identity=`${game.cursor}:${game.turn}`;
    if(!clockTurnKey.startsWith(identity+':'))game.turnRemainingMs=game.turnSeconds?game.turnSeconds*1000:0;
    startTurnClock();
  }
}
function tickTurnClock(){
  if(!game)return;
  updateClockDisplay();
  if(room.role!=='guest'&&!game.paused&&!game.pendingWin&&game.turn>=0&&game.turnDeadlineAt&&Date.now()>=game.turnDeadlineAt){
    game.turnRemainingMs=0;game.turnDeadlineAt=0;
    pass(game.turn,null,true);
  }
}
function updateClockDisplay(){
  const clock=$('auctionClock'),value=$('turnCountdown'),bar=$('timerBar');
  if(!clock||!value||!bar||!game)return;
  const active=Boolean(game.turnSeconds&&game.turn>=0&&!game.pendingWin&&!game.finished);
  clock.classList.toggle('is-paused',Boolean(game.paused));
  clock.classList.toggle('is-urgent',active&&!game.paused&&game.turnDeadlineAt&&game.turnDeadlineAt-Date.now()<=5000);
  clock.classList.toggle('is-hidden',!active);
  if(!active){value.textContent=game.paused?'Ⅱ':'∞';bar.style.width='0%';return;}
  const remaining=Number.isFinite(game.turnRemainingMs)?game.turnRemainingMs:game.turnSeconds*1000;
  const left=game.paused?remaining:game.turnDeadlineAt?Math.max(0,game.turnDeadlineAt-Date.now()):remaining;
  if(!game.paused&&game.turnDeadlineAt)game.turnRemainingMs=left;
  value.textContent=String(Math.ceil(left/1000));
  bar.style.width=`${Math.max(0,Math.min(100,left/(game.turnSeconds*1000)*100))}%`;
}
function turnSeconds(){return Number($('turnSeconds').value)||0;}
function makeSecret(){
  const bytes=new Uint8Array(24);
  if(window.crypto?.getRandomValues)window.crypto.getRandomValues(bytes);
  else for(let i=0;i<bytes.length;i++)bytes[i]=Math.floor(Math.random()*256);
  return [...bytes].map(value=>value.toString(16).padStart(2,'0')).join('');
}
function loadRoomSession(){
  try{
    const saved=JSON.parse(localStorage.getItem(ROOM_SESSION_KEY)||'null');
    return saved&&typeof saved.code==='string'&&typeof saved.name==='string'&&typeof saved.token==='string'?saved:null;
  }catch(error){console.warn('No se pudo recuperar la sesión de sala.',error);return null;}
}
function saveRoomSession(code,name,token){
  try{localStorage.setItem(ROOM_SESSION_KEY,JSON.stringify({code,name,token}));}
  catch(error){console.warn('No se pudo guardar la sesión de reconexión.',error);toast('La reconexión automática no estará disponible en este navegador.',true);}
}
function newGame() {
  const n=Number($('count').value),budget=Number($('budget').value),slots=Number($('slots').value),inc=Number($('inc').value);
  const names=qs('input', $('names')).map(input=>input.value.trim());
  let error=validateSettings(n,budget,slots,inc);
  if(!error&&(names.length!==n||names.some(name=>name.length<1||name.length>24)))error='Todos los participantes necesitan un nombre (máximo 24 caracteres).';
  else if(!error&&new Set(names.map(x=>x.toLocaleLowerCase('es'))).size!==names.length)error='Los nombres de los participantes deben ser distintos.';
  if(error){$('setupError').textContent=error;$('setupError').classList.remove('hidden');return;}
  $('setupError').classList.add('hidden');
  game={version:2,sport:selectedSport,createdAt:new Date().toISOString(),budget,slots,inc,turnSeconds:turnSeconds(),hostPlays:$('hostPlays').checked,teams:names.map((name,id)=>({id,name,balance:budget,players:[]})),queue:shuffle(PLAYERS.map(p=>p.id)),cursor:0,turn:0,bid:0,leader:null,passes:[],results:{},log:[],finished:false,pendingWin:false,paused:false,started:true};
  game.turn=chooseTurn(0);
  startTurnClock();
  addLog('start',`Abre el mercado: ${n} clubes. ${PLAYERS.length} cartas por descubrir.`);
  showGame();render();revealPlayer();loadPhotos();sfx('open');
}
function createRoom(){
  const n=Number($('count').value),budget=Number($('budget').value),slots=Number($('slots').value),inc=Number($('inc').value);
  const hostName=qs('input',$('names'))[0]?.value.trim()||'';
  let error=validateSettings(n,budget,slots,inc);
  if(!error&&$('hostPlays').checked&&(!hostName||hostName.length>24))error='Escribe tu nombre para crear la sala (máximo 24 caracteres).';
  if(error){$('setupError').textContent=error;$('setupError').classList.remove('hidden');return;}
  $('setupError').classList.add('hidden');
  game={version:2,sport:selectedSport,createdAt:new Date().toISOString(),budget,slots,inc,turnSeconds:turnSeconds(),hostPlays:$('hostPlays').checked,teams:hostName?[{id:0,name:hostName,balance:budget,players:[]}]:[],queue:shuffle(PLAYERS.map(p=>p.id)),cursor:0,turn:-1,bid:0,leader:null,passes:[],results:{},log:[],finished:false,pendingWin:false,paused:false,started:false};
  room.role='host';room.code=roomCode();room.maxPlayers=n;room.owners=hostName?{0:'host'}:{};room.reconnectTokens={};room.status='Esperando a que se unan los participantes.';
  $('sport').disabled=true;
  roomStatus(room.status);renderSetupLobby();startHosting();
}
function roomCode() {
  const alphabet='ABCDEFGHJKLMNPQRSTUVWXYZ23456789',bytes=new Uint8Array(8);
  if(window.crypto?.getRandomValues)window.crypto.getRandomValues(bytes);
  else for(let i=0;i<bytes.length;i++)bytes[i]=Math.floor(Math.random()*256);
  return [...bytes].map(value=>alphabet[value%alphabet.length]).join('');
}
function inviteUrl(){
  const url=new URL(location.href);url.searchParams.set('room',room.code);return url.href;
}
async function shareInvite(method='share'){
  const url=inviteUrl(),message=`¡Únete a mi subasta The Auction! Entra con tu nombre: ${url}`;
  if(method==='whatsapp'){window.open('https://wa.me/?text='+encodeURIComponent(message),'_blank','noopener,noreferrer');return;}
  if(navigator.share){try{await navigator.share({title:'Únete a mi sala The Auction',text:'Entra a mi subasta con este enlace:',url});return;}catch(error){if(error?.name==='AbortError')return;}}
  try{await navigator.clipboard.writeText(url);toast('Enlace de invitación copiado.');}
  catch(_){toast(`Comparte este código: ${room.code}`,true);}
}
function roomStatus(message,warning=false) {
  room.status=message;
  const status=$('roomStatus'),setupStatus=$('roomSetupStatus');
  if(status){status.textContent=message;status.classList.toggle('is-warning',warning);}
  if(setupStatus){setupStatus.textContent=message;setupStatus.classList.toggle('is-warning',warning);}
}
function reportPeerError(error) {
  const detail=error?.type==='unavailable-id'?'Ese código ya está en uso. Reinicia la partida para generar otra sala.':`No se pudo conectar con la sala${error?.message?': '+error.message:'.'}`;
  roomStatus(detail,true);toast(detail,true);
}
function loadPeerJS() {
  if(window.Peer)return Promise.resolve();
  if(peerScriptRequest)return peerScriptRequest;
  peerScriptRequest=new Promise((resolve,reject)=>{
    const script=document.createElement('script');
    script.src='https://cdn.jsdelivr.net/npm/peerjs@1.5.5/dist/peerjs.min.js';
    script.crossOrigin='anonymous';
    script.onload=()=>{if(window.Peer)resolve();else{peerScriptRequest=null;reject(Error('PeerJS no está disponible.'));}};
    script.onerror=()=>{peerScriptRequest=null;reject(Error('No se pudo cargar PeerJS desde jsDelivr.'));};
    document.head.appendChild(script);
  });
  return peerScriptRequest;
}
function startHosting() {
  roomStatus('Conectando con el servidor de señalización…');
  renderSetupLobby();
  try{
    loadPeerJS().then(()=>{
      if(room.role!=='host')return;
      room.peer=new window.Peer('bidxi'+room.code);
      room.peer.on('open',()=>{room.status='Sala abierta. Comparte el código para que se unan.';roomStatus(room.status);broadcastLobby();});
      room.peer.on('connection',conn=>{
        room.connections.set(conn.peer,conn);
        conn.on('open',()=>{room.connections.set(conn.peer,conn);sendLobby(conn);});
        conn.on('data',message=>handleHostMessage(conn,message));
        conn.on('close',()=>{
          if(room.connections.get(conn.peer)!==conn)return;
          room.connections.delete(conn.peer);
          const departed=Number(Object.keys(room.owners).find(id=>room.owners[id]===conn.peer));
          if(Number.isInteger(departed))room.owners[departed]=null;
          room.status=`Participante desconectado. Conectados: ${room.connections.size}.`;
          if(game&&!game.started)broadcastLobby();
          else if(game)render();
        });
        conn.on('error',reportPeerError);
      });
      room.peer.on('error',reportPeerError);
    }).catch(error=>{if(!room.peer){room.role=null;room.code='';$('sport').disabled=false;renderRoomPanel();}reportPeerError(error);});
  }catch(error){room.role=null;room.code='';$('sport').disabled=false;reportPeerError(error);}
}
function connectToRoom() {
  if(roomConnectionPending)return;
  if(room.role==='guest'&&room.hostConn?.open){roomStatus('Ya estás conectado a esta sala.');return;}
  const saved=loadRoomSession();
  const code=($('joinCode').value.trim()||saved?.code||'').toUpperCase();
  const name=$('joinName').value.trim()||saved?.name||'';
  const token=saved?.code===code?saved.token:'';
  if(!/^[A-HJ-NP-Z2-9]{8}$/.test(code)){roomStatus('Introduce un código válido de 8 caracteres.',true);return;}
  if(!name||name.length>24){roomStatus('Escribe tu nombre (máximo 24 caracteres).',true);return;}
  leaveRoom();
  room.role='guest';room.code=code;room.joinName=name;roomConnectionPending=true;$('sport').disabled=true;roomStatus('Buscando la sala…');
  try{
    loadPeerJS().then(()=>{
      if(room.role!=='guest')return;
      room.peer=new window.Peer();
      room.peer.on('open',id=>{
        room.localPeerId=id;
        room.hostConn=room.peer.connect('bidxi'+code,{reliable:true});
        room.hostConn.on('open',()=>{roomConnectionPending=false;roomStatus('Conectado. Entrando en la sala…');room.hostConn.send({type:'join',name:room.joinName,token});});
        room.hostConn.on('data',handleGuestMessage);
        room.hostConn.on('close',()=>{roomConnectionPending=false;if(room.reconnectDisabled)return;roomStatus('Se perdió la conexión con el anfitrión. La partida queda en modo consulta.',true);renderRoomControls();});
        room.hostConn.on('error',error=>{roomConnectionPending=false;reportPeerError(error);});
      });
      room.peer.on('error',error=>{roomConnectionPending=false;reportPeerError(error);});
    }).catch(error=>{roomConnectionPending=false;if(!room.peer){room.role=null;room.code='';$('sport').disabled=false;}reportPeerError(error);});
  }catch(error){roomConnectionPending=false;room.role=null;room.code='';$('sport').disabled=false;reportPeerError(error);}
}
function sendRoomState(conn) {
  if(!game||!conn?.open)return;
  conn.send({type:'state',state:game,owners:{...room.owners}});
}
function broadcastState() {
  if(room.role!=='host'||!game)return;
  if(!game.started){broadcastLobby();return;}
  for(const conn of room.connections.values())sendRoomState(conn);
}
function sendLobby(conn){
  if(room.role!=='host'||game?.started)return;
  const teamId=Number(Object.keys(room.owners).find(id=>room.owners[id]===conn?.peer));
  conn?.open&&conn.send({type:'lobby',code:room.code,maxPlayers:room.maxPlayers,players:game.teams.map(team=>team.name),teamId:Number.isInteger(teamId)?teamId:null,status:room.status,sport:game.sport||'football'});
}
function broadcastLobby(){
  if(room.role!=='host'||game?.started)return;
  renderSetupLobby();
  for(const conn of room.connections.values())sendLobby(conn);
}
function handleHostMessage(conn,message) {
  if(room.role!=='host'||room.connections.get(conn.peer)!==conn)return;
  if(!message||typeof message!=='object')return;
  if(message.type==='join'){
    const name=typeof message.name==='string'?message.name.trim():'';
    const alreadyJoined=Object.values(room.owners).includes(conn.peer);
    if(!name||name.length>24){conn.send({type:'joinResult',ok:false,message:'Escribe un nombre válido de hasta 24 caracteres.'});return;}
    if(alreadyJoined){sendLobby(conn);return;}
    const token=typeof message.token==='string'?message.token:'';
    const reconnectTeam=token?room.reconnectTokens[token]:undefined;
    if(token&&!Number.isInteger(reconnectTeam)){conn.send({type:'joinResult',ok:false,message:'No se reconoció la sesión de reconexión. Pide al anfitrión que te vuelva a invitar.'});return;}
    if(Number.isInteger(reconnectTeam)){
      const currentOwner=room.owners[reconnectTeam];
      const previousConn=room.connections.get(currentOwner);
      if(previousConn&&previousConn!==conn){if(previousConn.open)previousConn.send({type:'sessionReplaced'});previousConn.close();}
      room.owners[reconnectTeam]=conn.peer;
      room.status=`${game.teams[reconnectTeam].name} se ha reconectado.`;
      conn.send({type:'joinResult',ok:true,teamId:reconnectTeam,token,started:Boolean(game.started)});
      if(game&&!game.started)broadcastLobby();else sendRoomState(conn);
      return;
    }
    if(game?.started){conn.send({type:'joinResult',ok:false,message:'La partida ya ha empezado.'});return;}
    if(game.teams.length>=room.maxPlayers){conn.send({type:'joinResult',ok:false,message:'La sala está completa.'});return;}
    if(game.teams.some(team=>team.name.toLocaleLowerCase('es')===name.toLocaleLowerCase('es'))){conn.send({type:'joinResult',ok:false,message:'Ese nombre ya está en la sala. Prueba otro.'});return;}
    const teamId=game.teams.length;
    const newToken=makeSecret();
    game.teams.push({id:teamId,name,balance:game.budget,players:[]});
    room.owners[teamId]=conn.peer;
    room.reconnectTokens[newToken]=teamId;
    room.status=`${name} se ha unido.`;
    conn.send({type:'joinResult',ok:true,teamId,token:newToken,started:false});
    broadcastLobby();return;
  }
  if(message.type!=='action')return;
  const teamId=message.teamId;
  if(!Number.isInteger(teamId)||teamId!==game?.turn||room.owners[teamId]!==conn.peer){
    conn.send({type:'notice',message:'No es tu turno o no tienes asignado ese club.'});return;
  }
  if(message.action==='bid'){
    const amount=message.amount,team=game.teams[teamId];
    if(!Number.isInteger(amount)||amount<minBid()){
      conn.send({type:'notice',message:`La oferta mínima es ${euro(minBid())}.`});return;
    }
    if(!eligible(teamId)||amount>maxPay(teamId)){
      conn.send({type:'notice',message:`Puja no válida. ${team.name} puede ofrecer hasta ${euro(maxPay(teamId))}.`});return;
    }
    placeBid(teamId,amount,conn.peer);
  }
  else if(message.action==='pass')pass(teamId,conn.peer);
}
function handleGuestMessage(message) {
  if(room.role!=='guest')return;
  if(!message||typeof message!=='object')return;
  if(message.type==='sessionReplaced'){room.reconnectDisabled=true;roomStatus('Esta sala ya está abierta en otra pestaña o dispositivo.',true);renderRoomControls();return;}
  if(message.type==='notice'){toast(message.message,true);return;}
  if(message.type==='roomClosed'){room.reconnectDisabled=true;roomStatus('La sala se ha cerrado. Puedes crear o unirte a otra.',true);try{localStorage.removeItem(ROOM_SESSION_KEY);}catch(error){console.warn('No se pudo borrar la sesión de sala.',error);}room.myTeam=null;renderRoomControls();return;}
  if(message.type==='kicked'){room.reconnectDisabled=true;roomStatus(message.message||'El anfitrión te ha retirado de la sala.',true);room.myTeam=null;try{localStorage.removeItem(ROOM_SESSION_KEY);}catch(error){console.warn('No se pudo borrar la sesión de sala.',error);}renderRoomControls();return;}
  if(message.type==='joinResult'){
    if(!message.ok){room.myTeam=null;if((message.message||'').includes('sesión de reconexión')){try{localStorage.removeItem(ROOM_SESSION_KEY);}catch(error){console.warn('No se pudo borrar la sesión de sala.',error);}}roomStatus(message.message||'No se pudo entrar en la sala.',true);renderSetupLobby();return;}
    if(typeof message.token==='string')saveRoomSession(room.code,room.joinName,message.token);
    room.myTeam=message.teamId;roomStatus(message.started?'Conexión restablecida.':'Te has unido. Espera a que el anfitrión empiece la partida.');
    renderSetupLobby();return;
  }
  if(message.type==='lobby'){
    if(message.sport&&message.sport!==selectedSport)setSport(message.sport,false);
    room.lobby=message;
    if(Number.isInteger(message.teamId))room.myTeam=message.teamId;
    renderSetupLobby(message);return;
  }
  if(message.type!=='state'||message.state?.version!==2||message.state.started!==true||!Array.isArray(message.state.teams)||!Array.isArray(message.state.queue))return;
  if((message.state.sport||'football')!==selectedSport)setSport(message.state.sport||'football',false);
  const wasPending=Boolean(game?.pendingWin),oldPlayer=current()?.id,wasConnected=guestGameInitialized,wasFinished=Boolean(game?.finished);
  game=message.state;room.owners=message.owners&&typeof message.owners==='object'?message.owners:{};
  if(room.myTeam!==null&&room.owners[room.myTeam]!==room.localPeerId)room.myTeam=null;
  if(!guestGameInitialized){guestGameInitialized=true;showGame();loadPhotos();}
  render();
  if(game.pendingWin&&!wasPending&&current())showWin(current(),game.teams[game.results[current().id]?.owner],game.results[current().id]?.price);
  else if(wasPending&&!game.pendingWin)$('winOverlay').classList.add('hidden');
  if(game.finished&&!wasFinished)showResults();
  if(wasConnected&&!game.pendingWin&&current()?.id!==oldPlayer)revealPlayer();
  if(!wasConnected&&!game.pendingWin)revealPlayer();
}
function renderSetupLobby(lobby=room.lobby) {
  const target=$('roomSetupStatus');
  if(!target||!room.role)return;
  if(room.role==='host'){
    const players=game?.teams||[],ready=players.length>=2&&players.length<=(room.maxPlayers||0)&&Boolean(room.peer?.open);
    target.innerHTML=`<div class="lobby-header"><span class="room-code-label">CÓDIGO PARA ENTRAR</span><strong class="room-code">${e(room.code)}</strong><button id="copyRoomCode" class="room-copy" type="button">COPIAR</button><button type="button" class="room-copy" data-room-action="share">ENLACE</button><button type="button" class="room-copy" data-room-action="whatsapp">WHATSAPP</button><button type="button" class="room-copy" data-room-action="close">CERRAR</button></div><div class="lobby-status">${e(room.status||'Esperando participantes…')}</div><div class="lobby-players">${Array.from({length:room.maxPlayers||0},(_,i)=>`<span class="lobby-player ${players[i]?'is-joined':''}">${players[i]?`✓ ${e(players[i].name)}${room.owners[i]!=='host'?` <button type="button" class="lobby-eject" data-eject="${i}">EXPULSAR</button>`:''}`:`Esperando jugador ${i+1}`}</span>`).join('')}</div><button id="startRoomGame" class="primary-btn wide-btn" type="button" ${ready?'':'disabled'}>EMPEZAR PARTIDA <span>↗</span></button><span class="lobby-hint">${players.length<2?'Se necesitan al menos 2 participantes para empezar.':!room.peer?.open?'Esperando conexión para abrir la sala…':'Todos los que han entrado jugarán.'}</span>`;
    return;
  }
  if(!lobby){
    target.textContent=room.status||'Conectando…';return;
  }
  const players=Array.isArray(lobby.players)?lobby.players:[];
  target.innerHTML=`<div class="lobby-header"><span class="room-code-label">SALA</span><strong class="room-code">${e(room.code)}</strong></div><div class="lobby-status">${e(room.status||'Esperando a que empiece la partida…')}</div><div class="lobby-players">${players.map(name=>`<span class="lobby-player is-joined">✓ ${e(name)}</span>`).join('')}</div><span class="lobby-hint">${room.myTeam===null?'Entrando con tu nombre…':`Dentro como ${e(room.joinName)}. Espera al anfitrión.`}</span>`;
}
function startAuction(){
  if(room.role!=='host'||!room.peer?.open||!game||game.started||game.teams.length<2)return;
  game.started=true;game.turn=chooseTurn(0);
  game.turnRemainingMs=game.turnSeconds?game.turnSeconds*1000:0;
  addLog('start',`Abre el mercado: ${game.teams.length} clubes. ${PLAYERS.length} cartas por descubrir.`);
  room.status='Partida en directo';
  showGame();render();revealPlayer();loadPhotos();sfx('open');
}
function renderRoomPanel() {
  const panel=$('roomPanel');
  if(!panel||!room.role){panel?.classList.add('hidden');return;}
  panel.classList.remove('hidden');
  panel.innerHTML=`<div class="room-details"><span class="room-code-label">SALA</span><strong class="room-code">${e(room.code)}</strong><span class="room-status">${e(room.status||'En directo')}</span></div><div class="room-actions"><button type="button" class="outline-btn" data-room-action="share">COMPARTIR ENLACE</button><button type="button" class="outline-btn" data-room-action="whatsapp">WHATSAPP</button></div>`;
}
function renderRoomControls(){
  const controls=$('roomControls');
  if(!controls)return;
  if(room.role==='guest'){
    const disconnected=!room.hostConn?.open&&!room.reconnectDisabled;
    controls.classList.toggle('hidden',!disconnected);
    controls.innerHTML=disconnected?`<div class="room-control-actions"><span class="room-status">Conexión perdida.</span><button class="outline-btn" type="button" data-room-action="reconnect">REINTENTAR CONEXIÓN</button></div>`:'';
    return;
  }
  if(room.role!=='host'){controls.classList.add('hidden');controls.innerHTML='';return;}
  controls.classList.remove('hidden');
  const actions=`<div class="room-control-actions"><button class="outline-btn" type="button" data-room-action="share">INVITAR</button><button class="outline-btn" type="button" data-room-action="whatsapp">WHATSAPP</button>${game?.started&&!game.finished&&!game.pendingWin?`<button class="outline-btn" type="button" data-room-action="pause">${game.paused?'REANUDAR':'PAUSAR'}</button>`:''}<button class="outline-btn" type="button" data-room-action="close">CERRAR SALA</button></div>`;
  const players=!game?.started?game?.teams.map((team,id)=>`<div class="moderation-row"><span>${e(team.name)}${room.owners[id]==='host'?' · ANFITRIÓN':room.owners[id]?'':' · DESCONECTADO'}</span>${room.owners[id]!=='host'?`<button type="button" class="text-btn" data-eject="${id}">EXPULSAR</button>`:''}</div>`).join(''):'';
  controls.innerHTML=actions+players;
}
function setRoomPaused(paused){
  if(room.role!=='host'||!game?.started||game.finished||game.pendingWin)return;
  if(paused===game.paused)return;
  if(paused){
    game.turnRemainingMs=game.turnDeadlineAt?Math.max(0,game.turnDeadlineAt-Date.now()):game.turnRemainingMs;
    game.turnDeadlineAt=0;game.paused=true;
    room.status='Partida pausada por el anfitrión.';
  }else{
    game.paused=false;
    room.status='Partida en directo';
  }
  render();
}
function ejectTeam(teamId){
  if(room.role!=='host'||game?.started||!Number.isInteger(teamId)||!game.teams[teamId]||room.owners[teamId]==='host')return;
  const conn=room.connections.get(room.owners[teamId]);
  if(conn?.open)conn.send({type:'kicked',message:'El anfitrión te ha retirado de la sala.'});
  const removedToken=Object.keys(room.reconnectTokens).find(token=>room.reconnectTokens[token]===teamId);
  if(removedToken)delete room.reconnectTokens[removedToken];
  conn?.close();
  game.teams.splice(teamId,1);
  const owners={};
  for(const [id,owner] of Object.entries(room.owners)){
    const oldId=Number(id);if(oldId!==teamId)owners[oldId>teamId?oldId-1:oldId]=owner;
  }
  room.owners=owners;
  for(const token of Object.keys(room.reconnectTokens)){
    if(room.reconnectTokens[token]>teamId)room.reconnectTokens[token]--;
  }
  game.teams.forEach((team,id)=>team.id=id);
  room.status='El participante se ha retirado de la sala.';
  broadcastLobby();renderRoomControls();
}
function closeRoom(){
  if(room.role!=='host'||!confirm('¿Cerrar la sala y desconectar a todos los participantes?'))return;
  for(const conn of room.connections.values()){if(conn.open)conn.send({type:'roomClosed'});conn.close();}
  room.connections.clear();room.peer?.destroy();
  if(game)game.paused=false;
  room={role:null,peer:null,connections:new Map(),hostConn:null,code:'',status:'',owners:{},localPeerId:'',myTeam:null,maxPlayers:0,joinName:'',lobby:null,reconnectTokens:{}};
  $('sport').disabled=false;
  $('roomPanel')?.classList.add('hidden');$('roomControls')?.classList.add('hidden');
  roomStatus('Sala cerrada. La partida sigue disponible en este dispositivo.');
  render();
}
function leaveRoom() {
  for(const conn of room.connections.values())conn.close();
  room.hostConn?.close();
  room.peer?.destroy();
  room={role:null,peer:null,connections:new Map(),hostConn:null,code:'',status:'',owners:{},localPeerId:'',myTeam:null,maxPlayers:0,joinName:'',lobby:null,reconnectTokens:{}};
  $('sport').disabled=false;
  clearInterval(clockInterval);clockInterval=null;clockTurnKey='';
  guestGameInitialized=false;
  roomConnectionPending=false;
  $('roomPanel')?.classList.add('hidden');
}
function showGame(){ $('setup').classList.add('hidden');$('game').classList.remove('hidden');$('game').classList.toggle('is-live',game?.started!==false);document.body.classList.toggle('game-live',game?.started!==false);window.scrollTo({top:0,behavior:'instant'}); }
function resetGame(){if(!confirm('¿Borrar la partida actual y empezar una nueva?'))return;leaveRoom();clearTimeout(revealTimer);$('revealOverlay').classList.add('hidden');$('winOverlay').classList.add('hidden');const savedSport=game?.sport||selectedSport;game=null;try{localStorage.removeItem(gameStorageKey(savedSport));}catch(error){console.warn('No se pudo borrar la partida guardada.',error);} $('game').classList.add('hidden');$('game').classList.remove('is-live');document.body.classList.remove('game-live');$('setup').classList.remove('hidden');switchTab('auction');window.scrollTo({top:0,behavior:'instant'});}
function loadGame(){
  let saved;
  try{saved=JSON.parse(localStorage.getItem(gameStorageKey()));}catch(error){console.warn('No se pudo leer la partida guardada.',error);}
  if(!saved||saved.version!==2||!Array.isArray(saved.queue)||!Array.isArray(saved.teams)||!saved.results){toast('No hay ninguna partida compatible guardada.',true);return;}
  if((saved.sport||'football')!==selectedSport)setSport(saved.sport||'football');
  game=saved;if(game.pendingWin){game.pendingWin=false;advance(false);} // Resume after a completed deal, never re-award.
  showGame();render();loadPhotos();
  toast('Partida recuperada. Bienvenidos de nuevo.');
}
function render(){
  if(!game)return;
  const p=current(), sold=soldCount(), discovered=revealedCount(), totalNeeded=game.teams.length*game.slots;
  $('summary').innerHTML=[
    ['◎',fmt(game.teams.length),'EQUIPOS EN LIZA'],
    ['✦',fmt(sold)+' / '+fmt(totalNeeded),'FICHAJES'],
    ['↗',fmt(game.cursor+ (p?1:0))+' / '+fmt(PLAYERS.length),'LOTES ABIERTOS'],
    ['◈',fmt(Math.max(0,PLAYERS.length-discovered)),'POR DESCUBRIR']
  ].map(x=>`<div class="game-stat"><div class="stat-icon">${x[0]}</div><div><b>${x[1]}</b><span>${x[2]}</span></div></div>`).join('');
  $('waitingPlayers').textContent=`Quedan ${Math.max(0,PLAYERS.length-discovered)} jugadores sin revelar. Nadie sabe quién será el siguiente.`;
  $('lotNumber').textContent=p?`LOTE ${String(game.cursor+1).padStart(3,'0')} / ${PLAYERS.length}`:'MERCADO CERRADO';
  if(!p){
    $('photoSource')?.classList.add('hidden');$('pname').textContent='FIN DEL MERCADO';$('pinfo').textContent='Consulta los clubes y la clasificación final.';$('activeCard').innerHTML='<div style="font:900 90px var(--display);color:var(--lime);letter-spacing:-5px">THE AUCTION</div>';
    $('bid').innerHTML='—';$('leader').textContent='LOS FICHAJES HAN TERMINADO';
    $('balanceHint').textContent='Pasa a la clasificación para ver al campeón.';$('turnNote').textContent='FIN DE PARTIDA. ¡Gracias por jugar!';
    ['makeBid','pass','award','skip','amount','decreaseBid','increaseBid'].forEach(id=>$(id).disabled=true);qs('.quick-bid').forEach(x=>x.disabled=true);
    $('stageStatus').textContent='NOCHE COMPLETADA';
  } else {
    $('pname').textContent=p.name;$('pinfo').innerHTML=`${e(p.pos)} &nbsp;/&nbsp; ${e(p.club)} &nbsp;/&nbsp; <strong>${p.ovr} OVR</strong> &nbsp;/&nbsp; ${fmt(p.value)} M€*`;
    $('activeCard').innerHTML=card(p);
    const credit = $('photoSource');
    if(credit){credit.href=photoLink(p);credit.classList.toggle('hidden', !photoFor(p));}
    $('bid').innerHTML=`${fmt(game.bid)} <small>€</small>`;
    $('leader').innerHTML=game.leader===null?'<span class="leader-bullet"></span> SIN OFERTAS TODAVÍA':`<span class="leader-bullet"></span> LIDERA: <strong>${e(game.teams[game.leader].name.toUpperCase())}</strong>`;
    $('minimumBid').textContent=`MÍNIMO ${euro(minBid())}`;
    const active=game.turn>=0?game.teams[game.turn]:null;
    $('turnBadge').textContent=game.turn>=0?'TURNO '+String(game.turn+1).padStart(2,'0'):'ÚLTIMA OFERTA';
    $('balanceHint').textContent=active?`Saldo: ${euro(active.balance)} · Puja máxima: ${euro(maxPay(game.turn))} (reservando plazas).`:'Esperando a adjudicar el lote.';
    $('amount').min=String(minBid());
    if(document.activeElement!==$('amount'))$('amount').value=String(minBid());
    $('turnNote').classList.remove('is-warning');
    $('turnNote').textContent=game.pendingWin?'Fichaje cerrado. Continúa para descubrir al siguiente.':active?`Es el turno de ${active.name}. ${game.passes.length} club(es) se han retirado de esta puja.`:'No quedan más clubes con capacidad de pujar.';
    const disabled=game.pendingWin || game.finished || game.paused, canAct=canControlTurn();
    $('makeBid').disabled=disabled||!canAct;
    $('pass').disabled=disabled||!canAct;
    $('award').disabled=disabled||game.leader===null||room.role==='guest';
    $('skip').disabled=disabled||room.role==='guest';
    $('amount').disabled=disabled||!canAct;
    $('decreaseBid').disabled=disabled||!canAct;$('increaseBid').disabled=disabled||!canAct;qs('.quick-bid').forEach(x=>x.disabled=disabled||!canAct);
    $('continueWin').disabled=room.role==='guest';
    if(room.role==='guest'&&!canAct)$('turnNote').textContent=room.myTeam===null?'Elige un club en la sala para participar en la puja.':active?`Turno de ${active.name}. Esperando a su participante.`:'Esperando al anfitrión.';
    else if(room.role==='host'&&game.turn>=0&&room.owners[game.turn]&&room.owners[game.turn]!=='host')$('turnNote').textContent=`Es el turno de ${active.name}. Esperando a su participante remoto.`;
    else if(room.role==='host'&&game.turn>=0&&!room.owners[game.turn])$('turnNote').textContent=`${active.name} está desconectado. Su turno pasará automáticamente si no se reconecta.`;
    $('stageStatus').textContent=game.leader===null?'LAS PUJAS ESTÁN ABIERTAS':'LA PUJA SE ESTÁ CALENTANDO';
  }
  renderFeed();renderTeams();renderRanking();renderAlbum();renderRoomPanel();renderRoomControls();updateClockDisplay();syncTurnClock();save();broadcastState();
}
function renderFeed(){
  $('eventFeed').innerHTML=game.log.slice(0,4).map(item=>`<div class="event"><span class="event-icon">${item.type==='win'?'★':item.type==='bid'?'↗':item.type==='skip'?'×':'◆'}</span><span class="event-text">${e(item.desc)}</span><time class="event-time">${e(item.at)}</time></div>`).join('')||'<div class="empty-feed">Todavía no hay movimientos.</div>';
}
function renderTeams(){
  $('teams').innerHTML=game.teams.map((t,i)=>{
    const rating=t.players.reduce((s,p)=>s+PLAYERS[p.id].ovr,0),spent=game.budget-t.balance;
    return `<article class="club-tile"><div class="club-tile-header"><div><span class="club-tile-index">CLUB NO. ${String(i+1).padStart(2,'0')}</span><h3>${e(t.name)}</h3></div><div class="club-tile-balance">${euro(t.balance)}<span>DISPONIBLE</span></div></div><div class="club-metrics"><div><b>${t.players.length} / ${game.slots}</b><span>FICHAJES</span></div><div><b>${rating}</b><span>OVR TOTAL</span></div><div><b>${spent} €</b><span>INVERTIDOS</span></div></div><div class="roster-list">${t.players.length?t.players.map(player=>{const p=PLAYERS[player.id],url=photoFor(p);return `<div class="roster-entry"><div class="roster-avatar">${url?`<img src="${e(url)}" alt="" loading="lazy" referrerpolicy="no-referrer">`:e(p.name[0])}</div><div class="roster-person"><strong>${e(p.name)}</strong><span>${e(p.pos)} · ${p.ovr} OVR</span></div><strong>${euro(player.price)}</strong></div>`;}).join(''):'<div class="roster-empty">Aún no hay fichajes. La noche acaba de empezar.</div>'}</div></article>`;
  }).join('');
}
function renderRanking(){
  const ranks=[...game.teams].map(t=>({...t,score:t.players.reduce((s,p)=>s+PLAYERS[p.id].ovr,0)})).sort((a,b)=>b.score-a.score||b.balance-a.balance||a.id-b.id);
  const markup=ranks.map((t,i)=>`<article class="rank-row"><div class="rank-index">${String(i+1).padStart(2,'0')}</div><div class="rank-name"><strong>${i===0?'♛ ':''}${e(t.name)}</strong><span>${t.players.length} / ${game.slots} FICHAJES · ${euro(t.balance)} DISPONIBLES</span></div><div class="rank-stat"><strong>${t.players.length?Math.round(t.score/t.players.length):'—'}</strong><span>OVR MEDIO</span></div><div class="rank-stat score"><strong>${t.score}</strong><span>OVR TOTAL</span></div><div class="team-mini-roster">${t.players.length?t.players.map(({id})=>`<span>${e(PLAYERS[id].name)} <b>${PLAYERS[id].ovr}</b></span>`).join(''):'<span class="team-empty">Aún sin fichajes</span>'}</div></article>`).join('');
  $('ranking').innerHTML=markup;$('auctionRanking').innerHTML=markup;
}
function showResults(){
  if(!game?.finished)return;
  const ranked=[...game.teams].map(team=>({...team,score:team.players.reduce((sum,player)=>sum+PLAYERS[player.id].ovr,0)}))
    .sort((a,b)=>b.score-a.score||b.balance-a.balance||a.id-b.id);
  const winner=ranked[0];
  resultsText=[
    'THE AUCTION — RESULTADOS FINALES',
    `Ganador: ${winner?.name||'Sin equipos'}${winner?` (${winner.score} OVR)` : ''}`,
    `Fichajes: ${soldCount()}`,
    '',
    ...ranked.map((team,index)=>`${index+1}. ${team.name} — ${team.score} OVR — ${euro(team.balance)} disponibles — ${team.players.length} fichajes`)
  ].join('\n');
  $('finalSummary').textContent=winner?`${winner.name} lidera con ${winner.score} OVR y ${euro(winner.balance)} disponibles. ${soldCount()} fichaje(s) completados.`:'La partida terminó sin participantes.';
  $('finalRanking').innerHTML=ranked.map((team,index)=>`<div class="final-rank-row"><b>${String(index+1).padStart(2,'0')}</b><strong>${e(team.name)}</strong><span>${team.score} OVR · ${euro(team.balance)} disponibles</span></div>`).join('');
  $('resultsOverlay').classList.remove('hidden');
}
async function shareResults(){
  try{
    if(navigator.share){await navigator.share({title:'Resultados The Auction',text:resultsText});return;}
    await navigator.clipboard.writeText(resultsText);toast('Resultados copiados para compartir.');
  }catch(error){if(error?.name!=='AbortError')toast('No se pudieron compartir los resultados.',true);}
}
function downloadResults(){
  const file=new Blob([resultsText],{type:'text/plain;charset=utf-8'}),url=URL.createObjectURL(file),link=document.createElement('a');
  link.href=url;link.download='the-auction-resultados.txt';link.click();URL.revokeObjectURL(url);
}
function renderAlbum(){
  const revealed=game.queue.slice(0,game.cursor+(current()?1:0)).map(id=>({p:PLAYERS[id],result:game.results[id]}));
  const filtered=revealed.filter(({result,p})=>currentAlbumFilter==='all'||(currentAlbumFilter==='active' && current()?.id===p.id && !result)||result?.status===currentAlbumFilter);
  $('album').innerHTML=filtered.map(({p,result})=>`<div class="album-item">${card(p,'small')}<div class="album-item-label">${result?.status==='sold'?`<strong>FICHADO</strong> POR ${e(game.teams[result.owner].name.toUpperCase())} · ${euro(result.price)}`:result?.status==='unsold'?'DESCARTADO':'✦ EN SUBASTA'}</div></div>`).join('') || '<div class="album-empty">Todavía no hay cartas en esta categoría. ¡Vuelve cuando comience la acción!</div>';
}
function switchTab(tab){qs('.tab').forEach(t=>{t.classList.toggle('active',t.dataset.tab===tab);t.setAttribute('aria-current',t.dataset.tab===tab?'page':'false');});for(const t of ['auction','teams','ranking','album'])$(t+'Tab').classList.toggle('hidden',t!==tab);if(tab==='auction'&&mobileInstallQuery.matches)setMobileAuctionView('auction');}
function sfx(type){
  if(!audioEnabled)return;
  try{
    audioContext ||= new (window.AudioContext||window.webkitAudioContext)();
    if(audioContext.state==='suspended')audioContext.resume();
    const tones={bid:[[380,.09,0],[510,.12,.07]],pass:[[270,.07,0]],open:[[240,.07,0],[440,.10,.08],[680,.14,.18]],win:[[480,.12,0],[600,.13,.09],[750,.17,.20],[980,.30,.32]]};
    (tones[type]||[]).forEach(([freq,duration,offset])=>{
      const osc=audioContext.createOscillator(),gain=audioContext.createGain(),at=audioContext.currentTime+offset;
      osc.type='triangle';osc.frequency.setValueAtTime(freq,at);osc.frequency.exponentialRampToValueAtTime(freq*1.03,at+duration);
      gain.gain.setValueAtTime(.0001,at);gain.gain.exponentialRampToValueAtTime(.055,at+.025);gain.gain.exponentialRampToValueAtTime(.0001,at+duration);
      osc.connect(gain);gain.connect(audioContext.destination);osc.start(at);osc.stop(at+duration+.02);
    });
  }catch(_){}
}
function revealPlayer(){
  if(!current()||prefersReducedMotion){$('activeCard').classList.add('show');return;}
  $('revealOverlay').classList.remove('hidden');
  $('activeCard').classList.remove('show');
  clearTimeout(revealTimer);
  revealTimer=setTimeout(finishReveal,1900);
  sfx('open');
}
function finishReveal(){$('revealOverlay').classList.add('hidden');$('activeCard').classList.remove('show');void $('activeCard').offsetWidth;$('activeCard').classList.add('show');}
function advance(animate=true){
  if(!game||room.role==='guest')return;
  game.pendingWin=false;game.cursor++;
  game.bid=0;game.leader=null;game.passes=[];
  game.finished=isFinished();
  if(!game.finished)game.turn=chooseTurn(game.cursor%game.teams.length);
  else game.turn=-1;
  save();render();
  if(animate&&!game.finished){switchTab('auction');revealPlayer();}
  else if(game.finished){toast('¡Mercado cerrado! Consulta la clasificación final.');switchTab('ranking');showResults();}
}
function pass(teamId=game?.turn,sourcePeer=null,automatic=false){
  if(!game||!current()||game.turn<0||game.pendingWin||teamId!==game.turn||(game.paused&&!automatic))return;
  if(room.role==='guest'&&!sourcePeer){
    if(!canControlTurn()){toast('Elige un club y espera a que sea su turno.',true);return;}
    if(room.hostConn?.open)room.hostConn.send({type:'action',action:'pass',teamId});
    else toast('Se perdió la conexión con el anfitrión.',true);
    return;
  }
  if(sourcePeer&&room.owners[teamId]!==sourcePeer)return;
  if(!sourcePeer&&!automatic&&room.role==='host'&&!canControlTurn()){toast('La puja corresponde a otro participante.',true);return;}
  const i=teamId;
  if(!eligible(i)){toast('Este club ya no puede pujar.',true);return;}
  game.passes.push(i);
  addLog('pass',`${game.teams[i].name} se retira de la puja por ${current().name}.`);
  sfx('pass');moveTurn();render();
}
function moveTurn(){
  const next=chooseTurn((game.turn+1)%game.teams.length);
  if(next<0){game.turn=-1;if(game.leader!==null)award();else unsold('Nadie presentó oferta.');}
  else game.turn=next;
}
function placeBid(teamId=game?.turn,amount=Number($('amount').value),sourcePeer=null){
  if(!game||!current()||game.turn<0||game.pendingWin||game.paused||teamId!==game.turn)return;
  if(room.role==='guest'&&!sourcePeer){
    if(!canControlTurn()){toast('Elige un club y espera a que sea su turno.',true);return;}
    if(room.hostConn?.open)room.hostConn.send({type:'action',action:'bid',teamId,amount});
    else toast('Se perdió la conexión con el anfitrión.',true);
    return;
  }
  if(sourcePeer&&room.owners[teamId]!==sourcePeer)return;
  if(!sourcePeer&&room.role==='host'&&!canControlTurn()){toast('La puja corresponde a otro participante.',true);return;}
  const i=teamId;
  if(!Number.isInteger(amount)||amount<minBid()){toast(`La oferta mínima es ${euro(minBid())}.`,true);return;}
  if(!eligible(i)||amount>maxPay(i)){toast(`Puja no válida. ${game.teams[i].name} puede ofrecer hasta ${euro(maxPay(i))}.`,true);return;}
  game.bid=amount;game.leader=i;
  addLog('bid',`${game.teams[i].name} ofrece ${euro(amount)} por ${current().name}.`);
  sfx('bid');moveTurn();render();
  $('bid').animate?.([{transform:'scale(1.1)',color:'#ffffff'},{transform:'scale(1)',color:'#d6fd4b'}],{duration:300,easing:'ease-out'});
}
function unsold(reason){
  if(!current())return;
  const p=current();game.results[p.id]={status:'unsold',reason};addLog('skip',`${p.name} abandona el mercado sin equipo.`);
  save();advance(true);
}
function award(){
  if(room.role==='guest'||!game||game.paused||game.leader===null||game.pendingWin||!current())return;
  const winner=game.leader,p=current(),t=game.teams[winner];
  if(game.bid>maxPay(winner)){toast('Esta adjudicación superaría el presupuesto disponible.',true);return;}
  t.balance-=game.bid;t.players.push({id:p.id,price:game.bid});
  game.results[p.id]={status:'sold',price:game.bid,owner:winner};
  game.pendingWin=true;
  addLog('win',`${t.name} ficha a ${p.name} por ${euro(game.bid)}.`);
  save();render();showWin(p,t,game.bid);sfx('win');
}
function showWin(p,t,price){
  $('winTeam').textContent=t.name;$('winPlayer').textContent=`${p.name} · ${p.ovr} OVR`;$('winPrice').textContent=euro(price);$('winCard').innerHTML=card(p);
  const colors=['#d6fd4b','#e8f9d3','#ffde8c','#74bca2','#a8e7ee'];
  $('confetti').innerHTML=Array.from({length:70},(_,i)=>{
    const x=((i*29.137)+17)%100, delay=((i*7)%11)*-.25;
    return `<span class="confetti-piece" style="--x:${x.toFixed(1)}%;--w:${4+i%5}px;--h:${7+i%10}px;--c:${colors[i%colors.length]};--d:${(3.2+(i%6)*.25).toFixed(2)}s;--delay:${delay.toFixed(2)}s;--drift:${-160+(i*47)%320}px;--r:${i*21}deg"></span>`;
  }).join('');
  $('winOverlay').classList.remove('hidden');
  $('continueWin').focus({preventScroll:true});
}
function skipPlayer(){if(!current()||game.paused||game.pendingWin)return;if(confirm(`¿Descartar a ${current().name} sin adjudicarlo?`))unsold('Descartado por los participantes.');}
function amountAdjust(n){if(!game||game.turn<0)return;const currentValue=Number($('amount').value)||0;$('amount').value=String(Math.max(minBid(),Math.min(maxPay(game.turn),currentValue+n)));}
function updateNames(){
  const old=qs('.name-entry input').map(x=>x.value);
  const raw=$('count').value;
  if(raw==='')return;
  const value=Number(raw);
  if(!Number.isFinite(value))return;
  const count=Math.floor(value);
  if(count<2)return;
  const boundedCount=Math.min(10,count);
  if(value!==boundedCount)$('count').value=String(boundedCount);
  $('names').innerHTML=Array.from({length:boundedCount},(_,i)=>`<div class="name-entry"><span>${String(i+1).padStart(2,'0')}</span><input aria-label="Nombre del participante ${i+1}" maxlength="24" value="${e(old[i]??'')}" placeholder="${i===0?'Tu nombre':'Jugador '+(i+1)}"></div>`).join('');
  $('nameCount').textContent=String(boundedCount).padStart(2,'0')+' CLUBES';
}
// Bind UI
$('count').addEventListener('input',updateNames);updateNames();
$('count').addEventListener('change',()=>{
  const count=Math.max(2,Math.min(10,Math.floor(Number($('count').value)||4)));
  $('count').value=String(count);
  updateNames();
});
$('sport').addEventListener('change',()=>setSport($('sport').value));
setSport(selectedSport,false);
$('start').addEventListener('click',()=>newGame(false));
$('createRoom').addEventListener('click',createRoom);
$('joinRoom').addEventListener('click',connectToRoom);
$('joinCode').addEventListener('keydown',ev=>{if(ev.key==='Enter'){ev.preventDefault();connectToRoom();}});
$('joinName').addEventListener('keydown',ev=>{if(ev.key==='Enter'){ev.preventDefault();connectToRoom();}});
$('roomSetupStatus').addEventListener('click',async ev=>{
  if(ev.target.closest?.('#startRoomGame')){startAuction();return;}
  if(ev.target.closest?.('[data-eject]')){ejectTeam(Number(ev.target.closest('[data-eject]').dataset.eject));return;}
  if(ev.target.closest?.('[data-room-action="share"]')){await shareInvite();return;}
  if(ev.target.closest?.('[data-room-action="whatsapp"]')){await shareInvite('whatsapp');return;}
  if(ev.target.closest?.('[data-room-action="close"]')){closeRoom();return;}
  if(ev.target.id!=='copyRoomCode')return;
  try{await navigator.clipboard.writeText(room.code);toast('Código de sala copiado.');}
  catch(_){toast(`No se pudo copiar. Comparte este código: ${room.code}`,true);}
});
$('roomPanel').addEventListener('click',async ev=>{
  const action=ev.target.closest?.('[data-room-action]')?.dataset.roomAction;
  if(action==='share')await shareInvite();
  else if(action==='whatsapp')await shareInvite('whatsapp');
});
$('roomControls').addEventListener('click',async ev=>{
  const target=ev.target.closest?.('[data-room-action],[data-eject]');
  if(!target)return;
  if(target.dataset.eject!==undefined){ejectTeam(Number(target.dataset.eject));return;}
  if(target.dataset.roomAction==='share')await shareInvite();
  else if(target.dataset.roomAction==='whatsapp')await shareInvite('whatsapp');
  else if(target.dataset.roomAction==='pause')setRoomPaused(!game.paused);
  else if(target.dataset.roomAction==='close')closeRoom();
  else if(target.dataset.roomAction==='reconnect')connectToRoom();
});
$('mobileAuctionTab').addEventListener('click',()=>setMobileAuctionView('auction'));
$('mobileTeamsTab').addEventListener('click',()=>setMobileAuctionView('teams'));
$('load').addEventListener('click',loadGame);
$('reset').addEventListener('click',resetGame);
$('pass').addEventListener('click',()=>pass());
$('makeBid').addEventListener('click',()=>placeBid());
$('award').addEventListener('click',award);
$('skip').addEventListener('click',skipPlayer);
$('continueWin').addEventListener('click',()=>{if(room.role==='guest')return;$('winOverlay').classList.add('hidden');advance(true);});
$('shareResults').addEventListener('click',shareResults);
$('downloadResults').addEventListener('click',downloadResults);
$('closeResults').addEventListener('click',()=>$('resultsOverlay').classList.add('hidden'));
$('skipReveal').addEventListener('click',()=>{clearTimeout(revealTimer);finishReveal();});
$('increaseBid').addEventListener('click',()=>amountAdjust(game?.inc||1));
$('decreaseBid').addEventListener('click',()=>amountAdjust(-(game?.inc||1)));
qs('.quick-bid').forEach(b=>b.addEventListener('click',()=>amountAdjust(Number(b.dataset.add))));
$('amount').addEventListener('keydown',ev=>{if(ev.key==='Enter'){ev.preventDefault();placeBid();}});
qs('.tab').forEach(tab=>tab.addEventListener('click',()=>switchTab(tab.dataset.tab)));
qs('.filter').forEach(filter=>filter.addEventListener('click',()=>{currentAlbumFilter=filter.dataset.filter;qs('.filter').forEach(x=>x.classList.toggle('active',x===filter));if(game)renderAlbum();}));
$('soundToggle').addEventListener('click',()=>{audioEnabled=!audioEnabled;$('soundToggle').classList.toggle('is-on',audioEnabled);$('soundToggle').querySelector('.sound-off').textContent=audioEnabled?'ON':'OFF';$('soundToggle').setAttribute('aria-label',audioEnabled?'Desactivar sonido':'Activar sonido');if(audioEnabled)sfx('bid');});
const savedRoom=loadRoomSession(),invitedRoom=new URLSearchParams(location.search).get('room');
if(invitedRoom)$('joinCode').value=invitedRoom.toUpperCase();
else if(savedRoom)$('joinCode').value=savedRoom.code;
if(savedRoom)$('joinName').value=savedRoom.name;
function setMobileAuctionView(view){
  const teams=view==='teams';
  $('auctionGrid').classList.toggle('show-teams',teams);
  $('mobileAuctionTab').classList.toggle('is-active',!teams);
  $('mobileAuctionTab').setAttribute('aria-pressed',String(!teams));
  $('mobileTeamsTab').classList.toggle('is-active',teams);
  $('mobileTeamsTab').setAttribute('aria-pressed',String(teams));
  window.scrollTo({top:0,behavior:'instant'});
}
const mobileInstallQuery=window.matchMedia('(max-width: 880px)');
function syncInstallButton(){
  const isStandalone=window.matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;
  const visible=!isStandalone&&(Boolean(installPrompt)||mobileInstallQuery.matches);
  $('install').hidden=!visible;
  $('mobileInstall').hidden=!visible;
}
window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();installPrompt=event;syncInstallButton();});
window.addEventListener('appinstalled',()=>{installPrompt=null;syncInstallButton();});
mobileInstallQuery.addEventListener?.('change',syncInstallButton);
syncInstallButton();
async function installApp(){
  if(installPrompt){
    installPrompt.prompt();
    await installPrompt.userChoice;
    installPrompt=null;
    syncInstallButton();
    return;
  }
  const isApple=/iPhone|iPad|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
  toast(isApple?'En Safari, toca Compartir y elige «Añadir a pantalla de inicio».':'Abre el menú del navegador y elige «Instalar aplicación» o «Añadir a pantalla de inicio».');
}
$('install').addEventListener('click',installApp);
$('mobileInstall').addEventListener('click',installApp);
if('serviceWorker' in navigator && location.protocol.startsWith('http'))navigator.serviceWorker.register('./sw.js').catch(()=>{});
window.AUCTION={getState:()=>game,getPlayers:()=>PLAYERS,getSport:()=>selectedSport,shuffle,photoBroken};
window.BIDXI=window.AUCTION;
})();
