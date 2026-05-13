# Segurança — La Moda - Fabi

> Política de segurança do produto. O que protegemos, contra o quê, como, e o que **não** estamos protegendo (deliberadamente).
> Última atualização: 2026-05-13.

---

## 1. Modelo de ameaças

### O que estamos protegendo
- **Dados de visitas** (notas operacionais sobre lojas — informação interna La Moda).
- **Dados de vendas VE27** (números de meta/realizado por cliente — confidencial comercial).
- **Identidade dos usuários** (Felipe, Fabiana, eventuais novos).
- **Integridade** dos dados (nada de visita fantasma, alteração não rastreada).

### Contra quem
| Ator | Capacidade | Probabilidade | Mitigação |
|---|---|---|---|
| Curioso externo na internet | Acesso à URL pública | Alta | Repo privado + Auth obrigatório |
| Bot de scanner web | Tentativa automatizada | Alta | Auth, rate limit Firebase, futuro App Check |
| Funcionário antigo com link | Reusa URL | Média | Auth + lista controlada de usuários |
| Concorrente direcionado | Engenharia social, phishing | Baixa | MFA herdado de Google/Microsoft |
| Estado-nação / APT | Atacante sofisticado | Muito baixa | Fora do escopo deste produto |

### O que **não** estamos protegendo (escopo deliberado)
- Confidencialidade absoluta a nível corporativo (não somos Apple). Fabiana e Felipe são os custodiantes.
- Disponibilidade 99.99% — aceita downtime do Firebase/Pages (raríssimo).
- Resistência a comprometimento do dispositivo do usuário (se o celular for invadido, o app também).

---

## 2. Classificação dos dados

| Tipo | Sensibilidade | Onde fica | Cifragem |
|---|---|---|---|
| Visitas (texto, métricas) | Interna La Moda | Firestore | At rest (Google-managed keys); em trânsito TLS 1.3 |
| Vendas VE27 (números, clientes) | Confidencial comercial | Firestore | idem |
| xlsx originais | Confidencial comercial | Cloud Storage | idem |
| Fotos de loja (futuro) | Interna La Moda | Cloud Storage | idem |
| Identidade (email, nome, foto) | Interna | Firestore + token Firebase | idem |
| Sessão (token Firebase) | Sensível | IndexedDB do navegador (Firebase SDK) | Bound ao device + expira |

---

## 3. Identidade e autenticação

### Providers (MVP)
- **Google Sign-In** único: OAuth 2.0, conta Google identificada por `felipeshimoda@outlook.com` (compartilhada Felipe + Fabiana). O email é Outlook, mas a conta de auth é Google.
- **Sem provider local** — não criamos senhas próprias. Não há "fluxo de esqueci a senha" pra implementar mal.
- Microsoft Sign-In e email link estão documentados em `DECISOES.md` (ADR-003) como evoluções futuras.

### MFA
Não implementamos MFA dentro do app. **Herdamos** do Google.

**Recomendação operacional crítica:** a conta Google deve ter **2FA Google ativo** (Authenticator app, passkey ou SMS — Authenticator preferível). Como é uma conta única que destranca todo o app, sua proteção = proteção do app. Sem 2FA, a senha do email vira o único elo fraco.

### Política de sessão
- Token Firebase expira em ~1h (refresh automático enquanto o usuário não desloga).
- "Sair" no app revoga o refresh token via `signOut()`.
- Não persistimos credenciais em `localStorage` ou cookie próprio.
- Reabrir o app exige nova autenticação (popup OAuth) ou usa o refresh token cacheado pelo Firebase SDK no IndexedDB.

### Whitelist de usuários
**Hoje (MVP):** qualquer login Google/Microsoft cria um doc `users/{uid}` com `role: 'viewer'`. Para travar:
- Felipe acessa `users/` no console e **deleta** docs de UIDs não-autorizados.
- Ou habilitamos uma regra em `users` que bloqueia `create` exceto para emails em whitelist (ver §10).

**Futuro:** custom claim `approved: true` setado por Cloud Function — login sem claim cai numa tela "pendente de aprovação".

