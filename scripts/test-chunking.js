const videoId = "qKiK8nrGmxc";

function splitTranscriptIntoChunks(transcript, maxChunkSize = 18000) {
  const words = transcript.split(/\s+/);
  const chunks = [];
  let currentChunk = [];
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

async function test() {
  try {
    console.log(`[Chunking Test] Fetching watch page for video: ${videoId}`);
    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
    const response = await fetch(videoUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9"
      }
    });
    const html = await response.text();
    const apiKey = html.match(/"INNERTUBE_API_KEY":"([^"]+)"/)[1];
    
    console.log(`[Chunking Test] Call Innertube player endpoint`);
    const playerEndpoint = `https://www.youtube.com/youtubei/v1/player?key=${apiKey}`;
    const playerBody = {
      context: { client: { clientName: "ANDROID", clientVersion: "20.10.38", hl: "en", gl: "US" } },
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
    const playerData = await playerResponse.json();
    const englishTrack = playerData.captions?.playerCaptionsTracklistRenderer?.captionTracks[0];
    
    const urlObj = new URL(englishTrack.baseUrl);
    urlObj.searchParams.set("fmt", "json3");
    const trackResponse = await fetch(urlObj.toString());
    const trackData = await trackResponse.json();
    
    const segments = [];
    for (const event of trackData.events || []) {
      if (event.segs) {
        const text = event.segs.map(s => s.utf8).join("").trim();
        if (text) segments.push(text);
      }
    }
    const transcript = segments.join(" ").replace(/\s+/g, " ").trim();
    console.log(`[Chunking Test] Full transcript length: ${transcript.length} characters`);
    
    // Test splitting at 6000 character boundaries to simulate multi-part for testing
    console.log(`\n--- Splitting transcript into 6000-char chunks ---`);
    const chunks = splitTranscriptIntoChunks(transcript, 6000);
    console.log(`Total chunks generated: ${chunks.length}`);
    for (let i = 0; i < chunks.length; i++) {
      console.log(`\nChunk ${i + 1} length: ${chunks[i].length} characters`);
      console.log(`Start of Chunk ${i + 1}: "${chunks[i].substring(0, 100)}..."`);
      console.log(`End of Chunk ${i + 1}: "...${chunks[i].substring(chunks[i].length - 100)}"`);
    }
  } catch (err) {
    console.error(err);
  }
}

test();
