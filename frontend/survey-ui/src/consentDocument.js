import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

export const DEFAULT_CONSENT_TITLE = 'AUTORIZACIÓN DE DESCUENTO POR NOMINA';

export const DEFAULT_CONSENT_BODY = `Yo, {{nombre}}, mayor de edad, identificada con la C.C. No. {{cc}} expedida en {{ciudad}}, manifiesto que AUTORIZO EXPRESA E IRREVOCABLEMENTE a la SOCIEDAD MEDICA CLINICA MAICAO S.A., para que, de mi salario, bonificaciones, prestaciones sociales legales y extralegales, liquidación final de prestaciones sociales e indemnizaciones a que tengo derecho, o de cualquier suma de dinero que se vaya generando a mi favor y que sea recibida por mí por cualquier concepto, me sean descontados el valor de: $\u00a0{{monto}} ({{monto_letras}}) para el mes (Nómina de aplicación): {{mes_nomina}} en {{cuotas}} cuotas.

En caso de terminación de mi contrato de trabajo por cualquier causa, autorizo que se realicen los descuentos pendientes sobre las sumas de dinero que se encuentren a mi favor, por concepto de valores recibidos o tomados por mí, de conformidad con los límites y condiciones establecidos en la legislación laboral vigente. Lo anterior, de conformidad con lo dispuesto en los artículos 59, numeral 1, y 149 del Código Sustantivo del Trabajo, y demás normas que los modifiquen o complementen.`;

export const DEFAULT_CONSENT_KEYS = [
  'nombre',
  'cc',
  'ciudad',
  'monto',
  'monto_letras',
  'mes_nomina',
  'cuotas',
  'firma',
];

/**
 * Texto de autorización de tratamiento de datos personales (Ley 1581/2012),
 * alineado con lo que la app captura en firma / consentimiento en línea.
 */
export const buildPersonalDataConsentText = ({ survey = null } = {}) => {
  const responsibleRaw = (survey?.consent_responsible || '').trim();
  const responsible = responsibleRaw
    || 'el responsable del tratamiento de la información asociada a esta encuesta/autorización';
  const purposeRaw = (survey?.consent_purpose || '').trim();
  const purpose = purposeRaw
    || 'gestionar la encuesta o autorización firmada, verificar la identidad del declarante, '
      + 'conservar evidencia de la voluntad (incluida la firma manuscrita digital), '
      + 'adelantar la trazabilidad de aceptación por correo electrónico (OTP) cuando aplique, '
      + 'y cumplir obligaciones legales, contractuales y de auditoría interna.';

  return (
    `AUTORIZACIÓN DE TRATAMIENTO DE DATOS PERSONALES\n`
    + `(Ley 1581 de 2012 y normas complementarias)\n\n`
    + `Declaro que he sido informado(a) de manera clara y comprensible, y autorizo de forma libre, `
    + `previa, expresa e informada a ${responsible} para recolectar, almacenar, usar, circular y `
    + `conservar mis datos personales suministrados al diligenciar y firmar este documento, entre ellos:\n\n`
    + `• Datos de identificación y los demás datos que diligencie en las preguntas del formulario `
    + `(por ejemplo nombre, tipo y número de documento, lugar de expedición y respuestas asociadas).\n`
    + `• Correo electrónico utilizado para el envío y verificación del código OTP de aceptación, cuando el flujo lo requiera.\n`
    + `• Firma manuscrita digital capturada en este dispositivo.\n`
    + `• Metadatos de captura en línea (fecha y hora, identificador de respuesta y, cuando aplique, identificador de dispositivo).\n`
    + `• Constancia de verificación OTP (correo y momento de verificación), cuando corresponda.\n\n`
    + `Finalidad del tratamiento: ${purpose}\n\n`
    + `Entiendo que, como titular, puedo conocer, actualizar, rectificar y solicitar la supresión de mis datos, `
    + `así como revocar esta autorización, ante el responsable del tratamiento, conforme a la ley. `
    + `Al marcar la casilla de aceptación y firmar este documento, confirmo que leí y acepto el presente consentimiento.`
  );
};

