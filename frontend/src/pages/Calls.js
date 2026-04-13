import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import AudioPlayer from '../components/AudioPlayer';
import './Calls.css';

const Calls = () => {
  const [calls, setCalls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({
    callId: '',
    agentName: '',
    process: '',
    status: '',
    dateFrom: '',
    dateTo: ''
  });
  const [debouncedFilters, setDebouncedFilters] = useState(filters);
  const [pagination, setPagination] = useState({
    total: 0,
    totalPages: 1,
    limit: 20
  });
  const [selectedAudio, setSelectedAudio] = useState(null);
  const [databaseMode, setDatabaseMode] = useState('online');

  // Debounce filter updates
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedFilters(filters);
      setPage(1); // Reset to page 1 on search
    }, 500);
    return () => clearTimeout(timer);
  }, [filters]);

  const fetchCalls = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams({
        page,
        limit: 20,
        ...debouncedFilters
      });
      const response = await api.get(`/calls?${queryParams.toString()}`);
      setCalls(response.data.data);
      setPagination(response.data.pagination);
      setDatabaseMode(response.data.databaseMode || 'online');
    } catch (error) {
      console.error('Error fetching calls:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCalls();
  }, [page, debouncedFilters]);

  const getToday = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  const getLast30Days = () => {
    const today = new Date();
    const last30 = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
    return last30.toISOString().split('T')[0];
  };

  if (loading && calls.length === 0) {
    return <div className="calls-loading">Loading calls...</div>;
  }

  return (
    <div className="calls-container">
      <div className="calls-header">
        <div>
          <h2>Call Browse</h2>
          <p>Browse and search all call records</p>
          {databaseMode === 'offline' && (
            <div style={{
              backgroundColor: '#fff3cd',
              color: '#856404',
              padding: '8px 12px',
              borderRadius: '4px',
              marginTop: '8px',
              fontSize: '12px',
              display: 'inline-block'
            }}>
              ⚠️ Database offline mode - using local storage
            </div>
          )}
        </div>
      </div>

      <div className="records-section">
        {/* Date Range Filters */}
        <div style={{
          backgroundColor: '#f8f9fa',
          padding: '16px',
          borderRadius: '4px',
          marginBottom: '16px',
          border: '1px solid #dee2e6'
        }}>
          <h4 style={{ marginBottom: '12px', marginTop: 0 }}>Filter by Date Range</h4>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '12px',
            alignItems: 'end'
          }}>
            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500', fontSize: '12px' }}>
                From Date
              </label>
              <input 
                type="date"
                value={filters.dateFrom}
                onChange={(e) => setFilters({...filters, dateFrom: e.target.value})}
                style={{
                  width: '100%',
                  padding: '8px',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                  fontFamily: 'inherit'
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500', fontSize: '12px' }}>
                To Date
              </label>
              <input 
                type="date"
                value={filters.dateTo}
                onChange={(e) => setFilters({...filters, dateTo: e.target.value})}
                style={{
                  width: '100%',
                  padding: '8px',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                  fontFamily: 'inherit'
                }}
              />
            </div>
            <div>
              <button 
                onClick={() => setFilters({...filters, dateFrom: getLast30Days(), dateTo: getToday()})}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#007bff',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap'
                }}
              >
                Last 30 Days
              </button>
              <button 
                onClick={() => setFilters({...filters, dateFrom: '', dateTo: ''})}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#6c757d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  marginLeft: '8px',
                  whiteSpace: 'nowrap'
                }}
              >
                Clear Dates
              </button>
            </div>
          </div>
        </div>

        {calls.length === 0 && !loading ? (
          <div className="no-calls">
            <p>No calls found with current filters</p>
          </div>
        ) : (
          <>
            <div className="calls-table">
              <table>
                <thead>
                  <tr>
                    <th>SL NO</th>
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
                      Process
                      <div className="header-filter-container">
                        <input 
                          className="col-filter" 
                          placeholder="Search Process..." 
                          value={filters.process}
                          onChange={(e) => setFilters({...filters, process: e.target.value})}
                        />
                      </div>
                    </th>
                    <th>Date & Time</th>
                    <th>Duration</th>
                    <th>
                      Status
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
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {calls.map((call, index) => (
                    <tr key={call._id}>
                      <td>{(page - 1) * pagination.limit + index + 1}</td>
                      <td className="bold">{call.callId}</td>
                      <td>{call.agentName}</td>
                      <td>{call.process || 'General'}</td>
                      <td>{new Date(call.date).toLocaleString()}</td>
                      <td>{call.duration || '00:00'}</td>
                      <td>
                        <span className={`status-pill ${call.status}`}>
                          • {call.status.charAt(0).toUpperCase() + call.status.slice(1)}
                        </span>
                      </td>
                      <td>
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
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
          </>
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

export default Calls;
