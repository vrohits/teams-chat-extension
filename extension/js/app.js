/**
 * Teams Chat Board - Application Logic with Real-time User Notifications & Multi-Window Account Switching
 */
(function () {
    let stompClient = null;
    let currentSubscription = null;
    let personalSubscription = null;
    let currentUser = null;
    let currentChannel = null;
    let publicChannels = [];
    let directChannels = [];
    let isConnected = false;
    const unreadMap = new Map(); // channelId -> count

    // DOM Elements
    const elements = {
        statusBadge: document.getElementById('statusBadge'),
        statusDot: document.getElementById('statusDot'),
        statusText: document.getElementById('statusText'),
        toggleSidebarBtn: document.getElementById('toggleSidebarBtn'),
        channelsSidebar: document.getElementById('channelsSidebar'),
        userSearchInput: document.getElementById('userSearchInput'),
        clearSearchBtn: document.getElementById('clearSearchBtn'),
        searchResultsDropdown: document.getElementById('searchResultsDropdown'),
        openNewDirectChatBtn: document.getElementById('openNewDirectChatBtn'),
        directChatList: document.getElementById('directChatList'),
        channelList: document.getElementById('channelList'),
        onlineUsersList: document.getElementById('onlineUsersList'),
        chatHeaderContent: document.getElementById('chatHeaderContent'),
        notificationBanner: document.getElementById('notificationBanner'),
        messagesContainer: document.getElementById('messagesContainer'),
        messageInput: document.getElementById('messageInput'),
        sendBtn: document.getElementById('sendBtn'),
        emojiBtn: document.getElementById('emojiBtn'),
        codeSnippetBtn: document.getElementById('codeSnippetBtn'),
        // Quick User Profile Switcher in Header
        userProfileBtn: document.getElementById('userProfileBtn'),
        headerUserAvatar: document.getElementById('headerUserAvatar'),
        headerUserName: document.getElementById('headerUserName'),
        switchUserDropdown: document.getElementById('switchUserDropdown'),
        switchUserList: document.getElementById('switchUserList'),
        addNewUserBtn: document.getElementById('addNewUserBtn'),
        switchUserModal: document.getElementById('switchUserModal'),
        closeSwitchUserModalBtn: document.getElementById('closeSwitchUserModalBtn'),
        cancelSwitchUserModalBtn: document.getElementById('cancelSwitchUserModalBtn'),
        confirmSwitchUserBtn: document.getElementById('confirmSwitchUserBtn'),
        switchDisplayName: document.getElementById('switchDisplayName'),
        switchUsername: document.getElementById('switchUsername'),
        // Settings Modal
        openSettingsBtn: document.getElementById('openSettingsBtn'),
        settingsModal: document.getElementById('settingsModal'),
        closeSettingsBtn: document.getElementById('closeSettingsBtn'),
        cancelSettingsBtn: document.getElementById('cancelSettingsBtn'),
        saveSettingsBtn: document.getElementById('saveSettingsBtn'),
        settingServerUrl: document.getElementById('settingServerUrl'),
        settingDisplayName: document.getElementById('settingDisplayName'),
        settingUsername: document.getElementById('settingUsername'),
        // New Channel Modal
        addChannelBtn: document.getElementById('addChannelBtn'),
        newChannelModal: document.getElementById('newChannelModal'),
        closeNewChannelBtn: document.getElementById('closeNewChannelBtn'),
        cancelNewChannelBtn: document.getElementById('cancelNewChannelBtn'),
        submitNewChannelBtn: document.getElementById('submitNewChannelBtn'),
        newChannelName: document.getElementById('newChannelName'),
        newChannelDesc: document.getElementById('newChannelDesc'),
        // Direct Chat Search Modal
        newDirectChatModal: document.getElementById('newDirectChatModal'),
        closeDirectChatModalBtn: document.getElementById('closeDirectChatModalBtn'),
        cancelDirectChatModalBtn: document.getElementById('cancelDirectChatModalBtn'),
        modalSearchInput: document.getElementById('modalSearchInput'),
        modalSearchResults: document.getElementById('modalSearchResults')
    };

    // Initialize application
    async function init() {
        setupEventListeners();
        currentUser = await ApiService.getUserProfile();
        const serverUrl = await ApiService.getServerUrl();

        renderHeaderUserProfile();

        // Populate settings form
        elements.settingServerUrl.value = serverUrl;
        elements.settingDisplayName.value = currentUser.displayName;
        elements.settingUsername.value = currentUser.username;

        // Try connecting to backend
        await loadChannelsAndConnect();

        // Refresh members & chats periodically
        setInterval(refreshMembersAndChannels, 15000);
    }

    function renderHeaderUserProfile() {
        if (!currentUser) return;
        const name = currentUser.displayName || currentUser.username || 'User';
        elements.headerUserName.textContent = name;
        elements.headerUserAvatar.textContent = getInitials(name);
        elements.headerUserAvatar.style.backgroundColor = currentUser.avatarColor || '#6264A7';
    }

    async function loadChannelsAndConnect() {
        updateStatus('connecting', 'Connecting...');
        const serverUrl = await ApiService.getServerUrl();

        try {
            // Register current user on backend and sync any name changes from PostgreSQL!
            const dbUser = await ApiService.registerUser(currentUser.username, currentUser.displayName, currentUser.avatarColor);
            if (dbUser && dbUser.displayName && dbUser.displayName !== currentUser.displayName) {
                currentUser.displayName = dbUser.displayName;
                if (dbUser.avatarColor) currentUser.avatarColor = dbUser.avatarColor;
                await ApiService.saveUserProfile(currentUser);
                updateHeaderUserDisplay();
            }

            // Fetch public channels and direct chats
            await refreshAllChannels();

            // Set default active channel (general or first available)
            if (!currentChannel && publicChannels.length > 0) {
                const defaultChan = publicChannels.find(c => c.name === 'general') || publicChannels[0];
                await selectChannel(defaultChan);
            }

            // Connect WebSocket
            connectWebSocket(serverUrl);

            // Load online team members
            loadOnlineUsers();
        } catch (err) {
            console.error('[App] Failed to connect to server:', err);
            updateStatus('offline', 'Offline');
            renderSystemNotice(`Unable to reach chat server at <b>${escapeHtml(serverUrl)}</b>.<br/>Make sure the Java backend is running, or update your Server Address in Settings.`);
        }
    }

    async function refreshAllChannels() {
        publicChannels = await ApiService.fetchChannels();
        renderPublicChannels();

        if (currentUser && currentUser.username) {
            try {
                directChannels = await ApiService.fetchDirectChannels(currentUser.username);
                renderDirectChannels();
            } catch (e) {
                console.warn('[App] Could not load direct channels:', e);
            }
        }
    }

    function connectWebSocket(serverUrl) {
        if (stompClient) {
            stompClient.disconnect();
        }

        stompClient = new StompClient();
        stompClient.connect(
            serverUrl,
            () => {
                isConnected = true;
                updateStatus('online', 'Connected');
                if (currentChannel) {
                    subscribeToChannel(currentChannel.id);
                }
                subscribeToPersonalNotifications();
            },
            (err) => {
                console.warn('[App] WebSocket error:', err);
                updateStatus('offline', 'Reconnecting...');
            },
            () => {
                isConnected = false;
                updateStatus('offline', 'Disconnected');
            }
        );
    }

    function subscribeToChannel(channelId) {
        if (currentSubscription) {
            currentSubscription.unsubscribe();
            currentSubscription = null;
        }

        if (stompClient && stompClient.connected) {
            const destination = `/topic/channel.${channelId}`;
            currentSubscription = stompClient.subscribe(destination, (message) => {
                if (message && message.channelId === currentChannel.id) {
                    appendMessage(message);
                    scrollToBottom();
                }
            });
        }
    }

    /**
     * Subscribes to personal direct messages topic so alerts appear even when in another channel
     */
    function subscribeToPersonalNotifications() {
        if (!stompClient || !stompClient.connected || !currentUser) return;
        if (personalSubscription) {
            personalSubscription.unsubscribe();
            personalSubscription = null;
        }

        const personalTopic = `/topic/user.${currentUser.username.toLowerCase()}`;
        personalSubscription = stompClient.subscribe(personalTopic, async (msg) => {
            if (!msg) return;

            // Ignore messages sent by oneself
            if (msg.sender && msg.sender.toLowerCase() === currentUser.username.toLowerCase()) {
                return;
            }

            if (currentChannel && currentChannel.id === msg.channelId) {
                if (!document.getElementById(`msg-${msg.id}`)) {
                    appendMessage(msg);
                    scrollToBottom();
                }
            } else {
                playNotificationSound();
                await refreshAllChannels();
                const prev = unreadMap.get(msg.channelId) || 0;
                unreadMap.set(msg.channelId, prev + 1);
                renderDirectChannels();
                showNotificationBanner(msg);
            }
        });
    }

    function showNotificationBanner(msg) {
        if (!elements.notificationBanner) return;
        const name = msg.senderDisplayName || msg.sender;
        const text = msg.content.length > 35 ? msg.content.substring(0, 35) + '...' : msg.content;

        elements.notificationBanner.innerHTML = `
            <div style="display: flex; align-items: center; gap: 8px; overflow: hidden; white-space: nowrap; text-overflow: ellipsis;">
                <span>💬</span>
                <span><b>${escapeHtml(name)}</b>: ${escapeHtml(text)}</span>
            </div>
            <div style="display: flex; gap: 6px; flex-shrink: 0;">
                <button id="bannerOpenBtn" class="btn-primary" style="padding: 2px 8px; font-size: 11px;">Open</button>
                <button id="bannerDismissBtn" class="icon-btn" style="width: 20px; height: 20px; font-size: 14px;">&times;</button>
            </div>
        `;
        elements.notificationBanner.style.display = 'flex';

        const openBtn = document.getElementById('bannerOpenBtn');
        if (openBtn) {
            openBtn.onclick = async () => {
                elements.notificationBanner.style.display = 'none';
                let targetChan = directChannels.find(c => c.id === msg.channelId);
                if (!targetChan) {
                    await refreshAllChannels();
                    targetChan = directChannels.find(c => c.id === msg.channelId);
                }
                if (targetChan) {
                    await selectChannel(targetChan);
                }
            };
        }

        const dismissBtn = document.getElementById('bannerDismissBtn');
        if (dismissBtn) {
            dismissBtn.onclick = () => {
                elements.notificationBanner.style.display = 'none';
            };
        }

        setTimeout(() => {
            if (elements.notificationBanner) {
                elements.notificationBanner.style.display = 'none';
            }
        }, 8000);
    }

    function playNotificationSound() {
        try {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            if (!AudioCtx) return;
            const ctx = new AudioCtx();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.type = 'sine';
            osc.frequency.setValueAtTime(587.33, ctx.currentTime);
            osc.frequency.setValueAtTime(880, ctx.currentTime + 0.08);
            gain.gain.setValueAtTime(0.12, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
            osc.start();
            osc.stop(ctx.currentTime + 0.35);
        } catch (e) {}
    }

    async function selectChannel(channel) {
        currentChannel = channel;
        unreadMap.delete(channel.id);
        renderDirectChannels();

        renderHeader();

        document.querySelectorAll('.channel-item').forEach(item => {
            if (item.dataset.channelId == channel.id) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });

        elements.messagesContainer.innerHTML = '';
        try {
            const messages = await ApiService.fetchMessages(channel.id, 50);
            messages.forEach(msg => appendMessage(msg));
            scrollToBottom();
        } catch (e) {
            console.error('[App] Error loading message history:', e);
        }

        subscribeToChannel(channel.id);
        elements.messageInput.focus();
    }

    function renderHeader() {
        if (!currentChannel) return;

        if (currentChannel.direct) {
            const name = currentChannel.peerDisplayName || currentChannel.peerUsername || 'Chat';
            const initials = getInitials(name);
            const color = currentChannel.peerAvatarColor || '#6264A7';
            const isOnline = (currentChannel.peerStatus || 'ONLINE') === 'ONLINE';

            elements.chatHeaderContent.innerHTML = `
                <div class="mini-avatar" style="background-color: ${color}; width: 28px; height: 28px; font-size: 12px;">
                    ${escapeHtml(initials)}
                </div>
                <div style="display: flex; flex-direction: column;">
                    <span class="chat-channel-name" style="font-size: 14px;">${escapeHtml(name)}</span>
                    <span class="peer-header-badge">
                        <span class="status-dot ${isOnline ? 'online' : 'offline'}" style="width: 6px; height: 6px;"></span>
                        <span>${isOnline ? 'Available' : 'Offline'}</span>
                    </span>
                </div>
            `;
        } else {
            elements.chatHeaderContent.innerHTML = `
                <span class="chat-channel-name">
                    <span class="channel-prefix">#</span>
                    <span>${escapeHtml(currentChannel.name)}</span>
                </span>
                <span class="chat-channel-desc">${escapeHtml(currentChannel.description || '')}</span>
            `;
        }
    }

    function renderPublicChannels() {
        elements.channelList.innerHTML = '';
        publicChannels.forEach(channel => {
            const li = document.createElement('li');
            li.className = 'channel-item' + (currentChannel && currentChannel.id === channel.id ? ' active' : '');
            li.dataset.channelId = channel.id;
            li.innerHTML = `
                <span class="channel-prefix">#</span>
                <span class="channel-name">${escapeHtml(channel.name)}</span>
            `;
            li.addEventListener('click', () => selectChannel(channel));
            elements.channelList.appendChild(li);
        });
    }

    function renderDirectChannels() {
        elements.directChatList.innerHTML = '';
        if (directChannels.length === 0) {
            elements.directChatList.innerHTML = `
                <li style="padding: 6px 10px; font-size: 11px; color: var(--text-muted); font-style: italic;">
                    No direct chats yet.
                </li>
            `;
            return;
        }

        directChannels.forEach(dm => {
            const li = document.createElement('li');
            li.className = 'channel-item' + (currentChannel && currentChannel.id === dm.id ? ' active' : '');
            li.dataset.channelId = dm.id;

            const name = dm.peerDisplayName || dm.peerUsername || 'User';
            const initials = getInitials(name);
            const color = dm.peerAvatarColor || '#6264A7';
            const isOnline = (dm.peerStatus || 'ONLINE') === 'ONLINE';
            const unread = unreadMap.get(dm.id) || 0;

            li.innerHTML = `
                <div class="mini-avatar" style="background-color: ${color};">
                    ${escapeHtml(initials)}
                </div>
                <div class="user-row-info">
                    <span class="user-display-name">${escapeHtml(name)}</span>
                </div>
                ${unread > 0 ? `<span class="unread-badge">${unread}</span>` : `<span class="status-dot ${isOnline ? 'online' : 'offline'}" style="margin-left: auto;"></span>`}
            `;
            li.addEventListener('click', () => selectChannel(dm));
            elements.directChatList.appendChild(li);
        });
    }

    async function loadOnlineUsers() {
        try {
            const users = await ApiService.fetchOnlineUsers();
            elements.onlineUsersList.innerHTML = '';
            users.forEach(u => {
                const li = document.createElement('li');
                li.className = 'channel-item';
                li.title = `Click to chat with ${u.displayName || u.username}`;

                const isMe = u.username.toLowerCase() === currentUser.username.toLowerCase();
                const name = (u.displayName || u.username) + (isMe ? ' (You)' : '');
                const initials = getInitials(name);
                const color = u.avatarColor || '#6264A7';

                li.innerHTML = `
                    <div class="mini-avatar" style="background-color: ${color};">
                        ${escapeHtml(initials)}
                    </div>
                    <span style="font-size: 11px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                        ${escapeHtml(name)}
                    </span>
                    <span class="status-dot online" style="margin-left: auto;"></span>
                `;

                if (!isMe) {
                    li.addEventListener('click', () => startDirectChatWithUser(u));
                }
                elements.onlineUsersList.appendChild(li);
            });
        } catch (e) {}
    }

    async function startDirectChatWithUser(targetUser) {
        if (!targetUser || !targetUser.username) return;
        if (targetUser.username.toLowerCase() === currentUser.username.toLowerCase()) {
            return;
        }

        try {
            const directChannel = await ApiService.getOrCreateDirectChannel(currentUser.username, targetUser.username);
            
            const existingIdx = directChannels.findIndex(c => c.id === directChannel.id);
            if (existingIdx === -1) {
                directChannels.unshift(directChannel);
            } else {
                directChannels[existingIdx] = directChannel;
            }
            renderDirectChannels();

            await selectChannel(directChannel);

            closeSearchDropdown();
            closeDirectChatModal();
        } catch (err) {
            console.error('[App] Failed to start direct chat:', err);
            alert('Failed to start chat: ' + err.message);
        }
    }

    async function searchUsers(query, containerEl) {
        containerEl.innerHTML = '<div style="padding: 8px; font-size: 11px; color: var(--text-muted);">Searching...</div>';
        try {
            const results = await ApiService.searchUsers(query, currentUser.username);
            containerEl.innerHTML = '';

            if (!results || results.length === 0) {
                containerEl.innerHTML = '<div style="padding: 10px; font-size: 11px; color: var(--text-muted); text-align: center;">No teammates found.</div>';
                return;
            }

            results.forEach(user => {
                const item = document.createElement('div');
                item.className = 'user-result-item';

                const name = user.displayName || user.username;
                const initials = getInitials(name);
                const color = user.avatarColor || '#6264A7';

                item.innerHTML = `
                    <div class="avatar" style="width: 28px; height: 28px; font-size: 11px; background-color: ${color};">
                        ${escapeHtml(initials)}
                    </div>
                    <div class="user-row-info">
                        <span class="user-display-name">${escapeHtml(name)}</span>
                        <span class="user-handle">@${escapeHtml(user.username)}</span>
                    </div>
                    <button class="btn-primary" style="padding: 3px 8px; font-size: 11px;">Chat</button>
                `;
                item.addEventListener('click', () => startDirectChatWithUser(user));
                containerEl.appendChild(item);
            });
        } catch (err) {
            containerEl.innerHTML = `<div style="padding: 8px; font-size: 11px; color: var(--danger);">Search error: ${escapeHtml(err.message)}</div>`;
        }
    }

    /**
     * Switch account in this specific window
     */
    async function switchToUser(username, displayName, avatarColor) {
        currentUser = await ApiService.switchSessionUser(username, displayName, avatarColor);
        renderHeaderUserProfile();
        elements.messagesContainer.innerHTML = '';
        currentChannel = null;
        await refreshAllChannels();
        if (publicChannels.length > 0) {
            await selectChannel(publicChannels[0]);
        }
        subscribeToPersonalNotifications();
        loadOnlineUsers();
    }

    async function renderSwitchUserDropdown() {
        elements.switchUserList.innerHTML = '<div style="padding: 6px 10px; font-size: 11px; color: var(--text-muted);">Loading accounts...</div>';
        try {
            const users = await ApiService.fetchOnlineUsers();
            
            // Standard preset accounts for easy testing
            const accounts = [
                { username: 'rohit', displayName: 'Rohit Vaghasiya', avatarColor: '#6264A7' },
                { username: 'team_member', displayName: 'Team Member', avatarColor: '#0078D4' }
            ];

            users.forEach(u => {
                if (!accounts.some(a => a.username.toLowerCase() === u.username.toLowerCase())) {
                    accounts.push({
                        username: u.username,
                        displayName: u.displayName || u.username,
                        avatarColor: u.avatarColor || '#107C41'
                    });
                }
            });

            elements.switchUserList.innerHTML = '';
            accounts.forEach(acc => {
                const isCurrent = currentUser && currentUser.username.toLowerCase() === acc.username.toLowerCase();
                const item = document.createElement('div');
                item.className = 'switch-user-item' + (isCurrent ? ' active' : '');
                item.innerHTML = `
                    <div class="mini-avatar" style="background-color: ${acc.avatarColor};">
                        ${escapeHtml(getInitials(acc.displayName))}
                    </div>
                    <div style="display: flex; flex-direction: column; overflow: hidden; white-space: nowrap; text-overflow: ellipsis;">
                        <span style="font-weight: 500;">${escapeHtml(acc.displayName)}</span>
                        <span style="font-size: 10px; color: var(--text-muted);">@${escapeHtml(acc.username)}</span>
                    </div>
                    ${isCurrent ? '<span style="margin-left: auto; font-size: 11px;">✓</span>' : ''}
                `;
                item.addEventListener('click', async () => {
                    elements.switchUserDropdown.style.display = 'none';
                    if (!isCurrent) {
                        await switchToUser(acc.username, acc.displayName, acc.avatarColor);
                    }
                });
                elements.switchUserList.appendChild(item);
            });
        } catch (e) {
            elements.switchUserList.innerHTML = '<div style="padding: 6px 10px; font-size: 11px; color: var(--danger);">Error loading accounts</div>';
        }
    }

    async function sendMessage() {
        const text = elements.messageInput.value.trim();
        if (!text || !currentChannel) return;

        const payload = {
            channelId: currentChannel.id,
            sender: currentUser.username,
            senderDisplayName: currentUser.displayName,
            senderAvatarColor: currentUser.avatarColor,
            content: text,
            type: 'CHAT'
        };

        elements.messageInput.value = '';
        elements.messageInput.style.height = 'auto';

        let sent = false;
        if (stompClient && stompClient.connected) {
            sent = stompClient.send('/app/chat.send', payload);
        }

        if (!sent) {
            try {
                const saved = await ApiService.sendMessageRest(payload);
                appendMessage(saved);
                scrollToBottom();
            } catch (err) {
                console.error('[App] Failed to send message:', err);
                renderSystemNotice('Failed to deliver message. Check server connection.');
            }
        }
    }

    function appendMessage(msg) {
        if (!msg || !msg.content) return;
        if (msg.id && document.getElementById(`msg-${msg.id}`)) {
            return;
        }

        if (msg.type === 'JOIN' || msg.type === 'LEAVE') {
            const div = document.createElement('div');
            div.className = 'system-message';
            div.textContent = msg.content;
            elements.messagesContainer.appendChild(div);
            return;
        }

        const initials = getInitials(msg.senderDisplayName || msg.sender);
        const color = msg.senderAvatarColor || '#6264A7';
        const formattedTime = formatTimestamp(msg.timestamp);

        const msgDiv = document.createElement('div');
        msgDiv.className = 'message-item';
        if (msg.id) msgDiv.id = `msg-${msg.id}`;

        msgDiv.innerHTML = `
            <div class="avatar" style="background-color: ${color};">
                ${escapeHtml(initials)}
            </div>
            <div class="message-content-wrapper">
                <div class="message-meta">
                    <span class="sender-name">${escapeHtml(msg.senderDisplayName || msg.sender)}</span>
                    <span class="message-time">${escapeHtml(formattedTime)}</span>
                </div>
                <div class="message-body">${formatMessageBody(msg.content)}</div>
            </div>
        `;
        elements.messagesContainer.appendChild(msgDiv);
    }

    function renderSystemNotice(html) {
        const div = document.createElement('div');
        div.className = 'system-message';
        div.style.padding = '8px 12px';
        div.style.background = 'rgba(255, 193, 7, 0.1)';
        div.style.border = '1px solid rgba(255, 193, 7, 0.3)';
        div.style.borderRadius = '4px';
        div.style.margin = '8px 0';
        div.innerHTML = html;
        elements.messagesContainer.appendChild(div);
        scrollToBottom();
    }

    function updateStatus(status, text) {
        elements.statusDot.className = 'status-dot ' + status;
        elements.statusText.textContent = text;
    }

    function scrollToBottom() {
        elements.messagesContainer.scrollTop = elements.messagesContainer.scrollHeight;
    }

    function getInitials(name) {
        if (!name) return '?';
        const parts = name.trim().split(/\s+/);
        if (parts.length >= 2) {
            return (parts[0][0] + parts[1][0]).toUpperCase();
        }
        return name.substring(0, 2).toUpperCase();
    }

    function formatTimestamp(isoString) {
        if (!isoString) return '';
        try {
            const date = new Date(isoString);
            if (isNaN(date.getTime())) return isoString;
            return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } catch (e) {
            return '';
        }
    }

    function formatMessageBody(text) {
        const escaped = escapeHtml(text);
        let formatted = escaped.replace(/```([\s\S]*?)```/g, '<pre style="background: #111; padding: 6px; border-radius: 4px; overflow-x: auto; margin: 4px 0;"><code>$1</code></pre>');
        formatted = formatted.replace(/`([^`]+)`/g, '<code style="background: rgba(255,255,255,0.1); padding: 1px 4px; border-radius: 3px;">$1</code>');
        formatted = formatted.replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank" rel="noopener noreferrer" style="color: var(--brand-primary); text-decoration: underline;">$1</a>');
        return formatted;
    }

    function escapeHtml(str) {
        if (!str) return '';
        return str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    function closeSearchDropdown() {
        elements.searchResultsDropdown.style.display = 'none';
        elements.searchResultsDropdown.innerHTML = '';
        elements.userSearchInput.value = '';
        elements.clearSearchBtn.style.display = 'none';
    }

    function closeDirectChatModal() {
        elements.newDirectChatModal.classList.remove('active');
        elements.modalSearchInput.value = '';
        elements.modalSearchResults.innerHTML = '';
    }

    function closeSwitchUserModal() {
        elements.switchUserModal.classList.remove('active');
        elements.switchDisplayName.value = '';
        elements.switchUsername.value = '';
    }

    async function refreshMembersAndChannels() {
        try {
            await refreshAllChannels();
            await loadOnlineUsers();
        } catch (e) {}
    }

    function setupEventListeners() {
        // Toggle Sidebar
        elements.toggleSidebarBtn.addEventListener('click', () => {
            elements.channelsSidebar.classList.toggle('collapsed');
        });

        // User Profile Pill in Header
        elements.userProfileBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const isOpen = elements.switchUserDropdown.style.display === 'block';
            if (isOpen) {
                elements.switchUserDropdown.style.display = 'none';
            } else {
                elements.switchUserDropdown.style.display = 'block';
                renderSwitchUserDropdown();
            }
        });

        document.addEventListener('click', (e) => {
            if (!e.target.closest('.user-profile-menu-container')) {
                elements.switchUserDropdown.style.display = 'none';
            }
        });

        // Add / Switch custom account modal
        elements.addNewUserBtn.addEventListener('click', () => {
            elements.switchUserDropdown.style.display = 'none';
            elements.switchUserModal.classList.add('active');
            elements.switchDisplayName.focus();
        });

        elements.closeSwitchUserModalBtn.addEventListener('click', closeSwitchUserModal);
        elements.cancelSwitchUserModalBtn.addEventListener('click', closeSwitchUserModal);

        elements.confirmSwitchUserBtn.addEventListener('click', async () => {
            const dName = elements.switchDisplayName.value.trim();
            const uName = elements.switchUsername.value.trim() || dName.toLowerCase().replace(/\s+/g, '_');
            if (!dName && !uName) return;

            await switchToUser(uName, dName || uName, null);
            closeSwitchUserModal();
        });

        // Search box at top of sidebar
        let searchDebounce = null;
        elements.userSearchInput.addEventListener('input', () => {
            const q = elements.userSearchInput.value.trim();
            elements.clearSearchBtn.style.display = q ? 'block' : 'none';

            if (!q) {
                elements.searchResultsDropdown.style.display = 'none';
                return;
            }

            elements.searchResultsDropdown.style.display = 'block';
            clearTimeout(searchDebounce);
            searchDebounce = setTimeout(() => {
                searchUsers(q, elements.searchResultsDropdown);
            }, 300);
        });

        elements.clearSearchBtn.addEventListener('click', closeSearchDropdown);

        // Close search dropdown if clicked outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.search-wrapper')) {
                elements.searchResultsDropdown.style.display = 'none';
            }
        });

        // Open Direct Chat Search Modal
        elements.openNewDirectChatBtn.addEventListener('click', () => {
            elements.newDirectChatModal.classList.add('active');
            elements.modalSearchInput.focus();
            searchUsers('', elements.modalSearchResults);
        });

        elements.closeDirectChatModalBtn.addEventListener('click', closeDirectChatModal);
        elements.cancelDirectChatModalBtn.addEventListener('click', closeDirectChatModal);

        let modalSearchDebounce = null;
        elements.modalSearchInput.addEventListener('input', () => {
            const q = elements.modalSearchInput.value.trim();
            clearTimeout(modalSearchDebounce);
            modalSearchDebounce = setTimeout(() => {
                searchUsers(q, elements.modalSearchResults);
            }, 300);
        });

        // Send Message
        elements.sendBtn.addEventListener('click', sendMessage);
        elements.messageInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });

        // Auto-grow textarea
        elements.messageInput.addEventListener('input', () => {
            elements.messageInput.style.height = 'auto';
            elements.messageInput.style.height = Math.min(elements.messageInput.scrollHeight, 100) + 'px';
        });

        // Emoji tool
        elements.emojiBtn.addEventListener('click', () => {
            const emojis = ['👍', '🎉', '🚀', '❤️', '😊', '🔥', '👀', '💯'];
            const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];
            elements.messageInput.value += randomEmoji;
            elements.messageInput.focus();
        });

        // Code snippet tool
        elements.codeSnippetBtn.addEventListener('click', () => {
            elements.messageInput.value += '```\n// code snippet\n```';
            elements.messageInput.focus();
        });

        // Settings Modal
        elements.openSettingsBtn.addEventListener('click', () => {
            elements.settingsModal.classList.add('active');
        });

        const closeSettings = () => elements.settingsModal.classList.remove('active');
        elements.closeSettingsBtn.addEventListener('click', closeSettings);
        elements.cancelSettingsBtn.addEventListener('click', closeSettings);

        elements.saveSettingsBtn.addEventListener('click', async () => {
            const newUrl = elements.settingServerUrl.value.trim();
            const newDisplayName = elements.settingDisplayName.value.trim();
            const newUsername = elements.settingUsername.value.trim();

            if (newUrl) await ApiService.setServerUrl(newUrl);

            currentUser.displayName = newDisplayName || currentUser.displayName;
            currentUser.username = newUsername || currentUser.username;
            await ApiService.saveUserProfile(currentUser);

            renderHeaderUserProfile();
            closeSettings();
            await loadChannelsAndConnect();
        });

        // New Channel Modal
        elements.addChannelBtn.addEventListener('click', () => {
            elements.newChannelModal.classList.add('active');
            elements.newChannelName.focus();
        });

        const closeNewChannel = () => {
            elements.newChannelModal.classList.remove('active');
            elements.newChannelName.value = '';
            elements.newChannelDesc.value = '';
        };
        elements.closeNewChannelBtn.addEventListener('click', closeNewChannel);
        elements.cancelNewChannelBtn.addEventListener('click', closeNewChannel);

        elements.submitNewChannelBtn.addEventListener('click', async () => {
            const name = elements.newChannelName.value.trim();
            const desc = elements.newChannelDesc.value.trim();
            if (!name) return;

            try {
                const created = await ApiService.createChannel(name, desc);
                publicChannels.push(created);
                renderPublicChannels();
                await selectChannel(created);
                closeNewChannel();
            } catch (err) {
                alert('Failed to create channel: ' + err.message);
            }
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
