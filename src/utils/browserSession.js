// Window-based session management utilities
// Allows multiple browser windows, but only one active tab per window

// Generate a unique window ID that persists across tab refreshes but is unique per window
const getWindowId = () => {
  let windowId = sessionStorage.getItem('windowId');
  if (!windowId) {
    windowId = 'window_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    sessionStorage.setItem('windowId', windowId);
  }
  return windowId;
};

// Generate a unique tab ID for this specific tab
const getTabId = () => {
  let tabId = sessionStorage.getItem('tabId');
  if (!tabId) {
    tabId = 'tab_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    sessionStorage.setItem('tabId', tabId);
  }
  return tabId;
};

// Check if there's already an active tab in this window
export const checkWindowSession = () => {
  const windowId = getWindowId();
  const tabId = getTabId();
  
  // Get the active tab for this window
  const activeTabKey = `activeTab_${windowId}`;
  const activeTabId = localStorage.getItem(activeTabKey);
  const activeUserKey = `activeUser_${windowId}`;
  const activeUser = localStorage.getItem(activeUserKey);
  const loginTimeKey = `loginTime_${windowId}`;
  const loginTime = localStorage.getItem(loginTimeKey);
  
  if (activeTabId && activeUser && loginTime) {
    const oneHour = 60 * 60 * 1000;
    const timeDiff = Date.now() - parseInt(loginTime);
    
    if (timeDiff >= oneHour) {
      // Session expired
      clearWindowSession();
      return null;
    }
    
    // Check if this tab is the active tab for this window
    if (activeTabId === tabId) {
      return {
        user: activeUser,
        loginTime: parseInt(loginTime),
        isActiveTab: true,
        windowId,
        tabId
      };
    } else {
      return {
        user: activeUser,
        loginTime: parseInt(loginTime),
        isActiveTab: false,
        activeTabId,
        windowId,
        tabId
      };
    }
  }
  
  return null;
};

// Set current user as active tab for this window
export const setWindowSession = (userName) => {
  const windowId = getWindowId();
  const tabId = getTabId();
  
  localStorage.setItem(`activeTab_${windowId}`, tabId);
  localStorage.setItem(`activeUser_${windowId}`, userName);
  localStorage.setItem(`loginTime_${windowId}`, Date.now().toString());
  
  console.log('🔐 Window session set for:', userName, 'Window:', windowId, 'Tab:', tabId);
};

// Clear window session
export const clearWindowSession = () => {
  const windowId = getWindowId();
  
  localStorage.removeItem(`activeTab_${windowId}`);
  localStorage.removeItem(`activeUser_${windowId}`);
  localStorage.removeItem(`loginTime_${windowId}`);
  localStorage.removeItem('playerName');
  localStorage.removeItem('currentRoom');
  sessionStorage.clear();
  
  console.log('🔓 Window session cleared for window:', windowId);
};

// Force logout other tabs in this window when someone new logs in
export const forceLogoutOtherTabsInWindow = (newUserName) => {
  const windowId = getWindowId();
  const tabId = getTabId();
  const currentSession = checkWindowSession();
  
  if (currentSession && currentSession.user !== newUserName) {
    console.log('🚫 Forcing logout of previous user in this window:', currentSession.user);
    
    // Broadcast logout event to other tabs in this window
    localStorage.setItem(`forceLogout_${windowId}`, Date.now().toString());
    clearWindowSession();
  }
  
  setWindowSession(newUserName);
};

// Listen for forced logout from other tabs in this window
export const setupWindowLogoutListener = (onForceLogout) => {
  const windowId = getWindowId();
  const tabId = getTabId();
  
  const handleStorageChange = (e) => {
    // Listen for logout events for this window
    if (e.key === `forceLogout_${windowId}`) {
      console.log('🚫 Received force logout signal for window:', windowId);
      onForceLogout();
    }
    
    // Also listen for changes to the active tab for this window
    if (e.key === `activeTab_${windowId}`) {
      const newActiveTab = e.newValue;
      if (newActiveTab && newActiveTab !== tabId) {
        console.log('🚫 Another tab became active in this window');
        onForceLogout();
      }
    }
  };
  
  window.addEventListener('storage', handleStorageChange);
  return () => window.removeEventListener('storage', handleStorageChange);
};

// Heartbeat to keep session alive and maintain active tab status
export const startWindowSessionHeartbeat = (userName) => {
  const windowId = getWindowId();
  const tabId = getTabId();
  
  const heartbeat = () => {
    const currentSession = checkWindowSession();
    
    if (!currentSession) {
      console.log('💔 Window session expired or cleared');
      return false; // Stop heartbeat
    }
    
    if (currentSession.user !== userName) {
      console.log('🚫 Window session conflict detected. Expected:', userName, 'Found:', currentSession.user);
      return false; // Stop heartbeat
    }
    
    if (!currentSession.isActiveTab) {
      console.log('🚫 This tab is no longer active in window:', windowId);
      return false; // Stop heartbeat
    }
    
    // Update timestamp to keep session alive
    localStorage.setItem(`loginTime_${windowId}`, Date.now().toString());
    return true; // Continue heartbeat
  };
  
  // Run heartbeat every 30 seconds
  const intervalId = setInterval(() => {
    if (!heartbeat()) {
      clearInterval(intervalId);
    }
  }, 30000);
  
  return () => clearInterval(intervalId);
};

// Backward compatibility functions (for existing code)
export const checkBrowserSession = checkWindowSession;
export const setBrowserSession = setWindowSession;
export const clearBrowserSession = clearWindowSession;
export const forceLogoutOtherTabs = forceLogoutOtherTabsInWindow;
export const setupLogoutListener = setupWindowLogoutListener;
export const startSessionHeartbeat = startWindowSessionHeartbeat;
