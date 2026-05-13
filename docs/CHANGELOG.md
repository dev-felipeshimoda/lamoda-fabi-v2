# Changelog — La Moda - Fabi

Formato baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/), versionamento por [SemVer](https://semver.org/lang/pt-BR/).

Tipos de entrada: `Adicionado`, `Modificado`, `Depreciado`, `Removido`, `Corrigido`, `Segurança`.

---

## [Unreleased]

### Pendente
- Importar os 7 xlsx atuais para `vendas_ve27` no Firestore (Felipe via UI).
- Cutover dos repos antigos (`Fabi-Vendas-LM`, `Checklist-LM`) com redirect.
- Criar logo + favicon definitivos (substituindo o "F" placeholder).
- Smoke test em mobile (Android Chrome + iOS Safari).
- Comunicar nova URL para a Fabiana.

---

## [0.1.0] — 2026-05-13 — MVP funcional completo

Marco: primeiro MVP do **La Moda - Fabi** com paridade funcional aos dois apps antigos, num único hub unificado.

### Adicionado — PWA (Fase B parte 2)
- `manifest.webmanifest` com nome, short_name, ícones e shortcuts (Vendas / Visitas).
- `sw.js` — service worker cache-first do shell, passthrough Firebase, versionamento por `CACHE_VERSION`.
- `icons/icon-{192,512,maskable-512,180}.png` — gerados em PowerShell via System.Drawing.
- `<link rel="manifest">` + `apple-touch-icon` + registro do SW em todos os index.html.
- App instalável via "Adicionar à tela inicial" no celular.

### Adicionado — Módulo Vendas VE27 (Fase C)
- `vendas/vendas.js` (~280 linhas):
  - `onSnapshot` ao vivo de `vendas_ve27` (real-time).
  - Importador xlsx via SheetJS (CDN): parse aba `Base`, COL_MAP de 10 campos.
  - `normalize()` calcula `atingimentoPct`, `variacao`, `statusClass`.
  - `importRows()` em writeBatch de 500 + doc em `vendas_ve27_uploads`.
  - Backup do xlsx original em Cloud Storage (`backups/vendas_ve27/{ts}_{filename}`).
  - `clearAllData()` em batch.
  - Filtros: marca, escritório, cluster, status, busca razão social.
  - KPIs: meta total, venda total, atingimento %, contagem clientes.
  - Tabela top-200 ordenada por atingimento desc.
  - Modal de progresso para importação e limpeza.
- `vendas/vendas.css` — KPIs, filtros, tabela, status pills, atingimento bar, modal.

### Adicionado — Módulo Visitas Pós-Vendas (Fase D)
- `visitas/visitas.js` (~330 linhas):
  - SPA simples com `state.view` (`dashboard` / `form`).
  - Form com 5 seções (Identificação, Visual, Relacionamento, Diagnóstico, Alinhamento).
  - Pills estilizadas para radios e checkboxes.
  - `computeTags()` deriva: `com_reclamacao`, `sem_sinalizador`, `app_nao_instalado`, `vm_ruim`, `vendas_ruins`, `reclama_preco`.
  - Dashboard: 4 stats + filtros (região, busca, ordem) + 6 chips de tag + tabela.
  - Modal de detalhes com todos os campos + botão excluir.
  - Data default = hoje no form.
- `visitas/visitas.css` — pills, chips, qual-pills, tag-list, modal large.
- Suporte offline herdado do Firestore SDK (IndexedDB).

### Validado
- Login Google em conta whitelisted (`felipeshimoda@outlook.com`) → hub renderiza.
- Navegação Hub → Vendas → Hub → Visitas funciona com auth-gate.
- Vendas: módulo renderiza, KPIs zerados, badge "0 registros", importador pronto para o primeiro xlsx.
- Visitas: dashboard renderiza, "+ Nova visita" abre form, todas as 5 seções acessíveis.

---

## [0.0.2] — 2026-05-13 — Fase B parte 1 (esqueleto + auth)

### Adicionado
- **Web App** registrado no Firebase (`appId: 1:744123180995:web:83fc638560c3b58f7f3f76`).
- `shared/firebase.js` — init do SDK Firebase 11 (auth, firestore, storage) com `firebaseConfig` completo.
- `shared/auth.js` — `signInWithGoogle`, `signOut`, `onAuthChange` + upsert de `users/{uid}` no Firestore.
- `shared/auth-gate.js` — helper `requireAuth` que redireciona para raiz se não logado.
- `shared/styles.css` — design system completo (dark + teal + glassmorphism, mobile-first).
- `app.js` — orquestração login ↔ hub na raiz, com tratamento de erros (popup bloqueado, cancelado).
- `index.html` reescrito com templates `tpl-login` (botão Entrar com Google) e `tpl-hub` (avatar, nome, 2 cards, logout).
- `vendas/index.html` + `vendas/vendas.js` — placeholder com auth-gate, link voltar e signout.
- `visitas/index.html` + `visitas/visitas.js` — placeholder com auth-gate, link voltar e signout.

### Validado
- Login real com conta Google `felipeshimoda@outlook.com` via popup OAuth.
- Doc `users/{uid}` criado automaticamente no primeiro login com `role: 'admin'` e `provider: 'google'`.
- Firestore Rules com whitelist por email permitem leitura/escrita para a conta autorizada.
- Hub renderiza avatar + nome do Google e expõe os 2 cards de módulos.
- Auth-gate em `/vendas/` e `/visitas/` reconhece sessão e libera acesso.

---

## [0.0.1] — 2026-05-13 — Fase A completa

### Adicionado
- Projeto Firebase `lamoda-fabi` provisionado em `southamerica-east1`.
- Authentication com **Google Sign-In** habilitado (nome público "La Moda - Fabi", email de suporte `felipeshimoda@outlook.com`).
- Cloud Firestore em modo produção, banco `(default)` em São Paulo.
- Cloud Storage em modo produção, bucket `gs://lamoda-fabi.firebasestorage.app` em US-EAST1 (always-free).
- Upgrade do projeto para plano **Blaze** (necessário para Storage; uso projetado dentro do always-free).
- Repositório GitHub privado `dev-felipeshimoda/lamoda-fabi` criado e primeiro `main` empurrado.
- Estrutura local do repo: `firebase.json`, `.firebaserc`, `firebase/{firestore,storage}.rules`, `firebase/firestore.indexes.json`, `index.html` placeholder, `.gitignore`, `README.md`.
- Firestore Rules e Storage Rules com **whitelist por email** (`felipeshimoda@outlook.com`) deployadas.
- Hospedagem em **Firebase Hosting**: placeholder publicado em `https://lamoda-fabi.web.app/`.
- Documentação inicial do projeto unificado (`ARQUITETURA.md`, `MIGRACAO.md`, `GUIA-DE-USO.md`, `CHANGELOG.md`, `ROADMAP.md`, `DECISOES.md`, `SECURITY.md`).

### Decisões
- Stack definida: HTML/CSS/JS vanilla + Firebase (Firestore, Auth, Storage, Hosting) + PWA.
- Hub unificado `lamoda-fabi` substituindo os repos antigos `Fabi-Vendas-LM` e `Checklist-LM`.
- Auth com **provider único Google Sign-In** no MVP (conta Google identificada por `felipeshimoda@outlook.com`).
- Hospedagem **Firebase Hosting** (substitui plano original de GitHub Pages, inviável sem GitHub Pro).
- Bucket Storage em US-EAST1 always-free em vez de São Paulo regional (custo zero pra MVP).
- Tema visual: dark + teal + glassmorphism (herdado do Checklist-LM antigo).
- Política de retenção: visitas mantidas sem expiração.

---

## [0.0.0] — 2026-05-13

### Adicionado
- Workspace inicial (`C:\00_Felipe\Claude\01_Fabiana`) com configuração de Claude Code.
- Pasta `docs/` com contextos dos dois projetos antigos para referência (`Contexto do projeto — Painel VE27/`, `Contexto do projeto — La Moda Pós-Vendas/`).
- 7 arquivos `.xlsx` de exemplo da coleção VE27 + 1 `.pptx` do roteiro pós-vendas.

---

## Convenção para entradas futuras

Quando o projeto começar a versionar releases (a partir de `0.1.0`):

```
## [0.1.0] — YYYY-MM-DD
### Adicionado
- Feature X (#issue ou descrição curta)
### Modificado
- Comportamento Y agora faz Z em vez de W
### Corrigido
- Bug que causava ... em ...
### Segurança
- Atualizadas Firestore Rules para ...
```

**Regra:** toda mudança que afeta a Fabiana entra aqui. Mudanças internas só (refactor sem efeito visível) podem ficar só no git log.
