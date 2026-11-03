const locationButton = document.querySelector("#location-button");
const refreshButton = document.querySelector("#refresh-button");
const locationElement = document.querySelector("#location");
const messageElement = document.querySelector("#message");
const weatherIconElement = document.querySelector("#weather-icon");
const skyOrbElement = document.querySelector("#sky-orb");
let lastCoordinates;

function createSkyElements() {
  const stars = document.querySelector("#sky-stars");
  const precipitation = document.querySelector("#sky-precipitation");
  const sun = document.createElement("span");
  sun.className = "sky-sun";
  sun.setAttribute("aria-hidden", "true");
  const moon = document.createElement("canvas");
  moon.className = "sky-moon";
  moon.width = 160;
  moon.height = 160;
  moon.setAttribute("aria-hidden", "true");
  skyOrbElement.append(sun, moon);

  for (let index = 0; index < 110; index += 1) {
    const star = document.createElement("span");
    star.className = "star";
    star.style.setProperty("--star-x", `${Math.random() * 100}%`);
    star.style.setProperty("--star-y", `${Math.random() * 72}%`);
    star.style.setProperty("--star-size", `${Math.random() < 0.16 ? 3 : 1 + Math.random()}px`);
    star.style.setProperty("--star-duration", `${2 + Math.random() * 4}s`);
    star.style.setProperty("--star-delay", `${Math.random() * -6}s`);
    stars.append(star);
  }

  for (let index = 0; index < 48; index += 1) {
    const drop = document.createElement("span");
    drop.className = "rain-drop";
    drop.style.setProperty("--drop-x", `${Math.random() * 100}%`);
    drop.style.setProperty("--drop-delay", `${Math.random() * -1.5}s`);
    drop.style.setProperty("--drop-duration", `${0.65 + Math.random() * 0.7}s`);
    precipitation.append(drop);
  }

  for (let index = 0; index < 34; index += 1) {
    const flake = document.createElement("span");
    flake.className = "snow-flake";
    flake.style.setProperty("--flake-x", `${Math.random() * 100}%`);
    flake.style.setProperty("--flake-delay", `${Math.random() * -8}s`);
    flake.style.setProperty("--flake-duration", `${5 + Math.random() * 7}s`);
    precipitation.append(flake);
  }
}

function drawMoonPhase() {
  const moon = skyOrbElement.querySelector(".sky-moon");
  const context = moon.getContext("2d");
  const image = context.createImageData(moon.width, moon.height);
  const cycleLength = 29.530588853 * 24 * 60 * 60 * 1000;
  const knownNewMoon = Date.UTC(2000, 0, 6, 18, 14);
  const phase = ((Date.now() - knownNewMoon) / cycleLength % 1 + 1) % 1;
  const illuminated = (1 - Math.cos(phase * Math.PI * 2)) / 2;
  const waxing = phase < 0.5;
  const phaseName = phase < 0.035 || phase >= 0.965 ? "Luna nueva"
    : phase < 0.215 ? "Luna creciente"
      : phase < 0.285 ? "Cuarto creciente"
        : phase < 0.465 ? "Gibosa creciente"
          : phase < 0.535 ? "Luna llena"
            : phase < 0.715 ? "Gibosa menguante"
              : phase < 0.785 ? "Cuarto menguante"
                : "Luna menguante";
  const sunX = Math.sin(phase * Math.PI * 2);
  const sunZ = -Math.cos(phase * Math.PI * 2);
  const center = (moon.width - 1) / 2;
  const radius = moon.width * 0.43;

  for (let y = 0; y < moon.height; y += 1) {
    for (let x = 0; x < moon.width; x += 1) {
      const nx = (x - center) / radius;
      const ny = (y - center) / radius;
      const distance = nx * nx + ny * ny;
      if (distance > 1) continue;

      const normalZ = Math.sqrt(1 - distance);
      const light = Math.max(0, nx * sunX + normalZ * sunZ);
      const texture = 0.9 + 0.1 * Math.sin(x * 0.29 + y * 0.17) * Math.sin(y * 0.23);
      const brightness = Math.round((17 + light * 218) * texture);
      const pixel = (y * moon.width + x) * 4;
      image.data[pixel] = Math.min(255, brightness * 0.97);
      image.data[pixel + 1] = Math.min(255, brightness);
      image.data[pixel + 2] = Math.min(255, brightness * 1.08);
      image.data[pixel + 3] = 255;
    }
  }

  context.clearRect(0, 0, moon.width, moon.height);
  context.putImageData(image, 0, 0);
  moon.title = `${phaseName} · ${Math.round(illuminated * 100)} % iluminada`;
  moon.dataset.phase = waxing ? "waxing" : "waning";
  moon.style.visibility = illuminated < 0.025 ? "hidden" : "visible";
}

