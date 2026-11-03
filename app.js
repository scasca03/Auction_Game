/* BID/XI v2 — plain JavaScript, no external JS dependencies. */
(() => {
'use strict';
const $ = id => document.getElementById(id);
const SAVE_KEY = 'bidxi-game-v2';
const PHOTO_KEY = 'bidxi-photos-v2';
const RARITY = {titan:'TITAN',elite:'ELITE',rare:'STAR',gold:'GOLD'};
const STATS = ['RIT','TIR','PAS','REG','DEF','FIS'];
const GK_STATS = ['EST','MAN','SAQ','REF','VEL','POS'];
const qs = (s, parent=document) => [...parent.querySelectorAll(s)];
const e = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const euro = v => new Intl.NumberFormat('es-ES',{maximumFractionDigits:0}).format(v) + ' €';
const fmt = v => new Intl.NumberFormat('es-ES',{maximumFractionDigits:0}).format(v);
const flag = country => /^[A-Z]{2}$/.test(country) ? [...country].map(c=>String.fromCodePoint(127397+c.charCodeAt(0))).join('') : '⚽';
const time = () => new Date().toLocaleTimeString('es-ES',{hour:'2-digit',minute:'2-digit'});
const prefersReducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
let game = null, audioEnabled = false, audioContext = null, installPrompt = null, revealTimer = null, toastTimer = null, photoCache = {}, photoRequest = null, currentAlbumFilter = 'all', storageError = false;
const brokenPhotoIds = new Set();
let localPhotosLoaded = false;
try { photoCache = JSON.parse(localStorage.getItem(PHOTO_KEY) || '{}') || {}; } catch (_) { photoCache = {}; }

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
  const byPos={DC:[8,7,-15,0,-41,3],EI:[8,-1,0,9,-35,-10],ED:[8,-1,0,9,-35,-10],MC:[-4,-4,6,4,0,-3],MCO:[-1,2,6,7,-24,-9],MCD:[-14,-17,7,-9,5,5],DFC:[-17,-34,-17,-18,7,5],LI:[8,-14,-5,-2,5,1],LD:[8,-14,-5,-2,5,1]};
  const adjust = gk ? [1,0,-11,2,-36,2] : (byPos[p.pos]||[0,0,0,0,0,0]);
  return adjust.map((delta,i)=>Math.max(30,Math.min(99,base+delta+(((hash>>>(i*4))&7)-3))));
}
function photoFor(p) { return brokenPhotoIds.has(p.id) ? null : photoCache[p.id]?.url || null; }
function photoLink(p) { return photoCache[p.id]?.source || ('https://en.wikipedia.org/wiki/'+encodeURIComponent(p.wiki.replace(/ /g,'_'))); }
function photoBroken(id) { brokenPhotoIds.add(id); syncPhotosToDOM(); }
function card(p,size='',showPhoto=true) {
  const initials=p.name.split(' ').slice(0,2).map(n=>n[0]).join('').toUpperCase();
  const stats=playerStats(p), labels=p.pos==='POR'?GK_STATS:STATS;
  const photo=showPhoto ? photoFor(p) : null;
  return `<article class="player-card rarity-${p.rarity} ${size} ${photo?'':'photo-pending'}" aria-label="${e(p.name)}, ${p.pos}, media ${p.ovr}">
    <div class="card-orbit"></div><div class="card-watermark" aria-hidden="true">XI</div>
    <div class="card-photo ${photo?'has-photo':''}" data-photo-id="${p.id}">${photo?`<img src="${e(photo)}" alt="Foto de ${e(p.name)}" loading="${size?'lazy':'eager'}" referrerpolicy="no-referrer" onerror="window.BIDXI?.photoBroken(${p.id});this.parentNode.classList.remove('has-photo');this.remove()">`:''}<span class="photo-fallback">${e(initials)}</span></div>
    <div class="card-grade"><strong>${p.ovr}</strong><span>${e(p.pos)}</span></div>
    <div class="card-flag" title="${e(p.country)}">${flag(p.country)}</div><div class="card-rarity">◆ ${RARITY[p.rarity]}</div>
    <div class="card-nameplate"><strong title="${e(p.name)}">${e(p.name)}</strong><span>${e(p.club)}</span></div>
    <div class="card-attributes">${labels.map((label,i)=>`<span><b>${stats[i]}</b> ${label}</span>`).join('')}</div><div class="card-number">BID/XI · 26</div>
  </article>`;
}
function syncPhotosToDOM() {
  qs('[data-photo-id]').forEach(node => {
    const id=Number(node.dataset.photoId), url=photoCache[id]?.url;
    if(!url || brokenPhotoIds.has(id) || node.querySelector('img'))return;
    const img=document.createElement('img');img.src=url;img.alt='Foto de '+PLAYERS[id].name;img.loading=node.closest('.small')?'lazy':'eager';img.referrerPolicy='no-referrer';
    img.onerror=()=>{brokenPhotoIds.add(id);node.classList.remove('has-photo');img.remove();};
    node.prepend(img);node.classList.add('has-photo');node.closest('.player-card')?.classList.remove('photo-pending');
  });
  const p=current(),credit=$('photoSource');
  if(credit&&p){credit.href=photoLink(p);credit.classList.toggle('hidden',!photoFor(p));}
}
// Wikimedia images are retrieved by the user's browser, not copies of commercial EA card artwork.
// An optional photo-manifest.json generated by tools/fetch-photos.py takes priority.
async function loadPhotos() {
  if(photoRequest) return photoRequest;
  photoRequest=(async()=>{
    if(!localPhotosLoaded){
      localPhotosLoaded=true;
      try{
        const res=await fetch('./photo-manifest.json',{cache:'no-cache'});
        if(res.ok){
          const photos=await res.json();
          for(const [id,entry] of Object.entries(photos)){
            if(Number.isInteger(+id)&&PLAYERS[+id]&&entry.url&&entry.source){
              photoCache[id]={url:entry.url,source:entry.source,author:entry.author||'',license:entry.license||''};
              brokenPhotoIds.delete(+id);
            }
          }
          syncPhotosToDOM();
        }
      }catch(_){/* No predownloaded photo manifest: online Wikimedia fallback. */}
    }
    const missing=PLAYERS.filter(p=>!photoCache[p.id]);
    const batches=[];
    for(let i=0;i<missing.length;i+=35)batches.push(missing.slice(i,i+35));
    await Promise.allSettled(batches.map(async group=>{
      const titles=group.map(p=>p.wiki);
      const params=new URLSearchParams({origin:'*',action:'query',format:'json',formatversion:'2',prop:'pageimages',piprop:'thumbnail|name',pithumbsize:'760',redirects:'1',titles:titles.join('|')});
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
          photoCache[p.id]={url:page.thumbnail.source,source:page.pageimage?('https://commons.wikimedia.org/wiki/File:'+encodeURIComponent(page.pageimage.replace(/ /g,'_'))):('https://en.wikipedia.org/wiki/'+encodeURIComponent(page.title.replace(/ /g,'_')))};
        }
      }
      syncPhotosToDOM();
    }));
    try{localStorage.setItem(PHOTO_KEY,JSON.stringify(photoCache));}catch(_){}
  })();
  try { return await photoRequest; } finally { photoRequest=null; }
}
function toast(message,warning=false){const t=$('toast');t.textContent=message;t.style.background=warning?'#ffba9e':'#eafdba';t.classList.remove('hidden');clearTimeout(toastTimer);toastTimer=setTimeout(()=>t.classList.add('hidden'),3600);}
function addLog(type,desc){game.log.unshift({type,desc,at:time()});game.log=game.log.slice(0,20);}
function save(){if(!game||storageError)return;try{localStorage.setItem(SAVE_KEY,JSON.stringify(game));}catch(_){storageError=true; /* The game continues in memory if browser storage is blocked. */}}
function isFinished(){return game.teams.every(t=>t.players.length>=game.slots) || game.cursor>=game.queue.length || !game.teams.some((t,i)=>canPay(i,1));}
function remainingSlots(i){return Math.max(0,game.slots-game.teams[i].players.length);}
function maxPay(i){const t=game.teams[i];return Math.max(0,t.balance - Math.max(0,remainingSlots(i)-1));}
function canPay(i,amount){return remainingSlots(i)>0 && maxPay(i)>=amount;}
function minBid(){return game.bid ? game.bid+game.inc : 1;}
function eligible(i){return i!==game.leader && !game.passes.includes(i) && canPay(i,minBid());}
function chooseTurn(start){for(let k=0;k<game.teams.length;k++){let i=(start+k)%game.teams.length;if(eligible(i))return i;}return -1;}
function newGame() {
  const n=Number($('count').value),budget=Number($('budget').value),slots=Number($('slots').value),inc=Number($('inc').value);
  const names=qs('input', $('names')).map(input=>input.value.trim());
  let error='';
  if(!Number.isInteger(n)||n<2||n>10)error='Debes elegir entre 2 y 10 participantes.';
  else if(names.length!==n||names.some(name=>name.length<1||name.length>24))error='Todos los participantes necesitan un nombre (máximo 24 caracteres).';
  else if(new Set(names.map(x=>x.toLocaleLowerCase('es'))).size!==names.length)error='Los nombres de los participantes deben ser distintos.';
  else if(!Number.isInteger(slots)||slots<1||slots>15)error='Elige entre 1 y 15 futbolistas por equipo.';
  else if(n*slots>PLAYERS.length)error=`Solo hay ${PLAYERS.length} futbolistas. Reduce los jugadores por equipo a un máximo de ${Math.floor(PLAYERS.length/n)}.`;
  else if(!Number.isInteger(budget)||budget<slots||budget>10000)error=`El presupuesto debe ser de al menos ${slots} € para poder completar un equipo.`;
  else if(!Number.isInteger(inc)||inc<1||inc>1000)error='El incremento mínimo debe estar entre 1 € y 1.000 €.';
  if(error){$('setupError').textContent=error;$('setupError').classList.remove('hidden');return;}
  $('setupError').classList.add('hidden');
  game={version:2,createdAt:new Date().toISOString(),budget,slots,inc,teams:names.map((name,id)=>({id,name,balance:budget,players:[]})),queue:shuffle(PLAYERS.map(p=>p.id)),cursor:0,turn:0,bid:0,leader:null,passes:[],results:{},log:[],finished:false,pendingWin:false};
  game.turn=chooseTurn(0);
  addLog('start',`Abre el mercado: ${n} clubes. ${PLAYERS.length} cartas por descubrir.`);
  showGame();render();revealPlayer();loadPhotos();sfx('open');
}
function showGame(){ $('setup').classList.add('hidden');$('game').classList.remove('hidden');window.scrollTo({top:0,behavior:'instant'}); }
function resetGame(){if(!confirm('¿Borrar la partida actual y empezar una nueva?'))return;clearTimeout(revealTimer);$('revealOverlay').classList.add('hidden');$('winOverlay').classList.add('hidden');game=null;try{localStorage.removeItem(SAVE_KEY);}catch(_){} $('game').classList.add('hidden');$('setup').classList.remove('hidden');switchTab('auction');window.scrollTo({top:0,behavior:'instant'});}
function loadGame(){
  let saved;
  try{saved=JSON.parse(localStorage.getItem(SAVE_KEY));}catch(_){}
  if(!saved||saved.version!==2||!Array.isArray(saved.queue)||!Array.isArray(saved.teams)||!saved.results){toast('No hay ninguna partida compatible guardada.',true);return;}
  game=saved;if(game.pendingWin){game.pendingWin=false;advance(false);} // Resume after a completed deal, never re-award.
  showGame();render();loadPhotos();
  toast('Partida recuperada. Bienvenidos de nuevo.');
}
function render(){
  if(!game)return;
  const p=current(), sold=soldCount(), discovered=revealedCount(), totalNeeded=game.teams.length*game.slots;
  $('summary').innerHTML=[
    ['◎',fmt(game.teams.length),'CLUBES EN LIZA'],
    ['✦',fmt(sold)+' / '+fmt(totalNeeded),'FICHAJES'],
    ['↗',fmt(game.cursor+ (p?1:0))+' / '+fmt(PLAYERS.length),'LOTES ABIERTOS'],
    ['◈',fmt(Math.max(0,PLAYERS.length-discovered)),'POR DESCUBRIR']
  ].map(x=>`<div class="game-stat"><div class="stat-icon">${x[0]}</div><div><b>${x[1]}</b><span>${x[2]}</span></div></div>`).join('');
  $('waitingPlayers').textContent=`Quedan ${Math.max(0,PLAYERS.length-discovered)} futbolistas sin revelar. Nadie sabe quién será el siguiente.`;
  $('lotNumber').textContent=p?`LOTE ${String(game.cursor+1).padStart(3,'0')} / ${PLAYERS.length}`:'MERCADO CERRADO';
  if(!p){
    $('photoSource')?.classList.add('hidden');$('pname').textContent='FIN DEL MERCADO';$('pinfo').textContent='Consulta los clubes y la clasificación final.';$('activeCard').innerHTML='<div style="font:900 90px var(--display);color:#d6fd4b;letter-spacing:-5px">BID/XI</div>';
    $('bid').innerHTML='—';$('leader').textContent='LOS FICHAJES HAN TERMINADO';$('bidder').innerHTML='<option>Sin turnos pendientes</option>';
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
    $('bidder').innerHTML=game.teams.map((t,i)=>`<option value="${i}" ${i===game.turn?'selected':''} ${!eligible(i)?'disabled':''}>${e(t.name)} · ${euro(t.balance)}</option>`).join('');
    const active=game.turn>=0?game.teams[game.turn]:null;
    $('turnBadge').textContent=game.turn>=0?'TURNO '+String(game.turn+1).padStart(2,'0'):'ÚLTIMA OFERTA';
    $('balanceHint').textContent=active?`Saldo: ${euro(active.balance)} · Puja máxima: ${euro(maxPay(game.turn))} (reservando plazas).`:'Esperando a adjudicar el lote.';
    $('amount').min=String(minBid());
    if(document.activeElement!==$('amount'))$('amount').value=String(minBid());
    $('turnNote').classList.remove('is-warning');
    $('turnNote').textContent=game.pendingWin?'Fichaje cerrado. Continúa para descubrir al siguiente.':active?`Es el turno de ${active.name}. ${game.passes.length} club(es) se han retirado de esta puja.`:'No quedan más clubes con capacidad de pujar.';
    const disabled=game.pendingWin || game.finished;
    $('makeBid').disabled=disabled||game.turn<0;
    $('pass').disabled=disabled||game.turn<0;
    $('award').disabled=disabled||game.leader===null;
    $('skip').disabled=disabled;
    $('amount').disabled=disabled||game.turn<0;
    $('decreaseBid').disabled=disabled||game.turn<0;$('increaseBid').disabled=disabled||game.turn<0;qs('.quick-bid').forEach(x=>x.disabled=disabled||game.turn<0);
    $('stageStatus').textContent=game.leader===null?'LAS PUJAS ESTÁN ABIERTAS':'LA PUJA SE ESTÁ CALENTANDO';
  }
  renderFeed();renderTeams();renderRanking();renderAlbum();save();
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
  $('ranking').innerHTML=ranks.map((t,i)=>`<article class="rank-row"><div class="rank-index">${String(i+1).padStart(2,'0')}</div><div class="rank-name"><strong>${i===0?'♛ ':''}${e(t.name)}</strong><span>${t.players.length} / ${game.slots} FICHAJES · ${euro(t.balance)} RESTANTES</span></div><div class="rank-stat"><strong>${t.players.length?Math.round(t.score/t.players.length):'—'}</strong><span>OVR MEDIO</span></div><div class="rank-stat score"><strong>${t.score}</strong><span>PUNTOS TOTALES</span></div></article>`).join('');
}
function renderAlbum(){
  const revealed=game.queue.slice(0,game.cursor+(current()?1:0)).map(id=>({p:PLAYERS[id],result:game.results[id]}));
  const filtered=revealed.filter(({result,p})=>currentAlbumFilter==='all'||(currentAlbumFilter==='active' && current()?.id===p.id && !result)||result?.status===currentAlbumFilter);
  $('album').innerHTML=filtered.map(({p,result})=>`<div class="album-item">${card(p,'small')}<div class="album-item-label">${result?.status==='sold'?`<strong>FICHADO</strong> POR ${e(game.teams[result.owner].name.toUpperCase())} · ${euro(result.price)}`:result?.status==='unsold'?'DESCARTADO':'✦ EN SUBASTA'}</div></div>`).join('') || '<div class="album-empty">Todavía no hay cartas en esta categoría. ¡Vuelve cuando comience la acción!</div>';
}
function switchTab(tab){qs('.tab').forEach(t=>{t.classList.toggle('active',t.dataset.tab===tab);t.setAttribute('aria-current',t.dataset.tab===tab?'page':'false');});for(const t of ['auction','teams','ranking','album'])$(t+'Tab').classList.toggle('hidden',t!==tab);}
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
  if(!game)return;
  game.pendingWin=false;game.cursor++;
  game.bid=0;game.leader=null;game.passes=[];
  game.finished=isFinished();
  if(!game.finished)game.turn=chooseTurn(game.cursor%game.teams.length);
  else game.turn=-1;
  save();render();
  if(animate&&!game.finished){switchTab('auction');revealPlayer();}
  else if(game.finished){toast('¡Mercado cerrado! Consulta la clasificación final.');switchTab('ranking');}
}
function pass(){
  if(!game||!current()||game.turn<0||game.pendingWin)return;
  const i=game.turn;
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
function placeBid(){
  if(!game||!current()||game.turn<0||game.pendingWin)return;
  const i=game.turn,amount=Number($('amount').value);
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
  if(!game||game.leader===null||game.pendingWin||!current())return;
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
function skipPlayer(){if(!current()||game.pendingWin)return;if(confirm(`¿Descartar a ${current().name} sin adjudicarlo?`))unsold('Descartado por los participantes.');}
function amountAdjust(n){if(!game||game.turn<0)return;const currentValue=Number($('amount').value)||0;$('amount').value=String(Math.max(minBid(),Math.min(maxPay(game.turn),currentValue+n)));}
function updateNames(){
  const old=qs('.name-entry input').map(x=>x.value);
  const count=Math.max(2,Math.min(10,Math.floor(Number($('count').value)||4)));
  $('count').value=String(count);
  const defaults=['Santi','Feli','Alvi','José','Juandi'];
  $('names').innerHTML=Array.from({length:count},(_,i)=>`<div class="name-entry"><span>${String(i+1).padStart(2,'0')}</span><input aria-label="Nombre del participante ${i+1}" maxlength="24" value="${e(old[i]??defaults[i]??('Club '+(i+1)))}" placeholder="Club ${i+1}"></div>`).join('');
  $('nameCount').textContent=String(count).padStart(2,'0')+' CLUBES';
}
// Bind UI
$('count').addEventListener('input',updateNames);updateNames();
$('start').addEventListener('click',newGame);
$('load').addEventListener('click',loadGame);
$('reset').addEventListener('click',resetGame);
$('pass').addEventListener('click',pass);
$('makeBid').addEventListener('click',placeBid);
$('award').addEventListener('click',award);
$('skip').addEventListener('click',skipPlayer);
$('continueWin').addEventListener('click',()=>{$('winOverlay').classList.add('hidden');advance(true);});
$('skipReveal').addEventListener('click',()=>{clearTimeout(revealTimer);finishReveal();});
$('increaseBid').addEventListener('click',()=>amountAdjust(game?.inc||1));
$('decreaseBid').addEventListener('click',()=>amountAdjust(-(game?.inc||1)));
qs('.quick-bid').forEach(b=>b.addEventListener('click',()=>amountAdjust(Number(b.dataset.add))));
$('amount').addEventListener('keydown',ev=>{if(ev.key==='Enter'){ev.preventDefault();placeBid();}});
qs('.tab').forEach(tab=>tab.addEventListener('click',()=>switchTab(tab.dataset.tab)));
qs('.filter').forEach(filter=>filter.addEventListener('click',()=>{currentAlbumFilter=filter.dataset.filter;qs('.filter').forEach(x=>x.classList.toggle('active',x===filter));if(game)renderAlbum();}));
$('soundToggle').addEventListener('click',()=>{audioEnabled=!audioEnabled;$('soundToggle').classList.toggle('is-on',audioEnabled);$('soundToggle').querySelector('.sound-off').textContent=audioEnabled?'ON':'OFF';$('soundToggle').setAttribute('aria-label',audioEnabled?'Desactivar sonido':'Activar sonido');if(audioEnabled)sfx('bid');});
window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();installPrompt=event;$('install').hidden=false;});
$('install').addEventListener('click',async()=>{if(installPrompt){installPrompt.prompt();await installPrompt.userChoice;installPrompt=null;$('install').hidden=true;}else toast('En el navegador, selecciona «Añadir a pantalla de inicio».');});
if('serviceWorker' in navigator && location.protocol.startsWith('http'))navigator.serviceWorker.register('./sw.js').catch(()=>{});
window.BIDXI={getState:()=>game,getPlayers:()=>PLAYERS,shuffle,photoBroken}; // Helpful for testing.
})();
