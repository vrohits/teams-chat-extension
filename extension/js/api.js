/**
 * Teams Chat Board - REST API Service & Configuration Storage
 */
const ApiService = {
    DEFAULT_SERVER_URL: 'https://teams-chat-backend.onrender.com',

    async getServerUrl() {
        return new Promise((resolve) => {
            if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
                chrome.storage.local.get(['chatServerUrl'], (result) => {
                    resolve(result.chatServerUrl || this.DEFAULT_SERVER_URL);
                });
            } else {
                resolve(localStorage.getItem('chatServerUrl') || this.DEFAULT_SERVER_URL);
            }
        });
    },

    async setServerUrl(url) {
        const cleanUrl = url.trim().replace(/\/+$/, '');
        return new Promise((resolve) => {
            if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
                chrome.storage.local.set({ chatServerUrl: cleanUrl }, resolve);
            } else {
                localStorage.setItem('chatServerUrl', cleanUrl);
                resolve();
            }
        });
    },

    /**
     * Gets user profile for this specific window using sessionStorage
     * This allows Window 1 to be "Rohit" and Window 2 to be "Team Member" on the same PC!
     */
    async getUserProfile() {
        // 1. Check window-specific sessionStorage
        const sessionStored = sessionStorage.getItem('current_session_user');
        if (sessionStored) {
            try {
                return JSON.parse(sessionStored);
            } catch (e) {}
        }

        // 2. Fallback to storage or generate default
        return new Promise((resolve) => {
            const defaults = {
                username: 'team_member',
                displayName: 'Team Member',
                avatarColor: '#0078D4'
            };

            if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
                chrome.storage.local.get(['userProfile'], (result) => {
                    const profile = result.userProfile || defaults;
                    sessionStorage.setItem('current_session_user', JSON.stringify(profile));
                    resolve(profile);
                });
            } else {
                const stored = localStorage.getItem('userProfile');
                const profile = stored ? JSON.parse(stored) : defaults;
                sessionStorage.setItem('current_session_user', JSON.stringify(profile));
                resolve(profile);
            }
        });
    },

    async saveUserProfile(profile) {
        sessionStorage.setItem('current_session_user', JSON.stringify(profile));
        return new Promise((resolve) => {
            if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
                chrome.storage.local.set({ userProfile: profile }, resolve);
            } else {
                localStorage.setItem('userProfile', JSON.stringify(profile));
                resolve();
            }
        });
    },

    /**
     * Switch user identity in this specific window
     */
    async switchSessionUser(username, displayName, avatarColor) {
        const profile = {
            username: username.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '_'),
            displayName: displayName.trim() || username,
            avatarColor: avatarColor || this._getRandomColor()
        };
        sessionStorage.setItem('current_session_user', JSON.stringify(profile));
        try {
            await this.registerUser(profile.username, profile.displayName, profile.avatarColor);
        } catch (e) {
            console.warn('[API] Registration error on switch:', e);
        }
        return profile;
    },

    _getRandomColor() {
        const colors = [
            '#6264A7', // Teams purple
            '#0078D4', // Blue
            '#107C41', // Green
            '#D83B01', // Red-Orange
            '#8764B8', // Violet
            '#038387', // Teal
            '#C239B3', // Magenta
            '#498205'  // Olive
        ];
        return colors[Math.floor(Math.random() * colors.length)];
    },

    async fetchChannels() {
        const base = await this.getServerUrl();
        const res = await fetch(`${base}/api/channels`);
        if (!res.ok) throw new Error(`Failed to fetch channels: ${res.statusText}`);
        return res.json();
    },

    async createChannel(name, description) {
        const base = await this.getServerUrl();
        const res = await fetch(`${base}/api/channels`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, description })
        });
        if (!res.ok) throw new Error(`Failed to create channel: ${res.statusText}`);
        return res.json();
    },

    async getOrCreateDirectChannel(user1, user2) {
        const base = await this.getServerUrl();
        const res = await fetch(`${base}/api/channels/direct`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user1, user2 })
        });
        if (!res.ok) throw new Error(`Failed to create direct channel: ${res.statusText}`);
        return res.json();
    },

    async fetchDirectChannels(username) {
        const base = await this.getServerUrl();
        const res = await fetch(`${base}/api/channels/direct?username=${encodeURIComponent(username)}`);
        if (!res.ok) throw new Error(`Failed to fetch direct channels: ${res.statusText}`);
        return res.json();
    },

    async searchUsers(query, currentUsername) {
        const base = await this.getServerUrl();
        const res = await fetch(`${base}/api/users/search?q=${encodeURIComponent(query || '')}&currentUsername=${encodeURIComponent(currentUsername || '')}`);
        if (!res.ok) throw new Error(`Failed to search users: ${res.statusText}`);
        return res.json();
    },

    async fetchMessages(channelId, limit = 50) {
        const base = await this.getServerUrl();
        const res = await fetch(`${base}/api/channels/${channelId}/messages?limit=${limit}`);
        if (!res.ok) throw new Error(`Failed to fetch messages: ${res.statusText}`);
        return res.json();
    },

    async sendMessageRest(messageDto) {
        const base = await this.getServerUrl();
        const res = await fetch(`${base}/api/messages`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(messageDto)
        });
        if (!res.ok) throw new Error(`Failed to send message: ${res.statusText}`);
        return res.json();
    },

    async registerUser(username, displayName, avatarColor) {
        const base = await this.getServerUrl();
        const res = await fetch(`${base}/api/users/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, displayName, avatarColor })
        });
        if (!res.ok) throw new Error(`Failed to register user: ${res.statusText}`);
        return res.json();
    },

    async fetchOnlineUsers() {
        const base = await this.getServerUrl();
        const res = await fetch(`${base}/api/users/online`);
        if (!res.ok) throw new Error(`Failed to fetch users: ${res.statusText}`);
        return res.json();
    }
};

window.ApiService = ApiService;
