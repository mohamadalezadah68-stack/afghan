const API = 'https://api.open-meteo.com/v1/forecast';
const GEOCODING_API = 'https://geocoding-api.open-meteo.com/v1/search';
const STORAGE_KEY = 'afghan-weather-place-v1';
const $ = selector => document.querySelector(selector);

const status = $('#status');
const dashboard = $('#dashboard');
const searchForm = $('#search-form');
const cityInput = $('#city-input');
const unitButtons = [...document.querySelectorAll('[data-unit]')];
let unit = 'celsius';
let weatherData = null;
let selectedPlace = null;

const weatherDescriptions = {
  0: ['Clear sky', '☀', '☾'],
  1: ['Mainly clear', '🌤', '☾'],
  2: ['Partly cloudy', '⛅', '☁'],
  3: ['Overcast', '☁', '☁'],
  45: ['Foggy', '〰', '〰'], 48: ['Rime fog', '〰', '〰'],
  51: ['Light drizzle', '🌦', '🌧'], 53: ['Drizzle', '🌦', '🌧'], 55: ['Heavy drizzle', '🌧', '🌧'],
  56: ['Freezing drizzle', '🌧', '🌧'], 57: ['Freezing drizzle', '🌧', '🌧'],
  61: ['Light rain', '🌦', '🌧'], 63: ['Rain', '🌧', '🌧'], 65: ['Heavy rain', '🌧', '🌧'],
  66: ['Freezing rain', '🌧', '🌧'], 67: ['Heavy freezing rain', '🌧', '🌧'],
  71: ['Light snow', '🌨', '🌨'], 73: ['Snow', '🌨', '🌨'], 75: ['Heavy snow', '❄', '❄'], 77: ['Snow grains', '❄', '❄'],
  80: ['Rain showers', '🌦', '🌧'], 81: ['Rain showers', '🌧', '🌧'], 82: ['Heavy showers', '🌧', '🌧'],
  85: ['Snow showers', '🌨', '🌨'], 86: ['Heavy snow showers', '❄', '❄'],
  95: ['Thunderstorm', '⛈', '⛈'], 96: ['Thunderstorm with hail', '⛈', '⛈'], 99: ['Thunderstorm with hail', '⛈', '⛈']
};

function describe(code, isDay = true) {
  const [label, dayIcon, nightIcon] = weatherDescriptions[code] || ['Variable conditions', '🌤', '☁'];
  return { label, icon: isDay ? dayIcon : nightIcon };
}

function displayTemperature(value) {
  if (!Number.isFinite(value)) return '—';
  const converted = unit === 'fahrenheit' ? value * 9 / 5 + 32 : value;
  return `${Math.round(converted)}°`;
}

function displayWind(value) {
  return unit === 'fahrenheit' ? `${Math.round(value * 0.621371)}` : `${Math.round(value)}`;
}

function formatPlace(place) {
  return [place.name, place.admin1, place.country].filter(Boolean).filter((part, index, all) => all.indexOf(part) === index).join(', ');
}

async function getWeather(place) {
  status.hidden = false;
  status.className = 'status';
  status.textContent = `Getting the forecast for ${place.name}…`;
  dashboard.hidden = true;
  const params = new URLSearchParams({
    latitude: place.latitude,
    longitude: place.longitude,
    current: 'temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,wind_speed_10m',
    hourly: 'temperature_2m,precipitation_probability,weather_code',
    daily: 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,sunrise,sunset',
    timezone: 'auto', forecast_days: '6'
  });
  try {
    const response = await fetch(`${API}?${params}`);
    if (!response.ok) throw new Error('The weather service could not return a forecast. Please try again.');
    weatherData = await response.json();
    if (!weatherData.current || !weatherData.daily || !weatherData.hourly) throw new Error('The forecast data was incomplete. Please try again.');
    selectedPlace = place;
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(place)); } catch { /* Storage is optional. */ }
    render();
    status.hidden = true;
    dashboard.hidden = false;
  } catch (error) {
    status.className = 'status status-error';
    status.textContent = error.message || 'Could not load weather. Check your connection and try again.';
    dashboard.hidden = true;
  }
}

async function searchCity(query) {
  const params = new URLSearchParams({ name: query, count: '1', language: 'en', format: 'json' });
  status.hidden = false;
  status.className = 'status';
  status.textContent = `Searching for ${query}…`;
  dashboard.hidden = true;
  try {
    const response = await fetch(`${GEOCODING_API}?${params}`);
    if (!response.ok) throw new Error('City search is temporarily unavailable. Please try again.');
    const result = await response.json();
    if (!result.results?.length) throw new Error(`We couldn’t find “${query}”. Try another city name.`);
    await getWeather(result.results[0]);
  } catch (error) {
    status.className = 'status status-error';
    status.textContent = error.message || 'City search failed. Check your connection and try again.';
  }
}

