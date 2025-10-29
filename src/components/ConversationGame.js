import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import jsPDF from 'jspdf';
import './ConversationGame.css';

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
  const [showGroupSummary, setShowGroupSummary] = useState(false);
  const [groupSummaryData, setGroupSummaryData] = useState(null);
  const [isGeneratingGroupSummary, setIsGeneratingGroupSummary] = useState(false);
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

      socket.on('conversation-summary', (summaryData) => {
        console.log('Received conversation summary:', summaryData);
        // Only add summary if it's for this player (in case of broadcast fallback)
        if (summaryData.playerName === 'Summary') {
          setMessages(prev => [...prev, summaryData]);
        }
      });

      socket.on('group-summary-generated', (groupSummary) => {
        console.log('Received group summary:', groupSummary);
        setGroupSummaryData(groupSummary);
        setShowGroupSummary(true);
        setIsGeneratingGroupSummary(false);
      });

      socket.on('group-summary-error', (error) => {
        console.error('Group summary error:', error);
        alert(`Error generating group summary: ${error}`);
        setIsGeneratingGroupSummary(false);
      });

      return () => {
        socket.off('player-finished-conversation');
        socket.off('conversation-message');
        socket.off('conversation-summary');
        socket.off('group-summary-generated');
        socket.off('group-summary-error');
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

  const handleGenerateGroupSummary = () => {
    if (socket && allPlayersFinished) {
      setIsGeneratingGroupSummary(true);
      socket.emit('generate-group-summary', { roomId: room.id });
    }
  };

  const handleCloseGroupSummary = () => {
    setShowGroupSummary(false);
    setGroupSummaryData(null);
  };

  const handleGeneratePDF = () => {
    if (!groupSummaryData) return;

    try {
      const doc = new jsPDF();
      
      // Set up document properties
      doc.setProperties({
        title: 'Group Analysis Summary',
        subject: 'Conversation Game Results',
        author: 'Conversation Game',
        creator: 'Conversation Game App'
      });

      // Add header
      doc.setFontSize(20);
      doc.setTextColor(40, 40, 40);
      doc.text('🎯 Group Analysis Summary', 20, 30);
      
      // Add metadata
      doc.setFontSize(12);
      doc.setTextColor(100, 100, 100);
      const dateStr = new Date(groupSummaryData.timestamp).toLocaleString();
      doc.text(`${groupSummaryData.participantCount} participants • ${dateStr}`, 20, 40);
      
      // Add a line separator
      doc.setDrawColor(100, 100, 100);
      doc.line(20, 45, 190, 45);
      
      // Process the markdown content to plain text
      let yPosition = 55;
      const pageHeight = doc.internal.pageSize.height;
      const maxWidth = 170;
      
      // Split content by lines and process
      const lines = groupSummaryData.text.split('\n');
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        
        if (!line) {
          yPosition += 5; // Add space for empty lines
          continue;
        }
        
        // Handle headers
        if (line.startsWith('# ')) {
          doc.setFontSize(16);
          doc.setTextColor(40, 40, 40);
          const headerText = line.substring(2);
          const splitHeader = doc.splitTextToSize(headerText, maxWidth);
          doc.text(splitHeader, 20, yPosition);
          yPosition += splitHeader.length * 8 + 5;
        } else if (line.startsWith('## ')) {
          doc.setFontSize(14);
          doc.setTextColor(60, 60, 60);
          const headerText = line.substring(3);
          const splitHeader = doc.splitTextToSize(headerText, maxWidth);
          doc.text(splitHeader, 20, yPosition);
          yPosition += splitHeader.length * 7 + 3;
        } else if (line.startsWith('### ')) {
          doc.setFontSize(12);
          doc.setTextColor(80, 80, 80);
          const headerText = line.substring(4);
          const splitHeader = doc.splitTextToSize(headerText, maxWidth);
          doc.text(splitHeader, 20, yPosition);
          yPosition += splitHeader.length * 6 + 2;
        } else {
          // Regular text
          doc.setFontSize(11);
          doc.setTextColor(40, 40, 40);
          
          // Remove markdown formatting
          let cleanText = line
            .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold
            .replace(/\*(.*?)\*/g, '$1')     // Remove italic
            .replace(/`(.*?)`/g, '$1')       // Remove code
            .replace(/^\- /, '• ')           // Convert list items
            .replace(/^\d+\. /, '• ');       // Convert numbered lists to bullets
          
          const splitText = doc.splitTextToSize(cleanText, maxWidth);
          
          // Check if we need a new page
          if (yPosition + (splitText.length * 5) > pageHeight - 20) {
            doc.addPage();
            yPosition = 20;
          }
          
          doc.text(splitText, 20, yPosition);
          yPosition += splitText.length * 5 + 2;
        }
        
        // Check if we need a new page
        if (yPosition > pageHeight - 20) {
          doc.addPage();
          yPosition = 20;
        }
      }
      
      // Generate filename with timestamp
      const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
      const filename = `Group_Summary_${room.name}_${timestamp}.pdf`;
      
      // Save the PDF
      doc.save(filename);
      
      console.log('PDF generated successfully:', filename);
      
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Error generating PDF. Please try again.');
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
                messages.map((msg, index) => (
                  <div key={msg.id}>
                    {msg.isSummary && (
                      <div className="summary-separator">
                        <div className="separator-line"></div>
                        <div className="separator-text">📋 Conversation Summary</div>
                        <div className="separator-line"></div>
                      </div>
                    )}
                    <div className={`message ${
                      msg.isSummary ? 'summary-message' : 
                      msg.isAI ? 'ai-message' : 'user-message'
                    }`}>
                      <div className="message-header">
                        <span className="message-sender">
                          {msg.isSummary ? '📋 Summary' : 
                           msg.isAI ? '🧠 Life Coach' : '👤 You'}
                        </span>
                        <span className="message-time">{msg.timestamp}</span>
                      </div>
                      <div className={`message-text ${msg.isSummary ? 'summary-text' : ''}`}>
                        {msg.isSummary || msg.isAI ? (
                          <ReactMarkdown>{msg.text}</ReactMarkdown>
                        ) : (
                          msg.text
                        )}
                      </div>
                    </div>
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
            <p>Ready to generate the group analysis summary.</p>
            <button 
              className="next-phase-btn"
              onClick={handleGenerateGroupSummary}
              disabled={isGeneratingGroupSummary}
            >
              {isGeneratingGroupSummary ? (
                <>
                  <span className="spinner"></span>
                  Generating Summary...
                </>
              ) : (
                'Generate Group Summary'
              )}
            </button>
          </div>
        )}
      </div>

      {/* Group Summary Popup */}
      {showGroupSummary && groupSummaryData && (
        <div className="popup-overlay">
          <div className="popup-window">
            <div className="popup-header">
              <h2>🎯 Group Analysis Summary</h2>
              <div className="popup-meta">
                {groupSummaryData.participantCount} participants • {new Date(groupSummaryData.timestamp).toLocaleString()}
              </div>
            </div>
            <div className="popup-content">
              <ReactMarkdown>{groupSummaryData.text}</ReactMarkdown>
            </div>
            <div className="popup-footer">
              <button className="pdf-button" onClick={handleGeneratePDF}>
                📄 Generate PDF
              </button>
              <button className="close-button" onClick={handleCloseGroupSummary}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ConversationGame;

