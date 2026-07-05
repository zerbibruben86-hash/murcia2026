import { useState, useEffect, useMemo, useContext } from "react";
import { AppContext } from "../context/AppContext";
import { IMG_POOL } from "../utils/helpers";
import { Hdr, Drawer } from "../components/Header";

const WMO = {
  0:{e:"☀️",l:"Ciel dégagé",s:"sunny"}, 1:{e:"🌤️",l:"Peu nuageux",s:"sunny"},
  2:{e:"⛅",l:"Partiellement nuageux",s:"cloudy"}, 3:{e:"☁️",l:"Couvert",s:"overcast"},
  45:{e:"🌫️",l:"Brouillard",s:"overcast"}, 48:{e:"🌫️",l:"Brouillard givrant",s:"overcast"},
  51:{e:"🌦️",l:"Bruine légère",s:"rainy"}, 53:{e:"🌦️",l:"Bruine modérée",s:"rainy"},
  55:{e:"🌧️",l:"Bruine dense",s:"rainy"}, 61:{e:"🌧️",l:"Pluie légère",s:"rainy"},
  63:{e:"🌧️",l:"Pluie modérée",s:"rainy"}, 65:{e:"🌧️",l:"Pluie forte",s:"rainy"},
  80:{e:"🌦️",l:"Averses légères",s:"rainy"}, 81:{e:"🌧️",l:"Averses",s:"rainy"},
  82:{e:"⛈️",l:"Averses violentes",s:"stormy"}, 95:{e:"⛈️",l:"Orage",s:"stormy"},
  96:{e:"⛈️",l:"Orage avec grêle",s:"stormy"}, 99:{e:"⛈️",l:"Orage violent",s:"stormy"},
};
const SKY = {
  sunny:"linear-gradient(185deg,#063972 0%,#1565C0 22%,#42A5F5 52%,#FFA726 80%,#E65100 100%)",
  cloudy:"linear-gradient(185deg,#1A2035 0%,#2D3F5A 40%,#4A6070 100%)",
  overcast:"linear-gradient(185deg,#141922 0%,#1F2D3D 50%,#2C3E50 100%)",
  rainy:"linear-gradient(185deg,#0a1628 0%,#1a304d 45%,#2d4a6a 100%)",
  stormy:"linear-gradient(185deg,#08090F 0%,#1a1030 55%,#2b1545 100%)",
};
const uvColor = v => v<=2?"#27AE60":v<=5?"#F1C40F":v<=7?"#E67E22":v<=10?"#E74C3C":"#8E44AD";
const uvLabel = v => v<=2?"Faible":v<=5?"Modéré":v<=7?"Élevé":v<=10?"Très élevé":"Extrême";
const DAYS = ["Dim","Lun","Mar","Mer","Jeu","Ven","Sam"];
const wmo = c => WMO[c] || WMO[0];

