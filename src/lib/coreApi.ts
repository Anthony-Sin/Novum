import fetch from 'node-fetch';

const CORE_API_URL = 'https://api.core.ac.uk/v3';

export async function fetchLatestPapers(limit: number = 10) {
  const apiKey = process.env.CORE_API_KEY;
  if (!apiKey) {
    throw new Error("CORE_API_KEY is not configured.");
  }

  // Added _exists_:downloadUrl to strictly return direct PDF files
  const query = encodeURIComponent('year >= 2023 AND year <= 2026 AND _exists_:abstract AND doi:10.* AND _exists_:downloadUrl');
  
  const url = `${CORE_API_URL}/search/works?q=${query}&limit=${limit}&sort=recency`;

  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${apiKey}`,
    }
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to fetch from CORE API: ${response.status} ${response.statusText} - ${errorText}`);
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
