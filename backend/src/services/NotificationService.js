const prisma = require('../lib/prisma');
const { decryptPhone } = require('../helpers/crypto');
const logger = require('../helpers/logger');

let twilioClient = null;

function getTwilioClient() {
  if (twilioClient) return twilioClient;
  const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN } = process.env;
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) return null;
  const twilio = require('twilio');
  twilioClient = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
  return twilioClient;
}

// 5-minute in-memory template cache
const templateCache = { data: null, expiresAt: 0 };

async function getTemplates() {
  if (templateCache.data && Date.now() < templateCache.expiresAt) {
    return templateCache.data;
  }
  const templates = await prisma.smsTemplate.findMany();
  templateCache.data = Object.fromEntries(templates.map((t) => [t.messageType, t.templateBody]));
  templateCache.expiresAt = Date.now() + 5 * 60 * 1000;
  return templateCache.data;
}

function interpolate(template, vars) {
  return template.replace(/\{(\w+)\}/g, (_, key) => vars[key] ?? `{${key}}`);
}

function formatDate(date) {
  const d = new Date(date);
  return `${String(d.getUTCDate()).padStart(2, '0')}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${d.getUTCFullYear()}`;
}

function formatTime(slotTime) {
  const [h, m] = slotTime.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour = h > 12 ? h - 12 : h === 0 ? 12 : h;
  return `${String(hour).padStart(2, '0')}:${String(m).padStart(2, '0')} ${period}`;
}

async function dispatchSms(phone, body, logId) {
  const client = getTwilioClient();
  if (!client) {
    logger.warn('SMS skipped — Twilio not configured');
    await prisma.smsLog.update({
      where: { id: logId },
      data: { status: 'FAILED', attemptCount: 1 },
    });
    return 'DISABLED';
  }

  try {
    const result = await Promise.race([
      client.messages.create({ to: `+91${phone}`, from: process.env.TWILIO_PHONE_NUMBER, body }),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Twilio timeout')), 2000)),
    ]);
    await prisma.smsLog.update({
      where: { id: logId },
      data: { status: 'SENT', twilioMessageSid: result.sid, attemptCount: 1 },
    });
    return 'SENT';
  } catch (err) {
    logger.error({ err: err.message }, 'SMS dispatch failed');
    await prisma.smsLog.update({
      where: { id: logId },
      data: { status: 'FAILED', attemptCount: 1 },
    });
    return 'FAILED';
  }
}

async function send(appointment, messageType) {
  const templates = await getTemplates();
  const template = templates[messageType];
  if (!template) {
    logger.error({ messageType }, 'SMS template not found');
    return 'FAILED';
  }

  const doctor = appointment.doctor;
  const department = doctor?.department;
  const vars = {
    patientName: appointment.patientName,
    doctorName: doctor?.name ?? 'Doctor',
    department: department?.name ?? 'Clinic',
    date: formatDate(appointment.appointmentDate),
    time: formatTime(appointment.slotTime),
    appointmentId: appointment.id,
  };
  const body = interpolate(template, vars);

  const logEntry = await prisma.smsLog.create({
    data: { appointmentId: appointment.id, messageType, status: 'PENDING', attemptCount: 0 },
  });

  const phone = decryptPhone(appointment.patientPhone);

  // Fire and forget — do not await full result in request path
  const resultPromise = dispatchSms(phone, body, logEntry.id);
  resultPromise.catch(() => {}); // errors already logged inside dispatchSms

  // Return optimistic status after short race
  const status = await Promise.race([
    resultPromise,
    new Promise((resolve) => setTimeout(() => resolve('PENDING_RETRY'), 2500)),
  ]);

  return status;
}

module.exports = {
  sendBookingSms: (appt) => send(appt, 'BOOKING'),
  sendCancelSms: (appt) => send(appt, 'CANCELLATION'),
  sendRescheduleSms: (appt) => send(appt, 'RESCHEDULING'),
  dispatchSms,
  getTemplates,
};
