import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendMessageSchema, getMessagesSchema, deleteMessageSchema } from "@/lib/schema";
import { parseUploadFile, ParsedFile } from "@/lib/files";
import { generateOmniKeyCompletion } from "@/lib/omnikey";
import { generatePollinationsImage } from "@/lib/pollinations";
import { SUPPORTED_FILE_TYPES, FileType } from "@/types/files";
import { 
  summarizeYoutubeVideo,
  extractYoutubeVideoId,
  fetchYoutubeTranscript,
  splitTranscriptIntoChunks,
  summarizeYoutubeVideoPart,
  answerQuestionOnTranscript
} from "@/lib/youtube";

// GET: Retrieve all messages for a given conversation
export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return Response.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as any).id;

  try {
    const { searchParams } = new URL(request.url);
    const conversationId = searchParams.get('conversationId');

    if (!conversationId) {
      return Response.json({ success: false, message: "conversationId is required" }, { status: 400 });
    }

    const validated = getMessagesSchema.parse({ conversationId });

    const conversation = await prisma.conversation.findFirst({
      where: {
        id: validated.conversationId,
        userId: userId
      }
    });

    if (!conversation) {
      return Response.json({ success: false, message: "Conversation not found" }, { status: 404 });
    }

    const messages = await prisma.chat.findMany({
      where: { conversationId: validated.conversationId },
      orderBy: { createdAt: 'asc' }
    });

    return Response.json({
      success: true,
      message: "Messages retrieved successfully",
      data: messages,
      conversation: conversation
    });
  } catch (error) {
    console.error("GET /api/chat error:", error);
    return Response.json({ success: false, message: "Internal Server Error" }, { status: 500 });
  }
}

