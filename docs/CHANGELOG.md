# Changelog — La Moda - Fabi

Formato baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/), versionamento por [SemVer](https://semver.org/lang/pt-BR/).

Tipos de entrada: `Adicionado`, `Modificado`, `Depreciado`, `Removido`, `Corrigido`, `Segurança`.

---

## [Unreleased]

### Adicionado
- Documentação inicial do projeto unificado (`ARQUITETURA.md`, `MIGRACAO.md`, `GUIA-DE-USO.md`, `CHANGELOG.md`, `ROADMAP.md`, `DECISOES.md`, `SECURITY.md`).
- Decisão arquitetural: hub unificado `lamoda-fabi` substituindo os repos `Fabi-Vendas-LM` e `Checklist-LM`.
- Stack definida: HTML/CSS/JS vanilla + Firebase (Firestore, Auth, Storage) + PWA + GitHub Pages.
- Auth com **provider único Google Sign-In** no MVP (conta Google identificada por `felipeshimoda@outlook.com`, compartilhada Felipe+Fabiana; Outlook é só identificador, a conta de auth é Google).
- Hospedagem: **Firebase Hosting** (substitui plano original de GitHub Pages, descartado por ausência de GitHub Pro).
- URL pública final: `https://lamoda-fabi.web.app/`.
- Projeto Firebase `lamoda-fabi` provisionado em `southamerica-east1`.
- Tema visual: dark + teal + glassmorphism (herdado do Checklist-LM antigo).
- Política de retenção: visitas mantidas sem expiração.

### Pendente
- Criar projeto Firebase `lamoda-fabi` (`southamerica-east1`).
- Criar repositório GitHub `dev-felipeshimoda/lamoda-fabi` (privado, apenas código-fonte).
- Inicializar Firebase Hosting (`firebase init hosting`).
- Implementar esqueleto: hub, login Google, navegação.
- Migrar Painel VE27 para módulo `/vendas/`.
- Migrar Checklist La Moda para módulo `/visitas/`.
- Importar 7 xlsx atuais para `vendas_ve27` no Firestore.
- Criar logo, favicon e ícones PWA (192, 512, maskable).

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
