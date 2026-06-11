# Sistema de Avaliação — Hackathon Extensionista IFRO Ariquemes 2026/1

Sistema web para avaliação de equipes por banca, com revelação dos vencedores no telão.
HTML/CSS/JS puro (sem framework, sem build) + **Supabase** como banco de dados —
as notas dos avaliadores sincronizam entre todos os dispositivos em tempo real (polling de 5s).

## Estrutura do projeto

```
index.html          marcação das telas (sem lógica)
css/styles.css      estilos (tokens → base → componentes → telas → telão)
js/config.js        credenciais do Supabase, senha do admin, categorias e critérios do edital
js/api.js           camada de acesso a dados — só este arquivo conhece o Supabase
js/store.js         estado + regras de negócio (médias, ranking com empate, progresso)
js/ui.js            utilitários de interface (navegação, escape de HTML, mensagens)
js/admin.js         telas do administrador
js/aval.js          telas do avaliador (login, lista, formulário de notas)
js/telao.js         tela de revelação
js/app.js           inicialização, eventos e atualização automática
supabase/schema.sql script de criação das tabelas
```

Arquitetura em camadas: **HTML (visão) → módulos de tela → Store (negócio) → Api (dados)**.
Nenhuma tela fala com o banco diretamente, e a Api não conhece o DOM.

## Como configurar (faça uma vez)

1. Crie um projeto gratuito em [supabase.com](https://supabase.com).
2. No painel, abra **SQL Editor** e execute o conteúdo de `supabase/schema.sql`.
3. Em **Settings → API**, copie a *Project URL* e a *anon public key*.
4. Cole as duas em `js/config.js` (`SUPABASE_URL` e `SUPABASE_ANON_KEY`).
5. Publique a pasta em qualquer host estático (GitHub Pages, Netlify, Vercel)
   ou rode local com `npx serve`. Todos acessam a mesma URL.

## Perfis de acesso (mesma URL)

**Admin (professor)** — senha definida no banco (padrão `123`, altere em `supabase/schema.sql` antes de executar)
- Cadastra equipes por categoria; define o código de acesso da banca
- Acompanha resultados em tempo real, com média por critério
- Abre a tela de revelação para o telão (Esc sai do telão)

**Avaliador (banca)** — código da banca + nome
- Avalia cada equipe pelos critérios do edital, com confirmação antes do envio
- Notas bloqueadas após envio (o banco impede reenvio: restrição `unique`)
- Sessão sobrevive a recarregar a página (sessionStorage)

**Telão** — revelação do último colocado ao campeão, com suspense, confete e ranking final.
Empates são tratados: equipes com a mesma média dividem a posição.

## Regras de negócio

- Múltiplos avaliadores → o sistema calcula a **média** das notas
- Vencedor por categoria (não há ranking geral); pontuações 100% separadas por categoria
- 3 categorias: *Empresa e Comunidade* e *Impacto Regional* (mesmos 7 critérios, 100 pts)
  e *Pior Experiência de Usuário* (critérios próprios, 100 pts) — ver `js/config.js`
- **Desempate automático**: em caso de mesma média total, vence quem tiver maior média
  no critério de maior peso; persistindo, passa ao próximo critério, e assim por diante.
  Equipes desempatadas assim aparecem com a tag "desempate" no painel de resultados.
  Só permanece empate se as notas forem idênticas em todos os critérios.
- A revelação avisa se houver equipe sem nenhuma avaliação

## Segurança

- A senha do admin e o código da banca ficam **somente no banco** — não aparecem no
  código-fonte do site. A validação acontece em funções Postgres (`security definer`).
- RLS: a chave anônima (pública) só consegue **ler** equipes e avaliações. Inserir nota
  exige o código da banca válido; criar/remover equipes, trocar o código e remover
  avaliadores exigem a senha do admin. Notas nunca podem ser editadas ou apagadas pela
  API pública.
- Nomes digitados passam por escape de HTML antes de ir para a tela (anti-XSS).
- Limite restante (aceito para o escopo do evento): quem tiver o código da banca pode
  avaliar com qualquer nome — divulgue o código apenas aos membros da banca, na hora.
