/* Tela de revelação (telão) — página independente (telao.html).
   Roda numa aba/janela separada, projetada no telão, lendo direto do
   Supabase. Assim o painel do admin nunca aparece na projeção.

   Fluxo: escolher categoria → revelar 3º, 2º e 1º com suspense e som →
   classificação final até o 5º lugar, com destaque ao pódio. */
'use strict';

var Telao = (function () {
  var esc = UI.esc;
  var rank = [], podium = [], step = 0, cat = null, drumTimer = null;

  function body() { return document.getElementById('telao-body'); }

  function tela(conteudo) {
    body().innerHTML = '<div class="telao">' + toolbar() + conteudo + '</div>';
  }

  function toolbar() {
    var somIcon = Sound.estaMudo() ? 'ti-volume-off' : 'ti-volume';
    var fsIcon = document.fullscreenElement ? 'ti-minimize' : 'ti-maximize';
    return '<div class="telao-tools">' +
      '<button class="telao-tool" data-shot aria-label="Salvar imagem da tela"><i class="ti ti-camera" aria-hidden="true"></i></button>' +
      '<button class="telao-tool" data-fs aria-label="Alternar tela cheia"><i class="ti ' + fsIcon + '" aria-hidden="true"></i></button>' +
      '<button class="telao-tool" data-mudo aria-label="Ativar ou desativar som"><i class="ti ' + somIcon + '" aria-hidden="true"></i></button>' +
      '</div>';
  }

  function alternarTelaCheia() {
    if (document.fullscreenElement) document.exitFullscreen();
    else document.documentElement.requestFullscreen();
  }

  /* Baixa um PNG da tela atual (html2canvas via CDN, carregado no telao.html) */
  function capturarTela(btn) {
    if (typeof html2canvas !== 'function') { alert('Captura indisponível (sem internet?).'); return; }
    var tools = document.querySelector('.telao-tools');
    if (tools) tools.style.visibility = 'hidden'; // botões fora da foto
    html2canvas(document.body, { backgroundColor: '#0D1117' }).then(function (canvas) {
      if (tools) tools.style.visibility = '';
      var a = document.createElement('a');
      a.download = 'hackscore-telao-' + (cat ? cat + '-' : '') + Date.now() + '.png';
      a.href = canvas.toDataURL('image/png');
      a.click();
    }).catch(function () {
      if (tools) tools.style.visibility = '';
    });
  }

  function catChip(extra) {
    return '<div class="telao-cat ' + CATS[cat].tc + '">' + CATS[cat].label + (extra || '') + '</div>';
  }

  function pontos(item) {
    return item.media !== null ? item.media.toFixed(1) + ' pts' : 'sem avaliação';
  }

  /* ── Seleção de categoria (tela inicial da projeção) ── */
  function renderPicker() {
    cat = null;
    pararDrum();
    Sound.pararRufar();
    var opcoes = CAT_KEYS.map(function (k) {
      return '<button class="telao-btn telao-pick" data-cat="' + k + '">' + CATS[k].full + '</button>';
    }).join('');
    body().innerHTML = '<div class="telao">' + toolbar() +
      '<div class="telao-name telao-title">Revelação</div>' +
      '<div class="telao-pts">Escolha a categoria para revelar</div>' +
      '<div class="telao-pick-wrap">' + opcoes + '</div></div>';
  }

  async function escolherCategoria(sel) {
    Sound.ativar(); // destrava o áudio neste gesto do usuário
    cat = sel;
    try {
      await Store.sync();
    } catch (e) {
      tela('<div class="telao-name telao-title">Erro</div><div class="telao-pts">' + esc(e.message) + '</div>' +
        '<button class="telao-btn telao-mt" data-voltar>Voltar</button>');
      return;
    }
    rank = Store.ranking(cat);
    podium = rank.slice(0, 3); // os 3 primeiros são revelados com suspense
    step = 0;
    renderIntro();
  }

  function renderIntro() {
    if (!rank.length) {
      tela(catChip() + '<div class="telao-name telao-title">Sem equipes</div>' +
        '<div class="telao-pts">Nenhuma equipe nessa categoria.</div>' +
        '<button class="telao-btn telao-mt" data-voltar>Outra categoria</button>');
      return;
    }
    tela(catChip() +
      '<div class="telao-name telao-title">Resultados</div>' +
      '<div class="telao-pts">' + rank.length + ' equipe(s) — vamos ao pódio!</div>' +
      '<button class="telao-btn" data-next><i class="ti ti-player-play" aria-hidden="true"></i> Iniciar revelação</button>');
  }

  /* step 1 revela podium[len-1] (3º), ..., step len revela podium[0] (campeão) */
  function avancar() {
    Sound.ativar();
    step++;
    if (step > podium.length) { renderClassificacao(); return; }
    var item = podium[podium.length - step];
    var isWinner = (step === podium.length);
    runDrum(item.pos, isWinner, function () {
      isWinner ? renderCampeao(item) : renderColocado(item);
    });
  }

  function renderColocado(item) {
    Sound.impacto();
    tela(catChip() +
      '<div class="telao-place reveal-pop">' + item.pos + 'º</div>' +
      '<div class="telao-name reveal-pop">' + esc(item.eq.nome) + '</div>' +
      '<div class="telao-score-big">' + pontos(item) + '</div>' +
      '<button class="telao-btn telao-mt" data-next>Próximo <i class="ti ti-arrow-right" aria-hidden="true"></i></button>');
  }

  /* Clímax: flash branco → impacto grave → nome com zoom-pop → fanfarra + confete */
  function renderCampeao(item) {
    Sound.impacto();
    tela('<div class="telao-flash"></div>' +
      '<div class="confetti-layer" id="conf-layer"></div>' +
      catChip() +
      '<div class="telao-champion-label reveal-pop">Campeão</div>' +
      '<div class="telao-trophy reveal-pop"><i class="ti ti-trophy" aria-hidden="true"></i></div>' +
      '<div class="telao-name reveal-pop">' + esc(item.eq.nome) + '</div>' +
      '<div class="telao-score-big">' + pontos(item) + '</div>' +
      '<button class="telao-btn telao-mt" data-next>Ver classificação <i class="ti ti-list-numbers" aria-hidden="true"></i></button>');
    setTimeout(Sound.fanfarra, 600); // a pancada ressoa sozinha antes da fanfarra
    spawnConfetti();
  }

  /* Classificação final: pódio de 3 colunas que sobem em sequência (3º → 2º → 1º),
     com 4º e 5º em linhas discretas abaixo */
  function renderClassificacao() {
    var top3 = rank.slice(0, 3);
    var resto = rank.slice(3, 5);

    // ordem visual: 2º à esquerda, 1º no centro (mais alto), 3º à direita.
    // Altura e medalha vêm da posição (item.pos) — a barra do 1º é sempre a mais alta.
    var medalhaPorPos = { 1: 'gold', 2: 'silver', 3: 'bronze' };
    var layout = [top3[1], top3[0], top3[2]]
      .filter(function (item) { return item; })
      .map(function (item) {
        var pos = Math.min(item.pos, 3);
        return { item: item, cls: 'pod-' + pos, medal: medalhaPorPos[pos] };
      });

    var cols = layout.map(function (l) {
      var trofeu = l.medal === 'gold' ? '<div class="pod-trophy"><i class="ti ti-trophy" aria-hidden="true"></i></div>' : '';
      return '<div class="pod-col ' + l.cls + '">' +
        '<div class="pod-team">' + trofeu +
        '<div class="pod-name">' + esc(l.item.eq.nome) + '</div>' +
        '<div class="pod-pts g-' + l.medal + '">' + (l.item.media !== null ? l.item.media.toFixed(1) + ' pts' : '—') + '</div></div>' +
        '<div class="pod-block"><span class="pod-pos g-' + l.medal + '">' + l.item.pos + 'º</span></div>' +
        '</div>';
    }).join('');

    var rows = resto.map(function (r) {
      return '<div class="trr trr-sm"><div class="trr-pos">' + r.pos + 'º</div>' +
        '<div class="trr-name">' + esc(r.eq.nome) + '</div>' +
        '<div class="trr-pts">' + (r.media !== null ? r.media.toFixed(1) + ' pts' : '—') + '</div></div>';
    }).join('');

    tela(catChip(' — classificação final') +
      '<div class="podium" id="podium">' + cols + '</div>' +
      (rows ? '<div class="podium-rest" id="podium-rest">' + rows + '</div>' : '') +
      '<div class="btn-row podium-actions" id="podium-actions"><button class="telao-btn-sec" data-voltar>Outra categoria</button></div>');

    // alturas em px calculadas do container real — sem depender de % em flexbox
    var ratios = { 1: 0.62, 2: 0.44, 3: 0.32 };
    var podiumEl = document.getElementById('podium');
    var baseH = podiumEl ? podiumEl.offsetHeight : 400;

    // sobem em sequência: 3º → 2º → 1º (altura aplicada direto no style); depois 4º/5º e o botão
    [3, 2, 1].forEach(function (pos, i) {
      var col = document.querySelector('.pod-' + pos);
      if (!col) return;
      var block = col.querySelector('.pod-block');
      setTimeout(function () {
        col.classList.add('up');
        block.style.height = Math.round(baseH * ratios[pos]) + 'px';
        Sound.revelar();
      }, 400 + i * 700);
    });
    var ordem = [3, 2, 1]; // para o timing do bloco final abaixo
    setTimeout(function () {
      ['podium-rest', 'podium-actions'].forEach(function (id) {
        var el = document.getElementById(id);
        if (el) el.classList.add('shown');
      });
    }, 400 + ordem.length * 700);
  }

  /* ── Suspense de cerimônia: rolo de caixa curto em crescendo →
     corte SECO para silêncio total (tela escura) → pancada + nome (no cb) ── */
  function runDrum(place, isWinner, cb) {
    var bars = Array.from({ length: 18 }, function () { return '<div class="drum-bar" style="height:10px"></div>'; }).join('');
    tela('<div class="suspense-glow"></div>' +
      '<div class="telao-suspense">' + (isWinner ? 'E o grande campeão é...' : 'Em ' + place + 'º lugar...') + '</div>' +
      '<div class="drum-wrap">' + bars + '</div>');
    var dur = isWinner ? 5000 : (place === 2 ? 3000 : 2800); // rufar mais longo a cada posição
    var silencio = isWinner ? 900 : 600;                     // pausa seca antes da pancada
    Sound.iniciarRufar(dur);
    var inicio = Date.now();
    var glow = document.querySelector('.suspense-glow');
    pararDrum();
    (function frame() {
      var p = Math.min((Date.now() - inicio) / dur, 1); // progresso 0→1
      var amp = 25 + p * 70;                            // amplitude cresce
      document.querySelectorAll('.drum-bar').forEach(function (b) {
        b.style.height = Math.round(8 + Math.random() * amp) + '%';
      });
      if (glow) glow.style.animationDuration = (1.2 - p * 0.85).toFixed(2) + 's'; // pulsa mais rápido
      if (p >= 1) {
        drumTimer = null;
        Sound.pararRufar();
        tela(''); // corte: tela escura e silêncio absoluto
        drumTimer = setTimeout(function () { drumTimer = null; cb(); }, silencio);
        return;
      }
      drumTimer = setTimeout(frame, Math.round(120 - p * 75)); // 120ms → 45ms
    })();
  }

  function pararDrum() {
    if (drumTimer) { clearTimeout(drumTimer); drumTimer = null; }
  }

  function spawnConfetti() {
    var layer = document.getElementById('conf-layer');
    if (!layer) return;
    var cols = ['#1D9E75', '#EF9F27', '#378ADD', '#E24B4A', '#D4537E', '#7F77DD', '#5DCAA5'];
    var frag = document.createDocumentFragment();
    for (var i = 0; i < 70; i++) {
      var d = document.createElement('div');
      d.className = 'cp';
      var size = Math.round(6 + Math.random() * 8);
      d.style.cssText = 'left:' + Math.round(Math.random() * 100) + '%;top:-10px;width:' + size + 'px;height:' + size +
        'px;background:' + cols[i % cols.length] + ';animation-delay:' + Math.round(Math.random() * 1500) +
        'ms;animation-duration:' + (1800 + Math.round(Math.random() * 1200)) + 'ms';
      frag.appendChild(d);
    }
    layer.appendChild(frag);
  }

  function bind() {
    body().addEventListener('click', function (ev) {
      var pick = ev.target.closest('[data-cat]');
      var mudo = ev.target.closest('[data-mudo]');
      if (mudo) {
        Sound.ativar();
        var off = Sound.alternarMudo();
        mudo.querySelector('i').className = 'ti ' + (off ? 'ti-volume-off' : 'ti-volume');
        return;
      }
      var fs = ev.target.closest('[data-fs]');
      if (fs) { alternarTelaCheia(); return; }
      if (ev.target.closest('[data-shot]')) { capturarTela(); return; }
      if (pick) { escolherCategoria(pick.dataset.cat); return; }
      if (ev.target.closest('[data-next]')) { avancar(); return; }
      if (ev.target.closest('[data-voltar]')) { renderPicker(); return; }
    });
  }

  function init() {
    if (!CONFIG.SUPABASE_URL || CONFIG.SUPABASE_URL.indexOf('http') !== 0) {
      body().innerHTML = '<div class="telao"><div class="telao-name telao-title">Não configurado</div>' +
        '<div class="telao-pts">Preencha as credenciais do Supabase em js/config.js.</div></div>';
      return;
    }
    bind();
    document.addEventListener('fullscreenchange', function () {
      var b = document.querySelector('[data-fs] i');
      if (b) b.className = 'ti ' + (document.fullscreenElement ? 'ti-minimize' : 'ti-maximize');
    });
    renderPicker();
  }

  return { init: init };
})();

document.addEventListener('DOMContentLoaded', Telao.init);
