"""Send email via per-group SMTP settings."""
import html
import smtplib
import ssl
from email.message import EmailMessage
from email.utils import formataddr, formatdate, make_msgid


class SmtpConfigError(Exception):
    pass


class SmtpSendError(Exception):
    pass


def group_has_smtp(group):
    if not isinstance(group, dict):
        return False
    host = (group.get('smtp_host') or '').strip()
    from_email = (group.get('smtp_from_email') or group.get('smtp_user') or '').strip()
    return bool(host and from_email)


def _email_domain(address):
    addr = (address or '').strip()
    if '@' not in addr:
        return 'localhost'
    return addr.rsplit('@', 1)[-1].strip().lower() or 'localhost'


def send_smtp_email(group, to_email, subject, body_text, body_html=None, attachments=None):
    """
    Send email using SurveyGroup SMTP fields.
    Plain text always; optional HTML multipart (text/plain + text/html).
    attachments: optional list of dicts {filename, content (bytes), maintype, subtype}
      or tuples (filename, bytes, mime_main, mime_sub).
    Supports Hostinger-style SSL on port 465 and STARTTLS on 587.
    Raises SmtpConfigError or SmtpSendError.
    """
    if not group_has_smtp(group):
        raise SmtpConfigError(
            'El grupo de esta encuesta no tiene servidor de correo configurado. '
            'Configura SMTP en Gestión de usuarios → Grupos.'
        )

    host = (group.get('smtp_host') or '').strip()
    try:
        port = int(group.get('smtp_port') or 587)
    except (TypeError, ValueError):
        port = 587
    user = (group.get('smtp_user') or '').strip()
    password = group.get('smtp_password') or ''
    use_tls = bool(group.get('smtp_use_tls', True))
    from_email = (group.get('smtp_from_email') or user or '').strip()
    from_name = (group.get('smtp_from_name') or '').strip()
    reply_to = (group.get('smtp_reply_to') or '').strip()

    msg = EmailMessage()
    msg['Subject'] = subject
    msg['From'] = formataddr((from_name, from_email)) if from_name else from_email
    msg['To'] = to_email
    if reply_to:
        msg['Reply-To'] = reply_to
    msg['Date'] = formatdate(localtime=True)
    msg['Message-ID'] = make_msgid(domain=_email_domain(from_email))
    msg['Auto-Submitted'] = 'auto-generated'
    msg['X-Auto-Response-Suppress'] = 'All'

    text = body_text if body_text is not None else ''
    msg.set_content(text, charset='utf-8')
    if body_html:
        msg.add_alternative(body_html, subtype='html', charset='utf-8')

    for att in attachments or []:
        if isinstance(att, dict):
            filename = att.get('filename') or 'adjunto.bin'
            content = att.get('content') or b''
            maintype = att.get('maintype') or 'application'
            subtype = att.get('subtype') or 'octet-stream'
        else:
            filename, content, maintype, subtype = att
        if not isinstance(content, (bytes, bytearray)):
            content = bytes(content)
        msg.add_attachment(
            content,
            maintype=maintype,
            subtype=subtype,
            filename=filename,
        )

    # Port 465 → implicit SSL; 587 → STARTTLS when use_tls
    use_ssl = port == 465 or (use_tls and port == 465)
    refused = {}

    try:
        if use_ssl or port == 465:
            context = ssl.create_default_context()
            with smtplib.SMTP_SSL(host, port, timeout=30, context=context) as server:
                if user:
                    server.login(user, password)
                refused = server.send_message(msg) or {}
        else:
            with smtplib.SMTP(host, port, timeout=30) as server:
                server.ehlo()
                if use_tls or port == 587:
                    context = ssl.create_default_context()
                    server.starttls(context=context)
                    server.ehlo()
                if user:
                    server.login(user, password)
                refused = server.send_message(msg) or {}
    except SmtpConfigError:
        raise
    except Exception as exc:
        raise SmtpSendError(f'No se pudo enviar el correo: {exc}') from exc

    if refused:
        raise SmtpSendError(
            f'El servidor SMTP rechazó destinatarios: {", ".join(str(k) for k in refused.keys())}'
        )


