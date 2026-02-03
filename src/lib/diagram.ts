import { generateOmniKeyCompletion } from "./omnikey";

export interface DiagramOptions {
  currentCode?: string;
}

/**
 * Generate or refine a Mermaid.js diagram using OmniKey AI.
 */
export async function generateDiagramMermaid(
  prompt: string,
  options: DiagramOptions = {}
): Promise<string> {
  const { currentCode = '' } = options;

  const systemInstruction = `You are a professional Mermaid.js diagram generation assistant for CognitoX.
  Your absolute requirement: Output ONLY valid, parseable Mermaid diagram code.
  
  Constraints:
  - Do NOT wrap your output in markdown code fences (like \`\`\`mermaid or \`\`\`).
  - Do NOT include any introductory text, explanation, warnings, or comments.
  - Choose the appropriate diagram type: flowchart TD/LR, sequenceDiagram, classDiagram, stateDiagram-v2, erDiagram, gantt, pie, journey, mindmap, etc.
  - If current Mermaid code is provided, MODIFY and REFINE that code to satisfy the user description.
  - If no current Mermaid code is provided (or it is 'None'), CREATE a new diagram from scratch.
  - Ensure syntax is correct, e.g. using quotes for labels containing special characters.`;

  const userPrompt = `User description:
  ${prompt}
  
  Current Mermaid code context:
  ${currentCode.trim() ? currentCode : "None"}`;

  const result = await generateOmniKeyCompletion(userPrompt, {
    systemInstruction
  });

  let code = result.text.trim();

  // Strip any markdown backticks if the model failed to follow system constraints
  if (code.startsWith("```")) {
    const lines = code.split("\n");
    // Remove first line (like ```mermaid) and last line (```)
    if (lines[0].startsWith("```")) lines.shift();
    if (lines[lines.length - 1].startsWith("```")) lines.pop();
    code = lines.join("\n").trim();
  }

  return code;
}