export const LETTERHEAD_MAX_BYTES = 4 * 1024 * 1024;

export const isSignatureDataUrl = (value) =>
  typeof value === 'string'
  && (value.startsWith('data:image/png') || value.startsWith('data:image/jpeg') || value.startsWith('data:image/jpg') || value.startsWith('data:image/webp'));

/**
 * Resolve signature image from mapped {{firma}}, signature_question_id, or first Firma answer.
 */
export const resolveConsentSignature = ({ answers = {}, mappings = [], survey = null, signatureQuestionId = '' } = {}) => {
  const mapFirma = (mappings || []).find((m) => m?.key === 'firma' && m.question_id);
  const candidates = [
    signatureQuestionId,
    mapFirma?.question_id,
    survey?.informed_consent?.signature_question_id,
  ].filter(Boolean);

  for (const qid of candidates) {
    const val = answers[qid];
    if (isSignatureDataUrl(val)) return val;
  }

  // Prefer questions typed as Firma / signature
  const questions = survey?.questions || [];
  for (const q of questions) {
    const t = q.type || q.question_type || '';
    if (t === 'Firma' || t === 'signature') {
      const val = answers[q.id] || answers[q._id];
      if (isSignatureDataUrl(val)) return val;
    }
  }

  // Fallback: any image data URL in answers
  for (const val of Object.values(answers || {})) {
    if (isSignatureDataUrl(val)) return val;
  }
  return '';
};

export const extractConsentPlaceholders = (body = '') => {
  const keys = [];
  const re = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g;
  let m;
  while ((m = re.exec(body)) !== null) {
    if (!keys.includes(m[1])) keys.push(m[1]);
  }
  return keys;
};

export const buildDefaultInformedConsent = () => ({
  title: DEFAULT_CONSENT_TITLE,
  body: DEFAULT_CONSENT_BODY,
  mappings: DEFAULT_CONSENT_KEYS.map((key) => ({ key, question_id: '' })),
  letterhead: 'membrete2',
  letterhead_pdf: '',
  letterhead_filename: '',
  signature_question_id: '',
  acceptance_question_id: '',
  acceptance_value: 'SI, AUTORIZO',
  denial_value: 'NO AUTORIZO',
});

export const readLetterheadPdfFile = (file) => new Promise((resolve, reject) => {
  if (!file) {
    reject(new Error('Selecciona un archivo PDF'));
    return;
  }
  const isPdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name || '');
  if (!isPdf) {
    reject(new Error('El membrete debe ser un archivo PDF'));
    return;
  }
  if (file.size > LETTERHEAD_MAX_BYTES) {
    reject(new Error('El PDF del membrete no puede superar 4 MB'));
    return;
  }
  const reader = new FileReader();
  reader.onload = () => resolve({ dataUrl: String(reader.result || ''), filename: file.name || 'membrete.pdf' });
  reader.onerror = () => reject(new Error('No se pudo leer el PDF'));
  reader.readAsDataURL(file);
});

const dataUrlToArrayBuffer = (dataUrl) => {
  const raw = String(dataUrl || '');
  const comma = raw.indexOf(',');
  const b64 = comma >= 0 ? raw.slice(comma + 1) : raw;
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
};

const formatAnswerValue = (value) => {
  if (value == null || value === '') return '________';
  if (typeof value === 'string' && value.startsWith('data:image')) return '[Firma capturada]';
  if (Array.isArray(value)) {
    if (value.every((v) => typeof v === 'string' && !v.startsWith('data:'))) {
      return value.join(', ') || '________';
    }
    return value.map((v) => formatAnswerValue(v)).join(', ');
  }
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }
  return String(value);
};

export const mergeConsentTemplate = (body, mappings, answers = {}) => {
  const map = {};
  (mappings || []).forEach((m) => {
    if (m?.key) map[m.key] = m.question_id || '';
  });
  return String(body || '').replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key) => {
    const qid = map[key];
    if (!qid) return '________';
    return formatAnswerValue(answers[qid]);
  });
};

