import Groq from "groq-sdk";
import { logger } from "@/lib/logger";

let _client: Groq | null = null;

function getClient(): Groq {
  if (_client) return _client;
  _client = new Groq({ apiKey: process.env.GROQ_API_KEY });
  return _client;
}

export type NoteSummary = {
  summary: string;
  keyPoints: string[];
  topics: string[];
};

async function callGroq(client: Groq, prompt: string) {
  return client.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.3,
    max_tokens: 512,
    response_format: { type: "json_object" },
  });
}

export async function generateNoteSummary(
  title: string,
  content: string
): Promise<NoteSummary> {
  const client = getClient();

  const prompt = `You are a helpful assistant that summarizes notes.

Given the following note, produce a JSON response with:
- summary: a 2-3 sentence summary (string)
- keyPoints: array of 3-5 key points (array of strings)
- topics: array of topic tags (array of strings, lowercase, no spaces)

Note title: ${title}
Note content:
${content.slice(0, 8000)}

Respond ONLY with valid JSON, no markdown, no explanation.`;

  logger.info({ title: title.slice(0, 50) }, "ai.summarize_request");

  const start = Date.now();
  let completion;
  try {
    completion = await callGroq(client, prompt);
  } catch (firstErr) {
    logger.warn({ err: firstErr instanceof Error ? firstErr.message : firstErr, title: title.slice(0, 50) }, "ai.summarize_retry");
    await new Promise((resolve) => setTimeout(resolve, 1000));
    completion = await callGroq(client, prompt);
  }
  const durationMs = Date.now() - start;
  logger.info({ title: title.slice(0, 50), durationMs }, "ai.summarize_complete");

  const raw = completion.choices[0]?.message?.content ?? "{}";

  try {
    const parsed = JSON.parse(raw) as Partial<NoteSummary>;
    return {
      summary: typeof parsed.summary === "string" ? parsed.summary : "",
      keyPoints: Array.isArray(parsed.keyPoints)
        ? parsed.keyPoints.filter((p): p is string => typeof p === "string")
        : [],
      topics: Array.isArray(parsed.topics)
        ? parsed.topics.filter((t): t is string => typeof t === "string")
        : [],
    };
  } catch {
    logger.error({ raw }, "ai.summarize_parse_error");
    return { summary: raw, keyPoints: [], topics: [] };
  }
}
