const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const departments = [
  { name: 'Cardiology' },
  { name: 'General Medicine' },
  { name: 'Bone Health' },
];

const doctorsByDepartment = {
  Cardiology: ['Dr. Arjun Mehta', 'Dr. Nisha Kapoor'],
  'General Medicine': ['Dr. Priya Sharma', 'Dr. Suresh Iyer'],
  'Bone Health': ['Dr. Rajesh Patel', 'Dr. Ananya Bose'],
};

const smsTemplates = [
  {
    messageType: 'BOOKING',
    templateBody:
      'Dear {patientName}, your appointment is confirmed.\nDoctor: {doctorName} | Dept: {department}\nDate & Time: {date} at {time}\nAppointment ID: {appointmentId}\nTo cancel or reschedule, please call us.\n- HealthCare Clinic',
  },
  {
    messageType: 'CANCELLATION',
    templateBody:
      'Dear {patientName}, your appointment (ID: {appointmentId}) on {date} at {time} with {doctorName} has been cancelled.\n- HealthCare Clinic',
  },
  {
    messageType: 'RESCHEDULING',
    templateBody:
      'Dear {patientName}, your appointment has been rescheduled.\nDoctor: {doctorName} | Dept: {department}\nNew Date & Time: {date} at {time}\nNew Appointment ID: {appointmentId}\n- HealthCare Clinic',
  },
];

async function main() {
  console.log('Seeding database...');

  // Add partial unique index (Prisma does not support conditional indexes in schema)
  await prisma.$executeRaw`
    CREATE UNIQUE INDEX IF NOT EXISTS "UX_appt_slot"
    ON "Appointment"("doctorId", "appointmentDate", "slotTime")
    WHERE (status = 'CONFIRMED')
  `;
  console.log('✓ Partial unique index UX_appt_slot ensured');

  // Seed departments and doctors
  for (const dept of departments) {
    const department = await prisma.department.upsert({
      where: { name: dept.name },
      update: {},
      create: { name: dept.name },
    });

    for (const doctorName of doctorsByDepartment[dept.name]) {
      await prisma.doctor.upsert({
        where: { id: `00000000-0000-0000-0000-${dept.name.slice(0, 4).toLowerCase().padEnd(12, '0')}-${doctorName.slice(-4)}`.slice(0, 36) },
        update: {},
        create: { name: doctorName, departmentId: department.id },
      });
    }
  }

  // Re-seed doctors properly (upsert by name+dept is cleaner)
  const allDepts = await prisma.department.findMany();
  for (const dept of allDepts) {
    for (const doctorName of doctorsByDepartment[dept.name] || []) {
      const existing = await prisma.doctor.findFirst({
        where: { name: doctorName, departmentId: dept.id },
      });
      if (!existing) {
        await prisma.doctor.create({ data: { name: doctorName, departmentId: dept.id } });
      }
    }
  }
  console.log('✓ Departments and doctors seeded');

  // Seed SMS templates
  for (const tmpl of smsTemplates) {
    await prisma.smsTemplate.upsert({
      where: { messageType: tmpl.messageType },
      update: { templateBody: tmpl.templateBody },
      create: tmpl,
    });
  }
  console.log('✓ SMS templates seeded');

  console.log('Seeding complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
