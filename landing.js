/* Landing do Conta Aí: demonstração da voz, simulador com pote de moedas, balões do app, tela que muda com a rolagem,
   abas, frase com a data, inclinação do celular, paralaxe e fio de rolagem.
   Sem bibliotecas, sem rede e sem guardar nada: tudo roda e morre na própria página. */
(function () {
  'use strict';

  var reduzir = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var ponteiroFino = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
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

  /* ---------- 1. Demonstração: o app entendendo uma frase ---------- */
  function demo() {
    var raiz = $('demo');
    if (!raiz || reduzir) return; // sem movimento, a página já traz o quadro final desenhado

    var cenaFalar = $('cena-falar'), cenaInicio = $('cena-inicio');
    var fala = $('fala-texto'), linhaMic = $('mic-linha'), estado = $('mic-estado');
    var itens = Array.prototype.slice.call($('itens').children);
    var registrar = $('registrar'), aviso = $('aviso-ok');
    var lanc = Array.prototype.slice.call($('lanc').children);
    var valor = $('hoje-valor'), barra = $('hoje-barra'), nota = $('hoje-nota');
    var bolha = $('bolha-demo');
    var frase = '30 de gasolina, 12 de pão e 25 de sorvete'.split(' ');
    var visivel = true;

    new IntersectionObserver(function (e) { visivel = e[0].isIntersecting; }, { threshold: 0.2 }).observe(raiz);

    function pausa(ms) {
      return new Promise(function (ok) {
        (function volta(resta) {
          if (!visivel || document.hidden) return setTimeout(function () { volta(resta); }, 250);
          if (resta <= 0) return ok();
          setTimeout(function () { volta(resta - 100); }, Math.min(100, resta));
        })(ms);
      });
    }
    function contar(el, de, ate, ms) {
      var t0 = performance.now();
      (function passo(t) {
        var p = Math.min(1, (t - t0) / ms), e = 1 - Math.pow(1 - p, 3);
        el.textContent = brl.format(de + (ate - de) * e);
        if (p < 1) requestAnimationFrame(passo);
      })(t0);
    }
    function zerar() {
      cenaInicio.classList.remove('ativa'); cenaFalar.classList.add('ativa');
      fala.textContent = ''; linhaMic.classList.remove('ouvindo'); estado.textContent = 'Toque e fale';
      itens.forEach(function (li) { li.classList.remove('entrou'); });
      registrar.classList.remove('entrou', 'toque'); aviso.classList.remove('entrou');
      lanc.forEach(function (li) { li.classList.remove('entrou'); });
      valor.textContent = brl.format(120); barra.style.width = '100%'; nota.textContent = 'Você ainda não gastou hoje';
      calar(bolha);
    }

    async function ciclo() {
      for (;;) {
        zerar();
        await pausa(900);
        linhaMic.classList.add('ouvindo'); estado.textContent = 'Ouvindo…';
        dizer(bolha, 'Pode falar, tô ouvindo.');
        await pausa(500);
        for (var i = 0; i < frase.length; i++) {
          fala.textContent += (i ? ' ' : '') + frase[i];
          await pausa(210);
        }
        linhaMic.classList.remove('ouvindo'); estado.textContent = 'Entendi 3 gastos';
        dizer(bolha, 'Entendi três gastos. Confere aí.');
        await pausa(350);
        for (var j = 0; j < itens.length; j++) { itens[j].classList.add('entrou'); await pausa(380); }
        registrar.classList.add('entrou');
        await pausa(1100);
        registrar.classList.add('toque'); await pausa(180); registrar.classList.remove('toque');
        await pausa(250);
        cenaFalar.classList.remove('ativa'); cenaInicio.classList.add('ativa');
        await pausa(500);
        aviso.classList.add('entrou');
        for (var k = 0; k < lanc.length; k++) { lanc[k].classList.add('entrou'); await pausa(160); }
        nota.textContent = 'Dos R$ 120,00 do dia, já foram R$ 67,00';
        barra.style.width = '44.17%';
        contar(valor, 120, 53, 1100);
        await pausa(900);
        dizer(bolha, 'Pronto! Hoje ainda dá R$ 53,00.');
        await pausa(3600);
      }
    }
    ciclo();
  }

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

  /* ---------- 3. Recursos: a tela e o balão acompanham o bloco que está no centro ---------- */
  function historia() {
    var blocos = Array.prototype.slice.call(document.querySelectorAll('.bloco'));
    var telas = Array.prototype.slice.call(document.querySelectorAll('.historia-fone img'));
    var bolha = $('bolha-hist');
    if (!blocos.length || !('IntersectionObserver' in window)) return;
    var io = new IntersectionObserver(function (itens) {
      itens.forEach(function (it) {
        if (!it.isIntersecting) return;
        var n = it.target.getAttribute('data-tela');
        blocos.forEach(function (b) { b.classList.toggle('ativo', b === it.target); });
        telas.forEach(function (t) { t.classList.toggle('ativa', t.getAttribute('data-tela') === n); });
        dizer(bolha, it.target.getAttribute('data-fala'));
      });
    }, { rootMargin: '-45% 0px -45% 0px' });
    blocos.forEach(function (b) { io.observe(b); });
  }

  /* ---------- 4. Para quem é: abas ---------- */
  function abas() {
    var botoes = Array.prototype.slice.call(document.querySelectorAll('.abas [role="tab"]'));
    if (!botoes.length) return;
    function abrir(botao, foco) {
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

  /* ---------- 6. Celular que inclina com o mouse ---------- */
  function inclinar(area, alvo, gx, gy) {
    if (reduzir || !ponteiroFino || !area || !alvo) return;
    area.addEventListener('pointermove', function (e) {
      var r = area.getBoundingClientRect();
      var x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
      alvo.style.setProperty('--ry', (x * gx).toFixed(2) + 'deg');
      alvo.style.setProperty('--rx', (-y * gy).toFixed(2) + 'deg');
    });
    area.addEventListener('pointerleave', function () {
      alvo.style.setProperty('--ry', '0deg'); alvo.style.setProperty('--rx', '0deg');
    });
  }

  /* ---------- 7. Rolagem: fio dourado e paralaxe das moedas e balões ---------- */
  function rolagem() {
    var flut = Array.prototype.slice.call(document.querySelectorAll('.flut'));
    var raiz = document.documentElement, pendente = false;
    function quadro() {
      pendente = false;
      var max = raiz.scrollHeight - window.innerHeight;
      raiz.style.setProperty('--p', (max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0).toFixed(4));
      if (reduzir) return;
      flut.forEach(function (el) {
        var sec = el.parentElement.getBoundingClientRect();
        if (sec.bottom < -200 || sec.top > window.innerHeight + 200) return;
        var py = (sec.top + sec.height / 2 - window.innerHeight / 2) * parseFloat(el.getAttribute('data-v'));
        el.style.setProperty('--py', py.toFixed(1) + 'px');
      });
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
    var run = 0, fila = Promise.resolve(), restantes = [], comecou = false;

    function rolar() { fio.scrollTop = fio.scrollHeight; }
    function msg(cls, html) { var d = document.createElement('div'); d.className = 'm ' + cls; d.innerHTML = html; fio.appendChild(d); rolar(); return d; }
    async function perguntar(k, meu) {
      var q = R[k];
      msg('eu', q.p);
      var d = msg('app', reduzir ? '' : '<span class="digitando" aria-hidden="true"><i></i><i></i><i></i></span>');
      if (!reduzir) await espera(900 + q.t.length * 8);
      if (meu !== run) return;
      d.innerHTML = q.t + (q.cartao ? '<div class="duo"><div><small>Primeiros 30 dias</small><b>R$\u00a00,00</b></div><div><small>Depois</small><b>R$\u00a09,90/mês</b></div></div>' : '');
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
    async function iniciar() {
      var meu = ++run; fila = Promise.resolve();
      fio.innerHTML = ''; chips.innerHTML = '';
      restantes = ['gosto', 'incluso', 'anuncio', 'cancelar', 'gratis'];
      if (!reduzir) await espera(600); if (meu !== run) return;
      await perguntar('custa', meu); if (meu !== run) return;
      if (!reduzir) await espera(900); if (meu !== run) return;
      await perguntar('dia', meu); if (meu !== run) return;
      mostrarChips();
    }
    if (chat && fio && chips) {
      $('chat-recomecar').addEventListener('click', function () { comecou = true; iniciar(); });
      if (!('IntersectionObserver' in window)) { iniciar(); }
      else {
        var ioc = new IntersectionObserver(function (e) {
          if (e[0].isIntersecting && !comecou) { comecou = true; ioc.disconnect(); iniciar(); }
        }, { threshold: 0.4 });
        ioc.observe(chat);
      }
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

  demo(); simulador(); historia(); abas(); agora(); rolagem(); entradas(); preco();
  inclinar(document.querySelector('.heroi'), document.querySelector('.fone'), 14, 10);
  inclinar($('recursos'), document.querySelector('.historia-fone .celular'), 10, 8);
})();
