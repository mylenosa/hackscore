/* Estado da aplicação + regras de negócio (médias, ranking e desempate).
   Mantém um cache local dos dados do banco; as telas leem daqui. */
'use strict';

var Store = (function () {
  var state = {
    equipes: [],      // [{id, nome, cat}]
    avaliacoes: [],   // [{equipe_id, avaliador, notas: [..]}]
    avalNome: sessionStorage.getItem('aval_nome') || '',
    avalCod: sessionStorage.getItem('aval_cod') || ''
  };

  /* Recarrega tudo do banco de uma vez */
  async function sync() {
    var r = await Promise.all([Api.listEquipes(), Api.listAvaliacoes()]);
    state.equipes = r[0];
    state.avaliacoes = r[1];
  }

  function equipesDa(cat) {
    return state.equipes.filter(function (e) { return e.cat === cat; });
  }

  /* Mapa { avaliador: notas[] } de uma equipe */
  function notasDe(equipeId) {
    var out = {};
    state.avaliacoes.forEach(function (a) {
      if (a.equipe_id === equipeId) out[a.avaliador] = a.notas;
    });
    return out;
  }

  function avaliadores() {
    var nomes = [];
    state.avaliacoes.forEach(function (a) {
      if (nomes.indexOf(a.avaliador) === -1) nomes.push(a.avaliador);
    });
    return nomes.sort();
  }

  function somaNotas(notas) {
    return notas.reduce(function (s, v) { return s + (Number(v) || 0); }, 0);
  }

  /* Média de cada critério entre os avaliadores (array alinhado com CATS[cat].crit),
     ou null se ninguém avaliou */
  function mediasCriterios(equipeId, cat) {
    var porAvaliador = notasDe(equipeId);
    var avs = Object.keys(porAvaliador);
    if (!avs.length) return null;
    return CATS[cat].crit.map(function (c, i) {
      var soma = avs.reduce(function (s, a) { return s + (Number(porAvaliador[a][i]) || 0); }, 0);
      return soma / avs.length;
    });
  }

  /* Média total entre avaliadores, ou null se ninguém avaliou */
  function calcMedia(equipeId) {
    var porAvaliador = notasDe(equipeId);
    var avs = Object.keys(porAvaliador);
    if (!avs.length) return null;
    var soma = avs.reduce(function (s, a) { return s + somaNotas(porAvaliador[a]); }, 0);
    return Math.round(soma / avs.length * 10) / 10;
  }

  /* Ranking de uma categoria com DESEMPATE automático:
     1º critério: média total;
     empate → maior média no critério de maior peso, depois no seguinte, etc.;
     só permanece empate se as notas forem idênticas em todos os critérios.
     Retorna [{eq, media, mc, pos, desempate}] da melhor para a pior. */
  function ranking(cat) {
    // ordem dos critérios para desempate: do maior para o menor peso
    var ordem = CATS[cat].crit
      .map(function (c, i) { return { i: i, max: c.max }; })
      .sort(function (a, b) { return b.max - a.max; })
      .map(function (o) { return o.i; });

    var lista = equipesDa(cat).map(function (eq) {
      return { eq: eq, media: calcMedia(eq.id), mc: mediasCriterios(eq.id, cat), desempate: false };
    });

    function comparar(a, b) {
      var d = (b.media || 0) - (a.media || 0);
      if (d !== 0) return d;
      if (!a.mc || !b.mc) return 0;
      for (var k = 0; k < ordem.length; k++) {
        d = b.mc[ordem[k]] - a.mc[ordem[k]];
        if (d !== 0) return d;
      }
      return 0;
    }

    lista.sort(comparar);
    lista.forEach(function (item, i) {
      if (i > 0 && item.media !== null && comparar(lista[i - 1], item) === 0) {
        item.pos = lista[i - 1].pos; // notas idênticas em tudo: empate real
      } else {
        item.pos = i + 1;
        // mesma média total mas posição diferente → desempate por critério
        if (i > 0 && item.media !== null && item.media === lista[i - 1].media) {
          item.desempate = true;
          lista[i - 1].desempate = true;
        }
      }
    });
    return lista;
  }

  function jaAvaliou(equipeId, avaliador) {
    return state.avaliacoes.some(function (a) {
      return a.equipe_id === equipeId && a.avaliador === avaliador;
    });
  }

  function progressoDe(avaliador) {
    var done = state.equipes.filter(function (eq) { return jaAvaliou(eq.id, avaliador); }).length;
    return { done: done, total: state.equipes.length };
  }

  /* Progresso de um avaliador por categoria.
     Retorna [{cat, done, total, completo}] só das categorias que têm equipes. */
  function progressoPorCategoria(avaliador) {
    return CAT_KEYS.map(function (cat) {
      var eqs = equipesDa(cat);
      var done = eqs.filter(function (eq) { return jaAvaliou(eq.id, avaliador); }).length;
      return { cat: cat, done: done, total: eqs.length, completo: eqs.length > 0 && done === eqs.length };
    }).filter(function (p) { return p.total > 0; });
  }

  function setAvalSessao(nome, cod) {
    state.avalNome = nome;
    state.avalCod = cod;
    if (nome) {
      sessionStorage.setItem('aval_nome', nome);
      sessionStorage.setItem('aval_cod', cod);
    } else {
      sessionStorage.removeItem('aval_nome');
      sessionStorage.removeItem('aval_cod');
    }
  }

  return {
    state: state,
    sync: sync,
    equipesDa: equipesDa,
    notasDe: notasDe,
    avaliadores: avaliadores,
    somaNotas: somaNotas,
    calcMedia: calcMedia,
    mediasCriterios: mediasCriterios,
    ranking: ranking,
    jaAvaliou: jaAvaliou,
    progressoDe: progressoDe,
    progressoPorCategoria: progressoPorCategoria,
    setAvalSessao: setAvalSessao
  };
})();
