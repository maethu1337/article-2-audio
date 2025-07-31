// Function to generate a concise title for the article text using OpenAI API
async function generateTitle(text, accessToken) {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            model: 'gpt-4.1-nano',
            messages: [
                { role: 'system', content: 'You are a helpful assistant that generates a concise descriptive title for a given article.' },
                { role: 'user', content: `Please provide a concise title (5 words or fewer) for the following article:\n\n${text}` }
            ],
            max_tokens: 10,
            temperature: 0.7
        })
    });
    if (!response.ok) {
        console.error('Title generation API error', await response.text());
        return 'article-audio';
    }
    const data = await response.json();
    let title = data.choices?.[0]?.message?.content?.trim() || 'article-audio';
    // Sanitize filename: remove illegal characters
    title = title.replace(/[\\/:*?"<>|]+/g, '').trim() || 'article-audio';
    // Slugify: lowercase and hyphenate spaces
    title = title.toLowerCase().replace(/\s+/g, '-');
    return title;
}

// Expose globally
window.generateTitle = generateTitle;
