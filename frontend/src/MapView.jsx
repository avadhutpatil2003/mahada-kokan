import React, { useEffect, useRef } from 'react';
import L from 'leaflet';

// Land use color palette based on user specification
export const getLandUseColor = (plot) => {
  const landUse = (plot?.land_use || plot?.category || '').toLowerCase();
  const colorCode = (plot?.color_code || '').toLowerCase();

  if (landUse === 'road' || colorCode === 'gray') {
    return {
      fill: '#6b7280',   // Gray
      stroke: '#374151', // Dark Gray border
      name: 'Road'
    };
  }
  if (landUse.includes('public') || colorCode === 'red') {
    return {
      fill: '#ef4444',   // Red
      stroke: '#b91c1c', // Dark Red border
      name: 'Public-Semi Public'
    };
  }
  if (landUse.includes('open') || landUse.includes('garden') || colorCode === 'green') {
    return {
      fill: '#22c55e',   // Green
      stroke: '#15803d', // Dark Green border
      name: 'Open Space'
    };
  }
  // Default: Residential
  return {
    fill: '#facc15',   // Yellow
    stroke: '#ca8a04', // Dark Golden Yellow border
    name: 'Residential'
  };
};

export default function MapView({ plots = [], selectedPlot, onSelectPlot }) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const geojsonLayerRef = useRef(null);

  // Initialize Leaflet map safely once
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (mapInstanceRef.current) {
      try {
        mapInstanceRef.current.remove();
      } catch (e) {}
      mapInstanceRef.current = null;
    }

    if (mapContainerRef.current._leaflet_id) {
      delete mapContainerRef.current._leaflet_id;
    }

    try {
      const map = L.map(mapContainerRef.current, {
        center: [19.2229, 72.9685],
        zoom: 16,
        zoomControl: true
      });

      L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        maxZoom: 20
      }).addTo(map);

      mapInstanceRef.current = map;
    } catch (err) {
      console.error("Error creating Leaflet map:", err);
    }

    return () => {
      if (mapInstanceRef.current) {
        try {
          mapInstanceRef.current.remove();
        } catch (e) {}
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Render and update GeoJSON features whenever plots or selection changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (geojsonLayerRef.current) {
      try {
        map.removeLayer(geojsonLayerRef.current);
      } catch (e) {}
      geojsonLayerRef.current = null;
    }

    if (!Array.isArray(plots) || plots.length === 0) return;

    const features = [];
    plots.forEach(plot => {
      if (plot && plot.polygon_json) {
        try {
          const geometry = JSON.parse(plot.polygon_json);
          if (geometry && geometry.coordinates) {
            features.push({
              type: "Feature",
              id: plot.gid,
              properties: plot,
              geometry: geometry
            });
          }
        } catch (e) {
          console.error("Error parsing polygon_json for plot", plot.gid, e);
        }
      }
    });

    if (features.length === 0) return;

    const geojsonData = {
      type: "FeatureCollection",
      features: features
    };

    try {
      const layer = L.geoJSON(geojsonData, {
        style: (feature) => {
          const plot = feature?.properties || {};
          const isSelected = selectedPlot && selectedPlot.gid === plot.gid;
          const colorInfo = getLandUseColor(plot);
          
          return {
            color: isSelected ? '#0f172a' : colorInfo.stroke,
            fillColor: colorInfo.fill,
            fillOpacity: isSelected ? 0.95 : 0.65,
            weight: isSelected ? 3.5 : 1.2,
            dashArray: isSelected ? '4, 4' : ''
          };
        },
        onEachFeature: (feature, l) => {
          const plot = feature?.properties || {};
          const colorInfo = getLandUseColor(plot);

          l.on({
            mouseover: (e) => {
              const target = e.target;
              target.setStyle({ fillOpacity: 0.9, weight: 2.5 });
            },
            mouseout: (e) => {
              const target = e.target;
              const isSelected = selectedPlot && selectedPlot.gid === plot.gid;
              target.setStyle({
                fillOpacity: isSelected ? 0.95 : 0.65,
                weight: isSelected ? 3.5 : 1.2
              });
            },
            click: () => {
              if (onSelectPlot) onSelectPlot(plot);
            }
          });

          const occupantHtml = plot.occupant ? `<span>Occupant:</span> <strong>${plot.occupant}</strong>` : '';
          const areaHtml = plot.area_sqm > 0 ? `<span>Area:</span> <strong>${plot.area_sqm} m²</strong>` : '';

          l.bindPopup(`
            <div class="popup-content">
              <h4>Plot ${plot.plot_number || 'N/A'}</h4>
              <p class="popup-scheme">${plot.layout || 'Pawar Nagar Layout'}</p>
              <div class="popup-grid">
                <span>Land Use:</span> <strong style="color: ${colorInfo.fill}">${colorInfo.name}</strong>
                <span>District:</span> <strong>${plot.district || 'Thane'}</strong>
                <span>Tehsil:</span> <strong>${plot.tehsil || 'Thane'}</strong>
                <span>Ward:</span> <strong>${plot.ward || 'E'}</strong>
                ${areaHtml}
                ${occupantHtml}
              </div>
            </div>
          `, { className: 'custom-leaflet-popup' });
        }
      }).addTo(map);

      geojsonLayerRef.current = layer;

      // Auto-fit bounds of polygons if no specific plot is chosen
      if (!selectedPlot) {
        const bounds = layer.getBounds();
        if (bounds.isValid()) {
          map.fitBounds(bounds, { padding: [30, 30], maxZoom: 18 });
        }
      }
    } catch (err) {
      console.error("Error creating Leaflet GeoJSON layer:", err);
    }
  }, [plots, selectedPlot, onSelectPlot]);

  // Fly to selected plot centroid when chosen from dropdown or list
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !selectedPlot) return;

    if (selectedPlot.centroid_json) {
      try {
        const centroid = JSON.parse(selectedPlot.centroid_json);
        if (centroid && centroid.coordinates && centroid.coordinates.length >= 2) {
          const [lon, lat] = centroid.coordinates;
          map.flyTo([lat, lon], 19, {
            duration: 1.2,
            easeLinearity: 0.25
          });
        }
      } catch (e) {
        console.error("Error zooming to plot centroid:", e);
      }
    }
  }, [selectedPlot]);

  return (
    <div className="map-view-container" style={{ width: '100%', height: '100%', position: 'relative' }}>
      <div ref={mapContainerRef} style={{ width: '100%', height: '100%' }} />

      {/* Land Use Map Legend */}
      <div className="map-legend glass" style={{ minWidth: '180px' }}>
        <h4>Land Use Category</h4>
        <div className="legend-items">
          <div className="legend-item">
            <span className="dot" style={{ background: '#facc15', border: '1px solid #ca8a04' }}></span>
            <span>Residential (Yellow)</span>
          </div>
          <div className="legend-item">
            <span className="dot" style={{ background: '#ef4444', border: '1px solid #b91c1c' }}></span>
            <span>Public-Semi Public (Red)</span>
          </div>
          <div className="legend-item">
            <span className="dot" style={{ background: '#22c55e', border: '1px solid #15803d' }}></span>
            <span>Open Space (Green)</span>
          </div>
          <div className="legend-item">
            <span className="dot" style={{ background: '#6b7280', border: '1px solid #374151' }}></span>
            <span>Road (Gray)</span>
          </div>
        </div>
      </div>
    </div>
  );
}
