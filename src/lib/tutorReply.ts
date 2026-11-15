import { maxCreatorReplyLength } from "./experimentCreator";

export type TutorCodeBlock = { language: string; lines: string[] };

const pythonVerbatimOpening = /^(?:请)?用[ \t]*python[ \t]*代码块(?:原样|逐字)(?:展示|输出|返回)(?:(这(?:一)?行[：:])| )/i;
const pythonString = String.raw`(?:"(?:[^"\\\r\n]|\\[^\r\n])*"|'(?:[^'\\\r\n]|\\[^\r\n])*')`;
const pythonLiteralAssignment = String.raw`[ \t]*[a-zA-Z_]\w*[ \t]*=[ \t]*(?:${pythonString}|\[[ \t]*${pythonString}(?:[ \t]*,[ \t]*${pythonString})*[ \t]*\])`;
const explanatorySuffix = String.raw`，(?:并)?(?:说明|解释)\p{Script=Han}+`;
const inlinePythonLine = new RegExp(`^(${pythonLiteralAssignment}) 这(?:一)?行(?:${explanatorySuffix})?。?$`, "u");
const colonPythonLine = new RegExp(`^(${pythonLiteralAssignment})(?:${explanatorySuffix}。?)?$`, "u");

// An explicit quotation of a string assignment or list of strings has exact source boundaries.
export function requestedPythonVerbatimLine(question: string): string | null {
  const opening = question.match(pythonVerbatimOpening);
  if (!opening) return null;
  const requested = question.slice(opening[0].length);
  return (requested.match(inlinePythonLine) ?? (opening[1] ? requested.match(colonPythonLine) : null))?.[1] ?? null;
}

// Repair only known JSON formatting errors. The tutor still validates the parsed reply.
export function normalizeTutorReplyJson(content: string): string {
  const fenced = content.match(/^```(?:json)?[ \t]*\r?\n([\s\S]*?)\r?\n```$/i);
  const json = fenced?.[1].trim() ?? content;
  if (!json.startsWith("{") || !/[}\]]$/.test(json)) return content;
  const escaped = json.replace(/"(?:[^"\\]|\\[\s\S])*"/g, (literal) =>
    literal.replace(/\\[\s\S]|[\r\n\t]/g, (token) => {
      // Preserve raw regex shorthands. Leave valid JSON escapes and other malformed escapes alone.
      if (token.startsWith("\\")) return /^\\[dDwWsS]$/.test(token) ? "\\" + token : token;
      return JSON.stringify(token).slice(1, -1);
    }));
  return repairTutorCodeEnding(rejoinTutorMetadata(escaped));
}

