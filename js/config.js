/* Configuração geral — preencha com os dados do seu projeto Supabase
   (Painel Supabase → Settings → API). */
'use strict';

var CONFIG = {
  SUPABASE_URL: 'https://wfrzphrxhctvqguubxge.supabase.co',      // ex: https://abcdefgh.supabase.co
  SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndmcnpwaHJ4aGN0dnFndXVieGdlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODExNDE2NDIsImV4cCI6MjA5NjcxNzY0Mn0.cU1nULoSbZJwtJIQSu43K_BLxJ3D0fnElICdZnNj0Zs',
  // a senha do admin fica no banco (tabela config) — veja supabase/schema.sql
  POLL_MS: 5000 // intervalo de atualização automática das telas
};

/* Categorias e critérios do edital */
var CATS = {
  emp: {
    label: 'Empresa e Comunidade', full: 'Desafio Empresa e Comunidade', tc: 'tc-emp', bc: 'b-emp',
    crit: [
      { n: 'Relevância do problema e aderência extensionista', max: 20 },
      { n: 'MVP ou protótipo funcional online', max: 20 },
      { n: 'Impacto, validação, prospecção ou tentativa de implantação', max: 20 },
      { n: 'Uso responsável e produtivo de inteligência artificial', max: 10 },
      { n: 'Qualidade técnica, organização do código e documentação', max: 10 },
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
      { n: 'Qualidade técnica, organização do código e documentação', max: 10 },
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
