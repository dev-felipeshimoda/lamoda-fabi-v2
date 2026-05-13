# Migração — Para "La Moda - Fabi"

> Plano executável de cutover. Cada etapa tem critério de saída claro.
> Última atualização: 2026-05-13. Status: **planejamento**.

---

## 1. Estado atual vs estado-alvo

### Hoje
| App | Repo (privado) | URL | Backend |
|---|---|---|---|
| Painel VE27 | `dev-felipeshimoda/Fabi-Vendas-LM` | `…/Fabi-Vendas-LM/` | GitHub Contents API + xlsx em `/data` |
| Checklist La Moda | `dev-felipeshimoda/Checklist-LM` | `…/Checklist-LM/` | Firebase Firestore (`lamoda-check-posvendas` — descrito mas nunca provisionado) |

### Amanhã
| Componente | Recurso |
|---|---|
| App único | `dev-felipeshimoda/lamoda-fabi` (privado, **só código**) → `https://lamoda-fabi.web.app/` |
| Hospedagem | **Firebase Hosting** (não GitHub Pages — Pro+ indisponível) |
| Backend | Firebase project `lamoda-fabi` (`southamerica-east1`) |
| Auth | **Google Sign-In** via Firebase Auth (conta Google única — identificador `felipeshimoda@outlook.com`) |
| Dados de vendas | Collection `vendas_ve27` no Firestore (importada dos 7 xlsx atuais) |
| Dados de visitas | Collection `visitas` no Firestore (zero hoje — não havia Firebase real) |
| Backups | Cloud Storage `gs://lamoda-fabi.appspot.com/backups/vendas_ve27/` |

---

## 2. Sequência de etapas

### Fase A — Setup de infraestrutura (~1h, Felipe)

#### A1. Criar projeto Firebase
1. Console Firebase → "Adicionar projeto" → nome **`lamoda-fabi`** → região **`southamerica-east1`**.
2. Desativar Google Analytics no primeiro setup (não precisamos no MVP).
3. Anotar `projectId`, `apiKey`, `authDomain`, `appId` (vão para `shared/firebase.js`).
4. **Critério de saída:** projeto aparece no console; consigo abrir.

#### A2. Ativar Authentication (Google único no MVP)
1. Authentication → "Get started" (na 1ª vez) → Sign-in method → habilitar apenas **Google**.
   - Selecionar email de suporte do projeto.
   - Salvar. Sem config extra.
2. Verificar domínios autorizados (Settings → Authorized domains): `localhost` já está; adicionar manualmente `lamoda-fabi.web.app` e `lamoda-fabi.firebaseapp.com` se não estiverem.
3. **Critério de saída:** login com a conta Google `felipeshimoda@outlook.com` funciona em página de teste; cria doc em `users/{uid}` com `provider: 'google'` e `role: 'admin'`.

#### A3. Criar Firestore Database
1. Firestore Database → criar em **modo de produção**.
2. Região: **`southamerica-east1`** (mesma do projeto).
3. **Critério de saída:** database criado, vazio.

#### A4. Criar Cloud Storage bucket
1. Storage → começar.
2. Mesma região.
3. **Critério de saída:** bucket default existe.

#### A5. Criar repo `lamoda-fabi` privado (apenas código-fonte)
1. GitHub → New repo → **privado** → nome `lamoda-fabi`.
2. **Não ativar Pages** (Pages em privado exige plano Pro, indisponível). O repo serve só de versionamento do código; o site é publicado via Firebase Hosting.
3. **Critério de saída:** repo existe, `git clone` funciona.

#### A6. Instalar Firebase CLI local
```powershell
npm install -g firebase-tools
firebase login
firebase use lamoda-fabi
```
**Critério de saída:** `firebase projects:list` mostra `lamoda-fabi`.

#### A7. Inicializar Firebase Hosting + rules
1. `cd` para a raiz do repo `lamoda-fabi` (após `git clone`).
2. `firebase init` → marcar **Hosting**, **Firestore**, **Storage**.
   - Public directory: `.` (raiz do repo).
   - Single-page app: **No** (estamos multi-page).
   - Sobrescrever `index.html`: **No** (vamos criar do zero).
   - Rules files: usar caminhos `firebase/firestore.rules`, `firebase/storage.rules`, `firebase/firestore.indexes.json`.
