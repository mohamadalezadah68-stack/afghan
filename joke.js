const JOKE_API = 'https://icanhazdadjoke.com/';
const jokeText = document.querySelector('#joke-text');
const status = document.querySelector('#status');
const newJokeButton = document.querySelector('#new-joke');
const copyButton = document.querySelector('#copy-joke');
let currentJoke = '';

async function getJoke() {
  newJokeButton.disabled = true;
  copyButton.disabled = true;
  newJokeButton.classList.add('is-loading');
  status.textContent = 'Finding a fresh joke…';
  status.classList.remove('is-error');
  try {
    const response = await fetch(JOKE_API, {
      headers: { Accept: 'application/json' },
      cache: 'no-store'
    });
    if (!response.ok) throw new Error('The joke service is unavailable right now.');
    const data = await response.json();
    if (typeof data.joke !== 'string' || !data.joke.trim()) {
      throw new Error('The joke service returned an unexpected response.');
    }
    currentJoke = data.joke.trim();
    jokeText.textContent = currentJoke;
    status.textContent = 'Here’s your joke. Pass it on!';
    copyButton.disabled = false;
  } catch (error) {
    currentJoke = '';
    jokeText.textContent = 'Our punchline is taking a moment.';
    status.textContent = error.message || 'Could not load a joke. Check your connection and try again.';
    status.classList.add('is-error');
  } finally {
    newJokeButton.disabled = false;
    newJokeButton.classList.remove('is-loading');
  }
}

newJokeButton.addEventListener('click', getJoke);

copyButton.addEventListener('click', async () => {
  if (!currentJoke) return;
  try {
    await navigator.clipboard.writeText(currentJoke);
    status.textContent = 'Copied! Go make someone smile.';
    status.classList.remove('is-error');
  } catch {
    status.textContent = 'Copy isn’t available here. Select the joke text to copy it.';
    status.classList.add('is-error');
  }
});

getJoke();
