const textToSpeak = document.getElementById('text-to-speak');
const speakBtn = document.getElementById('speak-btn');
const audioPlayer = document.getElementById('audio-player');
const statusDiv = document.getElementById('status');
const apiKeyInput = document.getElementById('api-key');

speakBtn.addEventListener('click', async () => {
    const text = textToSpeak.value.trim();
    const apiKey = apiKeyInput.value.trim();

    if (text === '') {
        alert('Please enter some text.');
        return;
    }

    if (apiKey === '') {
        alert('Please enter your Google Cloud API Key.');
        return;
    }

    statusDiv.textContent = 'Synthesizing audio...';
    speakBtn.disabled = true;

    try {
        const response = await fetch(`https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                input: {
                    text: text
                },
                voice: {
                    languageCode: 'en-US',
                    name: 'en-US-Studio-M' // A Gemini voice
                },
                audioConfig: {
                    audioEncoding: 'MP3'
                }
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(`API Error: ${error.error.message}`);
        }

        const data = await response.json();
        const audioContent = data.audioContent;
        const audioSrc = `data:audio/mp3;base64,${audioContent}`;
        
        audioPlayer.src = audioSrc;
        audioPlayer.hidden = false;
        audioPlayer.play();
        statusDiv.textContent = 'Playing audio.';

    } catch (error) {
        statusDiv.textContent = `Error: ${error.message}`;
        alert(`An error occurred: ${error.message}`);
    } finally {
        speakBtn.disabled = false;
    }
});
