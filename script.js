const textToSpeak = document.getElementById('text-to-speak');
const speakBtn = document.getElementById('speak-btn');
const cancelBtn = document.getElementById('cancel-btn');
const downloadBtn = document.getElementById('download-btn');
const audioPlayer = document.getElementById('audio-player');
const statusDiv = document.getElementById('status');
const modelSelect = document.getElementById('model-select');
const voiceSelect = document.getElementById('voice-select');
const rawArticleToggle = document.getElementById('raw-article-toggle');
const cleanupProgress = document.getElementById('cleanup-progress');
const synthesisProgress = document.getElementById('progress-bar');
const playbackProgress = document.getElementById('playback-progress');
const cleanupMeta = document.getElementById('cleanup-meta');
const synthesisMeta = document.getElementById('synthesis-meta');
const playbackMeta = document.getElementById('playback-meta');
const cleanupPreview = document.getElementById('cleanup-preview');
const cleanupPreviewText = document.getElementById('cleanup-preview-text');
const charCount = document.getElementById('char-count');
const chunkEstimate = document.getElementById('chunk-estimate');
const listenEstimate = document.getElementById('listen-estimate');

const defaultVoices = {
    'gpt-4o-mini-tts': 'onyx',
    'tts-1': 'onyx'
};

const jobState = {
    activeJobId: 0,
    controller: null,
    isRunning: false,
    stitchedUrl: null
};

window.addEventListener('DOMContentLoaded', async () => {
    updateEstimates();

    try {
        const resp = await fetch('/api/me');
        if (resp.ok) {
            const user = await resp.json();
            document.getElementById('user-greeting').textContent = `Signed in as ${user.display_name}`;
        }
    } catch (e) {
        console.error('Failed to load user info', e);
    }
});

modelSelect.addEventListener('change', () => {
    const model = modelSelect.value;
    if (defaultVoices[model]) {
        voiceSelect.value = defaultVoices[model];
    }
});

textToSpeak.addEventListener('input', updateEstimates);
cancelBtn.addEventListener('click', cancelActiveJob);
downloadBtn.addEventListener('click', (event) => {
    if (downloadBtn.disabled) {
        event.preventDefault();
    }
});

function updateEstimates() {
    const text = textToSpeak.value.trim();
    const chars = text.length;
    charCount.textContent = chars.toLocaleString();
    chunkEstimate.textContent = chars ? String(estimateChunks(text)) : '0';

    const words = text ? text.split(/\s+/).filter(Boolean).length : 0;
    const minutes = words ? Math.max(1, Math.round(words / 170)) : 0;
    listenEstimate.textContent = `${minutes} min`;
}

function estimateChunks(text) {
    if (!text.trim()) {
        return 0;
    }

    const firstChunkSize = 512;
    const chunkSize = 2048;
    let i = 0;
    let count = 0;

    let end = getChunkEnd(text, i, firstChunkSize, 30);
    count += 1;
    i = end;

    while (i < text.length) {
        end = getChunkEnd(text, i, chunkSize, 50);
        count += 1;
        i = end;
    }

    return count;
}

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

function buildChunks(text) {
    const chunks = [];
    let i = 0;
    let end = getChunkEnd(text, i, 512, 30);
    chunks.push(text.slice(i, end));
    i = end;

    while (i < text.length) {
        end = getChunkEnd(text, i, 2048, 50);
        chunks.push(text.slice(i, end));
        i = end;
    }

    return chunks;
}

function setRunningState(isRunning) {
    jobState.isRunning = isRunning;
    speakBtn.disabled = isRunning;
    cancelBtn.disabled = !isRunning;
    textToSpeak.disabled = isRunning;
    modelSelect.disabled = isRunning;
    voiceSelect.disabled = isRunning;
    rawArticleToggle.disabled = isRunning;
}

function setStatus(message) {
    statusDiv.textContent = message;
}

function resetProgress() {
    cleanupProgress.value = 0;
    synthesisProgress.value = 0;
    playbackProgress.value = 0;
    cleanupMeta.textContent = rawArticleToggle.checked ? 'Waiting' : 'Skipped';
    synthesisMeta.textContent = 'Waiting';
    playbackMeta.textContent = 'Not started';
}

function resetOutput() {
    if (jobState.stitchedUrl) {
        URL.revokeObjectURL(jobState.stitchedUrl);
        jobState.stitchedUrl = null;
    }

    audioPlayer.pause();
    audioPlayer.removeAttribute('src');
    audioPlayer.load();
    audioPlayer.hidden = true;
    downloadBtn.disabled = true;
}

function cancelActiveJob() {
    jobState.activeJobId = 0;
    if (jobState.controller) {
        jobState.controller.abort();
    }
    audioPlayer.pause();
    setStatus('Canceled');
    setRunningState(false);
}

function isCurrentJob(jobId) {
    return jobId === jobState.activeJobId;
}

function formatDuration(ms) {
    if (ms < 1000) {
        return `${ms} ms`;
    }
    return `${(ms / 1000).toFixed(1)} s`;
}

function waitForAudioEnd(jobId) {
    return new Promise((resolve) => {
        const handleEnded = () => {
            audioPlayer.removeEventListener('ended', handleEnded);
            audioPlayer.removeEventListener('pause', handlePause);
            resolve();
        };
        const handlePause = () => {
            if (isCurrentJob(jobId)) {
                return;
            }
            audioPlayer.removeEventListener('ended', handleEnded);
            audioPlayer.removeEventListener('pause', handlePause);
            resolve();
        };
        audioPlayer.addEventListener('ended', handleEnded);
        audioPlayer.addEventListener('pause', handlePause);
    });
}

