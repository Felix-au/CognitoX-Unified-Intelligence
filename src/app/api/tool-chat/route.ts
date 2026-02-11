import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendToolMessageSchema } from "@/lib/schema";
import { parseUploadFile, ParsedFile } from "@/lib/files";
import { processNotesOcr } from "@/lib/notes";
import { generateOmniKeyCompletion } from "@/lib/omnikey";
import { 
  summarizeYoutubeVideo,
  extractYoutubeVideoId,
  fetchYoutubeTranscript,
  splitTranscriptIntoChunks,
  summarizeYoutubeVideoPart,
  answerQuestionOnTranscript
} from "@/lib/youtube";
import { generateDiagramMermaid } from "@/lib/diagram";

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
        try { sessionHistory = JSON.parse(historyRaw); } catch { sessionHistory = []; }
      }
      files = formData.getAll("files") as File[];
    } else {
      const body = await request.json();
      conversationId = body.conversationId;
      content = body.content;
      sessionHistory = body.history || [];
    }

    const validated = sendToolMessageSchema.parse({ conversationId, content, history: sessionHistory });

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

    let botResponseText = "";
    let botModelName = "unknown";

    if (conversation.variant === "notes_tool") {
      // 1. Process uploaded notes (OCR)
      const parsedFiles: ParsedFile[] = [];
      for (const f of files) {
        const parsed = await parseUploadFile(f);
        parsedFiles.push(parsed);
      }

      const imageFiles = parsedFiles
        .filter(pf => ['png', 'jpg', 'jpeg', 'webp'].includes(pf.extension))
        .map(pf => ({
          filename: pf.filename,
          mimeType: pf.mimeType,
          base64Content: pf.content
        }));

      if (imageFiles.length === 0) {
        botResponseText = "Please upload at least one image file containing notes to process OCR.";
      } else {
        botResponseText = await processNotesOcr({ files: imageFiles });
      }
      botModelName = "omnikey-ocr";

    } else if (conversation.variant === "youtube_tool") {
      // 2. YouTube Crawler & Summarizer
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
      botModelName = "omnikey-youtube";

    } else if (conversation.variant === "diagram_tool") {
      // 3. Diagram Refiner
      // Fetch the last bot message in this conversation to find previous Mermaid code context
      const lastBotMessage = await prisma.chat.findFirst({
        where: { conversationId: validated.conversationId, sender: 'bot' },
        orderBy: { createdAt: 'desc' }
      });

      const currentCode = lastBotMessage?.content || "";
      botResponseText = await generateDiagramMermaid(validated.content, { currentCode });
      botModelName = "omnikey-diagram";

    } else if (conversation.variant === "image_filter_tool") {
      // 4. Image Filter Tool (fallback message handler)
      botResponseText = "Your image filters have been applied. Click 'Send to Chat' to ask questions about your processed image.";
      botModelName = "client-canvas";
    }

    // Save bot message
    const botMessage = await prisma.chat.create({
      data: {
        conversationId: validated.conversationId,
        type: 'text',
        sender: 'bot',
        model: botModelName,
        content: botResponseText
      }
    });

    // Generate dynamic title if it's the first exchange (userMessage + botMessage)
    try {
      const messageCount = await prisma.chat.count({
        where: { conversationId: validated.conversationId }
      });
      if (messageCount <= 2) {
        const titleInput = `User: ${validated.content.substring(0, 300)}\nAssistant: ${(botMessage?.content || "").substring(0, 300)}`;
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
    console.error("POST /api/tool-chat error:", error);
    return Response.json({ success: false, message: "Internal Server Error" }, { status: 500 });
  }
}
