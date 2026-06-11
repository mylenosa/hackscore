/* Tela de revelação (telão): suspense, revelação do último ao primeiro,
   campeão com confete e ranking final. */
'use strict';

var Telao = (function () {
  var esc = UI.esc;
  var rank = [], step = 0, cat = null, drumTimer = null;

  async function iniciar() {
    var sel = document.getElementById('rev-cat-sel').value;
    var warn = document.getElementById('rev-warn');
    await Store.sync();
    var lista = Store.ranking(sel);
    if (!lista.length) {
      warn.style.display = 'flex';
      warn.querySelector('span').textContent = 'Nenhuma equipe nessa categoria.';
      return;
    }
    var semNota = lista.filter(function (r) { return r.media === null; });
    if (semNota.length && !confirm(semNota.length + ' equipe(s) ainda sem nenhuma avaliação. Revelar mesmo assim?')) return;
    warn.style.display = 'none';
    cat = sel;
    rank = lista;
    step = 0;
    UI.goTo('s-telao');
    renderStep();
  }

  function pararDrum() {
    if (drumTimer) { clearInterval(drumTimer); drumTimer = null; }
  }

  function pontos(item) {
    return item.media !== null ? item.media.toFixed(1) + ' pts' : 'sem avaliação';
  }

  function tela(conteudo) {
    document.getElementById('telao-body').innerHTML = '<div class="telao">' + conteudo + '</div>';
  }

  function catChip(extra) {
    return '<div class="telao-cat ' + CATS[cat].tc + '">' + CATS[cat].label + (extra || '') + '</div>';
  }

  function renderStep() {
    if (step === 0) {
      tela(catChip() +
        '<div class="telao-name telao-title">Resultados</div>' +
        '<div class="telao-pts">' + rank.length + ' equipe(s) nessa categoria</div>' +
        '<button class="telao-btn" data-next><i class="ti ti-player-play" aria-hidden="true"></i> Iniciar revelação</button>');
      return;
    }
    var idx = rank.length - step;
    if (idx <= 0) { renderCampeao(); return; }
    var item = rank[idx];
    runDrum(item.pos, false, function () {
      tela(catChip() +
        '<div class="telao-place">' + item.pos + 'º lugar</div>' +
        '<div class="telao-name">' + esc(item.eq.nome) + '</div>' +
        '<div class="telao-score-big">' + pontos(item) + '</div>' +
        '<button class="telao-btn telao-mt" data-next>Próximo <i class="ti ti-arrow-right" aria-hidden="true"></i></button>');
    });
  }

  function renderCampeao() {
    var w = rank[0];
    var empatados = rank.filter(function (r) { return r.pos === 1; });
    runDrum(1, true, function () {
      var nomes = empatados.map(function (r) { return esc(r.eq.nome); }).join(' & ');
      tela('<div class="confetti-layer" id="conf-layer"></div>' +
        catChip() +
        '<div class="telao-champion-label">' + (empatados.length > 1 ? 'Campeãs (empate)' : 'Campeão') + '</div>' +
        '<div class="telao-trophy"><i class="ti ti-trophy" aria-hidden="true"></i></div>' +
        '<div class="telao-name">' + nomes + '</div>' +
        '<div class="telao-score-big">' + pontos(w) + '</div>' +
        '<div class="btn-row telao-mt">' +
        '<button class="telao-btn-sec" data-voltar>Outra categoria</button>' +
        '<button class="telao-btn" data-ranking>Ver ranking completo</button>' +
        '</div>');
      spawnConfetti();
    });
  }

  function renderRanking() {
    var rows = rank.map(function (r) {
      var g = r.pos === 1;
      return '<div class="trr' + (g ? ' gold' : '') + '">' +
        '<div class="trr-pos' + (g ? ' g' : '') + '">' + r.pos + 'º</div>' +
        '<div class="trr-name">' + esc(r.eq.nome) + '</div>' +
        '<div class="trr-pts' + (g ? ' g' : '') + '">' + (r.media !== null ? r.media.toFixed(1) + ' pts' : '—') + '</div></div>';
    }).join('');
    tela(catChip(' — ranking final') +
      '<div class="telao-ranking">' + rows + '</div>' +
      '<div class="btn-row"><button class="telao-btn-sec" data-voltar>Outra categoria</button></div>');
  }

  function runDrum(place, isWinner, cb) {
    var bars = Array.from({ length: 18 }, function () { return '<div class="drum-bar" style="height:10px"></div>'; }).join('');
    tela('<div class="telao-suspense">' + (isWinner ? 'E o campeão é...' : 'E em ' + place + 'º lugar...') + '</div>' +
      '<div class="drum-wrap">' + bars + '</div>' +
      '<div class="telao-drum-label">🥁 rufem os tambores...</div>');
    var dur = isWinner ? 3500 : 2200, t = 0, iv = 80;
    pararDrum();
    drumTimer = setInterval(function () {
      document.querySelectorAll('.drum-bar').forEach(function (b) {
        b.style.height = Math.round(8 + Math.random() * 92) + '%';
      });
      t += iv;
      if (t >= dur) { pararDrum(); setTimeout(cb, 200); }
    }, iv);
  }

  function spawnConfetti() {
    var layer = document.getElementById('conf-layer');
    if (!layer) return;
    var cols = ['#1D9E75', '#EF9F27', '#378ADD', '#E24B4A', '#D4537E', '#7F77DD', '#5DCAA5'];
    var frag = document.createDocumentFragment();
    for (var i = 0; i < 50; i++) {
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

  function sair() {
    pararDrum();
    UI.goTo('s-admin');
  }

  function bind() {
    document.getElementById('telao-body').addEventListener('click', function (ev) {
      if (ev.target.closest('[data-next]')) { step++; renderStep(); }
      else if (ev.target.closest('[data-ranking]')) renderRanking();
      else if (ev.target.closest('[data-voltar]')) sair();
    });
    // Esc sai do telão (útil se abriu a categoria errada)
    document.addEventListener('keydown', function (ev) {
      if (ev.key === 'Escape' && UI.activeScreen() === 's-telao') sair();
    });
  }

  return { iniciar: iniciar, bind: bind };
})();
