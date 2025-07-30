
# Article to Audio

A simple web application that converts text from an article into high-quality audio using OpenAI's Text-to-Speech API (GPT-4o mini and HD models).

## How to Use

1.  **Get an OpenAI API Key:**
    *   Go to [OpenAI's platform](https://platform.openai.com/).
    *   Sign up or log in, then create an API key from your account dashboard.
    *   Keep your API key secure. It will be stored in your browser's localStorage for convenience, but never shared with anyone else.

2.  **Use the Application:**
    *   Open the `index.html` file in your web browser or access the deployed application on GitHub Pages.
    *   Paste your OpenAI API Key into the designated input field. The key will be remembered for future visits on the same browser/device.
    *   Copy the text from an article and paste it into the text area.
    *   Select your preferred voice model: **Mini (tts-1)** for fast, efficient synthesis, or **HD (tts-1-hd)** for higher quality.
    *   Click the "Speak" button to generate and play the audio.
    *   The audio will be played using the browser's built-in audio player.

## How it Works

This application sends the text and your API key to the OpenAI Text-to-Speech API. You can choose between the mini (`tts-1`) and high-definition (`tts-1-hd`) models, both using the Alloy voice. The API returns the audio data in MP3 format, which is then played back in the browser.

Your API key is stored in your browser's localStorage for convenience and automatically filled in on future visits. You can clear it by removing it from your browser's localStorage.

The entire application is built with HTML, CSS, and JavaScript and can be hosted on any static web hosting service, including GitHub Pages.

## Deployment on GitHub Pages

To deploy this on GitHub Pages:

1.  Make sure your repository has a `main` branch (or another branch you prefer for deployment).
2.  Push the `index.html`, `style.css`, and `script.js` files to your repository.
3.  In your repository's settings, go to the "Pages" section.
4.  Under "Build and deployment", select "Deploy from a branch" as the source.
5.  Select the branch you pushed your files to and the `/ (root)` folder, then click "Save".
6.  Your site will be published at `https://<your-username>.github.io/<your-repository-name>/`.
