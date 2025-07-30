const textToSpeak = document.getElementById('text-to-speak');
const speakBtn = document.getElementById('speak-btn');
const pauseBtn = document.getElementById('pause-btn');
const resumeBtn = document.getElementById('resume-btn');
const stopBtn = document.getElementById('stop-btn');
const statusDiv = document.getElementById('status');

let utterance;

speakBtn.addEventListener('click', () => {
    const text = textToSpeak.value;
    if (text.trim() === '') {
        alert('Please enter some text.');
        return;
    }

    if (speechSynthesis.speaking) {
        speechSynthesis.cancel();
    }

    utterance = new SpeechSynthesisUtterance(text);
    
    utterance.onstart = () => {
        statusDiv.textContent = 'Speaking...';
        speakBtn.disabled = true;
        pauseBtn.disabled = false;
        resumeBtn.disabled = true;
        stopBtn.disabled = false;
    };

    utterance.onpause = () => {
        statusDiv.textContent = 'Paused.';
        pauseBtn.disabled = true;
        resumeBtn.disabled = false;
    };

    utterance.onresume = () => {
        statusDiv.textContent = 'Speaking...';
        pauseBtn.disabled = false;
        resumeBtn.disabled = true;
    };

    utterance.onend = () => {
        statusDiv.textContent = 'Finished speaking.';
        speakBtn.disabled = false;
        pauseBtn.disabled = true;
        resumeBtn.disabled = true;
        stopBtn.disabled = true;
    };

    speechSynthesis.speak(utterance);
});

pauseBtn.addEventListener('click', () => {
    speechSynthesis.pause();
});

resumeBtn.addEventListener('click', () => {
    speechSynthesis.resume();
});

stopBtn.addEventListener('click', () => {
    speechSynthesis.cancel();
});