3. Confirmar que `firebase.json` foi gerado conforme template em `ARQUITETURA.md` §9.
4. Commit + push.
5. `firebase deploy --only hosting` → publica um `index.html` placeholder.
6. **Critério de saída:** `https://lamoda-fabi.web.app/` retorna 200 com a página placeholder.

### Fase B — Esqueleto do frontend (~2h, Claude+Felipe)

#### B1. Estrutura mínima do repo
Criar: `index.html` (placeholder), `manifest.webmanifest`, `sw.js`, `shared/firebase.js`, `shared/auth.js`, `shared/styles.css`.

#### B2. Hub funcional
- Tela de login com botão "Entrar com Google".
- Após login, hub com 2 cards: **Vendas VE27** e **Visitas Pós-Vendas**.
- Cards inativos (apenas roteamento).

**Critério de saída:** Felipe loga, vê hub, sai. Documento `users/{uid}` aparece no Firestore com `role: 'viewer'`.

#### B3. Promover Felipe a admin
Manual via Firebase Console: editar `users/{uid-do-felipe}.role = 'admin'`.

#### B4. Deploy de rules e indexes iniciais
- Criar `firebase/firestore.rules` e `firebase/storage.rules` conforme `ARQUITETURA.md` §6.
- Criar `firebase/firestore.indexes.json` conforme §4.
- `firebase deploy --only firestore:rules,storage:rules,firestore:indexes`

**Critério de saída:** rules ativas; tentativa de escrita não autorizada é negada no console.

### Fase C — Módulo Vendas (~2h)

#### C1. Importador de xlsx (admin-only)
- Botão "Importar planilha" → abre file picker.
- Parse client-side com SheetJS (já em uso no painel atual).
- Para cada linha:
  1. Calcula `clienteId = hash(marca + razao)`.
  2. `setDoc(vendas_ve27/{clienteId})` (idempotente).
- Cria doc em `vendas_ve27_uploads/{uploadId}` com metadados.
- Sobe original em `backups/vendas_ve27/{timestamp}_{filename}`.

#### C2. Importar os 7 xlsx atuais
Os arquivos já estão em `01_Fabiana/docs/Contexto do projeto — Painel VE27/`:
- VE27 - Agendamento Clientes - Caza Fashion.xlsx
- VE27 - Agendamento Clientes - Cotton Repres.xlsx
- VE27 - Agendamento Clientes - Novo Seculo - BO.xlsx
- VE27 - Agendamento Clientes - Primicia Represe.xlsx
- VE27 - Agendamento Clientes - Slim Repres - BO.xlsx
- VE27 - Agendamento Clientes - Slim Repres.xlsx
- VE27 - Agendamento Clientes - WS Repres.xlsx

Felipe (admin) sobe um por um pela UI. Critério de saída: `vendas_ve27` tem N docs (somatório das linhas válidas dos 7 xlsx).

#### C3. Painel de visualização
Replicar funções de render do `index.html` antigo (`renderFiles`, `renderFilters`, `renderKpis`, `renderStatus`, `renderWeekly`, `renderChampions`), lendo do Firestore em vez do `state.records` populado por SheetJS.

**Critério de saída:** Fabiana abre `/vendas/` e vê o mesmo painel de antes — sem precisar de upload nem token.

### Fase D — Módulo Visitas (~2h)

#### D1. Form do checklist (5 seções)
Replicar a estrutura do Checklist-LM. Como o Firebase nunca foi efetivamente criado lá, **não há dados a migrar** — começa zerado.

Schema do doc segue `ARQUITETURA.md` §4 (`visitas/`).

#### D2. Dashboard de visitas
Cards, filtros, chips, tabela, modal de detalhes — espelhar o que existia (que viva apenas como descrição no contexto antigo).

#### D3. Suporte offline
- Habilitar persistência offline do Firestore: `enableMultiTabIndexedDbPersistence(db)`.
- Form aceita submit offline → Firebase enfileira → sincroniza ao reconectar.
- Badge de status (online/offline/sincronizando) no header.

**Critério de saída:** Fabiana lança visita em modo avião, fecha o app, abre online → visita aparece sincronizada.

### Fase E — PWA + polimento (~1h)