def build_consent_pdf_email(group, survey, response_id=''):
    """Email body when delivering the signed consent PDF. Returns (subject, text, html)."""
    org = _org_label(group, survey)
    survey_title = ((survey or {}).get('title') or '').strip() or 'autorización en línea'
    ic = (survey or {}).get('informed_consent') or {}
    doc_title = (ic.get('title') or '').strip() or survey_title
    org_esc = html.escape(org)
    title_esc = html.escape(doc_title)
    rid = html.escape(str(response_id or '')[:32])

    subject = f'Tu documento de autorización — {doc_title}'[:200]
    body_text = (
        f'{org}\n'
        f'\n'
        f'Adjuntamos el PDF de tu autorización / consentimiento informado '
        f'(«{doc_title}»), generado al enviar tus respuestas.\n'
        f'\n'
        f'{("Referencia: " + str(response_id) + chr(10) + chr(10)) if response_id else ""}'
        f'Si no reconoces este mensaje, contacta a la organización remitente.\n'
        f'\n'
        f'—\n'
        f'Mensaje automático. Conserva el PDF para tu archivo.\n'
    )
    body_html = f"""<!DOCTYPE html>
<html lang="es">
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:24px;background:#f4f6f8;font-family:Arial,Helvetica,sans-serif;color:#1f2937;">
  <table role="presentation" width="100%" style="max-width:560px;margin:0 auto;background:#fff;border:1px solid #e5e7eb;border-radius:8px;">
    <tr><td style="padding:24px 28px;">
      <p style="margin:0 0 4px;font-size:13px;color:#6b7280;">{org_esc}</p>
      <h1 style="margin:0 0 12px;font-size:18px;">Tu documento de autorización</h1>
      <p style="margin:0 0 12px;font-size:14px;line-height:1.5;">
        Adjuntamos el PDF de <strong>«{title_esc}»</strong>, generado al enviar tus respuestas.
      </p>
      {f'<p style="margin:0 0 12px;font-size:12px;color:#6b7280;">Referencia: {rid}</p>' if response_id else ''}
      <p style="margin:0;font-size:12px;color:#6b7280;line-height:1.5;">
        Conserva el archivo para tu registro. Si no reconoces este mensaje, contacta a la organización.
      </p>
    </td></tr>
  </table>
</body>
</html>"""
    return subject, body_text, body_html


def _org_label(group, survey=None):
    from_name = ((group or {}).get('smtp_from_name') or '').strip()
    survey_title = ((survey or {}).get('title') or '').strip()
    group_name = ((group or {}).get('name') or '').strip()
    return from_name or survey_title or group_name or 'la organización'


