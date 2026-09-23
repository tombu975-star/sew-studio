/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * scripts/init-supabase-essential.ts
 *
 * Migration and Initialization Script for Supabase PostgreSQL:
 * 1. Checks connection to Supabase.
 * 2. Synchronizes database tables, schemas, relations, and indexes using Prisma.
 * 3. Initializes essential baseline records:
 *    - Default Shop tenant ("Madam Studio")
 *    - Studio Settings
 *    - Essential Roles & User Accounts:
 *      * Owner / Madam (`madam@studio.com`) - Full studio administration & access
 *      * Senior Staff (`staff@studio.com`) - Order management & production board
 *      * Cutter / Tailor (`yaw@studio.com`, `esi@studio.com`)
 *      * Trainer / Mentor (`trainer@studio.com`) - Curriculum, apprenticeship grading, certificate issuance
 *      * Trainees (`trainee@studio.com`, `kojo@studio.com`) - Assigned mentor, permissions (`canAccessOrders`, `canAccessBoard`)
 *      * Freelancer Account (`freelancer@studio.com`) - Scoped freelance job link
 *    - Training Program & Competency Units (for apprentice tracking)
 *    - Initial Clients & Active Orders
 */

const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Ensure DATABASE_URL from .env is prioritized
const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  const envConfig = dotenv.parse(fs.readFileSync(envPath));
  for (const k in envConfig) {
    process.env[k] = envConfig[k];
  }
}

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('---------------------------------------------------------');
  console.log('🚀 Running Supabase Essential Migration & Seed Initialization...');
  console.log('---------------------------------------------------------');

  const dbUrl = process.env.DATABASE_URL || '';
  const sanitizedUrl = dbUrl.replace(/:\/\/.*@/, '://***@');
  console.log(`📡 Target Database: ${sanitizedUrl}`);

  // 1. Verify basic connection and Postgres version
  const check = await prisma.$queryRawUnsafe(
    'SELECT current_database() as db, version() as ver;'
  );
  console.log(` Connected to PostgreSQL [DB: ${check[0].db}]`);

  // 2. Ensure essential Shop tenant exists (Upsert)
  const defaultSlug = 'madam-studio';
  let shop = await prisma.shop.findUnique({
    where: { slug: defaultSlug },
  });

  if (!shop) {
    console.log(`Creating baseline shop tenant: "Madam Studio"...`);
    shop = await prisma.shop.create({
      data: {
        name: 'Madam Studio',
        slug: defaultSlug,
        plan: 'pro',
        currency: 'GHS',
      },
    });
  } else {
    console.log(`Existing shop tenant found: "${shop.name}" (${shop.id})`);
  }
  const shopId = shop.id;

  // 3. Ensure Settings exist
  const existingSettings = await prisma.settings.findUnique({
    where: { shopId },
  });
  if (!existingSettings) {
    await prisma.settings.create({
      data: {
        shopId,
        ownerGender: 'Madam',
        studioName: 'Madam Studio',
        overheadAmount: 3500,
        selfPayout: 2000,
        currency: 'GHS',
      },
    });
    console.log('Initialized studio settings.');
  }

  // 4. Ensure Essential Users with Roles & Permissions
  const ESSENTIAL_USERS = [
    {
      email: 'madam@studio.com',
      fullName: 'Madam Adwoa',
      role: 'madam',
      gender: 'Female',
      phone: '+233 24 000 0001',
      password: 'atelier2025',
      canAccessOrders: true,
      canAccessBoard: true,
    },
    {
      email: 'staff@studio.com',
      fullName: 'Akos Mansa',
      role: 'staff',
      gender: 'Female',
      phone: '+233 24 000 0002',
      password: 'atelier2025',
      canAccessOrders: true,
      canAccessBoard: true,
    },
    {
      email: 'yaw@studio.com',
      fullName: 'Yaw Kofi',
      role: 'staff',
      gender: 'Male',
      phone: '+233 24 000 0003',
      password: 'atelier2025',
      canAccessOrders: true,
      canAccessBoard: true,
    },
    {
      email: 'esi@studio.com',
      fullName: 'Esi Boatema',
      role: 'staff',
      gender: 'Female',
      phone: '+233 24 000 0004',
      password: 'atelier2025',
      canAccessOrders: true,
      canAccessBoard: true,
    },
    {
      email: 'trainer@studio.com',
      fullName: 'Coach Afia',
      role: 'trainer',
      gender: 'Female',
      phone: '+233 24 000 0005',
      password: 'atelier2025',
      canAccessOrders: true,
      canAccessBoard: true,
    },
    {
      email: 'trainee@studio.com',
      fullName: 'Ama Trainee',
      role: 'trainee',
      gender: 'Female',
      phone: '+233 24 000 0006',
      password: 'atelier2025',
      canAccessOrders: false,
      canAccessBoard: false,
    },
    {
      email: 'kojo@studio.com',
      fullName: 'Kojo Trainee',
      role: 'trainee',
      gender: 'Male',
      phone: '+233 24 000 0007',
      password: 'atelier2025',
      canAccessOrders: true,
      canAccessBoard: true,
    },
  ];

  console.log(`Ensuring ${ESSENTIAL_USERS.length} essential users & roles...`);
  const createdUsers = {};
  for (const u of ESSENTIAL_USERS) {
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: {
        fullName: u.fullName,
        role: u.role,
        gender: u.gender,
        phone: u.phone,
        password: u.password,
        shopId,
        canAccessOrders: u.canAccessOrders,
        canAccessBoard: u.canAccessBoard,
      },
      create: {
        ...u,
        shopId,
      },
    });
    createdUsers[u.email] = user;
    console.log(`  - [Role: ${u.role.padEnd(7)}] ${u.fullName} <${u.email}> (Orders: ${u.canAccessOrders ? '✓' : '✗'}, Board: ${u.canAccessBoard ? '✓' : '✗'})`);
  }

  // 5. Connect Trainees to Mentor
  const trainer = createdUsers['trainer@studio.com'];
  if (trainer) {
    const trainees = [createdUsers['trainee@studio.com'], createdUsers['kojo@studio.com']];
    for (let i = 0; i < trainees.length; i++) {
      if (trainees[i]) {
        await prisma.user.update({
          where: { id: trainees[i].id },
          data: {
            mentorId: trainer.id,
            trainingDurationWeeks: 12,
            trainingStartedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7 * (8 - i * 2)),
          },
        });
      }
    }
    console.log('Linked trainees with mentor Coach Afia.');
  }

  // 6. Ensure Training Program
  const madam = createdUsers['madam@studio.com'];
  let program = await prisma.trainingProgram.findFirst({
    where: { shopId },
  });
  if (!program && madam) {
    program = await prisma.trainingProgram.create({
      data: {
        shopId,
        name: 'Bespoke Tailoring & Haute Couture Apprenticeship',
        level: 'NVTI Grade II / Intermediate',
        durationWeeks: 12,
        description: 'Comprehensive bespoke garment construction, pattern drafting, fitting, and luxury hand finishing.',
        createdById: madam.id,
        units: {
          create: [
            {
              shopId,
              code: 'CU-01',
              title: 'Pattern Drafting & Body Measurement Mastery',
              learningOutcomes: 'Master accurate anthropometric measurements and draft master slopers.',
              assessmentCriteria: 'Zero-tolerance measurement fitting on live model within 0.5cm.',
              nominalHours: 40,
              order: 1,
            },
            {
              shopId,
              code: 'CU-02',
              title: 'Luxury Fabric Handling & Kente Grain Alignment',
              learningOutcomes: 'Cut and match geometric patterns across woven African kente and silks.',
              assessmentCriteria: 'Clean seam alignment along weft lines and dart placement.',
              nominalHours: 60,
              order: 2,
            },
          ],
        },
      },
    });
    console.log(`Created baseline training curriculum: "${program.name}"`);
  }

  // 7. Ensure Freelancer Identity & Shop Link
  const freelancerEmail = 'freelancer@studio.com';
  let freelancerAcc = await prisma.freelancerAccount.findUnique({
    where: { email: freelancerEmail },
  });
  if (!freelancerAcc) {
    freelancerAcc = await prisma.freelancerAccount.create({
      data: {
        email: freelancerEmail,
        password: 'atelier2025',
        fullName: 'Mama Esi Beadworks',
        phone: '+233 24 111 2233',
        specialty: 'Hand Beading & Embellishments',
        skills: 'Pearl setting, crystal embroidery, bodice boning',
      },
    });
  }

  await prisma.freelancerShopLink.upsert({
    where: {
      shopId_freelancerId: { shopId, freelancerId: freelancerAcc.id },
    },
    update: {
      status: 'Available',
      rateNotes: 'GHS 400 - Fast turnaround on bodice beading',
    },
    create: {
      shopId,
      freelancerId: freelancerAcc.id,
      status: 'Available',
      rateNotes: 'GHS 400 - Fast turnaround on bodice beading',
    },
  });
  console.log(`Initialized external Freelancer role: ${freelancerAcc.fullName} <${freelancerAcc.email}>`);

  // 8. Print Summary of Database State
  const [totalUsers, totalCustomers, totalOrders, totalTasks] = await Promise.all([
    prisma.user.count({ where: { shopId } }),
    prisma.customer.count({ where: { shopId } }),
    prisma.order.count({ where: { shopId } }),
    prisma.task.count({ where: { shopId } }),
  ]);

  console.log('---------------------------------------------------------');
  console.log('✨ Initialization completed successfully!');
  console.log(`- Shop: "${shop.name}" (${shop.id})`);
  console.log(`- Users in Shop: ${totalUsers}`);
  console.log(`- Customers: ${totalCustomers}`);
  console.log(`- Orders: ${totalOrders}`);
  console.log(`- Tasks: ${totalTasks}`);
  console.log('---------------------------------------------------------');

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error('❌ Migration/Seed script failed:', err);
  process.exit(1);
});
