import React, { useRef, useState, useEffect } from 'react';
import { Download, FileText, Image, ChevronDown, Check, Loader2 } from 'lucide-react';
import { downloadAsImage, downloadAsPdf } from './exportUtils';
import { getLandUseColor } from './MapView';

export default function PlotReportCard({ plot }) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [downloadingType, setDownloadingType] = useState(null); // 'pdf' | 'image' | null
  const [downloadSuccess, setDownloadSuccess] = useState(null);
  
  const reportRef = useRef(null);
  const dropdownRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!plot) return null;

  const colorInfo = getLandUseColor(plot);
  const plotTitle = plot.plot_number ? `Plot ${plot.plot_number}` : `Feature #${plot.gid}`;
  const baseFilename = `MHADA_${plot.layout ? plot.layout.replace(/\s+/g, '_') : 'Layout'}_${plot.plot_number ? `Plot_${plot.plot_number}` : `GID_${plot.gid}`}`;

  const formatArea = (val) => {
    if (!val || val === 0 || val === '0') return '—';
    return `${parseFloat(val).toFixed(3)} sq.m`;
  };

  const handleDownload = async (type) => {
    try {
      setDownloadingType(type);
      setIsDropdownOpen(false);

      // Brief delay to ensure ref rendering is clean
      await new Promise((resolve) => setTimeout(resolve, 150));

      if (type === 'image') {
        await downloadAsImage(reportRef.current, `${baseFilename}_Details.png`);
      } else if (type === 'pdf') {
        await downloadAsPdf(reportRef.current, `${baseFilename}_Details.pdf`, plot);
      }

      setDownloadSuccess(type);
      setTimeout(() => setDownloadSuccess(null), 3000);
    } catch (err) {
      console.error('Download error:', err);
      alert('Failed to generate export file. Please try again.');
    } finally {
      setDownloadingType(null);
    }
  };

  return (
    <div className="plot-download-container" ref={dropdownRef}>
      {/* Download Info Button with Dropdown */}
      <div className="download-btn-group">
        <button 
          className="download-info-btn"
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          disabled={downloadingType !== null}
          aria-haspopup="true"
          aria-expanded={isDropdownOpen}
        >
          {downloadingType ? (
            <>
              <Loader2 size={16} className="btn-spinner" />
              <span>Generating {downloadingType.toUpperCase()}...</span>
            </>
          ) : downloadSuccess ? (
            <>
              <Check size={16} className="text-success" />
              <span>Downloaded {downloadSuccess.toUpperCase()}!</span>
            </>
          ) : (
            <>
              <Download size={16} />
              <span>Download Info</span>
              <ChevronDown size={14} className={`dropdown-arrow ${isDropdownOpen ? 'open' : ''}`} />
            </>
          )}
        </button>

        {isDropdownOpen && (
          <div className="download-dropdown-menu">
            <button 
              className="download-menu-item"
              onClick={() => handleDownload('pdf')}
            >
              <div className="menu-item-icon pdf-icon">
                <FileText size={18} />
              </div>
              <div className="menu-item-text">
                <span className="menu-title">Download PDF</span>
                <span className="menu-desc">Printable official GIS plot slip</span>
              </div>
            </button>

            <button 
              className="download-menu-item"
              onClick={() => handleDownload('image')}
            >
              <div className="menu-item-icon img-icon">
                <Image size={18} />
              </div>
              <div className="menu-item-text">
                <span className="menu-title">Download Image</span>
                <span className="menu-desc">High resolution PNG property card</span>
              </div>
            </button>
          </div>
        )}
      </div>

      {/* Hidden printable/exportable official document element */}
      <div style={{ position: 'fixed', left: '-9999px', top: '-9999px' }}>
        <div ref={reportRef} className="official-plot-certificate">
          {/* Certificate Header */}
          <div className="cert-header">
            <div className="cert-header-left">
              <img src="/logo.png" alt="MHADA Logo" className="cert-logo" onError={(e) => e.target.style.display = 'none'} />
              <div>
                <h2>MAHARASHTRA HOUSING AND AREA DEVELOPMENT AUTHORITY</h2>
                <h3>KONKAN HOUSING AND AREA DEVELOPMENT BOARD</h3>
                <p className="cert-subtitle">GIS Plot Information &amp; Property Record Certificate</p>
              </div>
            </div>
            <div className="cert-header-right">
              <span className="cert-badge" style={{ backgroundColor: `${colorInfo.fill}25`, color: colorInfo.stroke, borderColor: colorInfo.stroke }}>
                {colorInfo.name}
              </span>
              <span className="cert-date">Date: {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
            </div>
          </div>

          <div className="cert-divider"></div>

          {/* Key Identification Bar */}
          <div className="cert-highlight-bar" style={{ borderLeft: `6px solid ${colorInfo.fill}` }}>
            <div className="cert-hl-item">
              <span className="cert-hl-label">PLOT NUMBER</span>
              <span className="cert-hl-val">{plotTitle}</span>
            </div>
            <div className="cert-hl-item">
              <span className="cert-hl-label">LAYOUT / SCHEME</span>
              <span className="cert-hl-val">{plot.layout || 'Pawar Nagar Layout'}</span>
            </div>
            <div className="cert-hl-item">
              <span className="cert-hl-label">LAND USE CATEGORY</span>
              <span className="cert-hl-val" style={{ color: colorInfo.stroke }}>{colorInfo.name}</span>
            </div>
            <div className="cert-hl-item">
              <span className="cert-hl-label">TOTAL CARPET / BUILT-UP AREA</span>
              <span className="cert-hl-val">{formatArea(plot.total_area || plot.area_sqm)}</span>
            </div>
          </div>

          {/* Section 1: Allotment & Occupant Information */}
          <div className="cert-section">
            <div className="cert-section-title">1. ALLOTMENT &amp; OCCUPANT PARTICULARS</div>
            <table className="cert-table">
              <tbody>
                <tr>
                  <td className="tbl-label">Current Occupant Name:</td>
                  <td className="tbl-val highlight">{plot.occupant || '—'}</td>
                  <td className="tbl-label">Room / Flat No.:</td>
                  <td className="tbl-val">{plot.room_no || '—'}</td>
                </tr>
                <tr>
                  <td className="tbl-label">First Allottee Name:</td>
                  <td className="tbl-val">{plot.first_allottee || '—'}</td>
                  <td className="tbl-label">Type of Code / Category:</td>
                  <td className="tbl-val">{plot.type_of_code || '—'}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Section 2: Area Measurements */}
          <div className="cert-section">
            <div className="cert-section-title">2. DETAILED AREA SPECIFICATIONS (IN SQ. METERS)</div>
            <table className="cert-table">
              <thead>
                <tr>
                  <th>Ground Floor</th>
                  <th>First Floor</th>
                  <th>Second Floor</th>
                  <th>Total Built-Up Area</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>{formatArea(plot.grflr_area)}</td>
                  <td>{formatArea(plot.first_flr_area)}</td>
                  <td>{formatArea(plot.second_flr_area)}</td>
                  <td className="highlight-area">{formatArea(plot.total_area || plot.area_sqm)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Section 3: MHADA Transfer Details */}
          <div className="cert-section">
            <div className="cert-section-title">3. MHADA TRANSFER &amp; POSSESSION RECORD</div>
            <table className="cert-table">
              <tbody>
                <tr>
                  <td className="tbl-label">MHADA Transfer Order No.:</td>
                  <td className="tbl-val">{plot.mhada_transfer_order || '—'}</td>
                  <td className="tbl-label">Possession / Order Date:</td>
                  <td className="tbl-val">{plot.possession_date || '—'}</td>
                </tr>
                <tr>
                  <td className="tbl-label">MHADA Transfer Status:</td>
                  <td className="tbl-val" colSpan={3}>{plot.mhada_transfer || '—'}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Section 4: Administrative & Location Jurisdiction */}
          <div className="cert-section">
            <div className="cert-section-title">4. GEOGRAPHICAL &amp; ADMINISTRATIVE JURISDICTION</div>
            <table className="cert-table">
              <tbody>
                <tr>
                  <td className="tbl-label">State:</td>
                  <td className="tbl-val">{plot.state || 'Maharashtra'}</td>
                  <td className="tbl-label">District:</td>
                  <td className="tbl-val">{plot.district || 'Thane'}</td>
                </tr>
                <tr>
                  <td className="tbl-label">Tehsil (Taluka):</td>
                  <td className="tbl-val">{plot.tehsil || 'Thane'}</td>
                  <td className="tbl-label">Municipal Corporation:</td>
                  <td className="tbl-val">{plot.municipal_corporation || 'Thane'}</td>
                </tr>
                <tr>
                  <td className="tbl-label">Ward:</td>
                  <td className="tbl-val">{plot.ward || 'E'}</td>
                  <td className="tbl-label">GIS Feature ID (GID):</td>
                  <td className="tbl-val">#{plot.gid}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Certificate Footer */}
          <div className="cert-footer">
            <div className="cert-footer-left">
              <p>Generated electronically from MHADA Konkan Board GIS Plot Management System.</p>
              <p className="cert-timestamp">Document Generated on: {new Date().toLocaleString('en-IN')}</p>
            </div>
            <div className="cert-footer-right">
              <div className="cert-stamp-box">
                <span>MHADA KONKAN BOARD</span>
                <small>GIS VERIFIED RECORD</small>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
