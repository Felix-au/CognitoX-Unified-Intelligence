const { URL } = require('url');

const videoId = process.argv[2] || "qKiK8nrGmxc";
console.log(`[Test] Fetching transcript for YouTube video: ${videoId}`);

async function run() {
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
    console.log(`[Test] Successfully extracted INNERTUBE_API_KEY`);

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

    console.log(`[Test] Found ${captionTracks.length} caption track(s): ${captionTracks.map(t => t.languageCode).join(', ')}`);

    const englishTrack = captionTracks.find(track => 
      track.languageCode === 'en' || track.languageCode?.startsWith('en-')
    ) || captionTracks[0];

    console.log(`[Test] Selected track language: ${englishTrack.languageCode}`);

    // Properly replace fmt parameter
    const urlObj = new URL(englishTrack.baseUrl);
    urlObj.searchParams.set("fmt", "json3");
    const trackUrl = urlObj.toString();

    console.log(`[Test] Fetching JSON timedtext track`);
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
    const segments = [];
    for (const event of events) {
      if (event.segs) {
        const text = event.segs.map(s => s.utf8).join("").trim();
        if (text) segments.push(text);
      }
    }

    const transcript = segments.join(" ").replace(/\s+/g, " ").trim();
    console.log(`[Test] Success! Transcript parsed successfully.`);
    console.log(`[Test] Total characters: ${transcript.length}`);
    console.log(`[Test] Snippet: "${transcript.substring(0, 300)}..."`);
  } catch (error) {
    console.error("[Test] Error during execution:", error.message);
    process.exit(1);
  }
}

run();