export const formatConsentDate = (rawDate) => {
  if (!rawDate) return '';
  try {
    const d = new Date(rawDate);
    return Number.isNaN(d.getTime()) ? String(rawDate) : d.toLocaleString('es-CO');
  } catch {
    return String(rawDate);
  }
};

export const buildConsentMeta = (response) => {
  const responseId = String(response?.id || response?._id || '');
  const rawDate = response?.created_at || response?.timestamp || response?.created || response?.date || response?.submitted_at;
  const dateLabel = formatConsentDate(rawDate);
  const consentEmail = (response?.consent_email || '').trim();
  const consentOtpCode = String(response?.consent_otp_code || '').trim();
  const otpVerifiedLabel = formatConsentDate(response?.consent_otp_verified_at);
  const otpVerified = Boolean(response?.consent_otp_verified_at || consentEmail);
  const signatureConsentLabel = formatConsentDate(response?.signature_consent_at);

  const traceLines = [
    dateLabel && `Fecha de captura: ${dateLabel}`,
    responseId && `ID respuesta: ${responseId}`,
    consentEmail && `Correo OTP: ${consentEmail}`,
    consentOtpCode && `OTP aceptado: ${consentOtpCode}`,
    otpVerifiedLabel && `OTP verificado: ${otpVerifiedLabel}`,
    otpVerified && !otpVerifiedLabel && consentEmail && 'OTP verificado: sí',
  ].filter(Boolean);

  return {
    responseId,
    dateLabel,
    consentEmail,
    consentOtpCode,
    otpVerifiedLabel,
    otpVerified,
    signatureConsentLabel,
    stampLine: 'Consentimiento capturado en línea',
    detailLine: traceLines.slice(0, 2).join('  ·  '),
    traceLines,
  };
};

const wrapText = (text, font, fontSize, maxWidth) => {
  const paragraphs = String(text || '').split(/\n/);
  const lines = [];
  paragraphs.forEach((paragraph, pIdx) => {
    const words = paragraph.split(/\s+/).filter(Boolean);
    if (words.length === 0) {
      lines.push('');
      return;
    }
    let current = words[0];
    for (let i = 1; i < words.length; i += 1) {
      const next = `${current} ${words[i]}`;
      if (font.widthOfTextAtSize(next, fontSize) <= maxWidth) {
        current = next;
      } else {
        lines.push(current);
        current = words[i];
      }
    }
    lines.push(current);
    if (pIdx < paragraphs.length - 1) lines.push('');
  });
  return lines;
};

/**
 * Build PDF bytes (Uint8Array) for informed consent over letterhead.
 */
