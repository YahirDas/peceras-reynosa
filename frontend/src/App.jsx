import React, { useEffect, useState, useRef } from 'react'
import { MapContainer, TileLayer, Polyline, useMap, CircleMarker, Popup } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet-polylinedecorator'
import './App.css'

// --- Componente DecoradorFlechas (Sin cambios) ---
const DecoradorFlechas = ({ puntos, color }) => {
  const map = useMap();
  const decoratorRef = useRef(null);

  useEffect(() => {
    if (puntos && puntos.length > 0) {
      decoratorRef.current = L.polylineDecorator(puntos, {
        patterns: [{ 
          offset: '1%', repeat: '60px', 
          symbol: L.Symbol.arrowHead({
            pixelSize: 10, polygon: false,
            pathOptions: { stroke: true, color: color, weight: 2, opacity: 0.7 }
          }) 
        }]
      }).addTo(map);
    }
    return () => { if (decoratorRef.current) map.removeLayer(decoratorRef.current); };
  }, [puntos, color, map]);

  return null;
};

function App() {
  const centroReynosa = [26.09, -98.28];
  
  const [rutas, setRutas] = useState([]);
  const [visibles, setVisibles] = useState({});
  const [resaltada, setResaltada] = useState(null);
  const [busqueda, setBusqueda] = useState(""); 
  const [ubicacionUsuario, setUbicacionUsuario] = useState(null);
  const [mapa, setMapa] = useState(null); 

  useEffect(() => {
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
    
    fetch(`${API_URL}/rutas`)
      .then(res => res.json())
      .then(data => {
        const procesadas = data.map(r => ({ 
          ...r, 
          coords: JSON.parse(r.geojson).coordinates.map(c => [c[1], c[0]]) 
        }));
        setRutas(procesadas);
        const inicial = {};
        procesadas.forEach(r => { inicial[r.id] = true; });
        setVisibles(inicial);
      });
  }, []);

  const volarARuta = (coordenadas) => {
    if (mapa && coordenadas.length > 0) {
      const bounds = L.latLngBounds(coordenadas);
      mapa.fitBounds(bounds, { padding: [50, 50] });
    }
  };

  const encontrarme = () => {
    if (!mapa) return;
    mapa.locate({ setView: true, maxZoom: 16, enableHighAccuracy: true });
    mapa.once("locationfound", function (e) {
      setUbicacionUsuario(e.latlng);
      L.popup().setLatLng(e.latlng).setContent(`📍 Estás aquí`).openOn(mapa);
    });
    mapa.once("locationerror", function (e) {
      alert("No pudimos encontrar tu ubicación.");
    });
  };

  return (
    <div className="app-container">
      <aside className="sidebar">
        <h2>Rutas Reynosa 🚌</h2>
        
        <button className="btn-gps" onClick={encontrarme}>
          📍 ¿Dónde estoy?
        </button>

        <input 
          type="text" 
          placeholder="Buscar ruta, calle o lugar..." 
          className="buscador"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />

        <div className="lista-rutas">
          {rutas
            .filter(ruta => {
              // --- LÓGICA DE BÚSQUEDA PROFESIONAL ---
              const texto = busqueda.toLowerCase();
              return (
                ruta.nombre.toLowerCase().includes(texto) || 
                (ruta.descripcion && ruta.descripcion.toLowerCase().includes(texto))
              );
            })
            .map(ruta => (
            <div 
              key={ruta.id} 
              className={`ruta-fila ${resaltada === ruta.id ? 'activo' : ''}`}
              onMouseEnter={() => setResaltada(ruta.id)}
              onMouseLeave={() => setResaltada(null)}
            > 
              <div className="ruta-info-completa" onClick={() => volarARuta(ruta.coords)}>
                {/* Encabezado: Nombre y Color */}
                <div className="ruta-header">
                   <span className="color-dot" style={{backgroundColor: ruta.color}}></span>
                   <span className="ruta-nombre">{ruta.nombre}</span>
                </div>

                {/* --- NUEVO: Detalles de la Ruta --- */}
                <div className="ruta-detalles">
                  <span className="tag-info">💵 {ruta.costo || '$12.00'}</span>
                  <span className="tag-info">🕒 {ruta.horario || '5am-10pm'}</span>
                </div>
                {ruta.descripcion && (
                  <p className="ruta-desc">
                    🏢 <strong>Pasa por:</strong> {ruta.descripcion}
                  </p>
                )}
              </div>
              
              <input 
                type="checkbox" 
                className="checkbox-visible"
                checked={visibles[ruta.id] || false} 
                onChange={() => setVisibles({...visibles, [ruta.id]: !visibles[ruta.id]})}
              />
            </div>
          ))}
        </div>
      </aside>
      
      <main className="map-area">
        <MapContainer center={centroReynosa} zoom={13} style={{height: '100%'}} ref={setMapa}>
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          
          {ubicacionUsuario && (
            <CircleMarker center={ubicacionUsuario} radius={8} pathOptions={{color: 'white', fillColor: '#2980b9', fillOpacity: 1, weight: 3}}>
              <Popup>Tu ubicación actual</Popup>
            </CircleMarker>
          )}

          {rutas.filter(r => visibles[r.id]).map(ruta => (
             <React.Fragment key={ruta.id}>
                 <Polyline 
                   positions={ruta.coords} 
                   pathOptions={{ 
                     color: ruta.color, 
                     weight: resaltada === ruta.id ? 8 : 5, 
                     opacity: resaltada === ruta.id ? 1 : 0.6, 
                     lineCap: 'round' 
                   }} 
                 />
                 <DecoradorFlechas puntos={ruta.coords} color="white" />
                 
                 {/* Popups con más info */}
                 <CircleMarker center={ruta.coords[0]} radius={6} pathOptions={{color:'white', fillColor:'#27ae60', fillOpacity:1}}>
                    <Popup>
                      <strong>Inicio:</strong> {ruta.nombre}<br/>
                      💵 {ruta.costo}
                    </Popup>
                 </CircleMarker>

                 <CircleMarker center={ruta.coords[ruta.coords.length-1]} radius={6} pathOptions={{color:'white', fillColor:'#c0392b', fillOpacity:1}}>
                    <Popup><strong>Fin:</strong> {ruta.nombre}</Popup>
                 </CircleMarker>
             </React.Fragment>
          ))}
        </MapContainer>
      </main>
    </div>
  );
}

export default App;