import { useState, useEffect } from "react";

interface WeatherData {
  city: string;
  temp: number;
  feelsLike: number;
  humidity: number;
  windSpeed: number;
  code: number;
  description: string;
}

const WMO_CODES: Record<number, { desc: string; icon: string }> = {
  0: { desc: "晴", icon: "sun" },
  1: { desc: "少云", icon: "sun-cloud" },
  2: { desc: "多云", icon: "cloud" },
  3: { desc: "阴", icon: "cloud" },
  45: { desc: "雾", icon: "fog" },
  48: { desc: "雾凇", icon: "fog" },
  51: { desc: "小毛毛雨", icon: "drizzle" },
  53: { desc: "毛毛雨", icon: "drizzle" },
  55: { desc: "大毛毛雨", icon: "drizzle" },
  61: { desc: "小雨", icon: "rain" },
  63: { desc: "中雨", icon: "rain" },
  65: { desc: "大雨", icon: "rain" },
  71: { desc: "小雪", icon: "snow" },
  73: { desc: "中雪", icon: "snow" },
  75: { desc: "大雪", icon: "snow" },
  80: { desc: "阵雨", icon: "rain" },
  81: { desc: "中阵雨", icon: "rain" },
  82: { desc: "大阵雨", icon: "rain" },
  85: { desc: "小阵雪", icon: "snow" },
  86: { desc: "大阵雪", icon: "snow" },
  95: { desc: "雷暴", icon: "thunder" },
  96: { desc: "雷暴+冰雹", icon: "thunder" },
  99: { desc: "雷暴+冰雹", icon: "thunder" },
};

function getWeatherDescription(code: number): string {
  return WMO_CODES[code]?.desc ?? "未知";
}

function getWeatherIcon(code: number): string {
  return WMO_CODES[code]?.icon ?? "cloud";
}

/**
 * Single fetch with per-service timeout.
 */
async function fetchGeoService(url: string): Promise<{ city: string; lat: number; lon: number } | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
    if (!res.ok) return null;
    const d = await res.json();
    // ip-api: {city, lat, lon}
    // ip.sb: {latitude, longitude, city}
    // ipapi.co: {city, latitude, longitude}
    // freeipapi: {cityName, latitude, longitude}
    // ipapi.is: {city, latitude, longitude}
    const city = d.city ?? d.cityName ?? d.region ?? "";
    const lat = parseFloat(d.lat ?? d.latitude);
    const lon = parseFloat(d.lon ?? d.longitude);
    if (city && !isNaN(lat) && !isNaN(lon)) {
      return { city: city.replace(/"/g, ""), lat, lon };
    }
    return null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Tauri Geolocation API via @tauri-apps/plugin-geolocation.
 * Works on desktop without browser permission prompts.
 */
async function tauriGeo(): Promise<{ city: string; lat: number; lon: number } | null> {
  try {
    const { coords } = await new Promise<{ coords: GeolocationPosition["coords"] }>((resolve, reject) => {
      // @ts-ignore — plugin exposes geolocation globally
      if (typeof navigator.geolocation?.getCurrentPosition === "function") {
        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 8000 });
      } else {
        reject(new Error("geolocation not available"));
      }
    });
    return {
      city: "当前位置",
      lat: coords.latitude,
      lon: coords.longitude,
    };
  } catch {
    return null;
  }
}

async function fetchGeo(): Promise<{ city: string; lat: number; lon: number }> {
  // 1. Tauri Geolocation API — system-level, no browser permission needed
  const tauriResult = await tauriGeo();
  if (tauriResult) return tauriResult;

  // 2. IP-based geo chain — diverse free services, each 8s timeout
  const services = [
    "https://ipapi.co/json/",
    "https://ip.sb/",
    "https://freeipapi.com/api/json/",
    "https://ipapi.is/json/",
    "https://ip-api.com/json/",
  ];

  for (const url of services) {
    const result = await fetchGeoService(url);
    if (result) return result;
  }

  // 3. All failed — default to Beijing
  return { city: "北京", lat: 39.9, lon: 116.4 };
}

