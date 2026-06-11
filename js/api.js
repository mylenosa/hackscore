/* Camada de acesso a dados (Supabase).
   Leituras vão direto nas tabelas (somente leitura via RLS);
   toda escrita passa por funções no banco que validam a senha do
   admin ou o código da banca — nada sensível fica no front-end. */
'use strict';

var Api = (function () {
  var _client = null;
  function client() {
    if (!_client) _client = window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);
    return _client;
  }

  function fail(error, contexto) {
    console.error('[Api] ' + contexto, error);
    throw new Error(contexto + ': ' + (error.message || 'erro desconhecido'));
  }

  async function rpc(nome, params, contexto) {
    var r = await client().rpc(nome, params);
    if (r.error) fail(r.error, contexto);
    return r.data;
  }

  return {
    /* ── leituras (públicas) ── */
    async listEquipes() {
      var r = await client().from('equipes').select('*').order('created_at');
      if (r.error) fail(r.error, 'Erro ao listar equipes');
      return r.data;
    },

    async listAvaliacoes() {
      var r = await client().from('avaliacoes').select('*');
      if (r.error) fail(r.error, 'Erro ao listar avaliações');
      return r.data;
    },

    /* ── autenticação ── */
    adminLogin: function (pwd) {
      return rpc('admin_login', { p_pwd: pwd }, 'Erro ao validar senha');
    },

    checkBancaCode: function (code) {
      return rpc('check_banca_code', { p_code: code }, 'Erro ao validar código');
    },

    /* ── operações do admin (exigem a senha) ── */
    getBancaCode: function (pwd) {
      return rpc('admin_get_banca_code', { p_pwd: pwd }, 'Erro ao ler código da banca');
    },

    setBancaCode: function (pwd, code) {
      return rpc('admin_set_banca_code', { p_pwd: pwd, p_code: code }, 'Erro ao salvar código');
    },

    addEquipe: function (pwd, nome, cat) {
      return rpc('admin_add_equipe', { p_pwd: pwd, p_nome: nome, p_cat: cat }, 'Erro ao adicionar equipe');
    },

    /* várias equipes de uma vez, mesma categoria */
    addEquipes: function (pwd, nomes, cat) {
      return rpc('admin_add_equipes', { p_pwd: pwd, p_nomes: nomes, p_cat: cat }, 'Erro ao adicionar equipes');
    },

    /* apaga TODAS as equipes e avaliações (config é preservada) */
    resetAll: function (pwd) {
      return rpc('admin_reset_all', { p_pwd: pwd }, 'Erro ao resetar o sistema');
    },

    removeEquipe: function (pwd, id) {
      return rpc('admin_remove_equipe', { p_pwd: pwd, p_id: id }, 'Erro ao remover equipe');
    },

    removeAvaliador: function (pwd, nome) {
      return rpc('admin_remove_avaliador', { p_pwd: pwd, p_nome: nome }, 'Erro ao remover avaliador');
    },

    /* ── envio de avaliação (exige o código da banca) ──
       Retorna 'ok' | 'duplicada' | 'codigo_invalido'. */
    enviarAvaliacao: function (code, equipeId, avaliador, notas) {
      return rpc('enviar_avaliacao', { p_code: code, p_equipe: equipeId, p_avaliador: avaliador, p_notas: notas }, 'Erro ao enviar avaliação');
    }
  };
})();
