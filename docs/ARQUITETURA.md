# Arquitetura — La Moda - Fabi

> Documento técnico de referência. Atualizar a cada decisão arquitetural relevante.
> Última atualização: 2026-05-13. Status: **rascunho de planejamento** (nada ainda implementado).

---

## 1. Visão geral

**La Moda - Fabi** é um hub web que unifica dois fluxos operacionais da Fabiana Shimoda em um único produto:

1. **Vendas VE27** — painel de acompanhamento de vendas da coleção VE27 (Caza Fashion), com KPIs, filtros e visualizações derivadas de planilhas Excel emitidas pelo ERP.
2. **Checklist de Visitas (Pós-Vendas La Moda)** — formulário digital para visitas presenciais em lojas, com dashboard de resultados.

Substitui dois apps anteriores que viviam em repos separados (`Fabi-Vendas-LM` e `Checklist-LM`), agora arquivados como histórico.

### Princípios de design
- **Mobile-first**, sem deixar a versão desktop ruim. Fabiana usa celular em loja e PC no escritório.
- **Zero-ops:** sem servidor próprio, sem build pipeline complexo, deploy é `git push`.
- **Offline-tolerante:** funcionando em loja sem rede, sincroniza quando volta.
- **Identidade clara:** quem entra é uma pessoa autenticada (não senha compartilhada).

---

## 2. Stack

| Camada | Tecnologia | Por que |
|---|---|---|
| Linguagens | HTML5, CSS3, JavaScript (ESM, sem framework) | Mantém o "zero-build" dos apps atuais. |
| Frontend lib | SheetJS (xlsx parsing, lazy-loaded só em `/vendas/`) | Já era a escolha do Painel VE27, comprovado. |
| Backend | **Firebase** (Firestore, Auth, Storage) | Build/Growth/Security — venceu nos três pilares (ver `DECISOES.md`). |
| Autenticação | Firebase Auth com **Google Sign-In** (MVP) | Felipe e Fabiana compartilham uma conta Google (identificador `felipeshimoda@outlook.com` — Outlook é só o login, a conta de auth é Google). 1 clique, herda MFA. Microsoft fica como provider futuro se 2ª conta aparecer e for Microsoft de fato. |
| Banco | Cloud Firestore (NoSQL, real-time, offline nativo) | Sync automática, queries indexadas, regras granulares. |
| Storage | Cloud Storage for Firebase | Backup dos `.xlsx` originais + fotos de loja (futuro). |
| Hospedagem | **Firebase Hosting** (free tier) | Sem GitHub Pro disponível para Pages privado. Consolida frontend + backend num único vendor; `firebase deploy` publica tudo. |
| PWA | Manifest + Service Worker (vanilla) | Ícone na home screen, cache do shell. |
| Região Firebase | `southamerica-east1` (São Paulo) | Latência mínima no Brasil. |

### O que **não** está na stack (e por quê)
- **Sem framework JS** (React/Vue/Svelte): velocidade > ergonomia neste tamanho. Reavaliar se passar de ~3 módulos.
- **Sem build step** (Vite/esbuild): zero-ops é regra. Reavaliar se precisar de bundle/tree-shaking.
- **Sem Cloud Functions** inicialmente: tudo client-side com Firestore rules. CFs entram só se aparecer lógica que **não** pode rodar no client (ex: gerar relatório PDF, enviar email).

---

## 3. Estrutura do repo `lamoda-fabi/`

