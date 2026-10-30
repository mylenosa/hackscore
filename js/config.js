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
   Categorias e critérios
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
  emp: {
    label: 'Empresa e Comunidade', full: 'Desafio Empresa e Comunidade', tc: 'tc-emp', bc: 'b-emp',
    crit: [
      { n: 'Relevância do problema e aderência extensionista', max: 20 },
      { n: 'MVP ou protótipo funcional online', max: 20 },
      { n: 'Impacto, validação, prospecção ou tentativa de implantação', max: 20 },
      { n: 'Uso responsável e produtivo de inteligência artificial', max: 10 },
      { n: 'Qualidade técnica, organização do código e documentação no GitHub', max: 10 },
      { n: 'Usabilidade, acessibilidade e experiência do usuário', max: 10 },
      { n: 'Pitch, clareza da apresentação e defesa da solução', max: 10 }
    ]
  },
  liv: {
    label: 'Impacto Regional', full: 'Desafio Livre de Impacto Regional', tc: 'tc-liv', bc: 'b-liv',
    crit: [
      { n: 'Relevância do problema e aderência extensionista', max: 20 },
      { n: 'MVP ou protótipo funcional online', max: 20 },
      { n: 'Impacto, validação, prospecção ou tentativa de implantação', max: 20 },
      { n: 'Uso responsável e produtivo de inteligência artificial', max: 10 },
      { n: 'Qualidade técnica, organização do código e documentação no GitHub', max: 10 },
      { n: 'Usabilidade, acessibilidade e experiência do usuário', max: 10 },
      { n: 'Pitch, clareza da apresentação e defesa da solução', max: 10 }
    ]
  },
  pio: {
    label: 'Pior Experiência UX', full: 'Desafio Pior Experiência de Usuário', tc: 'tc-pio', bc: 'b-pio',
    crit: [
      { n: 'Funcionamento do fluxo e conclusão da experiência pelo usuário', max: 20 },
      { n: 'Criatividade e coerência da experiência propositalmente ruim', max: 20 },
      { n: 'Explicação dos princípios de UX/UI violados no README', max: 20 },
      { n: 'MVP online, link público e facilidade de acesso por QR Code', max: 15 },
      { n: 'Proposta de melhoria ou versão corrigida do fluxo', max: 10 },
      { n: 'Pitch, clareza da apresentação e defesa da proposta', max: 10 },
      { n: 'Uso responsável de IA e documentação das ferramentas utilizadas', max: 5 }
    ]
  }
};

var CAT_KEYS = ['emp', 'liv', 'pio'];
