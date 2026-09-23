const cron = require('node-cron');
const prisma = require('../lib/prisma');
const { decryptPhone } = require('../helpers/crypto');
const { dispatchSms, getTemplates } = require('../services/NotificationService');
const logger = require('../helpers/logger');

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

async function retryFailedSms() {
  const failed = await prisma.smsLog.findMany({
    where: { status: 'FAILED', attemptCount: { lt: 3 } },
    include: {
      appointment: { include: { doctor: { include: { department: true } } } },
    },
    take: 20,
  });

  if (!failed.length) return;
  logger.info({ count: failed.length }, 'SMS retry job: retrying failed messages');

  const templates = await getTemplates();

  for (const log of failed) {
    const appt = log.appointment;
    const template = templates[log.messageType];
    if (!template) continue;

    const body = interpolate(template, {
      patientName: appt.patientName,
      doctorName: appt.doctor?.name ?? 'Doctor',
      department: appt.doctor?.department?.name ?? 'Clinic',
      date: formatDate(appt.appointmentDate),
      time: formatTime(appt.slotTime),
      appointmentId: appt.id,
    });

    try {
      const phone = decryptPhone(appt.patientPhone);
      await prisma.smsLog.update({ where: { id: log.id }, data: { attemptCount: { increment: 1 } } });
      await dispatchSms(phone, body, log.id);
    } catch (err) {
      logger.error({ logId: log.id, err: err.message }, 'SMS retry dispatch error');
    }
  }
}

function startRetryJob() {
  // Run every 5 minutes
  cron.schedule('*/5 * * * *', () => {
    retryFailedSms().catch((err) => logger.error({ err }, 'SMS retry job error'));
  });
  logger.info('SMS retry job scheduled (every 5 minutes)');
}

module.exports = { startRetryJob };
