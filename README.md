# Article to Audio

A simple web application that converts text from an article into audio that can be played directly in the browser.

## How to Use

1.  Open the `index.html` file in your web browser.
2.  Copy the text from an article and paste it into the text area.
3.  Click the "Speak" button to start the audio playback.
4.  Use the "Pause", "Resume", and "Stop" buttons to control the audio.

## How it Works

This application uses the [Web Speech API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API), which is built into modern web browsers, to synthesize speech from the provided text. The entire application is built with HTML, CSS, and JavaScript and can be hosted on any static web hosting service, including GitHub Pages.

## Deployment on GitHub Pages

To deploy this on GitHub Pages:

1.  Make sure your repository has a `main` branch.
2.  Push the `index.html`, `style.css`, and `script.js` files to your repository.
3.  In your repository's settings, go to the "Pages" section.
4.  Under "Build and deployment", select "Deploy from a branch" as the source.
5.  Select the `main` branch and the `/ (root)` folder, then click "Save".
6.  Your site will be published at `https://<your-username>.github.io/<your-repository-name>/`.