function getWeatherTheme(code) {
  if (code === 0 || code === 1) return "clear";
  if (code === 2) return "partly-cloudy";
  if (code === 3) return "cloudy";
  if (code === 45 || code === 48) return "fog";
  if (code >= 51 && code <= 67 || code >= 80 && code <= 82) return "rain";
  if (code >= 71 && code <= 77 || code === 85 || code === 86) return "snow";
  if (code >= 95 && code <= 99) return "storm";
  return "cloudy";
}

function getMinutesOfDay(dateTime) {
  const time = dateTime?.match(/T(\d{2}):(\d{2})/);
  return time ? Number(time[1]) * 60 + Number(time[2]) : null;
}

function getLocalDateTime(timezone) {
  const parts = new Intl.DateTimeFormat("en", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23"
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${values.year}-${values.month}-${values.day}T${values.hour}:${values.minute}`;
}

function getSunPosition(currentTime, sunriseTime, sunsetTime, isDay) {
  const current = getMinutesOfDay(currentTime);
  const sunrise = getMinutesOfDay(sunriseTime);
  const sunset = getMinutesOfDay(sunsetTime);

  if (current === null || sunrise === null || sunset === null) {
    const hour = current === null ? 12 : Math.floor(current / 60);
    const period = Number(isDay) === 0 ? "night"
      : hour < 8 ? "dawn"
        : hour < 11 ? "morning"
          : hour < 16 ? "noon"
            : hour < 19 ? "sunset"
              : "night";
    return {
      period,
      stars: period === "night" ? 1 : period === "dawn" ? 0.25 : 0,
      x: 50,
      y: 30,
      shadow: 0,
      shadowY: 16,
      isDay: Number(isDay) === 1
    };
  }

  const sunsetElapsed = current >= sunset ? current - sunset : current + 1440 - sunset;
  const sunriseRemaining = sunrise - current;
  const nightLength = 1440 - sunset + sunrise;
  const isDaytime = current >= sunrise && current < sunset;
  let period;
  let stars;
  let x;
  let y;
  let shadow;
  let shadowY;

  if (current < sunrise && sunriseRemaining <= 60) {
    period = "dawn";
    stars = sunriseRemaining / 60;
  } else if (current >= sunrise && current < sunrise + 50) {
    period = "dawn";
    stars = 0;
  } else if (current >= sunset && sunsetElapsed < 60) {
    period = "sunset";
    stars = sunsetElapsed / 60;
  } else if (current >= sunrise && current < sunset) {
    const daylightProgress = (current - sunrise) / (sunset - sunrise);
    period = current >= sunset - 90 ? "sunset" : daylightProgress < 0.25 ? "morning" : "noon";
    stars = 0;
  } else {
    period = "night";
    stars = 1;
  }

  if (isDaytime) {
    const progress = Math.max(0, Math.min(1, (current - sunrise) / (sunset - sunrise)));
    x = 8 + progress * 84;
    y = 72 - Math.sin(progress * Math.PI) * 60;
    shadow = (0.5 - progress) * 28;
    shadowY = 10 + (1 - Math.sin(progress * Math.PI)) * 24;
  } else {
    const progress = Math.max(0, Math.min(1, sunsetElapsed / nightLength));
    x = 92 - progress * 84;
    y = 72 - Math.sin(progress * Math.PI) * 52;
    shadow = 0;
    shadowY = 16;
  }

  return { period, stars, x, y, shadow, shadowY, isDay: isDaytime };
}

function applySkyTheme(weather) {
  const currentTime = getLocalDateTime(weather.timezone);
  const weatherTheme = getWeatherTheme(weather.current.weather_code);
  const reportedCloudCover = Number(weather.current.cloud_cover);
  const cloudCover = Number.isFinite(reportedCloudCover)
    ? reportedCloudCover
    : weatherTheme === "partly-cloudy" ? 55 : weatherTheme === "cloudy" ? 90 : 0;
  const cloudOpacity = weatherTheme === "clear" ? 0
    : weatherTheme === "partly-cloudy" ? Math.min(0.65, Math.max(0.25, cloudCover / 100))
      : weatherTheme === "cloudy" ? Math.min(0.92, Math.max(0.65, cloudCover / 100))
        : weatherTheme === "fog" ? 0.88
          : weatherTheme === "snow" ? 0.45
            : 0.96;
  const position = getSunPosition(
    currentTime,
    weather.daily.sunrise?.[0],
    weather.daily.sunset?.[0],
    weather.current.is_day
  );
  const moon = skyOrbElement.querySelector(".sky-moon");
  document.body.dataset.weather = weatherTheme;
  document.body.dataset.period = position.period;
  document.body.dataset.orb = position.isDay ? "sun" : "moon";
  document.body.style.setProperty("--cloud-opacity", cloudOpacity.toFixed(2));
  document.body.style.setProperty("--orb-x", `${position.x}%`);
  document.body.style.setProperty("--orb-y", `${position.y}%`);
  document.body.style.setProperty("--stars-opacity", position.stars.toFixed(2));
  document.body.style.setProperty("--shadow-x", `${position.shadow.toFixed(1)}px`);
  document.body.style.setProperty("--shadow-y", `${position.shadowY.toFixed(1)}px`);
  document.body.style.setProperty("--light-x", `${position.x}%`);
  document.body.style.setProperty("--light-y", `${position.y}%`);
  moon.style.transform = Number(weather.latitude) < 0 ? "rotate(180deg)" : "none";
  document.querySelector('meta[name="theme-color"]').content =
    getComputedStyle(document.body).getPropertyValue("--sky-top").trim();
}

function initializeSkyTheme() {
  const hour = new Date().getHours();
  const minute = new Date().getMinutes();
  document.body.dataset.period = hour < 6 ? "night" : hour < 8 ? "dawn" : hour < 11 ? "morning" : hour < 16 ? "noon" : hour < 19 ? "sunset" : "night";
  document.body.dataset.orb = hour >= 6 && hour < 20 ? "sun" : "moon";
  const twilightProgress = hour < 6 ? 1 : hour === 6 ? Math.max(0, 1 - minute / 60) : 0;
  document.body.style.setProperty("--stars-opacity", String(twilightProgress));
  drawMoonPhase();
  document.querySelector('meta[name="theme-color"]').content =
    getComputedStyle(document.body).getPropertyValue("--sky-top").trim();
}

const weatherDescriptions = {
  0: ["Despejado", "☀️"],
  1: ["Mayormente despejado", "🌤️"],
  2: ["Parcialmente nublado", "⛅"],
  3: ["Nublado", "☁️"],
  45: ["Niebla", "🌫️"],
  48: ["Niebla con escarcha", "🌫️"],
  51: ["Llovizna ligera", "🌦️"],
  53: ["Llovizna moderada", "🌦️"],
  55: ["Llovizna intensa", "🌧️"],
  56: ["Llovizna helada ligera", "🌧️"],
  57: ["Llovizna helada intensa", "🌧️"],
  61: ["Lluvia ligera", "🌦️"],
  63: ["Lluvia moderada", "🌧️"],
  65: ["Lluvia intensa", "🌧️"],
  66: ["Lluvia helada ligera", "🌧️"],
  67: ["Lluvia helada intensa", "🌧️"],
  71: ["Nevada ligera", "🌨️"],
  73: ["Nevada moderada", "🌨️"],
  75: ["Nevada intensa", "❄️"],
  77: ["Granos de nieve", "🌨️"],
  80: ["Chubascos ligeros", "🌦️"],
  81: ["Chubascos moderados", "🌧️"],
  82: ["Chubascos intensos", "⛈️"],
  85: ["Chubascos de nieve", "🌨️"],
  86: ["Chubascos fuertes de nieve", "❄️"],
  95: ["Tormenta", "⛈️"],
  96: ["Tormenta con granizo ligero", "⛈️"],
  99: ["Tormenta con granizo intenso", "⛈️"]
};

function describeWeather(code, isDay = 1) {
  const [description, icon] = weatherDescriptions[code] ?? ["Condición desconocida", "🌡️"];
  if (Number(isDay) === 0 && (code === 0 || code === 1)) {
    return [description, "🌙"];
  }
  if (Number(isDay) === 0 && code === 2) {
    return [description, "☁️"];
  }
  return [description, icon];
}

function setMessage(text, isError = false) {
  messageElement.textContent = text;
  messageElement.dataset.error = String(isError);
}

function formatTemperature(value) {
  return `${Math.round(value)}°`;
}

function renderForecast(daily) {
  const dateFormatter = new Intl.DateTimeFormat("es", {
    weekday: "short",
    timeZone: "UTC"
  });
  const forecastList = document.querySelector("#forecast-list");
  forecastList.replaceChildren();

  daily.time.forEach((date, index) => {
    const [description, icon] = describeWeather(daily.weather_code[index]);
    const day = document.createElement("div");
    day.className = "forecast-day";
    day.setAttribute("aria-label", `${description}, máxima ${formatTemperature(daily.temperature_2m_max[index])}, mínima ${formatTemperature(daily.temperature_2m_min[index])}`);

    const name = document.createElement("span");
    name.className = "forecast-name";
    name.textContent = index === 0 ? "Hoy" : dateFormatter.format(new Date(`${date}T12:00:00Z`)).replace(".", "");

    const symbol = document.createElement("span");
    symbol.className = "forecast-symbol";
    symbol.setAttribute("aria-hidden", "true");
    symbol.textContent = icon;

    const temperatures = document.createElement("span");
    temperatures.className = "forecast-temperatures";
    const high = document.createElement("span");
    high.textContent = formatTemperature(daily.temperature_2m_max[index]);
    const low = document.createElement("span");
    low.className = "forecast-low";
    low.textContent = formatTemperature(daily.temperature_2m_min[index]);
    temperatures.append(high, low);
    day.append(name, symbol, temperatures);
    forecastList.append(day);
  });
}

async function getLocationName(latitude, longitude) {
  const query = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    localityLanguage: "es"
  });
  const response = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?${query}`);
  if (!response.ok) {
    throw new Error("No se pudo encontrar el nombre de la zona.");
  }
  const place = await response.json();
  return [place.city || place.locality || place.principalSubdivision, place.countryName]
    .filter(Boolean)
    .join(", ");
}

