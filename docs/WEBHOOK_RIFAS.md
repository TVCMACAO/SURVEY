# Webhook encuesta → rifas

Cuando una persona **autoriza** en la encuesta, Survey envía un POST firmado a la URL configurada.

## Headers

- `Content-Type: application/json; charset=utf-8`
- `X-Survey-Event: survey.response.authorized` (prueba: `…authorized.test`)
- `X-Survey-Delivery-Id: <id>`
- `X-Survey-Signature: sha256=<HMAC-SHA256(secret, raw_body_hex)>`

## Body (extracto `user`)

```json
{
  "event": "survey.response.authorized",
  "event_version": 1,
  "user": {
    "numero_documento": "11223344",
    "documento_empleado": "11223344",
    "nombre_completo": "Juan Perez",
    "correo": "juan@correo.com",
    "tipo_documento": "CC",
    "cargo": "Auxiliar"
  },
  "numero_documento": "11223344",
  "documento_empleado": "11223344",
  "nombre_completo": "Juan Perez",
  "correo": "juan@correo.com",
  "tipo_documento": "CC",
  "response": { "id": "<mongo_id>", "created_at": "…" },
  "survey": { "id": "<mongo_id>", "title": "…" },
  "authorization": {
    "accepted": true,
    "consent_otp_verified": true
  }
}
```

`documento_empleado` es el mismo valor que **DOCUMENTO DEL EMPLEADO** / `numero_documento` (se envía en `user` y en la raíz para no confundirlo con `tipo_documento`).

## Rifas debe

1. Validar la firma HMAC con el mismo secreto.
2. Upsert por `documento_empleado` o `numero_documento`; usar `correo` para login.
3. Idempotencia por `response.id`.
4. Responder 2xx rápido. 4xx = no reintentar; 5xx = Survey reintenta.

Configuración en el editor de la encuesta: **Webhook rifas**.
