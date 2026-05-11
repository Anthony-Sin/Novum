import fetch from 'node-fetch';

const CORE_API_URL = 'https://api.core.ac.uk/v3';

export async function fetchLatestPapers(limit: number = 10) {
  const apiKey = process.env.CORE_API_KEY;
  if (!apiKey) {
    throw new Error("CORE_API_KEY is not configured.");
  }

  const url = `${CORE_API_URL}/search/works?q=year:>=2023&limit=${limit}&sort=publishedDate`;

  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${apiKey}`,
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch from CORE API: ${response.statusText}`);
  }

  const data = await response.json();
  return data.results;
}

export async function fetchPaperByDoi(doi: string) {
  const apiKey = process.env.CORE_API_KEY;
  if (!apiKey) {
    throw new Error("CORE_API_KEY is not configured.");
  }

  const url = `${CORE_API_URL}/search/works?q=doi:"${doi}"`;

  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${apiKey}`,
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch from CORE API: ${response.statusText}`);
  }

  const data = await response.json();
  return data.results && data.results.length > 0 ? data.results[0] : null;
}