export default function WeatherPage() {
  useContext(AppContext);
  const [data, setData]     = useState(null);
  const [err, setErr]       = useState(false);
  const [selDay, setSelDay] = useState(0);

  useEffect(() => {
    fetch("https://api.open-meteo.com/v1/forecast?latitude=38.5533&longitude=-2.0715&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,uv_index,precipitation&hourly=temperature_2m,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,uv_index_max&timezone=Europe%2FMadrid&forecast_days=6")
      .then(r => r.json()).then(setData).catch(() => setErr(true));
  }, []);

  const cur = data?.current, daily = data?.daily, hourly = data?.hourly;
  const sky = cur ? wmo(cur.weather_code).s : "sunny";
  const bg  = SKY[sky];

  const hours = useMemo(() => {
    if (!hourly) return [];
    if (selDay === 0) {
      const now = new Date(), idx = hourly.time.findIndex(t => new Date(t) >= now);
      const s = Math.max(0, idx);
      return hourly.time.slice(s, s+12).map((t,i) => ({ time:new Date(t).getHours()+"h", tmp:Math.round(hourly.temperature_2m[s+i]), e:wmo(hourly.weather_code[s+i]).e }));
    }
    const dateStr = daily.time[selDay];
    return hourly.time.reduce((acc,t,i) => {
      if (t.startsWith(dateStr)) acc.push({ time:new Date(t).getHours()+"h", tmp:Math.round(hourly.temperature_2m[i]), e:wmo(hourly.weather_code[i]).e });
      return acc;
    }, []);
  }, [hourly, selDay, daily]);

  const HourlyCurve = () => {
    if (hours.length < 2) return null;
    const W=320, H=64, pad=16, temps=hours.map(h=>h.tmp);
    const mn=Math.min(...temps)-2, mx=Math.max(...temps)+2, range=mx-mn||1;
    const pts = temps.map((t,i) => [pad+(i/(temps.length-1))*(W-2*pad), H-pad-((t-mn)/range)*(H-2*pad)]);
    const path = pts.map((p,i) => i===0?`M${p[0].toFixed(1)},${p[1].toFixed(1)}`:`L${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
    const fill = path+` L${pts[pts.length-1][0]},${H} L${pts[0][0]},${H} Z`;
    return (
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width:"100%",display:"block",margin:"0 0 .25rem" }}>
        <defs><linearGradient id="wg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="rgba(255,210,80,.28)"/><stop offset="100%" stopColor="rgba(255,210,80,0)"/></linearGradient></defs>
        <path d={fill} fill="url(#wg)"/>
        <path d={path} fill="none" stroke="rgba(255,210,80,.75)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        {pts.map((p,i) => <text key={i} x={p[0]} y={p[1]-4} textAnchor="middle" fill="rgba(255,255,255,.65)" fontSize="7.5" fontFamily="Inter" fontWeight="600">{temps[i]}°</text>)}
      </svg>
    );
  };

  const selDayData = daily && selDay > 0 ? {
    w: wmo(daily.weather_code[selDay]),
    max: Math.round(daily.temperature_2m_max[selDay]),
    min: Math.round(daily.temperature_2m_min[selDay]),
    uv: daily.uv_index_max[selDay],
    rain: daily.precipitation_sum[selDay],
  } : null;

  return (
    <div style={{ position:"relative",minHeight:"100vh" }}>
      <img src={IMG_POOL} alt="" className="bg-img"/>
      <div style={{ position:"fixed",inset:0,background:bg,opacity:.82,zIndex:0,pointerEvents:"none" }}/>
      <Hdr/>
      <Drawer/>
      <div className="wthr-page" style={{ paddingBottom:"5rem" }}>
        <div className="wthr-hero">
          <div className="wthr-location">📍 Ayna · Albacete · Espagne</div>
          {!data && !err && <div className="wthr-loading">⏳ Chargement de la météo…</div>}
          {err && <div className="wthr-loading" style={{ color:"rgba(255,120,100,.7)" }}>Impossible de charger la météo</div>}
          {cur && selDay === 0 && <>
            <div className="wthr-ico-big">{wmo(cur.weather_code).e}</div>
            <div className="wthr-temp">{Math.round(cur.temperature_2m)}<span className="wthr-deg">°</span></div>
            <div className="wthr-cond">{wmo(cur.weather_code).l}</div>
            <div className="wthr-feels">Ressenti {Math.round(cur.apparent_temperature)}°C</div>
          </>}
          {selDayData && <>
            <div className="wthr-ico-big">{selDayData.w.e}</div>
            <div className="wthr-temp">{selDayData.max}<span className="wthr-deg">°</span></div>
            <div className="wthr-cond">{selDayData.w.l}</div>
            <div className="wthr-feels">Min {selDayData.min}° · Max {selDayData.max}°{selDayData.rain > 0.5 ? ` · 🌧️ ${selDayData.rain.toFixed(0)}mm` : ""}</div>
          </>}
        </div>

        {cur && <div className="wthr-body">
          {selDay === 0 && <div className="wthr-stats">
            {[
              {i:"💧",v:cur.relative_humidity_2m,u:"%",l:"Humidité"},
              {i:"💨",v:Math.round(cur.wind_speed_10m),u:"km/h",l:"Vent"},
              {i:"🌡️",v:(cur.precipitation||0).toFixed(1),u:"mm",l:"Précip."},
              {i:"🔆",v:Math.round(cur.uv_index),u:"/11",l:uvLabel(cur.uv_index),c:uvColor(cur.uv_index)},
            ].map((s,i) => (
              <div key={i} className="wthr-stat">
                <div className="wthr-stat-ico">{s.i}</div>
                <div className="wthr-stat-val" style={s.c?{color:s.c}:{}}>{s.v}<span className="wthr-stat-unit">{s.u}</span></div>
                <div className="wthr-stat-lbl">{s.l}</div>
              </div>
            ))}
          </div>}

          {selDay === 0 && <div className="wthr-glass" style={{ padding:".9rem 1rem .75rem" }}>
            <div className="wthr-glass-title">Indice UV · {Math.round(cur.uv_index)}/11 — {uvLabel(cur.uv_index)}</div>
            <div className="wthr-uv-bar">
              <div className="wthr-uv-cursor" style={{ left:`${Math.min(100,(cur.uv_index/11)*100)}%`,background:uvColor(cur.uv_index) }}/>
            </div>
            <div className="wthr-uv-row"><span>Faible</span><span>Modéré</span><span>Élevé</span><span>Extrême</span></div>
          </div>}

          {daily && <div className="wthr-glass">
            <div className="wthr-glass-title">Prévisions · 6 jours · Touche un jour</div>
            <div className="wthr-forecast">
              {daily.time.slice(0,6).map((date,i) => {
                const d = new Date(date), w = wmo(daily.weather_code[i]);
                return (
                  <div key={i} className={`wthr-day${i === selDay ? " active" : ""}`} onClick={() => setSelDay(i)}>
                    <div className="wthr-day-name">{i === 0 ? "Auj." : DAYS[d.getDay()]}</div>
                    <div className="wthr-day-ico">{w.e}</div>
                    {daily.precipitation_sum[i] > 0.5 && <div className="wthr-day-rain">{daily.precipitation_sum[i].toFixed(0)}mm</div>}
                    <div className="wthr-day-max">{Math.round(daily.temperature_2m_max[i])}°</div>
                    <div className="wthr-day-min">{Math.round(daily.temperature_2m_min[i])}°</div>
                  </div>
                );
              })}
            </div>
          </div>}

          {hours.length > 0 && <div className="wthr-glass">
            <div className="wthr-glass-title">{selDay === 0 ? "Prochaines 12 heures" : `Heures · ${DAYS[new Date(daily.time[selDay]).getDay()]}`}</div>
            <HourlyCurve/>
            <div className="wthr-hourly">
              {hours.map((h,i) => (
                <div key={i} className="wthr-hour">
                  <div className="wthr-hour-time">{h.time}</div>
                  <div className="wthr-hour-ico">{h.e}</div>
                  <div className="wthr-hour-tmp">{h.tmp}°</div>
                </div>
              ))}
            </div>
          </div>}

          <div className="wthr-source">Données · Open-Meteo.com · Mise à jour automatique</div>
        </div>}
      </div>
    </div>
  );
}
