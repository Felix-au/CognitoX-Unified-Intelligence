const videoId = "qKiK8nrGmxc";

async function run() {
  const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
  const response = await fetch(videoUrl, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Accept-Language": "en-US,en;q=0.9"
    }
  });
  const html = await response.text();
  const apiKeyMatch = html.match(/"INNERTUBE_API_KEY":"([^"]+)"/);
  const apiKey = apiKeyMatch[1];
  console.log("API Key:", apiKey);

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
  const playerData = await playerResponse.json();
  const captionTracks = playerData.captions?.playerCaptionsTracklistRenderer?.captionTracks;
  console.log("Caption Tracks:", captionTracks);

  const englishTrack = captionTracks.find(track => 
    track.languageCode === 'en' || track.languageCode?.startsWith('en-')
  ) || captionTracks[0];

  // Properly replace fmt parameter
  const urlObj = new URL(englishTrack.baseUrl);
  urlObj.searchParams.set("fmt", "json3");
  const trackUrl = urlObj.toString();
  
  console.log("Fetching Track URL (corrected):", trackUrl);
  
  const trackResponse = await fetch(trackUrl, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    }
  });
  const data = await trackResponse.json();
  console.log("JSON Keys:", Object.keys(data));
  console.log("Events count:", data.events?.length);
  if (data.events && data.events.length > 0) {
    console.log("First 3 events:", JSON.stringify(data.events.slice(0, 3), null, 2));
  }
}

run().catch(console.error);
