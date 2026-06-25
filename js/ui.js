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

  /* Modal customizado — substitui confirm(), alert() e prompt() nativos.
     UI.modal({ title, msg, confirm, cancel, danger })  → Promise<boolean>
     UI.prompt({ title, msg, value, placeholder })       → Promise<string|null> */
  function modal(opts) {
    return new Promise(function (resolve) {
      var el = document.getElementById('ui-modal');
      document.getElementById('ui-modal-title').textContent = opts.title || '';
      document.getElementById('ui-modal-msg').innerHTML = opts.msg || '';
      document.getElementById('ui-modal-input-wrap').style.display = 'none';
      var okBtn = document.getElementById('ui-modal-ok');
      var cancelBtn = document.getElementById('ui-modal-cancel');
      okBtn.textContent = opts.confirm || 'Confirmar';
      okBtn.className = 'btn btn-sm' + (opts.danger ? ' btn-danger' : ' btn-primary');
      cancelBtn.textContent = opts.cancel || 'Cancelar';
      cancelBtn.style.display = opts.cancel === false ? 'none' : '';
      el.style.display = 'flex';
      document.getElementById('ui-modal-input').value = '';
      function fechar(val) {
        el.style.display = 'none';
        okBtn.onclick = null;
        cancelBtn.onclick = null;
        resolve(val);
      }
      okBtn.onclick = function () { fechar(true); };
      cancelBtn.onclick = function () { fechar(false); };
    });
  }

  function prompt(opts) {
    return new Promise(function (resolve) {
      var el = document.getElementById('ui-modal');
      document.getElementById('ui-modal-title').textContent = opts.title || '';
      document.getElementById('ui-modal-msg').innerHTML = opts.msg || '';
      var wrap = document.getElementById('ui-modal-input-wrap');
      var inp = document.getElementById('ui-modal-input');
      wrap.style.display = 'block';
      inp.value = opts.value || '';
      inp.placeholder = opts.placeholder || '';
      var okBtn = document.getElementById('ui-modal-ok');
      var cancelBtn = document.getElementById('ui-modal-cancel');
      okBtn.textContent = opts.confirm || 'Confirmar';
      okBtn.className = 'btn btn-sm btn-primary';
      cancelBtn.textContent = opts.cancel || 'Cancelar';
      cancelBtn.style.display = '';
      el.style.display = 'flex';
      setTimeout(function () { inp.focus(); inp.select(); }, 50);
      function fechar(val) {
        el.style.display = 'none';
        okBtn.onclick = null;
        cancelBtn.onclick = null;
        inp.onkeydown = null;
        resolve(val);
      }
      inp.onkeydown = function (e) {
        if (e.key === 'Enter') fechar(inp.value.trim() || null);
        if (e.key === 'Escape') fechar(null);
      };
      okBtn.onclick = function () { fechar(inp.value.trim() || null); };
      cancelBtn.onclick = function () { fechar(null); };
    });
  }

  return { esc: esc, goTo: goTo, activeScreen: activeScreen, abrirAjuda: abrirAjuda, fecharAjuda: fecharAjuda, showErr: showErr, hideErr: hideErr, badge: badge, catHeader: catHeader, busy: busy, modal: modal, prompt: prompt };
})();
