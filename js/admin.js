/* Telas do administrador: login, equipes, código da banca,
   avaliadores e painel de resultados.
   A senha é validada no banco e mantida apenas em memória
   durante a sessão, para autorizar as operações de escrita. */
'use strict';

var Admin = (function () {
  var esc = UI.esc;
  var pwd = ''; // senha validada, em memória somente

  async function login(btn) {
    var inp = document.getElementById('adm-pwd');
    // normaliza igual ao banco: sem espaços nas pontas e em CAPS
    var senha = inp.value.trim().toUpperCase();
    if (!senha) { UI.showErr('adm-err', 'Digite a senha.'); return; }
    await UI.busy(btn, async function () {
      var ok;
      try {
        ok = await Api.adminLogin(senha);
      } catch (e) {
        UI.showErr('adm-err', e.message); return;
      }
      if (!ok) { UI.showErr('adm-err', 'Senha incorreta.'); return; }
      UI.hideErr('adm-err');
      pwd = senha;
      inp.value = '';
      try {
        await Store.sync();
        document.getElementById('cod-inp').value = await Api.getBancaCode(pwd);
      } catch (e) {
        UI.showErr('adm-err', e.message); return;
      }
      UI.goTo('s-admin');
      renderEquipes();
      renderAvaliadores();
    });
  }

  function logout() {
    pwd = '';
    UI.goTo('s-home');
  }

  function switchTab(btn, pane) {
    document.querySelectorAll('.nav-tab').forEach(function (b) {
      b.classList.remove('act');
      b.setAttribute('aria-selected', 'false');
    });
    document.querySelectorAll('.tp').forEach(function (p) { p.classList.remove('act'); });
    btn.classList.add('act');
    btn.setAttribute('aria-selected', 'true');
    document.getElementById(pane).classList.add('act');
    refresh();
  }

  /* Re-renderiza a aba visível com dados atualizados (usado também pelo polling) */
  async function refresh() {
    await Store.sync();
    if (document.getElementById('tp-eq').classList.contains('act')) renderEquipes();
    if (document.getElementById('tp-av').classList.contains('act')) renderAvaliadores();
    if (document.getElementById('tp-res').classList.contains('act')) renderResultados();
  }

  async function addEquipe(btn) {
    var nome = document.getElementById('eq-nome').value.trim();
    var cat = document.getElementById('eq-cat').value;
    if (!nome) { UI.showErr('eq-err', 'Informe o nome da equipe.'); return; }
    UI.hideErr('eq-err');
    await UI.busy(btn, async function () {
      try {
        await Api.addEquipe(pwd, nome, cat);
        document.getElementById('eq-nome').value = '';
        await Store.sync();
        renderEquipes();
      } catch (e) {
        UI.showErr('eq-err', e.message);
      }
    });
  }

  async function removeEquipe(id, nome) {
    if (!confirm('Remover a equipe "' + nome + '" e todas as suas notas?')) return;
    await Api.removeEquipe(pwd, id);
    await Store.sync();
    renderEquipes();
  }

  function renderEquipes() {
    var el = document.getElementById('lista-eq');
    if (!Store.state.equipes.length) {
      el.innerHTML = '<div class="empty"><i class="ti ti-users" aria-hidden="true"></i><p>Nenhuma equipe cadastrada.<br>Adicione acima.</p></div>';
      return;
    }
    var html = '';
    CAT_KEYS.forEach(function (cat) {
      var eqs = Store.equipesDa(cat);
      if (!eqs.length) return;
      html += '<div class="cat-block">' + UI.catHeader(cat, '<span class="ch-count">' + eqs.length + ' equipe(s)</span>') + '<div class="cb">';
      eqs.forEach(function (eq) {
        var nAvs = Object.keys(Store.notasDe(eq.id)).length;
        html += '<div class="trow"><div><div class="trow-name">' + esc(eq.nome) + '</div>';
        if (nAvs) html += '<div class="trow-note"><i class="ti ti-check" aria-hidden="true"></i> ' + nAvs + ' avaliação(ões)</div>';
        html += '</div><button class="btn btn-sm btn-danger" data-remove-eq="' + eq.id + '" data-nome="' + esc(eq.nome) + '" aria-label="Remover equipe ' + esc(eq.nome) + '"><i class="ti ti-trash" aria-hidden="true"></i></button></div>';
      });
      html += '</div></div>';
    });
    el.innerHTML = html;
  }

  async function saveCod(btn) {
    var v = document.getElementById('cod-inp').value.trim().toUpperCase();
    if (!v) { alert('Informe um código para a banca.'); return; }
    await UI.busy(btn, async function () {
      await Api.setBancaCode(pwd, v);
      var ok = document.getElementById('cod-ok');
      ok.style.display = 'flex';
      setTimeout(function () { ok.style.display = 'none'; }, 2500);
    });
  }

  function renderAvaliadores() {
    var el = document.getElementById('lista-av');
    var nomes = Store.avaliadores();
    if (!nomes.length) {
      el.innerHTML = '<div class="empty"><i class="ti ti-user-x" aria-hidden="true"></i><p>Nenhuma avaliação registrada ainda.</p></div>';
      return;
    }
    var total = Store.state.equipes.length;
    var html = '';
    nomes.forEach(function (a) {
      var p = Store.progressoDe(a);
      var pct = total ? Math.round(p.done / total * 100) : 0;
      // chips por categoria: verde com check quando o avaliador terminou todas daquela categoria
      var chips = Store.progressoPorCategoria(a).map(function (pc) {
        return '<span class="cat-chip ' + CATS[pc.cat].bc + (pc.completo ? ' cat-chip-done' : '') + '">' +
          (pc.completo ? '<i class="ti ti-check" aria-hidden="true"></i> ' : '') +
          esc(CATS[pc.cat].label) + ' ' + pc.done + '/' + pc.total + '</span>';
      }).join('');
      html += '<div class="trow"><div class="trow-grow"><div class="trow-name">' + esc(a) + '</div>' +
        '<div class="pw"><div class="pf" style="width:' + pct + '%"></div></div>' +
        '<div class="cat-chips">' + chips + '</div></div>' +
        '<button class="btn btn-sm btn-danger trow-action" data-remove-av="' + esc(a) + '" aria-label="Remover avaliador ' + esc(a) + '"><i class="ti ti-trash" aria-hidden="true"></i></button></div>';
    });
    el.innerHTML = html;
  }

  async function removeAvaliador(nome) {
    if (!confirm('Remover ' + nome + ' e todas as notas dele(a)?')) return;
    await Api.removeAvaliador(pwd, nome);
    await Store.sync();
    renderAvaliadores();
  }

  function renderResultados() {
    var el = document.getElementById('painel-res');
    if (!Store.state.equipes.length) {
      el.innerHTML = '<div class="empty"><i class="ti ti-chart-bar" aria-hidden="true"></i><p>Nenhuma equipe ainda.</p></div>';
      return;
    }
    var total = Store.state.equipes.length;
    var comNotas = Store.state.equipes.filter(function (eq) { return Object.keys(Store.notasDe(eq.id)).length > 0; }).length;
    var html = '<div class="stats-grid">';
    [{ v: total, l: 'equipes' }, { v: Store.avaliadores().length, l: 'avaliadores' }, { v: comNotas, l: 'c/ notas' }].forEach(function (s) {
      html += '<div class="stat-box"><div class="stat-val">' + s.v + '</div><div class="stat-lbl">' + s.l + '</div></div>';
    });
    html += '</div>';

    CAT_KEYS.forEach(function (cat) {
      var ranked = Store.ranking(cat);
      if (!ranked.length) return;
      html += '<div class="cat-block">' + UI.catHeader(cat, '<span class="ch-count">' + ranked.length + ' equipe(s)</span>') + '<div class="cb cb-res">';
      ranked.forEach(function (r) {
        var temNota = r.media !== null;
        var m = temNota ? r.media.toFixed(1) + ' pts' : 'sem nota';
        var pct = temNota ? Math.round(r.media) : 0;
        var ouro = r.pos === 1 && temNota;
        html += '<div class="res-item"><div class="res-pos' + (ouro ? ' gold-text' : '') + '">' + r.pos + 'º</div>' +
          '<div class="trow-grow"><div class="trow-name">' + esc(r.eq.nome) +
          (r.desempate ? ' <span class="tie-tag" title="Mesma média total — posição definida pelos critérios de maior peso">desempate</span>' : '') +
          '</div><div class="pw res-pw"><div class="pf" style="width:' + pct + '%"></div></div></div>' +
          '<div class="res-pts' + (ouro ? ' gold-text' : '') + '">' + m + '</div></div>';
      });
      html += renderDetalhes(cat, ranked);
      html += '</div></div>';
    });
    el.innerHTML = html;
  }

  function renderDetalhes(cat, ranked) {
    var html = '<details class="res-details"><summary>Detalhes por critério</summary>';
    ranked.forEach(function (r) {
      html += '<div class="res-det-team"><div class="res-det-name">' + esc(r.eq.nome) + '</div>';
      if (!r.mc) {
        html += '<div class="res-det-empty">Sem avaliações.</div>';
      } else {
        CATS[cat].crit.forEach(function (c, i) {
          html += '<div class="res-det-row"><span class="res-det-crit">' + c.n + '</span><span class="res-det-val">' + r.mc[i].toFixed(1) + '/' + c.max + '</span></div>';
        });
      }
      html += '</div>';
    });
    return html + '</details>';
  }

  /* Delegação de eventos: os botões de remover usam data-attributes,
     evitando concatenar nomes digitados dentro de atributos onclick. */
  function bindListas() {
    document.getElementById('lista-eq').addEventListener('click', function (ev) {
      var btn = ev.target.closest('[data-remove-eq]');
      if (btn) removeEquipe(btn.dataset.removeEq, btn.dataset.nome);
    });
    document.getElementById('lista-av').addEventListener('click', function (ev) {
      var btn = ev.target.closest('[data-remove-av]');
      if (btn) removeAvaliador(btn.dataset.removeAv);
    });
  }

  return { login: login, logout: logout, switchTab: switchTab, refresh: refresh, addEquipe: addEquipe, saveCod: saveCod, bindListas: bindListas };
})();
