import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import useSocket from '../hooks/useSocket';
import GameRoom from '../components/GameRoom';
import { checkBrowserSession, setupLogoutListener, clearBrowserSession } from '../utils/browserSession';

const GamePage = () => {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const [room, setRoom] = useState(null);
  const [playerName, setPlayerName] = useState('');
  const [gameState, setGameState] = useState('waiting'); // waiting, playing, finished
  const [error, setError] = useState('');
  
  const { socket, isConnected } = useSocket();

  useEffect(() => {
    // Set up listener for forced logout from other tabs
    const cleanupLogoutListener = setupLogoutListener(() => {
      alert('🚫 You have been logged out because someone else logged in this browser.');
      clearBrowserSession();
      navigate('/?logout=true');
    });
    
    // Check browser session first
    const currentSession = checkBrowserSession();
    if (!currentSession) {
      navigate('/');
      return;
    }
    
    // Get player name from sessionStorage first (unique per tab), fallback to localStorage
    let storedName = sessionStorage.getItem('playerName');
    if (!storedName) {
      storedName = localStorage.getItem('playerName');
    }
    
    if (!storedName) {
      navigate('/');
      return;
    }
    
    // Verify the stored name matches the browser session
    if (currentSession.user !== storedName) {
      console.log('🚫 Session mismatch in game page. Browser session:', currentSession.user, 'Stored name:', storedName);
      navigate('/');
      return;
    }
    
    // Store in sessionStorage for this tab
    sessionStorage.setItem('playerName', storedName);
    setPlayerName(storedName);
    
    return cleanupLogoutListener;
  }, [navigate]);

  useEffect(() => {
    const storedName = sessionStorage.getItem('playerName');
    
    if (socket && isConnected && roomId && storedName) {
      console.log('🎮 Game page: Socket ID:', socket.id, 'Joining room:', roomId);
      
      // Since socket persists, we should already be in lobby, just join the room
      console.log('🎯 Game page: Attempting to join room:', roomId);
      socket.emit('join-room', roomId);

      // Listen for room events
      socket.on('room-joined', (roomData) => {
        setRoom(roomData);
        setGameState(roomData.status || 'waiting');
      });

      socket.on('player-joined-room', (data) => {
        setRoom(data.room);
      });

      socket.on('player-left-room', (data) => {
        setRoom(data.room);
      });

      socket.on('game-started', (roomData) => {
        setRoom(roomData);
        setGameState('playing');
      });

      socket.on('join-room-error', (errorMessage) => {
        setError(errorMessage);
        setTimeout(() => {
          navigate('/lobby');
        }, 3000);
      });

      // Game-specific events
      socket.on('game-updated', (gameData) => {
        // Handle game state updates
        console.log('Game updated:', gameData);
      });

      socket.on('game-ended', (result) => {
        setGameState('finished');
        console.log('Game ended:', result);
      });

      socket.on('name-taken', (data) => {
        alert(`❌ ${data.message}`);
        // Redirect back to login page to choose a different name
        navigate('/?name-conflict=true');
      });

      return () => {
        socket.off('lobby-joined');
        socket.off('room-joined');
        socket.off('player-joined-room');
        socket.off('player-left-room');
        socket.off('game-started');
        socket.off('join-room-error');
        socket.off('game-updated');
        socket.off('game-ended');
        socket.off('name-taken');
      };
    }
  }, [socket, isConnected, roomId, navigate]);

  const handleStartGame = () => {
    if (socket && room) {
      socket.emit('start-game', room.id);
    }
  };

  const handleLeaveRoom = () => {
    // Clear room info from localStorage
    localStorage.removeItem('currentRoom');
    navigate('/lobby');
  };

  const handleGameAction = (action, data) => {
    if (socket && room) {
      socket.emit('game-action', {
        roomId: room.id,
        action,
        data
      });
    }
  };

  if (!isConnected) {
    return (
      <div className="game-container">
        <div className="loading">Connecting to server...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="game-container">
        <div className="error-container">
          <h2>Error</h2>
          <p>{error}</p>
          <p>Redirecting to lobby...</p>
        </div>
      </div>
    );
  }

  if (!room) {
    return (
      <div className="game-container">
        <div className="loading">Loading room...</div>
      </div>
    );
  }

  return (
    <div className="game-container">
      <header className="game-header">
        <div className="room-info">
          <h1>{room.name}</h1>
          <span className="room-status">
            Status: {gameState === 'waiting' ? 'Waiting for players' : 
                    gameState === 'playing' ? 'Game in progress' : 'Game finished'}
          </span>
          <div className="socket-id">
            Socket ID: {socket?.id || 'Not connected'}
          </div>
        </div>
        
        <div className="player-info">
          <span>Welcome, {playerName}!</span>
        </div>
        
        <div className="game-controls">
          <span className="player-count">
            {room.players.length}/{room.maxPlayers} players
          </span>
          
          {gameState === 'waiting' && room.players.length >= 2 && (
            <button onClick={handleStartGame} className="start-game-button">
              Start Game
            </button>
          )}
          
          <button onClick={handleLeaveRoom} className="leave-room-button">
            Leave Room
          </button>
        </div>
      </header>

      <div className="game-content">
        <GameRoom
          room={room}
          gameState={gameState}
          playerName={playerName}
          onGameAction={handleGameAction}
        />
      </div>

      <style jsx>{`
        .game-container {
          min-height: 100vh;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          padding: 20px;
        }
        
        .loading,
        .error-container {
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          height: 100vh;
          color: white;
          text-align: center;
        }
        
        .error-container h2 {
          color: #e74c3c;
          margin-bottom: 20px;
        }
        
        .game-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: white;
          padding: 20px;
          border-radius: 10px;
          margin-bottom: 20px;
          box-shadow: 0 5px 15px rgba(0,0,0,0.1);
        }
        
        .player-info {
          display: flex;
          align-items: center;
          gap: 15px;
        }
        
        .player-info span {
          font-weight: 500;
          font-size: 16px;
          color: #333;
        }
        
        .room-info h1 {
          margin: 0 0 5px 0;
          color: #333;
          font-size: 24px;
        }
        
        .room-status {
          color: #666;
          font-size: 14px;
        }
        
        .socket-id {
          background: #f8f9fa;
          padding: 4px 8px;
          border-radius: 4px;
          font-family: monospace;
          font-size: 12px;
          color: #666;
          border: 1px solid #e9ecef;
          margin-top: 5px;
          display: inline-block;
        }
        
        .game-controls {
          display: flex;
          align-items: center;
          gap: 15px;
        }
        
        .player-count {
          background: #f8f9fa;
          padding: 8px 12px;
          border-radius: 20px;
          font-size: 14px;
          color: #666;
        }
        
        .start-game-button {
          padding: 10px 20px;
          background: #27ae60;
          color: white;
          border: none;
          border-radius: 5px;
          cursor: pointer;
          font-weight: bold;
          transition: background 0.3s;
        }
        
        .start-game-button:hover {
          background: #219a52;
        }
        
        .leave-room-button {
          padding: 10px 20px;
          background: #e74c3c;
          color: white;
          border: none;
          border-radius: 5px;
          cursor: pointer;
          transition: background 0.3s;
        }
        
        .leave-room-button:hover {
          background: #c0392b;
        }
        
        .game-content {
          background: white;
          border-radius: 10px;
          box-shadow: 0 5px 15px rgba(0,0,0,0.1);
          overflow: hidden;
        }
        
        @media (max-width: 768px) {
          .game-header {
            flex-direction: column;
            gap: 15px;
            text-align: center;
          }
          
          .game-controls {
            flex-wrap: wrap;
            justify-content: center;
          }
        }
      `}</style>
    </div>
  );
};

export default GamePage;
