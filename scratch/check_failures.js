const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const failures = await prisma.chat.findMany({
    where: {
      content: {
        contains: 'Failed to process YouTube video'
      }
    },
    orderBy: {
      createdAt: 'desc'
    },
    take: 10
  });

  console.log(`Found ${failures.length} failures:`);
  for (const fail of failures) {
    console.log(`\nFailure Date: ${fail.createdAt}`);
    console.log(`Content: ${fail.content}`);
    
    // Let's find the user message before this bot message
    const userMsg = await prisma.chat.findFirst({
      where: {
        conversationId: fail.conversationId,
        createdAt: {
          lt: fail.createdAt
        },
        sender: 'user'
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    if (userMsg) {
      console.log(`User URL submitted: ${userMsg.content}`);
    }
  }
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
