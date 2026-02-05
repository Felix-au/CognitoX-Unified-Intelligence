import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding sandbox database...");

  const testUser = await prisma.user.upsert({
    where: { email: "sandbox@cognitox.ai" },
    update: {},
    create: {
      id: "user_sandbox123",
      email: "sandbox@cognitox.ai",
      name: "Sandbox User",
      image: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&h=150"
    }
  });

  console.log("User seeded:", testUser.email);

  // Initialize a mock chat session
  const chatSession = await prisma.conversation.create({
    data: {
      userId: testUser.id,
      title: "Welcome to CognitoX",
      variant: "chat",
    }
  });

  await prisma.chat.createMany({
    data: [
      {
        conversationId: chatSession.id,
        sender: "bot",
        type: "text",
        model: "omnikey-auto",
        content: "Hello! Welcome to **CognitoX**, your unified intelligence workspace. I can help you summarize documents, analyze YouTube video lectures, generate flowcharts with Mermaid.js, or edit scans using the image filter canvas. Let me know what we are building today!"
      }
    ]
  });

  console.log("Database seeded successfully!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
