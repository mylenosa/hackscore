/* Efeitos sonoros do telão, gerados em tempo real com a Web Audio API
   (sem arquivos de áudio — mantém o projeto sem dependências).
   O navegador só permite áudio após um gesto do usuário; por isso o
   som é "destravado" no primeiro clique (botão Iniciar revelação). */
'use strict';

var Sound = (function () {
  var ctx = null;
  var mudo = (localStorage.getItem('telao_mudo') === '1');
  var rufarGain = null; // saída master do rufar — desconectar silencia as batidas já agendadas

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

  /* Uma batida de tambor "acústica": grave com pitch caindo (corpo do
     bumbo, 120 Hz → 55 Hz) + ruído branco curto em bandpass ~180 Hz
     (textura da pele/caixa). Agendada no relógio de áudio (time) e
     roteada para `dest`, para o rufar poder ser cortado de uma vez. */
  function tambor(time, volume, dest) {
    var grave = ctx.createOscillator();
    var graveGain = ctx.createGain();
    grave.type = 'sine';
    grave.frequency.setValueAtTime(120, time);
    grave.frequency.exponentialRampToValueAtTime(55, time + 0.12);
    graveGain.gain.setValueAtTime(0.0001, time);
    graveGain.gain.exponentialRampToValueAtTime(volume, time + 0.008);
    graveGain.gain.exponentialRampToValueAtTime(0.0001, time + 0.16);
    grave.connect(graveGain).connect(dest);
    grave.start(time);
    grave.stop(time + 0.18);

    var bufferSize = Math.floor(ctx.sampleRate * 0.12);
    var buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    var data = buffer.getChannelData(0);
    for (var i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
    var noise = ctx.createBufferSource();
    noise.buffer = buffer;
    var filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(180, time);
    filter.Q.setValueAtTime(1.8, time);
    var noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.0001, time);
    noiseGain.gain.exponentialRampToValueAtTime(volume * 0.55, time + 0.006);
    noiseGain.gain.exponentialRampToValueAtTime(0.0001, time + 0.11);
    noise.connect(filter).connect(noiseGain).connect(dest);
    noise.start(time);
    noise.stop(time + 0.12);
  }

  /* Rufar de tambores teatral: todas as batidas são agendadas de uma vez
     no relógio de áudio (precisão de amostra — sem o jitter de setTimeout).
     Começa lento e baixo e vai cerrando: intervalo 0.18s → 0.045s,
     volume 0.18 → 0.73. Termina em corte seco. dur em ms. */
  function iniciarRufar(dur) {
    pararRufar();
    if (!ok()) return;
    rufarGain = ctx.createGain();
    rufarGain.gain.value = 1;
    rufarGain.connect(ctx.destination);
    var start = ctx.currentTime;
    var end = start + (dur || 3000) / 1000;
    var t = start;
    var intervalo = 0.18;
    while (t < end) {
      var progresso = Math.min(1, (t - start) / (end - start));
      tambor(t, 0.18 + progresso * 0.55, rufarGain);
      t += intervalo;
      intervalo = Math.max(0.045, intervalo * 0.94);
    }
  }

  /* Corta o rufar imediatamente, inclusive batidas futuras já agendadas —
     garante o silêncio dramático antes da revelação e respeita o mudo. */
  function pararRufar() {
    if (rufarGain) {
      try { rufarGain.disconnect(); } catch (e) { /* já desconectado */ }
      rufarGain = null;
    }
  }

  /* Pancada de revelação: tímpano forte + prato (crash) — o "BUM!" depois do silêncio */
  function impacto() {
    if (!ok()) return;
    var t = ctx.currentTime;
    // tímpano: seno grave com pitch caindo e cauda longa
    var osc = ctx.createOscillator();
    var g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(160, t);
    osc.frequency.exponentialRampToValueAtTime(45, t + 0.5);
    g.gain.setValueAtTime(1.0, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.9);
    osc.connect(g).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 1);
    // prato: ruído agudo com decaimento longo (brilho de cerimônia)
    var dur = 1.4;
    var buffer = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * dur), ctx.sampleRate);
    var data = buffer.getChannelData(0);
    for (var i = 0; i < data.length; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / data.length, 1.8);
    }
    var src = ctx.createBufferSource();
    src.buffer = buffer;
    var hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 5000;
    var cg = ctx.createGain();
    cg.gain.value = 0.35;
    src.connect(hp).connect(cg).connect(ctx.destination);
    src.start(t);
    batida(0.7); // corpo seco do golpe
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
    impacto: impacto,
    fanfarra: fanfarra,
    alternarMudo: alternarMudo,
    estaMudo: function () { return mudo; }
  };
})();
