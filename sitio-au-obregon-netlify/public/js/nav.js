/* Navegación sin recargar la página.
   Al cambiar de sección, solo se reemplaza el contenido; la música ambiental (que vive fuera de ese
   contenido) sigue sonando sin cortes. Si algo falla, o el sitio se abre con doble clic (file://),
   se usa la navegación normal del navegador. */
(function(){
  if(!window.fetch || !window.DOMParser || !window.URL || !history.pushState || !window.AU) return;
  if(location.protocol === 'file:') return;   /* fetch no funciona con file:// */

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var cache = {}, pos = {}, token = 0;
  try{ history.scrollRestoration = 'manual'; }catch(e){}

  function clave(u){ return u.pathname + u.search; }
  var actual = clave(location);

  /* Aviso para lectores de pantalla (no se borra al cambiar de página) */
  var anuncio = document.createElement('div');
  anuncio.className = 'sr-only'; anuncio.setAttribute('role','status'); anuncio.setAttribute('aria-live','polite');
  anuncio.setAttribute('data-persistir','');
  document.body.appendChild(anuncio);

  function esPagina(u){
    return u.origin === location.origin && (/\.html?$/.test(u.pathname) || /\/$/.test(u.pathname));
  }
  function elegible(a, e){
    if(!a || !a.href) return false;
    if(a.target && a.target !== '_self') return false;
    if(a.hasAttribute('download')) return false;
    if(e && (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey)) return false;
    var u = new URL(a.href, location.href);
    if(!esPagina(u)) return false;
    if(clave(u) === clave(location) && u.hash) return false;   /* ancla de la misma página: lo hace el navegador */
    return true;
  }

  function traer(url){
    var k = url.split('#')[0];
    if(cache[k]) return cache[k];
    cache[k] = fetch(k, { credentials: 'same-origin' }).then(function(r){
      var ct = r.headers.get('content-type') || '';
      if(!r.ok || ct.indexOf('text/html') < 0) throw new Error('no es una página');
      return r.text();
    }).catch(function(err){ delete cache[k]; throw err; });
    return cache[k];
  }

  function pausa(ms){ return new Promise(function(ok){ setTimeout(ok, ms); }); }

  function pintar(html, destino, empujar){
    var doc = new DOMParser().parseFromString(html, 'text/html');
    if(!doc.body || !doc.querySelector('nav')) throw new Error('página inesperada');

    /* Cabecera: título y metadatos */
    document.title = doc.title;
    ['meta[name="description"]','meta[property="og:title"]','meta[property="og:description"]','meta[property="og:url"]','link[rel="canonical"]']
      .forEach(function(sel){
        var n = doc.querySelector(sel), v = document.querySelector(sel);
        if(!n || !v) return;
        ['content','href'].forEach(function(at){ if(n.hasAttribute(at)) v.setAttribute(at, n.getAttribute(at)); });
      });

    /* Cuerpo: se quita lo anterior (menos la música y los avisos) y se pone lo nuevo */
    window.AU.destroy();
    var body = document.body;
    Array.prototype.slice.call(body.children).forEach(function(n){
      if(n.hasAttribute('data-persistir') || n.tagName === 'SCRIPT') return;
      n.remove();
    });
    Array.prototype.slice.call(body.attributes).forEach(function(a){ if(a.name.indexOf('data-') === 0) body.removeAttribute(a.name); });
    Array.prototype.slice.call(doc.body.attributes).forEach(function(a){ if(a.name.indexOf('data-') === 0) body.setAttribute(a.name, a.value); });
    body.style.overflow = '';

    var frag = document.createDocumentFragment();
    Array.prototype.slice.call(doc.body.children).forEach(function(n){
      if(n.tagName !== 'SCRIPT') frag.appendChild(document.importNode(n, true));
    });
    body.insertBefore(frag, body.firstChild);

    if(empujar) history.pushState(null, '', destino.href);
    actual = clave(destino);

    /* Scroll: arriba en navegación nueva; donde estabas al volver atrás */
    var root = document.documentElement;
    root.style.scrollBehavior = 'auto';
    window.scrollTo(0, empujar ? 0 : (pos[actual] || 0));
    window.AU.init();
    if(empujar && destino.hash.length > 1){
      var t = null; try{ t = document.getElementById(decodeURIComponent(destino.hash.slice(1))); }catch(e){}
      if(t) t.scrollIntoView();
    }
    root.style.scrollBehavior = '';

    anuncio.textContent = doc.title;
    if(!reduce){ root.classList.add('entrando'); setTimeout(function(){ root.classList.remove('entrando'); }, 600); }
  }

  function ir(destino, empujar){
    var mio = ++token, root = document.documentElement;
    pos[actual] = window.scrollY;
    root.classList.add('cambiando');
    Promise.all([ traer(destino.href), reduce ? null : pausa(230) ]).then(function(r){
      if(mio !== token) return;                  /* el usuario ya pidió otra página */
      pintar(r[0], destino, empujar);
      root.classList.remove('cambiando');
    }).catch(function(){
      if(mio !== token) return;
      root.classList.remove('cambiando');
      location.href = destino.href;              /* plan B: navegación normal */
    });
  }

  document.addEventListener('click', function(e){
    var a = e.target.closest ? e.target.closest('a') : null;
    if(!elegible(a, e)) return;
    var u = new URL(a.href, location.href);
    e.preventDefault();
    if(clave(u) === clave(location)){            /* misma página sin ancla: solo sube */
      window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
      return;
    }
    ir(u, true);
  });

  /* Botones atrás / adelante */
  window.addEventListener('popstate', function(){
    var u = new URL(location.href);
    if(clave(u) === actual) return;              /* solo cambió el # : el navegador se encarga */
    ir(u, false);
  });

  /* Precarga al pasar el cursor o tocar: la página ya está lista al hacer clic */
  function precargar(e){
    var a = e.target.closest ? e.target.closest('a') : null;
    if(!a || !elegible(a, null)) return;
    var u = new URL(a.href, location.href);
    if(clave(u) !== clave(location)) traer(u.href).catch(function(){});
  }
  document.addEventListener('mouseover', precargar);
  document.addEventListener('touchstart', precargar, { passive: true });
})();
