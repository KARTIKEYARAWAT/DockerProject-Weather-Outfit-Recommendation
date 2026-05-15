import { useState, useEffect } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { CloudRain, MapPin, Search, Sun, CloudLightning, CloudSnow, Thermometer, Wind, Droplets, Maximize2, X, Settings, Moon, User, Activity } from 'lucide-react';
import { MapContainer, TileLayer, Marker, useMap, Tooltip } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Custom glowing purple marker
const customMarkerIcon = new L.divIcon({
  className: 'custom-icon',
  html: `<div class="w-3 h-3 bg-yellow-400 rounded-full shadow-[0_0_10px_rgba(250,204,21,1)] border-2 border-[#161618]"></div>`,
  iconSize: [12, 12],
  iconAnchor: [6, 6]
});

function MapUpdater({ center }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo(center, 4);
  }, [center, map]);
  return null;
}

const getWeatherIcon = (condition) => {
  if (!condition) return <Sun className="text-yellow-400" size={32} />;
  const c = condition.toLowerCase();
  if (c.includes('rain') || c.includes('drizzle')) return <CloudRain className="text-blue-400" size={32} />;
  if (c.includes('thunder')) return <CloudLightning className="text-yellow-500" size={32} />;
  if (c.includes('snow')) return <CloudSnow className="text-white" size={32} />;
  if (c.includes('cloud')) return <CloudRain className="text-gray-300" size={32} />;
  return <Sun className="text-yellow-400" size={32} />;
};

