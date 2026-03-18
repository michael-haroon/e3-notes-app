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

export async function generateNoteSummary(
  title: string,
  content: string
): Promise<NoteSummary> {
  const client = getClient();

  const prompt = `You are a helpful assistant that summarizes notes.

Given the following note, produce a JSON response with:
- summary: a 2-3 sentence summary
- keyPoints: array of 3-5 key points (strings)
- topics: array of topic tags (strings, lowercase, no spaces)

Note title: ${title}
Note content:
${content.slice(0, 8000)}

Respond ONLY with valid JSON, no markdown, no explanation.`;

  logger.info({ title: title.slice(0, 50) }, "ai.summarize_request");

  const completion = await client.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.3,
    max_tokens: 512,
    response_format: { type: "json_object" },
  });

  const raw = completion.choices[0]?.message?.content ?? "{}";

  try {
    const parsed = JSON.parse(raw) as Partial<NoteSummary>;
    return {
      summary: parsed.summary ?? "",
      keyPoints: Array.isArray(parsed.keyPoints) ? parsed.keyPoints : [],
      topics: Array.isArray(parsed.topics) ? parsed.topics : [],
    };
  } catch {
    logger.error({ raw }, "ai.summarize_parse_error");
    return { summary: raw, keyPoints: [], topics: [] };
  }
}
