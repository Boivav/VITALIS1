import React, { useState, useEffect } from "react";
import { createRoot } from "react-dom/client";
import {
  BrowserRouter,
  Routes,
  Route,
  NavLink,
  useNavigate,
} from "react-router-dom";
import {
  Activity,
  HeartPulse,
  Wind,
  Thermometer,
  Gauge,
  Bell,
  Bot,
  Cpu,
  FileText,
  Settings as SettingsIcon,
  LogOut,
  Menu,
  X,
  Wifi,
  Battery,
  Sparkles,
  ShieldCheck,
  MapPin,
  CloudSun,
  RefreshCw,
  Navigation,
  AlertTriangle,
  Droplets,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  AreaChart,
  Area,
} from "recharts";
import "./index.css";
const data = [
  { t: "06:00", hr: 69, spo2: 98, temp: 36.5, aq: 34, activity: 22 },
  { t: "09:00", hr: 74, spo2: 98, temp: 36.6, aq: 39, activity: 41 },
  { t: "12:00", hr: 81, spo2: 97, temp: 36.7, aq: 46, activity: 62 },
  { t: "15:00", hr: 78, spo2: 98, temp: 36.8, aq: 42, activity: 54 },
  { t: "18:00", hr: 72, spo2: 99, temp: 36.7, aq: 31, activity: 70 },
  { t: "21:00", hr: 76, spo2: 98, temp: 36.6, aq: 28, activity: 48 },
];

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";
const WEATHER_URL = (lat, lon) =>
  `${API_BASE}/environment/weather?latitude=${encodeURIComponent(lat)}&longitude=${encodeURIComponent(lon)}`;

function weatherLabel(code) {
  const m = {
    0: "Clear sky",
    1: "Mainly clear",
    2: "Partly cloudy",
    3: "Overcast",
    45: "Fog",
    48: "Rime fog",
    51: "Light drizzle",
    53: "Drizzle",
    55: "Dense drizzle",
    61: "Light rain",
    63: "Rain",
    65: "Heavy rain",
    71: "Light snow",
    73: "Snow",
    75: "Heavy snow",
    80: "Rain showers",
    81: "Rain showers",
    82: "Heavy rain showers",
    95: "Thunderstorm",
    96: "Thunderstorm with hail",
    99: "Thunderstorm with hail",
  };
  return m[code] || "Unknown conditions";
}
function riskFromWeather(w) {
  const risks = [];
  if (w.temperature >= 38)
    risks.push({
      title: "High heat",
      body: "High ambient temperature detected. Stay hydrated and avoid prolonged heat exposure.",
    });
  if (w.relative_humidity >= 80 && w.temperature >= 30)
    risks.push({
      title: "Heat + humidity",
      body: "High humidity may reduce the body’s ability to cool itself.",
    });
  if (w.precipitation >= 10)
    risks.push({
      title: "Heavy precipitation",
      body: "Significant precipitation is currently reported for this location.",
    });
  if (w.wind_speed >= 50)
    risks.push({
      title: "Strong winds",
      body: "Strong winds are currently reported. Check local official advisories.",
    });
  return risks;
}

