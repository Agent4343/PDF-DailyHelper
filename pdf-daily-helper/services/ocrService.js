const DEFAULT_TRIGGER_THRESHOLD = Number(process.env.OCR_TRIGGER_IF_TEXT_BELOW || 40);
const PROVIDER = (process.env.OCR_PROVIDER || '').toLowerCase();

async function extractTextWithOcr(buffer) {
  if (!PROVIDER || !buffer) {
    return null;
  }

  switch (PROVIDER) {
    case 'azure':
      return runAzureReadOcr(buffer);
    default:
      console.warn(`OCR provider "${PROVIDER}" is not supported.`);
      return null;
  }
}

async function runAzureReadOcr(buffer) {
  const endpoint = (process.env.AZURE_VISION_ENDPOINT || '').replace(/\/$/, '');
  const apiKey = process.env.AZURE_VISION_KEY;

  if (!endpoint || !apiKey) {
    console.warn('Azure OCR is not fully configured. Skipping OCR.');
    return null;
  }

  const analyzeUrl = `${endpoint}/vision/v3.2/read/analyze`;
  const submitResponse = await fetch(analyzeUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/pdf',
      'Ocp-Apim-Subscription-Key': apiKey
    },
    body: buffer
  });

  if (submitResponse.status !== 202) {
    const errorBody = await safeJson(submitResponse);
    throw new Error(`Azure OCR request failed (${submitResponse.status}): ${JSON.stringify(errorBody)}`);
  }

  const operationLocation = submitResponse.headers.get('operation-location');
  if (!operationLocation) {
    throw new Error('Azure OCR response missing operation-location header.');
  }

  const result = await pollAzureOcr(operationLocation, apiKey);
  const readResults = result?.analyzeResult?.readResults || [];
  const lines = readResults.flatMap((page) => (page.lines || []).map((line) => line.text));
  return lines.join('\n').trim();
}

async function pollAzureOcr(operationUrl, apiKey, { timeoutMs = 60000, pollIntervalMs = 2000 } = {}) {
  const start = Date.now();

  while (Date.now() - start < timeoutMs) {
    await delay(pollIntervalMs);
    const response = await fetch(operationUrl, {
      headers: { 'Ocp-Apim-Subscription-Key': apiKey }
    });
    const body = await response.json();

    if (body.status === 'succeeded') {
      return body;
    }
    if (body.status === 'failed') {
      throw new Error(`Azure OCR failed: ${JSON.stringify(body)}`);
    }
  }

  throw new Error('Azure OCR timed out while waiting for results.');
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function safeJson(response) {
  try {
    return await response.json();
  } catch {
    return { message: 'Unable to parse response body.' };
  }
}

module.exports = {
  extractTextWithOcr,
  DEFAULT_TRIGGER_THRESHOLD
};
