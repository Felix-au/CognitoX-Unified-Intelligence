import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendMessageSchema, getMessagesSchema, deleteMessageSchema } from "@/lib/schema";
import { parseUploadFile, ParsedFile } from "@/lib/files";
import { generateOmniKeyCompletion, generateOmniKeyStream } from "@/lib/omnikey";
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

// POST: Stage user message, run OmniKey reasoning or drawing, save response in stream
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

    let webSearchEnabled = true;

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      conversationId = formData.get("conversationId") as string;
      content = formData.get("content") as string;
      const historyRaw = formData.get("history") as string;
      const webSearchEnabledRaw = formData.get("webSearchEnabled") as string;
      if (webSearchEnabledRaw !== null) {
        webSearchEnabled = webSearchEnabledRaw !== "false";
      }
      
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
      if (body.webSearchEnabled !== undefined) {
        webSearchEnabled = body.webSearchEnabled !== false;
      }
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

    // Separate text files (RAG context) and image/pdf files (multimodal inlineData)
    const textContextParts: string[] = [];
    const imagePayloads: Array<{ filename: string; mimeType: string; base64Content: string }> = [];

    parsedFiles.forEach((pf) => {
      if (['png', 'jpg', 'jpeg', 'webp'].includes(pf.extension)) {
        imagePayloads.push({
          filename: pf.filename,
          mimeType: pf.mimeType,
          base64Content: pf.content
        });
      } else if (pf.extension === 'pdf') {
        // If the PDF is short (<= 10 pages), send page screenshots as visual inputs to preserve layout
        if (pf.pdfImages && pf.pdfImages.length > 0 && pf.pdfImages.length <= 10) {
          pf.pdfImages.forEach((img) => {
            imagePayloads.push({
              filename: `${pf.filename} - ${img.filename}`,
              mimeType: img.mimeType,
              base64Content: img.base64Content
            });
          });
        } else {
          // Otherwise, process as text context for the RAG prompt
          textContextParts.push(`--- File Context: ${pf.filename} ---\n${pf.content}`);
        }
      } else {
        textContextParts.push(`--- File Context: ${pf.filename} ---\n${pf.content}`);
      }
    });

    const documentsContext = textContextParts.join("\n\n");

    // Check if we should execute background web search research
    const isFirstMessage = (await prisma.chat.count({
      where: { conversationId: validated.conversationId }
    })) <= 1;

    const shouldSearch = (conversation.variant as string) !== "youtube_tool" &&
                         (conversation.variant as string) !== "image_filter_tool" &&
                         (conversation.variant as string) !== "diagram_tool" &&
                         (isFirstMessage || files.length > 0) &&
                         webSearchEnabled;

    // 1. Router Call: Classify prompt into text vs image drawing
    const systemRouterPrompt = `You are a router assistant for CognitoX. 
    Analyze the user request and determine if the user is asking to draw, paint, generate, or render a visual image.
    Respond strictly in JSON format matching this schema:
    {
      "classification": "image" | "text",
      "image_description": "refined prompt detailing what image to generate, or empty if classification is text"
    }`;

    // Parallelize classifier and web search context retrieval
    const promises: Promise<any>[] = [
      generateOmniKeyCompletion(validated.content, {
        systemInstruction: systemRouterPrompt
      })
    ];

    if (shouldSearch) {
      const { performWorkspaceResearch } = await import("@/lib/auto-search");
      promises.push(performWorkspaceResearch(validated.content, documentsContext));
    }

    const [classificationResult, researchContextVal] = await Promise.all(promises);
    const searchContext = shouldSearch ? (researchContextVal || "") : "";

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

    // Set up ReadableStream response
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const sendData = (data: any) => {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        };

        try {
          let botMessage: any;
          let botResponseText = "";

          if (conversation.variant === "youtube_tool") {
            let botModelName = "omnikey-youtube";

            const isPartRequest = validated.content.trim().match(/^generate\s+part\s+(\d+)$/i);
            if (isPartRequest) {
              const requestedPartNum = parseInt(isPartRequest[1], 10);
              const firstUserMessage = await prisma.chat.findFirst({
                where: { conversationId: validated.conversationId, sender: 'user' },
                orderBy: { createdAt: 'asc' }
              });

              if (!firstUserMessage) throw new Error("Could not find the original video link.");

              const url = firstUserMessage.content || "";
              const videoId = extractYoutubeVideoId(url);
              const transcript = await fetchYoutubeTranscript(videoId);

              if (!transcript) throw new Error("Transcript is empty.");

              const chunks = splitTranscriptIntoChunks(transcript);
              const totalParts = chunks.length;

              if (requestedPartNum < 1 || requestedPartNum > totalParts) {
                throw new Error(`Invalid part number. Video has only ${totalParts} parts.`);
              }

              const partIndex = requestedPartNum - 1;
              const systemInstruction = `You are an educational lecture summarization assistant for CognitoX.
              Produce a highly detailed, structured outline of ONLY the provided transcript section. Summarize Part ${requestedPartNum} of ${totalParts}.`;

              const userPrompt = `Video URL: https://www.youtube.com/watch?v=${videoId}\n\nTranscript section (Part ${requestedPartNum} of ${totalParts}):\n${chunks[partIndex]}`;

              const streamGenerator = generateOmniKeyStream(userPrompt, { systemInstruction });
              for await (const token of streamGenerator) {
                botResponseText += token;
                sendData({ token });
              }

              if (requestedPartNum < totalParts) {
                const suffix = `\n\n> [!NOTE]\n> **Outline section ${requestedPartNum} of ${totalParts} completed.**\n> To generate the next section, type or click: **Generate Part ${requestedPartNum + 1}**`;
                botResponseText += suffix;
                sendData({ token: suffix });
              } else {
                const suffix = `\n\n> [!NOTE]\n> **Outline fully complete!** You have generated all ${totalParts} parts of the lecture outline.`;
                botResponseText += suffix;
                sendData({ token: suffix });
              }
            } else {
              const isUrl = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\//i.test(validated.content.trim());
              if (isUrl) {
                const videoId = extractYoutubeVideoId(validated.content);
                const transcript = await fetchYoutubeTranscript(videoId);
                if (!transcript) throw new Error("Transcript is empty.");

                const chunks = splitTranscriptIntoChunks(transcript);
                const systemInstruction = `You are an educational lecture summarization assistant for CognitoX. Summarize Part 1 of ${chunks.length}.`;
                const userPrompt = `Video URL: ${validated.content}\n\nTranscript section:\n${chunks[0]}`;

                const streamGenerator = generateOmniKeyStream(userPrompt, { systemInstruction });
                for await (const token of streamGenerator) {
                  botResponseText += token;
                  sendData({ token });
                }

                if (chunks.length > 1) {
                  const suffix = `\n\n> [!NOTE]\n> **This video outline is divided into ${chunks.length} parts due to length.**\n> To generate the next section, type or click: **Generate Part 2**`;
                  botResponseText += suffix;
                  sendData({ token: suffix });
                }
              } else {
                const firstUserMessage = await prisma.chat.findFirst({
                  where: { conversationId: validated.conversationId, sender: 'user' },
                  orderBy: { createdAt: 'asc' }
                });

                if (!firstUserMessage) throw new Error("No video analyzed in this session yet.");

                const url = firstUserMessage.content || "";
                const videoId = extractYoutubeVideoId(url);
                const transcript = await fetchYoutubeTranscript(videoId);

                if (!transcript) throw new Error("Transcript is empty.");

                const systemInstruction = `You are a helpful educational study assistant for CognitoX. Answer only based on transcript facts.`;
                const userPrompt = `Transcript:\n${transcript}\n\nUser Question:\n${validated.content}`;

                const streamGenerator = generateOmniKeyStream(userPrompt, { systemInstruction });
                for await (const token of streamGenerator) {
                  botResponseText += token;
                  sendData({ token });
                }
              }
            }

            botMessage = await prisma.chat.create({
              data: {
                conversationId: validated.conversationId,
                type: 'text',
                sender: 'bot',
                model: botModelName,
                content: botResponseText
              }
            });
          } else if (classification === "image" && imageDescription) {
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
            let promptWithContext = validated.content;
            if (documentsContext || searchContext) {
              const contexts: string[] = [];
              if (documentsContext) {
                contexts.push(`--- Document Context ---\n${documentsContext}`);
              }
              if (searchContext) {
                contexts.push(`--- External Research Context (Wikipedia/arXiv) ---\n${searchContext}`);
              }
              promptWithContext = `${contexts.join("\n\n")}\n\nUser Query: ${validated.content}\n\nUse the provided document and external contexts above to answer the query accurately. Reference sources explicitly.`;
            }

            const systemPrompt = "You are the CognitoX AI assistant, a premium cognitive workspace. Provide detailed, well-structured markdown answers. Utilize any provided document contexts or visual images attached to answer queries accurately.";

            const streamGenerator = generateOmniKeyStream(promptWithContext, {
              history: sessionHistory,
              systemInstruction: systemPrompt,
              files: imagePayloads
            });

            for await (const token of streamGenerator) {
              botResponseText += token;
              sendData({ token });
            }

            botMessage = await prisma.chat.create({
              data: {
                conversationId: validated.conversationId,
                type: 'text',
                sender: 'bot',
                model: 'omnikey-auto',
                content: botResponseText
              }
            });
          }

          try {
            const messageCount = await prisma.chat.count({
              where: { conversationId: validated.conversationId }
            });
            if (messageCount <= 2) {
              const titleInput = `User: ${validated.content.substring(0, 300)}\nAssistant: ${(botResponseText || botMessage?.content || "").substring(0, 300)}`;
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

          sendData({
            done: true,
            userMessage,
            botMessage,
            attachments: files.map(f => f.name)
          });
        } catch (innerErr: any) {
          console.error("Error in streaming execution:", innerErr);
          sendData({ error: innerErr.message || "Failed to process chat response." });
        } finally {
          controller.close();
        }
      }
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        "Connection": "keep-alive"
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
