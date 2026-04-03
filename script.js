const textToSpeak = document.getElementById('text-to-speak');
const speakBtn = document.getElementById('speak-btn');
const downloadBtn = document.getElementById('download-btn');
const audioPlayer = document.getElementById('audio-player');
const statusDiv = document.getElementById('status');

// Load user info from server
window.addEventListener('DOMContentLoaded', async () => {
    try {
        const resp = await fetch('/api/me');
        if (resp.ok) {
            const user = await resp.json();
            document.getElementById('user-greeting').textContent = `Welcome, ${user.display_name}`;
        }
    } catch (e) {
        console.error('Failed to load user info', e);
    }
});
const modelSelect = document.getElementById('model-select');
const voiceSelect = document.getElementById('voice-select');

// Default voices per model
const defaultVoices = {
    'gpt-4o-mini-tts': 'onyx',
    'tts-1': 'onyx'
};

// Switch default voice when model changes
modelSelect.addEventListener('change', () => {
    const model = modelSelect.value;
    if (defaultVoices[model]) {
        voiceSelect.value = defaultVoices[model];
    }
});
const rawArticleToggle = document.getElementById('raw-article-toggle');
const labelClean = document.getElementById('label-clean');
const labelRaw = document.getElementById('label-raw');

// Toggle label highlighting
function updateToggleLabels() {
    if (rawArticleToggle.checked) {
        labelClean.classList.remove('active');
        labelRaw.classList.add('active');
    } else {
        labelClean.classList.add('active');
        labelRaw.classList.remove('active');
    }
}
rawArticleToggle.addEventListener('change', updateToggleLabels);
updateToggleLabels();

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
    downloadBtn.disabled = true;
    const playbackProgress = document.getElementById('playback-progress');
    playbackProgress.value = 0;
    playbackProgress.max = 100;
    const progressBar = document.getElementById('progress-bar');
    progressBar.value = 0;
    progressBar.max = 100;
    let text = textToSpeak.value.trim();

    if (text === '') {
        alert('Please enter some text.');
        return;
    }

    // Raw Article mode: clean text via LLM first
    if (rawArticleToggle.checked) {
        statusDiv.textContent = 'Cleaning article text...';
        speakBtn.disabled = true;
        try {
            const cleanupResponse = await fetch('/api/cleanup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text })
            });
            if (!cleanupResponse.ok) {
                const error = await cleanupResponse.json();
                throw new Error(`Cleanup API Error: ${error.error?.message || 'Unknown error'}`);
            }
            const cleanupData = await cleanupResponse.json();
            const cleanedText = cleanupData.cleaned_text;
            textToSpeak.value = cleanedText;
            text = cleanedText;
        } catch (error) {
            statusDiv.textContent = `Error: ${error.message}`;
            alert(`An error occurred during text cleanup: ${error.message}`);
            speakBtn.disabled = false;
            return;
        }
    }

    statusDiv.textContent = 'Synthesizing audio...';
    speakBtn.disabled = true;

    try {
        let selectedModel = 'gpt-4o-mini-tts';
        if (modelSelect && modelSelect.value) {
            selectedModel = modelSelect.value;
        }
        let selectedVoice = 'onyx';
        if (voiceSelect && voiceSelect.value) {
            selectedVoice = voiceSelect.value;
        }
        const firstChunkSize = 512;
        const chunkSize = 2048;
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
                const response = await fetch('/api/tts', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        text: chunk,
                        model: selectedModel,
                        voice: selectedVoice
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
                    const title = await generateTitle(text);
                    const titleDiv = document.getElementById('generated-title');
                    if (titleDiv) titleDiv.textContent = `Generated Title: ${title}`;
                    const a = document.createElement('a');
                    a.href = stitchedUrl;
                    a.download = `${title}.mp3`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                };

                downloadBtn.disabled = false;
                allChunksLoaded = true;
                statusDiv.textContent = 'Audio ready for download.';
            }
        }).catch((err) => {
            statusDiv.textContent = `Error: ${err.message}`;
            speakBtn.disabled = false;
        });

        // Play first chunk as soon as it's ready
        let firstChunkPlayed = false;
        (async function waitAndPlay() {
            while (!audioBlobs[0] && !errorOccurred) {
                await new Promise(res => setTimeout(res, 100));
            }
            if (audioBlobs[0]) {
                let currentObjUrl = URL.createObjectURL(audioBlobs[0]);
                audioPlayer.src = currentObjUrl;
                audioPlayer.hidden = false;
                audioPlayer.play();
                statusDiv.textContent = 'Playing audio...';
                firstChunkPlayed = true;

                // Custom playback progress
                let currentIdx = 0;
                let totalChunks = chunks.length;
                playbackProgress.value = 0;

                audioPlayer.onended = async function playNextChunk() {
                    URL.revokeObjectURL(currentObjUrl);
                    currentIdx++;
                    playbackProgress.value = Math.round((currentIdx / totalChunks) * 100);
                    while (!audioBlobs[currentIdx] && currentIdx < totalChunks && !errorOccurred) {
                        await new Promise(res => setTimeout(res, 100));
                    }
                    if (audioBlobs[currentIdx]) {
                        currentObjUrl = URL.createObjectURL(audioBlobs[currentIdx]);
                        audioPlayer.src = currentObjUrl;
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
