import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create default roles
  const roles = await Promise.all([
    prisma.role.upsert({
      where: { name: 'System Administrator' },
      update: {},
      create: {
        name: 'System Administrator',
        description: 'Full system access with all permissions',
        isSystem: true,
        isDeletable: false,
      },
    }),
    prisma.role.upsert({
      where: { name: 'Institutional Administrator' },
      update: {},
      create: {
        name: 'Institutional Administrator',
        description: 'Manages clinical configuration and institutional settings',
        isSystem: true,
        isDeletable: false,
      },
    }),
    prisma.role.upsert({
      where: { name: 'Director' },
      update: {},
      create: {
        name: 'Director',
        description: 'Oversight of all programs, staff, and student progress',
        isSystem: true,
        isDeletable: false,
      },
    }),
    prisma.role.upsert({
      where: { name: 'Program Director' },
      update: {},
      create: {
        name: 'Program Director',
        description: 'Manages IUP generation, goal bank, and assessment review',
        isSystem: true,
        isDeletable: false,
      },
    }),
    prisma.role.upsert({
      where: { name: 'Therapy Coordinator' },
      update: {},
      create: {
        name: 'Therapy Coordinator',
        description: 'Coordinates therapy sessions and staff schedules',
        isSystem: true,
        isDeletable: false,
      },
    }),
    prisma.role.upsert({
      where: { name: 'Teacher' },
      update: {},
      create: {
        name: 'Teacher',
        description: 'Conducts therapy sessions and logs trials',
        isSystem: true,
        isDeletable: false,
      },
    }),
  ]);

  console.log(`✅ Created ${roles.length} roles`);

  // Create default permissions
  const modules = [
    'students',
    'sessions',
    'goals',
    'assessments',
    'iups',
    'reports',
    'staff',
    'roles',
    'permissions',
    'config',
    'messages',
    'notifications',
  ];

  const actions = ['view', 'create', 'edit', 'delete', 'approve'];

  const permissions: Array<{ module: string; action: string }> = [];
  for (const mod of modules) {
    for (const action of actions) {
      permissions.push({ module: mod, action });
    }
  }

  for (const perm of permissions) {
    await prisma.permission.upsert({
      where: { module_action: { module: perm.module, action: perm.action } },
      update: {},
      create: perm,
    });
  }

  console.log(`✅ Created ${permissions.length} permissions`);

  // Create default goal domains
  const domains = [
    { name: 'Communication', description: 'Language and communication skills' },
    { name: 'Social Skills', description: 'Interpersonal and social interaction skills' },
    { name: 'Academic', description: 'Academic and cognitive skills' },
    { name: 'Daily Living', description: 'Self-care and daily living skills' },
    { name: 'Motor Skills', description: 'Fine and gross motor skills' },
    { name: 'Behavior', description: 'Behavior reduction and replacement skills' },
  ];

  for (let i = 0; i < domains.length; i++) {
    await prisma.goalDomain.upsert({
      where: { name: domains[i].name },
      update: {},
      create: {
        ...domains[i],
        sortOrder: i,
      },
    });
  }

  console.log(`✅ Created ${domains.length} goal domains`);

  // Create default system configs
  const configs: Array<{ key: string; value: any; category: string }> = [
    {
      key: 'session.morning_start',
      value: '08:00',
      category: 'session_schedule',
    },
    {
      key: 'session.morning_end',
      value: '12:00',
      category: 'session_schedule',
    },
    {
      key: 'session.afternoon_start',
      value: '13:00',
      category: 'session_schedule',
    },
    {
      key: 'session.afternoon_end',
      value: '17:00',
      category: 'session_schedule',
    },
    {
      key: 'session.station1_duration',
      value: 30,
      category: 'session_schedule',
    },
    {
      key: 'session.station2_duration',
      value: 30,
      category: 'session_schedule',
    },
    {
      key: 'session.pre_therapy_duration',
      value: 15,
      category: 'session_schedule',
    },
    {
      key: 'session.staff_student_capacity',
      value: 2,
      category: 'session_schedule',
    },
    {
      key: 'session.draft_expiry_days',
      value: 7,
      category: 'session_schedule',
    },
    {
      key: 'trial_logging.prompt_levels',
      value: JSON.stringify([
        { label: 'FP', color: '#EF4444', order: 1, active: true },
        { label: 'PP', color: '#F59E0B', order: 2, active: true },
        { label: 'G', color: '#10B981', order: 3, active: true },
        { label: '+', color: '#3B82F6', order: 4, active: true },
      ]),
      category: 'trial_logging',
    },
    {
      key: 'trial_logging.trial_stream_layout',
      value: 'horizontal',
      category: 'trial_logging',
    },
    {
      key: 'trial_logging.trial_stream_count',
      value: 5,
      category: 'trial_logging',
    },
    {
      key: 'mastery.consecutive_trials',
      value: 3,
      category: 'mastery',
    },
    {
      key: 'mastery.percentage_threshold',
      value: 80,
      category: 'mastery',
    },
    {
      key: 'mastery.auto_suggest',
      value: true,
      category: 'mastery',
    },
    {
      key: 'mastery.approver_role',
      value: 'Program Director',
      category: 'mastery',
    },
  ];

  for (const config of configs) {
    await prisma.systemConfig.upsert({
      where: { key: config.key },
      update: { value: config.value },
      create: config,
    });
  }

  console.log(`✅ Created ${configs.length} system configs`);

  // Create default ABC dropdown options
  const abcOptions = {
    antecedents: [
      'Demand/Task Presented',
      'Transition',
      'Denied Access to Item/Activity',
      'Attention Withheld',
      'Alone/No Interaction',
      'Pain/Discomfort',
      'Other',
    ],
    behaviors: [
      'Aggression',
      'Self-Injury',
      'Property Destruction',
      'Elopement',
      'Tantrum',
      'Verbal Protest',
      'Non-Compliance',
      'Other',
    ],
    consequences: [
      'Task Removed',
      'Attention Given',
      'Item Given',
      'Peer Attention',
      'Adult Attention',
      'Ignore',
      'Other',
    ],
  };

  for (const [type, options] of Object.entries(abcOptions)) {
    for (let i = 0; i < options.length; i++) {
      const key = `abc.${type}`;
      const existing = await prisma.systemConfig.findUnique({ where: { key } });
      if (!existing) {
        await prisma.systemConfig.create({
          data: {
            key,
            value: JSON.stringify(options),
            category: 'abc_dropdowns',
          },
        });
      }
    }
  }

  console.log('✅ Created ABC dropdown configs');

  console.log('🎉 Seeding complete!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
