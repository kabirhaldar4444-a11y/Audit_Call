import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import AudioPlayer from '../components/AudioPlayer';
import './Calls.css';

const Calls = () => {
  const [calls, setCalls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedAudio, setSelectedAudio] = useState(null);

  useEffect(() => {
    const fetchCalls = async () => {
      try {
        const response = await api.get('/calls');
        setCalls(response.data.data);
      } catch (error) {
        console.error('Error fetching calls:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCalls();
  }, []);

  if (loading) {
    return <div className="calls-loading">Loading calls...</div>;
  }

  return (
    <div className="calls-container">
      <div className="calls-header">
        <h2>Calls</h2>
        <p>Manage and audit your call recordings</p>
      </div>

      {calls.length === 0 ? (
        <div className="no-calls">
          <p>No calls uploaded yet</p>
        </div>
      ) : (
        <div className="calls-table">
          <table>
            <thead>
              <tr>
                <th>Call ID</th>
                <th>Agent</th>
                <th>Customer</th>
                <th>Date</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {calls.map((call) => (
                <tr key={call._id}>
                  <td>{call.callId}</td>
                  <td>{call.agentName}</td>
                  <td>{call.customerName}</td>
                  <td>{new Date(call.date).toLocaleDateString()}</td>
                  <td>
                    <span className={`status ${call.status}`}>
                      {call.status === 'pending' ? '⏳ Pending' : '✅ Audited'}
                    </span>
                  </td>
                  <td>
                    <button
                      className="play-btn"
                      onClick={() => setSelectedAudio(call.audioUrl)}
                      title="Play recording"
                    >
                      🎧 Play
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selectedAudio && (
        <AudioPlayer audioUrl={selectedAudio} onClose={() => setSelectedAudio(null)} />
      )}
    </div>
  );
};

export default Calls;
