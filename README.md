# filegate

Monorepo basado en Turborepo para el servicio de subida de ficheros.

## Workspaces

- `apps/api`: API Bun + TypeScript.
- `packages/sdk`: SDK TypeScript generado desde OpenAPI.

## Requisitos

- Bun >= 1.3

## Comandos

- `bun install`
- `bun run dev`
- `bun run lint`
- `bun run typecheck`
- `bun run test`
- `bun run openapi:validate`
- `bun run sdk:generate`
- `bun run check`

## API app

En `apps/api` puedes usar:

- `bun run dev`
- `bun run start`

Variables de entorno (ver `apps/api/.env.example`):

- `PORT`
- `INBOX_PATH`
- `API_SECRET`
- `MAX_FILE_SIZE`
- `UNZIP_ENABLED`
- `ALLOWED_IPS`
