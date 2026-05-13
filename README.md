# La Moda - Fabi

Hub unificado para a Fabiana Shimoda: vendas VE27 + checklist pós-vendas La Moda.

- **Stack:** HTML/CSS/JS vanilla + Firebase (Firestore, Auth, Storage, Hosting) + PWA
- **URL:** https://lamoda-fabi.web.app/
- **Projeto Firebase:** `lamoda-fabi` (`southamerica-east1`)
- **Repo:** privado, código-fonte versionado aqui

Documentação técnica completa em [`docs/`](docs/):

- [`ARQUITETURA.md`](docs/ARQUITETURA.md) — stack, schemas, regras, hospedagem
- [`MIGRACAO.md`](docs/MIGRACAO.md) — plano de cutover dos apps antigos
- [`GUIA-DE-USO.md`](docs/GUIA-DE-USO.md) — manual para a Fabiana
- [`CHANGELOG.md`](docs/CHANGELOG.md) — histórico de mudanças
- [`ROADMAP.md`](docs/ROADMAP.md) — Now / Next / Later
- [`DECISOES.md`](docs/DECISOES.md) — ADRs
- [`SECURITY.md`](docs/SECURITY.md) — política de segurança

## Deploy

```powershell
firebase deploy                              # tudo (hosting + rules + indexes)
firebase deploy --only hosting               # só frontend
firebase deploy --only firestore:rules       # só rules Firestore
firebase deploy --only storage:rules         # só rules Storage
```

## Estado atual

`v0.0.1` — placeholder inicial publicado. Em construção.