// GLM's retry separates metadata from verbatim code so quotes never need JSON escaping.
export function normalizeTutorFencedReply(content: string, requestedLine: string | null = null): string {
  const explanation = requestedLine !== null ? content.match(/^说明：([^\r\n`]+)$/u)?.[1] : undefined;
  if (explanation !== undefined) return JSON.stringify({ answer: explanation });
  const lineEnd = content.indexOf("\n");
  if (lineEnd === -1) return normalizeTutorReplyJson(content);

  const headerLine = content.slice(0, lineEnd).trimEnd();
  let header;
  try { header = JSON.parse(normalizeTutorReplyJson(headerLine)); }
  catch { return normalizeTutorReplyJson(content); }
  if (typeof header?.answer !== "string" || Object.hasOwn(header, "codeBlocks")) return content;

  const blocks: TutorCodeBlock[] = [];
  let remaining = content.slice(lineEnd + 1).trimStart();
  let separatedNote = false;
  while (remaining.startsWith("```")) {
    const block = remaining.match(/^```([a-z\d_+#-]{0,20})[ \t]*\r?\n([\s\S]*?)\r?\n```(?=\r?\n|$)/i);
    if (!block || blocks.length === 4) return content;
    blocks.push({ language: block[1], lines: block[2].split(/\r?\n/) });
    const tail = remaining.slice(block[0].length);
    separatedNote = /^\r?\n[ \t]*\r?\n/.test(tail);
    remaining = tail.trimStart();
  }
  if (!blocks.length) return content;

  const [block] = blocks;
  const original = requestedLine !== null && blocks.length === 1 && block.language.toLowerCase() === "python" && block.lines.length === 1
    && isEncodedPythonLine(block.lines[0], requestedLine) ? requestedLine : null;
  if (remaining && (original === null || !separatedNote || /`{3,}|~{3,}/.test(remaining))) return content;
  if (original !== null) block.lines[0] = original;
  const answer = remaining ? [header.answer, remaining].filter(Boolean).join("\n\n") : header.answer;
  return JSON.stringify({ ...header, answer, codeBlocks: blocks });
}

// Decode extra JSON-string layers only when the entire result is the user's explicit literal.
function isEncodedPythonLine(line: string, original: string): boolean {
  let candidate = original;
  for (let layers = 0; layers <= 2; layers += 1) {
    if (candidate === line) return true;
    candidate = JSON.stringify(candidate).slice(1, -1);
  }
  return false;
}

// GLM sometimes swaps the closing brackets and braces after the last complete code line.
function repairTutorCodeEnding(json: string): string {
  const swappedEnding = json.match(/^([\s\S]*")\s*}\s*\]\s*}\s*\](?:\s*})?$/);
  if (!swappedEnding) return json;

  const repaired = swappedEnding[1] + "]}]}";
  try {
    const reply = JSON.parse(repaired);
    const lastBlock = Array.isArray(reply?.codeBlocks) ? reply.codeBlocks.at(-1) : null;
    if (lastBlock && Object.keys(reply).at(-1) === "codeBlocks"
      && Object.keys(lastBlock).at(-1) === "lines" && Array.isArray(lastBlock.lines)) return repaired;
  } catch { /* Leave malformed or unfinished content to the existing retry path. */ }
  return json;
}

// GLM can close a complete reply before its final citations or recommendation.
function rejoinTutorMetadata(json: string): string {
  let depth = 0;
  for (const { 0: token, index } of json.matchAll(/"(?:[^"\\]|\\[\s\S])*"|[{}]/g)) {
    if (token === "{") depth += 1;
    if (token !== "}") continue;
    depth -= 1;
    if (depth !== 0) continue;

    const tail = json.slice(index + 1).trimStart();
    if (!tail.startsWith(",")) break;
    try {
      const reply = JSON.parse(json.slice(0, index + 1));
      const metadata = JSON.parse("{" + tail.slice(1));
      const keys = Object.keys(metadata);
      if (typeof reply?.answer === "string" && Array.isArray(reply.codeBlocks) && keys.length > 0
        && keys.every((key) => (key === "citations" || key === "recommend") && !Object.hasOwn(reply, key))) {
        return JSON.stringify({ ...reply, ...metadata });
      }
    } catch { /* Continue to reject ambiguous or incomplete output. */ }
    break;
  }
  return json;
}

export function readTutorCodeBlocks(value: unknown, answerLength: number): TutorCodeBlock[] | null {
  if (value == null) return [];
  if (!Array.isArray(value) || value.length > 4) return null;

  let total = answerLength;
  const blocks: TutorCodeBlock[] = [];
  for (const block of value) {
    if (!block || typeof block !== "object") return null;
    const { language, lines } = block as Partial<Record<keyof TutorCodeBlock, unknown>>;
    if (typeof language !== "string" || !/^[a-z\d_+#-]{0,20}$/i.test(language)
      || !Array.isArray(lines) || lines.length === 0 || lines.length > maxCreatorReplyLength
      || !lines.every((line) => typeof line === "string" && !/[\r\n]/.test(line))
      || !lines.some((line) => line.trim())) return null;
    total += lines.join("\n").length;
    if (total > maxCreatorReplyLength) return null;
    blocks.push({ language, lines });
  }
  return blocks;
}
