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

  async function init() {
    if (!configurado()) {
      document.body.innerHTML = '<div class="empty" style="padding-top:80px"><i class="ti ti-database-x" aria-hidden="true"></i>' +
        '<p><strong>Supabase não configurado.</strong><br>Preencha SUPABASE_URL e SUPABASE_ANON_KEY em js/config.js<br>e execute supabase/schema.sql no painel do Supabase.</p></div>';
      return;
    }
    Admin.bindListas();
    Aval.bindLista();
    Telao.bind();
    startPolling();
    // se o avaliador recarregou a página, volta direto para o painel dele
    await Aval.retomarSessao();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
