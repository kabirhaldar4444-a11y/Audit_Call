import React, { useState, useEffect, useRef } from 'react';
import api from '../utils/api';
import AudioPlayer from '../components/AudioPlayer';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';
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
    campaign: '',
    process: '',
    status: '',
    date: ''
  });
  const [sortConfig, setSortConfig] = useState({
    key: 'createdAt',
    direction: 'desc'
  });
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({
    total: 0,
    totalPages: 1,
    limit: 20
  });
  const [debouncedFilters, setDebouncedFilters] = useState(filters);
  const [dbStatus, setDbStatus] = useState('checking');
  const [dbError, setDbError] = useState(null);
  const [apiVersion, setApiVersion] = useState(null);

  const formatDuration = (durationStr) => {
    if (!durationStr) return '00:00';
    const numValue = Number(durationStr);
    if (!isNaN(numValue) && durationStr.toString().trim() !== '') {
      if (numValue > 0 && numValue < 1) {
        const totalSeconds = Math.round(numValue * 24 * 60 * 60);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
      }
    }
    return durationStr;
  };

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

  // Check database health
  const checkHealth = async () => {
    try {
      const res = await api.get('/health');
      setDbStatus(res.data.database || 'disconnected');
      setApiVersion(res.data.version || 'v1.0 (Old)');
      
      let errorMsg = res.data.lastError;
      if (!res.data.uriPresent) {
        const keys = res.data.detectedKeys || [];
        errorMsg = `MONGODB_URI is UNDEFINED. ${keys.length > 0 ? 'Detected similar keys: ' + keys.join(', ') : 'No database keys found in Vercel.'}`;
      }
      setDbError(errorMsg);
    } catch (err) {
      setDbStatus('error');
      setDbError('Could not reach backend health check');
    }
  };

  useEffect(() => {
    checkHealth();
    const interval = setInterval(checkHealth, 10000);
    return () => clearInterval(interval);
  }, []);


  const [loading, setLoading] = useState(true);
  // eslint-disable-next-line no-unused-vars
  const [uploading, setUploading] = useState(false);
  const [selectedAudio, setSelectedAudio] = useState(null);
  const [uploadStatus, setUploadStatus] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);

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
      
      // Defensive state updates - only update if data is valid
      if (statsRes?.data?.data) {
        setStats(statsRes.data.data);
      }
      
      if (callsRes?.data?.data) {
        setCalls(Array.isArray(callsRes.data.data) ? callsRes.data.data : []);
      }
      
      if (callsRes?.data?.pagination) {
        setPagination(callsRes.data.pagination);
      }
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

    setUploading(true);
    setUploadStatus({ type: 'info', message: 'Reading file...' });
    setUploadProgress(0);

    const fileExtension = file.name.split('.').pop().toLowerCase();

    const processData = async (data) => {
      try {
        if (data.length === 0) {
          setUploadStatus({ type: 'error', message: 'The file is empty or contains no valid rows.' });
          setUploading(false);
          return;
        }

        const BATCH_SIZE = 200;
        const totalBatches = Math.ceil(data.length / BATCH_SIZE);
        let successCount = 0;
        let totalProcessed = 0;
        let lastBatchError = null;

        setUploadStatus({ type: 'info', message: `Starting upload of ${data.length} records...` });

        for (let i = 0; i < data.length; i += BATCH_SIZE) {
          const batch = data.slice(i, i + BATCH_SIZE);
          const currentBatchNumber = Math.floor(i / BATCH_SIZE) + 1;
          
          setUploadStatus({ 
            type: 'info', 
            message: `Uploading batch ${currentBatchNumber} of ${totalBatches} (${totalProcessed} / ${data.length} records)...` 
          });
          setUploadProgress(Math.round((totalProcessed / data.length) * 100));

          try {
            const response = await api.post('/calls/upload-batch', { 
              data: batch,
              startIndex: i
            });
            const result = response.data?.data;
            if (result?.success === 0 && result?.errors?.length > 0) {
              lastBatchError = result.errors[0];
            }
            successCount += result?.success || 0;
            totalProcessed += batch.length;

            // Yield to browser UI thread to prevent "Page Unresponsive" freezing
            await new Promise(resolve => setTimeout(resolve, 10));
          } catch (batchError) {
            console.error(`Batch ${currentBatchNumber} failed:`, batchError);
            lastBatchError = batchError.response?.data?.message || batchError.message;
          }
        }

        if (successCount === 0 && data.length > 0) {
          setUploadStatus({ 
            type: 'error', 
            message: `Failed to upload any records. ${lastBatchError || 'Please check if the database is connected.'}` 
          });
        } else {
          setUploadStatus({ 
            type: 'success', 
            message: `Successfully uploaded ${successCount} of ${data.length} records.` 
          });
          // FORCE REFRESH
          fetchData();
        }
        setUploadProgress(100);
      } catch (error) {
        console.error('❌ Data Processing Error:', error);
        setUploadStatus({ type: 'error', message: 'Error processing data.' });
      } finally {
        setUploading(false);
        setTimeout(() => {
          fetchData();
          setUploadProgress(0);
        }, 1500);
        if (dataFilesInput.current) dataFilesInput.current.value = '';
      }
    };

    if (fileExtension === 'csv') {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        worker: true, // Use background Web Worker to prevent UI freeze
        complete: (results) => {
          processData(results.data);
        },
        error: (error) => {
          console.error('❌ CSV Parse Error:', error);
          setUploadStatus({ type: 'error', message: `Error parsing CSV: ${error.message}` });
          setUploading(false);
          if (dataFilesInput.current) dataFilesInput.current.value = '';
        }
      });
    } else {
      setUploadStatus({ type: 'info', message: 'Parsing Excel file (this may take a minute, please wait)...' });
      
      // Delay to let React render the "Parsing..." message before blocking the thread
      setTimeout(() => {
        const reader = new FileReader();
        reader.onload = async (evt) => {
          try {
            const arrayBuffer = evt.target.result;
            const dataUint8 = new Uint8Array(arrayBuffer);
            const wb = XLSX.read(dataUint8, { type: 'array' });
            const wsname = wb.SheetNames[0];
            const ws = wb.Sheets[wsname];
            const data = XLSX.utils.sheet_to_json(ws);
            
            processData(data);
          } catch (error) {
            console.error('❌ Excel Parse Error:', error);
            setUploadStatus({ type: 'error', message: 'Error processing Excel file. Ensure it is valid.' });
            setUploading(false);
            if (dataFilesInput.current) dataFilesInput.current.value = '';
          }
        };

        reader.onerror = () => {
          setUploadStatus({ type: 'error', message: 'Error reading file.' });
          setUploading(false);
          if (dataFilesInput.current) dataFilesInput.current.value = '';
        };

        reader.readAsArrayBuffer(file);
      }, 50);
    }
  };

  const handleAudioUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (!files || files.length === 0) return;

    // Check file size (25MB limit)
    const MAX_SIZE = 25 * 1024 * 1024;
    const oversizedFiles = files.filter(f => f.size > MAX_SIZE);
    
    if (oversizedFiles.length > 0) {
      setUploadStatus({ 
        type: 'error', 
        message: `${oversizedFiles.length} files exceed the 25MB limit. Please upload smaller files.` 
      });
      if (audioFilesInput.current) audioFilesInput.current.value = '';
      return;
    }

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
      console.error('❌ Audio Upload Error:', error);
      const errorMsg = error.response?.data?.message || error.message || 'Error uploading audio';
      setUploadStatus({ 
        type: 'error', 
        message: errorMsg === 'Network Error' ? 'Network Error: The server might have restarted or files are too large.' : errorMsg
      });
    } finally {
      setUploading(false);
      fetchData();
      if (audioFilesInput.current) audioFilesInput.current.value = '';
    }
  };

  const handleDeleteAll = async () => {
    if (!window.confirm('⚠️ ARE YOU SURE? This will permanently delete ALL data records from the system. This cannot be undone.')) {
      return;
    }

    try {
      setLoading(true);
      await api.post('/calls/delete-all');
      setUploadStatus({ type: 'success', message: 'All records have been deleted successfully.' });
      await fetchData();
    } catch (error) {
      console.error('❌ Delete All Error:', error);
      setUploadStatus({ type: 'error', message: error.response?.data?.message || 'Error deleting all records' });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="dashboard-loading">Loading...</div>;
  }

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <div className="header-left">
          <h1>Call Audit Dashboard</h1>
          <div className={`connection-badge ${dbStatus}`} title={dbError || ''}>
            <span className="pulse-dot"></span>
            {dbStatus === 'connected' ? `Cloud Connected (${apiVersion})` : 
             dbStatus === 'disconnected' || dbStatus === 'error' ? `Database Disconnected: ${dbError || 'Unknown Error'} (${apiVersion})` : 
             'Checking Connection...'}
          </div>
        </div>
        {uploadStatus && (
          <div className={`status-banner ${uploadStatus.type}`}>
            <div className="status-message-container">
              <div className="status-text">{uploadStatus.message}</div>
              {uploadProgress > 0 && uploadProgress < 100 && (
                <div className="upload-progress-container">
                  <div className="upload-progress-bar" style={{ width: `${uploadProgress}%` }}></div>
                </div>
              )}
            </div>
            <button className="status-close" onClick={() => { setUploadStatus(null); setUploadProgress(0); }}>×</button>
          </div>
        )}
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-content">
            <h3>Total Calls</h3>
            <p className="stat-number">{stats?.totalCalls ?? 0}</p>
          </div>
          <div className="stat-icon total">📞</div>
        </div>

        <div className="stat-card">
          <div className="stat-content">
            <h3>Pending Audits</h3>
            <p className="stat-number">{stats?.pendingCalls ?? 0}</p>
          </div>
          <div className="stat-icon pending">⏳</div>
        </div>

        <div className="stat-card">
          <div className="stat-content">
            <h3>Audited Calls</h3>
            <p className="stat-number">{stats?.auditedCalls ?? 0}</p>
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
        <div className="header-right">
          <button className="delete-all-btn" onClick={handleDeleteAll}>
            <span className="icon">🗑️</span> Delete All Data
          </button>
        </div>
      </div>

      <div className="records-section">
        <div className="records-header">
          <div className="title-group">
            <h3><span className="icon">📞</span> Call Records</h3>
            <span className="record-count">{(calls?.length ?? 0)} records</span>
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
                    checked={(selectedCalls?.length ?? 0) > 0 && selectedCalls?.length === (displayCalls?.length ?? 0)}
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
                  Campaign
                  <div className="header-filter-container">
                    <input 
                      className="col-filter" 
                      placeholder="Search Campaign..." 
                      value={filters.campaign}
                      onChange={(e) => setFilters({...filters, campaign: e.target.value})}
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
                <th>CALL TIME</th>
                <th 
                  onClick={() => setSortConfig({ key: 'duration', direction: sortConfig.key === 'duration' && sortConfig.direction === 'asc' ? 'desc' : 'asc' })}
                  className="sortable"
                >
                  DURATION {sortConfig.key === 'duration' && (sortConfig.direction === 'asc' ? '🔼' : '🔽')}
                </th>
                <th>AGENT EMAIL</th>
                <th>FIRST DISPOSE</th>
                <th>DISPOSE</th>
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
              {(displayCalls ?? []).map((call, index) => (
                <tr key={call?._id || index} className={selectedCalls.includes(call?._id) ? 'selected-row' : ''}>
                  <td className="checkbox-col">
                    <input 
                      type="checkbox" 
                      onChange={() => handleSelectOne(call?._id)} 
                      checked={selectedCalls.includes(call?._id)}
                    />
                  </td>
                  <td className="sl-no-col">{(page - 1) * (pagination?.limit ?? 20) + index + 1}</td>
                  <td className="bold">{call?.callId || 'N/A'}</td>
                  <td>{call?.agentName || 'N/A'}</td>
                  <td>{call?.campaign || 'N/A'}</td>
                  <td>{call?.process || 'General'}</td>
                  <td>{call?.date ? new Date(call.date).toLocaleString() : 'N/A'}</td>
                  <td>{call?.callTime || 'N/A'}</td>
                  <td>{formatDuration(call?.duration)}</td>
                  <td>{call?.agentEmail || 'N/A'}</td>
                  <td>{call?.firstDispose || 'N/A'}</td>
                  <td>{call?.dispose || 'N/A'}</td>
                  <td>
                    <span className={`status-pill ${call?.status || 'pending'}`}>
                      • {(call?.status || 'pending').charAt(0).toUpperCase() + (call?.status || 'pending').slice(1)}
                    </span>
                  </td>
                  <td className="actions">
                    {call?.audioUrl ? (
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
                      className={`status-btn ${(call?.status || 'pending') === 'pending' ? 'mark-audited' : 'mark-pending'}`}
                      onClick={() => handleStatusUpdate(call?._id, (call?.status || 'pending') === 'pending' ? 'audited' : 'pending')}
                    >
                      {(call?.status || 'pending') === 'pending' ? '✅ Audit' : '↩️ Reset'}
                    </button>
                  </td>
                </tr>
              ))}

              {(calls?.length ?? 0) === 0 && (
                <tr>
                  <td colSpan="12" className="empty-row">No call records found. Upload an Excel file to get started.</td>
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
          audioUrl={selectedAudio.url.startsWith('http') ? selectedAudio.url : `${(process.env.REACT_APP_API_URL || '').replace('/api', '')}${selectedAudio.url}`} 
          callInfo={selectedAudio.call}
          onClose={() => setSelectedAudio(null)} 
        />
      )}
    </div>
  );
};

export default Dashboard;

