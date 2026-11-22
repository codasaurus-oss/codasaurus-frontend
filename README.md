# Codasaurus dashboard

The Svelte 5 single-page dashboard for [Codasaurus](https://github.com/codasaurus-oss/codasaurus), a self-hosted GitHub App that reviews pull requests.

This repository is the UI only. The backend binary serves the built `dist/` from
`svelte-dashboard/dist`, and the backend Docker image clones this repository at a
pinned ref, builds it, and copies the output in. All calls are same-origin
`/api/*`, so there is no configurable API base URL in production.

## Development

Requires Node 20+.

```bash
npm ci
npm run dev
```

`npm run dev` serves on <http://localhost:5173> and proxies `/api` to
`CODASAURUS_API` (default `http://127.0.0.1:3000`). Run the backend separately:

```bash
# in the codasaurus repository
docker compose up -d postgres
DATABASE_URL=postgres://codasaurus:codasaurus@127.0.0.1:5432/codasaurus cargo run -- serve
```

## Build

```bash
npm ci
npm run build   # writes dist/
```

## Design system

Design tokens are CSS custom properties in `src/app.css`; `DESIGN.md` describes
the system and the rules for adding components.

## Contributing

See the organization defaults in
[codasaurus-oss/.github](https://github.com/codasaurus-oss/.github). Commits must
be signed off (`git commit -s`).

## License

AGPL-3.0-or-later. See [LICENSE](LICENSE).
