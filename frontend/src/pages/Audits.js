import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import './Audits.css';

const Audits = () => {
  const [audits, setAudits] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAudits = async () => {
      try {
        const response = await api.get('/audits');
        setAudits(response.data.data);
      } catch (error) {
        console.error('Error fetching audits:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAudits();
  }, []);

  if (loading) {
    return <div className="audits-loading">Loading audits...</div>;
  }

  return (
    <div className="audits-container">
      <div className="audits-header">
        <h2>Audits</h2>
        <p>Review submitted audits and scores</p>
      </div>

      {audits.length === 0 ? (
        <div className="no-audits">
          <p>No audits submitted yet</p>
        </div>
      ) : (
        <div className="audits-list">
          {audits.map((audit) => (
            <div key={audit._id} className="audit-card">
              <div className="audit-header">
                <h3>Call: {audit.callId?.callId || 'N/A'}</h3>
                <div className="overall-score">
                  <span className="score-label">Overall Score</span>
                  <span className="score-value">{audit.overallScore}/5</span>
                </div>
              </div>

              <div className="audit-scores">
                <div className="score-item">
                  <span>Greeting Quality:</span>
                  <span className="score">{audit.scores.greetingQuality || '-'}/5</span>
                </div>
                <div className="score-item">
                  <span>Communication Clarity:</span>
                  <span className="score">{audit.scores.communicationClarity || '-'}/5</span>
                </div>
                <div className="score-item">
                  <span>Compliance Adherence:</span>
                  <span className="score">{audit.scores.complianceAdherence || '-'}/5</span>
                </div>
                <div className="score-item">
                  <span>Resolution Quality:</span>
                  <span className="score">{audit.scores.resolutionQuality || '-'}/5</span>
                </div>
                <div className="score-item">
                  <span>Customer Satisfaction:</span>
                  <span className="score">{audit.scores.customerSatisfaction || '-'}/5</span>
                </div>
              </div>

              {audit.remarks && (
                <div className="audit-remarks">
                  <strong>Remarks:</strong>
                  <p>{audit.remarks}</p>
                </div>
              )}

              <div className="audit-footer">
                <span className="audit-date">
                  {new Date(audit.createdAt).toLocaleDateString()}
                </span>
                <span className="audit-status">✅ Completed</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Audits;