function useWeather() {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      try {
        const geo = await fetchGeo();

        const wController = new AbortController();
        const wTimer = setTimeout(() => wController.abort(), 8000);
        let wRes: Response;
        try {
          wRes = await fetch(
            `https://api.open-meteo.com/v1/forecast?latitude=${geo.lat}&longitude=${geo.lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m&timezone=Asia/Shanghai`,
            { signal: wController.signal }
          );
        } finally {
          clearTimeout(wTimer);
        }
        if (!wRes.ok) throw new Error("Weather fetch failed");
        const wData = await wRes.json();

        if (!cancelled) {
          setWeather({
            city: geo.city,
            temp: Math.round(wData.current.temperature_2m),
            feelsLike: Math.round(wData.current.apparent_temperature),
            humidity: wData.current.relative_humidity_2m,
            windSpeed: wData.current.wind_speed_10m,
            code: wData.current.weather_code,
            description: getWeatherDescription(wData.current.weather_code),
          });
        }
      } catch {
        // silent fail — weather is non-critical
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    run();
    return () => { cancelled = true; };
  }, []);

  return { weather, loading };
}

function SunIcon() {
  return (
    <svg viewBox="0 0 64 64" className="weather-icon-svg">
      <circle cx="32" cy="32" r="10" fill="#FFD700" className="weather-sun-body" />
      {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
        <line
          key={deg}
          x1="32" y1="8" x2="32" y2="16"
          stroke="#FFD700" strokeWidth="2.5" strokeLinecap="round"
          transform={`rotate(${deg} 32 32)`}
          className="weather-sun-ray"
        />
      ))}
    </svg>
  );
}

function CloudIcon() {
  return (
    <svg viewBox="0 0 64 64" className="weather-icon-svg">
      <path
        d="M44 38c0-6.6-5.4-12-12-12a12 12 0 0 0-11.6 8.8A8 8 0 0 0 22 50h20a6 6 0 0 0 2-11.7V38z"
        fill="#B0B0B8"
        className="weather-cloud"
      />
    </svg>
  );
}

function SunCloudIcon() {
  return (
    <svg viewBox="0 0 64 64" className="weather-icon-svg">
      <circle cx="28" cy="22" r="8" fill="#FFD700" className="weather-sun-body" />
      {[0, 60, 120, 180, 240, 300].map((deg) => (
        <line
          key={deg}
          x1="28" y1="6" x2="28" y2="11"
          stroke="#FFD700" strokeWidth="2" strokeLinecap="round"
          transform={`rotate(${deg} 28 22)`}
          className="weather-sun-ray"
        />
      ))}
      <path
        d="M46 42c0-6.6-5.4-12-12-12a12 12 0 0 0-11.6 8.8A8 8 0 0 0 24 54h20a6 6 0 0 0 2-11.7V42z"
        fill="#B0B0B8"
        className="weather-cloud"
      />
    </svg>
  );
}

function RainIcon() {
  return (
    <svg viewBox="0 0 64 64" className="weather-icon-svg">
      <path
        d="M46 30c0-6.6-5.4-12-12-12a12 12 0 0 0-11.6 8.8A8 8 0 0 0 24 42h20a6 6 0 0 0 2-11.7V30z"
        fill="#8E8E93"
        className="weather-cloud"
      />
      {[20, 32, 44].map((x, i) => (
        <line
          key={i}
          x1={x} y1="44" x2={x - 4} y2="54"
          stroke="#5AC8FA" strokeWidth="1.8" strokeLinecap="round"
          className={`weather-rain-drop weather-rain-drop--${i}`}
        />
      ))}
    </svg>
  );
}

function SnowIcon() {
  return (
    <svg viewBox="0 0 64 64" className="weather-icon-svg">
      <path
        d="M46 30c0-6.6-5.4-12-12-12a12 12 0 0 0-11.6 8.8A8 8 0 0 0 24 42h20a6 6 0 0 0 2-11.7V30z"
        fill="#C7C7CC"
        className="weather-cloud"
      />
      {[20, 32, 44].map((x, i) => (
        <circle
          key={i}
          cx={x} cy={48 + i * 3}
          r="2"
          fill="#fff"
          className={`weather-snowflake weather-snowflake--${i}`}
        />
      ))}
    </svg>
  );
}

