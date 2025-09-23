import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { clearBrowserSession } from '../utils/browserSession';

const ResetPage = () => {
  const [message, setMessage] = useState('');
  const [isResetting, setIsResetting] = useState(false);
  const navigate = useNavigate();

  const handleResetBrowserSession = () => {
    clearBrowserSession();
    setMessage('✅ Browser session cleared successfully!');
    setTimeout(() => {
      navigate('/');
    }, 2000);
  };

  const handleResetServer = async () => {
    setIsResetting(true);
    try {
      const response = await fetch('http://localhost:3001/admin/reset', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        setMessage('✅ Server reset successfully! All rooms and players cleared.');
      } else {
        setMessage('❌ Failed to reset server. Make sure server is running.');
      }
    } catch (error) {
      setMessage('❌ Error connecting to server: ' + error.message);
    }
    setIsResetting(false);
  };

  const handleFullReset = async () => {
    setIsResetting(true);
    
    // Clear browser session
    clearBrowserSession();
    
    // Clear all localStorage
    localStorage.clear();
    sessionStorage.clear();
    
    // Reset server
    try {
      await fetch('http://localhost:3001/admin/reset', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      setMessage('✅ Full reset completed! Browser and server cleared.');
    } catch (error) {
      setMessage('✅ Browser cleared. Server reset failed: ' + error.message);
    }
    
    setIsResetting(false);
    
    setTimeout(() => {
      window.location.href = '/';
    }, 2000);
  };

  const handleClearAllStorage = () => {
    localStorage.clear();
    sessionStorage.clear();
    setMessage('✅ All browser storage cleared!');
    setTimeout(() => {
      navigate('/');
    }, 2000);
  };

  const handleGetServerStats = async () => {
    try {
      const response = await fetch('http://localhost:3001/admin/stats');
      if (response.ok) {
        const stats = await response.json();
        setMessage(`📊 Server Stats: ${stats.rooms} rooms, ${stats.players} players, ${stats.connectedClients} connected clients, uptime: ${Math.floor(stats.uptime)}s`);
      } else {
        setMessage('❌ Failed to get server stats.');
      }
    } catch (error) {
      setMessage('❌ Error: ' + error.message);
    }
  };

  const handleGetCurrentPlayers = async () => {
    try {
      const response = await fetch('http://localhost:3001/debug/rooms');
      if (response.ok) {
        const data = await response.json();
        const playerNames = data.players.map(p => p.name).join(', ');
        setMessage(`👥 Current Players (${data.players.length}): ${playerNames || 'None'}`);
      } else {
        setMessage('❌ Failed to get current players.');
      }
    } catch (error) {
      setMessage('❌ Error: ' + error.message);
    }
  };

  const handleGetCurrentRooms = async () => {
    try {
      const response = await fetch('http://localhost:3001/debug/rooms');
      if (response.ok) {
        const data = await response.json();
        const roomNames = data.rooms.map(r => `"${r.name}" (${r.players.length}/${r.maxPlayers})`).join(', ');
        setMessage(`🏠 Current Rooms (${data.rooms.length}): ${roomNames || 'None'}`);
      } else {
        setMessage('❌ Failed to get current rooms.');
      }
    } catch (error) {
      setMessage('❌ Error: ' + error.message);
    }
  };

  return (
    <div className="reset-container">
      <div className="reset-card">
        <h1>🔧 Game Reset Center</h1>
        <p>Use these tools to reset different parts of the game system.</p>
        
        {message && (
          <div className={`message ${message.includes('❌') ? 'error' : 'success'}`}>
            {message}
          </div>
        )}
        
        <div className="reset-options">
          <div className="reset-option">
            <h3>🚪 Reset Browser Session</h3>
            <p>Logout current user and clear browser session</p>
            <button 
              onClick={handleResetBrowserSession}
              className="reset-button session-reset"
            >
              Reset Session
            </button>
          </div>
          
          <div className="reset-option">
            <h3>🗑️ Clear All Storage</h3>
            <p>Clear all localStorage and sessionStorage data</p>
            <button 
              onClick={handleClearAllStorage}
              className="reset-button storage-reset"
            >
              Clear Storage
            </button>
          </div>
          
          <div className="reset-option">
            <h3>🖥️ Reset Server</h3>
            <p>Clear all rooms and players on the server</p>
            <button 
              onClick={handleResetServer}
              disabled={isResetting}
              className="reset-button server-reset"
            >
              {isResetting ? 'Resetting...' : 'Reset Server'}
            </button>
          </div>
          
          <div className="reset-option">
            <h3>📊 Server Stats</h3>
            <p>Get current server statistics</p>
            <button 
              onClick={handleGetServerStats}
              className="reset-button stats-button"
            >
              Get Stats
            </button>
          </div>

          <div className="reset-option">
            <h3>👥 Current Players</h3>
            <p>See who is currently online</p>
            <button 
              onClick={handleGetCurrentPlayers}
              className="reset-button players-button"
            >
              Show Players
            </button>
          </div>

          <div className="reset-option">
            <h3>🏠 Current Rooms</h3>
            <p>See all active game rooms</p>
            <button 
              onClick={handleGetCurrentRooms}
              className="reset-button rooms-button"
            >
              Show Rooms
            </button>
          </div>
          
          <div className="reset-option danger">
            <h3>💥 Full Reset</h3>
            <p>Reset everything: browser, storage, and server</p>
            <button 
              onClick={handleFullReset}
              disabled={isResetting}
              className="reset-button full-reset"
            >
              {isResetting ? 'Resetting...' : 'Full Reset'}
            </button>
          </div>
        </div>
        
        <div className="navigation">
          <button onClick={() => navigate('/')} className="nav-button">
            ← Back to Login
          </button>
        </div>
      </div>
      
      <style jsx>{`
        .reset-container {
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 100vh;
          background: linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%);
          padding: 20px;
        }
        
        .reset-card {
          background: white;
          padding: 40px;
          border-radius: 15px;
          box-shadow: 0 15px 35px rgba(0,0,0,0.1);
          width: 100%;
          max-width: 700px;
        }
        
        h1 {
          text-align: center;
          margin-bottom: 10px;
          color: #333;
          font-size: 32px;
        }
        
        p {
          text-align: center;
          color: #666;
          margin-bottom: 30px;
        }
        
        .message {
          padding: 15px;
          border-radius: 8px;
          margin-bottom: 20px;
          text-align: center;
          font-weight: 500;
          word-break: break-word;
        }
        
        .message.success {
          background: #d4edda;
          color: #155724;
          border: 1px solid #c3e6cb;
        }
        
        .message.error {
          background: #f8d7da;
          color: #721c24;
          border: 1px solid #f5c6cb;
        }
        
        .reset-options {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
          margin-bottom: 30px;
        }
        
        .reset-option {
          padding: 20px;
          border: 2px solid #e9ecef;
          border-radius: 10px;
          text-align: center;
          transition: border-color 0.3s;
        }
        
        .reset-option:hover {
          border-color: #dee2e6;
        }
        
        .reset-option.danger {
          border-color: #dc3545;
          background: #fff5f5;
          grid-column: 1 / -1;
        }
        
        .reset-option h3 {
          margin: 0 0 10px 0;
          color: #333;
          font-size: 18px;
        }
        
        .reset-option p {
          margin: 0 0 15px 0;
          font-size: 14px;
          text-align: center;
        }
        
        .reset-button {
          width: 100%;
          padding: 12px 20px;
          border: none;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.3s;
        }
        
        .reset-button:hover:not(:disabled) {
          transform: translateY(-2px);
        }
        
        .reset-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        
        .session-reset {
          background: #17a2b8;
          color: white;
        }
        
        .session-reset:hover {
          background: #138496;
        }
        
        .storage-reset {
          background: #ffc107;
          color: #212529;
        }
        
        .storage-reset:hover {
          background: #e0a800;
        }
        
        .server-reset {
          background: #fd7e14;
          color: white;
        }
        
        .server-reset:hover {
          background: #e8650e;
        }
        
        .stats-button {
          background: #28a745;
          color: white;
        }
        
        .stats-button:hover {
          background: #218838;
        }
        
        .players-button {
          background: #6f42c1;
          color: white;
        }
        
        .players-button:hover {
          background: #5a32a3;
        }
        
        .rooms-button {
          background: #e67e22;
          color: white;
        }
        
        .rooms-button:hover {
          background: #d35400;
        }
        
        .full-reset {
          background: #dc3545;
          color: white;
        }
        
        .full-reset:hover {
          background: #c82333;
        }
        
        .navigation {
          text-align: center;
          padding-top: 20px;
          border-top: 1px solid #e9ecef;
        }
        
        .nav-button {
          padding: 10px 20px;
          background: #6c757d;
          color: white;
          border: none;
          border-radius: 5px;
          cursor: pointer;
          transition: background 0.3s;
        }
        
        .nav-button:hover {
          background: #5a6268;
        }
        
        @media (max-width: 768px) {
          .reset-options {
            grid-template-columns: 1fr;
          }
          
          .reset-card {
            padding: 20px;
          }
        }
      `}</style>
    </div>
  );
};

export default ResetPage;
