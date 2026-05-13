# Decisões arquiteturais — La Moda - Fabi

> Registro leve de ADRs (Architecture Decision Records). Cada decisão importante vira uma entrada com **contexto / decisão / consequências / alternativas**.
> Quando uma decisão for revogada, manter o ADR antigo e adicionar um novo com link cruzado.

---

## ADR-001 — Stack vanilla (sem framework JS)

**Status:** aceito · **Data:** 2026-05-13

### Contexto
Os dois apps antigos foram escritos em HTML/CSS/JS puro, sem framework. O codebase resultante é simples de versionar (single-file) e deployar (GitHub Pages sem build).

### Decisão
**Manter vanilla** no v1.0. Sem React/Vue/Svelte. Módulos ESM nativos para organização.

### Consequências
- ✅ Zero build, zero `node_modules`, deploy é `git push`.
- ✅ Onboarding técnico ~0 (qualquer dev web entende em 1h).
- ⚠️ Manipulação de DOM manual. Aceitável até ~3000 linhas; depois fica frágil.
- ⚠️ Sem ecossistema de componentes ready-made.

### Alternativas consideradas
- **React + Vite:** ergonômico, mas adiciona build step e complica deploy no Pages privado.
- **Svelte:** compila para vanilla, perfeito tecnicamente, mas curva pra você + build step.
- **Lit (web components):** meio-termo, considerado mas adia decisão.

### Revisar quando
Codebase passar de ~3000 linhas **ou** aparecer 3+ módulos novos além de Vendas/Visitas.

---

## ADR-002 — Backend único Firebase

**Status:** aceito · **Data:** 2026-05-13

### Contexto
Painel VE27 usava GitHub Contents API + xlsx; Checklist usava (na descrição) Firestore. Manter dois backends complica auth, security e crescimento.

### Decisão
**Consolidar tudo em Firebase** (Firestore + Auth + Storage). Os xlsx do Painel viram input → parseados client-side → escritos como docs em `vendas_ve27`. Originais ficam em Cloud Storage como backup.

### Consequências
- ✅ Auth única, regras granulares, queries indexadas, real-time, offline.
- ✅ Destrava features que eram impossíveis antes (comparativo VE26/VE27, fotos, histórico por loja).
- ⚠️ Perde "Git como histórico dos xlsx". Mitigação: backup em Storage + doc `vendas_ve27_uploads/` com auditoria.
- ⚠️ Vendor lock-in moderado (rules + SDK Firestore). Migração futura para outro DB exigiria reescrever camada de dados.

### Alternativas consideradas
- **Manter dois backends:** rejeitado — viola pilar Build (manutenção dupla) e Security (dois modelos de auth).
- **Backend próprio (Cloudflare Worker + D1/KV):** mais flexível, mas exige ops e custo previsível. Excessivo pra 2 usuários.
- **Supabase:** Postgres é tentador (joins, SQL), mas ecossistema mobile/offline do Firebase é mais maduro.

### Revisar quando
Custos passarem de R$ 50/mês **ou** aparecer demanda de queries SQL que o Firestore não atende bem.

---

## ADR-003 — Auth com Google Sign-In único (MVP)

**Status:** aceito · **Data:** 2026-05-13

### Contexto
Felipe e Fabiana compartilham uma única **conta Google** com identificador `felipeshimoda@outlook.com` — o email é Outlook, mas a conta de autenticação é Google (descobriu-se isso ao logar no Firebase Console, que aceita só conta Google). Felipe é o dev/admin técnico, Fabiana é a operadora. No MVP há **um único usuário autenticado**.

### Decisão
Ativar **apenas Google Sign-In** no Firebase Auth. UI mostra um único botão "Entrar com Google". Sem Microsoft, sem email link, sem email/senha.

### Consequências
- ✅ Login 1-click, sem senha customizada do app.
- ✅ MFA herdado da conta Google.
- ✅ Sem secret de senha pra guardar/rotacionar.
- ✅ Setup minimal: 1 toggle no Firebase Console, sem config OAuth externa.
- ⚠️ Dependência de um único IdP. Se Google tiver downtime, app fica inacessível.
- ⚠️ Sem distinção operacional entre Felipe e Fabiana — quem entra é "o usuário". Para o MVP é OK; rules tratam o único usuário como admin.