async function cleanupText(text, signal) {
    if (!rawArticleToggle.checked) {
        cleanupProgress.value = 100;
        cleanupMeta.textContent = 'Skipped';
        cleanupPreview.open = false;
        cleanupPreviewText.textContent = 'No cleaned text yet.';
        return text;
    }

    setStatus('Preparing article text...');
    cleanupMeta.textContent = 'Running extraction';
    cleanupProgress.value = 15;

    const cleanupResponse = await fetch('/api/cleanup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
        signal
    });

    if (!cleanupResponse.ok) {
        const error = await cleanupResponse.json();
        throw new Error(`Cleanup API Error: ${error.error?.message || 'Unknown error'}`);
    }

    const cleanupData = await cleanupResponse.json();
    cleanupProgress.value = 100;
    cleanupMeta.textContent = `${cleanupData.cached ? 'Cache hit' : 'LLM cleanup'} in ${formatDuration(cleanupData.duration_ms)}`;
    cleanupPreviewText.textContent = cleanupData.cleaned_text;
    cleanupPreview.open = true;
    return cleanupData.cleaned_text;
}

async function fetchTtsChunk(chunk, model, voice, signal) {
    const response = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            text: chunk,
            model,
            voice
        }),
        signal
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(`TTS API Error: ${error.error?.message || 'Unknown error'}`);
    }

    return response.blob();
}

async function synthesizeChunks(chunks, model, voice, signal) {
    const audioBlobs = new Array(chunks.length);
    let completed = 0;

    const tasks = chunks.map(async (chunk, index) => {
        const blob = await fetchTtsChunk(chunk, model, voice, signal);
        audioBlobs[index] = blob;
        completed += 1;
        synthesisProgress.value = Math.round((completed / chunks.length) * 100);
        synthesisMeta.textContent = `${completed}/${chunks.length} chunks ready`;
    });

    const results = await Promise.allSettled(tasks);
    const failed = results.find((result) => result.status === 'rejected');
    if (failed) {
        throw failed.reason;
    }

    return audioBlobs;
}

async function playChunks(jobId, audioBlobs) {
    audioPlayer.hidden = false;

    for (let index = 0; index < audioBlobs.length; index += 1) {
        if (!isCurrentJob(jobId)) {
            return;
        }

        const chunkUrl = URL.createObjectURL(audioBlobs[index]);
        audioPlayer.src = chunkUrl;
        playbackMeta.textContent = `Chunk ${index + 1}/${audioBlobs.length}`;
        await audioPlayer.play();
        await waitForAudioEnd(jobId);
        URL.revokeObjectURL(chunkUrl);
        playbackProgress.value = Math.round(((index + 1) / audioBlobs.length) * 100);
    }

    playbackMeta.textContent = 'Finished';
}

speakBtn.addEventListener('click', async () => {
    const originalText = textToSpeak.value.trim();
    if (!originalText) {
        alert('Please enter some text.');
        return;
    }

    cancelActiveJob();
    resetOutput();
    resetProgress();

    const controller = new AbortController();
    const jobId = Date.now();
    jobState.activeJobId = jobId;
    jobState.controller = controller;
    setRunningState(true);

    try {
        const preparedText = (await cleanupText(originalText, controller.signal)).trim();
        if (!isCurrentJob(jobId)) {
            return;
        }

        textToSpeak.value = preparedText;
        updateEstimates();

        const selectedModel = modelSelect.value || 'gpt-4o-mini-tts';
        const selectedVoice = voiceSelect.value || 'onyx';
        const chunks = buildChunks(preparedText);

        setStatus('Generating audio...');
        synthesisMeta.textContent = `Starting ${chunks.length} chunks`;
        const synthStart = performance.now();
        const audioBlobs = await synthesizeChunks(chunks, selectedModel, selectedVoice, controller.signal);
        if (!isCurrentJob(jobId)) {
            return;
        }

        const synthDuration = Math.round(performance.now() - synthStart);
        const stitchedBlob = new Blob(audioBlobs, { type: 'audio/mpeg' });
        jobState.stitchedUrl = URL.createObjectURL(stitchedBlob);
        synthesisMeta.textContent = `${chunks.length} chunks in ${formatDuration(synthDuration)}`;

        downloadBtn.onclick = async () => {
            const title = await generateTitle(preparedText);
            const a = document.createElement('a');
            a.href = jobState.stitchedUrl;
            a.download = `${title}.mp3`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        };
        downloadBtn.disabled = false;

        setStatus('Playing audio...');
        await playChunks(jobId, audioBlobs);
        if (!isCurrentJob(jobId)) {
            return;
        }

        setStatus('Audio ready');
    } catch (error) {
        if (error.name === 'AbortError') {
            setStatus('Canceled');
            cleanupMeta.textContent = cleanupProgress.value > 0 && cleanupProgress.value < 100 ? 'Canceled' : cleanupMeta.textContent;
            synthesisMeta.textContent = synthesisProgress.value > 0 && synthesisProgress.value < 100 ? 'Canceled' : synthesisMeta.textContent;
            playbackMeta.textContent = playbackProgress.value > 0 && playbackProgress.value < 100 ? 'Canceled' : playbackMeta.textContent;
        } else {
            console.error(error);
            setStatus(`Error: ${error.message}`);
            alert(`An error occurred: ${error.message}`);
        }
    } finally {
        if (isCurrentJob(jobId)) {
            jobState.controller = null;
            setRunningState(false);
        }
    }
});
