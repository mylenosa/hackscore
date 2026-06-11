/* Efeitos sonoros do telão, gerados em tempo real com a Web Audio API
   (sem arquivos de áudio — mantém o projeto sem dependências).
   O navegador só permite áudio após um gesto do usuário; por isso o
   som é "destravado" no primeiro clique (botão Iniciar revelação). */
'use strict';

var Sound = (function () {
  var ctx = null;
  var mudo = (localStorage.getItem('telao_mudo') === '1');
  var rufarTimer = null;

  function ativar() {
    if (!ctx) {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (AC) ctx = new AC();
    }
    if (ctx && ctx.state === 'suspended') ctx.resume();
  }

  function ok() { return ctx && !mudo; }

  /* Tom simples com envelope (ataque/decaimento) */
  function tom(freq, inicio, dur, volume, tipo) {
    var osc = ctx.createOscillator();
    var g = ctx.createGain();
    osc.type = tipo || 'sine';
    osc.frequency.value = freq;
    g.gain.setValueAtTime(0, inicio);
    g.gain.linearRampToValueAtTime(volume, inicio + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, inicio + dur);
    osc.connect(g).connect(ctx.destination);
    osc.start(inicio);
    osc.stop(inicio + dur);
  }

  /* Ruído curto e grave = batida de tambor */
  function batida(volume) {
    if (!ok()) return;
    var dur = 0.18;
    var buffer = ctx.createBuffer(1, ctx.sampleRate * dur, ctx.sampleRate);
    var data = buffer.getChannelData(0);
    for (var i = 0; i < data.length; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / data.length, 2);
    }
    var src = ctx.createBufferSource();
    src.buffer = buffer;
    var g = ctx.createGain();
    g.gain.value = volume || 0.5;
    var filtro = ctx.createBiquadFilter();
    filtro.type = 'lowpass';
    filtro.frequency.value = 220;
    src.connect(filtro).connect(g).connect(ctx.destination);
    src.start();
  }

  /* Rufar de tambores: batidas que aceleram durante o suspense */
  function iniciarRufar() {
    pararRufar();
    if (!ok()) return;
    var intervalo = 220;
    function bater() {
      batida(0.35);
      intervalo = Math.max(70, intervalo * 0.92); // acelera
      rufarTimer = setTimeout(bater, intervalo);
    }
    bater();
  }

  function pararRufar() {
    if (rufarTimer) { clearTimeout(rufarTimer); rufarTimer = null; }
  }

  /* "Ta-dã" curto ao revelar uma posição */
  function revelar() {
    if (!ok()) return;
    var t = ctx.currentTime;
    tom(523.25, t, 0.18, 0.25, 'triangle');        // dó
    tom(783.99, t + 0.12, 0.35, 0.28, 'triangle');  // sol
  }

  /* Fanfarra de vitória para o campeão */
  function fanfarra() {
    if (!ok()) return;
    var t = ctx.currentTime;
    var notas = [523.25, 659.25, 783.99, 1046.5]; // dó-mi-sol-dó
    notas.forEach(function (f, i) { tom(f, t + i * 0.15, 0.4, 0.3, 'triangle'); });
    tom(1046.5, t + 0.6, 0.8, 0.32, 'triangle');
    tom(1318.5, t + 0.6, 0.8, 0.2, 'sine');
  }

  function alternarMudo() {
    mudo = !mudo;
    localStorage.setItem('telao_mudo', mudo ? '1' : '0');
    if (mudo) pararRufar();
    return mudo;
  }

  return {
    ativar: ativar,
    iniciarRufar: iniciarRufar,
    pararRufar: pararRufar,
    revelar: revelar,
    fanfarra: fanfarra,
    alternarMudo: alternarMudo,
    estaMudo: function () { return mudo; }
  };
})();
