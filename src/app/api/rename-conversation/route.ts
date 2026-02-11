import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const renameSchema = z.object({
  conversationId: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid conversation ID format"),
  title: z.string().min(1).max(100),
});

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return Response.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as any).id;

  try {
    const body = await request.json();
    const validated = renameSchema.parse(body);

    const conversation = await prisma.conversation.findFirst({
      where: {
        id: validated.conversationId,
        userId: userId
      }
    });

    if (!conversation) {
      return Response.json({ success: false, message: "Conversation not found" }, { status: 404 });
    }

    const updated = await prisma.conversation.update({
      where: { id: validated.conversationId },
      data: { title: validated.title }
    });

    return Response.json({
      success: true,
      message: "Conversation renamed successfully",
      data: updated
    });
  } catch (error) {
    console.error("POST /api/rename-conversation error:", error);
    return Response.json({ success: false, message: "Internal Server Error" }, { status: 500 });
  }
}
