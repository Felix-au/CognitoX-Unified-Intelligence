import { generateOmniKeyCompletion } from "./omnikey";

export function extractYoutubeVideoId(url: string): string {
  if (url.length === 11) return url;

  // Match standard watch URLs, short URLs, embeds, etc.
  const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
  const match = url.match(regex);
  if (match && match[1]) {
    return match[1];
  }
  throw new Error("Invalid YouTube URL or Video ID.");
}

/**
 * Scrapes subtitles/transcripts using YouTube's internal Innertube player API.
 * This bypasses bot-detection consent walls and works reliably for all videos.
 */
export async function fetchYoutubeTranscript(videoId: string): Promise<string> {
  try {
    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
    const response = await fetch(videoUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9"
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch watch page. Status: ${response.status}`);
    }

    const html = await response.text();
    const apiKeyMatch = html.match(/"INNERTUBE_API_KEY":"([^"]+)"/);
    if (!apiKeyMatch) {
      throw new Error("Could not extract INNERTUBE_API_KEY from YouTube.");
    }
    const apiKey = apiKeyMatch[1];

    // Call Innertube player endpoint with ANDROID client context (version 20.10.38)
    const playerEndpoint = `https://www.youtube.com/youtubei/v1/player?key=${apiKey}`;
    const playerBody = {
      context: {
        client: {
          clientName: "ANDROID",
          clientVersion: "20.10.38",
          hl: "en",
          gl: "US"
        }
      },
      videoId: videoId
    };

    const playerResponse = await fetch(playerEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      },
      body: JSON.stringify(playerBody)
    });

    if (!playerResponse.ok) {
      throw new Error(`Innertube player API call failed. Status: ${playerResponse.status}`);
    }

    const playerData = await playerResponse.json();
    const captionTracks = playerData.captions?.playerCaptionsTracklistRenderer?.captionTracks;

    if (!captionTracks || !Array.isArray(captionTracks) || captionTracks.length === 0) {
      throw new Error("Transcripts are disabled or unavailable for this video.");
    }

    const englishTrack = captionTracks.find((track: any) => 
      track.languageCode === 'en' || track.languageCode?.startsWith('en-')
    ) || captionTracks[0];

    if (!englishTrack || !englishTrack.baseUrl) {
      throw new Error("No usable transcript track found.");
    }

    // Fetch the transcript track JSON using fmt=json3 format
    // Replace any existing fmt param (like fmt=srv3) to avoid getting XML back
    const urlObj = new URL(englishTrack.baseUrl);
    urlObj.searchParams.set("fmt", "json3");
    const trackUrl = urlObj.toString();

    const trackResponse = await fetch(trackUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      }
    });

    if (!trackResponse.ok) {
      throw new Error("Failed to fetch transcript track content.");
    }

    const trackData = await trackResponse.json();
    const events = trackData.events || [];
    const segments: string[] = [];
    for (const event of events) {
      if (event.segs) {
        const text = event.segs.map((s: any) => s.utf8).join("").trim();
        if (text) segments.push(text);
      }
    }

    return segments.join(" ").replace(/\s+/g, " ").trim();
  } catch (error) {
    console.error("fetchYoutubeTranscript error:", error);
    throw new Error(error instanceof Error ? error.message : "Failed to retrieve YouTube transcript.");
  }
}

/**
 * Split the transcript text into logical chunks of around maxChunkSize characters,
 * without breaking words.
 */
export function splitTranscriptIntoChunks(transcript: string, maxChunkSize: number = 18000): string[] {
  const words = transcript.split(/\s+/);
  const chunks: string[] = [];
  let currentChunk: string[] = [];
  let currentLength = 0;

  for (const word of words) {
    if (currentLength + word.length + 1 > maxChunkSize && currentChunk.length > 0) {
      chunks.push(currentChunk.join(" "));
      currentChunk = [word];
      currentLength = word.length;
    } else {
      currentChunk.push(word);
      currentLength += word.length + 1;
    }
  }

  if (currentChunk.length > 0) {
    chunks.push(currentChunk.join(" "));
  }

  return chunks;
}

/**
 * Summarize a specific section of a YouTube lecture video using OmniKey AI.
 */
export async function summarizeYoutubeVideoPart(
  url: string,
  videoId: string,
  partIndex: number,
  totalParts: number,
  chunkText: string
): Promise<string> {
  const systemInstruction = `You are an educational lecture summarization assistant for CognitoX.
  Your task is to produce a highly structured, detailed section of an outline for the YouTube video.
  You are summarizing Part ${partIndex + 1} of ${totalParts} of the video.

  Instructions:
  1. Produce a highly detailed, structured outline of ONLY the provided transcript section.
  2. Map out the key sections in this transcript portion using clear headers, bullet points, and summaries.
  3. Extract core concepts, formulas, rules, and definitions discussed in this part.
  4. Write notes in an academic, easy-to-study format.
  5. If this is the LAST part (Part ${totalParts} of ${totalParts}), include a "Key Learnings Cheat Sheet" at the end of your outline summarizing the entire video.
  6. Provide 5 review questions based on the video content at the very end of the final part.

  Constraints:
  - Base your response ONLY on facts mentioned in this transcript section.
  - Do NOT summarize parts of the video outside this transcript.
  - Respond in clean Markdown format without conversational preambles.`;

  const userPrompt = `Video URL: https://www.youtube.com/watch?v=${videoId}\n\nTranscript section (Part ${partIndex + 1} of ${totalParts}):\n${chunkText}`;

  const result = await generateOmniKeyCompletion(userPrompt, {
    systemInstruction
  });

  return result.text;
}

/**
 * Answer custom user questions about the YouTube video based on its transcript.
 */
export async function answerQuestionOnTranscript(transcript: string, question: string): Promise<string> {
  const systemInstruction = `You are a helpful educational study assistant for CognitoX.
  Your task is to answer a user's question about a YouTube video lecture.
  You will be provided with the user's question and the video's transcript.

  Constraints:
  - Base your answer ONLY on facts mentioned in the transcript.
  - If the answer cannot be determined from the transcript, state that the information was not discussed in the video.
  - Respond in clean Markdown format without conversational preambles.`;

  const userPrompt = `Transcript:\n${transcript}\n\nUser Question:\n${question}`;

  const result = await generateOmniKeyCompletion(userPrompt, {
    systemInstruction
  });

  return result.text;
}

/**
 * Summarize YouTube lecture video using OmniKey AI. If the transcript is large,
 * it returns Part 1 and prompt instructions for Part 2.
 */
export async function summarizeYoutubeVideo(url: string): Promise<string> {
  const videoId = extractYoutubeVideoId(url);
  const transcript = await fetchYoutubeTranscript(videoId);

  if (!transcript) {
    throw new Error("Transcript is empty or could not be parsed.");
  }

  const chunks = splitTranscriptIntoChunks(transcript);
  if (chunks.length <= 1) {
    return summarizeYoutubeVideoPart(url, videoId, 0, 1, transcript);
  }

  // Multi-part outline: summarize first part
  const part1Outline = await summarizeYoutubeVideoPart(url, videoId, 0, chunks.length, chunks[0]);
  
  return `${part1Outline}\n\n> [!NOTE]\n> **This video outline is divided into ${chunks.length} parts due to length.**\n> To generate the next section, type or click: **Generate Part 2**`;
}
