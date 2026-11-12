/* Música ambiental de fondo, suave y sin archivos.
   Se genera en el navegador (acordes lentos + campanitas), así no hay derechos de autor de por medio.

   Si prefieres usar tu propia canción (con derechos libres o tuya), sube el archivo
   a la carpeta audio/ y escribe su ruta aquí, por ejemplo: 'audio/musica.mp3'  */
(function(){
  var ARCHIVO = '';

  var AC = window.AudioContext || window.webkitAudioContext;
  if(!AC && !ARCHIVO) return;

  function leer(k){ try{ return localStorage.getItem(k); }catch(e){ return null; } }
  function guardar(k,v){ try{ localStorage.setItem(k,v); }catch(e){} }

  var vol = .4;
  var v0 = parseFloat(leer('au_vol')); if(v0 >= 0 && v0 <= 1) vol = v0;
  var activo = false, arrancado = false, ctx = null, master = null, bus = null, aud = null, timers = [], paso = 0;
  var nuevo = leer('au_musica') === null;
  var rapido = false;   /* true cuando la música se retoma tras recargar la página: entra en ~1 s en vez de ~4 s */

  /* ---------- Interfaz ---------- */
  var ui = document.createElement('div');
  ui.className = 'musica' + (nuevo ? ' nuevo' : '');
  ui.setAttribute('data-persistir','');   /* nav.js no la borra al cambiar de sección */
  ui.innerHTML = '<button id="mBtn" type="button" aria-pressed="false" aria-label="Música ambiental"><span class="eq"><i></i><i></i><i></i></span></button>' +
    '<input id="mVol" type="range" min="0" max="100" step="1" aria-label="Volumen de la música">' +
    '<span class="mtxt">música ambiental</span>';
  document.body.appendChild(ui);
  var btn = ui.querySelector('#mBtn'), rng = ui.querySelector('#mVol');
  rng.value = Math.round(vol*100);
  function pintar(){
    ui.classList.toggle('on', activo);
    btn.setAttribute('aria-pressed', activo ? 'true' : 'false');
    btn.title = activo ? 'Pausar la música' : 'Activar música ambiental';
  }
  if(nuevo){ setTimeout(function(){ ui.classList.remove('nuevo'); }, 9000); }

  /* ---------- Audio generado ---------- */
  function nivel(){ return vol * 0.12; }   /* volumen máximo muy bajo, a propósito */
  function impulso(seg){
    var n = Math.floor(ctx.sampleRate*seg), b = ctx.createBuffer(2,n,ctx.sampleRate);
    for(var c=0;c<2;c++){ var d = b.getChannelData(c); for(var i=0;i<n;i++) d[i] = (Math.random()*2-1)*Math.pow(1-i/n,2.6); }
    return b;
  }
  function crear(){
    if(ctx) return true;
    if(!AC) return false;
    ctx = new AC();
    master = ctx.createGain(); master.gain.value = 0; master.connect(ctx.destination);
    bus = ctx.createGain();
    var lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1800;
    var dry = ctx.createGain(); dry.gain.value = .5;
    var conv = ctx.createConvolver(); conv.buffer = impulso(3.2);
    var wet = ctx.createGain(); wet.gain.value = .8;
    bus.connect(lp); lp.connect(dry); dry.connect(master); lp.connect(conv); conv.connect(wet); wet.connect(master);
    ctx.onstatechange = function(){ if(ctx && ctx.state === 'running' && activo) arrancar(); };
    return true;
  }
  var PROG = [
    [110,164.81,220,261.63,329.63],        /* La menor */
    [87.31,130.81,174.61,220,261.63],      /* Fa */
    [130.81,196,261.63,329.63],            /* Do */
    [98,146.83,196,246.94,293.66]          /* Sol */
  ];
  var PENT = [440,523.25,587.33,659.25,783.99,880,1046.5];
  function pad(f,t0,dur,atk){
    atk = atk || 4;
    [['sine',0,.16],['triangle',6,.06]].forEach(function(o){
      var osc = ctx.createOscillator(), g = ctx.createGain();
      osc.type = o[0]; osc.frequency.value = f; osc.detune.value = o[1];
      g.gain.setValueAtTime(0,t0); g.gain.linearRampToValueAtTime(o[2],t0+atk);
      g.gain.setValueAtTime(o[2],t0+dur-4); g.gain.linearRampToValueAtTime(0,t0+dur);
      osc.connect(g); g.connect(bus); osc.start(t0); osc.stop(t0+dur+.1);
    });
  }
  function acorde(){
    if(!activo || !ctx) return;
    var t = ctx.currentTime + .05;
    var atk = rapido ? 1.2 : 4, esc = rapido ? .1 : .25;
    PROG[paso % PROG.length].forEach(function(f,i){ pad(f, t + i*esc, 13, atk); });
    paso++;
    timers.push(setTimeout(acorde, 10000));
  }
  function campana(){
    if(!activo || !ctx) return;
    if(Math.random() < .8){
      var f = PENT[Math.floor(Math.random()*PENT.length)], t = ctx.currentTime + .02;
      var osc = ctx.createOscillator(), g = ctx.createGain();
      osc.type = 'sine'; osc.frequency.value = f;
      g.gain.setValueAtTime(0,t); g.gain.linearRampToValueAtTime(.09,t+.015); g.gain.exponentialRampToValueAtTime(.0008,t+3.6);
      osc.connect(g); g.connect(bus); osc.start(t); osc.stop(t+3.8);
    }
    timers.push(setTimeout(campana, 2200 + Math.random()*4200));
  }
  function arrancar(){
    if(arrancado || !ctx) return;
    arrancado = true;
    var t = ctx.currentTime;
    master.gain.cancelScheduledValues(t); master.gain.setValueAtTime(master.gain.value, t);
    var r = rapido;
    master.gain.linearRampToValueAtTime(nivel(), t + (r ? 1 : 4));
    acorde(); rapido = false;
    timers.push(setTimeout(campana, r ? 1200 : 3500));
  }

  /* ---------- Encender / apagar ---------- */
  function esperarToque(){
    var f = function(){
      ['pointerdown','keydown','touchstart'].forEach(function(e){ document.removeEventListener(e,f,true); });
      if(!activo) return;
      if(aud){ aud.play().catch(function(){}); }
      else if(ctx){ ctx.resume(); }
    };
    ['pointerdown','keydown','touchstart'].forEach(function(e){ document.addEventListener(e,f,true); });
  }
  function encender(){
    activo = true; guardar('au_musica','1'); ui.classList.remove('nuevo'); pintar();
    if(ARCHIVO){
      if(!aud){ aud = new Audio(ARCHIVO); aud.loop = true; }
      aud.volume = vol * .35;
      var p = aud.play(); if(p && p.catch) p.catch(esperarToque);
      return;
    }
    if(!crear()) return;
    var r = ctx.resume(); if(r && r.catch) r.catch(function(){});
    if(ctx.state === 'running') arrancar(); else esperarToque();
  }
  function apagar(){
    activo = false; guardar('au_musica','0'); pintar();
    timers.forEach(clearTimeout); timers = [];
    if(aud){ aud.pause(); return; }
    if(ctx && master){
      var t = ctx.currentTime;
      master.gain.cancelScheduledValues(t); master.gain.setValueAtTime(master.gain.value, t);
      master.gain.linearRampToValueAtTime(0, t + 1.2);
      setTimeout(function(){ if(!activo && ctx){ try{ ctx.close(); }catch(e){} ctx = null; master = null; bus = null; arrancado = false; } }, 1500);
    }
  }
  btn.addEventListener('click',function(){ if(activo) apagar(); else encender(); });
  rng.addEventListener('input',function(){
    vol = rng.value/100; guardar('au_vol', vol);
    if(aud) aud.volume = vol * .35;
    if(ctx && master){ master.gain.setTargetAtTime(nivel(), ctx.currentTime, .2); }
  });

  pintar();
  if(leer('au_musica') === '1'){ rapido = true; encender(); }   /* continúa si ya la habías activado */
})();
