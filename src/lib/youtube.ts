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
 * Scrapes subtitles/transcripts directly from YouTube's player configuration
 * without external third-party library dependencies.
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
      throw new Error(`Failed to fetch YouTube page. Status: ${response.status}`);
    }

    const html = await response.text();
    let captionTracks: any = null;

    // Method 1: Find the ytInitialPlayerResponse variable using brace matching
    const startStr = "ytInitialPlayerResponse";
    const startIdx = html.indexOf(startStr);
    if (startIdx !== -1) {
      const braceStart = html.indexOf("{", startIdx);
      if (braceStart !== -1) {
        let braceCount = 1;
        let i = braceStart + 1;
        while (i < html.length && braceCount > 0) {
          // Skip string literals to avoid wrong brace counts
          if (html[i] === '"') {
            i++;
            while (i < html.length) {
              if (html[i] === '"' && html[i-1] !== '\\') {
                break;
              }
              i++;
            }
          } else if (html[i] === '{') {
            braceCount++;
          } else if (html[i] === '}') {
            braceCount--;
          }
          i++;
        }
        const jsonStr = html.substring(braceStart, i);
        try {
          const playerResponse = JSON.parse(jsonStr);
          captionTracks = playerResponse.captions?.playerCaptionsTracklistRenderer?.captionTracks;
        } catch (e) {
          console.error("Failed to parse brace-matched ytInitialPlayerResponse JSON:", e);
        }
      }
    }

    // Method 2: Fallback direct regex for captionTracks
    if (!captionTracks) {
      const captionTracksRegex = /"captionTracks":\s*(\[.*?\])/;
      const match = html.match(captionTracksRegex);
      if (match && match[1]) {
        try {
          captionTracks = JSON.parse(match[1]);
        } catch (e) {}
      }
    }

    if (!captionTracks || !Array.isArray(captionTracks) || captionTracks.length === 0) {
      throw new Error("Transcripts are disabled or unavailable for this video.");
    }

    const englishTrack = captionTracks.find((track: any) => 
      track.languageCode === 'en' || track.languageCode?.startsWith('en-')
    ) || captionTracks[0];

    if (!englishTrack || !englishTrack.baseUrl) {
      throw new Error("No usable transcript track found.");
    }

    // Fetch the XML transcription data from YouTube's baseUrl
    const xmlResponse = await fetch(englishTrack.baseUrl);
    if (!xmlResponse.ok) {
      throw new Error("Failed to fetch transcript XML.");
    }

    const xmlText = await xmlResponse.text();

    // Parse the XML subtitle segments using a robust regex
    const textSegmentRegex = /<text[^>]*>([\s\S]*?)<\/text>/g;
    const segments: string[] = [];
    let segmentMatch;

    while ((segmentMatch = textSegmentRegex.exec(xmlText)) !== null) {
      let segmentText = segmentMatch[1]
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/<\/?[^>]+(>|$)/g, "") // remove HTML tags
        .trim();
      
      if (segmentText) {
        segments.push(segmentText);
      }
    }

    return segments.join(" ").replace(/\s+/g, " ").trim();
  } catch (error) {
    console.error("fetchYoutubeTranscript error:", error);
    throw new Error(error instanceof Error ? error.message : "Failed to retrieve YouTube transcript.");
  }
}

/**
 * Summarize YouTube lecture video using OmniKey AI.
 */
export async function summarizeYoutubeVideo(url: string): Promise<string> {
  const videoId = extractYoutubeVideoId(url);
  const transcript = await fetchYoutubeTranscript(videoId);

  if (!transcript) {
    throw new Error("Transcript is empty or could not be parsed.");
  }

  const systemInstruction = `You are an educational lecture summarization assistant for CognitoX.
  Your tasks:
  1. Produce a highly structured, comprehensive outline of the YouTube video.
  2. Map out the key sections using clear headers, bullet points, and summaries.
  3. Extract core concepts, formulas, rules, and definitions discussed.
  4. Write notes in an academic, easy-to-study format.
  5. Include a "Key Learnings Cheat Sheet" section at the end.
  6. Provide 5 review questions based on the video content for study prep.

  Constraints:
  - Base your response ONLY on facts mentioned in the transcript.
  - Respond in clean Markdown format without conversational preambles.`;

  const userPrompt = `Video URL: https://www.youtube.com/watch?v=${videoId}\n\nTranscript:\n${transcript}`;

  const result = await generateOmniKeyCompletion(userPrompt, {
    systemInstruction
  });

  return result.text;
}
