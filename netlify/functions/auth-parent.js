// Validates parent PIN server-side — PIN never reaches the browser.
export async function handler(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }
  try {
    const { pin } = JSON.parse(event.body ?? '{}');
    const correct = process.env.PARENT_PIN;
    if (!correct) return { statusCode: 500, body: JSON.stringify({ ok: false, error: 'Server misconfigured' }) };
    const ok = String(pin) === String(correct);
    return {
      statusCode: ok ? 200 : 401,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ok }),
    };
  } catch {
    return { statusCode: 400, body: JSON.stringify({ ok: false }) };
  }
}
