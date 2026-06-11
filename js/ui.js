/* Utilitários de interface: navegação entre telas, mensagens e
   escape de HTML (proteção contra injeção em nomes digitados). */
'use strict';

var UI = (function () {
  function esc(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function goTo(id) {
    document.querySelectorAll('.screen').forEach(function (s) { s.classList.remove('active'); });
    document.getElementById(id).classList.add('active');
    window.scrollTo(0, 0);
  }

  function activeScreen() {
    var el = document.querySelector('.screen.active');
    return el ? el.id : null;
  }

  /* Tela de ajuda: guarda de onde veio para o "Voltar" devolver ao lugar certo */
  var telaAnterior = null;
  function abrirAjuda() {
    telaAnterior = activeScreen();
    goTo('s-ajuda');
  }
  function fecharAjuda() {
    goTo(telaAnterior && telaAnterior !== 's-ajuda' ? telaAnterior : 's-home');
  }

  function showErr(id, msg) {
    var e = document.getElementById(id);
    e.style.display = 'flex';
    e.querySelector('span').textContent = msg;
  }

  function hideErr(id) {
    document.getElementById(id).style.display = 'none';
  }

  function badge(cat) {
    return '<span class="badge ' + CATS[cat].bc + '">' + CATS[cat].label + '</span>';
  }

  function catHeader(cat, extra) {
    return '<div class="ch ch-' + cat + '">' + badge(cat) + (extra || '') + '</div>';
  }

  /* Desabilita o botão e mostra "..." enquanto uma operação assíncrona roda,
     para evitar duplo clique e dar feedback de carregamento. */
  async function busy(btn, fn) {
    var original = btn ? btn.innerHTML : '';
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="ti ti-loader-2 spin" aria-hidden="true"></i>'; }
    try {
      await fn();
    } finally {
      if (btn) { btn.disabled = false; btn.innerHTML = original; }
    }
  }

  return { esc: esc, goTo: goTo, activeScreen: activeScreen, abrirAjuda: abrirAjuda, fecharAjuda: fecharAjuda, showErr: showErr, hideErr: hideErr, badge: badge, catHeader: catHeader, busy: busy };
})();
