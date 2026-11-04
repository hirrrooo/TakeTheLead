// Minimal client for ODU's OpenAI-compatible LLM endpoint.
// Settings live in .env and are read on the server only (never sent to the browser):
//   LLM_BASE_URL=https://<odu-llm-host>/v1
//   LLM_API_KEY=<key, if ODU issues one>
//   LLM_MODEL=<model name>
export type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string };
export type LlmConfig = { baseUrl: string; apiKey?: string; model: string; timeoutMs?: number };

export class LlmError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'LlmError';
	}
}

export async function chat(
	config: LlmConfig,
	messages: ChatMessage[],
	temperature = 0.3
): Promise<string> {
	if (!config.baseUrl || !config.model)
		throw new LlmError('LLM_BASE_URL and LLM_MODEL must be set');
	const res = await fetch(`${config.baseUrl.replace(/\/$/, '')}/chat/completions`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			...(config.apiKey ? { Authorization: `Bearer ${config.apiKey}` } : {})
		},
		body: JSON.stringify({ model: config.model, messages, temperature }),
		signal: AbortSignal.timeout(config.timeoutMs ?? 30_000)
	}).catch((e: unknown) => {
		throw new LlmError(
			`Could not reach the LLM service: ${e instanceof Error ? e.message : String(e)}`
		);
	});
	if (!res.ok)
		throw new LlmError(`LLM service returned ${res.status}: ${(await res.text()).slice(0, 200)}`);
	const data = (await res.json()) as { choices?: { message?: { content?: unknown } }[] };
	const text = data.choices?.[0]?.message?.content;
	if (typeof text !== 'string') throw new LlmError('LLM response had no message content');
	return text.trim();
}
