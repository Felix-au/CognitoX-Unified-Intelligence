import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createConversationSchema } from "@/lib/schema";
import { z } from "zod";

const deleteConversationSchema = z.object({
  conversationId: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid conversation ID format (must be 24-character hex string)"),
});

// GET: List all non-archived conversations of the logged-in user
export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return Response.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as any).id;

  try {
    const conversations = await prisma.conversation.findMany({
      where: {
        userId: userId,
        isArchived: false
      },
      select: {
        id: true,
        title: true,
        startedAt: true,
        variant: true,
        lastUpdated: true,
        _count: {
          select: { chats: true }
        }
      },
      orderBy: { lastUpdated: 'desc' }
    });

    return Response.json({
      success: true,
      data: conversations
    });
  } catch (error) {
    console.error("GET /api/conversation error:", error);
    return Response.json({ success: false, message: "Internal Server Error" }, { status: 500 });
  }
}

// POST: Create a new conversation (can be normal chat or a tool variant)
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return Response.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as any).id;

  try {
    const body = await request.json();
    const validated = createConversationSchema.parse(body);

    const title = validated.title || `${validated.variant.replace("_", " ").toUpperCase()} Session`;

    const conversation = await prisma.conversation.create({
      data: {
        userId,
        title: title,
        variant: validated.variant,
        startedAt: new Date(),
        lastUpdated: new Date(),
        isArchived: false
      }
    });

    return Response.json({
      success: true,
      data: conversation
    });
  } catch (error) {
    console.error("POST /api/conversation error:", error);
    if (error instanceof Error && error.name === 'ZodError') {
      return Response.json({ success: false, message: "Invalid request data", error: (error as any).issues }, { status: 400 });
    }
    return Response.json({ success: false, message: "Internal Server Error" }, { status: 500 });
  }
}

// DELETE: Delete a conversation
export async function DELETE(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return Response.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as any).id;

  try {
    const body = await request.json();
    const validated = deleteConversationSchema.parse(body);

    const conversation = await prisma.conversation.findFirst({
      where: {
        id: validated.conversationId,
        userId: userId
      }
    });

    if (!conversation) {
      return Response.json({ success: false, message: "Conversation not found" }, { status: 404 });
    }

    await prisma.conversation.delete({
      where: { id: validated.conversationId }
    });

    return Response.json({
      success: true,
      message: "Conversation deleted successfully"
    });
  } catch (error) {
    console.error("DELETE /api/conversation error:", error);
    return Response.json({ success: false, message: "Internal Server Error" }, { status: 500 });
  }
}
