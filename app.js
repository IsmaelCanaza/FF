// Inicialización de rutas y mapa
const rutas = {
    ruta1,
    ruta2
};

const map = L.map('map');
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
}).addTo(map);

let polylines = {};
let markers = [];

// Agregar formulario de búsqueda
document.querySelector('.controls').insertAdjacentHTML('beforeend', `
    <div class="route-finder">
        <input type="text" id="startStop" list="paraderosList" placeholder="Paradero inicial" class="search-box">
        <input type="text" id="endStop" list="paraderosList" placeholder="Paradero final" class="search-box">
        <button onclick="encontrarRuta()" class="toggle-map">Buscar Ruta</button>
    </div>
    <datalist id="paraderosList">
        ${Object.values(paraderos).map(p => `<option value="${p.nombre}">`).join('')}
    </datalist>
`);

// Estilos adicionales
const style = document.createElement('style');
style.textContent = `
    .route-finder {
        display: flex;
        gap: 10px;
        margin-top: 10px;
    }
    .route-result {
        margin-top: 15px;
        padding: 15px;
        background: #f0f9ff;
        border-radius: 4px;
        border-left: 4px solid #3b82f6;
    }
`;
document.head.appendChild(style);

// Implementación del algoritmo de Dijkstra
class Graph {
    constructor() {
        this.nodes = new Map();
    }

    addNode(paraderoNombre, ruta) {
        if (!this.nodes.has(paraderoNombre)) {
            this.nodes.set(paraderoNombre, { connections: new Map(), ruta });
        }
    }

    addConnection(from, to, weight, ruta) {
        if (!this.nodes.has(from)) this.addNode(from, ruta);
        if (!this.nodes.has(to)) this.addNode(to, ruta);

        const fromNode = this.nodes.get(from);
        fromNode.connections.set(to, { weight, ruta });
    }

    dijkstra(start, end) {
        const distances = new Map();
        const previous = new Map();
        const unvisited = new Set();

        this.nodes.forEach((_, node) => {
            distances.set(node, Infinity);
            unvisited.add(node);
        });
        distances.set(start, 0);

        while (unvisited.size > 0) {
            let current = null;
            let shortestDistance = Infinity;

            unvisited.forEach(node => {
                if (distances.get(node) < shortestDistance) {
                    shortestDistance = distances.get(node);
                    current = node;
                }
            });

            if (current === end) break;
            if (current === null) break;

            unvisited.delete(current);

            const currentNode = this.nodes.get(current);
            currentNode.connections.forEach((data, neighbor) => {
                const distance = distances.get(current) + data.weight;
                if (distance < distances.get(neighbor)) {
                    distances.set(neighbor, distance);
                    previous.set(neighbor, { node: current, ruta: data.ruta });
                }
            });
        }

        return this.reconstructPath(start, end, previous);
    }

    reconstructPath(start, end, previous) {
        const path = [];
        let current = end;

        while (current) {
            const prev = previous.get(current);
            if (!prev) {
                if (current !== start) return null;
                break;
            }
            path.unshift({
                from: prev.node,
                to: current,
                ruta: prev.ruta
            });
            current = prev.node;
        }

        return path;
    }
}

// Funciones de construcción del grafo
function construirGrafo() {
    const graph = new Graph();
    
    // Agregar conexiones dentro de la misma ruta
    Object.entries(rutas).forEach(([rutaId, ruta]) => {
        for (let i = 0; i < ruta.paraderos.length - 1; i++) {
            const paraderoActual = ruta.paraderos[i].nombre;
            const paraderoSiguiente = ruta.paraderos[i + 1].nombre;
            graph.addConnection(paraderoActual, paraderoSiguiente, 1, rutaId);
            graph.addConnection(paraderoSiguiente, paraderoActual, 1, rutaId);
        }
    });

    // Agregar conexiones entre rutas diferentes (transbordos)
    Object.entries(rutas).forEach(([rutaId1, ruta1]) => {
        Object.entries(rutas).forEach(([rutaId2, ruta2]) => {
            if (rutaId1 !== rutaId2) {
                ruta1.paraderos.forEach(p1 => {
                    ruta2.paraderos.forEach(p2 => {
                        if (p1.nombre === p2.nombre) {
                            // Peso 2 para transbordos en el mismo paradero
                            graph.addConnection(p1.nombre, p2.nombre, 2, rutaId2);
                        } else if (distanciaEntrePuntos(p1.coordenadas, p2.coordenadas) < 0.1) {
                            // Peso 3 para transbordos cercanos
                            graph.addConnection(p1.nombre, p2.nombre, 3, rutaId2);
                        }
                    });
                });
            }
        });
    });

    return graph;
}

