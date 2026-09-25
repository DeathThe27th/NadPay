## NadPay Envio Indexer

This indexer is initialized for the verified Monad mainnet NadPay contract and
stores public settlement events only. Set the exact contract deployment block
in `config.yaml` before the first cloud sync; `0` is deliberately a visible
placeholder so a genesis backfill cannot happen accidentally.

The generated handlers include transaction hashes and use
`chain_id + transaction_hash + log_index` event identities. Keep organization
metadata out of this public GraphQL index; private payroll records belong in
the application database.

*Please refer to the [documentation website](https://docs.envio.dev) for a thorough guide on all [Envio](https://envio.dev) indexer features*

### Run

```bash
pnpm dev
```

Visit http://localhost:8080 to see the GraphQL Playground, local password is `testing`.

### Generate files from `config.yaml` or `schema.graphql`

```bash
pnpm codegen
```

### Pre-requisites

- [Node.js v22+ (v24 recommended)](https://nodejs.org/en/download/current)
- [pnpm (use v8 or newer)](https://pnpm.io/installation)
- [Docker](https://www.docker.com/products/docker-desktop/) or [Podman](https://podman.io/)
