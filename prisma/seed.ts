import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding initial Sigma Market system roles and demo users...');

  // Seed Roles with granular JSON permissions
  const adminRole = await prisma.role.upsert({
    where: { name: 'Admin' },
    update: {
      description: 'مدير النظام مع إمكانية الوصول الكامل لإدارة المستخدمين والأدوار والمنتجات والتحليلات.'
    },
    create: {
      name: 'Admin',
      description: 'مدير النظام مع إمكانية الوصول الكامل لإدارة المستخدمين والأدوار والمنتجات والتحليلات.',
      permissions: JSON.stringify(['*'])
    }
  });

  const merchantRole = await prisma.role.upsert({
    where: { name: 'Merchant' },
    update: {
      description: 'دور التاجر لإدارة منتجات المتجر، المخزون، حركة البضائع، ومبيعات الفرع.'
    },
    create: {
      name: 'Merchant',
      description: 'دور التاجر لإدارة منتجات المتجر، المخزون، حركة البضائع، ومبيعات الفرع.',
      permissions: JSON.stringify([
        'product:create',
        'product:read_own',
        'product:update_own',
        'product:delete_own',
        'inventory:manage_own',
        'order:read_merchant',
        'sales:read_own'
      ])
    }
  });

  const charityRole = await prisma.role.upsert({
    where: { name: 'Charity' },
    update: {
      description: 'دور الجمعية الخيرية لطلب ومتابعة التبرعات بالمنتجات الغذائية والاستهلاكية.'
    },
    create: {
      name: 'Charity',
      description: 'دور الجمعية الخيرية لطلب ومتابعة التبرعات بالمنتجات الغذائية والاستهلاكية.',
      permissions: JSON.stringify([
        'donation:read_available',
        'donation:request',
        'donation:read_own'
      ])
    }
  });

  const customerRole = await prisma.role.upsert({
    where: { name: 'Customer' },
    update: {
      description: 'دور العميل النهائي لتصفح المنتجات، إدارة العناوين الشخصية، وإجراء الطلبات.'
    },
    create: {
      name: 'Customer',
      description: 'دور العميل النهائي لتصفح المنتجات، إدارة العناوين الشخصية، وإجراء الطلبات.',
      permissions: JSON.stringify([
        'profile:read',
        'profile:update',
        'address:manage',
        'product:read',
        'order:create',
        'order:read_own'
      ])
    }
  });

  // Demo Accounts Setup
  const demoUsers = [
    {
      email: 'admin@sigmamarket.local',
      fullName: 'مدير النظام الرئيسي (Admin Demo)',
      password: 'AdminSecure2026!',
      roleId: adminRole.id
    },
    {
      email: 'merchant@sigmamarket.local',
      fullName: 'تاجر فرع سيجما (Merchant Demo)',
      password: 'MerchantSecure2026!',
      roleId: merchantRole.id
    },
    {
      email: 'customer@sigmamarket.local',
      fullName: 'عميل سيجما ماركت (Customer Demo)',
      password: 'CustomerSecure2026!',
      roleId: customerRole.id
    },
    {
      email: 'charity@sigmamarket.local',
      fullName: 'جمعية الخير للأغذية (Charity Demo)',
      password: 'CharitySecure2026!',
      roleId: charityRole.id
    }
  ];

  for (const user of demoUsers) {
    const existing = await prisma.user.findUnique({ where: { email: user.email } });
    if (!existing) {
      const passwordHash = await bcrypt.hash(user.password, 10);
      await prisma.user.create({
        data: {
          email: user.email,
          fullName: user.fullName,
          passwordHash,
          roleId: user.roleId,
          status: 'ACTIVE'
        }
      });
      console.log(`Demo User Created: ${user.email}`);
    }
  }

  // Also seed legacy admin email for backward compatibility
  const legacyAdminEmail = 'admin@smartwarranty.local';
  if (!await prisma.user.findUnique({ where: { email: legacyAdminEmail } })) {
    const passwordHash = await bcrypt.hash('AdminSecure2026!', 10);
    await prisma.user.create({
      data: {
        email: legacyAdminEmail,
        fullName: 'مدير النظام السلس',
        passwordHash,
        roleId: adminRole.id,
        status: 'ACTIVE'
      }
    });
  }

  // Seed Demo Categories
  const categories = [
    { name: 'إلكترونيات وأجهزة منزلية', description: 'أجهزة ذكية، إلكترونيات منزلية مضمونة' },
    { name: 'أغذية ومأكولات طازجة', description: 'منتجات غذائية طازجة مع تتبع دقيق لتاريخ الصلاحية' },
    { name: 'مستلزمات طبية وصحية', description: 'مستلزمات ومعدات صحية تتطلب مراقبة الضمان والصلاحية' }
  ];

  for (const cat of categories) {
    await prisma.category.upsert({
      where: { name: cat.name },
      update: { description: cat.description },
      create: cat
    });
  }

  console.log('Database seeding completed successfully.');
}

main()
  .catch((e) => {
    console.error('Error during database seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
