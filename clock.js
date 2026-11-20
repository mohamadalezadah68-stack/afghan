const STORAGE_KEY = 'afghan-world-clock-zones-v1';
const DEFAULT_ZONES = ['Asia/Kabul', 'Europe/London', 'America/New_York', 'Asia/Tokyo'];
const COMMON_ZONES = [
  'Africa/Cairo', 'Africa/Johannesburg', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
  'America/Mexico_City', 'America/New_York', 'America/Sao_Paulo', 'Asia/Dubai', 'Asia/Kabul',
  'Asia/Karachi', 'Asia/Kolkata', 'Asia/Seoul', 'Asia/Shanghai', 'Asia/Singapore', 'Asia/Tokyo',
  'Australia/Sydney', 'Europe/Berlin', 'Europe/Istanbul', 'Europe/London', 'Europe/Paris', 'Pacific/Auckland'
];
const grid = document.querySelector('#clock-grid');
const form = document.querySelector('#add-form');
const select = document.querySelector('#timezone-select');
const count = document.querySelector('#clock-count');

function isValidZone(zone) {
  try { new Intl.DateTimeFormat('en', { timeZone: zone }); return true; }
  catch { return false; }
}

function readZones() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    if (Array.isArray(saved)) {
      const valid = [...new Set(saved.filter(zone => typeof zone === 'string' && isValidZone(zone)))];
      return valid.length ? valid : [...DEFAULT_ZONES];
    }
  } catch { /* Use the default clocks if storage is unavailable or malformed. */ }
  return [...DEFAULT_ZONES];
}

let zones = readZones();

function cityName(zone) {
  const city = zone.split('/').pop().replaceAll('_', ' ');
  return city === 'Kolkata' ? 'Kolkata' : city;
}

function zoneLabel(zone) {
  return zone.replaceAll('_', ' ').replaceAll('/', ' / ');
}

function dateParts(date, zone, options) {
  return new Intl.DateTimeFormat(undefined, { ...options, timeZone: zone }).format(date);
}

function createCard(zone) {
  const card = document.createElement('article');
  card.className = `clock-card${zone === Intl.DateTimeFormat().resolvedOptions().timeZone ? ' local' : ''}`;
  card.dataset.zone = zone;

  const top = document.createElement('div');
  top.className = 'card-top';
  const heading = document.createElement('div');
  const city = document.createElement('h3');
  city.className = 'city';
  city.textContent = cityName(zone);
  const name = document.createElement('p');
  name.className = 'zone';
  name.textContent = zoneLabel(zone);
  heading.append(city, name);
  const remove = document.createElement('button');
  remove.type = 'button';
  remove.className = 'remove-button';
  remove.setAttribute('aria-label', `Remove ${city.textContent} clock`);
  remove.textContent = '×';
  remove.hidden = zone === Intl.DateTimeFormat().resolvedOptions().timeZone;
  remove.addEventListener('click', () => removeZone(zone));
  top.append(heading, remove);

  const isLocal = zone === Intl.DateTimeFormat().resolvedOptions().timeZone;
  if (isLocal) {
    const tag = document.createElement('span');
    tag.className = 'local-tag';
    tag.textContent = 'YOUR LOCAL TIME';
    heading.append(tag);
  }

  const time = document.createElement('p');
  time.className = 'time';
  time.setAttribute('aria-label', `${city.textContent} current time`);
  const hoursMinutes = document.createElement('span');
  hoursMinutes.dataset.timeMain = '';
  const seconds = document.createElement('span');
  seconds.className = 'seconds';
  seconds.dataset.timeSeconds = '';
  time.append(hoursMinutes, seconds);

  const date = document.createElement('p');
  date.className = 'date';
  date.dataset.date = '';
  const offset = document.createElement('p');
  offset.className = 'offset';
  offset.dataset.offset = '';
  card.append(top, time, date, offset);
  return card;
}

function saveZones() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(zones)); }
  catch { /* The clocks still work if storage is unavailable. */ }
}

function renderCards() {
  grid.replaceChildren(...zones.map(createCard));
  count.textContent = `${zones.length} ${zones.length === 1 ? 'clock' : 'clocks'}`;
  updateClocks();
}

function updateClocks() {
  const now = new Date();
  for (const card of grid.children) {
    const zone = card.dataset.zone;
    card.querySelector('[data-time-main]').textContent = dateParts(now, zone, { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
    card.querySelector('[data-time-seconds]').textContent = `:${dateParts(now, zone, { second: '2-digit' })}`;
    card.querySelector('[data-date]').textContent = dateParts(now, zone, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
    const offsetName = dateParts(now, zone, { timeZoneName: 'longOffset' }).split(' ').pop();
    const zoneName = dateParts(now, zone, { timeZoneName: 'short' }).split(' ').pop();
    card.querySelector('[data-offset]').textContent = `${zoneName} · ${offsetName === 'GMT' ? 'UTC+00:00' : offsetName.replace('GMT', 'UTC')}`;
  }
}

function populateSelect() {
  const available = COMMON_ZONES.filter(zone => !zones.includes(zone));
  select.replaceChildren(new Option('Select a time zone…', ''), ...available.map(zone => new Option(`${cityName(zone)} — ${zoneLabel(zone)}`, zone)));
}

function addZone(zone) {
  if (!zone || !isValidZone(zone) || zones.includes(zone)) return;
  zones.push(zone);
  saveZones();
  renderCards();
  populateSelect();
}

function removeZone(zone) {
  if (zones.length <= 1 || zone === Intl.DateTimeFormat().resolvedOptions().timeZone) return;
  zones = zones.filter(item => item !== zone);
  saveZones();
  renderCards();
  populateSelect();
}

form.addEventListener('submit', event => {
  event.preventDefault();
  addZone(select.value);
  select.value = '';
});

renderCards();
populateSelect();
window.setInterval(updateClocks, 1000);