export const buildConsentPdfBytes = async ({
  title,
  mergedBody,
  response,
  survey = null,
  letterheadUrl = '/membrete2.pdf',
  letterheadPdf = '',
  signatureDataUrl = '',
}) => {
  const meta = buildConsentMeta(response);
  let letterheadBytes;
  if (letterheadPdf && String(letterheadPdf).length > 32) {
    letterheadBytes = dataUrlToArrayBuffer(letterheadPdf);
  } else {
    letterheadBytes = await fetch(letterheadUrl).then((r) => {
      if (!r.ok) throw new Error('No se pudo cargar el membrete PDF');
      return r.arrayBuffer();
    });
  }

  const letterheadDoc = await PDFDocument.load(letterheadBytes);
  const pdfDoc = await PDFDocument.create();
  const [letterPage] = await pdfDoc.copyPages(letterheadDoc, [0]);
  pdfDoc.addPage(letterPage);

  let page = pdfDoc.getPages()[0];
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const marginX = 48;
  const topStart = page.getHeight() - 160;
  const bottomMargin = 72;
  const maxWidth = page.getWidth() - marginX * 2;
  const titleSize = 13;
  const bodySize = 10;
  const lineHeight = 14;

  let y = topStart;

  const ensureSpace = async (needed) => {
    if (y - needed >= bottomMargin) return;
    const [extra] = await pdfDoc.copyPages(letterheadDoc, [0]);
    pdfDoc.addPage(extra);
    page = pdfDoc.getPages()[pdfDoc.getPageCount() - 1];
    y = topStart;
  };

  const sigUrl = signatureDataUrl
    || resolveConsentSignature({
      answers: response?.answers || {},
      mappings: survey?.informed_consent?.mappings || [],
      survey,
      signatureQuestionId: survey?.informed_consent?.signature_question_id || '',
    });

  // Drop textual [Firma capturada] placeholders from body — image goes in signature block
  const bodyForPdf = String(mergedBody || '')
    .replace(/\[Firma capturada\]/gi, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  await ensureSpace(40);
  const titleText = String(title || DEFAULT_CONSENT_TITLE).slice(0, 120);
  const titleWidth = fontBold.widthOfTextAtSize(titleText, titleSize);
  page.drawText(titleText, {
    x: Math.max(marginX, (page.getWidth() - titleWidth) / 2),
    y,
    size: titleSize,
    font: fontBold,
    color: rgb(0.1, 0.15, 0.2),
  });
  y -= 28;

  const lines = wrapText(bodyForPdf, font, bodySize, maxWidth);
  for (const line of lines) {
    await ensureSpace(lineHeight);
    if (line) {
      page.drawText(line, {
        x: marginX,
        y,
        size: bodySize,
        font,
        color: rgb(0.15, 0.15, 0.18),
      });
    }
    y -= lineHeight;
  }

  y -= 20;
  const sigBlockHeight = sigUrl ? 110 : 40;
  await ensureSpace(sigBlockHeight + 36);
  page.drawText('Firma del declarante', {
    x: marginX,
    y,
    size: 10,
    font: fontBold,
    color: rgb(0.2, 0.25, 0.3),
  });
  y -= 8;

  if (sigUrl) {
    try {
      const imgBytes = dataUrlToArrayBuffer(sigUrl);
      const lower = String(sigUrl).slice(0, 40).toLowerCase();
      const embedded = lower.includes('image/jpeg') || lower.includes('image/jpg')
        ? await pdfDoc.embedJpg(imgBytes)
        : await pdfDoc.embedPng(imgBytes);
      const maxW = Math.min(240, maxWidth);
      const maxH = 80;
      const scale = Math.min(maxW / embedded.width, maxH / embedded.height);
      const drawW = embedded.width * scale;
      const drawH = embedded.height * scale;
      y -= drawH;
      page.drawRectangle({
        x: marginX,
        y: y - 4,
        width: drawW + 8,
        height: drawH + 8,
        borderColor: rgb(0.75, 0.78, 0.82),
        borderWidth: 0.8,
        color: rgb(1, 1, 1),
      });
      page.drawImage(embedded, {
        x: marginX + 4,
        y,
        width: drawW,
        height: drawH,
      });
      y -= 14;
    } catch (e) {
      page.drawText('(No se pudo incrustar la imagen de firma)', {
        x: marginX,
        y: y - 14,
        size: 8,
        font,
        color: rgb(0.7, 0.2, 0.2),
      });
      y -= 20;
    }
  } else {
    page.drawText('(Sin firma capturada en la respuesta)', {
      x: marginX,
      y: y - 14,
      size: 8,
      font,
      color: rgb(0.7, 0.35, 0.2),
    });
    y -= 20;
  }

  y -= 8;
  page.drawText(meta.stampLine, {
    x: marginX,
    y,
    size: 9,
    font: fontBold,
    color: rgb(0.2, 0.45, 0.3),
  });
  y -= 12;
  page.drawText('Trazabilidad OTP / captura en línea', {
    x: marginX,
    y,
    size: 8,
    font: fontBold,
    color: rgb(0.35, 0.4, 0.45),
  });
  for (const line of (meta.traceLines || [])) {
    y -= 11;
    await ensureSpace(14);
    page.drawText(String(line).slice(0, 120), {
      x: marginX,
      y,
      size: 8,
      font,
      color: rgb(0.4, 0.4, 0.45),
    });
  }

  return pdfDoc.save();
};

export const downloadConsentPdf = async (opts) => {
  const bytes = await buildConsentPdfBytes(opts);
  const blob = new Blob([bytes], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const id = opts.response?.id || opts.response?._id || 'respuesta';
  a.href = url;
  a.download = `consentimiento-${id}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
};