```
lamoda-fabi/
├── index.html                  # hub: login + seletor de modulo
├── manifest.webmanifest        # PWA
├── sw.js                       # service worker (cache do shell + estrategias)
├── icons/                      # PWA icons (192, 512, maskable)
├── shared/
│   ├── firebase.js             # init Firebase + exports do SDK
│   ├── auth.js                 # Google Sign-In, guard de rotas, role helper
│   ├── styles.css              # design system (cores, tipografia, componentes)
│   ├── theme.js                # dark/light toggle (persist localStorage)
│   ├── nav.js                  # header compartilhado
│   └── utils.js                # formatadores (datas, R$, %, etc.)
├── vendas/
│   ├── index.html
│   ├── vendas.js               # le `vendas_ve27` do Firestore, renderiza
│   ├── upload.js               # admin: importa xlsx -> Firestore
│   └── vendas.css
├── visitas/
│   ├── index.html
│   ├── form.js                 # checklist form (5 secoes)
│   ├── dashboard.js            # cards, filtros, tabela, modal de detalhes
│   └── visitas.css
├── firebase/
│   ├── firestore.rules         # regras Firestore
│   ├── storage.rules           # regras Storage
│   └── firestore.indexes.json  # indices compostos
├── docs/
│   ├── ARQUITETURA.md          # este arquivo
│   ├── MIGRACAO.md
│   ├── GUIA-DE-USO.md
│   ├── CHANGELOG.md
│   ├── ROADMAP.md
│   └── DECISOES.md             # ADRs leves
└── README.md                   # publico (alto nivel, sem segredos)
```

---

## 4. Modelo de dados (Firestore)

### Collections

#### `users/{uid}`
Perfil de cada pessoa autenticada. Documento criado no primeiro login (via cliente).

```js
{
  uid: string,
  email: string,
  displayName: string,
  photoURL: string | null,
  role: 'viewer' | 'admin',           // MVP: o único usuario whitelisted vira 'admin' direto
  provider: 'google',                 // 'microsoft' ou 'email-link' quando ADR-003 for revisado
  createdAt: Timestamp,
  lastLoginAt: Timestamp
}
```

#### `vendas_ve27_uploads/{uploadId}`
Metadado de cada importação de planilha. Auditoria do "quem subiu o quê e quando".

```js
{
  filename: string,              // 'VE27 - Agendamento Clientes - Caza Fashion.xlsx'
  marca: string,                 // sigla derivada (MY, ES, LP, ...)
  uploadedBy: string,            // uid do admin
  uploadedAt: Timestamp,
  rowsTotal: number,
  rowsImported: number,
  rowsRejected: number,
  storagePath: string,           // ex: 'backups/vendas_ve27/2026-05-13T01-30_caza.xlsx'
  status: 'pending' | 'imported' | 'failed',
  error?: string
}
```

#### `vendas_ve27/{clienteId}`
Cada linha da aba `Base` do xlsx vira um documento. `clienteId` derivado de `marca + razao` (hash curto, idempotente — re-importação atualiza em vez de duplicar).

```js
{
  marca: string,                 // 'MY'
  escritorio: string,            // 'Caza Fashion'
  razao: string,                 // razao social
  cidade: string,
  cluster: string,               // 'KEY ACCOUNT', 'CAMPEAO', 'PREFERENCIAL 1', ...
  meta: number,                  // R$
  venda: number,                 // R$
  statusCompra: string,
  statusAg: string,
  semana: string | null,         // 'Preview', 'S1'...'S6', null
  // ---- derivados pre-calculados pelo importador ----
  atingimentoPct: number,        // venda / meta
  variacao: number,              // venda - meta
  statusClass: 'desativado' | 'nao_comprou' | 'atingiu' | 'abaixo' | 'outros',
  // ---- metadata ----
  importedFrom: string,          // uploadId
  importedAt: Timestamp
}
```

#### `visitas/{visitaId}`
Cada checklist preenchido pela Fabiana. `visitaId` auto-gerado.