async function loadWeather(latitude, longitude, accuracy) {
  locationButton.disabled = true;
  refreshButton.disabled = true;
  setMessage("Buscando el pronóstico para tus coordenadas…");
  locationElement.textContent = `Lat ${latitude.toFixed(5)}°, Lon ${longitude.toFixed(5)}°`;

  try {
    const query = new URLSearchParams({
      latitude: String(latitude),
      longitude: String(longitude),
      current: "temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,wind_speed_10m,cloud_cover",
      daily: "weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,sunrise,sunset",
      temperature_unit: "celsius",
      wind_speed_unit: "kmh",
      precipitation_unit: "mm",
      timezone: "auto",
      forecast_days: "5"
    });
    const weatherResponse = await fetch(`https://api.open-meteo.com/v1/forecast?${query}`);
    if (!weatherResponse.ok) {
      throw new Error("El servicio meteorológico no está disponible. Inténtalo de nuevo más tarde.");
    }

    const weather = await weatherResponse.json();
    if (!weather?.current?.time || !weather?.daily || !weather.timezone) {
      throw new Error("La respuesta del servicio meteorológico no contiene un pronóstico válido.");
    }

    latestWeather = weather;
    const [description, icon] = describeWeather(weather.current.weather_code, weather.current.is_day);
    applySkyTheme(weather);
    document.querySelector("#temperature").firstChild.textContent = Math.round(weather.current.temperature_2m);
    document.querySelector("#condition").textContent = description;
    weatherIconElement.textContent = icon;
    document.querySelector("#feels-like").textContent = formatTemperature(weather.current.apparent_temperature);
    document.querySelector("#humidity").textContent = `${weather.current.relative_humidity_2m}%`;
    document.querySelector("#wind").textContent = `${Math.round(weather.current.wind_speed_10m)} km/h`;
    document.querySelector("#rain").textContent = `${Number(weather.daily.precipitation_sum[0]).toLocaleString("es", { maximumFractionDigits: 1 })} mm`;
    renderForecast(weather.daily);
    document.querySelector("#updated-at").textContent = `Actualizado a las ${new Intl.DateTimeFormat("es", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: weather.timezone
    }).format(new Date())}`;
    refreshButton.disabled = false;

    const locationResult = await Promise.allSettled([getLocationName(latitude, longitude)]);
    if (locationResult[0].status === "fulfilled" && locationResult[0].value) {
      locationElement.textContent = locationResult[0].value;
    }
    setMessage(`Ubicación precisa del dispositivo (margen de error aproximado: ${Math.round(accuracy)} m).`);
  } catch (error) {
    setMessage(error instanceof Error ? error.message : "No se pudo cargar el pronóstico.", true);
  } finally {
    locationButton.disabled = false;
    refreshButton.disabled = !lastCoordinates;
  }
}

