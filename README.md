# Hackscore

Sistema de avaliação por banca para hackathons e eventos competitivos.
Avaliadores pontuam equipes por critério em tempo real — o resultado vai para o telão com suspense, pódio e confete.

**HTML/CSS/JS puro · Supabase · sem framework · sem build**

---

## Funcionalidades

- **Admin** — cadastra equipes (em lote com `;`), define código de acesso da banca, acompanha resultados em tempo real e exporta CSV
- **Avaliador** — acessa pelo código + nome, avalia cada equipe por critério, pode deixar observações; sessão sobrevive a recarregar a página
- **Pódio (telão)** — revela os colocados com suspense, tambores, fanfarra e confete; nunca há empate (desempate automático em cascata)
- **QR Code** — gerado automaticamente com o link de acesso direto para os avaliadores
- **Link rápido** — `?code=SEUCÓDIGO` pré-preenche o campo de código no login do avaliador

---

## Como usar

### 1. Banco de dados (Supabase)

1. Crie um projeto em [supabase.com](https://supabase.com) (plano gratuito).
2. Antes de executar, abra [`supabase/schema.sql`](supabase/schema.sql) e troque a senha padrão na linha:
   ```sql
   insert into public.config (key, value) values ('admin_pwd', '123456')
   ```
3. **SQL Editor** → cole e execute o arquivo inteiro. O script é idempotente — pode ser re-executado sem perder dados.
4. **Settings → API** → copie a *Project URL* e a *anon public key*.

### 2. Configuração

Edite `js/config.js` — é o único arquivo que você precisa mudar:

```js
var CONFIG = {
  SUPABASE_URL: 'https://SEU-PROJETO.supabase.co',
  SUPABASE_ANON_KEY: 'sua-chave-anonima',
  EVENT_NAME: 'Nome do Evento',
  EVENT_SUB:  'Local ou subtítulo',
  POLL_MS: 5000
};

// Defina suas categorias e critérios:
var CATS = {
  web: {
    label: 'Web',           // nome curto (chips e abas)
    full:  'Categoria Web', // nome completo (telão)
    tc: 'tc-emp',           // classe CSS da aba — use tc-emp, tc-liv ou tc-pio
    bc: 'b-emp',            // classe CSS do badge — use b-emp, b-liv ou b-pio
    crit: [
      { n: 'Usabilidade',    max: 30 },
      { n: 'Funcionalidade', max: 40 },
      { n: 'Apresentação',   max: 30 }
    ]
  }
};
var CAT_KEYS = ['web'];
```

> **`tc` e `bc`** aceitam os valores `tc-emp / b-emp`, `tc-liv / b-liv` ou `tc-pio / b-pio` — classes já definidas no CSS. Você pode criar novas chaves de categoria com qualquer nome, mas deve usar uma dessas combinações (ou adicionar a sua própria em `css/styles.css`).

> A soma dos `max` define o total de pontos — o sistema calcula automaticamente.

> Para testar com dados fictícios, execute também [`supabase/seed_demo.sql`](supabase/seed_demo.sql) após o schema.

### 3. Deploy

Publique a pasta em qualquer host estático:

```bash
# Vercel
npx vercel

# GitHub Pages
# basta apontar para a raiz do repo

# Local
npx serve .
```

Todos (admin, avaliadores, telão) acessam a mesma URL.

---

## Estrutura

```
index.html          telas de admin e avaliador
telao.html          pódio (abre em aba separada, projete no telão)
css/styles.css      estilos
js/config.js        ← edite aqui: Supabase, evento, categorias, critérios
js/api.js           acesso ao banco (só este arquivo conhece o Supabase)
js/store.js         estado + regras de negócio (médias, ranking, desempate)
js/ui.js            navegação, modais, escape de HTML
js/admin.js         painel do administrador
js/aval.js          painel do avaliador
js/telao.js         animação do pódio
js/sound.js         efeitos sonoros via Web Audio API (sem arquivos externos)
js/app.js           inicialização e polling
supabase/schema.sql banco de dados
```

Arquitetura em camadas: **HTML → módulos de tela → Store → Api**. Nenhuma tela fala com o banco diretamente.

---

## Segurança

- Senha do admin e código da banca ficam **somente no banco** — não aparecem no código-fonte
- Validação via funções Postgres `SECURITY DEFINER`
- RLS: a chave anônima só lê; escrita exige senha ou código válido
- Nomes passam por escape de HTML (anti-XSS)

---

## Desempate automático

O sistema nunca termina em empate. A cascata de regras, da mais justa para o último recurso:

1. Maior média total
2. Maior média no critério de maior peso (e assim por diante)
3. Maior nota mínima entre avaliadores
4. Menor desvio padrão (mais consistência entre avaliadores)
5. Ordem de cadastro da equipe

---

## Roadmap

- [ ] Editor de categorias e critérios direto no painel admin (sem editar `config.js`)
- [ ] Suporte a múltiplos eventos no mesmo banco

---

## Origem

Criado para o **Hackathon Extensionista IFRO Ariquemes 2026/1** e evoluído para uso genérico.

---

## Créditos

Desenvolvido por [Mylena](https://www.linkedin.com/in/mylena-viana-nunes/)
