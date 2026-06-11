# Sistema de Avaliação — Hackathon Extensionista IFRO Ariquemes 2026/1

Sistema web para avaliação de equipes por banca, com revelação dos vencedores no telão.
HTML/CSS/JS puro (sem framework, sem build) + **Supabase** como banco de dados —
as notas dos avaliadores sincronizam entre todos os dispositivos em tempo real (polling de 5s).

## Estrutura do projeto

```
index.html          telas de admin e avaliador
telao.html          página da projeção (abre em aba separada)
css/styles.css      estilos (tokens → base → componentes → telas → telão)
js/config.js        credenciais do Supabase, categorias e critérios do edital
js/api.js           camada de acesso a dados — só este arquivo conhece o Supabase
js/store.js         estado + regras de negócio (médias, ranking com desempate automático, progresso)
js/ui.js            utilitários de interface (navegação, escape de HTML, mensagens)
js/admin.js         telas do administrador
js/aval.js          telas do avaliador (login, lista, formulário de notas)
js/telao.js         lógica da revelação (usada por telao.html)
js/sound.js         efeitos sonoros gerados via Web Audio API (sem arquivos)
js/app.js           inicialização, eventos e atualização automática
supabase/schema.sql script de criação das tabelas e funções
```

Arquitetura em camadas: **HTML (visão) → módulos de tela → Store (negócio) → Api (dados)**.
Nenhuma tela fala com o banco diretamente, e a Api não conhece o DOM.

## Configuração do Supabase (uma vez)

1. Crie um projeto em [supabase.com](https://supabase.com) (plano gratuito).
2. **SQL Editor** → cole e execute o [`supabase/schema.sql`](supabase/schema.sql) inteiro.
   O script é idempotente (pode re-executar sem perder dados) e cria tabelas,
   políticas RLS e funções. Para reutilizar em outro evento, basta trocar a
   senha padrão no bloco "Valores iniciais".
3. **Settings → API** → copie a *Project URL* e a *anon public key* para
   `js/config.js` (`SUPABASE_URL` e `SUPABASE_ANON_KEY`).
4. Publique a pasta em qualquer host estático (Vercel, GitHub Pages, Netlify)
   ou rode local com `npx serve`. Todos acessam a mesma URL.

## Perfis de acesso (mesma URL)

Na home (e na aba Resultados do admin) há a tela **"Como funciona o sistema?"** com as
dúvidas frequentes: cálculo das médias, regras de desempate, notas travadas, categorias
e critérios (gerados automaticamente do `config.js`) e funcionamento da revelação.

**Admin (professor)** — senha definida no banco (padrão `123456`; altere na tabela
`config` ou no `schema.sql` antes de executar)
- Cadastra equipes por categoria — uma por vez ou várias com `;` (ex: `Alpha;Beta;Gama`)
- Define o código de acesso da banca
- Acompanha resultados em tempo real, com média por critério
- Vê, por avaliador, o progresso **por categoria** (chip verde com ✓ quando concluiu a categoria)
- **Copiar ranking**: gera texto formatado com medalhas e médias, pronto para colar no WhatsApp/grupos
- **Copiar análise**: por equipe nos detalhes de critérios — breakdown individual para enviar como feedback
- **Exporta CSV** com todas as notas (ata/backup do resultado; abre direto no Excel)
- **Zona de perigo** (aba Avaliadores, visível só quando há equipes): reset total — apaga equipes e avaliações (exige digitar APAGAR; senha e código da banca são preservados)
- Abre a tela de revelação em **nova aba** direto pela aba Resultados (o painel do admin não aparece na projeção)

**Avaliador (banca)** — código da banca + nome
- Avalia cada equipe pelos critérios do edital; campos de nota começam **vazios** (placeholder 0)
- Confirmação antes do envio; notas bloqueadas após envio (o banco impede reenvio: restrição `unique`)
- Sessão sobrevive a recarregar a página (sessionStorage)

**Telão** (`telao.html`) — escolhe a categoria e revela o **pódio**: 3º → 2º → 1º, cada um com
suspense (tambores animados + **som** via Web Audio) e o campeão com fanfarra e confete.
Ao final, mostra a classificação até o 5º lugar com ouro/prata/bronze.
Há botão de mudo (canto superior). Nunca há empate — ver desempate automático abaixo.

## Regras de negócio

- Múltiplos avaliadores → o sistema calcula a **média** das notas
- Vencedor por categoria (não há ranking geral); pontuações 100% separadas por categoria
- 3 categorias: *Empresa e Comunidade* e *Impacto Regional* (mesmos 7 critérios, 100 pts)
  e *Pior Experiência de Usuário* (critérios próprios, 100 pts) — ver `js/config.js`
- **Desempate automático (nunca há empate)** — cascata, da regra mais justa para o último recurso:
  1. média total;
  2. maior média no critério de maior peso, depois no seguinte, e assim por diante;
  3. maior nota mínima entre avaliadores (a equipe que convenceu até o avaliador mais rigoroso);
  4. menor desvio padrão dos totais (avaliação mais consistente entre os avaliadores);
  5. ordem de cadastro da equipe (determinístico, garante posição única sempre).
  Equipes desempatadas aparecem com a tag "desempate" no painel de resultados do admin,
  para o professor saber explicar o critério se questionado.
- A revelação avisa se houver equipe sem nenhuma avaliação

## Segurança

- A senha do admin e o código da banca ficam **somente no banco** — não aparecem no
  código-fonte do site. A validação acontece em funções Postgres (`security definer`).
- Senha e código **não diferenciam maiúsculas de minúsculas** (e ignoram espaços nas
  pontas): `abc123` e `ABC123` funcionam igual — menos erro de digitação no celular.
- RLS: a chave anônima (pública) só consegue **ler** equipes e avaliações. Inserir nota
  exige o código da banca válido; criar/remover equipes, trocar o código e remover
  avaliadores exigem a senha do admin. Notas nunca podem ser editadas ou apagadas pela
  API pública.
- Nomes digitados passam por escape de HTML antes de ir para a tela (anti-XSS).
- Limite restante (aceito para o escopo do evento): quem tiver o código da banca pode
  avaliar com qualquer nome — divulgue o código apenas aos membros da banca, na hora.
