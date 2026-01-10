import React, { useEffect, useState, useRef } from 'react'
import { MapContainer, TileLayer, Polyline, useMap, CircleMarker, Popup } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet-polylinedecorator'
import './App.css'

// --- Componente auxiliar para las flechas de dirección ---
const DecoradorFlechas = ({ puntos, color }) => {
  const map = useMap();
  const decoratorRef = useRef(null);

  useEffect(() => {
    if (puntos && puntos.length > 0) {
      decoratorRef.current = L.polylineDecorator(puntos, {
        patterns: [{ 
          offset: '1%', 
          repeat: '60px', // Repetimos las flechas cada 60px
          symbol: L.Symbol.arrowHead({
            pixelSize: 10, 
            polygon: false,
            pathOptions: { stroke: true, color: color, weight: 2, opacity: 0.7 }
          }) 
        }]
      }).addTo(map);
    }
    // Limpiamos al desmontar
    return () => { if (decoratorRef.current) map.removeLayer(decoratorRef.current); };
  }, [puntos, color, map]);

  return null;
};

function App() {
  const centroReynosa = [26.09, -98.28];
  
  // Estados de la aplicación
  const [rutas, setRutas] = useState([]);
  const [visibles, setVisibles] = useState({});
  const [resaltada, setResaltada] = useState(null);
  const [busqueda, setBusqueda] = useState(""); 
  const [ubicacionUsuario, setUbicacionUsuario] = useState(null);
  const [mapa, setMapa] = useState(null); 

  // --- Cargar datos al iniciar ---
  useEffect(() => {
    // Detecta si estamos en Local o en la Nube
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
    
    fetch(`${API_URL}/rutas`)
      .then(res => res.json())
      .then(data => {
        // Procesamos las coordenadas para Leaflet [lat, lng]
        const procesadas = data.map(r => ({ 
          ...r, 
          coords: JSON.parse(r.geojson).coordinates.map(c => [c[1], c[0]]) 
        }));
        setRutas(procesadas);
        
        // Activamos todas las rutas por defecto
        const inicial = {};
        procesadas.forEach(r => { inicial[r.id] = true; });
        setVisibles(inicial);
      });
  }, []);

  // --- Función: Hacer Zoom a una ruta ---
  const volarARuta = (coordenadas) => {
    if (mapa && coordenadas.length > 0) {
      const bounds = L.latLngBounds(coordenadas);
      mapa.fitBounds(bounds, { padding: [50, 50] });
    }
  };

  // --- Función: GPS Mejorado (Alta Precisión) ---
  const encontrarme = () => {
    if (!mapa) return;
    
    // Solicitamos ubicación con alta precisión
    mapa.locate({ 
      setView: true,      // Mover el mapa ahí automáticamente
      maxZoom: 16,        // Nivel de zoom al encontrar
      enableHighAccuracy: true // <--- ESTO ES LA CLAVE PARA QUE NO FALLE
    });

    mapa.once("locationfound", function (e) {
      setUbicacionUsuario(e.latlng);
      L.popup()
        .setLatLng(e.latlng)
        .setContent(`📍 Estás aquí`)
        .openOn(mapa);
    });

    mapa.once("locationerror", function (e) {
      alert("No pudimos encontrar tu ubicación. Asegúrate de activar el GPS en tu celular.");
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

        {/* Buscador */}
        <input 
          type="text" 
          placeholder="Buscar ruta (ej. Juarez)..." 
          className="buscador"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />

        {/* Lista de Rutas */}
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
              {/* Texto de la ruta (Clic para Zoom) */}
              <label 
                className="ruta-item"
                onClick={() => volarARuta(ruta.coords)}
              >
                <span className="color-dot" style={{backgroundColor: ruta.color}}></span>
                {ruta.nombre}
              </label>
              
              {/* Checkbox (Clic para ocultar/mostrar) */}
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
          
          {/* Marcador de Usuario (Punto Azul Brillante) */}
          {ubicacionUsuario && (
            <CircleMarker 
              center={ubicacionUsuario} 
              radius={8} 
              pathOptions={{color: 'white', fillColor: '#2980b9', fillOpacity: 1, weight: 3}}
            >
              <Popup>Tu ubicación actual</Popup>
            </CircleMarker>
          )}

          {/* Renderizado de Rutas */}
          {rutas.filter(r => visibles[r.id]).map(ruta => {
             const esResaltada = resaltada === ruta.id;
             const grosor = esResaltada ? 8 : 5; 
             const opacidad = esResaltada ? 1 : 0.6;
             const puntoInicio = ruta.coords[0];
             const puntoFin = ruta.coords[ruta.coords.length - 1];
 
             return (
               <React.Fragment key={ruta.id}>
                 {/* Línea Principal */}
                 <Polyline 
                   positions={ruta.coords} 
                   pathOptions={{ color: ruta.color, weight: grosor, opacity: opacidad, lineCap: 'round' }} 
                 />
                 
                 {/* Flechas de Dirección */}
                 <DecoradorFlechas puntos={ruta.coords} color="white" />
                 
                 {/* Marcador INICIO (Verde) con Nombre */}
                 <CircleMarker 
                    center={puntoInicio} 
                    radius={6} 
                    pathOptions={{color:'white', fillColor:'#27ae60', fillOpacity:1}}
                 >
                    <Popup>
                      <strong>Inicio:</strong><br/>{ruta.nombre}
                    </Popup>
                 </CircleMarker>

                 {/* Marcador FIN (Rojo) con Nombre */}
                 <CircleMarker 
                    center={puntoFin} 
                    radius={6} 
                    pathOptions={{color:'white', fillColor:'#c0392b', fillOpacity:1}}
                 >
                    <Popup>
                      <strong>Fin:</strong><br/>{ruta.nombre}
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