const prisma = require('../src/config/prisma');

async function main() {
  const assignments = await prisma.pettycashassignments.findMany({
    where: { jobId: 'JOB0001' },
    include: { pettycashsettlementitems: true }
  });
  console.log('Assignments for JOB0001:');
  console.log(JSON.stringify(assignments, null, 2));

  const allItems = await prisma.pettycashsettlementitems.findMany();
  console.log('All settlement items count:', allItems.length);
  console.log('All settlement items:');
  console.log(JSON.stringify(allItems, null, 2));

  const job = await prisma.jobs.findUnique({
    where: { jobId: 'JOB0001' }
  });
  console.log('Job JOB0001:');
  console.log(JSON.stringify(job, null, 2));

  await prisma.$disconnect();
}

main().catch(console.error);