#### E1. Manifest + ícones
Gerar `icon-192.png`, `icon-512.png`, `icon-maskable.png` (placeholders OK no MVP).

#### E2. Service Worker
- Cache do shell (`index.html`, CSS, JS estático).
- `skipWaiting()` + `clients.claim()` para update agressivo.
- `CACHE_VERSION` no topo do `sw.js`.

#### E3. Smoke test
- Acesso em Chrome desktop ✓
- Acesso em Chrome mobile (Android) → "Instalar app" funciona ✓
- Acesso em Safari iOS → "Adicionar à tela de início" funciona ✓
- Modo offline em mobile carrega shell ✓

### Fase F — Cutover (~30min)

#### F1. Comunicação
- Avisar Fabiana: "URL nova é `…/lamoda-fabi/`. Salva nos favoritos. As antigas vão sair do ar em X dias."
- Compartilhar o `GUIA-DE-USO.md` por WhatsApp ou impresso.

#### F2. Redirects nos repos antigos
Em `Fabi-Vendas-LM` e `Checklist-LM`, substituir `index.html` por:
```html
<!doctype html>
<meta charset="utf-8">
<title>Movido</title>
<meta http-equiv="refresh" content="0; url=https://lamoda-fabi.web.app/">
<p>Esta página foi movida. <a href="https://lamoda-fabi.web.app/">Acesse a nova versão</a>.</p>
```
Mantém 1 mês, depois arquiva os repos (Settings → Archive).

> **Nota:** isso só funciona enquanto os Pages dos repos antigos ainda estiverem ativos. Verificar se o plano atual permite (eram repos privados servindo Pages — talvez já estejam offline desde o downgrade do plano). Se Pages não está ativo, o redirect não acontece; comunicação direta com a Fabiana é o canal primário.

#### F3. Arquivar repos antigos
GitHub → repo → Settings → Danger Zone → "Archive this repository". Mantém leitura, bloqueia commits.

---

## 3. Plano de rollback

Se algo der errado durante o cutover (Fase F):
1. Reverter o `index.html` de `Fabi-Vendas-LM` e `Checklist-LM` para a versão antiga (estão no histórico Git).
2. URLs antigas voltam a funcionar imediatamente.
3. Manter `lamoda-fabi` ativo em paralelo até resolver.

Backups dos xlsx originais ficam **em três lugares**: arquivos locais (`01_Fabiana/docs/...`), Cloud Storage (`backups/vendas_ve27/`), e histórico Git dos repos antigos (mesmo arquivados, são read-only).

---

## 4. Checklist consolidado

```
Fase A — Infra (Felipe sozinho)
[ ] A1  Criar projeto Firebase lamoda-fabi (sao paulo)
[ ] A2  Ativar Google Sign-In + dominios autorizados
[ ] A3  Criar Firestore (modo producao, sao paulo)
[ ] A4  Criar Storage bucket
[ ] A5  Criar repo lamoda-fabi privado (apenas codigo, sem Pages)
[ ] A6  Instalar firebase-tools, firebase use lamoda-fabi
[ ] A7  firebase init (hosting + firestore + storage), deploy placeholder

Fase B — Esqueleto (Felipe + Claude)
[ ] B1  Estrutura minima do repo (index, manifest, sw, shared/)
[ ] B2  Hub com login funcional
[ ] B3  Promover Felipe a admin no console
[ ] B4  Deploy de rules + indexes

Fase C — Vendas
[ ] C1  Implementar importador xlsx
[ ] C2  Importar 7 xlsx atuais
[ ] C3  Replicar painel de visualizacao

Fase D — Visitas
[ ] D1  Form checklist 5 secoes
[ ] D2  Dashboard de visitas
[ ] D3  Suporte offline + badge status

Fase E — PWA
[ ] E1  Manifest + icones
[ ] E2  Service Worker
[ ] E3  Smoke test em 3 dispositivos

Fase F — Cutover
[ ] F1  Comunicar Fabiana, compartilhar guia
[ ] F2  Redirects nos repos antigos
[ ] F3  Arquivar Fabi-Vendas-LM e Checklist-LM
```

Estimativa total: **~8h** trabalhadas. Em sessões de 1–2h, ~1 semana corrida.
