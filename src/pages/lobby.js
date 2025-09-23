import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useSocket from '../hooks/useSocket';
import PlayerList from '../components/PlayerList';
import RoomList from '../components/RoomList';
import { checkBrowserSession, setupLogoutListener, clearBrowserSession, startSessionHeartbeat } from '../utils/browserSession';

const LobbyPage = () => {
  const [playerName, setPlayerName] = useState('');
  const [rooms, setRooms] = useState([]);
  const [players, setPlayers] = useState([]);
  const [showCreateRoom, setShowCreateRoom] = useState(false);
  const [roomName, setRoomName] = useState('');
  const [maxPlayers, setMaxPlayers] = useState(4);
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);
  const navigate = useNavigate();
  
  const { socket, isConnected, disconnect } = useSocket();

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
      console.log('🚫 Session mismatch. Browser session:', currentSession.user, 'Stored name:', storedName);
      navigate('/');
      return;
    }
    
    // Store in sessionStorage for this tab
    sessionStorage.setItem('playerName', storedName);
    setPlayerName(storedName);
    
    // Start session heartbeat to keep session alive
    const cleanupHeartbeat = startSessionHeartbeat(storedName);
    
    return () => {
      cleanupLogoutListener();
      cleanupHeartbeat();
    };
  }, [navigate]);

  useEffect(() => {
    const storedName = sessionStorage.getItem('playerName');
    
    if (socket && isConnected && storedName) {
      // Join lobby
      socket.emit('join-lobby', { name: storedName });

      // Listen for lobby events
      socket.on('lobby-joined', (data) => {
        setRooms(data.rooms);
      });

      socket.on('room-list-updated', (updatedRooms) => {
        setRooms(updatedRooms);
      });

      socket.on('player-list-updated', (updatedPlayers) => {
        setPlayers(updatedPlayers);
      });

      socket.on('room-created', (room) => {
        setIsCreatingRoom(false);
        // Store room info in localStorage for persistence
        localStorage.setItem('currentRoom', JSON.stringify({
          id: room.id,
          name: room.name,
          isHost: true
        }));
        navigate(`/game/${room.id}`);
      });

      socket.on('room-joined', (room) => {
        // Store room info in localStorage for persistence
        localStorage.setItem('currentRoom', JSON.stringify({
          id: room.id,
          name: room.name,
          isHost: false
        }));
        navigate(`/game/${room.id}`);
      });

      socket.on('join-room-error', (error) => {
        alert(error);
      });

      socket.on('name-taken', (data) => {
        alert(`❌ ${data.message}`);
        // Redirect back to login page to choose a different name
        navigate('/?name-conflict=true');
      });

      socket.on('create-room-error', (error) => {
        setIsCreatingRoom(false);
        alert(error);
      });

      return () => {
        socket.off('lobby-joined');
        socket.off('room-list-updated');
        socket.off('player-list-updated');
        socket.off('room-created');
        socket.off('room-joined');
        socket.off('join-room-error');
        socket.off('name-taken');
        socket.off('create-room-error');
      };
    }
  }, [socket, isConnected, navigate]);

  const checkRoomNameAvailability = async (name) => {
    try {
      const response = await fetch('http://localhost:3001/api/check-room-name', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name: name.trim() })
      });
      
      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Error checking room name availability:', error);
      return { available: true, message: 'Unable to check room name availability' };
    }
  };

  const handleCreateRoom = async (e) => {
    e.preventDefault();

    if (!roomName.trim()) {
      alert('Please enter a room name');
      return;
    }

    if (roomName.trim().length < 3) {
      alert('Room name must be at least 3 characters long');
      return;
    }

    if (roomName.trim().length > 30) {
      alert('Room name must be less than 30 characters');
      return;
    }

    // Check if room name is available
    const nameCheck = await checkRoomNameAvailability(roomName.trim());
    if (!nameCheck.available) {
      alert(`❌ ${nameCheck.message}`);
      return;
    }

    if (socket && !isCreatingRoom) {
      setIsCreatingRoom(true);
      socket.emit('create-room', {
        name: roomName.trim(),
        maxPlayers: maxPlayers
      });
    }

    setShowCreateRoom(false);
    setRoomName('');
  };

  const handleJoinRoom = (roomId) => {
    if (socket) {
      socket.emit('join-room', roomId);
    }
  };

  const handleLogout = () => {
    clearBrowserSession(); // Clear browser-wide session
    disconnect(); // Properly disconnect the socket
    navigate('/?logout=true');
  };

  if (!isConnected) {
    return (
      <div className="lobby-container">
        <div className="loading">Connecting to server...</div>
      </div>
    );
  }

  return (
    <div className="lobby-container">
      <header className="lobby-header">
        <h1>Game Lobby</h1>
        <div className="connection-info">
          <div className="socket-id">
            Socket ID: {socket?.id || 'Not connected'}
          </div>
        </div>
        <div className="player-info">
          <span>Welcome, {playerName}!</span>
          <button onClick={handleLogout} className="logout-button">
            Logout
          </button>
        </div>
      </header>

      <div className="lobby-content">
        <div className="rooms-section">
          <div className="section-header">
            <h2>Game Rooms</h2>
            <button
              onClick={() => setShowCreateRoom(true)}
              className="create-room-button"
            >
              Create Room
            </button>
          </div>
          
          <RoomList rooms={rooms} onJoinRoom={handleJoinRoom} />
        </div>

        <div className="players-section">
          <h2>Players Online</h2>
          <PlayerList players={players} />
        </div>
      </div>

      {showCreateRoom && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>Create New Room</h3>
            <form onSubmit={handleCreateRoom}>
              <div className="form-group">
                <label htmlFor="roomName">Room Name:</label>
                <input
                  type="text"
                  id="roomName"
                  value={roomName}
                  onChange={(e) => setRoomName(e.target.value)}
                  placeholder="Enter room name"
                  maxLength={30}
                  autoFocus
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="maxPlayers">Max Players:</label>
                <select
                  id="maxPlayers"
                  value={maxPlayers}
                  onChange={(e) => setMaxPlayers(parseInt(e.target.value))}
                >
                  <option value={2}>2 Players</option>
                  <option value={3}>3 Players</option>
                  <option value={4}>4 Players</option>
                  <option value={6}>6 Players</option>
                </select>
              </div>
              
              <div className="modal-buttons">
                <button type="submit" className="create-button" disabled={isCreatingRoom}>
                  {isCreatingRoom ? 'Creating...' : 'Create Room'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateRoom(false)}
                  className="cancel-button"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style jsx>{`
        .lobby-container {
          min-height: 100vh;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          padding: 20px;
        }
        
        .loading {
          display: flex;
          justify-content: center;
          align-items: center;
          height: 100vh;
          font-size: 18px;
          color: white;
        }
        
        .lobby-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: white;
          padding: 20px;
          border-radius: 10px;
          margin-bottom: 20px;
          box-shadow: 0 5px 15px rgba(0,0,0,0.1);
        }
        
        .connection-info {
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        
        .socket-id {
          background: #f8f9fa;
          padding: 4px 8px;
          border-radius: 4px;
          font-family: monospace;
          font-size: 12px;
          color: #666;
          border: 1px solid #e9ecef;
        }
        
        .lobby-header h1 {
          margin: 0;
          color: #333;
        }
        
        .player-info {
          display: flex;
          align-items: center;
          gap: 15px;
        }
        
        .logout-button {
          padding: 8px 16px;
          background: #e74c3c;
          color: white;
          border: none;
          border-radius: 5px;
          cursor: pointer;
          transition: background 0.3s;
        }
        
        .logout-button:hover {
          background: #c0392b;
        }
        
        .lobby-content {
          display: grid;
          grid-template-columns: 2fr 1fr;
          gap: 20px;
        }
        
        .rooms-section,
        .players-section {
          background: white;
          padding: 20px;
          border-radius: 10px;
          box-shadow: 0 5px 15px rgba(0,0,0,0.1);
        }
        
        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }
        
        .section-header h2,
        .players-section h2 {
          margin: 0 0 20px 0;
          color: #333;
        }
        
        .create-room-button {
          padding: 10px 20px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border: none;
          border-radius: 5px;
          cursor: pointer;
          transition: transform 0.2s;
        }
        
        .create-room-button:hover {
          transform: translateY(-2px);
        }
        
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0,0,0,0.5);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 1000;
        }
        
        .modal {
          background: white;
          padding: 30px;
          border-radius: 10px;
          width: 100%;
          max-width: 400px;
          box-shadow: 0 10px 25px rgba(0,0,0,0.2);
        }
        
        .modal h3 {
          margin: 0 0 20px 0;
          text-align: center;
          color: #333;
        }
        
        .form-group {
          margin-bottom: 20px;
        }
        
        .form-group label {
          display: block;
          margin-bottom: 8px;
          color: #555;
          font-weight: 500;
        }
        
        .form-group input,
        .form-group select {
          width: 100%;
          padding: 12px;
          border: 2px solid #ddd;
          border-radius: 5px;
          font-size: 16px;
        }
        
        .modal-buttons {
          display: flex;
          gap: 10px;
          justify-content: flex-end;
        }
        
        .create-button {
          padding: 10px 20px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border: none;
          border-radius: 5px;
          cursor: pointer;
        }
        
        .cancel-button {
          padding: 10px 20px;
          background: #95a5a6;
          color: white;
          border: none;
          border-radius: 5px;
          cursor: pointer;
        }
        
        @media (max-width: 768px) {
          .lobby-content {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
};

export default LobbyPage;
