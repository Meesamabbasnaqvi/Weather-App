/* ============================================================
   Weather Now — script.js
   Default city: Lucknow, India
   API: Open-Meteo (free, no key needed)
============================================================ */

// ─── Weather Code Map ─────────────────────────────────────
const WMO = {
  0:  { desc: 'Clear sky',             icon: 'icon-sunny.webp' },
  1:  { desc: 'Mainly clear',          icon: 'icon-sunny.webp' },
  2:  { desc: 'Partly cloudy',         icon: 'icon-partly-cloudy.webp' },
  3:  { desc: 'Overcast',              icon: 'icon-overcast.webp' },
  45: { desc: 'Foggy',                 icon: 'icon-fog.webp' },
  48: { desc: 'Rime fog',              icon: 'icon-fog.webp' },
  51: { desc: 'Light drizzle',         icon: 'icon-drizzle.webp' },
  53: { desc: 'Drizzle',               icon: 'icon-drizzle.webp' },
  55: { desc: 'Dense drizzle',         icon: 'icon-drizzle.webp' },
  56: { desc: 'Freezing drizzle',      icon: 'icon-drizzle.webp' },
  57: { desc: 'Heavy freezing drizzle',icon: 'icon-drizzle.webp' },
  61: { desc: 'Slight rain',           icon: 'icon-rain.webp' },
  63: { desc: 'Moderate rain',         icon: 'icon-rain.webp' },
  65: { desc: 'Heavy rain',            icon: 'icon-rain.webp' },
  66: { desc: 'Light freezing rain',   icon: 'icon-rain.webp' },
  67: { desc: 'Heavy freezing rain',   icon: 'icon-rain.webp' },
  71: { desc: 'Slight snow',           icon: 'icon-snow.webp' },
  73: { desc: 'Moderate snow',         icon: 'icon-snow.webp' },
  75: { desc: 'Heavy snow',            icon: 'icon-snow.webp' },
  77: { desc: 'Snow grains',           icon: 'icon-snow.webp' },
  80: { desc: 'Slight showers',        icon: 'icon-rain.webp' },
  81: { desc: 'Moderate showers',      icon: 'icon-rain.webp' },
  82: { desc: 'Violent showers',       icon: 'icon-rain.webp' },
  85: { desc: 'Slight snow showers',   icon: 'icon-snow.webp' },
  86: { desc: 'Heavy snow showers',    icon: 'icon-snow.webp' },
  95: { desc: 'Thunderstorm',          icon: 'icon-storm.webp' },
  96: { desc: 'Thunderstorm + hail',   icon: 'icon-storm.webp' },
  99: { desc: 'Thunderstorm + hail',   icon: 'icon-storm.webp' },
};

function getWmo(code) {
  return WMO[code] || { desc: 'Clear sky', icon: 'icon-sunny.webp' };
}

// Cardinal wind direction from degrees
function windDirection(deg) {
  const dirs = ['N','NE','E','SE','S','SW','W','NW'];
  return dirs[Math.round(deg / 45) % 8];
}

// ─── App State ───────────────────────────────────────────
const state = {
  // Default: Lucknow, India
  lat:     26.8467,
  lon:     80.9462,
  city:    'Lucknow',
  country: 'India',
  units:   { temp: 'celsius', wind: 'kmh', precip: 'mm' },
  weatherData: null,
  selectedDay: 0,
};

// ─── DOM Shortcuts ────────────────────────────────────────
const $ = id => document.getElementById(id);

const el = {
  searchInput:   $('search-input'),
  searchBtn:     $('search-btn'),
  autocomplete:  $('autocomplete-list'),
  unitsBtn:      $('units-btn'),
  unitsDropdown: $('units-dropdown'),

  cardCity:      $('card-city'),
  cardDate:      $('card-date'),
  cardDesc:      $('card-desc'),
  cardIcon:      $('card-icon'),
  cardTemp:      $('card-temp'),
  cardLoading:   $('card-loading'),

  statFeels:     $('stat-feels'),
  statHumidity:  $('stat-humidity'),
  statWind:      $('stat-wind'),
  statPrecip:    $('stat-precip'),

  dailyGrid:     $('daily-grid'),
  hourlyList:    $('hourly-list'),
  daySelect:     $('day-select'),
};

// ─── Unit Formatters ─────────────────────────────────────
const fmt = {
  temp(c) {
    return state.units.temp === 'fahrenheit'
      ? `${Math.round(c * 9 / 5 + 32)}°`
      : `${Math.round(c)}°`;
  },
  tempFull(c) {
    return state.units.temp === 'fahrenheit'
      ? `${Math.round(c * 9 / 5 + 32)}°F`
      : `${Math.round(c)}°C`;
  },
  wind(kmh, deg) {
    const spd = state.units.wind === 'mph'
      ? `${Math.round(kmh * 0.6214)} mph`
      : `${Math.round(kmh)} km/h`;
    return deg !== undefined ? `${spd} ${windDirection(deg)}` : spd;
  },
  precip(mm) {
    return state.units.precip === 'inch'
      ? `${(mm * 0.0394).toFixed(2)} in`
      : `${mm} mm`;
  },
};

