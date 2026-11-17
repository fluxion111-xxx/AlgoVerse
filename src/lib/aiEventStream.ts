export function isAIEventStream(response: Response) {
  return response.headers.get("content-type")?.split(";", 1)[0].trim().toLowerCase() === "text/event-stream";
}

export async function* readAIEventStream(body: ReadableStream<Uint8Array>, signal?: AbortSignal, onFirstByte?: () => void) {
  const reader = body.getReader();
  const decoder = new TextDecoder("utf-8", { fatal: true });
  const cancel = () => { void reader.cancel().catch(() => {}); };
  let buffer = "";
  let data: string[] = [];
  let size = 0;
  let first = true;
  signal?.addEventListener("abort", cancel, { once: true });
  try {
    for (;;) {
      signal?.throwIfAborted();
      const { value, done } = await reader.read();
      signal?.throwIfAborted();
      if (value?.length && first) {
        first = false;
        onFirstByte?.();
      }
      buffer += decoder.decode(value, { stream: !done });
      if (done && buffer.endsWith("\r")) buffer = buffer.slice(0, -1) + "\n";
      for (let end = buffer.search(/\r\n|\r(?!$)|\n/); end >= 0; end = buffer.search(/\r\n|\r(?!$)|\n/)) {
        const line = buffer.slice(0, end);
        buffer = buffer.slice(end + (buffer.slice(end, end + 2) === "\r\n" ? 2 : 1));
        if (!line) {
          if (data.length) yield data.join("\n");
          data = [];
          size = 0;
        } else if (line === "data" || line.startsWith("data:")) {
          size += line.length + 1;
          if (size > 512 * 1024) throw new SyntaxError("SSE event too large");
          data.push(line.slice(5).replace(/^ /, ""));
        }
      }
      if (buffer.length > 512 * 1024) throw new SyntaxError("SSE line too large");
      if (done) {
        if (data.length || buffer.trim()) throw new Error("Incomplete SSE event");
        break;
      }
    }
  } finally {
    signal?.removeEventListener("abort", cancel);
    cancel();
    reader.releaseLock();
  }
}
