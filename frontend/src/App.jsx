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
          offset: '1%', repeat: '50px', 
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
  
  // NUEVO: Estado para guardar la ubicación del usuario
  const [ubicacionUsuario, setUbicacionUsuario] = useState(null);

  // Referencia al mapa para poder moverlo
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

  // Función para volar hacia una ruta
  const volarARuta = (coordenadas) => {
    if (mapa && coordenadas.length > 0) {
      const bounds = L.latLngBounds(coordenadas);
      mapa.fitBounds(bounds, { padding: [50, 50] });
    }
  };

  // --- NUEVA FUNCIÓN: GPS ---
  const encontrarme = () => {
    if (!mapa) return;
    
    mapa.locate().on("locationfound", function (e) {
      setUbicacionUsuario(e.latlng); // Guardamos la posición
      mapa.flyTo(e.latlng, 15); // Volamos hacia ahí
    }).on("locationerror", function (e) {
      alert("No pudimos acceder a tu ubicación. Asegúrate de dar permisos.");
    });
  };

  return (
    <div className="app-container">
      <aside className="sidebar">
        <h2>Rutas Reynosa 🚌</h2>
        
        {/* Botón de GPS */}
        <button className="btn-gps" onClick={encontrarme}>
          📍 ¿Dónde estoy?
        </button>

        <input 
          type="text" 
          placeholder="Buscar ruta (ej. Juarez)..." 
          className="buscador"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />

        <div className="lista-rutas">
          {rutas
            .filter(ruta => ruta.nombre.toLowerCase().includes(busqueda.toLowerCase()))
            .map(ruta => (
            <div 
              key={ruta.id} 
              className={`ruta-fila ${resaltada === ruta.id ? 'activo' : ''}`}
              onMouseEnter={() => setResaltada(ruta.id)}
              onMouseLeave={() => setResaltada(null)}
            > 
              <label 
                className="ruta-item"
                onClick={() => volarARuta(ruta.coords)}
              >
                <span className="color-dot" style={{backgroundColor: ruta.color}}></span>
                {ruta.nombre}
              </label>
              
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
          
          {/* Marcador del Usuario (Punto Azul) */}
          {ubicacionUsuario && (
            <CircleMarker 
              center={ubicacionUsuario} 
              radius={8} 
              pathOptions={{color: 'white', fillColor: '#2980b9', fillOpacity: 1, weight: 3}}
            >
              <Popup>¡Estás aquí!</Popup>
            </CircleMarker>
          )}

          {rutas.filter(r => visibles[r.id]).map(ruta => {
             const esResaltada = resaltada === ruta.id;
             const grosor = esResaltada ? 8 : 5; 
             const opacidad = esResaltada ? 1 : 0.6;
 
             return (
               <React.Fragment key={ruta.id}>
                 <Polyline 
                   positions={ruta.coords} 
                   pathOptions={{ color: ruta.color, weight: grosor, opacity: opacidad, lineCap: 'round' }} 
                 />
                 <DecoradorFlechas puntos={ruta.coords} color="white" />
                 
                 {/* --- AQUÍ ESTÁ LA CORRECCIÓN DE LOS NOMBRES --- */}
                 <CircleMarker center={ruta.coords[0]} radius={6} pathOptions={{color:'white', fillColor:'#27ae60', fillOpacity:1}}>
                    <Popup>
                      <b>Inicio:</b><br/>{ruta.nombre}
                    </Popup>
                 </CircleMarker>

                 <CircleMarker center={ruta.coords[ruta.coords.length-1]} radius={6} pathOptions={{color:'white', fillColor:'#c0392b', fillOpacity:1}}>
                    <Popup>
                      <b>Fin:</b><br/>{ruta.nombre}
                    </Popup>
                 </CircleMarker>
               </React.Fragment>
             );
          })}
        </MapContainer>
      </main>
    </div>
  );
}

export default App;