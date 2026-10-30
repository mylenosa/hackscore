/* Telas do avaliador: login, lista de equipes e formulário de notas. */
'use strict';

var Aval = (function () {
  var esc = UI.esc;
  var fmEqId = null, fmCat = null, fmEnviado = false;

  function onBeforeUnload(e) { e.preventDefault(); e.returnValue = ''; }

  function ativarGuarda() { window.addEventListener('beforeunload', onBeforeUnload); }
  function desativarGuarda() { window.removeEventListener('beforeunload', onBeforeUnload); }

  function formSujo() {
    if (fmEnviado) return false;
    var temNota = Array.from(document.querySelectorAll('#fm-crit input')).some(function (inp) {
      return parseFloat(inp.value) > 0;
    });
    var obs = document.getElementById('fm-obs');
    return temNota || (obs && obs.value.trim().length > 0);
  }

  function lerObs() {
    var el = document.getElementById('fm-obs');
    return el ? el.value.trim() || null : null;
  }

  async function login(btn) {
    var cod = document.getElementById('av-cod').value.trim().toUpperCase();
    var nome = document.getElementById('av-nome').value.trim().toUpperCase();
    if (!cod) { UI.showErr('av-err', 'Informe o código da banca.'); return; }
    if (!nome) { UI.showErr('av-err', 'Informe seu nome.'); return; }
    await UI.busy(btn, async function () {
      var valido;
      try {
        valido = await Api.checkBancaCode(cod);
        await Store.sync();
      } catch (e) {
        UI.showErr('av-err', e.message); return;
      }
      if (!valido) { UI.showErr('av-err', 'Código incorreto. Confira com o professor.'); return; }
      UI.hideErr('av-err');
      Store.setAvalSessao(nome, cod);
      document.getElementById('av-cod').value = '';
      document.getElementById('av-nome').value = '';
      UI.goTo('s-aval');
      renderPainel();
    });
  }

  async function logout() {
    var p = Store.progressoDe(Store.state.avalNome);
    if (p.total > 0 && p.done < p.total) {
      var faltam = p.total - p.done;
      var ok = await UI.modal({
        title: 'Avaliações pendentes',
        msg: 'Você ainda tem <strong>' + faltam + ' equipe(s)</strong> para avaliar. ' +
             'Se sair agora, poderá voltar depois com o mesmo código e nome.',
        confirm: 'Sair mesmo assim',
        cancel: 'Continuar avaliando',
        danger: true
      });
      if (!ok) return;
    }
    Store.setAvalSessao('', '');
    UI.goTo('s-home');
  }

  /* Retoma a sessão se o avaliador recarregar a página */
  async function retomarSessao() {
    if (!Store.state.avalNome || !Store.state.avalCod) return false;
    try {
      if (!(await Api.checkBancaCode(Store.state.avalCod))) return false;
      await Store.sync();
    } catch (e) {
      return false;
    }
    UI.goTo('s-aval');
    renderPainel();
    return true;
  }

  async function refresh() {
    await Store.sync();
    renderPainel();
  }

  function renderPainel() {
    var nome = Store.state.avalNome;
    var p = Store.progressoDe(nome);
    document.getElementById('av-tb-nome').textContent = nome;
    document.getElementById('av-tb-prog').textContent = p.done + '/' + p.total + ' equipes avaliadas';
    var el = document.getElementById('av-body');
    if (!p.total) {
      el.innerHTML = '<div class="empty"><i class="ti ti-users" aria-hidden="true"></i><p>Aguardando equipes do admin.<br>A tela atualiza sozinha.</p></div>';
      return;
    }
    var pct = Math.round(p.done / p.total * 100);
    var html = '<div class="aval-prog"><div class="aval-prog-head"><span>Seu progresso</span><span>' + p.done + '/' + p.total + '</span></div>' +
      '<div class="pw"><div class="pf" style="width:' + pct + '%"></div></div></div>';
    if (p.done === p.total) html += '<div class="toast-ok"><i class="ti ti-check" aria-hidden="true"></i> Todas as equipes avaliadas! Ótimo trabalho.</div>';

    CAT_KEYS.forEach(function (cat) {
      var eqs = Store.equipesDa(cat);
      if (!eqs.length) return;
      html += '<div class="cat-block">' + UI.catHeader(cat) + '<div class="cb">';
      eqs.forEach(function (eq) {
        var feito = Store.jaAvaliou(eq.id, nome);
        html += '<div class="trow"><div><div class="trow-name">' + esc(eq.nome) + '</div>';
        if (feito) {
          var total = Store.somaNotas(Store.notasDe(eq.id)[nome]);
          html += '<span class="chip-done"><i class="ti ti-check" aria-hidden="true"></i> ' + total + ' pts</span></div>';
        } else {
          html += '</div><button class="btn btn-primary btn-sm" data-avaliar="' + eq.id + '" data-cat="' + cat + '">Avaliar</button>';
        }
        html += '</div>';
      });
      html += '</div></div>';
    });
    el.innerHTML = html;
  }

  function abrirForm(eqId, cat) {
    fmEqId = eqId;
    fmCat = cat;
    fmEnviado = false;
    var eq = Store.state.equipes.find(function (e) { return e.id === eqId; });
    document.getElementById('fm-team').textContent = eq.nome;
    document.getElementById('fm-cat').textContent = CATS[cat].full;
    ['fm-confirm', 'fm-sent'].forEach(function (id) { document.getElementById(id).style.display = 'none'; });
    document.getElementById('fm-btnwrap').style.display = 'block';
    var rascunho = JSON.parse(sessionStorage.getItem('rascunho-' + eqId) || 'null');
    var html = '';
    CATS[cat].crit.forEach(function (c, i) {
      html += '<div class="card crit-row"><div class="crit-name">' + esc(c.n) + '</div><div class="crit-inp-row">' +
        '<input type="number" id="ci-' + i + '" min="0" max="' + c.max + '" step="0.1" inputmode="decimal" placeholder="0" aria-label="' + esc(c.n) + '">' +
        '<span class="crit-max">/ ' + c.max + ' pts</span><div class="crit-bar"><div class="crit-bar-fill" id="cb-' + i + '" style="width:0%"></div></div>' +
        '</div><div class="crit-hint">Ex: 8 ou 8.5</div></div>';
    });
    html += '<div class="card crit-row">' +
      '<div class="crit-name">Observações <span class="obs-optional">(opcional)</span></div>' +
      '<textarea id="fm-obs" class="fm-obs" maxlength="300" placeholder="Pontos fortes, sugestões de melhoria..."></textarea>' +
      '<div class="obs-counter"><span id="fm-obs-count">0</span>/300</div>' +
      '</div>';
    document.getElementById('fm-crit').innerHTML = html;
    if (rascunho) {
      (Array.isArray(rascunho) ? rascunho : rascunho.notas || []).forEach(function (v, i) {
        var inp = document.getElementById('ci-' + i);
        if (inp) inp.value = v || '';
      });
      var obsVal = Array.isArray(rascunho) ? null : (rascunho.obs || null);
      var obsEl = document.getElementById('fm-obs');
      if (obsEl && obsVal) {
        obsEl.value = obsVal;
        document.getElementById('fm-obs-count').textContent = obsVal.length;
      }
    }
    document.getElementById('fm-obs').addEventListener('input', function () {
      document.getElementById('fm-obs-count').textContent = this.value.length;
      if (fmEqId) sessionStorage.setItem('rascunho-' + fmEqId, JSON.stringify({ notas: lerNotas(), obs: lerObs() }));
    });
    document.getElementById('fm-crit').oninput = atualizarTotal;
    atualizarTotal();
    ativarGuarda();
    UI.goTo('s-form');
  }

  function maxPontos(cat) {
    return CATS[cat].crit.reduce(function (s, c) { return s + c.max; }, 0);
  }

  function lerNotas() {
    return CATS[fmCat].crit.map(function (c, i) {
      var inp = document.getElementById('ci-' + i);
      return Math.min(Math.max(parseFloat(inp.value) || 0, 0), c.max);
    });
  }

  function atualizarTotal() {
    var max = maxPontos(fmCat);
    var tot = 0;
    CATS[fmCat].crit.forEach(function (c, i) {
      var inp = document.getElementById('ci-' + i);
      if (!inp) return;
      var v = Math.min(Math.max(parseFloat(inp.value) || 0, 0), c.max);
      if (inp.value !== '' && String(v) !== inp.value) inp.value = v;
      tot += v;
      document.getElementById('cb-' + i).style.width = Math.round(v / c.max * 100) + '%';
    });
    document.getElementById('fm-total').textContent = tot + ' pts';
    document.getElementById('fm-pbar').style.width = Math.round(tot / max * 100) + '%';
    if (fmEqId) sessionStorage.setItem('rascunho-' + fmEqId, JSON.stringify({ notas: lerNotas(), obs: lerObs() }));
  }

  async function voltarLista() {
    if (UI.activeScreen() === 's-form' && formSujo()) {
      var ok = await UI.modal({
        title: 'Descartar notas?',
        msg: 'Sair agora descarta as notas que você preencheu. Continuar?',
        confirm: 'Sair sem salvar', danger: true
      });
      if (!ok) return;
    }
    desativarGuarda();
    sessionStorage.removeItem('rascunho-' + fmEqId);
    UI.goTo('s-aval');
    renderPainel();
  }

  function showConfirm() {
    document.getElementById('fm-confirm').style.display = 'block';
    document.getElementById('fm-btnwrap').style.display = 'none';
  }

  function cancelConfirm() {
    document.getElementById('fm-confirm').style.display = 'none';
    document.getElementById('fm-btnwrap').style.display = 'block';
  }

  async function enviar(btn) {
    await UI.busy(btn, async function () {
      var status;
      try {
        status = await Api.enviarAvaliacao(Store.state.avalCod, fmEqId, Store.state.avalNome, lerNotas(), lerObs());
      } catch (e) {
        await UI.modal({ title: 'Erro ao enviar', msg: UI.esc(e.message) + '<br>Verifique a conexão e tente novamente.', confirm: 'OK', cancel: false });
        return;
      }
      if (status === 'codigo_invalido') {
        await UI.modal({ title: 'Código alterado', msg: 'O código da banca foi alterado pelo admin. Entre novamente.', confirm: 'OK', cancel: false });
        logout();
        return;
      }
      sessionStorage.removeItem('rascunho-' + fmEqId);
      fmEnviado = true;
      desativarGuarda();
      document.getElementById('fm-confirm').style.display = 'none';
      var sent = document.getElementById('fm-sent');
      sent.style.display = 'flex';
      sent.innerHTML = status === 'ok'
        ? '<i class="ti ti-check" aria-hidden="true"></i> Avaliação enviada com sucesso!'
        : '<i class="ti ti-alert-triangle" aria-hidden="true"></i> Você já havia avaliado esta equipe — a nota original foi mantida.';
      document.querySelectorAll('#fm-crit input').forEach(function (inp) { inp.disabled = true; });
      await Store.sync();
      setTimeout(voltarLista, 1800);
    });
  }

  function bindLista() {
    document.getElementById('av-body').addEventListener('click', function (ev) {
      var btn = ev.target.closest('[data-avaliar]');
      if (btn) abrirForm(btn.dataset.avaliar, btn.dataset.cat);
    });
  }

  return {
    login: login, logout: logout, retomarSessao: retomarSessao, refresh: refresh,
    voltarLista: voltarLista, showConfirm: showConfirm, cancelConfirm: cancelConfirm,
    enviar: enviar, bindLista: bindLista
  };
})();
