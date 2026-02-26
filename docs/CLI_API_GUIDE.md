# Filegate CLI + API Guide

Guia rapida para usar Filegate desde terminal.

## 1) Setup rapido

### Opcion A: CLI global

```bash
cd apps/cli
bun link
filegate help
```

### Opcion B: sin instalar global

```bash
bun run --cwd apps/cli start -- help
```

## 2) Configurar URL y token

```bash
filegate config set api_url https://filegate.498as.com/api
filegate config set token TU_API_SECRET
```

La config se guarda en `~/.filegate/config.json`.

## 3) Comandos CLI (list, get/show, etc.)

### `list`

Lista sesiones.

```bash
filegate list
filegate list --json
filegate list --status pending
filegate list --status picked
filegate list --status archived
```

### `show` (equivalente a "get" en CLI)

No existe comando `get` en la CLI; el equivalente es `show`.

```bash
filegate show ses_ABC123
```

### `pick`

Descarga archivos de una sesion a un destino local.

```bash
filegate pick ses_ABC123 --dest ./downloads
filegate pick ses_ABC123 --dest ./downloads --filter "*.zip"
filegate pick ses_ABC123 --dest ./downloads --dry-run
filegate pick ses_ABC123 --dest ./downloads --no-mark
```

Notas:
- `--dest` es obligatorio.
- Por defecto, al terminar marca la sesion como `picked`.
- Con `--no-mark` evita ese cambio.

### `label`

Actualiza etiqueta de sesion.

```bash
filegate label ses_ABC123 "Facturas febrero"
```

### `archive`

Archiva sesion.

```bash
filegate archive ses_ABC123
filegate archive ses_ABC123 --yes
```

Notas:
- Si la sesion esta `pending`, pide confirmacion.
- `--yes` (o `--force`) salta la confirmacion.

## 4) API HTTP (GET/list/get y mas)

Define variables:

```bash
BASE_URL="https://filegate.498as.com/api"
TOKEN="TU_API_SECRET"
```

### Health (sin token)

```bash
curl -sS "$BASE_URL/health"
```

### Listar sesiones (GET /sessions)

```bash
curl -sS \
  -H "Authorization: Bearer $TOKEN" \
  "$BASE_URL/sessions"
```

### Obtener sesion (GET /sessions/{id})

```bash
curl -sS \
  -H "Authorization: Bearer $TOKEN" \
  "$BASE_URL/sessions/ses_ABC123"
```

### Crear sesion (POST /sessions)

```bash
curl -sS -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"label":"Carga inicial"}' \
  "$BASE_URL/sessions"
```

### Actualizar sesion (PATCH /sessions/{id})

```bash
curl -sS -X PATCH \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status":"archived"}' \
  "$BASE_URL/sessions/ses_ABC123"
```

### Subir archivos (POST /sessions/{id}/files)

```bash
curl -sS -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -F "files=@./report.pdf" \
  -F "files=@./data.csv" \
  "$BASE_URL/sessions/ses_ABC123/files"
```

### Descargar archivo (GET /sessions/{id}/files/{name})

```bash
curl -sS \
  -H "Authorization: Bearer $TOKEN" \
  -o ./report.pdf \
  "$BASE_URL/sessions/ses_ABC123/files/report.pdf"
```

### Borrar archivo (DELETE /sessions/{id}/files/{name})

```bash
curl -sS -X DELETE \
  -H "Authorization: Bearer $TOKEN" \
  "$BASE_URL/sessions/ses_ABC123/files/report.pdf"
```

### Borrar sesion (DELETE /sessions/{id})

```bash
curl -sS -X DELETE \
  -H "Authorization: Bearer $TOKEN" \
  "$BASE_URL/sessions/ses_ABC123"
```

## 5) Errores comunes

- `401 Unauthorized`
  - Token incorrecto o vacio.
  - Revisa `filegate config set token ...`.
- `404 Session not found`
  - El id no existe.
- `403 IP not allowed`
  - La API tiene `ALLOWED_IPS` configurado y tu IP no esta en la lista.
