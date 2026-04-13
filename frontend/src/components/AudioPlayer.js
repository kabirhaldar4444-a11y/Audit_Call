import React, { useState, useRef, useEffect } from 'react';
import './AudioPlayer.css';
import { FiPlay, FiPause, FiX, FiActivity, FiVolume, FiVolume2 } from 'react-icons/fi';
import { FaHeadphones } from 'react-icons/fa';

const AudioPlayer = ({ audioUrl, callInfo, onClose }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [audioError, setAudioError] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const audioRef = useRef(null);

  useEffect(() => {
    setAudioError(false);
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackSpeed;
    }
  }, [audioUrl, playbackSpeed]);

  const handlePlayPause = () => {
    if (audioError) return;
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play().catch(err => {
          console.error("Playback error:", err);
          setAudioError(true);
        });
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleSkip = (seconds) => {
    if (audioRef.current) {
      audioRef.current.currentTime = Math.max(0, Math.min(duration, audioRef.current.currentTime + seconds));
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  const handleProgressChange = (e) => {
    if (audioRef.current) {
      audioRef.current.currentTime = (e.target.value / 100) * duration;
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const formatTime = (time) => {
    if (!time || isNaN(time)) return '00:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="audio-player-overlay">
      <div className="audio-player-modal premium">
        <div className="player-header">
          <div className="title-section">
            <FaHeadphones className="header-icon" />
            <h3>Call Recording</h3>
          </div>
          <button className="close-btn" onClick={onClose}>
            <FiX size={20} />
          </button>
        </div>

        <div className="player-body">
          <div className="call-meta">
            <h4>Call with {callInfo?.phoneNumber || 'Customer'}</h4>
            <p>Duration: {formatTime(duration)}</p>
            {audioUrl.startsWith('http') && (
              <a href={audioUrl} target="_blank" rel="noopener noreferrer" className="external-source-link">
                🔗 Open Original Link
              </a>
            )}
          </div>

          <div className="visualizer-mock">
            <FiActivity className="wave-icon" />
            <div className="waves">
              <span></span><span></span><span></span><span></span><span></span>
              <span></span><span></span><span></span><span></span><span></span>
            </div>
          </div>
          {audioError && (
            <div className="audio-error-msg">
              <p>Unable to play audio directly.</p>
              <p>Please use the <strong>Open Original Link</strong> above.</p>
            </div>
          )}


          <div className="progress-section">
            <input
              type="range"
              min="0"
              max="100"
              value={duration ? (currentTime / duration) * 100 : 0}
              onChange={handleProgressChange}
              className="styled-progress"
            />
            <div className="time-info">
              {formatTime(currentTime)} / {formatTime(duration)}
            </div>
          </div>

          <div className="main-controls">
            <button onClick={() => handleSkip(-30)} className="minor-btn"><FiPlay style={{transform: 'rotate(180deg)'}} /></button>
            <button onClick={handlePlayPause} className="master-play">
              {isPlaying ? <FiPause /> : <FiPlay />}
            </button>
            <button onClick={() => handleSkip(30)} className="minor-btn"><FiPlay /></button>
          </div>

          <div className="sub-controls">
            <button onClick={() => handleSkip(-10)} className="step-btn">⏪ -10 sec</button>
            <div className="speed-control">
              <div className="speed-slider-wrapper">
                <FiVolume className="speed-icon" />
                <input 
                  type="range"
                  min="0.5"
                  max="5"
                  step="0.1"
                  value={playbackSpeed}
                  onChange={(e) => setPlaybackSpeed(parseFloat(e.target.value))}
                  className="speed-slider"
                  style={{ '--progress': `${((playbackSpeed - 0.5) / 4.5) * 100}%` }}
                />
                <FiVolume2 className="speed-icon" />
              </div>
              <span className="speed-value">{playbackSpeed}x Speed</span>
            </div>
            <button onClick={() => handleSkip(10)} className="step-btn">+10 sec ⏩</button>
          </div>
        </div>

        <audio
          ref={audioRef}
          src={audioUrl}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onEnded={() => setIsPlaying(false)}
          onError={() => setAudioError(true)}
        />
      </div>
    </div>
  );
};

export default AudioPlayer;

