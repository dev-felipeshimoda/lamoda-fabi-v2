# Changelog — La Moda - Fabi

Formato baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/), versionamento por [SemVer](https://semver.org/lang/pt-BR/).

Tipos de entrada: `Adicionado`, `Modificado`, `Depreciado`, `Removido`, `Corrigido`, `Segurança`.

---

## [Unreleased]

### Pendente
- Registrar Web App no Firebase Console e capturar `firebaseConfig` para `shared/firebase.js`.
- Implementar esqueleto funcional: hub (`index.html` real), `shared/auth.js`, `shared/nav.js`, `shared/styles.css`.
- Login com Google Sign-In ligado ao Firebase Auth.
- Migrar Painel VE27 para módulo `/vendas/` (importador xlsx → Firestore + painel visualização).
- Migrar Checklist La Moda para módulo `/visitas/` (form 5 seções + dashboard).
- PWA: `manifest.webmanifest`, `sw.js`, ícones 192/512/maskable.
- Importar os 7 xlsx atuais para `vendas_ve27` no Firestore.
- Cutover dos repos antigos (`Fabi-Vendas-LM`, `Checklist-LM`) com redirect.
- Criar logo + favicon.

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
