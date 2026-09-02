import React, { useState, useEffect } from 'react';
import { 
  Search, 
  MapPin, 
  Layers, 
  Building2,
  TreePine,
  Footprints,
  AlertTriangle, 
  X, 
  RotateCcw, 
  ChevronRight, 
  ExternalLink 
} from 'lucide-react';
import { fetchPlots, fetchStats, fetchMetadata } from './api';
import MapView, { getLandUseColor } from './MapView';
import './App.css';

export default function App() {
  // Plots, stats, and metadata lists
  const [plots, setPlots] = useState([]);
  const [metadata, setMetadata] = useState({ 
    states: [], 
    districts: [], 
    tehsils: [], 
    municipal_corporations: [], 
    wards: [], 
    layouts: [], 
    plot_numbers: [] 
  });
  const [stats, setStats] = useState({ 
    total_plots: 0, 
    total_area: 0, 
    status_breakdown: {}, 
    category_breakdown: {} 
  });
  
  // Selected plot for detailed view & map tracking
  const [selectedPlot, setSelectedPlot] = useState(null);
  
  // Filters state with shapefile attributes
  const [filters, setFilters] = useState({
    search: '',
    state: '',
    district: '',
    tehsil: '',
    municipal_corporation: '',
    ward: '',
    layout: '',
    plot_number: ''
  });

  // UI state
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch metadata on mount and when layout changes
  useEffect(() => {
    async function loadMetadata() {
      try {
        const metaParams = {};
        if (filters.layout) metaParams.layout = filters.layout;
        const metaData = await fetchMetadata(metaParams);
        if (metaData) {
          setMetadata({
            states: metaData.states || ['Maharashtra'],
            districts: metaData.districts || ['Thane'],
            tehsils: metaData.tehsils || ['Thane'],
            municipal_corporations: metaData.municipal_corporations || ['Thane'],
            wards: metaData.wards || ['E'],
            layouts: metaData.layouts || [],
            plot_numbers: metaData.plot_numbers || []
          });
        }
      } catch (err) {
        console.error("Failed to load metadata:", err);
      }
    }
    loadMetadata();
  }, [filters.layout]);

  // Fetch plots & statistics whenever filters change
  useEffect(() => {
    async function loadDashboardData() {
      setIsLoading(true);
      try {
        const [plotsData, statsData] = await Promise.all([
          fetchPlots(filters),
          fetchStats(filters)
        ]);
        setPlots(Array.isArray(plotsData) ? plotsData : []);
        if (statsData) {
          setStats({
            total_plots: statsData.total_plots || 0,
            total_area: statsData.total_area || 0,
            status_breakdown: statsData.status_breakdown || {},
            category_breakdown: statsData.category_breakdown || {}
          });
        }
        setError(null);

        // If a specific plot_number is filtered and exactly 1 plot returns, auto-select it
        if (filters.plot_number && Array.isArray(plotsData) && plotsData.length === 1) {
          setSelectedPlot(plotsData[0]);
        }
      } catch (err) {
        setError(err.message || "Failed to load plots data. Ensure PostgreSQL server is running.");
      } finally {
        setIsLoading(false);
      }
    }

    const timer = setTimeout(() => {
      loadDashboardData();
    }, 200);

    return () => clearTimeout(timer);
  }, [filters]);

  // Handle filter changes
  const handleFilterChange = (key, value) => {
    setFilters(prev => {
      const updated = { ...prev, [key]: value };
      if (key === 'layout') {
        updated.plot_number = '';
      }
      return updated;
    });
    setSelectedPlot(null);
  };

  // Reset all filters
  const resetFilters = () => {
    setFilters({
      search: '',
      state: '',
      district: '',
      tehsil: '',
      municipal_corporation: '',
      ward: '',
      layout: '',
      plot_number: ''
    });
    setSelectedPlot(null);
  };

  // Category breakdowns
  const residentialCount = stats?.category_breakdown?.['Residential']?.count || 0;
  const publicSemiPublicCount = stats?.category_breakdown?.['Public-Semi Public']?.count || 0;
  const openSpaceCount = stats?.category_breakdown?.['Open Space']?.count || 0;
  const roadCount = stats?.category_breakdown?.['Road']?.count || 0;

  // Helper to format area values
  const formatArea = (val) => {
    if (!val || val === 0) return '—';
    return `${parseFloat(val).toFixed(3)} sq.m`;
  };

  return (
    <div className="dashboard-container">
      {/* Navigation Bar — Logo+Title on left, KPI cards on right */}
      <header className="dashboard-header">
        <div className="header-logo-section">
          <img src="/logo.png" alt="MHADA Logo" className="header-logo" onError={(e) => e.target.style.display = 'none'} />
          <div>
            <h1>MHADA Konkan Board</h1>
            <h2>GIS Land &amp; Plot Management System</h2>
          </div>
        </div>

        {/* Land Use KPI Stats Cards */}
        <div className="kpi-container">
          <div className="kpi-card glass">
            <div className="kpi-icon-wrapper blue">
              <Layers size={18} />
            </div>
            <div className="kpi-details">
              <span className="kpi-label">Total Features</span>
              <span className="kpi-value">{stats.total_plots || 0}</span>
              <span className="kpi-subtext">{stats.total_area ? (stats.total_area / 10000).toFixed(2) : '0.00'} Ha</span>
            </div>
          </div>

          {/* Residential (Yellow) */}
          <div className="kpi-card glass" style={{ borderLeft: '3px solid #facc15' }}>
            <div className="kpi-icon-wrapper" style={{ background: '#fef9c3', color: '#ca8a04' }}>
              <Building2 size={18} />
            </div>
            <div className="kpi-details">
              <span className="kpi-label">Residential (Yellow)</span>
              <span className="kpi-value">{residentialCount}</span>
              <span className="kpi-subtext">Plots &amp; Societies</span>
            </div>
          </div>

          {/* Public-Semi Public (Red) */}
          <div className="kpi-card glass" style={{ borderLeft: '3px solid #ef4444' }}>
            <div className="kpi-icon-wrapper" style={{ background: '#fee2e2', color: '#dc2626' }}>
              <Building2 size={18} />
            </div>
            <div className="kpi-details">
              <span className="kpi-label">Public/Semi (Red)</span>
              <span className="kpi-value">{publicSemiPublicCount}</span>
              <span className="kpi-subtext">Utilities &amp; Public</span>
            </div>
          </div>

          {/* Open Space (Green) */}
          <div className="kpi-card glass" style={{ borderLeft: '3px solid #22c55e' }}>
            <div className="kpi-icon-wrapper" style={{ background: '#dcfce7', color: '#15803d' }}>
              <TreePine size={18} />
            </div>
            <div className="kpi-details">
              <span className="kpi-label">Open Space (Green)</span>
              <span className="kpi-value">{openSpaceCount}</span>
              <span className="kpi-subtext">Gardens &amp; Open</span>
            </div>
          </div>

          {/* Road (Gray) */}
          <div className="kpi-card glass" style={{ borderLeft: '3px solid #6b7280' }}>
            <div className="kpi-icon-wrapper" style={{ background: '#f3f4f6', color: '#4b5563' }}>
              <Footprints size={18} />
            </div>
            <div className="kpi-details">
              <span className="kpi-label">Roads (Gray)</span>
              <span className="kpi-value">{roadCount}</span>
              <span className="kpi-subtext">Access Roads</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Workspace Layout */}
      <main className="dashboard-main">
        {/* Left Sidebar */}
        <aside className="sidebar glass">
          <div className="sidebar-header">
            <h3>Plot &amp; Land Registry</h3>
            <button className="reset-btn flex-center" onClick={resetFilters} title="Reset all filters">
              <RotateCcw size={14} />
              <span>Reset</span>
            </button>
          </div>

          {/* Search bar */}
          <div className="search-box">
            <Search size={16} className="search-icon" />
            <input 
              type="text" 
              placeholder="Search layout, plot number, occupant, usage..."
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
            />
            {filters.search && (
              <button className="clear-search-btn" onClick={() => handleFilterChange('search', '')}>
                <X size={14} />
              </button>
            )}
          </div>

          {/* Scrollable Filters Panel */}
          <section className="filters-section">
            <div className="filter-grid">
              {/* State Dropdown */}
              <div className="filter-item">
                <label>State</label>
                <select 
                  value={filters.state} 
                  onChange={(e) => handleFilterChange('state', e.target.value)}
                >
                  <option value="">All States</option>
                  {metadata.states?.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              {/* District Dropdown */}
              <div className="filter-item">
                <label>District</label>
                <select 
                  value={filters.district} 
                  onChange={(e) => handleFilterChange('district', e.target.value)}
                >
                  <option value="">All Districts</option>
                  {metadata.districts?.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>

              {/* Tehsil / Taluka Dropdown */}
              <div className="filter-item">
                <label>Tehsil</label>
                <select 
                  value={filters.tehsil} 
                  onChange={(e) => handleFilterChange('tehsil', e.target.value)}
                >
                  <option value="">All Tehsils</option>
                  {metadata.tehsils?.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>

              {/* Municipal Corporation Dropdown */}
              <div className="filter-item">
                <label>Municipal Corp.</label>
                <select 
                  value={filters.municipal_corporation} 
                  onChange={(e) => handleFilterChange('municipal_corporation', e.target.value)}
                >
                  <option value="">All Corporations</option>
                  {metadata.municipal_corporations?.map(mc => <option key={mc} value={mc}>{mc}</option>)}
                </select>
              </div>

              {/* Ward Dropdown */}
              <div className="filter-item">
                <label>Ward</label>
                <select 
                  value={filters.ward} 
                  onChange={(e) => handleFilterChange('ward', e.target.value)}
                >
                  <option value="">All Wards</option>
                  {metadata.wards?.map(w => <option key={w} value={w}>{w}</option>)}
                </select>
              </div>

              {/* Layout Dropdown */}
              <div className="filter-item">
                <label>Layout</label>
                <select 
                  value={filters.layout} 
                  onChange={(e) => handleFilterChange('layout', e.target.value)}
                >
                  <option value="">All Layouts</option>
                  {metadata.layouts?.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>

              {/* Plot Number Dropdown */}
              <div className="filter-item filter-item--full">
                <label>Plot Number</label>
                <select 
                  value={filters.plot_number} 
                  onChange={(e) => handleFilterChange('plot_number', e.target.value)}
                >
                  <option value="">All Plot Numbers</option>
                  {metadata.plot_numbers?.map(p => <option key={p} value={p}>Plot {p}</option>)}
                </select>
              </div>
            </div>
          </section>

          {/* List display of plots */}
          <div className="plot-list-container">
            {error && (
              <div className="error-state">
                <AlertTriangle size={24} />
                <p>{error}</p>
              </div>
            )}

            {isLoading ? (
              <div className="loading-state">
                <div className="spinner"></div>
                <p>Loading shapefile features...</p>
              </div>
            ) : plots.length === 0 ? (
              <div className="empty-state">
                <p>No records found for the selected criteria.</p>
                <button className="reset-link" onClick={resetFilters}>Clear Filters</button>
              </div>
            ) : (
              <div className="plot-list">
                {plots.map((plot) => {
                  const isSelected = selectedPlot && selectedPlot.gid === plot.gid;
                  const colorInfo = getLandUseColor(plot);
                  
                  return (
                    <div 
                      key={plot.gid}
                      className={`plot-card ${isSelected ? 'selected' : ''}`}
                      onClick={() => setSelectedPlot(plot)}
                      style={{ borderLeft: `3px solid ${colorInfo.fill}` }}
                    >
                      <div className="plot-card-header">
                        <span className="plot-no">
                          {plot.plot_number ? `Plot ${plot.plot_number}` : `Feature #${plot.gid}`}
                        </span>
                        <span 
                          className="status-badge" 
                          style={{ 
                            backgroundColor: `${colorInfo.fill}20`, 
                            color: colorInfo.stroke, 
                            border: `1px solid ${colorInfo.stroke}40` 
                          }}
                        >
                          {colorInfo.name}
                        </span>
                      </div>
                      
                      <p className="plot-scheme-name">{plot.layout || 'Pawar Nagar Layout'}</p>
                      
                      <div className="plot-card-meta">
                        <span>Ward {plot.ward || 'E'}</span>
                        <span>•</span>
                        <span>{colorInfo.name}</span>
                        {plot.area_sqm > 0 && (
                          <>
                            <span>•</span>
                            <span>{plot.area_sqm} m²</span>
                          </>
                        )}
                        {plot.occupant && (
                          <>
                            <span>•</span>
                            <span className="income-badge">{plot.occupant}</span>
                          </>
                        )}
                      </div>
                      
                      <div className="plot-card-footer">
                        <span>{plot.district || 'Thane'} ({plot.tehsil || 'Thane'})</span>
                        <ChevronRight size={14} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </aside>

        {/* Right Section: Map */}
        <section className="map-area">
          <MapView 
            plots={plots} 
            selectedPlot={selectedPlot} 
            onSelectPlot={setSelectedPlot} 
          />

          {/* Detailed Plot Info Overlay */}
          {selectedPlot && (
            <div className="plot-detail-overlay glass">
              <div className="detail-header">
                <h3>Plot Details</h3>
                <button className="close-detail-btn" onClick={() => setSelectedPlot(null)}>
                  <X size={16} />
                </button>
              </div>

              <div className="detail-body">
                <div className="detail-title-section">
                  <h2>{selectedPlot.plot_number ? `Plot ${selectedPlot.plot_number}` : `Feature #${selectedPlot.gid}`}</h2>
                  {(() => {
                    const colorInfo = getLandUseColor(selectedPlot);
                    return (
                      <span 
                        className="status-badge" 
                        style={{ 
                          backgroundColor: `${colorInfo.fill}25`, 
                          color: colorInfo.stroke, 
                          border: `1px solid ${colorInfo.stroke}50`,
                          fontWeight: 700
                        }}
                      >
                        {colorInfo.name}
                      </span>
                    );
                  })()}
                </div>
                <p className="detail-scheme">{selectedPlot.layout || 'Pawar Nagar Layout'}</p>

                <hr />

                {/* Occupant & Allottee Information */}
                <div className="detail-grid">
                  <div className="detail-field">
                    <label>Occupant Name</label>
                    <span className="val owner">{selectedPlot.occupant || '—'}</span>
                  </div>
                  <div className="detail-field">
                    <label>Room No.</label>
                    <span className="val">{selectedPlot.room_no || '—'}</span>
                  </div>
                  <div className="detail-field">
                    <label>First Allottee Name</label>
                    <span className="val">{selectedPlot.first_allottee || '—'}</span>
                  </div>
                  <div className="detail-field">
                    <label>Type of Code</label>
                    <span className="val">{selectedPlot.type_of_code || '—'}</span>
                  </div>
                </div>

                <hr />

                {/* Area Details (sq mtrs) — matching image columns */}
                <div className="allocation-info">
                  <h4>Area (in sq. mtrs)</h4>
                  <div className="allocation-fields">
                    <div className="detail-field">
                      <label>Ground Floor</label>
                      <span className="val">{formatArea(selectedPlot.grflr_area)}</span>
                    </div>
                    <div className="detail-field">
                      <label>1st Floor</label>
                      <span className="val">{formatArea(selectedPlot.first_flr_area)}</span>
                    </div>
                    <div className="detail-field">
                      <label>2nd Floor</label>
                      <span className="val">{formatArea(selectedPlot.second_flr_area)}</span>
                    </div>
                    <div className="detail-field">
                      <label>Total Area</label>
                      <span className="val" style={{ fontWeight: 700 }}>{formatArea(selectedPlot.total_area)}</span>
                    </div>
                  </div>
                </div>

                <hr />

                {/* MHADA Transfer Information */}
                <div className="allocation-info">
                  <h4>MHADA Transfer Details</h4>
                  <div className="allocation-fields">
                    <div className="detail-field">
                      <label>Mhada Transfer Order No</label>
                      <span className="val">{selectedPlot.mhada_transfer_order || '—'}</span>
                    </div>
                    <div className="detail-field">
                      <label>Date</label>
                      <span className="val">{selectedPlot.possession_date || '—'}</span>
                    </div>
                    <div className="detail-field">
                      <label>Mhada Transfer</label>
                      <span className="val">{selectedPlot.mhada_transfer || '—'}</span>
                    </div>
                  </div>
                </div>

                <hr />

                {/* Location Information */}
                <div className="allocation-info">
                  <h4>Location Details</h4>
                  <div className="allocation-fields">
                    <div className="detail-field">
                      <label>State</label>
                      <span className="val">{selectedPlot.state || 'Maharashtra'}</span>
                    </div>
                    <div className="detail-field">
                      <label>District</label>
                      <span className="val">{selectedPlot.district || 'Thane'}</span>
                    </div>
                    <div className="detail-field">
                      <label>Tehsil (Taluka)</label>
                      <span className="val">{selectedPlot.tehsil || 'Thane'}</span>
                    </div>
                    <div className="detail-field">
                      <label>Municipal Corp.</label>
                      <span className="val">{selectedPlot.municipal_corporation || 'Thane'}</span>
                    </div>
                    <div className="detail-field">
                      <label>Ward</label>
                      <span className="val">{selectedPlot.ward || 'E'}</span>
                    </div>
                    <div className="detail-field">
                      <label>Land Use Category</label>
                      <span className="val" style={{ color: getLandUseColor(selectedPlot).stroke, fontWeight: 700 }}>
                        {getLandUseColor(selectedPlot).name}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
