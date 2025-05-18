const apiKey = '4f1d1eb8ca5dbd42b6c0dbcc1e5ff055';
const weatherApi = {
    base: 'https://api.openweathermap.org/data/2.5/',
    units: 'metric',
    lang: 'ru'
};

const elements = {
    cityInput: document.getElementById('cityInput'),
    temperature: document.getElementById('temperature'),
    description: document.getElementById('description'),
    humidity: document.getElementById('humidity'),
    wind: document.getElementById('wind'),
    error: document.getElementById('error'),
    loading: document.getElementById('loading'),
    weatherIcon: document.getElementById('weatherIcon'),
    forecast: document.getElementById('forecast'),
    suggestions: document.getElementById('suggestions'),
    weatherInfo: document.getElementById('weatherInfo')
};

let debounceTimer;
let currentLang = 'ru';

const translations = {
    ru: {
        search: 'Поиск', enterCity: 'Введите город', humidity: 'Влажность', wind: 'Ветер', loading: 'Загрузка...', notFound: 'Город не найден', error: 'Ошибка при получении данных', noMatches: 'Нет совпадений', windUnit: 'м/с', days: ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб']
    },
    en: {
        search: 'Search', enterCity: 'Enter city', humidity: 'Humidity', wind: 'Wind', loading: 'Loading...', notFound: 'City not found', error: 'Error fetching data', noMatches: 'No matches', windUnit: 'm/s', days: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    }
};

function setLanguage(lang) {
    currentLang = lang;
    document.getElementById('searchBtn').textContent = translations[lang].search;
    elements.cityInput.placeholder = translations[lang].enterCity;
    elements.humidity.previousElementSibling.textContent = translations[lang].humidity;
    elements.wind.previousElementSibling.textContent = translations[lang].wind;
    elements.loading.textContent = translations[lang].loading;
}

document.getElementById('langSelect').addEventListener('change', e => {
    setLanguage(e.target.value);
    getWeather();
});

function countryFlagEmoji(code) {
    return code ? code.toUpperCase().replace(/./g, c => String.fromCodePoint(127397 + c.charCodeAt())) : '';
}

elements.cityInput.addEventListener('input', e => {
    clearTimeout(debounceTimer);
    const query = e.target.value.trim();
    if (query.length < 2) {
        elements.suggestions.innerHTML = '';
        elements.suggestions.style.display = 'none';
        return;
    }
    debounceTimer = setTimeout(() => fetchCitySuggestions(query), 300);
});

elements.suggestions.addEventListener('click', e => {
    const item = e.target.closest('.suggestion-item');
    if (item) {
        elements.cityInput.value = item.dataset.city;
        elements.suggestions.style.display = 'none';
        getWeather();
    }
});

document.addEventListener('click', e => {
    if (!e.target.closest('.search-box')) elements.suggestions.style.display = 'none';
});

elements.cityInput.addEventListener('keypress', e => {
    if (e.key === 'Enter') getWeather();
});

document.getElementById('mapBtn').addEventListener('click', async () => {
    const city = elements.cityInput.value.trim();
    if (!city) return;
    try {
        const resp = await fetch(`https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(city)}&limit=1&appid=${apiKey}`);
        const data = await resp.json();
        if (data && data[0]) showMapPanel({lat: data[0].lat, lon: data[0].lon});
    } catch {
        alert('Не удалось загрузить карту');
    }
});

document.getElementById('closeMapBtn').addEventListener('click', hideMapPanel);

function showMapPanel(coords) {
    const mapPanel = document.getElementById('mapPanel');
    const mapContainer = document.getElementById('mapContainer');
    mapPanel.classList.add('open');
    if (coords) {
        mapContainer.innerHTML = `<iframe width="100%" height="100%" frameborder="0" style="border:0;min-height:400px;" src="https://www.openstreetmap.org/export/embed.html?bbox=${coords.lon-0.05}%2C${coords.lat-0.05}%2C${coords.lon+0.05}%2C${coords.lat+0.05}&layer=mapnik&marker=${coords.lat}%2C${coords.lon}" allowfullscreen></iframe>`;
    }
}
function hideMapPanel() {
    document.getElementById('mapPanel').classList.remove('open');
}

