import { generateOmniKeyCompletion } from "./omnikey";

/**
 * Fetches the lead summary of a Wikipedia page using the REST API.
 * @param title The exact title of the Wikipedia page.
 * @returns A promise resolving to the summary text, or null if it fails.
 */
async function fetchWikipediaSummary(title: string): Promise<string | null> {
  try {
    const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title.replace(/\s+/g, "_"))}`;
    const res = await fetch(url, { headers: { 'User-Agent': 'CognitoX/1.0 (contact@cognitox.com)' } });
    if (!res.ok) return null;
    const data = await res.json();
    return data.extract || null;
  } catch (err) {
    console.error(`Failed to fetch Wikipedia summary for ${title}:`, err);
    return null;
  }
}

/**
 * Searches Wikipedia for the given query and retrieves summaries for the top 2 matching pages.
 * @param query The search query term.
 * @returns A formatted markdown string containing the Wikipedia references.
 */
export async function searchWikipedia(query: string): Promise<string> {
  try {
    const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&format=json&origin=*`;
    const res = await fetch(searchUrl, { headers: { 'User-Agent': 'CognitoX/1.0 (contact@cognitox.com)' } });
    if (!res.ok) return '';
    const data = await res.json();
    const results = data.query?.search || [];
    if (results.length === 0) return '';

    const references: string[] = [];
    for (const item of results.slice(0, 2)) {
      const summary = await fetchWikipediaSummary(item.title);
      if (summary) {
        references.push(`### Wikipedia: ${item.title}\n${summary}`);
      } else if (item.snippet) {
        const cleanSnippet = item.snippet.replace(/<span class="searchmatch">/g, "").replace(/<\/span>/g, "");
        references.push(`### Wikipedia: ${item.title}\n${cleanSnippet}...`);
      }
    }
    return references.join("\n\n");
  } catch (err) {
    console.error("Wikipedia search failed:", err);
    return '';
  }
}

/**
 * Queries the arXiv API for matching preprints and parses the top 2 results.
 * @param query The search query term.
 * @returns A formatted markdown string containing the arXiv paper abstracts and links.
 */
export async function searchArxiv(query: string): Promise<string> {
  try {
    const url = `https://export.arxiv.org/api/query?search_query=all:${encodeURIComponent(query)}&max_results=2`;
    const res = await fetch(url, { headers: { 'User-Agent': 'CognitoX/1.0 (contact@cognitox.com)' } });
    if (!res.ok) return '';
    const xml = await res.text();

    const entryRegex = /<entry>([\s\S]*?)<\/entry>/g;
    let match;
    const references: string[] = [];

    while ((match = entryRegex.exec(xml)) !== null) {
      const entryContent = match[1];
      const titleMatch = entryContent.match(/<title>([\s\S]*?)<\/title>/);
      const summaryMatch = entryContent.match(/<summary>([\s\S]*?)<\/summary>/);
      const idMatch = entryContent.match(/<id>([\s\S]*?)<\/id>/);

      if (titleMatch && summaryMatch) {
        const title = titleMatch[1].replace(/\s+/g, ' ').trim();
        const summary = summaryMatch[1].replace(/\s+/g, ' ').trim();
        const paperUrl = idMatch ? idMatch[1].trim() : '';
        references.push(`### arXiv: ${title}\n**Abstract**: ${summary}${paperUrl ? `\n**Link**: ${paperUrl}` : ''}`);
      }
    }
    return references.join("\n\n");
  } catch (err) {
    console.error("arXiv search failed:", err);
    return '';
  }
}

/**
 * Extracts 1-2 search terms semantically from the user's prompt and note context.
 * @param content The user message content.
 * @param documentContext Optional attached note/file context.
 * @returns A promise resolving to an array of keywords.
 */
export async function extractSearchKeywords(content: string, documentContext?: string): Promise<string[]> {
  try {
    const prompt = `Analyze the user prompt and any attached document text. 
    Extract 1 to 2 precise search keywords or key subject matters (as short 1-3 word search terms) that would benefit from external context retrieval (e.g. Wikipedia or arXiv).
    Respond STRICTLY in JSON format matching this schema:
    [ "Keyword 1", "Keyword 2" ]
    
    Do not output any markdown code blocks, comments, or extra text. Output ONLY the JSON array.
    
    User Prompt: ${content}
    ${documentContext ? `Attached Document: ${documentContext.substring(0, 1500)}` : ''}`;
    
    const res = await generateOmniKeyCompletion(prompt, {
      systemInstruction: "You are a precise keyword extraction assistant. Output ONLY a clean, valid JSON array of strings."
    });
    
    const cleanedText = res.text.replace(/```json/g, "").replace(/```/g, "").trim();
    const parsed = JSON.parse(cleanedText);
    if (Array.isArray(parsed)) {
      return parsed.slice(0, 2);
    }
  } catch (err) {
    console.error("Keyword extraction failed, falling back:", err);
  }
  
  const words = content.split(/\s+/).filter(w => w.length > 3).slice(0, 2);
  return words.length > 0 ? [words.join(" ")] : [];
}

/**
 * Performs parallel academic and encyclopedic search and aggregates context.
 * @param content The user message.
 * @param documentContext Optional note context.
 * @returns A promise resolving to a formatted markdown reference block.
 */
export async function performWorkspaceResearch(content: string, documentContext?: string): Promise<string> {
  const keywords = await extractSearchKeywords(content, documentContext);
  const validKeywords = keywords.filter(k => k && k.trim().length > 1);
  if (validKeywords.length === 0) return '';

  const researchOutputs: string[] = [];

  for (const keyword of validKeywords) {
    const [wikiResult, arxivResult] = await Promise.all([
      searchWikipedia(keyword),
      searchArxiv(keyword)
    ]);

    if (wikiResult) researchOutputs.push(wikiResult);
    if (arxivResult) researchOutputs.push(arxivResult);
  }

  return researchOutputs.filter(r => r.length > 0).join("\n\n");
}
