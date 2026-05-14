import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Activity, Server, Database, CloudRain, ArrowRight, CheckCircle2, ShieldAlert } from 'lucide-react';

function App() {
  const [city, setCity] = useState('');
  const [weather, setWeather] = useState(null);
  const [outfit, setOutfit] = useState(null);
  const [loading, setLoading] = useState(false);
  const [apiFlowActive, setApiFlowActive] = useState(false);
  const [logs, setLogs] = useState([]);
  const [backendStatus, setBackendStatus] = useState('Checking...');

  useEffect(() => {
    addLog('Frontend Container Started');
    checkBackendStatus();
    const interval = setInterval(checkBackendStatus, 10000);
    return () => clearInterval(interval);
  }, []);

  const addLog = (message) => {
    setLogs(prev => [...prev, { time: new Date().toLocaleTimeString(), msg: message }].slice(-5));
  };

  const checkBackendStatus = async () => {
    try {
      const res = await axios.get('http://localhost:8080/status');
      setBackendStatus('Running');
    } catch (e) {
      setBackendStatus('Disconnected');
    }
  };

  const handleFetchWeather = async (e) => {
    e.preventDefault();
    if(!city) return;
    
    setLoading(true);
    setApiFlowActive(true);
    addLog(`Initiating request for ${city}`);
    
    setTimeout(async () => {
      try {
        addLog('Frontend -> Backend: GET /weather');
        const weatherRes = await axios.get(`http://localhost:8080/weather?city=${city}`);
        setWeather(weatherRes.data);
        addLog('Backend -> Weather API: Fetching live data');
        
        setTimeout(async () => {
          addLog('Frontend -> Backend: POST /recommend');
          const outfitRes = await axios.post('http://localhost:8080/recommend', { city, style: 'Casual', occasion: 'Everyday' });
          setOutfit(outfitRes.data);
          addLog('Data successfully retrieved & processed');
          setLoading(false);
          setApiFlowActive(false);
        }, 1500);

      } catch (err) {
        addLog('Error: Backend communication failed. Check container status.');
        setLoading(false);
        setApiFlowActive(false);
      }
    }, 1000);
  };

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <header className="mb-10 text-center">
        <h1 className="text-4xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary mb-2">
          Dockerized Weather Outfit Platform
        </h1>
        <p className="text-gray-400">CI/CD Orchestration Demonstration</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: UI Forms & Results */}
        <div className="lg:col-span-1 space-y-6">
          <div className="glass-panel p-6">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <CloudRain className="text-primary" /> Weather Input
            </h2>
            <form onSubmit={handleFetchWeather} className="space-y-4">
              <div>
                <input 
                  type="text" 
                  placeholder="Enter City (e.g. London)" 
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                />
              </div>
              <button 
                type="submit" 
                disabled={loading}
                className="w-full bg-gradient-to-r from-primary to-blue-600 hover:from-blue-600 hover:to-primary text-white font-semibold py-2 rounded-lg transition-all"
              >
                {loading ? 'Processing via Backend...' : 'Get Recommendation'}
              </button>
            </form>
          </div>

          {weather && (
            <div className="glass-panel p-6 animate-fade-in">
              <h3 className="text-lg font-bold text-secondary mb-2">Live Conditions in {weather.city}</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="bg-slate-800 p-3 rounded">Temp: {weather.temperature}°C</div>
                <div className="bg-slate-800 p-3 rounded">Condition: {weather.condition}</div>
                <div className="bg-slate-800 p-3 rounded">Humidity: {weather.humidity}%</div>
                <div className="bg-slate-800 p-3 rounded">Wind: {weather.wind}km/h</div>
              </div>
            </div>
          )}

          {outfit && (
            <div className="glass-panel p-6 border-secondary/30">
              <h3 className="text-lg font-bold text-secondary mb-2">Outfit Recommendation</h3>
              <p className="text-sm text-gray-300 mb-4">{outfit.reasoning}</p>
              <ul className="list-disc pl-5 text-gray-200 space-y-1">
                {outfit.outfit.map((item, idx) => <li key={idx}>{item}</li>)}
              </ul>
            </div>
          )}
        </div>

        {/* Right Column: Docker & Architecture Visualization */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Docker Status Dashboard */}
          <div className="glass-panel p-6">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2 border-b border-white/10 pb-2">
              <Server className="text-blue-400" /> Docker Orchestration Status
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <StatusCard name="Frontend" status="Running" icon={<Activity size={18}/>} />
              <StatusCard name="Backend" status={backendStatus} icon={<Server size={18}/>} />
              <StatusCard name="Nginx" status="Running" icon={<Activity size={18}/>} />
              <StatusCard name="MySQL" status="Running" icon={<Database size={18}/>} />
              <StatusCard name="Redis" status="Running" icon={<Database size={18}/>} />
            </div>
          </div>

          {/* API Flow Visualization */}
          <div className="glass-panel p-6">
             <h2 className="text-xl font-bold mb-4 border-b border-white/10 pb-2">Microservice Communication</h2>
             <div className="flex items-center justify-between mt-8 relative">
                <div className="flex flex-col items-center z-10">
                  <div className="bg-slate-800 p-4 rounded-full border-2 border-primary mb-2">UI</div>
                  <span className="text-xs">React</span>
                </div>
                
                <div className="flex-1 relative h-1 mx-4 bg-slate-700">
                  {apiFlowActive && <div className="absolute top-0 left-0 h-full bg-secondary animate-[flow_1s_linear_infinite]" style={{width: '30%'}}></div>}
                </div>

                <div className="flex flex-col items-center z-10">
                  <div className={`bg-slate-800 p-4 rounded-full border-2 mb-2 transition-colors ${apiFlowActive ? 'border-secondary shadow-[0_0_15px_rgba(16,185,129,0.5)]' : 'border-gray-500'}`}>API</div>
                  <span className="text-xs">Spring Boot</span>
                </div>

                <div className="flex-1 relative h-1 mx-4 bg-slate-700">
                  {apiFlowActive && <div className="absolute top-0 left-0 h-full bg-blue-400 animate-[flow_1.5s_linear_infinite_0.5s]" style={{width: '30%'}}></div>}
                </div>

                <div className="flex flex-col items-center z-10">
                  <div className="bg-slate-800 p-4 rounded-full border-2 border-blue-400 mb-2">EXT</div>
                  <span className="text-xs">Weather API</span>
                </div>
             </div>
          </div>

          {/* Deployment Lifecycle Feed */}
          <div className="glass-panel p-6">
            <h2 className="text-xl font-bold mb-4 border-b border-white/10 pb-2">Live Deployment Logs</h2>
            <div className="bg-black/50 p-4 rounded font-mono text-sm h-48 overflow-y-auto space-y-2">
              {logs.map((log, i) => (
                <div key={i} className="text-green-400">
                  <span className="text-gray-500">[{log.time}]</span> {log.msg}
                </div>
              ))}
              {apiFlowActive && <div className="text-yellow-400 animate-pulse">... processing ...</div>}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

function StatusCard({ name, status, icon }) {
  const isRunning = status === 'Running';
  return (
    <div className={`bg-slate-800 p-3 rounded border-l-4 ${isRunning ? 'border-secondary' : 'border-red-500'} flex flex-col items-center text-center`}>
      <div className={`mb-2 ${isRunning ? 'text-secondary' : 'text-red-500'}`}>
        {isRunning ? <CheckCircle2 size={24} /> : <ShieldAlert size={24} />}
      </div>
      <div className="font-bold text-sm">{name}</div>
      <div className="text-xs text-gray-400 mt-1">{status}</div>
    </div>
  );
}

export default App;
