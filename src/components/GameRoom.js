import React, { useState, useEffect } from 'react';

const GameRoom = ({ room, gameState, playerName, onGameAction }) => {
  const [gameData, setGameData] = useState(null);
  const [selectedAction, setSelectedAction] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    // Initialize game data based on room state
    if (room && gameState === 'playing' && !gameData) {
      setGameData({
        currentPlayer: 0,
        turn: 1,
        players: room.players.map((playerId, index) => {
          const playerName = room.playerNames ? 
            room.playerNames.find(p => p.id === playerId)?.name || `Player ${index + 1}` :
            `Player ${index + 1}`;
          
          return {
            id: playerId,
            name: playerName,
            score: 0,
            isActive: index === 0
          };
        })
      });
    }
  }, [room, gameState, gameData]);

  const handleAction = (action, data = {}) => {
    if (onGameAction) {
      onGameAction(action, data);
    }
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (message.trim()) {
      handleAction('send-message', { message: message.trim() });
      setMessage('');
    }
  };

  if (gameState === 'waiting') {
    return (
      <div className="game-room waiting">
        <div className="waiting-content">
          <div className="waiting-icon">⏳</div>
          <h2>Waiting for Game to Start</h2>
          <p>Players in room: {room.players.length}/{room.maxPlayers}</p>
          
          <div className="players-waiting">
            {room.players.map((playerId, index) => {
              const playerName = room.playerNames ? 
                room.playerNames.find(p => p.id === playerId)?.name || `Player ${index + 1}` :
                `Player ${index + 1}`;
              
              return (
                <div key={playerId} className="waiting-player">
                  <div className="player-avatar">
                    {playerName.charAt(0).toUpperCase()}
                  </div>
                  <span>{playerName}</span>
                </div>
              );
            })}
            
            {/* Show empty slots */}
            {Array.from({ length: room.maxPlayers - room.players.length }).map((_, index) => (
              <div key={`empty-${index}`} className="waiting-player empty">
                <div className="player-avatar empty">?</div>
                <span>Waiting...</span>
              </div>
            ))}
          </div>
          
          {room.players.length >= 2 && (
            <div className="ready-message">
              Ready to start! Waiting for host to begin the game.
            </div>
          )}
        </div>
        
        <style jsx>{`
          .game-room.waiting {
            padding: 40px;
            text-align: center;
            background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
            min-height: 400px;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          
          .waiting-content {
            max-width: 600px;
            width: 100%;
          }
          
          .waiting-icon {
            font-size: 64px;
            margin-bottom: 20px;
            animation: pulse 2s infinite;
          }
          
          @keyframes pulse {
            0% { transform: scale(1); opacity: 1; }
            50% { transform: scale(1.1); opacity: 0.7; }
            100% { transform: scale(1); opacity: 1; }
          }
          
          .waiting-content h2 {
            color: #333;
            margin-bottom: 10px;
            font-size: 28px;
          }
          
          .waiting-content p {
            color: #666;
            font-size: 16px;
            margin-bottom: 30px;
          }
          
          .players-waiting {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
          }
          
          .waiting-player {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 10px;
          }
          
          .waiting-player.empty {
            opacity: 0.5;
          }
          
          .player-avatar {
            width: 60px;
            height: 60px;
            border-radius: 50%;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: bold;
            font-size: 24px;
          }
          
          .player-avatar.empty {
            background: #ddd;
            color: #999;
          }
          
          .waiting-player span {
            font-size: 14px;
            color: #666;
            font-weight: 500;
          }
          
          .ready-message {
            background: #d4edda;
            border: 1px solid #c3e6cb;
            color: #155724;
            padding: 15px;
            border-radius: 8px;
            font-weight: 500;
          }
        `}</style>
      </div>
    );
  }

  if (gameState === 'playing') {
    return (
      <div className="game-room playing">
        <div className="game-header">
          <div className="game-info">
            <h3>Game in Progress</h3>
            {gameData && (
              <div className="turn-info">
                Turn {gameData.turn} - {gameData.players[gameData.currentPlayer]?.name}'s turn
              </div>
            )}
          </div>
        </div>
        
        <div className="game-content">
          <div className="game-board">
            <div className="board-placeholder">
              <div className="board-icon">🎲</div>
              <p>Game board will be implemented here</p>
              <p>This is where the actual game mechanics will be displayed</p>
            </div>
          </div>
          
          <div className="game-sidebar">
            <div className="players-panel">
              <h4>Players</h4>
              {gameData && gameData.players.map((player, index) => (
                <div 
                  key={player.id} 
                  className={`player-card ${player.isActive ? 'active' : ''}`}
                >
                  <div className="player-avatar small">
                    {player.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="player-details">
                    <div className="player-name">{player.name}</div>
                    <div className="player-score">Score: {player.score}</div>
                  </div>
                  {player.isActive && <div className="active-indicator">🎯</div>}
                </div>
              ))}
            </div>
            
            <div className="actions-panel">
              <h4>Game Actions</h4>
              <div className="action-buttons">
                <button 
                  className="action-btn"
                  onClick={() => handleAction('roll-dice')}
                >
                  🎲 Roll Dice
                </button>
                <button 
                  className="action-btn"
                  onClick={() => handleAction('pass-turn')}
                >
                  ⏭️ Pass Turn
                </button>
                <button 
                  className="action-btn"
                  onClick={() => handleAction('make-move')}
                >
                  🎯 Make Move
                </button>
              </div>
            </div>
            
            <div className="chat-panel">
              <h4>Chat</h4>
              <div className="chat-messages">
                <div className="chat-message system">
                  Game started! Good luck everyone! 🎮
                </div>
              </div>
              <form onSubmit={handleSendMessage} className="chat-form">
                <input
                  type="text"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Type a message..."
                  className="chat-input"
                />
                <button type="submit" className="send-btn">Send</button>
              </form>
            </div>
          </div>
        </div>
        
        <style jsx>{`
          .game-room.playing {
            padding: 20px;
            background: #f8f9fa;
            min-height: 600px;
          }
          
          .game-header {
            background: white;
            padding: 20px;
            border-radius: 10px;
            margin-bottom: 20px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          }
          
          .game-info h3 {
            margin: 0 0 8px 0;
            color: #333;
            font-size: 20px;
          }
          
          .turn-info {
            color: #666;
            font-size: 14px;
          }
          
          .game-content {
            display: grid;
            grid-template-columns: 2fr 1fr;
            gap: 20px;
            height: 500px;
          }
          
          .game-board {
            background: white;
            border-radius: 10px;
            padding: 20px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            display: flex;
            align-items: center;
            justify-content: center;
          }
          
          .board-placeholder {
            text-align: center;
            color: #666;
          }
          
          .board-icon {
            font-size: 64px;
            margin-bottom: 20px;
          }
          
          .board-placeholder p {
            margin: 10px 0;
          }
          
          .game-sidebar {
            display: flex;
            flex-direction: column;
            gap: 20px;
          }
          
          .players-panel,
          .actions-panel,
          .chat-panel {
            background: white;
            border-radius: 10px;
            padding: 16px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          }
          
          .players-panel h4,
          .actions-panel h4,
          .chat-panel h4 {
            margin: 0 0 16px 0;
            color: #333;
            font-size: 16px;
          }
          
          .player-card {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 8px;
            border-radius: 6px;
            margin-bottom: 8px;
            transition: background 0.2s;
          }
          
          .player-card.active {
            background: #e3f2fd;
            border: 1px solid #2196f3;
          }
          
          .player-avatar.small {
            width: 32px;
            height: 32px;
            border-radius: 50%;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: bold;
            font-size: 14px;
          }
          
          .player-details {
            flex: 1;
          }
          
          .player-name {
            font-weight: 500;
            font-size: 14px;
            color: #333;
          }
          
          .player-score {
            font-size: 12px;
            color: #666;
          }
          
          .active-indicator {
            font-size: 16px;
          }
          
          .action-buttons {
            display: flex;
            flex-direction: column;
            gap: 8px;
          }
          
          .action-btn {
            padding: 10px 16px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-size: 14px;
            transition: transform 0.2s;
          }
          
          .action-btn:hover {
            transform: translateY(-1px);
          }
          
          .chat-panel {
            flex: 1;
            display: flex;
            flex-direction: column;
          }
          
          .chat-messages {
            flex: 1;
            max-height: 150px;
            overflow-y: auto;
            margin-bottom: 12px;
            padding: 8px;
            background: #f8f9fa;
            border-radius: 6px;
          }
          
          .chat-message {
            padding: 6px 10px;
            margin-bottom: 6px;
            border-radius: 6px;
            font-size: 13px;
          }
          
          .chat-message.system {
            background: #e3f2fd;
            color: #1976d2;
            text-align: center;
            font-style: italic;
          }
          
          .chat-form {
            display: flex;
            gap: 8px;
          }
          
          .chat-input {
            flex: 1;
            padding: 8px 12px;
            border: 1px solid #ddd;
            border-radius: 6px;
            font-size: 14px;
          }
          
          .send-btn {
            padding: 8px 16px;
            background: #27ae60;
            color: white;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-size: 14px;
          }
          
          @media (max-width: 768px) {
            .game-content {
              grid-template-columns: 1fr;
              height: auto;
            }
            
            .game-sidebar {
              order: -1;
            }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="game-room finished">
      <div className="finished-content">
        <div className="finished-icon">🏆</div>
        <h2>Game Finished!</h2>
        <p>Thanks for playing!</p>
        <button 
          onClick={() => handleAction('return-to-lobby')}
          className="return-button"
        >
          Return to Lobby
        </button>
      </div>
      
      <style jsx>{`
        .game-room.finished {
          padding: 40px;
          text-align: center;
          background: linear-gradient(135deg, #ffeaa7 0%, #fab1a0 100%);
          min-height: 400px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .finished-content {
          max-width: 400px;
          width: 100%;
        }
        
        .finished-icon {
          font-size: 64px;
          margin-bottom: 20px;
        }
        
        .finished-content h2 {
          color: #333;
          margin-bottom: 16px;
          font-size: 28px;
        }
        
        .finished-content p {
          color: #666;
          font-size: 16px;
          margin-bottom: 30px;
        }
        
        .return-button {
          padding: 12px 24px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-size: 16px;
          font-weight: 500;
        }
      `}</style>
    </div>
  );
};

export default GameRoom;
