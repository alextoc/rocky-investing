// Searches Yahoo Finance for a company name → ticker.
// Falls back gracefully for private companies.
export async function handler(event) {
  const q = event.queryStringParameters?.q ?? '';
  if (!q.trim()) return { statusCode: 400, body: JSON.stringify({ error: 'No query' }) };

  try {
    const url = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(q)}&lang=en-AU&region=AU&quotesCount=5&newsCount=0&listsCount=0`;
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (!res.ok) throw new Error(`Yahoo: ${res.status}`);

    const data = await res.json();
    const quotes = (data?.quotes ?? []).filter(q =>
      q.quoteType === 'EQUITY' || q.quoteType === 'ETF'
    );

    if (!quotes.length) {
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ found: false, private: false }),
      };
    }

    const best = quotes[0];
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        found: true,
        ticker:   best.symbol,
        name:     best.longname || best.shortname || best.symbol,
        exchange: best.exchange,
        currency: best.currency ?? 'USD',
        type:     best.quoteType,
      }),
    };
  } catch (err) {
    return {
      statusCode: 200, // don't surface 5xx to client
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ found: false, error: err.message }),
    };
  }
}