```js
{
  createdBy: string,             // uid (sempre Fabiana hoje)
  createdAt: Timestamp,

  identificacao: {
    data: string,                // 'YYYY-MM-DD' da visita (pode diferir de createdAt)
    supervisora: string,
    loja: string,
    cidade: string,
    regiao: string,
    representante: string
  },

  visual: {
    vm: 'otimo' | 'bom' | 'ruim' | 'pessimo',
    exposicao: 'sim' | 'parcial' | 'nao',
    marcasSinalizador: string[]  // multi-select
  },

  relacionamento: {
    vendas: 'otimo' | 'bom' | 'ruim' | 'pessimo',
    comportamentoCliente: string,        // texto livre
    reclamacoes: string[]                // ['prazo','qualidade','preco','mix','atendimento','troca','portal']
  },

  diagnostico: {
    maisPerformou: string,
    menosVenderam: string,
    opiniaoPrecos: string,
    dificuldadeMix: string,
    performanceEquipe: 'otima' | 'boa' | 'ruim' | 'pessima'
  },

  alinhamento: {
    multiplicaReforcado: boolean,
    appInstalado: boolean,
    indicadoresDiscutidos: string[],      // ['meta','atendimento_x_peca','estoque','equipe']
    acoesImplantadas: string[]
  },

  fotos: Array<{
    storagePath: string,                  // 'fotos/visitas/{visitaId}/{n}.jpg'
    caption: string,
    uploadedAt: Timestamp
  }>,

  // tags computadas no client p/ filtros rapidos no dashboard
  tags: string[]                          // ['com_reclamacao','sem_sinalizador','app_nao_instalado','vm_ruim','vendas_ruins','reclama_preco']
}
```

#### `config/global` (documento único)
Configurações globais editáveis pelo admin.

```js
{
  currentCollection: 'VE27',
  defaultMeta: 0,
  visitaSections: { /* schema das opcoes de cada campo de checklist */ },
  updatedBy: string,
  updatedAt: Timestamp
}
```

### Índices compostos (`firestore.indexes.json`)
```
visitas: createdAt DESC + identificacao.regiao ASC
visitas: createdAt DESC + tags ARRAY_CONTAINS
vendas_ve27: marca ASC + atingimentoPct DESC
vendas_ve27: cluster ASC + venda DESC
```

---

## 5. Autenticação e autorização

### Provider único no MVP
Apenas **Google Sign-In** ativo no Firebase Auth. A conta Google identificada por `felipeshimoda@outlook.com` é compartilhada entre Felipe (admin técnico) e Fabiana (operadora) — um único `uid` no Firebase.

> **Esclarecimento:** o email é `@outlook.com`, mas a **conta de autenticação é Google**. É possível ter conta Google sem caixa Gmail — o Outlook serve só de identificador. O Firebase Console aceita exclusivamente contas Google, e o projeto foi criado nessa conta sem problema.

A UI de login mostra **um botão único** ("Entrar com Google"). Microsoft e email link ficam documentados em `DECISOES.md` como evoluções futuras.

### Fluxo
1. Usuário acessa `index.html` → tela com botão "Entrar com Google".
2. Clica → popup do Firebase Auth → OAuth Google.
3. No callback, `auth.js`:
   - Checa se existe `users/{uid}`. Se não, cria com `role: 'admin'` e `provider: 'google'`.
   - Atualiza `lastLoginAt`.
   - Carrega `role` em memória (não em `localStorage` — força revalidação a cada sessão).
4. Renderiza o hub completo. No MVP, todos os controles aparecem (única conta é admin).

### Configuração de Google Sign-In
- No console Firebase: Authentication → Sign-in method → Google → habilitar.
- Sem config extra: Firebase usa OAuth do próprio Google.
- Setup é literalmente 1 toggle.

### Estrutura de roles (preservada para evolução)
Mesmo com 1 usuário hoje, mantemos o schema `users/{uid}.role` em `'viewer' | 'admin'`. Quando Fabiana ganhar conta própria:
1. Felipe ativa um 2º provider se necessário (Microsoft, email link, etc.).
2. Fabiana loga com a nova conta → cria doc com `role: 'viewer'` default.
3. Rules já documentadas (§6) entram em vigor sem refactor.

### Roles
| Role | Quem | Capacidades |
|---|---|---|
| `viewer` | Fabiana | Ver tudo; criar e editar visitas próprias; **não** mexer em vendas |
| `admin` | Felipe | Tudo do viewer + upload/limpar `vendas_ve27` + ler/editar `users` + ler `vendas_ve27_uploads` |

Promoção `viewer → admin` é manual: Felipe edita o doc no Firebase Console.

### Por que documento em vez de Custom Claims (no MVP)
- Não precisa Cloud Function pra setar claim.
- Mudança de role reflete imediatamente (sem refresh do token).
- Tradeoff: leitura extra em cada regra. Para 2 usuários, irrelevante. Quando escalar para 10+, migrar para Custom Claims.

