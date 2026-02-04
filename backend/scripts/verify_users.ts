import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Verifying test accounts...');
  
  const emails = [
    'tutor@classlink.com',
    'ana@example.com',
    'carlos@example.com',
    'maria@example.com'
  ];

  for (const email of emails) {
    try {
      const user = await prisma.user.findUnique({ where: { email } });
      if (user) {
        await prisma.user.update({
          where: { email },
          data: { 
            emailVerified: true,
            verificationToken: null 
          }
        });
        console.log(`✅ Verified: ${email}`);
      } else {
        console.log(`⚠️ User not found: ${email}`);
      }
    } catch (e) {
      console.log(`❌ Error verifying ${email}:`, e);
    }
  }
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
