import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import useSocket from '../hooks/useSocket';
import GameRoom from '../components/GameRoom';
import { checkBrowserSession, setupLogoutListener, clearBrowserSession } from '../utils/browserSession';

// Conversation Game Component
const ConversationGame = ({ room, gameState, playerName, socket, onGameAction }) => {
  const [currentQuestion] = useState({
    text: "What new experience or skill would make you feel truly alive again?",
    subtitle: "Explore this reinvention question with thoughtful guidance"
  });
  const [conversationFinished, setConversationFinished] = useState(false);
  const [finishedPlayers, setFinishedPlayers] = useState(room.finishedPlayers || []);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const conversationStartedRef = useRef(false);
  const messagesEndRef = useRef(null);

  // Initialize conversation finished state if player is already finished
  useEffect(() => {
    if (room.finishedPlayers && room.finishedPlayers.includes(playerName)) {
      setConversationFinished(true);
    }
  }, [room.finishedPlayers, playerName]);

  useEffect(() => {
    if (socket) {
      // Auto-start conversation when component mounts (only once)
      if (!conversationStartedRef.current) {
        socket.emit('start-conversation', {
          playerName,
          roomId: room.id
        });
        conversationStartedRef.current = true;
      }

      // Request current room state to get existing finished players
      socket.emit('get-room-state', room.id);

      socket.on('room-state-update', (roomData) => {
        if (roomData.finishedPlayers) {
          setFinishedPlayers(roomData.finishedPlayers);
        }
        // Check if current player has finished
        if (roomData.finishedPlayers && roomData.finishedPlayers.includes(playerName)) {
          setConversationFinished(true);
        }
      });

      socket.on('player-finished-conversation', (data) => {
        setFinishedPlayers(prev => {
          if (!prev.includes(data.playerName)) {
            return [...prev, data.playerName];
          }
          return prev;
        });
      });

      socket.on('conversation-message', (data) => {
        setMessages(prev => [...prev, data]);
      });

      return () => {
        socket.off('player-finished-conversation');
        socket.off('conversation-message');
        socket.off('room-state-update');
      };
    }
  }, [socket, playerName, room.id]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleFinishConversation = () => {
    if (socket && !conversationFinished) {
      setConversationFinished(true);
      socket.emit('finish-conversation', { 
        playerName,
        roomId: room.id 
      });
    }
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (newMessage.trim() && socket) {
      const messageData = {
        id: Date.now(),
        text: newMessage.trim(),
        timestamp: new Date().toLocaleTimeString(),
        playerName: playerName,
        roomId: room.id
      };
      
      socket.emit('conversation-message', messageData);
      setNewMessage('');
    }
  };

  const currentPlayer = room.playerNames?.find(p => p.name === playerName);
  const allPlayersFinished = finishedPlayers.length === room.players.length;

  return (
    <div className="conversation-game">
      <div className="game-main">
        <div className="question-section">
          <div className="question-card">
            <h2 className="question-text">{currentQuestion.text}</h2>
            <p className="question-subtitle">{currentQuestion.subtitle}</p>
            <div className="conversation-status">
              <div className={`status-indicator ${conversationFinished ? 'finished' : 'active'}`}>
                {conversationFinished ? '✅ Conversation Finished' : '💬 Your personal conversation is active'}
              </div>
            </div>
          </div>
        </div>

        <div className="conversation-section">
          <div className="conversation-header">
            <h3>Your Personal Conversation</h3>
            <span className="conversation-subtitle">Private session for {playerName}</span>
          </div>

          <div className="conversation-chat">
            <div className="messages-container">
              {messages.length === 0 ? (
                <div className="no-messages">
                  <div className="loading-conversation">
                    <div className="typing-indicator">
                      <span></span>
                      <span></span>
                      <span></span>
                    </div>
                    <p>Your life coach is preparing to meet you...</p>
                  </div>
                </div>
              ) : (
                messages.map((msg) => (
                  <div key={msg.id} className={`message ${msg.isAI ? 'ai-message' : 'user-message'}`}>
                    <div className="message-header">
                      <span className="message-sender">{msg.isAI ? '🧠 Life Coach' : '👤 You'}</span>
                      <span className="message-time">{msg.timestamp}</span>
                    </div>
                    <div className="message-text">{msg.text}</div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            <form onSubmit={handleSendMessage} className="message-form">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Share your thoughts and reflections..."
                className="message-input"
                disabled={conversationFinished}
              />
              <button 
                type="submit" 
                className="send-btn"
                disabled={!newMessage.trim() || conversationFinished}
              >
                Send
              </button>
            </form>

            <div className="conversation-controls">
              <button
                onClick={handleFinishConversation}
                disabled={conversationFinished}
                className={`finish-btn ${conversationFinished ? 'finished' : ''}`}
              >
                {conversationFinished ? '✓ Conversation Finished' : 'Finish Conversation'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="game-sidebar">
        <div className="players-status">
          <h4>Players Progress ({finishedPlayers.length}/{room.players.length})</h4>
          <div className="progress-summary">
            <div className="progress-bar">
              <div 
                className="progress-fill" 
                style={{ width: `${(finishedPlayers.length / room.players.length) * 100}%` }}
              ></div>
            </div>
            <span className="progress-text">
              {finishedPlayers.length === room.players.length 
                ? 'All players finished!' 
                : `${room.players.length - finishedPlayers.length} still conversing`
              }
            </span>
          </div>
          {room.playerNames?.map((player) => {
            const isFinished = finishedPlayers.includes(player.name);
            const isCurrentPlayer = player.name === playerName;
            
            return (
              <div key={player.id} className={`player-status ${isCurrentPlayer ? 'current-player' : ''}`}>
                <div className="player-info">
                  <div className="player-avatar">
                    {player.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="player-details">
                    <span className="player-name">
                      {player.name}
                      {isCurrentPlayer && <span className="you-indicator"> (You)</span>}
                    </span>
                  </div>
                </div>
                <div className={`status-badge ${isFinished ? 'finished' : 'in-progress'}`}>
                  {isFinished ? (
                    <>
                      <span className="status-icon">✅</span>
                      <span className="status-text">Finished</span>
                    </>
                  ) : (
                    <>
                      <span className="status-icon">💬</span>
                      <span className="status-text">In Progress</span>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {allPlayersFinished && (
          <div className="next-phase">
            <h4>🎉 All Players Finished!</h4>
            <p>Ready to move to the next phase of the game.</p>
            <button className="next-phase-btn">
              Continue to Next Phase
            </button>
          </div>
        )}
      </div>

      <style jsx>{`
        .conversation-game {
          display: flex;
          height: 100%;
          gap: 20px;
          min-height: 0;
        }

        .game-main {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 20px;
          min-height: 0;
          overflow: hidden;
        }

        .question-section {
          background: white;
          border-radius: 15px;
          padding: 30px;
          box-shadow: 0 8px 25px rgba(0,0,0,0.1);
          flex-shrink: 0;
        }

        .question-card {
          text-align: center;
          max-width: 800px;
          margin: 0 auto;
        }

        .question-text {
          font-size: 28px;
          color: #2c3e50;
          margin-bottom: 15px;
          line-height: 1.4;
          font-weight: 600;
        }

        .question-subtitle {
          font-size: 16px;
          color: #7f8c8d;
          margin-bottom: 30px;
          font-style: italic;
        }

        .conversation-status {
          margin-top: 20px;
        }

        .status-indicator.active {
          background: linear-gradient(135deg, #27ae60 0%, #2ecc71 100%);
          color: white;
          padding: 12px 24px;
          border-radius: 25px;
          font-size: 16px;
          font-weight: 500;
          display: inline-block;
          box-shadow: 0 4px 15px rgba(39, 174, 96, 0.3);
          animation: pulse 2s infinite;
        }

        .status-indicator.finished {
          background: linear-gradient(135deg, #3498db 0%, #2980b9 100%);
          color: white;
          padding: 12px 24px;
          border-radius: 25px;
          font-size: 16px;
          font-weight: 500;
          display: inline-block;
          box-shadow: 0 4px 15px rgba(52, 152, 219, 0.3);
          animation: none;
        }

        @keyframes pulse {
          0% { transform: scale(1); }
          50% { transform: scale(1.05); }
          100% { transform: scale(1); }
        }

        .conversation-section {
          flex: 1;
          background: white;
          border-radius: 15px;
          padding: 25px;
          box-shadow: 0 8px 25px rgba(0,0,0,0.1);
          display: flex;
          flex-direction: column;
          min-height: 0;
          overflow: hidden;
        }

        .conversation-header {
          margin-bottom: 20px;
          padding-bottom: 15px;
          border-bottom: 2px solid #ecf0f1;
        }

        .conversation-header h3 {
          margin: 0 0 5px 0;
          color: #2c3e50;
          font-size: 20px;
        }

        .conversation-subtitle {
          color: #7f8c8d;
          font-size: 14px;
        }

        .conversation-chat {
          flex: 1;
          display: flex;
          flex-direction: column;
          min-height: 0;
        }

        .messages-container {
          flex: 1;
          min-height: 300px;
          max-height: 400px;
          overflow-y: auto;
          padding: 15px;
          background: #f8f9fa;
          border-radius: 10px;
          margin-bottom: 15px;
          scroll-behavior: smooth;
        }

        .messages-container::-webkit-scrollbar {
          width: 6px;
        }

        .messages-container::-webkit-scrollbar-track {
          background: #e9ecef;
          border-radius: 3px;
        }

        .messages-container::-webkit-scrollbar-thumb {
          background: #3498db;
          border-radius: 3px;
        }

        .messages-container::-webkit-scrollbar-thumb:hover {
          background: #2980b9;
        }

        .no-messages {
          text-align: center;
          color: #7f8c8d;
          padding: 40px 20px;
        }

        .loading-conversation {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 15px;
        }

        .typing-indicator {
          display: flex;
          gap: 4px;
        }

        .typing-indicator span {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #3498db;
          animation: typing 1.4s infinite;
        }

        .typing-indicator span:nth-child(2) {
          animation-delay: 0.2s;
        }

        .typing-indicator span:nth-child(3) {
          animation-delay: 0.4s;
        }

        @keyframes typing {
          0%, 60%, 100% {
            transform: translateY(0);
          }
          30% {
            transform: translateY(-10px);
          }
        }

        .message {
          padding: 16px;
          border-radius: 15px;
          margin-bottom: 16px;
          max-width: 85%;
        }

        .ai-message {
          background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
          border-left: 4px solid #3498db;
          margin-right: auto;
        }

        .user-message {
          background: linear-gradient(135deg, #3498db 0%, #2980b9 100%);
          color: white;
          margin-left: auto;
          text-align: right;
        }

        .message-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
          font-size: 12px;
        }

        .message-sender {
          font-weight: 600;
        }

        .ai-message .message-sender {
          color: #3498db;
        }

        .user-message .message-sender {
          color: rgba(255,255,255,0.9);
        }

        .message-time {
          opacity: 0.7;
        }

        .message-text {
          line-height: 1.5;
          font-size: 14px;
        }

        .ai-message .message-text {
          color: #2c3e50;
        }

        .user-message .message-text {
          color: white;
        }

        .message-form {
          display: flex;
          gap: 10px;
          margin-bottom: 15px;
        }

        .message-input {
          flex: 1;
          padding: 12px 16px;
          border: 2px solid #e0e0e0;
          border-radius: 25px;
          font-size: 14px;
          outline: none;
          transition: border-color 0.3s;
        }

        .message-input:focus {
          border-color: #3498db;
        }

        .send-btn {
          background: #27ae60;
          color: white;
          border: none;
          padding: 12px 20px;
          border-radius: 25px;
          cursor: pointer;
          font-weight: 500;
          transition: background 0.3s;
        }

        .send-btn:hover:not(:disabled) {
          background: #219a52;
        }

        .send-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .conversation-controls {
          text-align: center;
        }

        .finish-btn {
          background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%);
          color: white;
          border: none;
          padding: 12px 30px;
          border-radius: 25px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .finish-btn:hover:not(:disabled) {
          transform: translateY(-1px);
        }

        .finish-btn.finished {
          background: linear-gradient(135deg, #27ae60 0%, #219a52 100%);
        }

        .finish-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
        }

        .game-sidebar {
          width: 300px;
          background: white;
          border-radius: 15px;
          padding: 25px;
          box-shadow: 0 8px 25px rgba(0,0,0,0.1);
          height: fit-content;
        }

        .players-status {
          background: white;
          border-radius: 12px;
          padding: 20px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }

        .players-status h4 {
          margin: 0 0 15px 0;
          color: #2c3e50;
          font-size: 16px;
          font-weight: 600;
          text-align: center;
        }

        .progress-summary {
          margin-bottom: 20px;
          padding-bottom: 15px;
          border-bottom: 2px solid #f8f9fa;
        }

        .progress-bar {
          width: 100%;
          height: 8px;
          background: #e9ecef;
          border-radius: 4px;
          overflow: hidden;
          margin-bottom: 8px;
        }

        .progress-fill {
          height: 100%;
          background: linear-gradient(135deg, #27ae60 0%, #2ecc71 100%);
          border-radius: 4px;
          transition: width 0.3s ease;
        }

        .progress-text {
          display: block;
          text-align: center;
          font-size: 12px;
          color: #666;
          font-weight: 500;
        }

        .player-status {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 12px;
          border-bottom: 1px solid #ecf0f1;
          border-radius: 8px;
          margin-bottom: 8px;
          transition: all 0.3s ease;
        }

        .player-status:hover {
          background: #f8f9fa;
        }

        .player-status.current-player {
          background: linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%);
          border: 2px solid #2196f3;
          box-shadow: 0 2px 8px rgba(33, 150, 243, 0.2);
        }

        .player-info {
          display: flex;
          align-items: center;
          gap: 12px;
          flex: 1;
        }

        .player-avatar {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
          font-size: 16px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }

        .player-details {
          flex: 1;
        }

        .player-name {
          font-weight: 600;
          color: #2c3e50;
          font-size: 15px;
        }

        .you-indicator {
          color: #2196f3;
          font-weight: 500;
          font-size: 12px;
        }

        .status-badge {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 12px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 600;
          min-width: 100px;
          justify-content: center;
        }

        .status-badge.in-progress {
          background: linear-gradient(135deg, #fff3cd 0%, #ffeaa7 100%);
          color: #856404;
          border: 1px solid #f39c12;
        }

        .status-badge.finished {
          background: linear-gradient(135deg, #d4edda 0%, #a8e6cf 100%);
          color: #155724;
          border: 1px solid #27ae60;
        }

        .status-icon {
          font-size: 14px;
        }

        .status-text {
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .next-phase {
          margin-top: 30px;
          padding: 20px;
          background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
          border-radius: 12px;
          text-align: center;
          color: white;
        }

        .next-phase h4 {
          margin: 0 0 10px 0;
          font-size: 18px;
        }

        .next-phase p {
          margin: 0 0 15px 0;
          opacity: 0.9;
        }

        .next-phase-btn {
          background: rgba(255,255,255,0.2);
          color: white;
          border: 2px solid rgba(255,255,255,0.3);
          padding: 10px 20px;
          border-radius: 25px;
          cursor: pointer;
          font-weight: 500;
          transition: all 0.3s;
        }

        .next-phase-btn:hover {
          background: rgba(255,255,255,0.3);
          transform: translateY(-1px);
        }

        @media (max-width: 1024px) {
          .conversation-game {
            flex-direction: column;
          }
          
          .game-sidebar {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
};

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
        {gameState === 'waiting' ? (
          <GameRoom
            room={room}
            gameState={gameState}
            playerName={playerName}
            onGameAction={handleGameAction}
          />
        ) : (
          <ConversationGame
            room={room}
            gameState={gameState}
            playerName={playerName}
            socket={socket}
            onGameAction={handleGameAction}
          />
        )}
      </div>

      <style jsx>{`
        .game-container {
          height: 100vh;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          padding: 20px;
          display: flex;
          flex-direction: column;
        }
        
        .game-content {
          flex: 1;
          display: flex;
          flex-direction: column;
          min-height: 0;
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
