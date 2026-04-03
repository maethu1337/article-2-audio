// Function to generate a concise title for the article text via server proxy
async function generateTitle(text) {
    const response = await fetch('/api/title', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
    });
    if (!response.ok) {
        console.error('Title generation API error', await response.text());
        return 'article-audio';
    }
    const data = await response.json();
    return data.title || 'article-audio';
}

// Expose globally
window.generateTitle = generateTitle;
