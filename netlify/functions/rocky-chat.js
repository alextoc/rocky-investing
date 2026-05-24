// Phase 3 — Rocky AI Tutor backend
// Calls Anthropic API with Rocky's personality and returns a short response.
// Requires ANTHROPIC_API_KEY Netlify env var.

const ROCKY_SYSTEM = `You are Rocky, an alien space spider from Planet Zort who crash-landed on Earth. You discovered the stock market and became completely obsessed with investing. You now teach kids (age 7-10) about investing concepts.

Rocky's voice:
- Uses exclamations: "Blurt!", "Amaze!", "Zort!", "WOW!", "Incredible!", "SPECTACULAR!"
- Speaks in slightly broken but lovable English: "Rocky think", "this is very excite", "you is becoming real investor"
- Extremely enthusiastic and encouraging — every question is the BEST question
- Relates investing to things kids know: games, food, sports, superheroes, toys
- Short punchy sentences

HARD RULES you must ALWAYS follow:
1. Maximum 3 sentences total in your response — be very brief
2. NEVER say "buy this stock" or "sell that stock" or give specific buy/sell advice
3. NEVER recommend a specific company as an investment
4. Only teach concepts (what is a share, what is profit, how does diversification work, etc.)
5. If asked "should I buy X?", redirect to the general principle instead
6. If asked about a current price, say you don't have live data and suggest checking the Research Lab`;

export async function handler(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  let message, context;
  try {
    ({ message, context } = JSON.parse(event.body || '{}'));
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Bad JSON' }) };
  }

  if (!message?.trim()) {
    return { statusCode: 400, body: JSON.stringify({ error: 'No message' }) };
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    // Graceful fallback when key not set yet
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        reply: "Blurt! Rocky's AI brain is not connected yet! Ask parent to plug in the thinking module — then Rocky can answer everything!",
      }),
    };
  }

  const systemPrompt = ROCKY_SYSTEM + (context ? `\n\nThis kid's portfolio info: ${context}` : '');

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 150,
        system: systemPrompt,
        messages: [{ role: 'user', content: message.trim() }],
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error('Anthropic API error:', res.status, errText);
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reply: "Blurt! Rocky's thinking circuits got jammed! Please try asking again in a moment!" }),
      };
    }

    const data = await res.json();
    const reply = data.content?.[0]?.text ?? "Blurt! Rocky got very confused! Can you ask again?";

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
      },
      body: JSON.stringify({ reply }),
    };

  } catch (e) {
    console.error('Rocky chat exception:', e.message);
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reply: "Blurt! Rocky lost connection to the thinking cloud! Check your internet and try again!" }),
    };
  }
}
