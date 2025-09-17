import React from 'react';

const PlayerList = ({ players = [] }) => {
  if (!players || players.length === 0) {
    return (
      <div className="player-list">
        <div className="empty-state">
          <p>No players online</p>
        </div>
        
        <style jsx>{`
          .player-list {
            height: 100%;
          }
          
          .empty-state {
            display: flex;
            justify-content: center;
            align-items: center;
            height: 200px;
            color: #999;
            font-style: italic;
          }
          
          .empty-state p {
            margin: 0;
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="player-list">
      <div className="players-container">
        {players.map((player) => (
          <div key={player.id} className="player-item">
            <div className="player-avatar">
              {player.name.charAt(0).toUpperCase()}
            </div>
            <div className="player-info">
              <div className="player-name">{player.name}</div>
              <div className="player-status">
                {player.room ? (
                  <span className="in-room">In game</span>
                ) : (
                  <span className="in-lobby">In lobby</span>
                )}
              </div>
            </div>
            <div className="player-indicator">
              <div className="status-dot online"></div>
            </div>
          </div>
        ))}
      </div>
      
      <style jsx>{`
        .player-list {
          height: 100%;
        }
        
        .players-container {
          display: flex;
          flex-direction: column;
          gap: 10px;
          max-height: 400px;
          overflow-y: auto;
        }
        
        .player-item {
          display: flex;
          align-items: center;
          padding: 12px;
          background: #f8f9fa;
          border-radius: 8px;
          border: 1px solid #e9ecef;
          transition: all 0.2s ease;
        }
        
        .player-item:hover {
          background: #e9ecef;
          transform: translateY(-1px);
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
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
          margin-right: 12px;
          flex-shrink: 0;
        }
        
        .player-info {
          flex: 1;
          min-width: 0;
        }
        
        .player-name {
          font-weight: 600;
          color: #333;
          font-size: 14px;
          margin-bottom: 2px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        
        .player-status {
          font-size: 12px;
        }
        
        .in-lobby {
          color: #27ae60;
          font-weight: 500;
        }
        
        .in-room {
          color: #f39c12;
          font-weight: 500;
        }
        
        .player-indicator {
          display: flex;
          align-items: center;
          margin-left: 8px;
        }
        
        .status-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          margin-left: 4px;
        }
        
        .status-dot.online {
          background: #27ae60;
          box-shadow: 0 0 0 2px rgba(39, 174, 96, 0.3);
        }
        
        .status-dot.offline {
          background: #95a5a6;
        }
        
        /* Custom scrollbar */
        .players-container::-webkit-scrollbar {
          width: 6px;
        }
        
        .players-container::-webkit-scrollbar-track {
          background: #f1f1f1;
          border-radius: 3px;
        }
        
        .players-container::-webkit-scrollbar-thumb {
          background: #c1c1c1;
          border-radius: 3px;
        }
        
        .players-container::-webkit-scrollbar-thumb:hover {
          background: #a8a8a8;
        }
        
        @media (max-width: 768px) {
          .player-item {
            padding: 10px;
          }
          
          .player-avatar {
            width: 35px;
            height: 35px;
            font-size: 14px;
            margin-right: 10px;
          }
          
          .player-name {
            font-size: 13px;
          }
          
          .player-status {
            font-size: 11px;
          }
        }
      `}</style>
    </div>
  );
};

export default PlayerList;