// ─── Fetch Weather ────────────────────────────────────────
async function fetchWeather() {
  el.cardLoading.classList.remove('hidden');

  try {
    const url = new URL('https://api.open-meteo.com/v1/forecast');
    url.searchParams.set('latitude',  state.lat);
    url.searchParams.set('longitude', state.lon);
    url.searchParams.set('timezone',  'auto');
    url.searchParams.set('current', [
      'temperature_2m',
      'apparent_temperature',
      'relative_humidity_2m',
      'precipitation',
      'weather_code',
      'wind_speed_10m',
      'wind_direction_10m',
      'is_day',
    ].join(','));
    url.searchParams.set('hourly', [
      'temperature_2m',
      'weather_code',
      'precipitation_probability',
    ].join(','));
    url.searchParams.set('daily', [
      'weather_code',
      'temperature_2m_max',
      'temperature_2m_min',
      'sunrise',
      'sunset',
      'precipitation_probability_max',
    ].join(','));
    url.searchParams.set('forecast_days', '7');

    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    state.weatherData = await res.json();
    state.selectedDay = 0;
    renderAll();
  } catch (err) {
    console.error('Fetch error:', err);
    el.cardCity.textContent = 'Could not load data';
    el.cardDate.textContent = 'Check your internet connection.';
    el.cardTemp.textContent = '--°';
  } finally {
    el.cardLoading.classList.add('hidden');
  }
}

// ─── Render All ───────────────────────────────────────────
function renderAll() {
  renderCurrent();
  renderStats();
  renderDailyForecast();
  buildDaySelect();
  renderHourly(state.selectedDay);
}

// ─── Current Weather Card ─────────────────────────────────
function renderCurrent() {
  const cur = state.weatherData.current;
  const wmo = getWmo(cur.weather_code);

  el.cardCity.textContent = `${state.city}, ${state.country}`;

  // Use the API-returned current time if available, otherwise use local time
  const now = state.weatherData.current.time
    ? new Date(state.weatherData.current.time)
    : new Date();

  el.cardDate.textContent = now.toLocaleDateString('en-US', {
    weekday: 'long', month: 'short', day: 'numeric', year: 'numeric',
  });

  if (el.cardDesc) el.cardDesc.textContent = wmo.desc;

  // Day/Night icon swap
  const iconSrc = (cur.is_day === 0 && wmo.icon === 'icon-sunny.webp')
    ? 'icon-partly-cloudy.webp'
    : wmo.icon;
  el.cardIcon.src = `assets/images/${iconSrc}`;
  el.cardIcon.alt = wmo.desc;
  el.cardTemp.textContent = fmt.temp(cur.temperature_2m);
}

// ─── Stats Row ────────────────────────────────────────────
function renderStats() {
  const cur = state.weatherData.current;
  el.statFeels.textContent    = fmt.temp(cur.apparent_temperature);
  el.statHumidity.textContent = `${Math.round(cur.relative_humidity_2m)}%`;
  el.statWind.textContent     = fmt.wind(cur.wind_speed_10m, cur.wind_direction_10m);
  el.statPrecip.textContent   = fmt.precip(cur.precipitation);
}

// ─── Daily Forecast ───────────────────────────────────────
function renderDailyForecast() {
  const daily = state.weatherData.daily;
  el.dailyGrid.innerHTML = '';

  daily.time.forEach((dateStr, i) => {
    const date = new Date(dateStr + 'T12:00:00');
    const dayLabel = i === 0
      ? 'Today'
      : date.toLocaleDateString('en-US', { weekday: 'short' });
    const wmo = getWmo(daily.weather_code[i]);

    const card = document.createElement('div');
    card.className = 'daily-card';
    card.innerHTML = `
      <span class="daily-day">${dayLabel}</span>
      <img class="daily-icon" src="assets/images/${wmo.icon}" alt="${wmo.desc}" title="${wmo.desc}">
      <div class="daily-temps">
        <span class="daily-high">${fmt.temp(daily.temperature_2m_max[i])}</span>
        <span class="daily-low">${fmt.temp(daily.temperature_2m_min[i])}</span>
      </div>
    `;
    el.dailyGrid.appendChild(card);
  });
}

// ─── Day Select Dropdown ──────────────────────────────────
function buildDaySelect() {
  const daily = state.weatherData.daily;
  el.daySelect.innerHTML = '';

  daily.time.forEach((dateStr, i) => {
    const date = new Date(dateStr + 'T12:00:00');
    const label = i === 0
      ? 'Today'
      : date.toLocaleDateString('en-US', { weekday: 'long' });
    const opt = document.createElement('option');
    opt.value = i;
    opt.textContent = label;
    el.daySelect.appendChild(opt);
  });

  el.daySelect.value = state.selectedDay;
}