// POST: Stage user message, run OmniKey reasoning or drawing, save response
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return Response.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as any).id;

  try {
    const contentType = request.headers.get("content-type") || "";
    let conversationId = "";
    let content = "";
    let sessionHistory: any[] = [];
    let files: File[] = [];

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      conversationId = formData.get("conversationId") as string;
      content = formData.get("content") as string;
      const historyRaw = formData.get("history") as string;
      
      if (historyRaw) {
        try {
          sessionHistory = JSON.parse(historyRaw);
        } catch {
          sessionHistory = [];
        }
      }

      files = formData.getAll("files") as File[];
    } else {
      const body = await request.json();
      conversationId = body.conversationId;
      content = body.content;
      sessionHistory = body.history || [];
    }

    const validated = sendMessageSchema.parse({ conversationId, content });

    const conversation = await prisma.conversation.findFirst({
      where: { id: validated.conversationId, userId }
    });

    if (!conversation) {
      return Response.json({ success: false, message: "Conversation not found" }, { status: 404 });
    }

    // Save user message
    const userMessage = await prisma.chat.create({
      data: {
        conversationId: validated.conversationId,
        sender: 'user',
        content: validated.content
      }
    });

    await prisma.conversation.update({
      where: { id: validated.conversationId },
      data: { lastUpdated: new Date() }
    });

    // Parse uploaded files
    const parsedFiles: ParsedFile[] = [];
    for (const f of files) {
      const parsed = await parseUploadFile(f);
      parsedFiles.push(parsed);
    }

    // Separate text files (RAG context) and image files (multimodal vision)
    const textContextParts: string[] = [];
    const imagePayloads: Array<{ filename: string; mimeType: string; base64Content: string }> = [];

    parsedFiles.forEach((pf) => {
      if (pf.extension === 'png' || pf.extension === 'jpg' || pf.extension === 'jpeg' || pf.extension === 'webp') {
        imagePayloads.push({
          filename: pf.filename,
          mimeType: pf.mimeType,
          base64Content: pf.content
        });
      } else {
        textContextParts.push(`--- File Context: ${pf.filename} ---\n${pf.content}`);
      }
    });

    const documentsContext = textContextParts.join("\n\n");

    // 1. Router Call: Classify prompt into text vs image drawing
    const systemRouterPrompt = `You are a router assistant for CognitoX. 
    Analyze the user request and determine if the user is asking to draw, paint, generate, or render a visual image.
    Respond strictly in JSON format matching this schema:
    {
      "classification": "image" | "text",
      "image_description": "refined prompt detailing what image to generate, or empty if classification is text"
    }`;

    const classificationResult = await generateOmniKeyCompletion(validated.content, {
      systemInstruction: systemRouterPrompt
    });

    let classification = "text";
    let imageDescription = "";

    try {
      const parsedRouter = JSON.parse(classificationResult.text.trim());
      classification = parsedRouter.classification || "text";
      imageDescription = parsedRouter.image_description || "";
    } catch {
      // Fallback: simple text match if model outputs raw text instead of JSON
      if (validated.content.toLowerCase().match(/(draw|paint|generate image|create a picture|draw a diagram)/)) {
        classification = "image";
        imageDescription = validated.content;
      }
    }

    let botMessage: any;

    if (conversation.variant === "youtube_tool") {
      // YouTube Crawler & Summarizer logic inside main chat
      let botResponseText = "";
      try {
        const isPartRequest = validated.content.trim().match(/^generate\s+part\s+(\d+)$/i);
        if (isPartRequest) {
          const requestedPartNum = parseInt(isPartRequest[1], 10);

          // Find the first user message in this conversation which contains the YouTube URL
          const firstUserMessage = await prisma.chat.findFirst({
            where: { conversationId: validated.conversationId, sender: 'user' },
            orderBy: { createdAt: 'asc' }
          });

          if (!firstUserMessage) {
            throw new Error("Could not find the original video link in this session.");
          }

          const url = firstUserMessage.content || "";
          const videoId = extractYoutubeVideoId(url);
          const transcript = await fetchYoutubeTranscript(videoId);

          if (!transcript) {
            throw new Error("Transcript is empty or could not be parsed.");
          }

          const chunks = splitTranscriptIntoChunks(transcript);
          const totalParts = chunks.length;

          if (requestedPartNum < 1 || requestedPartNum > totalParts) {
            throw new Error(`Invalid part number. This video has only ${totalParts} parts.`);
          }

          const partIndex = requestedPartNum - 1;
          const partOutline = await summarizeYoutubeVideoPart(url, videoId, partIndex, totalParts, chunks[partIndex]);

          if (requestedPartNum < totalParts) {
            botResponseText = `${partOutline}\n\n> [!NOTE]\n> **Outline section ${requestedPartNum} of ${totalParts} completed.**\n> To generate the next section, type or click: **Generate Part ${requestedPartNum + 1}**`;
          } else {
            botResponseText = `${partOutline}\n\n> [!NOTE]\n> **Outline fully complete!** You have generated all ${totalParts} parts of the lecture outline.`;
          }
        } else {
          // Check if it's a YouTube URL
          const isUrl = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\//i.test(validated.content.trim());
          if (isUrl) {
            botResponseText = await summarizeYoutubeVideo(validated.content);
          } else {
            // It's a custom question about the video!
            const firstUserMessage = await prisma.chat.findFirst({
              where: { conversationId: validated.conversationId, sender: 'user' },
              orderBy: { createdAt: 'asc' }
            });

            if (!firstUserMessage) {
              throw new Error("No video has been analyzed in this session yet. Please paste a YouTube link first.");
            }

            const url = firstUserMessage.content || "";
            const videoId = extractYoutubeVideoId(url);
            const transcript = await fetchYoutubeTranscript(videoId);

            if (!transcript) {
              throw new Error("Transcript is empty or could not be parsed.");
            }

            botResponseText = await answerQuestionOnTranscript(transcript, validated.content);
          }
        }
      } catch (error: any) {
        botResponseText = `Failed to process YouTube video. Error: ${error.message}`;
      }

      botMessage = await prisma.chat.create({
        data: {
          conversationId: validated.conversationId,
          type: 'text',
          sender: 'bot',
          model: 'omnikey-youtube',
          content: botResponseText
        }
      });
    } else if (classification === "image" && imageDescription) {
      // Image generation flow via Pollinations.ai
      const imageUrl = await generatePollinationsImage(imageDescription);

      botMessage = await prisma.chat.create({
        data: {
          conversationId: validated.conversationId,
          type: 'image',
          sender: 'bot',
          model: 'pollinations-flux',
          imageUrl: imageUrl,
          content: `Generated image matching your description: "${imageDescription}"`
        }
      });
    } else {
      // Standard text response flow via OmniKey AI
      let promptWithContext = validated.content;
      if (documentsContext) {
        promptWithContext = `Relevant Document Context:\n${documentsContext}\n\nUser Query: ${validated.content}\n\nUse the document context above to answer the query accurately.`;
      }

      const systemPrompt = "You are the CognitoX AI assistant, a premium cognitive workspace. Provide detailed, well-structured markdown answers. Utilize any provided document contexts or visual images attached to answer queries accurately.";

      const aiResponse = await generateOmniKeyCompletion(promptWithContext, {
        history: sessionHistory,
        systemInstruction: systemPrompt,
        files: imagePayloads
      });

    // Save bot message
    const botMessage = await prisma.chat.create({
      data: {
        conversationId: validated.conversationId,
        type: 'text',
        sender: 'bot',
        model: 'omnikey-auto',
        content: aiResponse.text
      }
    });
  }

    // Generate dynamic title if it's the first exchange (userMessage + botMessage)
    try {
      const messageCount = await prisma.chat.count({
        where: { conversationId: validated.conversationId }
      });
      if (messageCount <= 2) {
        const titleInput = `User: ${validated.content.substring(0, 300)}\nAssistant: ${(botMessage.content || "").substring(0, 300)}`;
        const titlePrompt = `Analyze the conversation snippet and generate a concise title (3-5 words maximum, no quotes, no markdown, no punctuation) that summarizes the topic. Snippet:\n${titleInput}\n\nTitle:`;
        const titleRes = await generateOmniKeyCompletion(titlePrompt, {
          systemInstruction: "You are a concise title generator. Output ONLY a clean 3-5 word title."
        });
        const dynamicTitle = titleRes.text.replace(/["'#*`]/g, "").trim();
        if (dynamicTitle && dynamicTitle.length > 2) {
          await prisma.conversation.update({
            where: { id: validated.conversationId },
            data: { title: dynamicTitle }
          });
        }
      }
    } catch (titleErr) {
      console.error("Failed to generate dynamic title:", titleErr);
    }

    return Response.json({
      success: true,
      message: "Response generated successfully",
      data: {
        userMessage,
        botMessage,
        attachments: files.map(f => f.name)
      }
    });
  } catch (error) {
    console.error("POST /api/chat error:", error);
    return Response.json({ success: false, message: "Internal Server Error" }, { status: 500 });
  }
}

// DELETE: Delete a single chat message
export async function DELETE(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return Response.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as any).id;

  try {
    const body = await request.json();
    const validated = deleteMessageSchema.parse(body);

    const message = await prisma.chat.findFirst({
      where: { id: validated.messageId },
      include: { conversation: true }
    });

    if (!message) {
      return Response.json({ success: false, message: "Message not found" }, { status: 404 });
    }

    if (message.conversation.userId !== userId) {
      return Response.json({ success: false, message: "Unauthorized to delete this message" }, { status: 403 });
    }

    await prisma.chat.delete({
      where: { id: validated.messageId }
    });

    return Response.json({
      success: true,
      message: "Message deleted successfully"
    });
  } catch (error) {
    console.error("DELETE /api/chat error:", error);
    return Response.json({ success: false, message: "Internal Server Error" }, { status: 500 });
  }
}