---

## 4. Autorização

A **linha primária** de defesa são as **Firestore Rules** e **Storage Rules** (não a UI). UI esconde botões "perigosos", mas qualquer um com console DevTools poderia chamar SDK direto — as rules garantem que nada acontece sem permissão.

### No MVP (1 conta única)
Há apenas um usuário autenticado: o dono da conta `felipeshimoda@outlook.com`. Ele recebe `role: 'admin'` automaticamente no primeiro login e pode tudo. A separação `viewer`/`admin` fica codificada nas rules para entrar em ação assim que uma segunda conta surgir.

### Rules ativas (whitelist explícita por email)
A regra `users.create` exige `request.auth.token.email == 'felipeshimoda@outlook.com'` — qualquer outro Google/Microsoft que descobrir a URL **não consegue criar conta**.

Resumo (detalhe em `ARQUITETURA.md` §6):

| Recurso | Quem lê | Quem escreve |
|---|---|---|
| `users/{uid}` | dono ou admin | dono (sem alterar role) ou admin (qualquer campo); create exige email whitelisted |
| `vendas_ve27/{doc}` | logado | admin |
| `vendas_ve27_uploads/{doc}` | admin | admin |
| `visitas/{id}` | logado | autor (criar/editar próprias) ou admin |
| `config/global` | logado | admin |
| Storage `backups/` | admin | admin |
| Storage `fotos/visitas/` | logado | logado (limite 5 MB/foto) |

---

## 5. Dados em trânsito e em repouso

- **TLS 1.3** obrigatório em toda comunicação Firebase. Mixed content bloqueado pelo browser.
- **At rest**: Firebase criptografa Firestore e Storage com chaves gerenciadas pelo Google (AES-256). Sem chave customizada (CMEK) — não justifica o overhead operacional pra esse projeto.

---

## 6. Segredos e chaves

### O que **não** é segredo
- `firebaseConfig` (apiKey, authDomain, projectId, etc.) — vai commitada em `shared/firebase.js`. É um **identificador público** do projeto; não destranca dados. Segurança vem das rules.
- `Application (client) ID` do app Microsoft (se criarmos um dedicado) — público.

### O que **é** segredo
- `Client Secret` do app Microsoft (se criarmos dedicado) — vai **apenas** no Firebase Console (Authentication → Microsoft provider). Nunca no repo.
- Tokens de sessão Firebase — gerenciados pelo SDK, ficam em IndexedDB do navegador.
- Conteúdo do Firestore Database — protegido por rules + autenticação.

### Rotação
- Senha de email (Google/Microsoft): rotacionar quando suspeitar de comprometimento (responsabilidade do dono da conta).
- Client Secret Microsoft (se aplicável): rotacionar a cada 12 meses ou imediatamente se vazar.
- Não há outras credenciais a rotacionar.

---

## 7. Auditoria

### O que fica logado automaticamente
- **Firebase Authentication** → console mostra histórico de logins (data, IP, dispositivo, provider).
- **Cloud Firestore** → console mostra negações de regras em tempo real (útil pra debug).
- **`users/{uid}.lastLoginAt`** → atualizado a cada login pelo client.
- **`vendas_ve27_uploads/`** → auditoria por design dos uploads de xlsx (uploadedBy, uploadedAt).
- **`visitas/{id}.createdBy` + `.createdAt`** → autoria de cada visita.

### O que **não** fica logado (limitação do MVP)
- Edições posteriores a um doc (sem `updatedBy`/`updatedAt` automáticos hoje). Adicionar nos schemas se for relevante.
- Leituras de dados — Firebase não loga reads por padrão. Pode-se habilitar Cloud Audit Logs no GCP (gera custo se volume alto).
- Tentativas de login falhadas sem ID — Firebase Auth não expõe diretamente; precisa habilitar logs no Cloud Logging.

---

## 8. Resposta a incidentes

