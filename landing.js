/* Landing do Conta Aí: simulador com pote de moedas, barra de vidro que se arrasta, balões do app, abas com seletor que desliza,
   frase com a data, paralaxe, fio de rolagem e animações que pausam fora da tela.
   Sem bibliotecas, sem rede e sem guardar nada: tudo roda e morre na própria página. */
(function () {
  'use strict';

  var reduzir = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $ = function (id) { return document.getElementById(id); };
  var brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
  var brl0 = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });

  /* ---------- balões: troca o texto com um "pop" ---------- */
  function dizer(bolha, texto) {
    if (!bolha) return;
    var s = bolha.querySelector('span');
    if (reduzir) { s.textContent = texto; bolha.classList.remove('fora'); return; }
    if (s.textContent === texto && !bolha.classList.contains('fora')) return;
    bolha.classList.add('fora');
    clearTimeout(bolha._t);
    bolha._t = setTimeout(function () { s.textContent = texto; bolha.classList.remove('fora'); }, 220);
  }
  function calar(bolha) { if (bolha) { clearTimeout(bolha._t); bolha.classList.add('fora'); } }

  /* ---------- 2. Simulador: a mesma conta do app, com pote de moedas e balão ---------- */
  function simulador() {
    var ids = ['renda', 'gastei', 'contas', 'guardar', 'dias'];
    var f = {};
    ids.forEach(function (k) { f[k] = { n: $('n-' + k), r: $('r-' + k) }; });
    if (!f.renda.n) return;
    var res = $('resultado'), valor = $('res-valor'), nota = $('res-nota'), sobra = $('res-sobra');
    var seg = $('divisao').children, bolha = $('bolha-sim');
    var pote = $('pote-moedas'), legenda = $('pote-legenda');
    var moedas = [];
    var inicial = {};
    var hoje = new Date();
    var restantes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0).getDate() - hoje.getDate() + 1;
    f.dias.n.value = f.dias.r.value = restantes;
    ids.forEach(function (k) { inicial[k] = f[k].n.value; });

    var exibido = null, raf = 0, ultimaFala = '';
    function ler(k) { var v = parseFloat(f[k].n.value); return isFinite(v) && v > 0 ? v : 0; }
    function mostrar(v) { valor.textContent = brl.format(v); }
    function animar(para) {
      cancelAnimationFrame(raf);
      if (reduzir || exibido === null) { exibido = para; mostrar(para); return; }
      var de = exibido, t0 = performance.now();
      (function passo(t) {
        var p = Math.min(1, (t - t0) / 320), e = 1 - Math.pow(1 - p, 3);
        exibido = de + (para - de) * e; mostrar(exibido);
        if (p < 1) raf = requestAnimationFrame(passo);
      })(t0);
    }
    /* o pote enche ou esvazia moeda a moeda; cada moeda vale R$ 10 (mais, se o dia for muito folgado) */
    function encher(n) {
      var comeco = moedas.length;
      while (moedas.length < n) {
        var i = moedas.length, c = document.createElement('i');
        c.className = 'moeda-p' + (reduzir ? '' : ' cai');
        c.style.bottom = (8 + i * 4) + 'px';
        c.style.setProperty('--dx', (((i * 37) % 11) - 5) + 'px');
        if (!reduzir) c.style.animationDelay = Math.min(900, (i - comeco) * 28) + 'ms';
        pote.appendChild(c); moedas.push(c);
      }
      while (moedas.length > n) {
        var s = moedas.pop();
        if (reduzir) { s.remove(); continue; }
        s.classList.remove('cai'); s.classList.add('sai');
        (function (x) { setTimeout(function () { x.remove(); }, 230); })(s);
      }
    }
    function fraseDoApp(livre, porDia) {
      if (livre < 0) return 'Opa, o mês fecha no vermelho.';
      if (porDia < 25) return 'Dia apertado. Vai com calma.';
      if (porDia < 80) return 'Dá para gastar sem susto hoje.';
      return 'Tranquilo! Hoje dá até para um agrado.';
    }
    function calcular() {
      var renda = ler('renda'), gastei = ler('gastei'), contas = ler('contas'), guardar = ler('guardar');
      var dias = Math.max(1, Math.round(ler('dias')));
      var livre = renda - gastei - contas - guardar;
      var porDia = livre / dias;
      var negativo = livre < 0;

      res.classList.toggle('negativo', negativo);
      document.querySelector('.res-rotulo').textContent = negativo ? 'Neste ritmo, faltam' : 'Você pode gastar por dia';
      animar(negativo ? -livre : porDia);
      nota.textContent = negativo
        ? 'até o fim do mês. Reduza gastos, contas ou a meta.'
        : 'nos próximos ' + dias + (dias === 1 ? ' dia' : ' dias') + ', contando hoje';
      sobra.textContent = negativo
        ? 'As contas e a meta passam da sua renda em ' + brl0.format(-livre) + '.'
        : 'Depois das contas e da meta, sobram ' + brl0.format(livre) + ' no mês.';

      var total = Math.max(renda, gastei + contas + guardar) || 1;
      var partes = [gastei, contas, guardar, Math.max(0, livre)];
      for (var i = 0; i < 4; i++) seg[i].style.width = (partes[i] / total * 100) + '%';
      $('l-gasto').textContent = brl0.format(gastei);
      $('l-contas').textContent = brl0.format(contas);
      $('l-guardar').textContent = brl0.format(guardar);
      $('l-livre').textContent = brl0.format(Math.max(0, livre));

      var unidade = porDia <= 300 ? 10 : Math.ceil(porDia / 30 / 10) * 10;
      encher(negativo || porDia < 1 ? 0 : Math.min(30, Math.max(1, Math.round(porDia / unidade))));
      legenda.textContent = 'Cada moeda vale ' + brl0.format(unidade);

      var fala = fraseDoApp(livre, porDia);
      if (fala !== ultimaFala) { ultimaFala = fala; dizer(bolha, fala); }
    }
    ids.forEach(function (k) {
      f[k].r.addEventListener('input', function () { f[k].n.value = f[k].r.value; calcular(); });
      f[k].n.addEventListener('input', function () { f[k].r.value = f[k].n.value; calcular(); });
    });
    $('sim-zerar').addEventListener('click', function () {
      ids.forEach(function (k) { f[k].n.value = f[k].r.value = inicial[k]; });
      calcular();
    });
    calcular();
  }

  /* ---------- 4. Para quem é: abas ---------- */
  function abas() {
    var botoes = Array.prototype.slice.call(document.querySelectorAll('.abas [role="tab"]'));
    if (!botoes.length) return;
    var grupo = botoes[0].parentElement;
    function abrir(botao, foco) {
      grupo.style.setProperty('--i', botoes.indexOf(botao));
      botoes.forEach(function (b) {
        var ativo = b === botao;
        b.setAttribute('aria-selected', ativo ? 'true' : 'false');
        b.tabIndex = ativo ? 0 : -1;
        $(b.getAttribute('aria-controls')).hidden = !ativo;
      });
      if (foco) botao.focus();
    }
    botoes.forEach(function (b, i) {
      b.addEventListener('click', function () { abrir(b, false); });
      b.addEventListener('keydown', function (e) {
        var d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
        if (d) { e.preventDefault(); abrir(botoes[(i + d + botoes.length) % botoes.length], true); }
      });
    });
  }

  /* ---------- 5. Frase com a data de hoje (só o relógio do navegador) ---------- */
  function agora() {
    var el = $('agora-texto');
    if (!el) return;
    var h = new Date();
    var ultimo = new Date(h.getFullYear(), h.getMonth() + 1, 0).getDate();
    var faltam = ultimo - h.getDate() + 1;
    el.textContent = faltam === 1
      ? 'Hoje é o último dia do mês. Quanto sobrou?'
      : 'Hoje é dia ' + h.getDate() + ' e faltam ' + faltam + ' dias de mês. Quanto vai sobrar?';
  }

  /* ---------- 7. Rolagem: fio dourado e paralaxe das moedas e balões ---------- */
  function rolagem() {
    var flut = Array.prototype.slice.call(document.querySelectorAll('.flut'));
    // o progresso vai só para quem o usa (nunca na raiz: isso reavalia o estilo da página inteira a cada quadro)
    var alvosP = [document.querySelector('.fio'), document.querySelector('.topo')].filter(Boolean);
    var secoes = [], vistos = [];
    flut.forEach(function (el) { var s = el.parentElement, i = secoes.indexOf(s); if (i < 0) { secoes.push(s); i = secoes.length - 1; } vistos.push(i); });
    var pendente = false;
    function quadro() {
      pendente = false;
      var max = document.documentElement.scrollHeight - window.innerHeight;
      var p = (max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0).toFixed(4);
      alvosP.forEach(function (a) { a.style.setProperty('--p', p); });
      if (reduzir) return;
      // leitura de todas as medidas primeiro, escrita depois: sem forçar layout a cada moeda
      var alt = window.innerHeight, rects = secoes.map(function (s) { return s.getBoundingClientRect(); });
      var py = flut.map(function (el, k) {
        var r = rects[vistos[k]];
        return (r.bottom < -200 || r.top > alt + 200) ? null : (r.top + r.height / 2 - alt / 2) * parseFloat(el.getAttribute('data-v'));
      });
      flut.forEach(function (el, k) { if (py[k] !== null) el.style.setProperty('--py', py[k].toFixed(1) + 'px'); });
    }
    function pedir() { if (!pendente) { pendente = true; requestAnimationFrame(quadro); } }
    window.addEventListener('scroll', pedir, { passive: true });
    window.addEventListener('resize', pedir);
    quadro();
  }

  /* ---------- 8. Balões que aparecem quando a seção entra na tela ---------- */
  function entradas() {
    var pops = Array.prototype.slice.call(document.querySelectorAll('.bolha.pop'));
    if (!('IntersectionObserver' in window)) return;
    if (!reduzir) pops.forEach(function (b) { b.classList.add('fora'); });
    var io = new IntersectionObserver(function (itens) {
      itens.forEach(function (it) {
        if (!it.isIntersecting) return;
        setTimeout(function () { it.target.classList.remove('fora'); }, 250);
        io.unobserve(it.target);
      });
    }, { threshold: 0.6 });
    pops.forEach(function (b) { io.observe(b); });
  }

  /* ---------- 9. Preço em conversa: o app responde as dúvidas; o valor sobe; as vantagens entram ---------- */
  function preco() {
    var chat = $('chat'), fio = $('chat-fio'), chips = $('chat-chips');
    var espera = function (ms) { return new Promise(function (ok) { setTimeout(ok, ms); }); };
    var R = {
      custa: { p: 'Quanto custa?', t: 'Os primeiros 30 dias são grátis. Depois, R$\u00a09,90 por mês.', cartao: true },
      dia: { p: 'E por dia?', t: 'R$\u00a00,33 por dia (R$\u00a09,90 ÷ 30). Menos que uma moeda de 50 centavos.' },
      gosto: { p: 'E se eu não gostar?', t: 'Cancele na Google Play antes de os 30 dias acabarem e você não paga nada.' },
      incluso: { p: 'O que está incluso?', t: 'Tudo: lançar por voz e foto de recibo, contas, metas, cartões, backup e atualizações. Sem limite de lançamentos.' },
      anuncio: { p: 'Tem anúncio?', t: 'Nenhum. Também não vendemos os seus dados: a assinatura é o que sustenta o app.' },
      cancelar: { p: 'Como eu cancelo?', t: 'Na própria Google Play, em Assinaturas. Sem ligar para ninguém.' },
      gratis: { p: 'Por que não é grátis?', t: 'Aplicativo grátis costuma viver de anúncio ou de dados dos usuários. O Conta Aí cobra uma assinatura pequena para continuar sem nenhum dos dois.' }
    };
    var run = 0, fila = Promise.resolve(), restantes = [];
    var duo = '<div class="duo"><div><small>Primeiros 30 dias</small><b>R$\u00a00,00</b></div><div><small>Depois</small><b>R$\u00a09,90/mês</b></div></div>';

    function rolar() { fio.scrollTop = fio.scrollHeight; }
    function msg(cls, html) { var d = document.createElement('div'); d.className = 'm ' + cls; d.innerHTML = html; fio.appendChild(d); rolar(); return d; }
    async function perguntar(k, meu) {
      var q = R[k];
      msg('eu', q.p);
      var d = msg('app', reduzir ? '' : '<span class="digitando" aria-hidden="true"><i></i><i></i><i></i></span>');
      if (!reduzir) await espera(900 + q.t.length * 8);
      if (meu !== run) return;
      d.innerHTML = q.t + (q.cartao ? duo : '');
      rolar();
    }
    function mostrarChips() {
      chips.innerHTML = '';
      if (!restantes.length) { chips.innerHTML = '<small>Era isso! Para perguntar de novo, recomece a conversa.</small>'; return; }
      restantes.forEach(function (k) {
        var b = document.createElement('button'); b.type = 'button'; b.textContent = R[k].p;
        b.addEventListener('click', function () {
          restantes = restantes.filter(function (x) { return x !== k; });
          var meu = run; chips.innerHTML = '';
          fila = fila.then(function () { return perguntar(k, meu); }).then(function () { if (meu === run) mostrarChips(); });
        });
        chips.appendChild(b);
      });
    }
    function iniciar() {
      ++run; fila = Promise.resolve();
      fio.innerHTML = ''; chips.innerHTML = '';
      restantes = ['dia', 'gosto', 'incluso', 'anuncio', 'cancelar', 'gratis'];
      msg('eu', R.custa.p);
      msg('app', R.custa.t + duo);
      mostrarChips();
    }
    if (chat && fio && chips) {
      $('chat-recomecar').addEventListener('click', iniciar);
      iniciar();
    }

    /* o 9,90 sobe contando e ganha um brilho dourado que passa uma vez */
    var num = $('preco-num');
    if (num && !reduzir && 'IntersectionObserver' in window) {
      num.textContent = '0,00';
      var ion = new IntersectionObserver(function (e) {
        if (!e[0].isIntersecting) return;
        ion.disconnect();
        var t0 = performance.now();
        (function passo(t) {
          var p = Math.min(1, (t - t0) / 800), k = 1 - Math.pow(1 - p, 3);
          num.textContent = (9.9 * k).toFixed(2).replace('.', ',');
          if (p < 1) requestAnimationFrame(passo); else num.classList.add('brilha');
        })(t0);
      }, { threshold: 0.6 });
      ion.observe(num);
    }

    /* as vantagens entram em cascata, com o "check" sendo desenhado */
    var lista = document.querySelector('.vantagens');
    if (lista && !reduzir && 'IntersectionObserver' in window) {
      lista.classList.add('prep');
      var iol = new IntersectionObserver(function (e) {
        if (e[0].isIntersecting) { lista.classList.add('entra'); iol.disconnect(); }
      }, { threshold: 0.25 });
      iol.observe(lista);
    }
  }

  /* ---------- 10. Experimente: a barra de vidro do app (apertar, arrastar, soltar com mola) ---------- */
  function vidro() {
    var barra = $('barra-vidro'), lente = $('lente'), nome = $('aba-atual');
    if (!barra || !lente) return;
    var botoes = Array.prototype.slice.call(barra.querySelectorAll('button'));
    var N = botoes.length, PAD = 4, W = 0, TAB = 0;
    function medir() { W = barra.offsetWidth; TAB = (W - PAD * 2) / N; }
    function centro(i) { return PAD + TAB * (i + 0.5); }
    function limita(v, a, b) { return Math.max(a, Math.min(b, v)); }
    medir();
    var aba = 1, preso = false, raf = 0, ultimo = 0, sob = 1;
    var x = { p: centro(aba), v: 0, t: centro(aba) }, s = { p: 1, v: 0, t: 1 };
    function mola(m, k, c, dt) { var a = -k * (m.p - m.t) - c * m.v; m.v += a * dt; m.p += m.v * dt; }
    /* passar das pontas estica como elástico */
    function alvo(px) {
      var min = centro(0), max = centro(N - 1);
      return px < min ? min - (min - px) * 0.3 : px > max ? max + (px - max) * 0.3 : px;
    }
    function maisPerto(px) { return limita(Math.round((px - PAD) / TAB - 0.5), 0, N - 1); }
    function desenhar() {
      var forca = limita((s.p - 1) / 0.24, 0, 1), vel = Math.abs(x.v);
      var sx = s.p * (1 + Math.min(vel / 1600, 0.5)), sy = s.p * (1 - Math.min(vel / 3200, 0.22));
      lente.style.transform = 'translateX(' + (x.p - TAB / 2 - PAD).toFixed(2) + 'px) scale(' + sx.toFixed(4) + ',' + sy.toFixed(4) + ')';
      lente.style.background = 'rgba(255,255,255,' + (0.4 - 0.3 * forca).toFixed(3) + ')';
      barra.style.transform = forca > 0.001 ? 'scale(' + (1 + 0.042 * forca).toFixed(4) + ')' : '';
      var perto = maisPerto(x.p);
      botoes.forEach(function (b, i) {
        var lupa = 1 + 0.3 * forca * Math.max(0, 1 - Math.abs(x.p - centro(i)) / (TAB * 0.9));
        b.style.color = i === perto ? '#0369a1' : '#0f172a';
        b.firstElementChild.style.transform = 'scale(' + (lupa * (i === perto && !preso ? 1.1 : 1)).toFixed(3) + ')';
      });
    }
    function quadro(t) {
      var dt = Math.min(0.032, Math.max(0.001, (t - ultimo) / 1000)); ultimo = t;
      if (preso) { mola(x, 900, 42, dt); mola(s, 420, 13, dt); } else { mola(x, 380, 20, dt); mola(s, 320, 10, dt); }
      desenhar();
      var parado = !preso && Math.abs(x.p - x.t) < 0.05 && Math.abs(x.v) < 1 && Math.abs(s.p - s.t) < 0.0005 && Math.abs(s.v) < 0.01;
      raf = parado ? 0 : requestAnimationFrame(quadro);
    }
    function mexer() {
      if (reduzir) { x.p = x.t; s.p = s.t; x.v = s.v = 0; desenhar(); return; }
      if (!raf) { ultimo = performance.now(); raf = requestAnimationFrame(quadro); }
    }
    function vibrar() { if (navigator.vibrate) try { navigator.vibrate(8); } catch (e) { /* sem vibração, tudo bem */ } }
    function escolher(i) {
      aba = i;
      botoes.forEach(function (b, k) { b.setAttribute('aria-selected', k === i ? 'true' : 'false'); b.tabIndex = k === i ? 0 : -1; });
      nome.textContent = botoes[i].textContent.trim();
    }
    function localX(e) { var r = barra.getBoundingClientRect(); return (e.clientX - r.left) * (W / r.width); }
    barra.addEventListener('pointerdown', function (e) {
      medir(); preso = true; sob = maisPerto(localX(e));
      try { barra.setPointerCapture(e.pointerId); } catch (err) { /* navegador antigo */ }
      x.t = alvo(localX(e)); s.t = 1.24; mexer();
    });
    barra.addEventListener('pointermove', function (e) {
      if (!preso) return;
      x.t = alvo(localX(e));
      var agoraSob = maisPerto(x.t);
      if (agoraSob !== sob) { sob = agoraSob; vibrar(); }
      mexer();
    });
    function soltar() {
      if (!preso) return;
      preso = false;
      var i = maisPerto(x.t);
      if (i !== aba) vibrar();
      escolher(i); x.t = centro(i); s.t = 1; mexer();
    }
    barra.addEventListener('pointerup', soltar);
    barra.addEventListener('pointercancel', soltar);
    barra.addEventListener('keydown', function (e) {
      var d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
      if (!d) return;
      e.preventDefault();
      var i = limita(aba + d, 0, N - 1);
      escolher(i); x.t = centro(i); botoes[i].focus(); mexer();
    });
    window.addEventListener('resize', function () { medir(); x.p = x.t = centro(aba); desenhar(); });
    desenhar();
  }

  /* ---------- 11. Animações contínuas pausam fora da tela; a conversa final entra ao aparecer ---------- */
  function pausas() {
    if (!('IntersectionObserver' in window)) return;
    var alvos = [document.querySelector('.heroi'), document.querySelector('.experimente'), $('bento')].filter(Boolean);
    var io = new IntersectionObserver(function (itens) {
      itens.forEach(function (it) { it.target.classList.toggle('parada', !it.isIntersecting); });
    }, { rootMargin: '80px 0px' });
    alvos.forEach(function (a) { io.observe(a); });

    var fim = document.querySelector('.conversa-final');
    if (fim && !reduzir) {
      fim.classList.add('prep');
      var iof = new IntersectionObserver(function (e) {
        if (e[0].isIntersecting) { fim.classList.add('entra'); iof.disconnect(); }
      }, { threshold: 0.5 });
      iof.observe(fim);
    }
  }

  simulador(); abas(); agora(); rolagem(); entradas(); preco(); vidro(); pausas();
})();
