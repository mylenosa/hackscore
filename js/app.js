/* Inicialização: liga os eventos e o polling de atualização automática. */
'use strict';

(function () {
  function configurado() {
    return CONFIG.SUPABASE_URL.indexOf('http') === 0;
  }

  /* Atualização automática: enquanto o admin ou um avaliador estiver com o
     painel aberto, os dados são recarregados do banco periodicamente.
     O formulário de notas e o telão nunca são re-renderizados no meio do uso. */
  function startPolling() {
    setInterval(async function () {
      if (!navigator.onLine) return;
      try {
        var tela = UI.activeScreen();
        if (tela === 's-admin') await Admin.refresh();
        else if (tela === 's-aval') await Aval.refresh();
      } catch (e) {
        console.warn('Falha na atualização automática:', e.message);
      }
    }, CONFIG.POLL_MS);
  }

  /* Tela de ajuda: lista de categorias e critérios gerada a partir do
     config.js — sempre em sincronia com o que a banca realmente usa */
  function renderAjudaCriterios() {
    var el = document.getElementById('ajuda-cats');
    if (!el) return;
    var html = '';
    CAT_KEYS.forEach(function (cat) {
      html += '<div class="cat-block">' + UI.catHeader(cat) + '<div class="cb">';
      CATS[cat].crit.forEach(function (c) {
        html += '<div class="res-det-row"><span class="res-det-crit">' + UI.esc(c.n) + '</span>' +
          '<span class="res-det-val">' + c.max + ' pts</span></div>';
      });
      html += '</div></div>';
    });
    el.innerHTML = html;
  }

  /* Accordion: clicou num <summary> dentro de um <details data-group="X">
     que estava fechado → fecha os irmãos do mesmo grupo antes de abrir */
  document.addEventListener('click', function (e) {
    var summary = e.target.closest('summary');
    if (!summary) return;
    var details = summary.parentElement;
    if (!details || !details.dataset.group || details.open) return;
    document.querySelectorAll('details[data-group="' + details.dataset.group + '"]').forEach(function (other) {
      if (other !== details) other.open = false;
    });
  });

  /* Preenche textos dinâmicos com dados do config */
  function aplicarBranding() {
    document.title = 'Hackscore — ' + CONFIG.EVENT_NAME;
    var sub = document.getElementById('home-sub');
    if (sub) sub.textContent = CONFIG.EVENT_NAME + (CONFIG.EVENT_SUB ? ' · ' + CONFIG.EVENT_SUB : '');

    // select de categorias gerado dinamicamente
    var sel = document.getElementById('eq-cat');
    if (sel) {
      sel.innerHTML = '';
      CAT_KEYS.forEach(function (k) {
        var opt = document.createElement('option');
        opt.value = k;
        opt.textContent = CATS[k].label;
        sel.appendChild(opt);
      });
    }
  }

  /* Lê ?code= da URL e pré-preenche o campo de código do avaliador */
  function lerCodigoDaUrl() {
    var params = new URLSearchParams(window.location.search);
    var code = params.get('code');
    if (!code) return;
    var inp = document.getElementById('av-cod');
    if (inp) inp.value = code.trim().toUpperCase();
  }

  async function init() {
    aplicarBranding();
    renderAjudaCriterios();
    if (!configurado()) {
      document.body.innerHTML = '<div class="empty" style="padding-top:80px"><i class="ti ti-database-x" aria-hidden="true"></i>' +
        '<p><strong>Supabase não configurado.</strong><br>Preencha SUPABASE_URL e SUPABASE_ANON_KEY em js/config.js<br>e execute supabase/schema.sql no painel do Supabase.</p></div>';
      return;
    }
    Admin.bindListas();
    Aval.bindLista();
    startPolling();
    lerCodigoDaUrl();
    // se o admin recarregou a página, restaura a sessão sem pedir senha
    if (sessionStorage.getItem('admin_ok')) { await Admin.retomarSessao(); return; }
    // se o avaliador recarregou a página, volta direto para o painel dele
    await Aval.retomarSessao();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
