import React from 'react';

const RoomList = ({ rooms = [], onJoinRoom }) => {
  if (!rooms || rooms.length === 0) {
    return (
      <div className="room-list">
        <div className="empty-state">
          <div className="empty-icon">🎮</div>
          <p>No active rooms</p>
          <span>Create a room to get started!</span>
        </div>
        
        <style jsx>{`
          .room-list {
            height: 100%;
          }
          
          .empty-state {
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            height: 300px;
            color: #999;
            text-align: center;
          }
          
          .empty-icon {
            font-size: 48px;
            margin-bottom: 16px;
            opacity: 0.5;
          }
          
          .empty-state p {
            margin: 0 0 8px 0;
            font-size: 18px;
            font-weight: 500;
          }
          
          .empty-state span {
            font-size: 14px;
            font-style: italic;
          }
        `}</style>
      </div>
    );
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'waiting':
        return '#27ae60';
      case 'playing':
        return '#f39c12';
      case 'finished':
        return '#95a5a6';
      default:
        return '#3498db';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'waiting':
        return 'Waiting for players';
      case 'playing':
        return 'Game in progress';
      case 'finished':
        return 'Game finished';
      default:
        return 'Unknown';
    }
  };

  const canJoinRoom = (room) => {
    return room.status === 'waiting' && room.players.length < room.maxPlayers;
  };

  return (
    <div className="room-list">
      <div className="rooms-container">
        {rooms.map((room) => (
          <div key={room.id} className="room-item">
            <div className="room-header">
              <div className="room-name">{room.name}</div>
              <div 
                className="room-status"
                style={{ color: getStatusColor(room.status) }}
              >
                {getStatusText(room.status)}
              </div>
            </div>
            
            <div className="room-details">
              <div className="room-info">
                <div className="player-count">
                  <span className="count-icon">👥</span>
                  {room.players.length}/{room.maxPlayers} players
                </div>
                
                <div className="room-id">
                  Room ID: {room.id.slice(-6)} • Host: {room.hostId ? room.hostId.slice(-4) : 'Unknown'}
                </div>
              </div>
              
              <div className="room-actions">
                {canJoinRoom(room) ? (
                  <button
                    onClick={() => onJoinRoom(room.id)}
                    className="join-button"
                  >
                    Join Room
                  </button>
                ) : room.status === 'playing' ? (
                  <button className="join-button disabled" disabled>
                    In Progress
                  </button>
                ) : (
                  <button className="join-button disabled" disabled>
                    Room Full
                  </button>
                )}
              </div>
            </div>
            
            {room.players.length > 0 && (
              <div className="room-players">
                <div className="players-label">Players:</div>
                <div className="players-avatars">
                  {room.players.slice(0, 4).map((playerId, index) => (
                    <div key={playerId} className="player-avatar">
                      {index + 1}
                    </div>
                  ))}
                  {room.players.length > 4 && (
                    <div className="player-avatar more">
                      +{room.players.length - 4}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
      
      <style jsx>{`
        .room-list {
          height: 100%;
        }
        
        .rooms-container {
          display: flex;
          flex-direction: column;
          gap: 16px;
          max-height: 600px;
          overflow-y: auto;
        }
        
        .room-item {
          background: #f8f9fa;
          border: 1px solid #e9ecef;
          border-radius: 10px;
          padding: 20px;
          transition: all 0.3s ease;
        }
        
        .room-item:hover {
          background: #e9ecef;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }
        
        .room-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
        }
        
        .room-name {
          font-size: 18px;
          font-weight: 600;
          color: #333;
          margin: 0;
        }
        
        .room-status {
          font-size: 12px;
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        
        .room-details {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }
        
        .room-info {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        
        .player-count {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 14px;
          color: #666;
          font-weight: 500;
        }
        
        .count-icon {
          font-size: 12px;
        }
        
        .room-id {
          font-size: 12px;
          color: #999;
          font-family: monospace;
        }
        
        .room-actions {
          display: flex;
          align-items: center;
        }
        
        .join-button {
          padding: 8px 16px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-weight: 500;
          font-size: 14px;
          transition: all 0.2s ease;
        }
        
        .join-button:hover:not(.disabled) {
          transform: translateY(-1px);
          box-shadow: 0 4px 8px rgba(102, 126, 234, 0.3);
        }
        
        .join-button.disabled {
          background: #95a5a6;
          cursor: not-allowed;
          opacity: 0.6;
        }
        
        .room-players {
          border-top: 1px solid #dee2e6;
          padding-top: 12px;
          display: flex;
          align-items: center;
          gap: 12px;
        }
        
        .players-label {
          font-size: 12px;
          color: #666;
          font-weight: 500;
        }
        
        .players-avatars {
          display: flex;
          gap: 4px;
        }
        
        .player-avatar {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 10px;
          font-weight: bold;
        }
        
        .player-avatar.more {
          background: #95a5a6;
          font-size: 8px;
        }
        
        /* Custom scrollbar */
        .rooms-container::-webkit-scrollbar {
          width: 6px;
        }
        
        .rooms-container::-webkit-scrollbar-track {
          background: #f1f1f1;
          border-radius: 3px;
        }
        
        .rooms-container::-webkit-scrollbar-thumb {
          background: #c1c1c1;
          border-radius: 3px;
        }
        
        .rooms-container::-webkit-scrollbar-thumb:hover {
          background: #a8a8a8;
        }
        
        @media (max-width: 768px) {
          .room-item {
            padding: 16px;
          }
          
          .room-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 8px;
          }
          
          .room-details {
            flex-direction: column;
            align-items: flex-start;
            gap: 12px;
          }
          
          .room-name {
            font-size: 16px;
          }
          
          .join-button {
            width: 100%;
            padding: 10px 16px;
          }
        }
      `}</style>
    </div>
  );
};

export default RoomList;