---

## 6. Regras Firestore (rascunho)

```js
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    function isSignedIn() {
      return request.auth != null;
    }

    function isOwner(uid) {
      return isSignedIn() && request.auth.uid == uid;
    }

    function getRole() {
      return get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role;
    }

    function isAdmin() {
      return isSignedIn() && getRole() == 'admin';
    }

    // ---- USERS ----
    match /users/{uid} {
      allow read: if isOwner(uid) || isAdmin();
      allow create: if isOwner(uid)
                    && request.resource.data.role == 'viewer'   // ninguem se promove sozinho
                    && request.resource.data.uid == uid;
      allow update: if isOwner(uid)
                    && request.resource.data.role == resource.data.role  // role so admin
                    || isAdmin();
      allow delete: if isAdmin();
    }

    // ---- VENDAS ----
    match /vendas_ve27/{doc} {
      allow read: if isSignedIn();
      allow write: if isAdmin();
    }
    match /vendas_ve27_uploads/{doc} {
      allow read, write: if isAdmin();
    }

    // ---- VISITAS ----
    match /visitas/{id} {
      allow read: if isSignedIn();
      allow create: if isSignedIn()
                    && request.resource.data.createdBy == request.auth.uid;
      allow update, delete: if isOwner(resource.data.createdBy) || isAdmin();
    }

    // ---- CONFIG ----
    match /config/{doc} {
      allow read: if isSignedIn();
      allow write: if isAdmin();
    }
  }
}
```

### Regras Storage (`storage.rules`)
```js
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {

    function isSignedIn() { return request.auth != null; }
    function isAdmin() {
      return isSignedIn()
        && firestore.get(/databases/(default)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }

    // backups de xlsx (so admin)
    match /backups/vendas_ve27/{file} {
      allow read, write: if isAdmin();
    }

    // fotos de visitas (qualquer logado pode subir; ler so admin ou autor)
    match /fotos/visitas/{visitaId}/{file} {
      allow read: if isSignedIn();
      allow write: if isSignedIn() && request.resource.size < 5 * 1024 * 1024;
    }
  }
}
```

---

## 7. Cloud Storage — estrutura de pastas

```
gs://lamoda-fabi.appspot.com/
├── backups/
│   └── vendas_ve27/
│       └── {YYYY-MM-DDThh-mm}_{filename}.xlsx
└── fotos/
    └── visitas/
        └── {visitaId}/
            └── {n}.jpg
```

Lifecycle policies (configurar no console):
- `backups/`: manter indefinidamente (são pequenos, dão fallback se Firestore corromper).
- `fotos/visitas/`: sem expiração inicialmente; revisar quando passar de 1 GB.

---

## 8. PWA

### `manifest.webmanifest`
```json
{
  "name": "La Moda - Fabi",
  "short_name": "Fabi",
  "description": "Hub de vendas e pós-vendas La Moda",
  "start_url": "/lamoda-fabi/",
  "scope": "/lamoda-fabi/",
  "display": "standalone",
  "orientation": "portrait",
  "background_color": "#0a0f14",
  "theme_color": "#0a0f14",
  "icons": [
    { "src": "icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "icons/icon-512.png", "sizes": "512x512", "type": "image/png" },
    { "src": "icons/icon-maskable.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ]
}
```

### Estratégia do Service Worker
- **Shell (`index.html`, CSS, JS estático):** cache-first com `network-fetch-and-update` em background.
- **APIs Firebase:** **sem** intercept — Firebase SDK já tem persistência offline própria via IndexedDB.
- **Imagens (`icons/`, fotos):** stale-while-revalidate.
- **Versionamento:** bump de `CACHE_VERSION` no `sw.js` invalida cache do shell em todos os dispositivos.

---

## 9. Hospedagem e deploy

