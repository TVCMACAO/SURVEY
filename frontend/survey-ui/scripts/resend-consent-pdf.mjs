import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  mergeConsentTemplate,
  resolveConsentSignature,
  buildConsentPdfBytes,
} from '../src/consentDocument.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const payloadPath = process.argv[2] || '/tmp/james-resend-payload.json';
const outPath = process.argv[3] || '/tmp/james-consent.pdf';
const payload = JSON.parse(fs.readFileSync(payloadPath, 'utf8'));
const survey = payload.survey;
const response = payload.response;
const ic = survey.informed_consent || {};
const answers = response.answers || {};

const mergedBody = mergeConsentTemplate(ic.body || '', ic.mappings || [], answers);
const signatureDataUrl = resolveConsentSignature({
  answers,
  mappings: ic.mappings || [],
  survey,
  signatureQuestionId: ic.signature_question_id || '',
});

let letterheadPdf = ic.letterhead_pdf || '';
if (!letterheadPdf || String(letterheadPdf).length < 32) {
  const lhPath = path.join(__dirname, '../public/membrete2.pdf');
  const b64 = fs.readFileSync(lhPath).toString('base64');
  letterheadPdf = `data:application/pdf;base64,${b64}`;
}

const bytes = await buildConsentPdfBytes({
  title: ic.title || survey.title || 'Consentimiento informado',
  mergedBody,
  response,
  survey,
  letterheadUrl: '/membrete2.pdf',
  letterheadPdf,
  signatureDataUrl,
});

fs.writeFileSync(outPath, Buffer.from(bytes));
console.log(JSON.stringify({
  ok: true,
  outPath,
  pdfLen: bytes.length,
  responseId: response.id || response._id,
  email: response.consent_email,
}));