function distanciaEntrePuntos(coord1, coord2) {
    const R = 6371;
    const lat1 = coord1[0] * Math.PI / 180;
    const lat2 = coord2[0] * Math.PI / 180;
    const deltaLat = (coord2[0] - coord1[0]) * Math.PI / 180;
    const deltaLon = (coord2[1] - coord1[1]) * Math.PI / 180;

    const a = Math.sin(deltaLat/2) * Math.sin(deltaLat/2) +
             Math.cos(lat1) * Math.cos(lat2) *
             Math.sin(deltaLon/2) * Math.sin(deltaLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}

// Funciones de manejo del mapa
function toggleMap() {
    const mapContainer = document.getElementById('mapContainer');
    const isActive = mapContainer.classList.toggle('active');
    const button = document.querySelector('.toggle-map');
    button.textContent = isActive ? 'Ocultar mapa' : 'Mostrar ruta en el mapa';
    if (isActive) map.invalidateSize();
}

function mostrarDetallesRuta(rutaId) {
    const container = document.getElementById('routeDetails');
    if (!rutaId) {
        container.innerHTML = '<div class="no-results">No se encontraron rutas</div>';
        return;
    }

    const ruta = rutas[rutaId];
    container.innerHTML = `
        <div class="route-card">
            <h2>${ruta.nombre}</h2>
            <p>${ruta.descripcion}</p>
            <p><strong>Frecuencia:</strong> ${ruta.frecuencia}</p>
            <p><strong>Precio:</strong> ${ruta.precio}</p>
            <h3>Paraderos:</h3>
            ${ruta.paraderos.map(p => `
                <div class="stop-info">
                    <strong>${p.nombre}</strong><br>
                    Horarios: ${p.horarios}
                </div>
            `).join('')}
        </div>
    `;
}

function crearIconoParadero() {
    return L.divIcon({
        html: '<div style="background-color: #333; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white;"></div>',
        className: 'paradero-icon',
        iconSize: [16, 16]
    });
}

function agregarParaderos(ruta) {
    ruta.paraderos.forEach(paradero => {
        const marker = L.marker(paradero.coordenadas, {
            icon: crearIconoParadero()
        }).addTo(map);
        
        marker.bindPopup(`
            <strong>${paradero.nombre}</strong><br>
            Ruta: ${ruta.nombre}<br>
            Horarios: ${paradero.horarios}
        `);
        
        markers.push(marker);
    });
}

function dibujarRuta(rutaId) {
    limpiarMapa();
    const ruta = rutas[rutaId];
    const polyline = L.polyline(ruta.puntos, {
        color: ruta.color,
        weight: 3
    }).addTo(map);
    
    agregarParaderos(ruta);
    polylines[rutaId] = polyline;
    
    const bounds = polyline.getBounds();
    const center = bounds.getCenter();
    map.setView(center, 12);
}

function limpiarMapa() {
    Object.values(polylines).forEach(polyline => map.removeLayer(polyline));
    markers.forEach(marker => map.removeLayer(marker));
    polylines = {};
    markers = [];
}

// Funciones de búsqueda y actualización
function buscarRuta(searchTerm) {
    if (!searchTerm) return 'ruta1';
    searchTerm = searchTerm.toLowerCase();
    return Object.keys(rutas).find(rutaId => {
        const ruta = rutas[rutaId];
        return ruta.nombre.toLowerCase().includes(searchTerm) || 
               ruta.descripcion.toLowerCase().includes(searchTerm) ||
               ruta.paraderos.some(p => p.nombre.toLowerCase().includes(searchTerm));
    });
}

function actualizarVista(rutaId) {
    mostrarDetallesRuta(rutaId);
    if (rutaId) {
        dibujarRuta(rutaId);
    } else {
        limpiarMapa();
    }
}

function encontrarRuta() {
    const inicio = document.getElementById('startStop').value;
    const fin = document.getElementById('endStop').value;
    
    const graph = construirGrafo();
    const ruta = graph.dijkstra(inicio, fin);
    
    if (!ruta) {
        document.getElementById('routeDetails').innerHTML = 
            '<div class="no-results">No se encontró ruta entre estos paraderos</div>';
        return;
    }

    mostrarRutaHibrida(ruta);
}

function mostrarRutaHibrida(ruta) {
    limpiarMapa();
    
    let rutaActual = '';
    let segmentos = [];
    let transbordo = false;
    
    ruta.forEach((segmento) => {
        if (rutaActual !== segmento.ruta) {
            if (rutaActual) transbordo = true;
            rutaActual = segmento.ruta;
            segmentos.push({
                ruta: rutas[segmento.ruta],
                tramo: [],
                paraderos: []
            });
        }
        
        const rutaActualObj = rutas[segmento.ruta];
        const paraderoInicio = encontrarParadero(segmento.from, segmento.ruta);
        const paraderoFin = encontrarParadero(segmento.to, segmento.ruta);
        
        if (!paraderoInicio || !paraderoFin) return;

        // Encontrar los índices exactos en los puntos de la ruta
        const puntosRuta = rutaActualObj.puntos;
        let inicioIndex = -1;
        let finIndex = -1;
        
        // Buscar los puntos más cercanos a los paraderos en la ruta
        for (let i = 0; i < puntosRuta.length; i++) {
            if (sonPuntosCercanos(puntosRuta[i], paraderoInicio.coordenadas)) {
                inicioIndex = i;
            }
            if (sonPuntosCercanos(puntosRuta[i], paraderoFin.coordenadas)) {
                finIndex = i;
            }
        }

        if (inicioIndex !== -1 && finIndex !== -1) {
            let puntosSegmento;
            if (inicioIndex <= finIndex) {
                puntosSegmento = puntosRuta.slice(inicioIndex, finIndex + 1);
            } else {
                puntosSegmento = puntosRuta.slice(finIndex, inicioIndex + 1).reverse();
            }

            segmentos[segmentos.length - 1].tramo.push(...puntosSegmento);
            segmentos[segmentos.length - 1].paraderos.push(
                { tipo: 'inicio', paradero: paraderoInicio },
                { tipo: 'fin', paradero: paraderoFin }
            );
        }
    });

    // Dibujar los segmentos
    segmentos.forEach((segmento, index) => {
        if (segmento.tramo.length > 0) {
            const polyline = L.polyline(segmento.tramo, {
                color: segmento.ruta.color,
                weight: 3,
                opacity: 0.8
            }).addTo(map);
            
            polylines[segmento.ruta.nombre] = polyline;

            // Agregar marcadores para los paraderos
            segmento.paraderos.forEach(({ tipo, paradero }) => {
                if (paradero) {
                    const isTransfer = index > 0 && tipo === 'inicio' || 
                                     index < segmentos.length - 1 && tipo === 'fin';
                    agregarMarcadorParadero(paradero, segmento.ruta.nombre, isTransfer);
                }
            });
        }
    });

    // Ajustar la vista del mapa
    if (segmentos.length > 0) {
        const todosLosPuntos = segmentos.flatMap(s => s.tramo);
        if (todosLosPuntos.length > 0) {
            const bounds = L.latLngBounds(todosLosPuntos);
            map.fitBounds(bounds, { padding: [50, 50] });
        }
    }

    mostrarDetallesRutaHibrida(ruta, transbordo);
}

function encontrarParadero(nombre, rutaId) {
    const ruta = rutas[rutaId];
    if (!ruta) return null;

    // Buscar primero en la ruta especificada
    const paradero = ruta.paraderos.find(p => p.nombre === nombre);
    if (paradero) return paradero;

    // Si no se encuentra, buscar en todas las rutas
    for (let id in rutas) {
        if (id === rutaId) continue;
        const otraRuta = rutas[id];
        const paraderoEncontrado = otraRuta.paraderos.find(p => p.nombre === nombre);
        if (paraderoEncontrado) return paraderoEncontrado;
    }
    
    return null;
}

function agregarMarcadorParadero(paradero, rutaNombre, isTransfer = false) {
    const icon = L.divIcon({
        html: `<div style="
            background-color: ${isTransfer ? '#ff4444' : '#333'};
            width: ${isTransfer ? '16px' : '12px'};
            height: ${isTransfer ? '16px' : '12px'};
            border-radius: 50%;
            border: 2px solid white;
        "></div>`,
        className: 'paradero-icon',
        iconSize: [isTransfer ? 20 : 16, isTransfer ? 20 : 16]
    });

    const marker = L.marker(paradero.coordenadas, { icon }).addTo(map);
    
    marker.bindPopup(`
        <strong>${paradero.nombre}</strong><br>
        Ruta: ${rutaNombre}<br>
        ${isTransfer ? '<strong>Punto de transbordo</strong><br>' : ''}
        Horarios: ${paradero.horarios}
    `);
    
    markers.push(marker);
}

function encontrarParaderosComunes(ruta1Id, ruta2Id) {
    const ruta1 = rutas[ruta1Id];
    const ruta2 = rutas[ruta2Id];
    
    const comunes = [];
    ruta1.paraderos.forEach(p1 => {
        const paraderoComun = ruta2.paraderos.find(p2 => p2.nombre === p1.nombre);
        if (paraderoComun) {
            comunes.push({
                nombre: p1.nombre,
                coordenadas: p1.coordenadas
            });
        }
    });
    
    return comunes;
}

function sonPuntosCercanos(punto1, punto2, tolerancia = 0.0001) {
    return Math.abs(punto1[0] - punto2[0]) < tolerancia && 
           Math.abs(punto1[1] - punto2[1]) < tolerancia;
}

function mostrarDetallesRutaHibrida(ruta, transbordo) {
    const container = document.getElementById('routeDetails');
    const paradas = ruta.length + 1;
    
    let html = `
        <div class="route-result">
            <h3>Ruta encontrada</h3>
            <p>De: ${ruta[0].from} a ${ruta[ruta.length - 1].to}</p>
            <p>Número de paradas: ${paradas}</p>
            ${transbordo ? '<p><strong>Requiere transbordo</strong></p>' : ''}
            <h4>Recorrido:</h4>
            <ol>
    `;

    ruta.forEach((segmento) => {
        html += `
            <li>
                De ${segmento.from} a ${segmento.to}
                <br>
                <small>Ruta: ${rutas[segmento.ruta].nombre}</small>
            </li>
        `;
    });

    html += `
            </ol>
        </div>
    `;

    container.innerHTML = html;
}

// Event Listeners
document.getElementById('searchInput').addEventListener('input', (e) => {
    const rutaEncontrada = buscarRuta(e.target.value);
    actualizarVista(rutaEncontrada);
    document.getElementById('rutaSelector').value = rutaEncontrada || 'todas';
});

document.getElementById('rutaSelector').addEventListener('change', (e) => {
    document.getElementById('searchInput').value = '';
    if (e.target.value === 'todas') {
        actualizarVista('ruta1');
    } else {
        actualizarVista(e.target.value);
    }
});

// Inicialización
actualizarVista('ruta1');