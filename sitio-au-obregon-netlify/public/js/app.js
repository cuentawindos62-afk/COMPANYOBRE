(function(){
  var $ = function(s,c){ return (c||document).querySelector(s); };
  var $$ = function(s,c){ return Array.prototype.slice.call((c||document).querySelectorAll(s)); };
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var puntero = window.matchMedia('(hover:hover)').matches;
  var CATS = [['amor','Amor'],['ausencia','Ausencia'],['tiempo','Tiempo'],['silencio','Silencio']];
  var ORDEN = CATS.map(function(c){ return c[0]; }), NOM = {};
  CATS.forEach(function(c){ NOM[c[0]] = c[1]; });
  var P = (window.POEMAS || []).filter(function(p){ return NOM[p.slug]; });
  P.forEach(function(p){ p.cat = NOM[p.slug]; p.pagina = p.slug + '.html'; p.cols = p.cols || ''; });
  P.sort(function(a,b){ return ORDEN.indexOf(a.slug) - ORDEN.indexOf(b.slug); });
  function rom(n){
    var m = [[1000,'M'],[900,'CM'],[500,'D'],[400,'CD'],[100,'C'],[90,'XC'],[50,'L'],[40,'XL'],[10,'X'],[9,'IX'],[5,'V'],[4,'IV'],[1,'I']], s = '';
    m.forEach(function(x){ while(n >= x[0]){ s += x[1]; n -= x[0]; } });
    return s;
  }
  /* ---------- Ciclo de vida: permite re-iniciar la página sin recargar (ver js/nav.js) ---------- */
  var limpiar = [], ultimoRaton = null;
  function on(t, ev, fn, op){ t.addEventListener(ev, fn, op); limpiar.push(function(){ t.removeEventListener(ev, fn, op); }); }
  function setHash(u){ try{ history.replaceState(null,'',u); }catch(e){} }
  function porId(id){ return P.filter(function(p){ return p.id === id; })[0]; }

  /* ---------- Me gusta (guardados en este navegador) ---------- */
  var LK = 'au_likes';
  function leerLikes(){ try{ return JSON.parse(localStorage.getItem(LK)) || {}; }catch(e){ return window.__auLikes || {}; } }
  function guardarLikes(o){ window.__auLikes = o; try{ localStorage.setItem(LK, JSON.stringify(o)); }catch(e){} }
  function meGusta(id){ return !!leerLikes()[id]; }
  /* Contador compartido (función de Netlify). Si no está disponible, se muestran solo los likes personales. */
  var API = '/api/likes';
  function visitante(){
    var v = ''; try{ v = localStorage.getItem('au_voter') || ''; }catch(e){}
    if(!v){
      v = (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : ('v' + Date.now().toString(36) + Math.random().toString(36).slice(2, 12));
      try{ localStorage.setItem('au_voter', v); }catch(e){}
    }
    return v;
  }
  function conteosGlobal(){ return window.__auConteos || null; }
  function cargarConteos(){
    if(location.protocol === 'file:' || !window.fetch) return;
    fetch(API, { cache: 'no-store' }).then(function(r){ if(!r.ok) throw 0; return r.json(); }).then(function(d){
      window.__auConteos = d.conteos || {};
      $$('.like').forEach(function(b){ pintarLike(b.dataset.id); });
    }).catch(function(){});
  }
  function enviarLike(id, valor){
    if(!conteosGlobal() || !window.fetch) return;
    fetch(API, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ poema: id, visitante: visitante(), like: valor }) })
      .then(function(r){ if(!r.ok) throw 0; return r.json(); })
      .then(function(d){ window.__auConteos[id] = d.total; pintarLike(id); }).catch(function(){});
  }
  function pintarLike(id){
    var on = meGusta(id), c = conteosGlobal(), n = c ? (c[id] || 0) : 0;
    $$('.like[data-id="' + id + '"]').forEach(function(b){
      b.classList.toggle('on', on); b.setAttribute('aria-pressed', on ? 'true' : 'false');
      b.setAttribute('aria-label', (on ? 'Quitar me gusta' : 'Me gusta') + (n ? ' (' + n + ')' : ''));
      var t = $('.lt', b); if(t) t.textContent = on ? 'Te gusta' : 'Me gusta';
      var q = $('.nl', b); if(q) q.textContent = n > 0 ? n.toLocaleString('es-MX') : '';
    });
  }
  function fijarLike(id, valor, quien){
    var o = leerLikes(), antes = !!o[id]; if(valor) o[id] = 1; else delete o[id]; guardarLikes(o);
    var c = conteosGlobal(); if(c && antes !== valor){ c[id] = Math.max(0, (c[id] || 0) + (valor ? 1 : -1)); }
    pintarLike(id);
    if(antes !== valor) enviarLike(id, valor);
    if(valor && quien){ quien.classList.remove('pop'); void quien.offsetWidth; quien.classList.add('pop'); }
  }
  function alternarLike(id, quien){ fijarLike(id, !meGusta(id), quien); }
  function corazonFlota(x, y){
    var h = document.createElement('div'); h.className = 'corazon-flota'; h.textContent = '\u2665';
    h.style.left = x + 'px'; h.style.top = y + 'px'; document.body.appendChild(h);
    setTimeout(function(){ if(h.parentNode) h.parentNode.removeChild(h); }, 1000);
  }
  var HEART = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-7.5-4.6-9.6-9.2C.9 8.4 2.7 4.5 6.4 4.5c2.1 0 3.8 1.1 5.6 3.2 1.8-2.1 3.5-3.2 5.6-3.2 3.7 0 5.5 3.9 4 7.3C19.5 16.4 12 21 12 21z"/></svg>';
  function botonLike(id, etiqueta){
    var b = document.createElement('button'); b.type = 'button'; b.className = 'like'; b.dataset.id = id;
    b.innerHTML = HEART + (etiqueta ? '<span class="lt"></span>' : '') + '<span class="nl"></span>';
    b.addEventListener('click', function(e){ e.stopPropagation(); alternarLike(id, b); });
    b.addEventListener('keydown', function(e){ e.stopPropagation(); });
    return b;
  }

  function init(){
  /* Contadores y tarjetas generadas desde js/poemas.js */
  $$('[data-cant]').forEach(function(el){ var n = P.filter(function(p){ return p.slug === el.dataset.cant; }).length; el.textContent = n + (n===1 ? ' poema' : ' poemas'); });
  $$('[data-total]').forEach(function(el){ el.textContent = P.length; });
  $$('[data-palabras]').forEach(function(el){ el.textContent = P.reduce(function(n,p){ return n + p.texto.split(/\s+/).filter(Boolean).length; }, 0).toLocaleString('es-MX'); });
  $$('[data-estrofas]').forEach(function(el){ el.textContent = P.reduce(function(n,p){ return n + p.texto.trim().split(/\n\s*\n/).length; }, 0); });
  var col = document.body.dataset.coleccion, muro = $('.muro');
  if(col && muro){
    var mios = P.filter(function(p){ return p.slug === col; });
    muro.innerHTML = '';
    mios.forEach(function(p){
      var a = document.createElement('article');
      a.className = 'poema hoja'; a.id = p.id; a.dataset.titulo = p.titulo; a.tabIndex = 0; a.setAttribute('role','button');
      a.innerHTML = '<div class="top"><span class="n"></span><span class="c"></span></div><h2></h2><div class="orn"></div><div class="texto"></div>' +
        '<div class="pie"><span class="firma">Au_Obregón</span><span class="leer">leer</span></div>';
      $('.n',a).textContent = rom(P.indexOf(p) + 1); $('.c',a).textContent = p.cat;
      $('h2',a).textContent = p.titulo; $('.texto',a).textContent = p.texto;
      $('.pie',a).insertBefore(botonLike(p.id, false), $('.leer',a));
      muro.appendChild(a);
    });
    var cc = $('#cuentaCat'); if(cc) cc.textContent = mios.length + (mios.length===1 ? ' poema' : ' poemas');
  }
  $$('.like').forEach(function(b){ pintarLike(b.dataset.id); });
  cargarConteos();
  /* ---------- Menú móvil ---------- */
  var bur = $('#burger'), links = $('#links');
  if(bur){ bur.addEventListener('click',function(){ var a = links.classList.toggle('abierto'); bur.textContent = a ? '×' : '☰'; }); }

  /* ---------- Polvo dorado ---------- */
  var cv = $('#polvo');
  if(cv){
    var cx = cv.getContext('2d'), W, H, ps = [], rafP = 0;
    var medir = function(){ W = cv.width = innerWidth; H = cv.height = innerHeight; };
    var crear = function(){ ps = []; var n = innerWidth < 700 ? 36 : 70;
      for(var i=0;i<n;i++) ps.push({x:Math.random()*W,y:Math.random()*H,r:Math.random()*1.5+.4,v:Math.random()*.28+.08,a:Math.random()*.5+.15,ph:Math.random()*6.28}); };
    var polvo = function(t){
      cx.clearRect(0,0,W,H);
      for(var i=0;i<ps.length;i++){
        var p = ps[i]; p.y -= p.v; p.x += Math.sin(t/2200 + p.ph)*.22;
        if(p.y < -8){ p.y = H + 8; p.x = Math.random()*W; }
        var al = p.a*(.6+.4*Math.sin(t/950+p.ph));
        cx.beginPath(); cx.arc(p.x,p.y,p.r*4,0,6.283); cx.fillStyle = 'rgba(230,190,120,' + (al*.1) + ')'; cx.fill();
        cx.beginPath(); cx.arc(p.x,p.y,p.r,0,6.283); cx.fillStyle = 'rgba(240,210,150,' + al + ')'; cx.fill();
      }
      rafP = requestAnimationFrame(polvo);
    };
    medir(); crear();
    if(!reduce) rafP = requestAnimationFrame(polvo);
    on(window,'resize',function(){ medir(); crear(); });
    on(document,'visibilitychange',function(){ if(reduce) return; if(document.hidden) cancelAnimationFrame(rafP); else rafP = requestAnimationFrame(polvo); });
    limpiar.push(function(){ cancelAnimationFrame(rafP); });
  }
  var luz = $('#luz');
  if(luz && puntero){
    var moverLuz = function(x,y){ luz.style.transform = 'translate(' + (x-260) + 'px,' + (y-260) + 'px)'; };
    if(ultimoRaton) moverLuz(ultimoRaton[0], ultimoRaton[1]);
    on(window,'mousemove',function(e){ ultimoRaton = [e.clientX, e.clientY]; moverLuz(e.clientX, e.clientY); });
  }

  /* ---------- Scroll: barra, menú, parallax ---------- */
  var nav = $('#nav'), prog = $('#progreso'), heroin = $('#heroin'), ultimo = 0, tick = false;
  function alScroll(){
    var y = window.scrollY, h = document.documentElement.scrollHeight - innerHeight;
    if(prog) prog.style.width = (h > 0 ? (y/h*100) : 0) + '%';
    if(nav){ nav.classList.toggle('fondo', y > 40); nav.classList.toggle('oculta', y > 240 && y > ultimo && !(links && links.classList.contains('abierto'))); }
    ultimo = y;
    if(heroin && !reduce && y < innerHeight){ heroin.style.transform = 'translateY(' + (y*.22) + 'px)'; heroin.style.opacity = Math.max(0, 1 - y/(innerHeight*.85)); }
    tick = false;
  }
  on(window,'scroll',function(){ if(!tick){ tick = true; requestAnimationFrame(alScroll); } },{passive:true});
  alScroll();

  /* ---------- Aparecer al hacer scroll ---------- */
  var io = new IntersectionObserver(function(es){
    es.forEach(function(e){ if(e.isIntersecting){ e.target.classList.add('visible'); io.unobserve(e.target); } });
  },{threshold:.06});
  limpiar.push(function(){ io.disconnect(); });
  $$('.poema,.catcard').forEach(function(a,i){ a.style.transitionDelay = ((i%3)*0.08) + 's'; io.observe(a); });
  if(puntero && !reduce){
    $$('.poema').forEach(function(a){
      a.addEventListener('mousemove',function(e){
        var r = a.getBoundingClientRect(), x = (e.clientX-r.left)/r.width, y = (e.clientY-r.top)/r.height;
        a.style.setProperty('--ry',((x-.5)*7)+'deg'); a.style.setProperty('--rx',((.5-y)*7)+'deg');
        a.style.setProperty('--mx',(x*100)+'%'); a.style.setProperty('--my',(y*100)+'%');
      });
      a.addEventListener('mouseleave',function(){ a.style.setProperty('--rx','0deg'); a.style.setProperty('--ry','0deg'); a.style.transitionDelay='0s'; });
    });
  }

  /* ---------- Versos rotativos ---------- */
  var vs = $$('#versos span'), vi = 0;
  if(vs.length){ vs[0].classList.add('on'); var ivV = setInterval(function(){ vs[vi].classList.remove('on'); vi = (vi+1)%vs.length; vs[vi].classList.add('on'); }, 5200); limpiar.push(function(){ clearInterval(ivV); }); }

  /* ---------- Cinta de títulos ---------- */
  var cinta = $('#cinta');
  if(cinta){ var html = ''; for(var k=0;k<2;k++){ P.forEach(function(p){ html += '<span>' + p.titulo + '</span><span class="r">◆</span>'; }); } cinta.innerHTML = html; }

  /* ---------- Lector ---------- */
  var lector = $('#lector'), pagina = $('#pagina'), cur = null, lista = P, fs = 1.3;
  try{ var g = parseFloat(localStorage.getItem('au_fs')); if(g >= 1 && g <= 1.8) fs = g; }catch(e){}
  var fx = $('#fx'), fc = fx ? fx.getContext('2d') : null, rafF = 0;
  function lluviaOn(){
    if(reduce || !fc) return;
    fx.width = innerWidth; fx.height = innerHeight;
    var gotas = []; for(var i=0;i<170;i++) gotas.push({x:Math.random()*fx.width,y:Math.random()*fx.height,l:10+Math.random()*18,v:9+Math.random()*9});
    (function loop(){
      fc.clearRect(0,0,fx.width,fx.height); fc.strokeStyle = 'rgba(190,210,230,.4)'; fc.lineWidth = 1; fc.beginPath();
      for(var i=0;i<gotas.length;i++){ var d = gotas[i]; fc.moveTo(d.x,d.y); fc.lineTo(d.x - d.l*.18, d.y + d.l); d.y += d.v; d.x -= d.v*.18;
        if(d.y > fx.height){ d.y = -20; d.x = Math.random()*fx.width + 40; } }
      fc.stroke(); rafF = requestAnimationFrame(loop);
    })();
  }
  limpiar.push(function(){ cancelAnimationFrame(rafF); });
  function lluviaOff(){ cancelAnimationFrame(rafF); if(fc) fc.clearRect(0,0,fx.width,fx.height); }
  function estrofas(t){
    return t.trim().split(/\n\s*\n/).map(function(b,i){
      var p = document.createElement('p'); p.className = 'est'; p.style.setProperty('--d', (Math.min(i,14)*0.11 + 0.35) + 's');
      b.split('\n').forEach(function(l,j){ if(j) p.appendChild(document.createElement('br')); p.appendChild(document.createTextNode(l.trim())); });
      return p;
    });
  }
  function pinUrl(p){
    var pag = new URL(p.pagina, location.href);
    var base = pag.origin + pag.pathname;
    return 'https://www.pinterest.com/pin/create/button/?url=' + encodeURIComponent(base + '#' + p.id) +
      '&media=' + encodeURIComponent(new URL('img/' + p.id + '.jpg', location.href).href) +
      '&description=' + encodeURIComponent(p.titulo + ' · poema de Au_Obregón');
  }
  function abrir(id, contexto){
    var p = typeof id === 'string' ? porId(id) : id; if(!p || !lector) return;
    cur = p;
    lista = contexto || lista;
    if(lista.indexOf(p) < 0) lista = P;
    var cols = p.cols || (p.texto.split('\n').length > 28 ? 'dos' : '');
    var mins = Math.max(1, Math.round(p.texto.split(/\s+/).length / 190));
    pagina.className = 'pagina hoja ' + (cols==='tres' ? 'tres' : '');
    pagina.style.setProperty('--fs', fs + 'rem');
    pagina.innerHTML = '<div class="cat"></div><h2></h2><div class="orn"></div><div class="texto ' + cols + '"></div>' +
      '<span class="firma">Au_Obregón</span><div class="sello">AO</div><div class="meta"></div>' +
      '<div class="derechos">© Au_Obregón · Todos los derechos reservados · <a href="derechos-de-autor.html">Derechos de autor</a></div>' +
      '<div class="acciones"><span id="likeSlot"></span><a class="btn pin" target="_blank" rel="noopener">Guardar en Pinterest</a><button class="btn sec" id="compartir" type="button">Compartir</button><button class="btn sec" id="copiar" type="button">Copiar enlace</button></div>';
    var lb = botonLike(p.id, true); lb.classList.add('btn','sec'); $('#likeSlot',pagina).replaceWith(lb); pintarLike(p.id);
    $('.cat',pagina).textContent = p.cat;
    $('h2',pagina).textContent = p.titulo;
    $('.meta',pagina).textContent = 'lectura de ' + mins + (mins===1 ? ' minuto' : ' minutos');
    var tx = $('.texto',pagina); estrofas(p.texto).forEach(function(e){ tx.appendChild(e); });
    $('.pin',pagina).href = pinUrl(p);
    var bComp = $('#compartir',pagina);
    if(navigator.share){
      bComp.onclick = function(){
        var pag = new URL(p.pagina, location.href);
        navigator.share({ title: p.titulo + ' · Au_Obregón', text: p.titulo + ' · poema de Au_Obregón', url: pag.origin + pag.pathname + '#' + p.id }).catch(function(){});
      };
    } else { bComp.remove(); }
    $('#copiar',pagina).onclick = function(){
      var pag = new URL(p.pagina, location.href), url = pag.origin + pag.pathname + '#' + p.id;
      if(navigator.clipboard){ navigator.clipboard.writeText(url).then(function(){ $('#copiar').textContent = 'Enlace copiado'; }); }
    };
    lluviaOff();
    lector.setAttribute('data-fx', p.id==='una-vela' ? 'vela' : '');
    if(p.id === 'lluvia') lluviaOn();
    lector.classList.add('abierto'); lector.scrollTop = 0; document.body.style.overflow = 'hidden';
    setHash('#' + p.id);
  }
  function cerrar(){
    lector.classList.remove('abierto'); lluviaOff(); lector.removeAttribute('data-fx');
    document.body.style.overflow = ''; $('#lprog').style.width = '0';
    setHash(location.pathname);
  }
  function vecino(d){ var i = lista.indexOf(cur); return lista[(i + d + lista.length) % lista.length]; }
  function tam(d){ fs = Math.min(1.8, Math.max(1, fs + d)); pagina.style.setProperty('--fs', fs + 'rem'); try{ localStorage.setItem('au_fs', fs); }catch(e){} }

  if(lector){
    $('#cerrar').addEventListener('click',cerrar);
    $('#ant').addEventListener('click',function(){ abrir(vecino(-1)); });
    $('#sig').addEventListener('click',function(){ abrir(vecino(1)); });
    $('#mas').addEventListener('click',function(){ tam(.1); });
    $('#menos').addEventListener('click',function(){ tam(-.1); });
    lector.addEventListener('click',function(e){ if(e.target === lector) cerrar(); });
    pagina.addEventListener('dblclick',function(e){
      if(!cur || e.target.closest('a,button')) return;
      try{ window.getSelection().removeAllRanges(); }catch(x){}
      corazonFlota(e.clientX, e.clientY);
      fijarLike(cur.id, true, $('.like', pagina));
    });
    lector.addEventListener('scroll',function(){ var h = lector.scrollHeight - lector.clientHeight; $('#lprog').style.width = (h > 0 ? lector.scrollTop/h*100 : 0) + '%'; });
    on(document,'keydown',function(e){
      if(!lector.classList.contains('abierto')) return;
      if(e.key === 'Escape') cerrar();
      if(e.key === 'ArrowRight') abrir(vecino(1));
      if(e.key === 'ArrowLeft') abrir(vecino(-1));
    });
  }

  /* ---------- Página de colección ---------- */
  var arts = $$('article.poema');
  if(arts.length){
    var ctx = arts.map(function(a){ return porId(a.id); }).filter(Boolean);
    arts.forEach(function(a){
      a.addEventListener('click',function(){ abrir(a.id, ctx); });
      a.addEventListener('keydown',function(e){ if(e.target !== a) return; if(e.key==='Enter'||e.key===' '){ e.preventDefault(); abrir(a.id, ctx); } });
    });
    var q = $('#q');
    if(q) q.addEventListener('input',function(){
      var t = q.value.trim().toLowerCase(), n = 0;
      arts.forEach(function(a){
        var ok = !t || a.dataset.titulo.toLowerCase().indexOf(t) > -1 || a.textContent.toLowerCase().indexOf(t) > -1;
        a.style.display = ok ? '' : 'none'; if(ok){ n++; a.classList.add('visible'); }
      });
      $('#vacio').style.display = n ? 'none' : 'block';
    });
    var h = location.hash.slice(1);
    if(h && porId(h)) abrir(h, ctx);
  }

  /* ---------- Inicio: poema de hoy y tablero ---------- */
  var hh = $('#hoyHoja');
  if(hh && P.length){
    var n = new Date(), dia = Math.floor((n - new Date(n.getFullYear(),0,0))/864e5), hoy = P[dia % P.length];
    var est = hoy.texto.trim().split(/\n\s*\n/).slice(0,2).join('\n\n');
    hh.innerHTML = '<h3></h3><div class="orn"></div><div class="ext"></div>';
    $('h3',hh).textContent = hoy.titulo; $('.ext',hh).textContent = est;
    $('#hoyTitulo').textContent = hoy.titulo;
    $('#hoyFecha').textContent = n.toLocaleDateString('es-MX',{weekday:'long',day:'numeric',month:'long'});
    var go = function(e){ if(e) e.preventDefault(); abrir(hoy, P); };
    $('#hoyBtn').addEventListener('click',go); hh.addEventListener('click',go);
    hh.addEventListener('keydown',function(e){ if(e.key==='Enter') go(e); });
  }
  var tb = $('#tablero');
  if(tb && P.length){
    var giros = [-7,4,-3,6,-5];
    for(var i=0;i<5;i++){
      (function(i){
        var p = P[(i*2 + 1) % P.length];
        var m = document.createElement('div'); m.className = 'mini hoja'; m.tabIndex = 0; m.setAttribute('role','button');
        m.style.transform = 'rotate(' + giros[i] + 'deg) translateY(' + ((i%2)*14) + 'px)'; m.style.zIndex = i;
        m.innerHTML = '<h4></h4><i></i><p></p>';
        $('h4',m).textContent = p.titulo;
        $('p',m).textContent = p.texto.trim().split('\n').filter(function(l){ return l.trim(); }).slice(0,5).join('\n');
        m.addEventListener('click',function(){ abrir(p, P); });
        m.addEventListener('keydown',function(e){ if(e.key==='Enter') abrir(p, P); });
        tb.appendChild(m);
      })(i);
    }
  }
  }

  function destroy(){ limpiar.forEach(function(f){ f(); }); limpiar = []; }
  window.AU = { init: init, destroy: destroy };
  init();
})();