### Alternativas consideradas
- **Microsoft Sign-In:** considerado inicialmente quando se acreditava que a conta era Microsoft. Descartado ao descobrir que a conta é Google.
- **Google + Microsoft simultâneos:** rejeitado por falta de 2ª conta no MVP. Adicionar Microsoft é trivial quando aparecer.
- **Email link (passwordless):** mais atrito do que OAuth com conta já logada no browser.
- **Email/senha:** mais atrito, senha pra perder, sem MFA por padrão.

### Revisar quando
Fabiana ganhar conta própria (corporativo La Moda, ou outra Google) → adicionar 2º provider se necessário e habilitar role doc (`viewer`/`admin`) que já está documentado em `ARQUITETURA.md` §5.

---

## ADR-004 — Role via documento Firestore (em vez de Custom Claims)

**Status:** aceito (MVP) · **Data:** 2026-05-13

### Contexto
Precisamos distinguir `viewer` (Fabiana) de `admin` (Felipe) nas regras. Firebase oferece duas formas: Custom Claims (no token JWT) ou documento Firestore lido pelas rules.

### Decisão
**Role via doc `users/{uid}.role`** no Firestore. Promoção manual via Firebase Console.

### Consequências
- ✅ Sem precisar de Cloud Function (que exige plano Blaze).
- ✅ Mudança de role reflete imediatamente sem refresh de token.
- ⚠️ Leitura extra em quase toda regra (`get(/users/{uid})`). Para 2 usuários, irrelevante; para 100+, somatório vira custo real.

### Alternativas consideradas
- **Custom Claims:** mais performático (claim já vem no token), mas exige Cloud Function pra setar → exige Blaze → pequeno custo fixo.
- **Hard-coded UID no client:** simples mas frágil; se mudar de provider o UID muda.

### Revisar quando
Base de usuários passar de ~10 **ou** custos de leitura Firestore ficarem visíveis no dashboard.

---

## ADR-005 — Multi-page no mesmo repo (em vez de SPA)

**Status:** aceito · **Data:** 2026-05-13

### Contexto
Hub tem dois módulos distintos (Vendas e Visitas) com pouca sobreposição funcional.

### Decisão
**Multi-page** no mesmo repo: `index.html` (hub), `vendas/index.html`, `visitas/index.html`. Roteamento via URL nativa do navegador.

### Consequências
- ✅ Cada módulo carrega só o JS que precisa (code-splitting "de graça").
- ✅ Falha em um módulo não derruba o outro.
- ✅ Bookmark direto em `/vendas/` ou `/visitas/` funciona.
- ⚠️ Repetição mínima de chrome HTML (resolvida com `shared/nav.js` injetando header).

### Alternativas consideradas
- **SPA com client-side routing:** elegante mas exige framework ou roteador caseiro.
- **Single-file gigante (abas internas):** consistente com origem do Painel VE27, mas arquivo passa de 5k linhas rápido.

### Revisar quando
Módulos compartilharem >50% do código de UI.

---

## ADR-006 — PWA em vez de app nativo

**Status:** aceito · **Data:** 2026-05-13

### Contexto
Fabiana usa o app em campo (loja), com conectividade variável. Quer ícone na tela inicial.

### Decisão
**PWA** com manifest + service worker. Sem app nativo iOS/Android.

### Consequências
- ✅ Um codebase, instala em qualquer dispositivo via "Adicionar à tela inicial".
- ✅ Sem submission a App Store / Play Store.
- ✅ Updates instantâneos (basta `git push`).
- ⚠️ iOS limita PWA (notif push fraca antes do iOS 16.4; storage menor que Android).
- ⚠️ Discoverability: ninguém vai descobrir o app via App Store, mas isso não é objetivo.

### Alternativas consideradas
- **App nativo (React Native / Flutter):** overkill para 1 usuária final.
- **Hybrid (Capacitor):** intermediário; reavaliar se PWA esbarrar em limitação séria.

### Revisar quando
Surgir necessidade de feature nativa (câmera com edição on-device, biometria customizada, background sync agressivo).

---

## ADR-007 — Hospedagem em GitHub Pages

**Status:** substituído por **ADR-009** · **Data:** 2026-05-13

