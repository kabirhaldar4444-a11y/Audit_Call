import React, { useState, useEffect, useRef } from 'react';
import api from '../utils/api';
import AudioPlayer from '../components/AudioPlayer';
import './Dashboard.css';

const Dashboard = () => {
  const [stats, setStats] = useState({
    totalCalls: 0,
    pendingCalls: 0,
    auditedCalls: 0,
  });
  const [calls, setCalls] = useState([]);
  const [selectedCalls, setSelectedCalls] = useState([]);
  const [filters, setFilters] = useState({
    callId: '',
    agentName: '',
    process: '',
    status: '',
    date: ''
  });
  const [sortConfig, setSortConfig] = useState({
    key: 'date',
    direction: 'desc'
  });
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({
    total: 0,
    totalPages: 1,
    limit: 20
  });
  const [debouncedFilters, setDebouncedFilters] = useState(filters);

  const handleStatusUpdate = async (id, newStatus) => {
    try {
      await api.patch(`/calls/${id}/status`, { status: newStatus });
      setCalls(prev => prev.map(call => call._id === id ? { ...call, status: newStatus } : call));
      fetchData();
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  // Server-side sorting/filtering replaces local filtering for performance
  const displayCalls = calls;
  
  // Debounce filter updates
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedFilters(filters);
      setPage(1); // Reset to page 1 on search
    }, 500);
    return () => clearTimeout(timer);
  }, [filters]);


  const [loading, setLoading] = useState(true);
  // eslint-disable-next-line no-unused-vars
  const [uploading, setUploading] = useState(false);
  const [selectedAudio, setSelectedAudio] = useState(null);
  const [uploadStatus, setUploadStatus] = useState(null);

  const dataFilesInput = useRef(null);
  const audioFilesInput = useRef(null);

  const isFetching = useRef(false);
  const fetchData = async () => {
    if (isFetching.current) return;
    isFetching.current = true;
    
    try {
      const queryParams = new URLSearchParams({
        page,
        limit: 20,
        sortField: sortConfig.key,
        sortOrder: sortConfig.direction,
        ...debouncedFilters
      });

      const [statsRes, callsRes] = await Promise.all([
        api.get('/calls/stats'),
        api.get(`/calls?${queryParams.toString()}`)
      ]);
      
      setStats(statsRes.data.data);
      setCalls(callsRes.data.data);
      setPagination(callsRes.data.pagination);
      setSelectedCalls([]); 
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
      isFetching.current = false;
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, debouncedFilters, sortConfig]);

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedCalls(displayCalls.map(call => call._id));
    } else {
      setSelectedCalls([]);
    }
  };

  const handleSelectOne = (id) => {
    setSelectedCalls(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleDeleteSelected = async () => {
    if (selectedCalls.length === 0) return;
    
    if (!window.confirm(`Are you sure you want to delete ${selectedCalls.length} records?`)) {
      return;
    }

    try {
      setUploading(true);
      await api.post('/calls/delete', { ids: selectedCalls });
      setUploadStatus({ type: 'success', message: `Successfully deleted ${selectedCalls.length} records.` });
      fetchData();
    } catch (error) {
      setUploadStatus({ type: 'error', message: 'Error deleting records.' });
    } finally {
      setUploading(false);
    }
  };

  const handleDataUpload = async (e) => {

    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    setUploading(true);
    setUploadStatus({ type: 'info', message: 'Uploading data...' });

    try {
      const response = await api.post('/calls/upload-data', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      const { success, total, errors } = response.data.data;
      
      if (success > 0) {
        setUploadStatus({ type: 'success', message: `Successfully uploaded ${success} of ${total} records.` });
      } else if (total > 0) {
        setUploadStatus({ type: 'error', message: `Failed to process records. Please check your column headers (e.g., "Call ID", "Agent Name", "Date").` });
        console.error('Upload errors:', errors);
      } else {
        setUploadStatus({ type: 'warning', message: 'No records found in the uploaded file.' });
      }
      
      // Refresh handled in finally
    } catch (error) {

      setUploadStatus({ type: 'error', message: error.response?.data?.message || 'Error uploading data' });
    } finally {
      setUploading(false);
      // Brief delay to allow DB indexing to complete for large datasets
      setTimeout(() => {
        fetchData();
      }, 800);
      if (dataFilesInput.current) dataFilesInput.current.value = '';
    }
  };

  const handleAudioUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (!files || files.length === 0) return;

    const formData = new FormData();
    files.forEach(file => formData.append('files', file));

    setUploading(true);
    setUploadStatus({ type: 'info', message: 'Uploading audio...' });

    try {
      const response = await api.post('/calls/upload-audio', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setUploadStatus({ type: 'success', message: `Audio uploaded! ${response.data.data.success} files matched.` });
      fetchData();
    } catch (error) {
      setUploadStatus({ type: 'error', message: error.response?.data?.message || 'Error uploading audio' });
    } finally {
      setUploading(false);
      fetchData();
      if (audioFilesInput.current) audioFilesInput.current.value = '';
    }
  };

  if (loading) {
    return <div className="dashboard-loading">Loading...</div>;
  }

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <div>
          <h2>Dashboard</h2>
          <p>Welcome to Call Audit System</p>
        </div>
        {uploadStatus && (
          <div className={`status-banner ${uploadStatus.type}`}>
            {uploadStatus.message}
            <button onClick={() => setUploadStatus(null)}>×</button>
          </div>
        )}
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-content">
            <h3>Total Calls</h3>
            <p className="stat-number">{stats.totalCalls}</p>
          </div>
          <div className="stat-icon total">📞</div>
        </div>

        <div className="stat-card">
          <div className="stat-content">
            <h3>Pending Audits</h3>
            <p className="stat-number">{stats.pendingCalls}</p>
          </div>
          <div className="stat-icon pending">⏳</div>
        </div>

        <div className="stat-card">
          <div className="stat-content">
            <h3>Audited Calls</h3>
            <p className="stat-number">{stats.auditedCalls}</p>
          </div>
          <div className="stat-icon audited">✅</div>
        </div>
      </div>

      <div className="upload-container">
        <h3><span className="icon">☁️</span> Upload Call Data</h3>
        <div className="upload-grid">
          <div className="upload-box" onClick={() => dataFilesInput.current.click()}>
            <input 
              type="file" 
              ref={dataFilesInput} 
              onChange={handleDataUpload} 
              accept=".xlsx,.xls,.csv" 
              style={{ display: 'none' }} 
            />
            <div className="upload-content">
              <div className="upload-icon excel">X</div>
              <h4>Upload Excel File</h4>
              <p>Drag & drop or click to browse (XLSX, CSV)</p>
            </div>
          </div>

          <div className="upload-box" onClick={() => audioFilesInput.current.click()}>
            <input 
              type="file" 
              ref={audioFilesInput} 
              onChange={handleAudioUpload} 
              accept=".mp3" 
              multiple 
              style={{ display: 'none' }} 
            />
            <div className="upload-content">
              <div className="upload-icon audio">🎵</div>
              <h4>Upload MP3 Recordings</h4>
              <p>Drag & drop or click to browse (MP3 files)</p>
            </div>
          </div>
        </div>
      </div>

      <div className="records-section">
        <div className="records-header">
          <div className="title-group">
            <h3><span className="icon">📞</span> Call Records</h3>
            <span className="record-count">{calls.length} records</span>
          </div>
          {selectedCalls.length > 0 && (
            <button className="bulk-delete-btn" onClick={handleDeleteSelected}>
              🗑️ Delete Selected ({selectedCalls.length})
            </button>
          )}
        </div>
        <div className="table-wrapper">
        <div className="calls-table">
          <table>
            <thead>
              <tr>
                <th className="checkbox-col">
                  <input
                    type="checkbox"
                    checked={selectedCalls.length > 0 && selectedCalls.length === displayCalls.length}
                    onChange={handleSelectAll}
                  />
                </th>
                <th className="sl-no-col">Sl No</th>
                <th>
                  Call ID
                  <div className="header-filter-container">
                    <input 
                      className="col-filter" 
                      placeholder="Search ID..." 
                      value={filters.callId}
                      onChange={(e) => setFilters({...filters, callId: e.target.value})}
                    />
                  </div>
                </th>
                <th>
                  Agent
                  <div className="header-filter-container">
                    <input 
                      className="col-filter" 
                      placeholder="Search Agent..." 
                      value={filters.agentName}
                      onChange={(e) => setFilters({...filters, agentName: e.target.value})}
                    />
                  </div>
                </th>
                <th>
                  PROCESS
                  <div className="header-filter-container">
                    <input 
                      className="col-filter" 
                      placeholder="Search Process..." 
                      value={filters.process}
                      onChange={(e) => setFilters({...filters, process: e.target.value})}
                    />
                  </div>
                </th>
                <th 
                  onClick={() => setSortConfig({ key: 'date', direction: sortConfig.key === 'date' && sortConfig.direction === 'asc' ? 'desc' : 'asc' })}
                  className="sortable"
                >
                  DATE & TIME {sortConfig.key === 'date' && (sortConfig.direction === 'asc' ? '🔼' : '🔽')}
                </th>
                <th 
                  onClick={() => setSortConfig({ key: 'duration', direction: sortConfig.key === 'duration' && sortConfig.direction === 'asc' ? 'desc' : 'asc' })}
                  className="sortable"
                >
                  DURATION {sortConfig.key === 'duration' && (sortConfig.direction === 'asc' ? '🔼' : '🔽')}
                </th>
                <th>AGENT EMAIL</th>
                <th>
                  STATUS
                  <div className="header-filter-container">
                    <select 
                      className="col-filter" 
                      value={filters.status}
                      onChange={(e) => setFilters({...filters, status: e.target.value})}
                    >
                      <option value="">All Status</option>
                      <option value="pending">Pending</option>
                      <option value="audited">Audited</option>
                    </select>
                  </div>
                </th>
                <th>ACTION</th>
              </tr>
            </thead>


            <tbody>
              {displayCalls.map((call, index) => (
                <tr key={call._id} className={selectedCalls.includes(call._id) ? 'selected-row' : ''}>
                  <td className="checkbox-col">
                    <input 
                      type="checkbox" 
                      onChange={() => handleSelectOne(call._id)} 
                      checked={selectedCalls.includes(call._id)}
                    />
                  </td>
                  <td className="sl-no-col">{(page - 1) * pagination.limit + index + 1}</td>
                  <td className="bold">{call.callId}</td>
                  <td>{call.agentName}</td>
                  <td>{call.process || 'General'}</td>
                  <td>{new Date(call.date).toLocaleString()}</td>
                  <td>{call.duration || '00:00'}</td>
                  <td>{call.agentEmail || 'N/A'}</td>
                  <td>
                    <span className={`status-pill ${call.status}`}>
                      • {call.status.charAt(0).toUpperCase() + call.status.slice(1)}
                    </span>
                  </td>
                  <td className="actions">
                    {call.audioUrl ? (
                      <button
                        className="audio-link-btn"
                        onClick={() => setSelectedAudio({ url: call.audioUrl, call })}
                        title="Listen to recording"
                      >
                        Listen
                      </button>
                    ) : (
                      <span className="no-audio">No Audio</span>
                    )}
                    <button 
                      className={`status-btn ${call.status === 'pending' ? 'mark-audited' : 'mark-pending'}`}
                      onClick={() => handleStatusUpdate(call._id, call.status === 'pending' ? 'audited' : 'pending')}
                    >
                      {call.status === 'pending' ? '✅ Audit' : '↩️ Reset'}
                    </button>
                  </td>
                </tr>
              ))}

              {calls.length === 0 && (
                <tr>
                  <td colSpan="11" className="empty-row">No call records found. Upload an Excel file to get started.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        </div>

        {pagination.totalPages > 1 && (
          <div className="pagination-container">
            <button 
              disabled={page === 1} 
              onClick={() => setPage(p => Math.max(1, p - 1))}
              className="pagination-btn"
            >
              Previous
            </button>
            
            <div className="pagination-pages">
              {(() => {
                const pages = [];
                const maxVisible = 5;
                let start = Math.max(1, page - 2);
                let end = Math.min(pagination.totalPages, start + maxVisible - 1);
                if (end - start < maxVisible - 1) start = Math.max(1, end - maxVisible + 1);

                for (let i = start; i <= end; i++) {
                  pages.push(
                    <button 
                      key={i} 
                      onClick={() => setPage(i)}
                      className={`pagination-page ${page === i ? 'active' : ''}`}
                    >
                      {i}
                    </button>
                  );
                }
                return pages;
              })()}
            </div>

            <button 
              disabled={page === pagination.totalPages} 
              onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
              className="pagination-btn"
            >
              Next
            </button>
          </div>
        )}
      </div>


      {selectedAudio && (
        <AudioPlayer 
          audioUrl={selectedAudio.url.startsWith('http') ? selectedAudio.url : `${process.env.REACT_APP_API_URL.replace('/api', '')}${selectedAudio.url}`} 
          callInfo={selectedAudio.call}
          onClose={() => setSelectedAudio(null)} 
        />
      )}
    </div>
  );
};

export default Dashboard;

