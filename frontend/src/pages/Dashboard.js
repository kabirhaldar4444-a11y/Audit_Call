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

  const handleStatusUpdate = async (id, newStatus) => {
    try {
      await api.patch(`/calls/${id}/status`, { status: newStatus });
      setCalls(prev => prev.map(call => call._id === id ? { ...call, status: newStatus } : call));
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const filteredCalls = calls
    .filter(call => {
      const matchStatus = !filters.status || call.status === filters.status;
      return (
        matchStatus &&
        (call.callId?.toLowerCase().includes(filters.callId.toLowerCase())) &&
        (call.agentName?.toLowerCase().includes(filters.agentName.toLowerCase())) &&
        (call.process?.toLowerCase().includes(filters.process.toLowerCase())) &&
        (!filters.date || new Date(call.date).toLocaleDateString().includes(filters.date))
      );
    })
    .sort((a, b) => {
      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];
      
      if (sortConfig.key === 'date') {
        const dateA = new Date(aValue);
        const dateB = new Date(bValue);
        return sortConfig.direction === 'asc' ? dateA - dateB : dateB - dateA;
      }
      
      return 0;
    });


  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedAudio, setSelectedAudio] = useState(null);
  const [uploadStatus, setUploadStatus] = useState(null);

  const dataFilesInput = useRef(null);
  const audioFilesInput = useRef(null);

  const fetchData = async () => {
    try {
      const [statsRes, callsRes] = await Promise.all([
        api.get('/calls/stats'),
        api.get('/calls')
      ]);
      setStats(statsRes.data.data);
      setCalls(callsRes.data.data);
      setSelectedCalls([]); // Reset selection on fetch
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedCalls(filteredCalls.map(call => call._id));
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
      
      fetchData();
    } catch (error) {

      setUploadStatus({ type: 'error', message: error.response?.data?.message || 'Error uploading data' });
    } finally {
      setUploading(false);
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
        <div className="calls-table">
          <table>
            <thead>
              <tr>
                <th className="checkbox-col">
                  <input
                    type="checkbox"
                    checked={selectedCalls.length > 0 && selectedCalls.length === filteredCalls.length}
                    onChange={handleSelectAll}
                  />
                </th>
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
                  onClick={() => setSortConfig({ key: 'date', direction: sortConfig.direction === 'asc' ? 'desc' : 'asc' })}
                  className="sortable"
                >
                  DATE & TIME {sortConfig.direction === 'asc' ? '🔼' : '🔽'}
                </th>
                <th>DURATION</th>
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
              {filteredCalls.map((call) => (
                <tr key={call._id} className={selectedCalls.includes(call._id) ? 'selected-row' : ''}>
                  <td className="checkbox-col">
                    <input 
                      type="checkbox" 
                      onChange={() => handleSelectOne(call._id)} 
                      checked={selectedCalls.includes(call._id)}
                    />
                  </td>
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
                        onClick={() => setSelectedAudio(call.audioUrl)}
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
                  <td colSpan="9" className="empty-row">No call records found. Upload an Excel file to get started.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>


      {selectedAudio && (
        <AudioPlayer 
          audioUrl={selectedAudio.startsWith('http') ? selectedAudio : `${process.env.REACT_APP_API_URL.replace('/api', '')}${selectedAudio}`} 
          onClose={() => setSelectedAudio(null)} 
        />
      )}
    </div>
  );
};

export default Dashboard;

