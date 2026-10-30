/* ─────────────────────────────────────────────────────────────────────────────
   Hackscore — arquivo de configuração
   Preencha as seções abaixo antes de publicar. É o único arquivo que você
   precisa editar para adaptar o sistema a um novo evento.
   ───────────────────────────────────────────────────────────────────────────── */
'use strict';

var CONFIG = {
  /* Supabase — Painel Supabase → Settings → API */
  SUPABASE_URL: 'https://yhpocoxlxkexwuxnvmsu.supabase.co',
  SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlocG9jb3hseGtleHd1eG52bXN1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMzOTU0NzYsImV4cCI6MjEwODk3MTQ3Nn0.VwyIboGa0lg1EeRYugUdgdGMTO5UGQLR3gabj9rokFU',

  /* Evento — aparece na home e no telão */
  EVENT_NAME: 'AGROHACK',  // ex: "Hackathon IFRO 2026"
  EVENT_SUB:  'IFRO Campus Ariquemes',           // ex: "Ariquemes" ou "Campus Centro"

  /* Sistema */
  POLL_MS: 5000 // intervalo de atualização automática (ms)
};

/* ─────────────────────────────────────────────────────────────────────────────
   Categorias e critérios — ⚠️ TROQUE ISTO PARA O SEU EVENTO ⚠️
   Os valores abaixo são os do edital do evento atual. Para reaproveitar o
   projeto em outro hackathon, substitua todo o conteúdo de CATS e CAT_KEYS
   pelos critérios do seu próprio edital — o restante do sistema (telas,
   cálculo de médias, ranking, desempate) se adapta automaticamente.

   Cada chave de CATS é um identificador curto (sem espaços, sem acentos).
   - label: nome curto (usado em chips e abas)
   - full:  nome completo (usado no telão)
   - tc:    classe CSS da aba (ex: 'tc-emp') — defina em css/styles.css se criar nova
   - bc:    classe CSS do badge (ex: 'b-emp') — idem
   - crit:  lista de critérios; max deve somar o total desejado (ex: 100)

   Para adicionar uma categoria: copie um bloco abaixo, troque a chave e os campos,
   e adicione a chave em CAT_KEYS. Para remover, faça o inverso.
   ───────────────────────────────────────────────────────────────────────────── */
var CATS = {
  agro: {
    label: 'Agronomia', full: 'Desafio da Agronomia — Gestão Inteligente de Insumos Rurais', tc: 'tc-emp', bc: 'b-emp',
    crit: [
      { n: 'Problema e aderência ao desafio', max: 20 },
      { n: 'Funcionamento da solução', max: 20 },
      { n: 'Análise, alertas e apoio à decisão', max: 20 },
      { n: 'Validação e utilidade para o público', max: 15 },
      { n: 'Código, documentação e uso responsável de IA', max: 15 },
      { n: 'Clareza, acessibilidade e apresentação', max: 10 }
    ]
  }
};

var CAT_KEYS = ['agro'];
