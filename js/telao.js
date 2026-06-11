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
    body().innerHTML = '<div class="telao">' + botaoMudo() + conteudo + '</div>';
  }

  function botaoMudo() {
    var icon = Sound.estaMudo() ? 'ti-volume-off' : 'ti-volume';
    return '<button class="telao-mute" data-mudo aria-label="Ativar ou desativar som"><i class="ti ' + icon + '" aria-hidden="true"></i></button>';
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
    body().innerHTML = '<div class="telao">' + botaoMudo() +
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
    Sound.revelar();
    tela(catChip() +
      '<div class="telao-place">' + item.pos + 'º</div>' +
      '<div class="telao-name">' + esc(item.eq.nome) + '</div>' +
      '<div class="telao-score-big">' + pontos(item) + '</div>' +
      '<button class="telao-btn telao-mt" data-next>Próximo <i class="ti ti-arrow-right" aria-hidden="true"></i></button>');
  }

  function renderCampeao(item) {
    var empatados = rank.filter(function (r) { return r.pos === 1; });
    var nomes = empatados.map(function (r) { return esc(r.eq.nome); }).join(' & ');
    Sound.fanfarra();
    tela('<div class="confetti-layer" id="conf-layer"></div>' +
      catChip() +
      '<div class="telao-champion-label">' + (empatados.length > 1 ? 'Campeãs (empate)' : 'Campeão') + '</div>' +
      '<div class="telao-trophy"><i class="ti ti-trophy" aria-hidden="true"></i></div>' +
      '<div class="telao-name">' + nomes + '</div>' +
      '<div class="telao-score-big">' + pontos(item) + '</div>' +
      '<button class="telao-btn telao-mt" data-next>Ver classificação <i class="ti ti-list-numbers" aria-hidden="true"></i></button>');
    spawnConfetti();
  }

  /* Classificação final: até o 5º lugar, com destaque ao pódio (ouro/prata/bronze) */
  function renderClassificacao() {
    var medalhas = ['gold', 'silver', 'bronze'];
    var rows = rank.slice(0, 5).map(function (r, i) {
      var medal = i < 3 ? medalhas[i] : '';
      return '<div class="trr ' + medal + '">' +
        '<div class="trr-pos ' + (medal ? 'g-' + medal : '') + '">' + r.pos + 'º</div>' +
        '<div class="trr-name">' + esc(r.eq.nome) + '</div>' +
        '<div class="trr-pts ' + (medal ? 'g-' + medal : '') + '">' + (r.media !== null ? r.media.toFixed(1) + ' pts' : '—') + '</div></div>';
    }).join('');
    tela(catChip(' — classificação final') +
      '<div class="telao-ranking">' + rows + '</div>' +
      '<div class="btn-row"><button class="telao-btn-sec" data-voltar>Outra categoria</button></div>');
  }

  /* ── Suspense (barras animadas + rufar de tambores) ── */
  function runDrum(place, isWinner, cb) {
    var bars = Array.from({ length: 18 }, function () { return '<div class="drum-bar" style="height:10px"></div>'; }).join('');
    tela('<div class="telao-suspense">' + (isWinner ? 'E o grande campeão é...' : 'Em ' + place + 'º lugar...') + '</div>' +
      '<div class="drum-wrap">' + bars + '</div>' +
      '<div class="telao-drum-label">🥁 rufem os tambores...</div>');
    Sound.iniciarRufar();
    var dur = isWinner ? 4000 : 2600, t = 0, iv = 80;
    pararDrum();
    drumTimer = setInterval(function () {
      document.querySelectorAll('.drum-bar').forEach(function (b) {
        b.style.height = Math.round(8 + Math.random() * 92) + '%';
      });
      t += iv;
      if (t >= dur) { pararDrum(); Sound.pararRufar(); setTimeout(cb, 250); }
    }, iv);
  }

  function pararDrum() {
    if (drumTimer) { clearInterval(drumTimer); drumTimer = null; }
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
    renderPicker();
  }

  return { init: init };
})();

document.addEventListener('DOMContentLoaded', Telao.init);