function useLocationWeather() {
  const [location, setLocation] = useState(null),
    [weather, setWeather] = useState(null),
    [loading, setLoading] = useState(false),
    [error, setError] = useState(""),
    [lastUpdated, setLastUpdated] = useState(null);
  const load = () => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by this browser.");
      return;
    }
    setLoading(true);
    setError("");
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        setLocation({ latitude, longitude });
        try {
          let r = await fetch(WEATHER_URL(latitude, longitude));
          if (!r.ok) throw new Error("Backend weather request failed");
          const data = await r.json();
          setWeather(data);
          setLastUpdated(new Date());
          localStorage.setItem(
            "vitalis_weather",
            JSON.stringify({
              data,
              updatedAt: new Date().toISOString(),
              latitude,
              longitude,
            }),
          );
        } catch (e) {
          try {
            const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&forecast_days=5&timezone=auto`;
            const r = await fetch(url);
            if (!r.ok) throw new Error("Weather service unavailable");
            const x = await r.json();
            const data = {
              latitude,
              longitude,
              timezone: x.timezone,
              temperature: x.current.temperature_2m,
              relative_humidity: x.current.relative_humidity_2m,
              apparent_temperature: x.current.apparent_temperature,
              precipitation: x.current.precipitation,
              weather_code: x.current.weather_code,
              wind_speed: x.current.wind_speed_10m,
              daily: x.daily,
              source: "Open-Meteo fallback",
            };
            setWeather(data);
            setLastUpdated(new Date());
            localStorage.setItem(
              "vitalis_weather",
              JSON.stringify({
                data,
                updatedAt: new Date().toISOString(),
                latitude,
                longitude,
              }),
            );
          } catch (err) {
            setError(
              "Could not retrieve weather. Showing cached data if available.",
            );
          }
        } finally {
          setLoading(false);
        }
      },
      (err) => {
        setLoading(false);
        setError(err.message || "Location permission was denied.");
      },
    );
  };
  useEffect(() => {
    try {
      const c = JSON.parse(localStorage.getItem("vitalis_weather") || "null");
      if (c) {
        setLocation({ latitude: c.latitude, longitude: c.longitude });
        setWeather(c.data);
        setLastUpdated(new Date(c.updatedAt));
      }
    } catch {}
  }, []);
  return { location, weather, loading, error, lastUpdated, load };
}

function LocationWeatherCard() {
  const { location, weather, loading, error, lastUpdated, load } =
    useLocationWeather();
  const risks = weather ? riskFromWeather(weather) : [];
  return (
    <div className="card p-6 mt-5">
      <div className="flex flex-wrap justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <MapPin size={18} className="text-teal-500" />
            <h2 className="font-black">Local environment & weather</h2>
          </div>
          <p className="text-xs text-slate-400 mt-2">
            {location
              ? `GPS: ${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`
              : "Enable phone location to get local weather"}
          </p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="btn bg-slate-900 text-white flex items-center gap-2"
        >
          <RefreshCw size={15} />
          {loading ? "Updating..." : "Use my location"}
        </button>
      </div>
      {error && (
        <div className="mt-4 p-3 rounded-xl bg-amber-50 text-amber-700 text-sm">
          {error}
        </div>
      )}
      {weather && (
        <>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-6">
            <div className="bg-slate-50 rounded-xl p-4">
              <CloudSun className="text-teal-500" />
              <div className="text-xs text-slate-400 mt-3">
                Current condition
              </div>
              <div className="font-black mt-1">
                {weatherLabel(weather.weather_code)}
              </div>
            </div>
            <div className="bg-slate-50 rounded-xl p-4">
              <Thermometer className="text-teal-500" />
              <div className="text-xs text-slate-400 mt-3">Temperature</div>
              <div className="text-2xl font-black mt-1">
                {weather.temperature}°C
              </div>
              <div className="text-xs text-slate-400">
                Feels {weather.apparent_temperature}°C
              </div>
            </div>
            <div className="bg-slate-50 rounded-xl p-4">
              <Droplets className="text-teal-500" />
              <div className="text-xs text-slate-400 mt-3">Humidity</div>
              <div className="text-2xl font-black mt-1">
                {weather.relative_humidity}%
              </div>
            </div>
            <div className="bg-slate-50 rounded-xl p-4">
              <Wind className="text-teal-500" />
              <div className="text-xs text-slate-400 mt-3">Wind</div>
              <div className="text-2xl font-black mt-1">
                {weather.wind_speed} <span className="text-sm">km/h</span>
              </div>
            </div>
          </div>
          {risks.length > 0 && (
            <div className="mt-5">
              <div className="text-xs font-bold uppercase tracking-widest text-amber-600">
                Environmental alerts
              </div>
              <div className="grid md:grid-cols-2 gap-3 mt-3">
                {risks.map((r) => (
                  <div
                    className="rounded-xl bg-amber-50 border border-amber-100 p-4"
                    key={r.title}
                  >
                    <div className="flex gap-2 items-center font-black text-amber-800">
                      <AlertTriangle size={17} />
                      {r.title}
                    </div>
                    <p className="text-sm text-amber-700 mt-2">{r.body}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="text-[10px] text-slate-400 mt-5">
            Weather source: {weather.source || "VITALIS weather service"} ·
            Updated {lastUpdated ? lastUpdated.toLocaleTimeString() : ""}
          </div>
        </>
      )}
      {!weather && !loading && (
        <div className="mt-6 p-5 rounded-xl bg-slate-50 text-sm text-slate-500">
          Your phone GPS is used only to determine the location. Fresh weather
          information requires internet connectivity.
        </div>
      )}
    </div>
  );
}

function Environment() {
  return (
    <Layout>
      <div className="mb-7">
        <div className="text-xs text-teal-600 font-bold uppercase tracking-widest">
          Location intelligence
        </div>
        <h1 className="text-3xl md:text-4xl font-black mt-1">
          Environment & Weather
        </h1>
        <p className="text-slate-400 mt-2">
          Use your phone location to retrieve local weather and generate
          environmental warnings.
        </p>
      </div>
      <LocationWeatherCard />
      <div className="card p-6 mt-5">
        <div className="flex gap-2 items-center">
          <Navigation className="text-teal-500" />
          <h2 className="font-black">Disaster alerts</h2>
        </div>
        <p className="text-sm text-slate-500 mt-3">
          The architecture is ready for a location-based disaster-alert
          provider. Do not treat weather conditions generated by VITALIS as
          official emergency warnings; official local advisories should remain
          the authoritative source.
        </p>
        <div className="mt-4 text-xs text-slate-400">
          Provider status: not configured in this prototype.
        </div>
      </div>
    </Layout>
  );
}

function Layout({ children }) {
  const [o, setO] = useState(false),
    nav = useNavigate(),
    items = [
      ["/dashboard", "Overview", Activity],
      ["/environment", "Environment", CloudSun],
      ["/history", "Health History", HeartPulse],
      ["/devices", "Devices", Cpu],
      ["/insights", "AI Insights", Sparkles],
      ["/assistant", "VITALIS AI", Bot],
      ["/reports", "Reports", FileText],
      ["/settings", "Settings", SettingsIcon],
    ];
  return (
    <div className="min-h-screen flex bg-slate-50">
      <aside
        className={`${o ? "translate-x-0" : "-translate-x-full"} md:translate-x-0 fixed md:static z-30 w-64 h-screen bg-white border-r p-5 transition-transform`}
      >
        <div className="flex justify-between mb-8">
          <button onClick={() => nav("/dashboard")} className="text-left">
            <div className="text-2xl font-black">
              VITALIS<span className="text-teal-500">.</span>
            </div>
            <div className="text-[10px] tracking-[.25em] text-slate-400">
              AIoT HEALTH
            </div>
          </button>
          <button className="md:hidden" onClick={() => setO(false)}>
            <X size={20} />
          </button>
        </div>
        <div className="text-[11px] uppercase tracking-widest text-slate-400 mb-3">
          Workspace
        </div>
        <nav className="space-y-1">
          {items.map(([to, l, I]) => (
            <NavLink
              key={to}
              to={to}
              onClick={() => setO(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold ${isActive ? "bg-teal-50 text-teal-700" : "text-slate-500 hover:bg-slate-50"}`
              }
            >
              <I size={18} />
              {l}
            </NavLink>
          ))}
        </nav>
        <div className="card p-4 mt-8 bg-slate-900 text-white">
          <ShieldCheck size={19} className="text-teal-300" />
          <div className="font-bold text-sm mt-3">Wellness first</div>
          <p className="text-xs text-slate-300 leading-5">
            Monitoring and wellness, not medical diagnosis.
          </p>
        </div>
        <button
          onClick={() => nav("/")}
          className="mt-6 flex gap-2 items-center text-sm text-slate-400 px-3"
        >
          <LogOut size={16} />
          Exit demo
        </button>
      </aside>
      {o && (
        <div
          onClick={() => setO(false)}
          className="fixed inset-0 bg-slate-900/20 z-20 md:hidden"
        />
      )}
      <main className="flex-1 min-w-0">
        <header className="h-16 bg-white border-b flex items-center px-5 md:px-8">
          <button className="md:hidden" onClick={() => setO(true)}>
            <Menu />
          </button>
          <div className="hidden md:block text-sm text-slate-400">
            Friday, September 11 · Demo Mode
          </div>
          <div className="ml-auto flex items-center gap-4">
            <span className="text-xs font-bold text-teal-700 bg-teal-50 px-3 py-2 rounded-full">
              <Wifi size={14} className="inline mr-1" /> Device online
            </span>
            <Bell size={19} className="text-slate-500" />
            <div className="w-9 h-9 rounded-full bg-slate-900 text-white flex items-center justify-center text-sm font-bold">
              V
            </div>
          </div>
        </header>
        <div className="p-5 md:p-8 max-w-[1500px] mx-auto">{children}</div>
      </main>
    </div>
  );
}
function Landing() {
  let n = useNavigate();
  return (
    <div className="min-h-screen bg-white">
      <nav className="max-w-6xl mx-auto px-6 py-6 flex justify-between">
        <div>
          <div className="text-2xl font-black">
            VITALIS<span className="text-teal-500">.</span>
          </div>
          <div className="text-[9px] tracking-[.3em] text-slate-400">
            AIoT HEALTH COMPANION
          </div>
        </div>
        <button
          onClick={() => n("/dashboard")}
          className="btn bg-slate-900 text-white"
        >
          Open Demo
        </button>
      </nav>
      <section className="max-w-6xl mx-auto px-6 pt-20 pb-24 grid lg:grid-cols-2 gap-14 items-center">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-2 rounded-full bg-teal-50 text-teal-700 text-xs font-bold">
            <Sparkles size={14} />
            AI + IoT wellness monitoring
          </div>
          <h1 className="text-5xl md:text-7xl font-black tracking-tight mt-6 leading-[.98]">
            Understand your health.
            <br />
            <span className="text-teal-500">Act smarter.</span>
          </h1>
          <p className="text-lg text-slate-500 mt-7 max-w-xl leading-8">
            Connected sensor data, personal baselines, trends and AI-powered
            explanations in one simple companion.
          </p>
          <button
            onClick={() => n("/dashboard")}
            className="btn bg-teal-600 text-white mt-8 px-6"
          >
            Get started
          </button>
        </div>
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 md:p-8">
          <div className="flex items-center justify-between mb-10">
            <div>
              <div className="text-xl md:text-2xl font-black tracking-tight text-slate-900">
                LIVE WELLNESS SNAPSHOT
              </div>
              <b>Today</b>
            </div>
            <div className="flex items-center gap-2 px-5 py-3 rounded-full bg-teal-100 text-teal-700 font-bold text-sm">
              <Activity size={18} strokeWidth={2.5} />
              DEMO MODE
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[
              [HeartPulse, "Heart rate", "76 BPM"],
              [Wind, "SpO₂", "98 %"],
              [Thermometer, "Body temp", "36.7 °C"],
              [Gauge, "AQI", "28"],
            ].map(([I, a, b]) => (
              <div className="bg-white/5 rounded-2xl p-4" key={a}>
                <I size={18} className="text-teal-300" />
                <div className="text-xs text-slate-400 mt-4">{a}</div>
                <div className="text-2xl font-black">{b}</div>
              </div>
            ))}
          </div>
          <div className="mt-4 p-4 rounded-2xl bg-teal-500/10">
            <div className="text-xs text-teal-700 font-bold">VITALIS AI</div>
            <p className="text-sm text-slate-700 mt-1">
              Recent readings are broadly consistent with your personal
              baseline.
            </p>
          </div>
        </div>
      </section>
      <section className="bg-slate-50 py-20">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-xs font-bold tracking-widest text-teal-600">
            HOW IT WORKS
          </div>
          <h2 className="text-4xl font-black mt-2">
            Connect. Monitor. Understand. Improve.
          </h2>
          <div className="grid md:grid-cols-4 gap-4 mt-10">
            {[
              "Connect sensors",
              "Collect readings",
              "Understand trends",
              "Act on insights",
            ].map((x, i) => (
              <div className="card p-6" key={x}>
                <div className="text-3xl font-black text-slate-200">
                  0{i + 1}
                </div>
                <div className="font-bold mt-8">{x}</div>
                <p className="text-sm text-slate-500 mt-2">
                  A clear, human-friendly health data flow.
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
function Metric({ I, label, value, unit, sub }) {
  return (
    <div className="card p-5">
      <div className="flex justify-between">
        <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center">
          <I size={18} />
        </div>
        <span className="text-[10px] font-bold text-teal-600 bg-teal-50 px-2 py-1 rounded-full">
          STABLE
        </span>
      </div>
      <div className="text-sm text-slate-400 mt-5">{label}</div>
      <div className="mt-1">
        <span className="text-3xl font-black">{value}</span>{" "}
        <span className="text-sm text-slate-400">{unit}</span>
      </div>
      <div className="text-xs text-slate-400 mt-2">{sub}</div>
    </div>
  );
}
function Dashboard() {
  return (
    <Layout>
      <div className="mb-7">
        <div className="text-xs text-teal-600 font-bold uppercase tracking-widest">
          Good evening
        </div>
        <h1 className="text-3xl md:text-4xl font-black mt-1">
          Your health at a glance
        </h1>
        <p className="text-slate-400 mt-2">
          A calm view of your connected health signals, local environment and
          weather.
        </p>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <Metric
          I={HeartPulse}
          label="Heart rate"
          value="76"
          unit="BPM"
          sub="−3% vs yesterday"
        />
        <Metric
          I={Wind}
          label="SpO₂"
          value="98"
          unit="%"
          sub="+1% vs yesterday"
        />
        <Metric
          I={Thermometer}
          label="Body temperature"
          value="36.7"
          unit="°C"
          sub="Within baseline"
        />
        <Metric
          I={Gauge}
          label="Air quality"
          value="28"
          unit="AQI"
          sub="Good environment"
        />
        <Metric
          I={Activity}
          label="Activity"
          value="68"
          unit="%"
          sub="+12% vs yesterday"
        />
      </div>
      <LocationWeatherCard />
      <div className="grid lg:grid-cols-3 gap-5 mt-5">
        <div className="card p-6 lg:col-span-2">
          <div className="flex justify-between">
            <div>
              <h2 className="font-black">Heart rate trend</h2>
              <p className="text-xs text-slate-400">
                Today · personal baseline 72 BPM
              </p>
            </div>
            <b className="text-2xl">
              76 <small className="text-slate-400">BPM</small>
            </b>
          </div>
          <div className="h-64 mt-5">
            <ResponsiveContainer>
              <AreaChart data={data}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="t" />
                <YAxis domain={[60, 90]} />
                <Tooltip />
                <Area
                  type="monotone"
                  dataKey="hr"
                  strokeWidth={3}
                  fillOpacity={0.12}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="card p-6">
          <h2 className="font-black">Wellness score</h2>
          <div className="flex justify-center py-8">
            <div className="w-36 h-36 rounded-full border-[12px] border-teal-100 flex items-center justify-center">
              <div className="text-center">
                <div className="text-4xl font-black">82</div>
                <div className="text-[10px] text-slate-400">/ 100</div>
              </div>
            </div>
          </div>
          <p className="text-sm text-slate-500 text-center">
            Recent readings are consistent with your personal wellness baseline.
          </p>
          <div className="text-[10px] text-center text-slate-400 mt-4">
            Wellness indicator · not a diagnosis
          </div>
        </div>
      </div>
      <div className="grid lg:grid-cols-3 gap-5 mt-5">
        <div className="card p-6">
          <Sparkles className="text-teal-500" />
          <div className="text-xs text-teal-600 font-bold mt-4">AI INSIGHT</div>
          <h3 className="font-black mt-1">Personal baseline</h3>
          <p className="text-sm text-slate-500 leading-6 mt-3">
            Heart-rate readings are close to your recent baseline. More data
            makes the baseline more reliable.
          </p>
        </div>
        <div className="card p-6">
          <Wind className="text-teal-500" />
          <div className="text-xs text-slate-400 uppercase tracking-widest mt-4">
            Local environment
          </div>
          <div className="text-3xl font-black mt-2">
            28 <span className="text-sm text-slate-400">AQI</span>
          </div>
          <p className="text-sm text-slate-500 mt-2">
            Ambient temperature 28.4 °C · ESP32
          </p>
        </div>
        <div className="card p-6">
          <Cpu className="text-teal-500" />
          <div className="text-xs text-slate-400 uppercase tracking-widest mt-4">
            Device
          </div>
          <div className="font-black mt-2">ESP32 Health Monitor</div>
          <p className="text-xs text-slate-400 mt-2">
            MAX30102 · MAX30205 · AD8232 · BME280 · ENS160
          </p>
          <div className="text-sm text-teal-600 font-bold mt-4">
            ONLINE · 87% battery
          </div>
        </div>
      </div>
    </Layout>
  );
}

function History() {
  return (
    <Layout>
      <h1 className="text-3xl font-black">Health history</h1>
      <p className="text-slate-400 mt-2">
        Explore recent sensor measurements and trends.
      </p>
      <div className="grid lg:grid-cols-2 gap-5 mt-6">
        {[
          ["Heart rate", "hr", "BPM", 60, 90],
          ["SpO₂", "spo2", "%", 94, 100],
          ["Body temperature", "temp", "°C", 36, 37.5],
          ["Air quality", "aq", "AQI", 0, 80],
        ].map(([t, k, u, a, b]) => (
          <div className="card p-6" key={k}>
            <div className="flex justify-between">
              <h2 className="font-black">{t}</h2>
              <span className="text-xs text-slate-400">Today</span>
            </div>
            <div className="h-56 mt-5">
              <ResponsiveContainer>
                <LineChart data={data}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="t" />
                  <YAxis domain={[a, b]} />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey={k}
                    strokeWidth={3}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="text-xs text-slate-400">
              Average shown from demo data · unit: {u}
            </div>
          </div>
        ))}
      </div>
    </Layout>
  );
}
function Devices() {
  return (
    <Layout>
      <div className="flex justify-between">
        <div>
          <h1 className="text-3xl font-black">Devices</h1>
          <p className="text-slate-400 mt-2">
            Connected VITALIS hardware and sensors.
          </p>
        </div>
        <button className="btn bg-slate-900 text-white">+ Add device</button>
      </div>
      <div className="card p-6 mt-6">
        <div className="flex justify-between flex-wrap gap-4">
          <div className="flex gap-4">
            <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center">
              <Cpu />
            </div>
            <div>
              <h2 className="font-black">ESP32 Health Monitor</h2>
              <div className="text-sm text-slate-400">
                ESP32_001 · last data 12 seconds ago
              </div>
            </div>
          </div>
          <span className="text-teal-600 font-bold">
            <Wifi size={16} className="inline" /> Online
          </span>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3 mt-7">
          {[
            ["MAX30102", "Heart rate + SpO₂"],
            ["MAX30205", "Body temperature"],
            ["AD8232", "Electrical cardiac activity"],
            ["BME280", "Ambient temperature"],
            ["ENS160", "Air quality index"],
          ].map(([a, b]) => (
            <div className="bg-slate-50 rounded-xl p-4" key={a}>
              <b className="text-sm">{a}</b>
              <div className="text-xs text-slate-400 mt-2">{b}</div>
              <div className="text-[10px] text-teal-600 font-bold mt-3">
                CONNECTED
              </div>
            </div>
          ))}
        </div>
        <div className="mt-5 text-xs text-slate-400">
          <Battery size={14} className="inline" /> Lithium-ion battery · 87%
        </div>
      </div>
    </Layout>
  );
}
function Insights() {
  return (
    <Layout>
      <h1 className="text-3xl font-black">AI insights</h1>
      <p className="text-slate-400 mt-2">
        Explainable observations from your stored readings.
      </p>
      <div className="grid md:grid-cols-3 gap-5 mt-6">
        {[
          [
            "Personal baseline",
            "Heart-rate readings are close to your recent baseline.",
          ],
          ["Activity", "Activity is above your recent daily average."],
          ["Environment", "Current AQI is in a good range."],
        ].map(([a, b]) => (
          <div className="card p-6" key={a}>
            <Sparkles className="text-teal-500" />
            <h2 className="font-black mt-5">{a}</h2>
            <p className="text-sm text-slate-500 leading-6 mt-3">{b}</p>
            <button className="text-xs font-bold mt-5">View reasoning →</button>
          </div>
        ))}
      </div>
    </Layout>
  );
}
function Assistant() {
  const [m, setM] = useState([
      {
        r: "ai",
        t: "Hi. I’m VITALIS AI. Ask me about your recent health data, trends or wellness indicators.",
      },
    ]),
    [q, setQ] = useState("");
  const send = () => {
    if (!q.trim()) return;
    let x = q.toLowerCase(),
      a = x.includes("heart")
        ? "Your latest demo heart rate is 76 BPM, compared with a personal baseline around 72 BPM. This is a data summary, not a diagnosis."
        : x.includes("spo2") || x.includes("oxygen")
          ? "Your latest demo SpO₂ is 98%. This is a wellness-data summary, not a diagnosis."
          : "I can summarize heart rate, SpO₂, temperature, activity and environment trends. Ask a specific question.";
    setM((v) => [...v, { r: "u", t: q }, { r: "ai", t: a }]);
    setQ("");
  };
  return (
    <Layout>
      <div className="max-w-4xl">
        <h1 className="text-3xl font-black">VITALIS AI</h1>
        <p className="text-slate-400 mt-2">
          Ask questions about connected health data.
        </p>
        <div className="card mt-6 overflow-hidden">
          <div className="p-5 border-b flex gap-3">
            <Bot className="text-teal-500" />
            <div>
              <b>Health companion</b>
              <div className="text-xs text-slate-400">
                Data-grounded · Demo mode
              </div>
            </div>
          </div>
          <div className="p-5 space-y-4 min-h-[380px] bg-slate-50">
            {m.map((x, i) => (
              <div key={i} className={x.r === "u" ? "text-right" : ""}>
                <span
                  className={`inline-block max-w-[80%] rounded-2xl px-4 py-3 text-sm text-left ${x.r === "u" ? "bg-slate-900 text-white" : "bg-white"}`}
                >
                  {x.t}
                </span>
              </div>
            ))}
          </div>
          <div className="p-4 flex gap-2">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
              placeholder="e.g. How has my heart rate changed?"
              className="flex-1 rounded-xl bg-slate-50 px-4 py-3 outline-none"
            />
            <button onClick={send} className="btn bg-teal-600 text-white">
              Ask
            </button>
          </div>
        </div>
      </div>
    </Layout>
  );
}
function Reports() {
  return (
    <Layout>
      <h1 className="text-3xl font-black">Reports</h1>
      <p className="text-slate-400 mt-2">
        Wellness summaries for different periods.
      </p>
      <div className="grid md:grid-cols-3 gap-5 mt-6">
        {["Weekly report", "Monthly report", "Custom report"].map((x) => (
          <div className="card p-6" key={x}>
            <FileText className="text-teal-500" />
            <h2 className="font-black mt-5">{x}</h2>
            <p className="text-sm text-slate-500 mt-2">
              Averages, trends, activity and AI wellness summary.
            </p>
            <button className="btn bg-slate-900 text-white mt-5 w-full">
              Generate
            </button>
          </div>
        ))}
      </div>
      <div className="card p-6 mt-5 text-sm text-slate-500">
        <b>Disclaimer:</b> This report is for wellness monitoring and
        informational purposes only. It is not a medical diagnosis.
      </div>
    </Layout>
  );
}
function Settings() {
  return (
    <Layout>
      <h1 className="text-3xl font-black">Settings</h1>
      <p className="text-slate-400 mt-2">
        Manage your profile and preferences.
      </p>
      <div className="max-w-2xl card p-6 mt-6 space-y-5">
        {[
          ["Name", "VITALIS User"],
          ["Email", "demo@vitalis.app"],
          ["Height", "—"],
          ["Activity goal", "60 min / day"],
        ].map(([a, b]) => (
          <div key={a}>
            <label className="text-xs font-bold text-slate-500">{a}</label>
            <input
              defaultValue={b}
              className="w-full mt-2 rounded-xl bg-slate-50 px-4 py-3 outline-none"
            />
          </div>
        ))}
        <button className="btn bg-teal-600 text-white">Save preferences</button>
      </div>
    </Layout>
  );
}
function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/environment" element={<Environment />} />
      <Route path="/history" element={<History />} />
      <Route path="/devices" element={<Devices />} />
      <Route path="/insights" element={<Insights />} />
      <Route path="/assistant" element={<Assistant />} />
      <Route path="/reports" element={<Reports />} />
      <Route path="/settings" element={<Settings />} />
    </Routes>
  );
}
createRoot(document.getElementById("root")).render(
  <BrowserRouter>
    <App />
  </BrowserRouter>,
);
if ("serviceWorker" in navigator)
  window.addEventListener("load", () =>
    navigator.serviceWorker.register("/sw.js").catch(() => {}),
  );