def build_consent_otp_message(group, survey, code, expires_minutes=10):
    """
    Institutional transactional email for consent verification (text + HTML).
    Avoids spammy subject/body patterns (no "OTP urgente", ALL CAPS, short links).
    Returns (subject, body_text, body_html).
    """
    org = _org_label(group, survey)
    survey_title = ((survey or {}).get('title') or '').strip() or 'autorización en línea'
    code_str = str(code or '').strip()
    org_esc = html.escape(org)
    title_esc = html.escape(survey_title)
    code_esc = html.escape(code_str)

    subject = f'Verificación de autorización — {survey_title}'[:200]

    body_text = (
        f'{org}\n'
        f'\n'
        f'Solicitaste confirmar tu autorización / consentimiento informado '
        f'para «{survey_title}».\n'
        f'\n'
        f'Tu código de verificación es: {code_str}\n'
        f'\n'
        f'Este código vence en {expires_minutes} minutos.\n'
        f'Úsalo solo en el formulario donde lo pediste.\n'
        f'\n'
        f'Si no solicitaste este mensaje, puedes ignorarlo; '
        f'no se realizará ninguna acción con tu correo.\n'
        f'\n'
        f'—\n'
        f'Mensaje automático de verificación. No respondas a este correo '
        f'salvo que tu organización indique lo contrario.\n'
    )

    body_html = f"""<!DOCTYPE html>
<html lang="es">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f6f8;font-family:Arial,Helvetica,sans-serif;color:#1f2937;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f6f8;padding:24px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" style="max-width:560px;background:#ffffff;border:1px solid #e5e7eb;border-radius:8px;">
        <tr><td style="padding:24px 28px 8px;">
          <p style="margin:0 0 4px;font-size:13px;color:#6b7280;">{org_esc}</p>
          <h1 style="margin:0;font-size:18px;font-weight:bold;color:#111827;line-height:1.35;">
            Verificación de autorización
          </h1>
        </td></tr>
        <tr><td style="padding:8px 28px 16px;">
          <p style="margin:0 0 12px;font-size:14px;line-height:1.5;">
            Solicitaste confirmar tu autorización / consentimiento informado para
            <strong>«{title_esc}»</strong>.
          </p>
          <p style="margin:0 0 8px;font-size:13px;color:#4b5563;">Tu código de verificación:</p>
          <p style="margin:0 0 16px;font-size:28px;letter-spacing:6px;font-weight:bold;color:#0f766e;font-family:Consolas,Monaco,monospace;">
            {code_esc}
          </p>
          <p style="margin:0 0 12px;font-size:13px;line-height:1.5;color:#4b5563;">
            Este código vence en {expires_minutes} minutos. Úsalo solo en el formulario donde lo pediste.
          </p>
          <p style="margin:0;font-size:12px;line-height:1.5;color:#6b7280;">
            Si no solicitaste este mensaje, puedes ignorarlo; no se realizará ninguna acción con tu correo.
          </p>
        </td></tr>
        <tr><td style="padding:16px 28px 24px;border-top:1px solid #f3f4f6;">
          <p style="margin:0;font-size:11px;color:#9ca3af;line-height:1.4;">
            Mensaje automático de verificación enviado por {org_esc}.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>"""

    return subject, body_text, body_html


def build_smtp_test_message(group):
    """Professional SMTP test email (text + HTML). Returns (subject, body_text, body_html)."""
    org = _org_label(group)
    org_esc = html.escape(org)
    subject = f'Confirmación de correo — {org}'[:200]
    body_text = (
        f'{org}\n'
        f'\n'
        f'Este es un mensaje de prueba de la configuración de correo del grupo.\n'
        f'Si lo recibiste en la bandeja de entrada, el servidor SMTP responde correctamente.\n'
        f'\n'
        f'Revisa también la carpeta de spam la primera vez y marca el remitente como seguro '
        f'si tu proveedor lo filtró.\n'
        f'\n'
        f'Para mejorar la entrega, el dominio del remitente debe tener SPF, DKIM y DMARC '
        f'configurados en el DNS (panel del proveedor, p. ej. Hostinger).\n'
    )
    body_html = f"""<!DOCTYPE html>
<html lang="es">
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:24px;background:#f4f6f8;font-family:Arial,Helvetica,sans-serif;color:#1f2937;">
  <table role="presentation" width="100%" style="max-width:560px;margin:0 auto;background:#fff;border:1px solid #e5e7eb;border-radius:8px;">
    <tr><td style="padding:24px 28px;">
      <p style="margin:0 0 4px;font-size:13px;color:#6b7280;">{org_esc}</p>
      <h1 style="margin:0 0 12px;font-size:18px;">Confirmación de correo</h1>
      <p style="margin:0 0 12px;font-size:14px;line-height:1.5;">
        Este es un mensaje de prueba de la configuración SMTP del grupo.
        Si lo recibiste, el servidor de correo responde correctamente.
      </p>
      <p style="margin:0;font-size:12px;color:#6b7280;line-height:1.5;">
        Para mejorar la entrega a bandeja de entrada, activa SPF, DKIM y DMARC
        en el DNS del dominio del remitente.
      </p>
    </td></tr>
  </table>
</body>
</html>"""
    return subject, body_text, body_html