function FogIcon() {
  return (
    <svg viewBox="0 0 64 64" className="weather-icon-svg">
      {[20, 28, 36, 44].map((y, i) => (
        <line
          key={i}
          x1="12" y1={y} x2="52" y2={y}
          stroke="#B0B0B8" strokeWidth="3" strokeLinecap="round"
          className={`weather-fog-line weather-fog-line--${i}`}
        />
      ))}
    </svg>
  );
}

function ThunderIcon() {
  return (
    <svg viewBox="0 0 64 64" className="weather-icon-svg">
      <path
        d="M46 30c0-6.6-5.4-12-12-12a12 12 0 0 0-11.6 8.8A8 8 0 0 0 24 42h20a6 6 0 0 0 2-11.7V30z"
        fill="#636366"
        className="weather-cloud"
      />
      <polygon points="34,38 28,46 32,46 30,54 40,44 34,44 36,38" fill="#FFD700" className="weather-thunder" />
    </svg>
  );
}

function DrizzleIcon() {
  return (
    <svg viewBox="0 0 64 64" className="weather-icon-svg">
      <path
        d="M46 30c0-6.6-5.4-12-12-12a12 12 0 0 0-11.6 8.8A8 8 0 0 0 24 42h20a6 6 0 0 0 2-11.7V30z"
        fill="#8E8E93"
        className="weather-cloud"
      />
      {[24, 32, 40].map((x, i) => (
        <line
          key={i}
          x1={x} y1="44" x2={x - 2} y2="50"
          stroke="#5AC8FA" strokeWidth="1.2" strokeLinecap="round"
          className={`weather-drizzle-drop weather-drizzle-drop--${i}`}
        />
      ))}
    </svg>
  );
}

function WeatherIcon({ code }: { code: number }) {
  const icon = getWeatherIcon(code);
  switch (icon) {
    case "sun":
      return <SunIcon />;
    case "sun-cloud":
      return <SunCloudIcon />;
    case "cloud":
      return <CloudIcon />;
    case "rain":
      return <RainIcon />;
    case "drizzle":
      return <DrizzleIcon />;
    case "snow":
      return <SnowIcon />;
    case "fog":
      return <FogIcon />;
    case "thunder":
      return <ThunderIcon />;
    default:
      return <CloudIcon />;
  }
}

function TempDisplay({ temp, desc }: { temp: number | string; desc: string }) {
  const display = typeof temp === "number" ? `${temp}°` : temp;
  return (
    <div className="weather-temp-wrap">
      <span className="weather-temp">{display}</span>
      <span className="weather-desc">{desc}</span>
    </div>
  );
}

export default function WeatherWidget() {
  const { weather, loading } = useWeather();

  if (loading) {
    return <div className="weather-widget weather-widget--loading"><div className="spinner" /></div>;
  }

  // Fallback when fetch fails — show placeholder instead of disappearing
  const display = weather ?? { city: "未知", temp: "--", description: "", code: 3, feelsLike: 0, humidity: 0, windSpeed: 0 };

  return (
    <div className="weather-widget">
      <div className="weather-icon-wrap">
        <WeatherIcon code={display.code} />
      </div>
      <div className="weather-info">
        <div className="weather-city">{display.city}</div>
        <TempDisplay temp={display.temp} desc={display.description} />
      </div>
      <div className="weather-extras">
        <div className="weather-extra">
          <span className="weather-extra-label">体感</span>
          <span className="weather-extra-value">{display.feelsLike}°</span>
        </div>
        <div className="weather-extra">
          <span className="weather-extra-label">湿度</span>
          <span className="weather-extra-value">{display.humidity}%</span>
        </div>
        <div className="weather-extra">
          <span className="weather-extra-label">风速</span>
          <span className="weather-extra-value">{display.windSpeed} km/h</span>
        </div>
      </div>
    </div>
  );
}
