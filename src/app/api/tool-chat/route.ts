import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendToolMessageSchema } from "@/lib/schema";
import { parseUploadFile, ParsedFile } from "@/lib/files";
import { generateOmniKeyCompletion, generateOmniKeyStream } from "@/lib/omnikey";
import { 
  extractYoutubeVideoId,
  fetchYoutubeTranscript,
  splitTranscriptIntoChunks
} from "@/lib/youtube";
import { performWorkspaceResearch } from "@/lib/auto-search";

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
    let webSearchEnabled = false;

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      conversationId = formData.get("conversationId") as string;
      content = formData.get("content") as string;
      const historyRaw = formData.get("history") as string;
      if (historyRaw) {
        try { sessionHistory = JSON.parse(historyRaw); } catch { sessionHistory = []; }
      }
      files = formData.getAll("files") as File[];
      webSearchEnabled = formData.get("webSearchEnabled") === "true";
    } else {
      const body = await request.json();
      conversationId = body.conversationId;
      content = body.content;
      sessionHistory = body.history || [];
      webSearchEnabled = body.webSearchEnabled === true || body.webSearchEnabled === "true";
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
          let botModelName = "unknown";

          if (conversation.variant === "notes_tool") {
            botModelName = "omnikey-ocr";
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

            const pdfTexts: Array<{ filename: string; text: string }> = [];

            parsedFiles.forEach((pf) => {
              if (pf.extension === 'pdf') {
                if (pf.pdfImages && pf.pdfImages.length > 0 && pf.pdfImages.length <= 10) {
                  pf.pdfImages.forEach((img) => {
                    imageFiles.push({
                      filename: `${pf.filename} - ${img.filename}`,
                      mimeType: img.mimeType,
                      base64Content: img.base64Content
                    });
                  });
                } else {
                  pdfTexts.push({
                    filename: pf.filename,
                    text: pf.content
                  });
                }
              }
            });

            if (imageFiles.length === 0 && pdfTexts.length === 0) {
              const emptyMsg = "Please upload at least one image or PDF file containing notes to process OCR.";
              botResponseText = emptyMsg;
              sendData({ token: emptyMsg });
            } else {
              const systemInstruction = `You are a professional Notes OCR and study note formatter for CognitoX.
Your tasks:
1. Carefully scan the uploaded image(s) or document file(s).
2. Perform high-fidelity text transcription. Do not hallucinate content; if a word or formula is illegible, mark it as [illegible].
3. Format the extracted text into beautifully structured Markdown.
4. Organise the notes with headings, subheadings, and clean bullet points.
5. Bold important terms, and format math/code expressions properly.
6. Add a "Key Concepts Summary" section at the top, and a short list of 3-5 "Potential Review Questions" at the bottom.

Constraints:
- Respond ONLY in clean Markdown format.
- Do not include conversational preambles or post-scripts (like "Here is your transcription:").`;

              let userPrompt = "Perform OCR extraction and compile structured study notes from these files.";
              if (pdfTexts.length > 0) {
                const pdfContext = pdfTexts.map(pt => `--- Document: ${pt.filename} ---\n${pt.text}`).join("\n\n");
                userPrompt = `${userPrompt}\n\nHere is the text extracted from the uploaded PDF document(s):\n\n${pdfContext}`;
              }

              const streamGenerator = generateOmniKeyStream(userPrompt, {
                systemInstruction,
                files: imageFiles
              });

              for await (const token of streamGenerator) {
                botResponseText += token;
                sendData({ token });
              }

              if (webSearchEnabled) {
                try {
                  const searchContext = await performWorkspaceResearch("", botResponseText);
                  if (searchContext) {
                    const suffix = "\n\n---\n\n## External Research References\n\n" + searchContext;
                    botResponseText += suffix;
                    sendData({ token: suffix });
                  }
                } catch (err) {
                  console.error("Notes workspace research failed:", err);
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

          } else if (conversation.variant === "youtube_tool") {
            botModelName = "omnikey-youtube";
            const isPartRequest = validated.content.trim().match(/^generate\s+part\s+(\d+)$/i);
            if (isPartRequest) {
              const requestedPartNum = parseInt(isPartRequest[1], 10);
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
              const systemInstruction = `You are an educational lecture summarization assistant for CognitoX.
Your task is to produce a highly structured, detailed section of an outline for the YouTube video.
You are summarizing Part ${requestedPartNum} of ${totalParts} of the video.

Instructions:
1. Produce a highly detailed, structured outline of ONLY the provided transcript section.
2. Map out the key sections in this transcript portion using clear headers, bullet points, and summaries.
3. Extract core concepts, formulas, rules, and definitions discussed in this part.
4. Write notes in an academic, easy-to-study format.
5. If this is the LAST part (Part ${requestedPartNum} of ${totalParts}), include a "Key Learnings Cheat Sheet" at the end of your outline summarizing the entire video.
6. Provide 5 review questions based on the video content at the very end of the final part.

Constraints:
- Base your response ONLY on facts mentioned in this transcript section.
- Do NOT summarize parts of the video outside this transcript.
- Respond in clean Markdown format without conversational preambles.`;

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

                if (!transcript) {
                  throw new Error("Transcript is empty or could not be parsed.");
                }

                const chunks = splitTranscriptIntoChunks(transcript);
                const systemInstruction = `You are an educational lecture summarization assistant for CognitoX.
Your task is to produce a highly structured, detailed section of an outline for the YouTube video.
You are summarizing Part 1 of ${chunks.length} of the video.

Instructions:
1. Produce a highly detailed, structured outline of ONLY the provided transcript section.
2. Map out the key sections in this transcript portion using clear headers, bullet points, and summaries.
3. Extract core concepts, formulas, rules, and definitions discussed in this part.
4. Write notes in an academic, easy-to-study format.
5. If this is the LAST part (Part 1 of ${chunks.length}), include a "Key Learnings Cheat Sheet" at the end of your outline summarizing the entire video.
6. Provide 5 review questions based on the video content at the very end of the final part.

Constraints:
- Base your response ONLY on facts mentioned in this transcript section.
- Do NOT summarize parts of the video outside this transcript.
- Respond in clean Markdown format without conversational preambles.`;

                const userPrompt = `Video URL: ${validated.content}\n\nTranscript section (Part 1 of ${chunks.length}):\n${chunks[0]}`;
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

                if (!firstUserMessage) {
                  throw new Error("No video has been analyzed in this session yet. Please paste a YouTube link first.");
                }

                const url = firstUserMessage.content || "";
                const videoId = extractYoutubeVideoId(url);
                const transcript = await fetchYoutubeTranscript(videoId);

                if (!transcript) {
                  throw new Error("Transcript is empty or could not be parsed.");
                }

                const systemInstruction = `You are a helpful educational study assistant for CognitoX.
Your task is to answer a user's question about a YouTube video lecture.
You will be provided with the user's question and the video's transcript.

Constraints:
- Base your answer ONLY on facts mentioned in the transcript.
- If the answer cannot be determined from the transcript, state that the information was not discussed in the video.
- Respond in clean Markdown format without conversational preambles.`;

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

          } else if (conversation.variant === "diagram_tool") {
            botModelName = "omnikey-diagram";
            const lastBotMessage = await prisma.chat.findFirst({
              where: { conversationId: validated.conversationId, sender: 'bot' },
              orderBy: { createdAt: 'desc' }
            });

            const currentCode = lastBotMessage?.content || "";
            let diagramPrompt = validated.content;

            if (webSearchEnabled) {
              try {
                const searchContext = await performWorkspaceResearch(validated.content, "");
                if (searchContext) {
                  diagramPrompt = `--- External Research Context (Wikipedia/arXiv) ---\n${searchContext}\n\nUser Prompt: ${validated.content}\n\nGenerate the diagram based on the user prompt and incorporate information from the external research context above.`;
                }
              } catch (err) {
                console.error("Diagram workspace research failed:", err);
              }
            }

            const systemInstruction = `You are a professional Mermaid.js diagram generation assistant for CognitoX.
Your absolute requirement: Output ONLY valid, parseable Mermaid diagram code.

Constraints:
- Do NOT wrap your output in markdown code fences (like \`\`\`mermaid or \`\`\`).
- Do NOT include any introductory text, explanation, warnings, or comments.
- Choose the appropriate diagram type: flowchart TD/LR, sequenceDiagram, classDiagram, stateDiagram-v2, erDiagram, gantt, pie, journey, mindmap, etc.
- If current Mermaid code is provided, MODIFY and REFINE that code to satisfy the user description.
- If no current Mermaid code is provided (or it is 'None'), CREATE a new diagram from scratch.
- CRITICAL SYNTAX RULE: You MUST wrap ALL node text labels in double quotes. For example, write A["Label Text"] or B["Preprocessing (tokenization, normal)"] instead of A[Label Text] or B[Preprocessing (tokenization, normal)]. Parentheses, punctuation, commas, or special characters inside unquoted labels will break the Mermaid parser, so ALWAYS use double quotes ["..."] or ("...") or {"..."} for every node text label you output. No exceptions!`;

            const userPrompt = `User description:
${diagramPrompt}

Current Mermaid code context:
${currentCode.trim() ? currentCode : "None"}`;

            const streamGenerator = generateOmniKeyStream(userPrompt, { systemInstruction });
            for await (const token of streamGenerator) {
              botResponseText += token;
              sendData({ token });
            }

            let code = botResponseText.trim();
            if (code.startsWith("```")) {
              const lines = code.split("\n");
              if (lines[0].startsWith("```")) lines.shift();
              if (lines[lines.length - 1].startsWith("```")) lines.pop();
              botResponseText = lines.join("\n").trim();
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
          }

          // Dynamic Title Generation for First Exchanges
          try {
            const messageCount = await prisma.chat.count({
              where: { conversationId: validated.conversationId }
            });
            if (messageCount <= 2) {
              const titleInput = `User: ${validated.content.substring(0, 300)}\nAssistant: ${(botResponseText || "").substring(0, 300)}`;
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
          console.error("Error in streaming tool execution:", innerErr);
          sendData({ error: innerErr.message || "Failed to process tool response." });
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
    console.error("POST /api/tool-chat error:", error);
    return Response.json({ success: false, message: "Internal Server Error" }, { status: 500 });
  }
}
