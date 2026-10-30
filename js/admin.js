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
      sessionStorage.setItem('admin_ok', '1');
      sessionStorage.setItem('admin_pwd', pwd);
      UI.goTo('s-admin');
      renderEquipes();
      renderAvaliadores();
    });
  }

  async function retomarSessao() {
    pwd = sessionStorage.getItem('admin_pwd') || '';
    if (!pwd) { sessionStorage.removeItem('admin_ok'); return; }
    try {
      await Store.sync();
      document.getElementById('cod-inp').value = await Api.getBancaCode(pwd);
    } catch (e) {
      sessionStorage.removeItem('admin_ok');
      sessionStorage.removeItem('admin_pwd');
      return;
    }
    UI.goTo('s-admin');
    renderEquipes();
    renderAvaliadores();
  }

  function logout() {
    pwd = '';
    sessionStorage.removeItem('admin_ok');
    sessionStorage.removeItem('admin_pwd');
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

  /* Aceita uma equipe ou várias separadas por ";" (ex: Alpha;Beta;Gama) */
  async function addEquipe(btn) {
    var nomes = document.getElementById('eq-nome').value
      .split(';')
      .map(function (n) { return n.trim(); })
      .filter(function (n) { return n; });
    var cat = document.getElementById('eq-cat').value;
    if (!nomes.length) { UI.showErr('eq-err', 'Informe o nome da equipe.'); return; }
    UI.hideErr('eq-err');
    await UI.busy(btn, async function () {
      try {
        if (nomes.length === 1) await Api.addEquipe(pwd, nomes[0], cat);
        else await Api.addEquipes(pwd, nomes, cat);
        document.getElementById('eq-nome').value = '';
        await Store.sync();
        renderEquipes();
        var ok = document.getElementById('eq-ok');
        ok.querySelector('span').textContent = nomes.length + ' equipe(s) adicionada(s).';
        ok.style.display = 'flex';
        setTimeout(function () { ok.style.display = 'none'; }, 2500);
      } catch (e) {
        UI.showErr('eq-err', e.message);
      }
    });
  }

  async function removeEquipe(id, nome) {
    var ok = await UI.modal({
      title: 'Remover equipe',
      msg: 'Remover <strong>' + UI.esc(nome) + '</strong> e todas as suas avaliações? Esta ação não pode ser desfeita.',
      confirm: 'Remover', danger: true
    });
    if (!ok) return;
    await Api.removeEquipe(pwd, id);
    await Store.sync();
    renderEquipes();
  }

  async function renameEquipe(id, nomeAtual) {
    var novo = await UI.prompt({
      title: 'Renomear equipe',
      msg: 'Novo nome para <strong>' + UI.esc(nomeAtual) + '</strong>:',
      value: nomeAtual, placeholder: 'Nome da equipe', confirm: 'Salvar'
    });
    if (!novo || novo === nomeAtual) return;
    try {
      await Api.renameEquipe(pwd, id, novo);
      await Store.sync();
      renderEquipes();
    } catch (e) {
      await UI.modal({ title: 'Erro', msg: UI.esc(e.message), confirm: 'OK', cancel: false });
    }
  }

  function renderEquipes() {
    var el = document.getElementById('lista-eq');
    if (!Store.state.equipes.length) {
      el.innerHTML = '<div class="empty"><i class="ti ti-users" aria-hidden="true"></i><p>Nenhuma equipe cadastrada.<br>Adicione acima.</p></div>';
      document.getElementById('dz-open').closest('.danger-zone').style.display = 'none';
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
        html += '</div><div class="trow-actions">' +
          '<button class="btn btn-sm" data-rename-eq="' + eq.id + '" data-nome="' + esc(eq.nome) + '" aria-label="Renomear equipe ' + esc(eq.nome) + '"><i class="ti ti-pencil" aria-hidden="true"></i></button>' +
          '<button class="btn btn-sm btn-danger" data-remove-eq="' + eq.id + '" data-nome="' + esc(eq.nome) + '" aria-label="Remover equipe ' + esc(eq.nome) + '"><i class="ti ti-trash" aria-hidden="true"></i></button>' +
          '</div></div>';
      });
      html += '</div></div>';
    });
    el.innerHTML = html;
    document.getElementById('dz-open').closest('.danger-zone').style.display =
      Store.state.equipes.length > 0 ? 'block' : 'none';
  }

  async function saveCod(btn) {
    var v = document.getElementById('cod-inp').value.trim().toUpperCase();
    if (!v) { await UI.modal({ title: 'Atenção', msg: 'Informe um código para a banca.', confirm: 'OK', cancel: false }); return; }
    await UI.busy(btn, async function () {
      await Api.setBancaCode(pwd, v);
      renderQrCode(v);
      var ok = document.getElementById('cod-ok');
      ok.style.display = 'flex';
      setTimeout(function () { ok.style.display = 'none'; }, 2500);
    });
  }

  function renderQrCode(code) {
    var wrap = document.getElementById('qr-wrap');
    if (!wrap) return;
    var url = window.location.origin + window.location.pathname + '?code=' + encodeURIComponent(code);
    wrap.innerHTML = '<div id="qr-box"></div>' +
      '<button class="btn btn-sm" id="qr-copy"><i class="ti ti-link" aria-hidden="true"></i> Copiar link</button>';
    /* global QRCode */
    new QRCode(document.getElementById('qr-box'), { text: url, width: 160, height: 160, correctLevel: QRCode.CorrectLevel.M });
    document.getElementById('qr-copy').addEventListener('click', function () {
      navigator.clipboard.writeText(url).then(function () {
        var btn = document.getElementById('qr-copy');
        btn.innerHTML = '<i class="ti ti-check" aria-hidden="true"></i> Copiado!';
        setTimeout(function () { btn.innerHTML = '<i class="ti ti-link" aria-hidden="true"></i> Copiar link'; }, 2000);
      });
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
    var ok = await UI.modal({
      title: 'Remover avaliador',
      msg: 'Remover <strong>' + UI.esc(nome) + '</strong> e todas as notas dele(a)? Esta ação não pode ser desfeita.',
      confirm: 'Remover', danger: true
    });
    if (!ok) return;
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

    // preserva quais acordeões estão abertos antes de re-renderizar (polling fecha tudo sem isso)
    var abertos = new Set();
    el.querySelectorAll('details[data-cat]').forEach(function (d) {
      if (d.open) abertos.add(d.dataset.cat);
    });

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
          (r.desempate ? ' <span class="tie-tag">desempate</span>' : '') +
          '</div>' +
          (r.desempate && r.motivoDesempate ? '<div class="tie-reason">Desempate por ' + esc(r.motivoDesempate) + '</div>' : '') +
          '<div class="pw res-pw"><div class="pf" style="width:' + pct + '%"></div></div></div>' +
          '<div class="res-pts' + (ouro ? ' gold-text' : '') + '">' + m + '</div></div>';
      });
      html += renderDetalhes(cat, ranked);
      html += '</div></div>';
    });
    el.innerHTML = html;

    // restaura acordeões que estavam abertos
    el.querySelectorAll('details[data-cat]').forEach(function (d) {
      if (abertos.has(d.dataset.cat)) d.open = true;
    });
  }

  function renderDetalhes(cat, ranked) {
    var html = '<details class="res-details" data-cat="' + cat + '" data-group="res-det"><summary>Detalhes por critério</summary>';
    ranked.forEach(function (r) {
      html += '<div class="res-det-team">' +
        '<div class="res-det-head"><div class="res-det-name">' + esc(r.eq.nome) + '</div>' +
        '<button class="btn btn-sm res-det-copy" data-copy-eq="' + r.eq.id + '" data-copy-cat="' + cat + '" title="Copiar análise desta equipe">' +
        '<i class="ti ti-clipboard" aria-hidden="true"></i> Copiar</button></div>';
      if (!r.mc) {
        html += '<div class="res-det-empty">Sem avaliações.</div>';
      } else {
        CATS[cat].crit.forEach(function (c, i) {
          html += '<div class="res-det-row"><span class="res-det-crit">' + esc(c.n) + '</span><span class="res-det-val">' + r.mc[i].toFixed(1) + '/' + c.max + '</span></div>';
        });
        var obs = Store.obsDe(r.eq.id);
        var obsAvs = Object.keys(obs).filter(function (av) { return obs[av]; });
        if (obsAvs.length) {
          html += '<div class="res-det-obs"><div class="res-det-obs-label">Observações</div>';
          obsAvs.forEach(function (av) {
            html += '<div class="res-det-obs-item"><strong>' + esc(av) + ':</strong> ' + esc(obs[av]) + '</div>';
          });
          html += '</div>';
        }
      }
      html += '</div>';
    });
    return html + '</details>';
  }

  function copiarAnaliseEquipe(eqId, cat) {
    var ranked = Store.ranking(cat);
    var r = ranked.find(function (x) { return x.eq.id === eqId; });
    if (!r) return;
    var medals = ['🥇', '🥈', '🥉'];
    var pos = (medals[r.pos - 1] || r.pos + 'º');
    var avs = Object.keys(Store.notasDe(eqId)).length;
    var linhas = [
      '📊 ' + r.eq.nome + ' — ' + CATS[cat].label,
      pos + ' lugar · ' + (r.media !== null ? r.media.toFixed(1) + ' pts' : 'sem nota') + ' (' + avs + ' avaliador' + (avs !== 1 ? 'es' : '') + ')',
      ''
    ];
    if (r.mc) {
      CATS[cat].crit.forEach(function (c, i) {
        linhas.push(c.n + ': ' + r.mc[i].toFixed(1).replace('.', ',') + ' / ' + c.max + ' pts');
      });
    }
    if (r.desempate && r.motivoDesempate) {
      linhas.push('');
      linhas.push('ℹ️ Posição decidida por desempate: ' + r.motivoDesempate);
    }
    var obs = Store.obsDe(eqId);
    var obsAvs = Object.keys(obs).filter(function (av) { return obs[av]; });
    if (obsAvs.length) {
      linhas.push('');
      linhas.push('📝 Observações:');
      obsAvs.forEach(function (av) { linhas.push('• ' + av + ': ' + obs[av]); });
    }
    linhas.push('');
    linhas.push('🏆 ' + CONFIG.EVENT_NAME);
    navigator.clipboard.writeText(linhas.join('\n'));
    var ok = document.getElementById('rank-ok');
    ok.querySelector ? (ok.querySelector('span') ? ok.querySelector('span').textContent = 'Análise copiada!' : null) : null;
    ok.innerHTML = '<i class="ti ti-check" aria-hidden="true"></i> Análise de ' + esc(r.eq.nome) + ' copiada!';
    ok.style.display = 'flex';
    setTimeout(function () { ok.style.display = 'none'; }, 2500);
  }

  /* ── Zona de perigo: reset total com confirmação digitada ── */

  function abrirReset() {
    document.getElementById('dz-open').style.display = 'none';
    document.getElementById('dz-confirm').style.display = 'block';
    var inp = document.getElementById('dz-input');
    inp.value = '';
    document.getElementById('dz-btn').disabled = true;
    inp.focus();
  }

  function fecharReset() {
    document.getElementById('dz-confirm').style.display = 'none';
    document.getElementById('dz-open').style.display = 'inline-flex';
    var det = document.getElementById('dz-details');
    if (det) det.open = false;
  }

  function checarReset() {
    var v = document.getElementById('dz-input').value.trim().toUpperCase();
    document.getElementById('dz-btn').disabled = (v !== 'APAGAR');
  }

  async function resetAll(btn) {
    await UI.busy(btn, async function () {
      try {
        await Api.resetAll(pwd);
      } catch (e) {
        await UI.modal({ title: 'Erro', msg: UI.esc(e.message), confirm: 'OK', cancel: false });
        return;
      }
      await Store.sync();
      fecharReset();
      renderEquipes();
      var ok = document.getElementById('dz-ok');
      ok.style.display = 'flex';
      setTimeout(function () { ok.style.display = 'none'; }, 3000);
    });
  }

  /* ── Exportação CSV (ata/backup das notas) ── */

  function csvCell(v) {
    v = String(v == null ? '' : v);
    return /[;"\n\r]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v;
  }

  function exportCsv() {
    var linhas = [['Categoria', 'Posição', 'Equipe', 'Avaliador',
      'Critério 1', 'Critério 2', 'Critério 3', 'Critério 4', 'Critério 5', 'Critério 6', 'Critério 7',
      'Total do avaliador', 'Média da equipe', 'Observação']];
    CAT_KEYS.forEach(function (cat) {
      Store.ranking(cat).forEach(function (r) {
        var notas = Store.notasDe(r.eq.id);
        var obs = Store.obsDe(r.eq.id);
        var avs = Object.keys(notas).sort();
        var media = r.media !== null ? String(r.media).replace('.', ',') : '';
        if (!avs.length) {
          linhas.push([CATS[cat].full, r.pos + 'º', r.eq.nome, '(sem avaliações)', '', '', '', '', '', '', '', '', media, '']);
          return;
        }
        avs.forEach(function (a) {
          var ns = notas[a];
          var row = [CATS[cat].full, r.pos + 'º', r.eq.nome, a];
          for (var i = 0; i < 7; i++) row.push(ns[i] != null ? ns[i] : '');
          row.push(Store.somaNotas(ns));
          row.push(media);
          row.push(obs[a] || '');
          linhas.push(row);
        });
      });
    });
    // BOM para o Excel reconhecer UTF-8; ";" como separador (padrão pt-BR)
    var csv = '﻿' + linhas.map(function (l) { return l.map(csvCell).join(';'); }).join('\r\n');
    var blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'hackscore-notas-' + new Date().toISOString().slice(0, 10) + '.csv';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  function copiarRanking() {
    var linhas = ['🏆 Ranking — ' + CONFIG.EVENT_NAME + '\n'];
    CAT_KEYS.forEach(function (cat) {
      var rank = Store.ranking(cat);
      if (!rank.length) return;
      linhas.push('\n' + CATS[cat].label);
      rank.forEach(function (item) {
        var medals = ['🥇', '🥈', '🥉'];
        var pos = medals[item.pos - 1] || (item.pos + 'º');
        linhas.push(pos + ' ' + item.eq.nome + ' — ' + item.media.toFixed(1) + ' pts');
      });
    });
    navigator.clipboard.writeText(linhas.join('\n')).then(function () {
      var ok = document.getElementById('rank-ok');
      ok.style.display = 'flex';
      setTimeout(function () { ok.style.display = 'none'; }, 2000);
    });
  }

  /* Delegação de eventos: os botões de remover usam data-attributes,
     evitando concatenar nomes digitados dentro de atributos onclick. */
  function bindListas() {
    document.getElementById('lista-eq').addEventListener('click', function (ev) {
      var rem = ev.target.closest('[data-remove-eq]');
      if (rem) { removeEquipe(rem.dataset.removeEq, rem.dataset.nome); return; }
      var ren = ev.target.closest('[data-rename-eq]');
      if (ren) renameEquipe(ren.dataset.renameEq, ren.dataset.nome);
    });
    document.getElementById('lista-av').addEventListener('click', function (ev) {
      var btn = ev.target.closest('[data-remove-av]');
      if (btn) removeAvaliador(btn.dataset.removeAv);
    });
    document.getElementById('painel-res').addEventListener('click', function (ev) {
      var btn = ev.target.closest('[data-copy-eq]');
      if (btn) copiarAnaliseEquipe(btn.dataset.copyEq, btn.dataset.copyCat);
    });
  }

  return {
    login: login, logout: logout, retomarSessao: retomarSessao,
    switchTab: switchTab, refresh: refresh,
    addEquipe: addEquipe, saveCod: saveCod, bindListas: bindListas,
    abrirReset: abrirReset, fecharReset: fecharReset, checarReset: checarReset,
    resetAll: resetAll, exportCsv: exportCsv, copiarRanking: copiarRanking, copiarAnaliseEquipe: copiarAnaliseEquipe
  };
})();