function requestLocation() {
  if (!("geolocation" in navigator)) {
    setMessage("Tu navegador no permite consultar la ubicación.", true);
    return;
  }

  locationButton.disabled = true;
  setMessage("Esperando permiso y buscando tu ubicación…");
  navigator.geolocation.getCurrentPosition(
    ({ coords }) => {
      lastCoordinates = {
        latitude: coords.latitude,
        longitude: coords.longitude,
        accuracy: coords.accuracy
      };
      loadWeather(coords.latitude, coords.longitude, coords.accuracy);
    },
    (error) => {
      const messages = {
        1: "No se concedió permiso para acceder a la ubicación. Puedes habilitarlo en los ajustes del navegador.",
        2: "No se pudo determinar tu ubicación. Comprueba la señal y vuelve a intentarlo.",
        3: "La búsqueda de ubicación tardó demasiado. Vuelve a intentarlo."
      };
      setMessage(messages[error.code] ?? "No se pudo acceder a la ubicación.", true);
      locationButton.disabled = false;
    },
    { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
  );
}

locationButton.addEventListener("click", requestLocation);
refreshButton.addEventListener("click", () => {
  if (lastCoordinates) {
    loadWeather(lastCoordinates.latitude, lastCoordinates.longitude, lastCoordinates.accuracy);
  }
});

createSkyElements();
initializeSkyTheme();
let latestWeather;
setInterval(() => {
  if (latestWeather) {
    applySkyTheme(latestWeather);
  }
}, 60 * 1000);
setInterval(drawMoonPhase, 60 * 60 * 1000);
setInterval(() => {
  if (lastCoordinates) {
    loadWeather(lastCoordinates.latitude, lastCoordinates.longitude, lastCoordinates.accuracy);
  }
}, 30 * 60 * 1000);