export default function App() {
  const [city, setCity] = useState('');
  const [weather, setWeather] = useState(null);
  const [outfit, setOutfit] = useState(null);
  const [loading, setLoading] = useState(false);
  const [mapCenter, setMapCenter] = useState([28.6139, 77.2090]); // New Delhi default
  const [markerPosition, setMarkerPosition] = useState(null);
  const [isMapExpanded, setIsMapExpanded] = useState(false);
  const [activeOutfitItem, setActiveOutfitItem] = useState(null);
  const [activeTab, setActiveTab] = useState('Next 7 days');
  const [activeMode, setActiveMode] = useState('Forecast');
  const [selectedWeather, setSelectedWeather] = useState(null);
  const [initialLoad, setInitialLoad] = useState(true);
  const [bootLog, setBootLog] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  useEffect(() => {
    const fullLog = [
      "[+] Running 5/5",
      " ✔ Network weather-outfit-platform_default       Created",
      " ✔ Container weather-outfit-platform-redis-1     Started",
      " ✔ Container weather-outfit-platform-mysql-1     Started",
      " ✔ Container weather-outfit-platform-backend-1   Started",
      " ✔ Container weather-outfit-platform-frontend-1  Started",
      "Attaching to backend-1, frontend-1",
      "backend-1  |  INFO 1 --- [main] c.w.BackendApplication  : Started BackendApplication in 2.124 seconds",
      "frontend-1 |  VITE v5.0.0  ready in 142 ms",
      "frontend-1 |  ➜  Local:   http://localhost:3000/"
    ];
    let index = 0;
    const interval = setInterval(() => {
      if (index < fullLog.length) {
        setBootLog(prev => [...prev, fullLog[index]]);
        index++;
      }
      if (index >= fullLog.length) {
        clearInterval(interval);
        setTimeout(() => {
          setInitialLoad(false);
          const lat = 28.6139;
          const lon = 77.2090;
          setMapCenter([lat, lon]);
          setMarkerPosition([lat, lon]);
          fetchWeather(lat, lon, 'New Delhi');
        }, 1800);
      }
    }, 220);
    return () => clearInterval(interval);
  }, []);

  const handleSelectWeather = async (label, temp, condition) => {
    setSelectedWeather({ label, temp, condition, humidity: null, wind: null });
    setOutfit(null); // Set loading state for outfit
    try {
      const outRes = await axios.post(`http://localhost:8080/recommend`, {
        city: weather?.city || city,
        temperature: temp?.toString(),
        condition: condition
      });
      setOutfit(outRes.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleLiveLocation = () => {
    if (!navigator.geolocation) return;
    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;
        setMapCenter([lat, lon]);
        setMarkerPosition([lat, lon]);
        
        let localName = "Your Location";
        try {
          const geoRes = await axios.get(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`);
          if (geoRes.data && geoRes.data.address) {
            localName = geoRes.data.address.city || geoRes.data.address.town || geoRes.data.address.village || geoRes.data.address.county || localName;
          }
        } catch(e) {
          console.error(e);
        }
        
        fetchWeather(lat, lon, localName);
      },
      () => setLoading(false)
    );
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!city) return;
    setLoading(true);
    try {
      const res = await axios.get(`http://localhost:8080/coordinates?city=${city}`);
      if (res.data.lat) {
        const coords = [res.data.lat, res.data.lon];
        setMapCenter(coords);
        setMarkerPosition(coords);
        fetchWeather(coords[0], coords[1], res.data.name);
      }
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const handleCityChange = async (e) => {
    const val = e.target.value;
    setCity(val);
    if (val.trim().length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    try {
      const res = await axios.get(`http://localhost:8080/search-cities?query=${val}`);
      setSuggestions(res.data || []);
      setShowSuggestions(true);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSelectSuggestion = (sugg) => {
    const cityName = sugg.name + (sugg.admin1 ? `, ${sugg.admin1}` : '') + (sugg.country ? `, ${sugg.country}` : '');
    setCity(cityName);
    setShowSuggestions(false);
    setMapCenter([sugg.latitude, sugg.longitude]);
    setMarkerPosition([sugg.latitude, sugg.longitude]);
    fetchWeather(sugg.latitude, sugg.longitude, sugg.name);
  };

  const fetchWeather = async (lat, lon, cityName = null) => {
    setLoading(true);
    try {
      const res = await axios.get(`http://localhost:8080/weather?lat=${lat}&lon=${lon}`);
      const data = res.data;
      if (cityName) data.current.city = cityName;
      setWeather(data);
      setSelectedWeather({
        label: 'Right Now',
        temp: data.current.temperature,
        condition: data.current.condition,
        humidity: data.current.humidity,
        wind: data.current.windSpeed
      });
      
      const outRes = await axios.post(`http://localhost:8080/recommend`, {
        city: data.current.city,
        temperature: data.current.temperature?.toString(),
        condition: data.current.condition
      });
      setOutfit(outRes.data);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  return (
    <div className="w-screen min-h-screen lg:h-screen overflow-y-auto lg:overflow-hidden bg-[#161618] font-sans text-white p-2 lg:p-6 flex items-start lg:items-center justify-center relative">
      
      {/* Initial Boot Loader */}
      <AnimatePresence>
        {initialLoad && (
          <motion.div 
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            transition={{ duration: 0.6, ease: "easeInOut" }}
            className="fixed inset-0 z-[1000] bg-[#0d1117] flex items-center justify-center p-6"
          >
            <div className="w-full max-w-3xl bg-[#0a0d12] border border-white/10 rounded-xl shadow-2xl overflow-hidden flex flex-col h-[500px]">
              {/* Terminal Header */}
              <div className="h-10 bg-[#1c1c1e] border-b border-white/5 flex items-center px-4 gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                <div className="flex-1 text-center text-xs text-white/40 font-mono tracking-widest uppercase">Initializing Platform</div>
              </div>
              {/* Terminal Body */}
              <div className="p-4 md:p-6 font-mono text-[11px] md:text-[13px] leading-relaxed overflow-y-auto flex-1 bg-[#090b10]">
                <div className="text-blue-500 mb-4 whitespace-pre font-bold leading-tight">
{`  ##         .
## ## ##        ==
 ## ## ## ## ##    ===
/"""""""""""""""""\\___/ ===
{                       /  ===-
\\______ O           __/
 \\    \\         __/
  \\____\\_______/`}
                </div>
                <div className="text-white font-bold text-sm md:text-lg mb-6 border-b border-white/10 pb-2 tracking-wide uppercase">
                  Weather Outfit Recommendation Platform
                </div>
                {bootLog.map((log, i) => {
                  if (!log) return null;
                  return (
                    <div key={i} className="mb-1 text-gray-300">
                      {log.startsWith(' ✔') ? (
                        <><span className="text-green-500 font-bold mr-1">✔</span>{log.substring(2)}</>
                      ) : log.startsWith('backend-1') ? (
                        <><span className="text-cyan-400 mr-2">backend-1  |</span>{log.substring(12)}</>
                      ) : log.startsWith('frontend-1') ? (
                        <><span className="text-blue-400 mr-2">frontend-1 |</span>{log.substring(12)}</>
                      ) : (
                        <span className={log.startsWith('[+]') ? "text-white font-bold" : "text-gray-300"}>{log}</span>
                      )}
                    </div>
                  );
                })}
                <div className="w-2 h-4 bg-gray-400 animate-pulse mt-1 inline-block"></div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Global Loader Overlay */}
      {loading && !initialLoad && (
        <div className="fixed inset-0 z-[999] bg-[#161618]/80 backdrop-blur-sm flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            <div className="text-white font-medium">Syncing Atmosphere...</div>
          </div>
        </div>
      )}

      <div className="w-full max-w-[1200px] h-auto lg:h-full lg:max-h-[800px] bg-[#1c1c1e] rounded-[24px] lg:rounded-[32px] p-4 lg:p-8 shadow-2xl flex flex-col gap-6 lg:gap-8 relative overflow-y-auto lg:overflow-hidden border border-white/5">
        
        {/* Header */}
        <header className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-4 w-full md:w-auto">
            <button className="bg-[#2a2a2c] p-2.5 rounded-full text-white/70 hover:text-white transition-colors">
              <CloudRain size={20} />
            </button>
            <span className="font-bold text-lg hidden lg:block tracking-wide">Weather Outfit Recommender</span>
            <button onClick={handleLiveLocation} className="bg-[#2a2a2c] p-2.5 rounded-full text-white/70 hover:text-white transition-colors lg:ml-4">
              <MapPin size={20} />
            </button>
            <div className="text-sm font-medium text-white/90">
              {weather ? weather.city : 'Select Location'}
            </div>
          </div>
          
          <div className="w-full md:flex-1 md:max-w-md md:mx-8 relative z-[200]">
            <form onSubmit={handleSearch} className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" size={16} />
              <input 
                type="text" 
                placeholder="Search city..." 
                value={city}
                onChange={handleCityChange}
                onFocus={() => { if(suggestions.length > 0) setShowSuggestions(true); }}
                className="w-full bg-[#2a2a2c] border-none rounded-full py-2.5 pl-12 pr-4 text-sm focus:outline-none focus:ring-1 focus:ring-white/20 text-white placeholder-white/40"
              />
            </form>
            {/* Autocomplete Dropdown */}
            <AnimatePresence>
              {showSuggestions && suggestions.length > 0 && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="absolute top-full mt-2 w-full bg-[#1c1c1e] border border-white/10 rounded-xl overflow-hidden shadow-2xl"
                >
                  {suggestions.map((sugg, i) => (
                    <div 
                      key={i} 
                      onClick={() => handleSelectSuggestion(sugg)}
                      className="px-4 py-3 hover:bg-[#2a2a2c] cursor-pointer transition-colors border-b border-white/5 last:border-b-0 flex items-center gap-3"
                    >
                      <MapPin size={14} className="text-blue-400" />
                      <div>
                        <div className="text-sm font-medium text-white">{sugg.name}</div>
                        <div className="text-xs text-white/50">{sugg.admin1 ? `${sugg.admin1}, ` : ''}{sugg.country}</div>
                      </div>
                    </div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto justify-end">
            <button className="bg-[#2a2a2c] p-2.5 rounded-full text-white/70 hover:text-white transition-colors">
              <Settings size={20} />
            </button>
            <button className="bg-[#e4e4e7] p-2.5 rounded-full text-[#1c1c1e] hover:bg-white transition-colors">
              <Moon size={20} />
            </button>
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-yellow-400 to-orange-500 flex items-center justify-center border-2 border-[#1c1c1e] flex-shrink-0">
              <User size={20} className="text-white" />
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <div className="flex flex-col lg:flex-row flex-1 gap-6 lg:gap-8 lg:min-h-0">
          
          {/* Left Column */}
          <div className="flex-1 flex flex-col gap-6">
            
            {/* Forecast Row */}
            <div className="flex flex-col gap-4 flex-shrink-0">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-3">
                <div className="flex gap-4 md:gap-6 text-sm md:text-base font-semibold cursor-pointer w-full md:w-auto overflow-x-auto hide-scrollbar pb-1 md:pb-0">
                  {['Today', 'Tomorrow', 'Next 7 days'].map(tab => (
                    <span 
                      key={tab} 
                      onClick={() => setActiveTab(tab)}
                      className={`transition-colors whitespace-nowrap ${activeTab === tab ? 'text-white' : 'text-white/40 hover:text-white/70'}`}
                    >
                      {tab}
                    </span>
                  ))}
                </div>
                <div className="flex bg-[#2a2a2c] rounded-full p-1 text-xs md:text-sm font-medium w-full md:w-auto">
                  <button 
                    onClick={() => setActiveMode('Forecast')}
                    className={`flex-1 md:flex-none ${activeMode === 'Forecast' ? 'bg-blue-100 text-blue-900' : 'text-white/60 hover:text-white'} px-4 py-1.5 rounded-full transition-colors`}
                  >
                    Forecast
                  </button>
                  <button 
                    onClick={() => setActiveMode('Air quality')}
                    className={`flex-1 md:flex-none ${activeMode === 'Air quality' ? 'bg-blue-100 text-blue-900' : 'text-white/60 hover:text-white'} px-4 py-1.5 rounded-full transition-colors`}
                  >
                    Air quality
                  </button>
                </div>
              </div>

              <div className="flex flex-col md:flex-row gap-3 h-auto md:h-[180px]">
                {/* Main Today Card */}
                <div className="w-full md:w-[220px] bg-gradient-to-br from-[#cbe5f6] to-[#e0f2fe] rounded-[24px] p-5 text-[#1e293b] flex flex-col justify-between relative overflow-hidden h-[180px] md:h-auto flex-shrink-0 transition-all border border-transparent">
                  <div className="flex justify-between items-start font-semibold">
                    <span>{selectedWeather ? selectedWeather.label : '---'}</span>
                  </div>
                  <div className="flex justify-between items-end">
                    <div className="text-6xl font-bold tracking-tighter">
                      {selectedWeather ? Math.round(selectedWeather.temp) : '--'}°
                    </div>
                    {getWeatherIcon(selectedWeather?.condition)}
                  </div>
                  <div className="grid grid-cols-2 gap-y-2 gap-x-1 text-[10px] font-medium opacity-80 mt-3">
                    <div className="flex items-center gap-1.5"><Wind size={12} className="text-blue-500" /> {selectedWeather?.wind ? selectedWeather.wind + ' km/h' : '--'}</div>
                    <div className="flex items-center gap-1.5">
                      <Sun size={12} className="text-orange-400" /> 
                      {weather?.current?.sunrise ? new Date(weather.current.sunrise * 1000).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '--'}
                    </div>
                    <div className="flex items-center gap-1.5"><Droplets size={12} className="text-cyan-500" /> {selectedWeather?.humidity ? selectedWeather.humidity + '%' : '--'}</div>
                    <div className="flex items-center gap-1.5">
                      <Moon size={12} className="text-purple-400" /> 
                      {weather?.current?.sunset ? new Date(weather.current.sunset * 1000).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '--'}
                    </div>
                  </div>
                </div>

                {/* Next Days Strip */}
                <div className="flex-1 flex gap-3 overflow-x-auto pb-2 md:pb-0 hide-scrollbar">
                  {activeMode === 'Air quality' ? (
                    <div className="flex-1 bg-[#25262b] rounded-[24px] p-4 flex flex-col items-center justify-center border border-green-500/20">
                      <Wind className="text-green-400 mb-3" size={40} />
                      <span className="text-white font-bold text-2xl">AQI: {weather?.aqi?.value !== undefined ? weather.aqi.value : '--'}</span>
                      <span className="text-green-400 text-base font-medium mt-1">{weather?.aqi?.label || '--'}</span>
                    </div>
                  ) : activeTab === 'Today' ? (
                    weather?.hourly ? weather.hourly.slice(0, 12).map((hour, i) => {
                      const timeStr = new Date(hour.time * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                      const label = `Today at ${timeStr}`;
                      const isSelected = selectedWeather?.label === label;
                      return (
                        <div 
                          key={i} 
                          onClick={() => handleSelectWeather(label, hour.temp || hour.temperature, hour.condition)}
                          className={`flex-1 rounded-[24px] p-4 flex flex-col items-center justify-between min-w-[70px] cursor-pointer transition-all border ${isSelected ? 'bg-blue-500/20 border-blue-400 shadow-[0_0_15px_rgba(96,165,250,0.4)]' : 'bg-[#25262b] border-transparent hover:border-white/10'}`}
                        >
                          <span className="text-white/70 text-sm font-medium">{timeStr}</span>
                          {getWeatherIcon(hour.condition)}
                          <span className="text-2xl font-bold">{Math.round(hour.temp)}°</span>
                        </div>
                      );
                    }) : [1,2,3,4,5].map(i => (
                      <div key={i} className="flex-1 bg-[#25262b] rounded-[24px] p-4 flex flex-col items-center justify-center opacity-50 min-w-[70px]">
                        <span className="text-white/30 text-sm">--</span>
                      </div>
                    ))
                  ) : activeTab === 'Tomorrow' ? (
                    weather?.hourly ? weather.hourly.slice(24, 36).map((hour, i) => {
                      const timeStr = new Date(hour.time * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                      const label = `Tomorrow at ${timeStr}`;
                      const isSelected = selectedWeather?.label === label;
                      return (
                        <div 
                          key={i} 
                          onClick={() => handleSelectWeather(label, hour.temp || hour.temperature, hour.condition)}
                          className={`flex-1 rounded-[24px] p-4 flex flex-col items-center justify-between min-w-[70px] cursor-pointer transition-all border ${isSelected ? 'bg-blue-500/20 border-blue-400 shadow-[0_0_15px_rgba(96,165,250,0.4)]' : 'bg-[#25262b] border-transparent hover:border-white/10'}`}
                        >
                          <span className="text-white/70 text-sm font-medium">{timeStr}</span>
                          {getWeatherIcon(hour.condition)}
                          <span className="text-2xl font-bold">{Math.round(hour.temp || hour.temperature)}°</span>
                        </div>
                      );
                    }) : [1,2,3,4,5].map(i => (
                      <div key={i} className="flex-1 bg-[#25262b] rounded-[24px] p-4 flex flex-col items-center justify-center opacity-50 min-w-[70px]">
                        <span className="text-white/30 text-sm">--</span>
                      </div>
                    ))
                  ) : (
                    weather?.daily?.map((day, i) => {
                      const dateObj = new Date(day.date * 1000);
                      const dayName = i === 0 ? 'Today' : dateObj.toLocaleDateString('en-US', { weekday: 'short' });
                      const isSelected = selectedWeather?.label === dayName;
                      return (
                        <div 
                          key={i} 
                          onClick={() => handleSelectWeather(dayName, day.maxTemp, day.condition)}
                          className={`flex-1 rounded-[24px] p-4 flex flex-col items-center justify-between min-w-[70px] cursor-pointer transition-all border ${isSelected ? 'bg-blue-500/20 border-blue-400 shadow-[0_0_15px_rgba(96,165,250,0.4)]' : 'bg-[#25262b] border-transparent hover:border-white/10'}`}
                        >
                          <span className="text-white/70 text-sm font-medium">{dayName}</span>
                          {getWeatherIcon(day.condition)}
                          <span className="text-2xl font-bold">{Math.round(day.maxTemp)}°</span>
                        </div>
                      );
                    }) || [1,2,3,4,5].map(i => (
                      <div key={i} className="flex-1 bg-[#25262b] rounded-[24px] p-4 flex flex-col items-center justify-center opacity-50 min-w-[70px]">
                        <span className="text-white/30 text-sm">--</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Map Area */}
            <div className="flex-1 flex flex-col gap-4 min-h-[300px] lg:min-h-0">
              <div className="flex justify-between items-center text-sm font-semibold">
                <span>Global map</span>
                <button onClick={() => setIsMapExpanded(true)} className="flex items-center gap-1 bg-[#2a2a2c] hover:bg-[#333336] px-3 py-1.5 rounded-full text-xs text-white/70 transition-colors">
                  View wide <Maximize2 size={12} />
                </button>
              </div>
              <div className="flex-1 bg-[#25262b] rounded-[24px] overflow-hidden relative border border-white/5 group">
                {/* Clickable Overlay to expand map */}
                <div 
                  className="absolute inset-0 z-[350] cursor-pointer" 
                  onClick={() => setIsMapExpanded(true)}
                ></div>
                <MapContainer center={mapCenter} zoom={3} zoomControl={false} attributionControl={false} style={{ height: '100%', width: '100%', background: '#1c1c1e' }}>
                  <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
                  <MapUpdater center={mapCenter} />
                  {markerPosition && (
                    <Marker position={markerPosition} icon={customMarkerIcon} />
                  )}
                </MapContainer>
                {/* Floating internal card */}
                {weather && (
                  <div className="absolute left-6 bottom-6 z-[400] w-[200px] bg-white rounded-[24px] p-5 shadow-2xl text-[#161618] opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none group-hover:pointer-events-auto">
                    <div className="text-xs font-semibold mb-3 leading-tight">Explore global map of wind, weather and oceans condition.</div>
                    <div className="w-full h-20 bg-gradient-to-r from-blue-200 to-blue-400 rounded-xl mb-3 overflow-hidden relative">
                      <div className="absolute inset-0 opacity-40 bg-black/10 mix-blend-overlay"></div>
                    </div>
                    <button onClick={() => setIsMapExpanded(true)} className="w-full bg-[#e9d5ff] text-purple-900 font-bold py-2 rounded-xl text-xs hover:bg-purple-300 transition-colors">
                      Get started
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Outfit Intelligence */}
          <div className="w-full lg:w-[320px] flex flex-col gap-6">
            <div className="text-lg font-semibold flex justify-between items-center">
              <span>Outfit Intelligence</span>
              <span className="text-sm text-white/40 cursor-pointer hover:text-white">Show All &gt;</span>
            </div>

            <div className="flex-1 flex flex-col gap-4 overflow-y-auto custom-scrollbar pr-2">
              {outfit ? (
                <>
                  <div className="bg-[#25262b] rounded-[24px] p-5 border border-white/5">
                    <p className="text-sm text-white/70 mb-5 leading-relaxed">{outfit.reasoning}</p>
                    <div className="flex flex-wrap gap-2">
                      {outfit.outfit.map((item, idx) => (
                        <button 
                          key={idx}
                          onMouseEnter={() => setActiveOutfitItem(idx)}
                          onMouseLeave={() => setActiveOutfitItem(null)}
                          className={`px-4 py-2 rounded-xl text-sm font-medium transition-all border ${
                            activeOutfitItem === idx ? 'bg-blue-500/20 border-blue-500/50 text-blue-200' : 'bg-[#1c1c1e] border-white/10 text-white/80'
                          }`}
                        >
                          {item}
                        </button>
                      ))}
                    </div>
                    
                    {/* Interactive Explanation Box */}
                    <AnimatePresence>
                      {activeOutfitItem !== null && (
                        <motion.div 
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="overflow-hidden mt-4"
                        >
                          <div className="bg-[#1c1c1e] rounded-xl p-4 text-sm text-white/70 border border-blue-500/20">
                            <strong>{outfit.outfit[activeOutfitItem]}:</strong> Crucial for {weather.current.condition.toLowerCase()} conditions when it&apos;s {Math.round(weather.current.temperature)}°C outside. Keeps you perfectly comfortable.
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                  
                  {/* Secondary outfit card (Dynamic Alternative) */}
                  {outfit.alternative && (
                    <div className="bg-[#25262b] rounded-[24px] p-5 border border-white/5 opacity-60 hover:opacity-100 transition-opacity cursor-pointer flex justify-between items-center">
                      <div>
                        <div className="text-xs text-white/50 mb-1">Alternative</div>
                        <div className="text-sm font-semibold">{outfit.alternative.title}</div>
                        <div className="text-xs mt-1 text-white/70">{outfit.alternative.desc}</div>
                      </div>
                      <div className="w-10 h-10 bg-[#1c1c1e] rounded-full flex items-center justify-center">
                        <Activity size={16} className="text-white/50" />
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="bg-[#25262b] rounded-[24px] p-5 h-[200px] flex items-center justify-center text-center text-white/30 text-sm border border-white/5">
                  {selectedWeather ? (
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                      <span>Generating AI styling...</span>
                    </div>
                  ) : (
                    "Fetch weather to generate AI styling."
                  )}
                </div>
              )}

              {/* Live Location Card */}
              <div 
                onClick={handleLiveLocation}
                className="mt-auto flex-shrink-0 bg-gradient-to-r from-blue-600/20 to-purple-600/20 hover:from-blue-600/40 hover:to-purple-600/40 rounded-[24px] p-5 border border-blue-500/30 transition-all cursor-pointer flex items-center justify-between group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-blue-500/20 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                    <MapPin size={18} className="text-blue-400" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-white">Use Live Location</div>
                    <div className="text-xs text-white/60 mt-0.5">Sync with global map</div>
                  </div>
                </div>
                <div className="w-2 h-2 rounded-full bg-blue-400 animate-ping"></div>
              </div>
            </div>
          </div>
          
        </div>
      </div>

      {/* Full Screen Map Modal */}
      <AnimatePresence>
        {isMapExpanded && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="fixed inset-0 z-[2000] bg-[#161618]/90 backdrop-blur-md p-6 flex items-center justify-center"
          >
            <div className="w-full h-full max-w-[1600px] bg-[#1c1c1e] rounded-[32px] overflow-hidden border border-white/10 relative shadow-2xl flex flex-col">
              
              {/* Modal Header */}
              <div className="h-16 flex items-center justify-between px-6 bg-[#25262b] border-b border-white/5 z-10 relative shadow-md">
                <div className="flex items-center gap-3">
                  <MapPin className="text-yellow-400" size={20} />
                  <span className="font-semibold text-lg">Interactive Global Radar</span>
                  {weather && <span className="text-white/40 text-sm ml-2">Currently analyzing: {weather.city}</span>}
                </div>
                <button 
                  onClick={() => setIsMapExpanded(false)}
                  className="p-2 hover:bg-white/10 rounded-full transition-colors text-white/60 hover:text-white"
                >
                  <X size={24} />
                </button>
              </div>

              {/* Huge Map Container */}
              <div className="flex-1 relative bg-[#0f172a]">
                <MapContainer center={mapCenter} zoom={6} zoomControl={true} attributionControl={false} style={{ height: '100%', width: '100%', background: 'transparent' }}>
                  <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
                  <MapUpdater center={mapCenter} />
                  {markerPosition && (
                    <Marker 
                      position={markerPosition} 
                      draggable={true}
                      icon={customMarkerIcon}
                      eventHandlers={{
                        dragend: (e) => {
                          const pos = e.target.getLatLng();
                          setMarkerPosition([pos.lat, pos.lng]);
                          fetchWeather(pos.lat, pos.lng);
                        }
                      }}
                    >
                      {weather && (
                        <Tooltip permanent direction="top" offset={[0, -10]} className="custom-tooltip">
                          <div className="bg-[#1c1c1e]/90 backdrop-blur-xl p-3 rounded-2xl border border-white/10 shadow-2xl flex flex-col items-center min-w-[120px]">
                            <div className="text-xs text-white/60 mb-1 font-medium">{weather.city}</div>
                            <div className="text-3xl font-bold text-white leading-none mb-1">{Math.round(weather.temperature)}°</div>
                            <div className="text-[10px] text-yellow-400 uppercase tracking-widest">{weather.condition}</div>
                          </div>
                        </Tooltip>
                      )}
                    </Marker>
                  )}
                </MapContainer>
                {/* Internal shadow overlay for the modal map */}
                <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_100px_rgba(28,28,30,1)] z-[400]"></div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Scrollbar CSS */}
      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 4px; }
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}} />
    </div>
  );
}