// ─── Hourly Forecast ──────────────────────────────────────
function renderHourly(dayIndex) {
  const daily  = state.weatherData.daily;
  const hourly = state.weatherData.hourly;

  const targetDate = daily.time[dayIndex]; // e.g. "2025-08-05"

  // Collect hourly slots for selected day
  const items = [];
  hourly.time.forEach((t, i) => {
    if (t.startsWith(targetDate)) {
      items.push({
        time:    t,
        temp:    hourly.temperature_2m[i],
        code:    hourly.weather_code[i],
        precip:  hourly.precipitation_probability[i],
      });
    }
  });

  el.hourlyList.innerHTML = '';

  // If showing today, start from current hour
  let startIdx = 0;
  if (dayIndex === 0) {
    const nowHour = new Date().getHours();
    startIdx = Math.max(0, items.findIndex(item => {
      return new Date(item.time).getHours() >= nowHour;
    }));
    if (startIdx < 0) startIdx = 0;
  }

  const displayItems = items.slice(startIdx);

  if (displayItems.length === 0) {
    el.hourlyList.innerHTML = '<p style="padding:1rem;color:var(--text-muted);font-size:0.85rem;">No data available.</p>';
    return;
  }

  displayItems.forEach(item => {
    const date  = new Date(item.time);
    const hour  = date.toLocaleTimeString('en-US', { hour: 'numeric', hour12: true });
    const wmo   = getWmo(item.code);

    const row = document.createElement('div');
    row.className = 'hourly-item';
    row.innerHTML = `
      <div class="hourly-left">
        <img class="hourly-icon" src="assets/images/${wmo.icon}" alt="${wmo.desc}">
        <span class="hourly-time">${hour}</span>
      </div>
      <span class="hourly-temp">${fmt.temp(item.temp)}</span>
    `;
    el.hourlyList.appendChild(row);
  });
}

// ─── Search & Autocomplete ────────────────────────────────
let searchTimer = null;

el.searchInput.addEventListener('input', () => {
  clearTimeout(searchTimer);
  const q = el.searchInput.value.trim();
  if (q.length < 2) { el.autocomplete.classList.add('hidden'); return; }
  searchTimer = setTimeout(() => fetchSuggestions(q), 380);
});

el.searchBtn.addEventListener('click', doSearch);
el.searchInput.addEventListener('keydown', e => {
  if (e.key === 'Enter') doSearch();
});

function doSearch() {
  const q = el.searchInput.value.trim();
  if (!q) return;
  fetchSuggestions(q, true);
}

async function fetchSuggestions(query, pickFirst = false) {
  try {
    const res  = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=6&language=en`
    );
    const data = await res.json();
    const results = data.results || [];

    if (pickFirst && results.length > 0) {
      chooseCity(results[0]);
      el.autocomplete.classList.add('hidden');
      return;
    }

    el.autocomplete.innerHTML = '';
    if (!results.length) { el.autocomplete.classList.add('hidden'); return; }

    results.forEach(r => {
      const row = document.createElement('div');
      row.className = 'autocomplete-item';
      row.textContent = [r.name, r.admin1, r.country].filter(Boolean).join(', ');
      row.addEventListener('click', () => {
        chooseCity(r);
        el.autocomplete.classList.add('hidden');
      });
      el.autocomplete.appendChild(row);
    });
    el.autocomplete.classList.remove('hidden');
  } catch (err) {
    console.error('Geocoding error:', err);
  }
}

function chooseCity(r) {
  state.lat     = r.latitude;
  state.lon     = r.longitude;
  state.city    = r.name;
  state.country = r.country || '';
  el.searchInput.value = r.name;
  fetchWeather();
}

// ─── Day Selector ─────────────────────────────────────────
el.daySelect.addEventListener('change', () => {
  state.selectedDay = parseInt(el.daySelect.value, 10);
  renderHourly(state.selectedDay);
});

// ─── Units Toggle ─────────────────────────────────────────
el.unitsBtn.addEventListener('click', e => {
  e.stopPropagation();
  const isHidden = el.unitsDropdown.classList.contains('hidden');
  el.unitsDropdown.classList.toggle('hidden', !isHidden);
  el.unitsBtn.classList.toggle('open', isHidden);
});

document.addEventListener('click', e => {
  if (!el.unitsDropdown.contains(e.target) && e.target !== el.unitsBtn) {
    el.unitsDropdown.classList.add('hidden');
    el.unitsBtn.classList.remove('open');
  }
  if (!el.autocomplete.contains(e.target) && e.target !== el.searchInput) {
    el.autocomplete.classList.add('hidden');
  }
});

document.querySelectorAll('.unit-pill').forEach(btn => {
  btn.addEventListener('click', () => {
    const type = btn.getAttribute('data-type');
    const val  = btn.getAttribute('data-val');
    state.units[type] = val;

    document.querySelectorAll(`.unit-pill[data-type="${type}"]`).forEach(b => {
      b.classList.toggle('active', b === btn);
    });

    if (state.weatherData) renderAll();
  });
});

// ─── Start App ────────────────────────────────────────────
fetchWeather();