async function fetchCitySuggestions(query) {
    try {
        const response = await fetch(`https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(query)}&limit=10&appid=${apiKey}`);
        const data = await response.json();
        if (Array.isArray(data) && data.length > 0) {
            elements.suggestions.innerHTML = data.map(city => `
                <div class="suggestion-item" data-city="${city.name}, ${city.country}">
                    ${city.name} ${countryFlagEmoji(city.country)}, ${city.country}
                </div>
            `).join('');
            elements.suggestions.style.display = 'block';
        } else {
            elements.suggestions.innerHTML = `<div class="suggestion-item">${translations[currentLang].noMatches}</div>`;
            elements.suggestions.style.display = 'block';
        }
    } catch {
        elements.suggestions.innerHTML = `<div class="suggestion-item">${translations[currentLang].error}</div>`;
        elements.suggestions.style.display = 'block';
    }
}

async function getWeather() {
    const city = elements.cityInput.value.trim();
    if (!city) {
        showError(translations[currentLang].enterCity);
        return;
    }
    showLoading();
    try {
        weatherApi.lang = currentLang;
        const [currentWeather, forecast] = await Promise.all([
            fetchWeather(city),
            fetchForecast(city)
        ]);
        updateWeatherUI(currentWeather);
        updateForecastUI(forecast);
        hideError();
    } catch {
        showError(translations[currentLang].error);
    } finally {
        hideLoading();
    }
}

async function fetchWeather(city) {
    const response = await fetch(`${weatherApi.base}weather?q=${city}&appid=${apiKey}&units=${weatherApi.units}&lang=${weatherApi.lang}`);
    const data = await response.json();
    if (data.cod === '404') throw new Error(translations[currentLang].notFound);
    return data;
}

async function fetchForecast(city) {
    const response = await fetch(`${weatherApi.base}forecast?q=${city}&appid=${apiKey}&units=${weatherApi.units}&lang=${weatherApi.lang}`);
    const data = await response.json();
    if (data.cod === '404') throw new Error(translations[currentLang].notFound);
    return data;
}

function updateWeatherUI(data) {
    elements.temperature.textContent = `${Math.round(data.main.temp)}°C`;
    elements.description.textContent = data.weather[0].description;
    elements.humidity.textContent = `${data.main.humidity}%`;
    elements.wind.textContent = `${data.wind.speed} ${translations[currentLang].windUnit}`;
    elements.weatherIcon.src = `https://openweathermap.org/img/wn/${data.weather[0].icon}@2x.png`;
}

function updateForecastUI(data) {
    const days = translations[currentLang].days;
    const dailyForecasts = data.list.filter(item => item.dt_txt.includes('12:00:00')).slice(0, 3);
    elements.forecast.innerHTML = dailyForecasts.map(forecast => {
        const date = new Date(forecast.dt * 1000);
        return `
            <div class="forecast-item">
                <div>${days[date.getDay()]}</div>
                <img src="https://openweathermap.org/img/wn/${forecast.weather[0].icon}.png" alt="weather icon">
                <div>${Math.round(forecast.main.temp)}°C</div>
            </div>
        `;
    }).join('');
}

function showError(message) {
    elements.error.textContent = message;
    elements.error.style.display = 'block';
}
function hideError() {
    elements.error.style.display = 'none';
}
function showLoading() {
    elements.loading.style.display = 'block';
    elements.weatherInfo.style.display = 'none';
}
function hideLoading() {
    elements.loading.style.display = 'none';
    elements.weatherInfo.style.display = 'block';
}

setLanguage(currentLang); 