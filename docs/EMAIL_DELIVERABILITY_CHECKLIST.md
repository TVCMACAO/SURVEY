# Checklist de entregabilidad SMTP (Fase 1)

Usar por cada grupo/dominio que envía OTP o PDF. Completar fuera del código (panel DNS / proveedor).

## Remitente

- [ ] `smtp_from_email` es una casilla real del dominio (preferir `noreply@` o `autorizaciones@`, no `info@` genérico si se puede).
- [ ] `smtp_user` y `smtp_from_email` usan el **mismo dominio**.
- [ ] `smtp_from_name` identifica a la organización (no genérico).

## DNS del dominio From

- [ ] **SPF**: registro TXT que autoriza el servidor SMTP (Hostinger u otro).
- [ ] **DKIM**: firma activada en el panel del proveedor; selector visible en DNS.
- [ ] **DMARC**: al menos `v=DMARC1; p=none; rua=mailto:...` y luego endurecer.

Comprobar:

```bash
dig TXT tudominio.com +short
dig TXT _dmarc.tudominio.com +short
```

## Pruebas

- [ ] Enviar “Probar SMTP” del grupo a una cuenta **Gmail**.
- [ ] Enviar a una cuenta **Outlook/Hotmail**.
- [ ] Abrir el correo → Ver original / headers → `Authentication-Results`: SPF=pass, DKIM=pass.
- [ ] Anotar Inbox vs Spam y minutos desde el clic hasta la llegada.
- [ ] Contrastar con `smtp_ms` / `message_id` guardados en Mongo (`consent_otps` / `email_outbox`).

## Gate de proveedor transaccional

Si `smtp_ms` p95 &lt; 5 s pero el correo tarda &gt; 60–90 s en Gmail/Outlook con SPF/DKIM pass, evaluar SES / SendGrid / Resend en un plan aparte.