| Incidente | Ação imediata |
|---|---|
| Conta da Fabiana comprometida (suspeita) | Console Firebase → Authentication → Users → desabilitar conta dela. Avisar para trocar senha Microsoft + habilitar 2FA. |
| Token vazou em screenshot/log | Não aplicável — não usamos tokens persistentes próprios. Se for sessão Firebase, ela expira em 1h e refresh tokens são revogados ao "Sair" ou ao desabilitar a conta. |
| Dados corrompidos em produção | Restaurar de backup. Firestore: usar Point-in-time Recovery (habilitar manualmente, 7 dias retenção). Cloud Storage `backups/`: re-importar xlsx original. |
| Regra Firestore mal configurada permitiu acesso indevido | Re-deploy de `firestore.rules` com regra corrigida. Avaliar logs de leitura para entender exposição. |
| Acesso "fantasma" via UID antigo | Deletar `users/{uid}` e desabilitar conta no Auth. |

---

## 9. Limites conhecidos do MVP

Aceitos conscientemente, com plano de upgrade:

| Limite | Risco | Mitigação atual | Upgrade futuro |
|---|---|---|---|
| Sem App Check | Cliente falso pode chamar Firebase | Rules + Auth obrigatório | Habilitar App Check (reCAPTCHA Enterprise) |
| Sem audit log de leituras | Não dá pra saber quem leu visita X | Aceitar — dados não são ultra-sensíveis | Cloud Audit Logs no GCP |
| Sem rate limit por usuário | Usuário malicioso pode "exaurir" cota | Firestore tem rate limit global (10k/segundo); Auth tem limite por IP | App Check + Cloud Functions com limites custom |
| Custom Secrets de Microsoft (se aplicável) só no console | Se conta GCP comprometer, secret vaza | Aceitar; rotacionar se incidente | Secret Manager + Cloud Function que lê |
| Sem assinatura de release | Push direto em main vira deploy imediato | Felipe é único com acesso ao repo | Branch protection + PRs |

---

## 10. Hardening opcional (quando quiser elevar)

Em ordem de custo/benefício:

1. **Whitelist explícita de email no `users` create rule** — **já planejada para o MVP**:
   ```
   allow create: if request.auth.token.email == 'felipeshimoda@outlook.com';
   ```
   Bloqueia qualquer outro Microsoft que descobrir a URL. Quando 2ª conta entrar, adicionar email ao `in [...]`.
2. **2FA na conta Google** — **crítico no MVP**: como há uma única conta destrancando tudo, sem 2FA a senha do email é o único elo. Configurar via myaccount.google.com → Segurança → Verificação em duas etapas.
3. **Point-in-time Recovery no Firestore** — retenção 7 dias, recupera estado anterior. (1 clique, custo baixo)
4. **Branch protection em `main`** — exige PR mesmo solo. Reduz erro humano. (5 min)
5. **Habilitar `updatedAt` automático nos schemas** — adicionar em todo doc, atualizar via cliente. (30 min refactor)
6. **App Check** — exige token de attestação no client. Bloqueia clientes não-autorizados. (1h setup)
7. **Custom Claims via Cloud Function** — performance e segurança de roles. Só faz sentido quando aparecer 2ª conta + Blaze. (2h setup)
8. **Cloud Audit Logs** — quem leu o quê. (Console toggle, custo ~R$ 5/mês com volume baixo)

Recomendo aplicar **itens 1, 2 e 3** já na Fase B do MVP. Item 4 logo após. Os outros podem esperar demanda.

---

## 11. O que pedir à Fabiana

Lista curta de "higiene" a comunicar:

- ✅ **Manter 2FA ativo** na conta Microsoft (`@outlook.com`).
- ✅ **Não compartilhar a senha** da conta Microsoft com ninguém — nem familiares, nem prints em chat.
- ✅ **Sair (botão "Sair")** ao usar PC compartilhado.
- ✅ **Avisar imediatamente** se receber email/mensagem "estranha" pedindo login.
- ❌ Não precisa decorar senha do app. Não há senha do app.

Posso transformar isso numa página dedicada do `GUIA-DE-USO.md` se quiser.
