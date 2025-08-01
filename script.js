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

// Helper to determine chunk end at sentence boundary
function getChunkEnd(text, start, maxSize, minSize) {
  const textLength = text.length;
  let end = Math.min(start + maxSize, textLength);
  if (end < textLength) {
    const slice = text.slice(start + minSize, end);
    const lastDot = slice.lastIndexOf('.');
    const lastQ = slice.lastIndexOf('?');
    const lastE = slice.lastIndexOf('!');
    const lastPunc = Math.max(lastDot, lastQ, lastE);
    if (lastPunc > -1) {
      return start + minSize + lastPunc + 1;
    }
  }
  return end;
}

speakBtn.addEventListener('click', async () => {
    // Reset download button
    downloadBtn.classList.remove('btn-blue');
    downloadBtn.classList.add('btn-gray');
    downloadBtn.disabled = true;
    const playbackProgress = document.getElementById('playback-progress');
    playbackProgress.value = 0;
    playbackProgress.max = 100;
    const progressBar = document.getElementById('progress-bar');
    progressBar.value = 0;
    progressBar.max = 100;
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
        let selectedModel = 'gpt-4o-mini-tts';
        if (modelSelect && modelSelect.value) {
            selectedModel = modelSelect.value;
        }
        const firstChunkSize = 256;
        const chunkSize = 368;
        const chunks = [];
        let i = 0;
        // First chunk: smaller for fast playback
        let end = getChunkEnd(text, i, firstChunkSize, 30);
        chunks.push(text.slice(i, end));
        i = end;
        // Remaining chunks: larger for efficiency
        while (i < text.length) {
           let end = getChunkEnd(text, i, chunkSize, 50);
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
                // Visual loading bar updates only
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
                
                downloadBtn.onclick = async () => {
                    // Generate a descriptive title and show it
                    const title = await generateTitle(text, accessToken);
                    const titleDiv = document.getElementById('generated-title');
                    if (titleDiv) titleDiv.textContent = `Generated Title: ${title}`;
                    const a = document.createElement('a');
                    a.href = stitchedUrl;
                    a.download = `${title}.mp3`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                };

                downloadBtn.classList.remove('btn-gray');
                downloadBtn.classList.add('btn-blue');
                downloadBtn.disabled = false;
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

                audioPlayer.onended = async function playNextChunk() {
                    currentIdx++;
                    playbackProgress.value = Math.round((currentIdx / totalChunks) * 100);
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
    if (downloadBtn.disabled) {
        e.preventDefault();
    }
});