### Firebase Hosting (frontend + backend num só comando)
- **URL pública padrão:** `https://lamoda-fabi.web.app/` (também acessível em `https://lamoda-fabi.firebaseapp.com/`).
- **Repo GitHub privado:** apenas código-fonte versionado; não serve nada publicamente (sem Pages).
- **Deploy:** `firebase deploy` publica:
  - Frontend (todo o site estático)
  - Firestore rules (`firebase/firestore.rules`)
  - Storage rules (`firebase/storage.rules`)
  - Indexes (`firebase/firestore.indexes.json`)
- Deploy seletivo: `firebase deploy --only hosting`, `--only firestore:rules`, etc.
- Custom domain (opcional, futuro): apontar DNS para Firebase Hosting → SSL grátis automático.

### `firebase.json` (na raiz do repo)
```json
{
  "hosting": {
    "public": ".",
    "ignore": [
      "firebase.json",
      ".firebaserc",
      ".git/**",
      "**/.*",
      "**/node_modules/**",
      "docs/**",
      "firebase/**",
      "README.md"
    ],
    "headers": [
      { "source": "sw.js",            "headers": [{ "key": "Cache-Control", "value": "no-cache" }] },
      { "source": "manifest.webmanifest", "headers": [{ "key": "Cache-Control", "value": "no-cache" }] },
      { "source": "**/*.@(js|css|html)",  "headers": [{ "key": "Cache-Control", "value": "no-cache" }] },
      { "source": "**/*.@(png|jpg|jpeg|webp|svg|ico)", "headers": [{ "key": "Cache-Control", "value": "public,max-age=86400" }] }
    ]
  },
  "firestore": {
    "rules":   "firebase/firestore.rules",
    "indexes": "firebase/firestore.indexes.json"
  },
  "storage": {
    "rules": "firebase/storage.rules"
  }
}
```

### Workflow recomendado
```powershell
# Editar codigo localmente
git commit -am "feat: ..."
git push                    # historico fica versionado no GitHub privado
firebase deploy             # publica em lamoda-fabi.web.app
```
Push e deploy são desacoplados — você pode commitar sem publicar e vice-versa.

### Config pública do Firebase
A `firebaseConfig` (apiKey, authDomain, projectId, ...) **vai ser commitada** em `shared/firebase.js`. Isso é o padrão e seguro — apiKey do Firebase é identificador, não segredo. **Segurança real vem das rules**, não de esconder a key.

---

## 10. Observabilidade

| Sinal | Onde |
|---|---|
| Erros de auth | Firebase Console → Authentication → Users (logins falhos não aparecem; ativar Cloud Logging se precisar) |
| Erros de rules | Firebase Console → Firestore → Logs (mostra negações em tempo real) |
| Performance | DevTools do navegador; futuramente Firebase Performance Monitoring (1 linha pra ativar) |
| Uso/cota | Firebase Console → Usage (quota Firestore: 50k reads/dia free) |

---

## 11. Custos esperados

Free tier do Firebase para o uso projetado:
- **Firestore:** 50k reads / 20k writes / 20k deletes por dia, 1 GB storage. Estimativa: <1k reads/dia. **R$ 0**.
- **Auth:** ilimitado para email/Google. **R$ 0**.
- **Storage:** 5 GB grátis. Backups xlsx ~1 MB cada, fotos ~500 KB. Estimativa: <100 MB no primeiro ano. **R$ 0**.
- **Bandwidth:** 1 GB/dia download grátis. Bem dentro.

Total esperado primeiro ano: **R$ 0**. Plano Pro+ do GitHub já existente cobre o Pages privado.

---

## 12. Pontos abertos

- [x] Email da conta → `felipeshimoda@outlook.com` (resolvido — Microsoft Sign-In único, conta compartilhada Felipe+Fabiana, ver §5)
- [x] Tema visual final → manter o do Checklist-LM (dark + teal + glassmorphism) como tema oficial
- [x] Política de retenção de visitas → **sem expiração**; manter histórico completo
- [x] Hospedagem → **Firebase Hosting** (não Pages, sem GitHub Pro disponível)
- [ ] Logo + favicon → a criar do zero (entrou no roadmap Now); placeholder até lá
- [ ] Custom domain (opcional, pode esperar v1.1+)
