# Article to Audio

A simple web application that converts text from an article into high-quality audio using Google Cloud Text-to-Speech API.

## How to Use

1.  **Get a Google Cloud API Key:**
    *   Go to the [Google Cloud Console](https://console.cloud.google.com/).
    *   Create a new project or select an existing one.
    *   Enable the **Cloud Text-to-Speech API** for your project. You can find it in the API Library.
    *   Go to "Credentials" and create a new API key.
    *   **Important:** For security, it's highly recommended to restrict your API key. You can restrict it to be used only from the specific web domains where you will host your application (e.g., your GitHub Pages URL).

2.  **Use the Application:**
    *   Open the `index.html` file in your web browser or access the deployed application on GitHub Pages.
    *   Paste your Google Cloud API Key into the designated input field.
    *   Copy the text from an article and paste it into the text area.
    *   Click the "Speak" button to generate and play the audio.
    *   The audio will be played using the browser's built-in audio player.

## How it Works

This application sends the text and your API key to the Google Cloud Text-to-Speech API. It requests the audio in MP3 format using a high-quality Gemini voice (`en-US-Studio-M`). The API returns the audio data, which is then played back in the browser.

The entire application is built with HTML, CSS, and JavaScript and can be hosted on any static web hosting service, including GitHub Pages.

## Deployment on GitHub Pages

To deploy this on GitHub Pages:

1.  Make sure your repository has a `main` branch (or another branch you prefer for deployment).
2.  Push the `index.html`, `style.css`, and `script.js` files to your repository.
3.  In your repository's settings, go to the "Pages" section.
4.  Under "Build and deployment", select "Deploy from a branch" as the source.
5.  Select the branch you pushed your files to and the `/ (root)` folder, then click "Save".
6.  Your site will be published at `https://<your-username>.github.io/<your-repository-name>/`.
7.  **Remember to add your GitHub Pages URL to your API key restrictions in the Google Cloud Console.**
