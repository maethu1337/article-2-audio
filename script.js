const textToSpeak = document.getElementById('text-to-speak');
const speakBtn = document.getElementById('speak-btn');
const audioPlayer = document.getElementById('audio-player');
const statusDiv = document.getElementById('status');
const apiKeyInput = document.getElementById('username');

// Load API key from localStorage on page load
window.addEventListener('DOMContentLoaded', () => {
    const savedKey = localStorage.getItem('openai_api_key');
    if (savedKey) {
        apiKeyInput.value = savedKey;
    }
});

// Save API key to localStorage when changed
apiKeyInput.addEventListener('input', () => {
    localStorage.setItem('openai_api_key', apiKeyInput.value);
});
const modelSelect = document.getElementById('model-select');

speakBtn.addEventListener('click', async () => {
    const text = textToSpeak.value.trim();
    const apiKey = apiKeyInput.value.trim();

    if (text === '') {
        alert('Please enter some text.');
        return;
    }


    if (apiKey === '') {
        alert('Please enter your OpenAI API Key.');
        return;
    }

    statusDiv.textContent = 'Synthesizing audio...';
    speakBtn.disabled = true;

    try {
        const selectedModel = modelSelect.value;
        const firstChunkSize = 512;
        const maxChunkSize = 4096;
        const chunks = [];
        let i = 0;
        // First chunk: smaller for fast playback
        let end = Math.min(i + firstChunkSize, text.length);
        if (end < text.length) {
            let lastPeriod = text.lastIndexOf('.', end);
            if (lastPeriod > i + 50) end = lastPeriod + 1;
        }
        chunks.push(text.slice(i, end));
        i = end;
        // Remaining chunks: larger for efficiency
        while (i < text.length) {
            let end = Math.min(i + maxChunkSize, text.length);
            if (end < text.length) {
                let lastPeriod = text.lastIndexOf('.', end);
                if (lastPeriod > i + 100) end = lastPeriod + 1;
            }
            chunks.push(text.slice(i, end));
            i = end;
        }

        let audioBlobs = [];
        let firstChunkPlayed = false;

        for (let idx = 0; idx < chunks.length; idx++) {
            const chunk = chunks[idx];
            const response = await fetch('https://api.openai.com/v1/audio/speech', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: selectedModel,
                    input: chunk,
                    voice: 'onyx', // Onyx voice
                    response_format: 'mp3'
                })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(`API Error: ${error.error.message}`);
            }

            const audioBlob = await response.blob();
            audioBlobs.push(audioBlob);

            // Play first chunk as soon as it's ready
            if (!firstChunkPlayed) {
                const audioUrl = URL.createObjectURL(audioBlob);
                audioPlayer.src = audioUrl;
                audioPlayer.hidden = false;
                audioPlayer.play();
                statusDiv.textContent = 'Playing audio...';
                firstChunkPlayed = true;

                // When first chunk ends, play the rest sequentially
                let currentIdx = 1;
                audioPlayer.onended = async function playNextChunk() {
                    if (currentIdx < audioBlobs.length) {
                        const nextUrl = URL.createObjectURL(audioBlobs[currentIdx]);
                        audioPlayer.src = nextUrl;
                        audioPlayer.play();
                        currentIdx++;
                    } else if (currentIdx < chunks.length) {
                        // Wait for next chunk to arrive
                        const checkNext = () => {
                            if (audioBlobs.length > currentIdx) {
                                const nextUrl = URL.createObjectURL(audioBlobs[currentIdx]);
                                audioPlayer.src = nextUrl;
                                audioPlayer.play();
                                currentIdx++;
                            } else {
                                setTimeout(checkNext, 500);
                            }
                        };
                        checkNext();
                    } else {
                        statusDiv.textContent = 'Finished speaking.';
                    }
                };
            }
        }

        // If only one chunk, set finished status when done
        if (chunks.length === 1) {
            audioPlayer.onended = () => {
                statusDiv.textContent = 'Finished speaking.';
            };
        }

    } catch (error) {
        statusDiv.textContent = `Error: ${error.message}`;
        alert(`An error occurred: ${error.message}`);
    } finally {
        speakBtn.disabled = false;
    }
});
