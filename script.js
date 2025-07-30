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
        alert('Please enter your OpenAI API Key.');
        return;
    }

    statusDiv.textContent = 'Synthesizing audio...';
    speakBtn.disabled = true;

    try {
        const response = await fetch('https://api.openai.com/v1/audio/speech', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'tts-1-hd', // OpenAI high-definition TTS model
                input: text,
                voice: 'alloy', // Alloy voice
                response_format: 'mp3'
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(`API Error: ${error.error.message}`);
        }

        // OpenAI returns the audio as a binary mp3 file
        const audioBlob = await response.blob();
        const audioUrl = URL.createObjectURL(audioBlob);
        audioPlayer.src = audioUrl;
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
