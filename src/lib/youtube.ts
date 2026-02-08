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