### Contexto
Premissa inicial era reaproveitar GitHub Pages como nos repos antigos. Descoberto depois que isso exige plano **Pro+ pra repo privado**, indisponível.

### Decisão original
~~GitHub Pages hospeda o frontend; Firebase só backend.~~

### Por que foi revertida
Sem GitHub Pro, Pages em repo privado **não funciona**. Tornar o repo público é alternativa, mas adiciona exposição desnecessária de código-fonte. Decidimos por Firebase Hosting (ver ADR-009).

---

## ADR-009 — Hospedagem em Firebase Hosting

**Status:** aceito · **Data:** 2026-05-13 · **Substitui:** ADR-007

### Contexto
Sem GitHub Pro disponível, Pages em repo privado fica inviável. Precisamos de hospedagem free, com TLS, que aceite repo privado e seja simples de operar.

### Decisão
Hospedar o frontend em **Firebase Hosting**. Repo GitHub `lamoda-fabi` continua privado, mas serve apenas como histórico de versionamento — não publica nada. Deploy via `firebase deploy`.

### Consequências
- ✅ Um único vendor para frontend + backend (Firestore, Auth, Storage, Hosting).
- ✅ `firebase deploy` publica frontend + rules + indexes num só comando.
- ✅ TLS automático, CDN global, custom domain grátis quando precisarmos.
- ✅ Free tier: 10 GB de storage, 360 MB/dia de bandwidth — bem suficiente.
- ✅ Repo privado mantido sem custo (não exige Pages).
- ⚠️ Deploy desacoplado do git push — precisa hábito de rodar `firebase deploy` após commit (ou automatizar via GitHub Actions depois).

### Alternativas consideradas
- **Vercel:** ótimo DX (PR previews, dashboard), repo privado free. Rejeitado por adicionar vendor extra sem ganho material no caso de uso atual.
- **Cloudflare Pages:** free unlimited, suporta privado. Igualmente válido; Firebase Hosting venceu pela consolidação com o resto da stack.
- **Netlify:** mesmo caso.
- **Tornar o repo público + GitHub Pages:** expõe código-fonte sem necessidade. Rejeitado.

### Revisar quando
- Aparecer demanda real de PR previews (Vercel/Netlify ganham aqui).
- Ou quando custom domain virar prioridade e Firebase Hosting tiver fricção (improvável — suporte é nativo).

---

## ADR-008 — xlsx importado para Firestore (em vez de lido direto)

**Status:** aceito · **Data:** 2026-05-13

### Contexto
Painel VE27 antigo lia xlsx diretamente do GitHub a cada load. Funciona, mas:
- Impossível filtrar/query no servidor (tudo vai pro client).
- Não dá pra comparar safras (cada xlsx é um silo).
- Re-render obrigatório a cada acesso.

### Decisão
Importar xlsx → parsear no client → **persistir como docs no Firestore** (`vendas_ve27`). xlsx original vira backup em Cloud Storage.

### Consequências
- ✅ Queries indexadas (filtros por marca, cluster, atingimento em tempo real).
- ✅ Real-time updates sem reload.
- ✅ Possível agregar safras (`vendas_ve26`, `vendas_ve28`).
- ⚠️ Operação de import é manual (admin sobe xlsx pela UI). Não é trigger automático.
- ⚠️ Re-import sobrescreve docs (idempotente via hash de `marca + razao`). Edição manual feita entre imports é perdida.

### Alternativas consideradas
- **Ler xlsx direto do Storage a cada load:** simples, mas reproduz limitação do painel antigo.
- **Cloud Function que dispara em upload:** elegante, mas exige Blaze + lógica de parser server-side.

### Revisar quando
ERP virar acessível por API (aí elimina o passo manual).

---

## Template para novos ADRs

```
## ADR-XXX — Título curto da decisão

**Status:** proposto | aceito | substituido por ADR-YYY · **Data:** YYYY-MM-DD

### Contexto
Qual problema/restrição estamos resolvendo?

### Decisão
O que vamos fazer.

### Consequências
- ✅ Boas
- ⚠️ Tradeoffs / riscos

### Alternativas consideradas
- O que avaliamos e por que não escolhemos.

### Revisar quando
Sinal claro que dispararia uma reavaliação.
```
