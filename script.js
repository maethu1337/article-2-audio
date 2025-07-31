const textToSpeak = document.getElementById('text-to-speak');
const speakBtn = document.getElementById('speak-btn');
const downloadBtn = document.getElementById('download-btn');
const audioPlayer = document.getElementById('audio-player');
const statusDiv = document.getElementById('status');
const apiKeyInput = document.getElementById('username');

// Load access token from localStorage on page load
window.addEventListener('DOMContentLoaded', () => {
    const savedToken = localStorage.getItem('openai_access_token');
    if (savedToken) {
        apiKeyInput.value = savedToken;
    }
});

// Save access token to localStorage when changed
apiKeyInput.addEventListener('input', () => {
    localStorage.setItem('openai_access_token', apiKeyInput.value);
});
const modelSelect = document.getElementById('model-select');

speakBtn.addEventListener('click', async () => {
    // Reset download button
    downloadBtn.classList.remove('btn-blue');
    downloadBtn.classList.add('btn-gray');
    downloadBtn.removeAttribute('href');
    downloadBtn.removeAttribute('download');
    downloadBtn.style.pointerEvents = 'none';
    const playbackProgress = document.getElementById('playback-progress');
    const playbackLabel = document.getElementById('playback-label');
    playbackProgress.value = 0;
    playbackProgress.max = 100;
    playbackLabel.textContent = 'Playback: 0%';
    const progressBar = document.getElementById('progress-bar');
    const progressLabel = document.getElementById('progress-label');
    progressBar.value = 0;
    progressBar.max = 100;
    progressLabel.textContent = 'Loading: 0%';
    const text = textToSpeak.value.trim();
    const accessToken = apiKeyInput.value.trim();

    if (text === '') {
        alert('Please enter some text.');
        return;
    }


    if (accessToken === '') {
        alert('Please enter your access token.');
        return;
    }

    statusDiv.textContent = 'Synthesizing audio...';
    speakBtn.disabled = true;

    try {
        const selectedModel = modelSelect.value;
        const firstChunkSize = 128;
        const chunkSize = 256;
        const chunks = [];
        let i = 0;
        // First chunk: smaller for fast playback
        let end = Math.min(i + firstChunkSize, text.length);
        if (end < text.length) {
            let lastPeriod = text.lastIndexOf('.', end);
            if (lastPeriod > i + 30) end = lastPeriod + 1;
        }
        chunks.push(text.slice(i, end));
        i = end;
        // Remaining chunks: larger for efficiency
        while (i < text.length) {
            let end = Math.min(i + chunkSize, text.length);
            if (end < text.length) {
                let lastPeriod = text.lastIndexOf('.', end);
                if (lastPeriod > i + 50) end = lastPeriod + 1;
            }
            chunks.push(text.slice(i, end));
            i = end;
        }

        // Fetch all chunks in parallel
        let audioBlobs = new Array(chunks.length);
        let allChunksLoaded = false;
        let loadedCount = 0;
        let errorOccurred = false;

        // Helper to fetch a chunk and update progress
        async function fetchChunk(idx) {
            const chunk = chunks[idx];
            try {
                const response = await fetch('https://api.openai.com/v1/audio/speech', {
                    method: 'POST',
                    headers: {
                    'Authorization': `Bearer ${accessToken}`,
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
                audioBlobs[idx] = audioBlob;
                loadedCount++;
                progressBar.value = Math.round((loadedCount / chunks.length) * 100);
                progressLabel.textContent = `Loading: ${progressBar.value}%`;
            } catch (error) {
                errorOccurred = true;
                statusDiv.textContent = `Error: ${error.message}`;
                alert(`An error occurred: ${error.message}`);
            }
        }

        // Start fetching all chunks
        let fetchPromises = [];
        for (let idx = 0; idx < chunks.length; idx++) {
            fetchPromises.push(fetchChunk(idx));
        }

        // When all chunks are loaded, stitch and enable download
        Promise.all(fetchPromises).then(() => {
            if (!errorOccurred) {
                // Stitch all blobs together
                const stitchedBlob = new Blob(audioBlobs, { type: 'audio/mpeg' });
                const stitchedUrl = URL.createObjectURL(stitchedBlob);
                downloadBtn.classList.remove('btn-gray');
                downloadBtn.classList.add('btn-blue');
                downloadBtn.setAttribute('href', stitchedUrl);
                downloadBtn.setAttribute('download', 'article-audio.mp3');
                downloadBtn.style.pointerEvents = 'auto';
                allChunksLoaded = true;
                statusDiv.textContent = 'Audio ready for download.';
            }
        });

        // Play first chunk as soon as it's ready
        let firstChunkPlayed = false;
        (async function waitAndPlay() {
            while (!audioBlobs[0] && !errorOccurred) {
                await new Promise(res => setTimeout(res, 100));
            }
            if (audioBlobs[0]) {
                const audioUrl = URL.createObjectURL(audioBlobs[0]);
                audioPlayer.src = audioUrl;
                audioPlayer.hidden = false;
                audioPlayer.play();
                statusDiv.textContent = 'Playing audio...';
                firstChunkPlayed = true;

                // Custom playback progress
                let currentIdx = 0;
                let totalChunks = chunks.length;
                playbackProgress.value = 0;
                playbackLabel.textContent = `Playback: 0%`;

                audioPlayer.onended = async function playNextChunk() {
                    currentIdx++;
                    playbackProgress.value = Math.round((currentIdx / totalChunks) * 100);
                    playbackLabel.textContent = `Playback: ${playbackProgress.value}%`;
                    while (!audioBlobs[currentIdx] && currentIdx < totalChunks && !errorOccurred) {
                        await new Promise(res => setTimeout(res, 100));
                    }
                    if (audioBlobs[currentIdx]) {
                        const nextUrl = URL.createObjectURL(audioBlobs[currentIdx]);
                        audioPlayer.src = nextUrl;
                        audioPlayer.play();
                    } else if (currentIdx >= totalChunks) {
                        statusDiv.textContent = 'Finished speaking.';
                        playbackProgress.value = 100;
                        playbackLabel.textContent = 'Playback: 100%';
                    }
                };
            }
        })();

    } catch (error) {
        statusDiv.textContent = `Error: ${error.message}`;
        alert(`An error occurred: ${error.message}`);
    } finally {
        speakBtn.disabled = false;
    }
});

// Download button click (optional: fallback for browsers not supporting anchor download)
// No click handler needed for anchor download, but prevent action if not ready
downloadBtn.addEventListener('click', function(e) {
    if (!downloadBtn.hasAttribute('href')) {
        e.preventDefault();
    }
});