function render() {
  const { current, hourly, daily } = weatherData;
  const conditions = describe(current.weather_code, current.is_day === 1);
  $('#place-name').textContent = selectedPlace.name;
  $('#place-detail').textContent = [selectedPlace.admin1, selectedPlace.country].filter(Boolean).join(' · ');
  $('#current-date').textContent = new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'long', day: 'numeric' }).format(new Date(`${current.time}:00`));
  $('#current-icon').textContent = conditions.icon;
  $('#current-condition').textContent = conditions.label;
  $('#current-temp').textContent = displayTemperature(current.temperature_2m).replace('°', '');
  $('#current-degree').textContent = unit === 'celsius' ? '°C' : '°F';
  $('#feels-like').textContent = displayTemperature(current.apparent_temperature).replace('°', '');
  $('#feels-degree').textContent = unit === 'celsius' ? '°C' : '°F';
  $('#humidity').textContent = `${current.relative_humidity_2m}%`;
  $('#wind').textContent = displayWind(current.wind_speed_10m);
  $('#wind-unit').textContent = unit === 'celsius' ? 'km/h' : 'mph';
  $('#rain-chance').textContent = `${hourly.precipitation_probability?.[findNextHour(hourly.time)] ?? 0}%`;
  $('#updated-at').textContent = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(new Date(`${current.time}:00`));
  renderHourly(hourly);
  renderDaily(daily);
}

function findNextHour(times) {
  const now = new Date();
  const index = times.findIndex(time => new Date(`${time}:00`) >= now);
  return index < 0 ? 0 : index;
}

function renderHourly(hourly) {
  const container = $('#hourly-list');
  container.replaceChildren();
  const start = findNextHour(hourly.time);
  for (let i = start; i < Math.min(start + 12, hourly.time.length); i++) {
    const item = document.createElement('div');
    item.className = 'hour-item';
    const time = document.createElement('span');
    time.className = 'hour-time';
    time.textContent = i === start ? 'Now' : new Intl.DateTimeFormat(undefined, { hour: 'numeric' }).format(new Date(`${hourly.time[i]}:00`));
    const icon = document.createElement('span');
    icon.className = 'hour-icon';
    icon.textContent = describe(hourly.weather_code[i]).icon;
    icon.setAttribute('aria-label', describe(hourly.weather_code[i]).label);
    const temp = document.createElement('strong');
    temp.className = 'hour-temp';
    temp.textContent = displayTemperature(hourly.temperature_2m[i]);
    item.append(time, icon, temp);
    container.append(item);
  }
}

function renderDaily(daily) {
  const container = $('#daily-list');
  container.replaceChildren();
  for (let i = 1; i < Math.min(6, daily.time.length); i++) {
    const row = document.createElement('div');
    row.className = 'daily-row';
    const day = document.createElement('span');
    day.className = 'day-name';
    day.textContent = new Intl.DateTimeFormat(undefined, { weekday: 'long' }).format(new Date(`${daily.time[i]}T12:00:00`));
    const condition = document.createElement('span');
    condition.className = 'day-condition';
    const icon = document.createElement('span');
    icon.className = 'day-icon';
    icon.textContent = describe(daily.weather_code[i]).icon;
    const label = document.createElement('span');
    label.textContent = describe(daily.weather_code[i]).label;
    condition.append(icon, label);
    const rain = document.createElement('span');
    rain.className = 'day-rain';
    rain.textContent = `${daily.precipitation_probability_max?.[i] ?? 0}%`;
    rain.setAttribute('aria-label', `Precipitation chance ${rain.textContent}`);
    const temps = document.createElement('span');
    temps.className = 'day-temps';
    const low = document.createElement('span');
    low.textContent = displayTemperature(daily.temperature_2m_min[i]);
    const high = document.createElement('strong');
    high.textContent = displayTemperature(daily.temperature_2m_max[i]);
    temps.append(low, high);
    row.append(day, condition, rain, temps);
    container.append(row);
  }
}

searchForm.addEventListener('submit', event => {
  event.preventDefault();
  const query = cityInput.value.trim();
  if (query) searchCity(query);
});

$('#location-button').addEventListener('click', () => {
  if (!navigator.geolocation) {
    status.hidden = false;
    status.className = 'status status-error';
    status.textContent = 'Your browser does not support location. Search for a city instead.';
    return;
  }
  status.hidden = false;
  status.className = 'status';
  status.textContent = 'Finding your location…';
  navigator.geolocation.getCurrentPosition(
    position => getWeather({ name: 'Your location', latitude: position.coords.latitude, longitude: position.coords.longitude }),
    () => {
      status.className = 'status status-error';
      status.textContent = 'Could not access your location. Allow location access or search for a city.';
    },
    { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 }
  );
});

unitButtons.forEach(button => button.addEventListener('click', () => {
  unit = button.dataset.unit;
  unitButtons.forEach(option => option.setAttribute('aria-pressed', String(option === button)));
  if (weatherData) render();
}));

let savedPlace = null;
try { savedPlace = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null'); } catch { /* Start with the default city. */ }
if (savedPlace && Number.isFinite(savedPlace.latitude) && Number.isFinite(savedPlace.longitude)) {
  getWeather(savedPlace);
} else {
  searchCity('Kabul');
}
