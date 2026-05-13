# Roadmap — La Moda - Fabi

> Organizado em **Now / Next / Later**, com cada item enquadrado nos pilares **Build / Growth / Security**.
> Última atualização: 2026-05-13.

---

## Now (v1.0 — unificação)

Objetivo: substituir os dois apps antigos por um hub único funcional, sem regressão de feature.

| Item | Build | Growth | Security |
|---|:-:|:-:|:-:|
| Esqueleto do hub (login + 2 módulos) | ✅ central | – | ✅ identidade real (Google Sign-In) |
| Migrar Painel VE27 para `/vendas/` lendo Firestore | ✅ | – | ✅ rules granulares |
| Migrar Checklist para `/visitas/` | ✅ | – | ✅ |
| Importar 7 xlsx atuais para `vendas_ve27` | ✅ | ✅ destrava queries | – |
| Cloud Storage para backup dos xlsx originais | – | ✅ histórico | ✅ recuperação |
| PWA (manifest + service worker, instalável no celular) | – | ✅ adoção mobile | – |
| Cutover: redirects nos repos antigos e arquivamento | ✅ | – | – |
| **Logo + favicon + ícones PWA (192, 512, maskable)** | – | ✅ identidade | – | A criar do zero |

**Critério de "pronto":** Fabiana usa o novo hub uma semana sem precisar voltar nos antigos.

---

## Next (v1.1+ — primeiras melhorias destravadas)

Objetivo: aproveitar o que o Firebase desbloqueia. Cada item aqui era difícil ou impossível antes.

| Item | Build | Growth | Security | Notas |
|---|:-:|:-:|:-:|---|
| Exportar visitas para Excel/CSV | ✅ SheetJS no client | ✅ relatórios | – | Pedido antigo, agora trivial |
| Gráficos no dashboard de visitas | – | ✅ analytics | – | Chart.js client-side |
| Foto da loja no checklist | – | ✅ evidência visual | ✅ rules Storage já prevê | Pedido antigo |
| Botão de excluir visita (com confirmação) | ✅ | ✅ UX | ✅ regra: só admin ou autor | Pedido antigo |
| Comparativo VE26 vs VE27 | – | ✅✅ análise temporal | – | Importar dados VE26 em `vendas_ve26` |
| Histórico de visitas por loja (timeline) | – | ✅ supervisão longitudinal | – | Index composto: `loja + createdAt DESC` |
| Filtros salvos no dashboard | ✅ | ✅ produtividade | – | Persistir em `users/{uid}.preferences` |
| Validação cruzada de schema do xlsx no upload | ✅ robustez | – | – | Avisar se header mudou no ERP |

---

## Later (v2.0+ — visão de longo prazo)

Itens que dependem de demanda real, escala, ou orçamento.

### Build
- **Cloud Functions** para lógica que não pode ser client-side (envio de email de resumo semanal, geração de PDF de visita).
- **Migração para framework** (React/Svelte) **se** o codebase passar de ~3000 linhas ou 3+ módulos.
- **Bundle/build step** (Vite) **se** começarmos a usar dependências npm pesadas.

### Growth
- **Notificações push (FCM)** — lembretes de visitas agendadas, alertas de meta vermelha.
- **Multi-coleção** (VE27, VE28, P26, P27, ...): generalizar `vendas_{colecao}` em vez de hardcoded.
- **Dashboards comparativos** entre safras (atingimento por marca, sazonalidade).
- **Mapa de lojas** no dashboard (Leaflet ou Mapbox).
- **Modo "consulta rápida"** offline-first com cache de dados completo para uso em loja sem rede.
- **Compartilhar visita** com link expirável (para o lojista ver o feedback).

### Security
- **Custom Claims** em vez de role-via-documento (mais performático nas regras).
- **App Check** (anti-abuso, garante que requests vêm do nosso app).
- **Audit log custom** em coleção `audit/` (quem fez o quê e quando — para compliance).
- **Firebase Authentication com MFA explícito** (além do Google), se quiser camada extra.
- **Política de retenção** automatizada para visitas com mais de N anos.

### Polimento e DX
- **Tema customizável** (light/dark + paletas alternativas).
- **i18n** (pt-BR / en) — se algum dia outro mercado.
- **Atalhos de teclado** no dashboard (j/k para navegar, / para buscar).
- **Comando "exportar tudo"** (snapshot completo do Firestore em ZIP).

---

## O que **não** entra (anti-roadmap)

Para manter foco e evitar scope creep:

- ❌ App nativo (iOS/Android) — PWA cobre 95% do caso de uso.
- ❌ Backend próprio (Node/Python) — Firebase basta.
- ❌ Multi-tenant (várias empresas) — produto é dedicado à Fabiana e equipe La Moda.
- ❌ CMS para editar perguntas do checklist via UI — admin edita em `config/global` direto, sem painel separado.
- ❌ Integração ERP direta (sem upload manual) — só se o ERP virar acessível por API.

---

## Priorização sugerida (depois do v1.0)

Critério: **(impacto pra Fabiana) × (esforço inverso) × (alinhamento com pilares)**.

1. **Exportar visitas para Excel** (impacto alto, esforço baixo, ela já pediu).
2. **Foto da loja no checklist** (impacto alto, esforço médio).
3. **Botão de excluir visita** (impacto médio, esforço baixo).
4. **Gráficos no dashboard** (impacto médio, esforço médio).
5. **Comparativo VE26 vs VE27** (impacto alto na safra, esforço médio — depende de ter os dados VE26).

Depois disso, reavaliar com base no uso real.
