# Guia de uso — La Moda - Fabi

> Para a Fabiana. Tudo o que você precisa saber para usar o app no dia a dia.

---

## O que é

**La Moda - Fabi** é um app web que reúne, em um só lugar:

- **Vendas VE27** — o painel de acompanhamento da coleção.
- **Visitas Pós-Vendas** — o checklist que você preenche em loja.

Antes eram dois links diferentes. Agora é um só.

**Endereço novo (salvar nos favoritos):**
`https://lamoda-fabi.web.app/`

---

## Como entrar

1. Abra o link acima.
2. Clique em **"Entrar com Google"**.
3. Use a conta Google (identificada por `felipeshimoda@outlook.com`).
4. Confirme no popup do Google.
5. Pronto — você está dentro.

Não tem senha do app pra decorar. Se o navegador já estiver logado na conta Google, é 1 clique.

**Trocar de aparelho?** Mesma coisa: abra o link, "Entrar com Google". Tudo o que você fez no celular aparece no PC, em tempo real.

---

## A tela inicial

Depois de entrar, você vê dois cards grandes:

- **Vendas VE27** — clique para abrir o painel.
- **Visitas Pós-Vendas** — clique para abrir o checklist e o dashboard de visitas.

No topo, sempre, tem:
- Seu nome e foto (do Google) à direita.
- Botão **"Sair"** quando quiser desconectar.
- Botão de **tema claro/escuro** (sua escolha fica salva).

---

## Vendas VE27

### O que você vê
- KPIs do total: meta, venda, atingimento, quantos clientes.
- Filtros por escritório, marca, cluster e status.
- Busca por razão social.
- Indicador semanal (Preview → S1 → S2 → ... → S6) com a cor do progresso.
- Lista de campeões da coleção.

### De onde vêm os dados
Os arquivos Excel são carregados pelo Felipe (administrador). Toda vez que ele atualiza, o painel reflete automaticamente — você não precisa baixar nada nem subir nada.

### Se algo parecer desatualizado
- Verifique se está online (canto superior direito mostra estado da sincronização).
- Atualize a página com **Ctrl+F5** (PC) ou puxando a tela pra baixo (mobile).
- Se mesmo assim estiver estranho, avisar o Felipe.

---

## Visitas Pós-Vendas

### Lançar uma visita nova
1. No card "Visitas Pós-Vendas", clique em **"Nova visita"**.
2. Preencha o checklist nas 5 seções:
   1. **Identificação** — data, supervisora, loja, cidade, região, representante.
   2. **Análise visual** — VM, exposição, marcas com sinalizador.
   3. **Relacionamento** — vendas, comportamento da cliente, reclamações.
   4. **Diagnóstico** — o que performou, o que não vendeu, opinião sobre preços, dificuldade com mix, performance da equipe.
   5. **Alinhamento** — Multiplica reforçado, app instalado, indicadores discutidos, ações implantadas.
3. Clique em **"Salvar visita"**.

A visita aparece imediatamente no dashboard.

### Ver visitas anteriores
- No card "Visitas Pós-Vendas", você cai direto no dashboard.
- Use os filtros (região, busca por loja) e os chips (com reclamações, sem sinalizador, app não instalado, etc.) para encontrar rapidamente.
- Clique em **"Ver detalhes"** numa linha da tabela → abre tudo o que foi respondido naquela visita.

### Sem internet?
Pode lançar a visita normalmente — fica guardado no celular. Quando voltar online, sincroniza sozinho.

Um aviso aparece no topo se você estiver offline.

---

## Instalar no celular

Vira um ícone direto na tela inicial, abre como um app normal (sem barra de navegador).

### No Android (Chrome)
1. Abra o link no Chrome.
2. Menu (três pontinhos) → **"Instalar app"** ou **"Adicionar à tela inicial"**.
3. Confirma. Pronto.

### No iPhone (Safari)
1. Abra o link no Safari.
2. Botão de compartilhar (quadrado com seta pra cima).
3. Role e toque em **"Adicionar à Tela de Início"**.
4. Confirma. Pronto.

Daí em diante, abre pelo ícone igual aos outros apps. Continua precisando de internet só pra sincronizar dados novos.

---

## Problemas comuns

| Problema | Solução |
|---|---|
| "Esqueci de qual Google logar" | Tela de login → "Use outra conta" no popup do Google |
| Painel de vendas está vazio | O Felipe pode não ter subido os arquivos ainda. Avisar. |
| Salvei uma visita mas não aparece | Verificar se está online. Esperar 5s — sincronização é automática. |
| Tema travou claro/escuro | Botão no topo alterna. Se persistir, limpar cache do navegador. |
| Quero excluir uma visita errada | Hoje só o Felipe pode excluir. Avisar com a data e nome da loja. |
| Não recebo notificação de nada | Normal — esta versão não envia notificações. Pode entrar no roadmap. |

### Quando avisar o Felipe
- Login não funciona depois de várias tentativas.
- Algum dado parece errado e não muda nem depois de Ctrl+F5.
- Erro de "permissão negada" em qualquer ação.
- Quer mudar algo no checklist (perguntas, opções, seções).

---

## Privacidade e segurança

- Seu login é a sua conta Google — mesma proteção (2FA, etc.) que você já tem nela.
- Os dados ficam guardados no Firebase (Google Cloud), região São Paulo.
- Só você e o Felipe têm acesso (ninguém mais consegue ler nem editar).
- Se você sair (botão "Sair"), o app desconecta totalmente — em qualquer aparelho compartilhado, faça isso.

---

## Atalhos rápidos

| Quero... | Faço... |
|---|---|
| Abrir o app | Toque/clique no ícone, ou abra `…/lamoda-fabi/` |
| Trocar de Vendas para Visitas | Botão "Início" no topo, depois o outro card |
| Filtrar visitas pelas com reclamação | Dashboard de visitas → chip "Com reclamações" |
| Mudar para tema claro | Botão de sol/lua no topo |
| Atualizar dados de vendas | Ctrl+F5 (PC) ou puxar pra baixo (mobile) |
| Sair completamente | Botão "Sair" no topo |
