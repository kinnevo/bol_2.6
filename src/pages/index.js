import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const LoginPage = () => {
  const [playerName, setPlayerName] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  // Clear any existing session data on load
  useEffect(() => {
    // Check if user is coming from a logout or server restart
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('logout') === 'true' || urlParams.get('restart') === 'true') {
      sessionStorage.clear();
      localStorage.removeItem('playerName');
      localStorage.removeItem('currentRoom');
      localStorage.removeItem('serverSessionId');
    }
  }, []);

  const handleLogin = (e) => {
    e.preventDefault();
    
    if (!playerName.trim()) {
      setError('Please enter your name');
      return;
    }

    if (playerName.trim().length < 2) {
      setError('Name must be at least 2 characters long');
      return;
    }

    // Store player name in sessionStorage (unique per tab/window)
    sessionStorage.setItem('playerName', playerName.trim());
    // Also store in localStorage for server restart detection
    localStorage.setItem('playerName', playerName.trim());
    
    // Navigate to lobby
    navigate('/lobby');
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <h1>Welcome to the Game</h1>
        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label htmlFor="playerName">Enter your name:</label>
            <input
              type="text"
              id="playerName"
              value={playerName}
              onChange={(e) => {
                setPlayerName(e.target.value);
                setError(''); // Clear error when user types
              }}
              placeholder="Your name"
              maxLength={20}
              autoFocus
            />
          </div>
          {error && <div className="error-message">{error}</div>}
          <button type="submit" className="login-button">
            Join Game
          </button>
        </form>
      </div>
      
      <style jsx>{`
        .login-container {
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 100vh;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          padding: 20px;
        }
        
        .login-card {
          background: white;
          padding: 40px;
          border-radius: 10px;
          box-shadow: 0 10px 25px rgba(0,0,0,0.1);
          width: 100%;
          max-width: 400px;
        }
        
        h1 {
          text-align: center;
          margin-bottom: 30px;
          color: #333;
          font-size: 28px;
        }
        
        .form-group {
          margin-bottom: 20px;
        }
        
        label {
          display: block;
          margin-bottom: 8px;
          color: #555;
          font-weight: 500;
        }
        
        input {
          width: 100%;
          padding: 12px;
          border: 2px solid #ddd;
          border-radius: 5px;
          font-size: 16px;
          transition: border-color 0.3s;
        }
        
        input:focus {
          outline: none;
          border-color: #667eea;
        }
        
        .login-button {
          width: 100%;
          padding: 12px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border: none;
          border-radius: 5px;
          font-size: 16px;
          cursor: pointer;
          transition: transform 0.2s;
        }
        
        .login-button:hover {
          transform: translateY(-2px);
        }
        
        .error-message {
          color: #e74c3c;
          font-size: 14px;
          margin-top: 5px;
          text-align: center;
        }
      `}</style>
    </div>
  );
};

export default LoginPage;
