package com.teamchat.dto;

public class ChannelDto {
    private Long id;
    private String name;
    private String description;
    private boolean isDirect;
    private Long unreadCount;
    private String lastMessage;
    private String lastMessageTime;

    // Direct chat peer info
    private String peerUsername;
    private String peerDisplayName;
    private String peerAvatarColor;
    private String peerStatus;

    public ChannelDto() {}

    public ChannelDto(Long id, String name, String description, boolean isDirect) {
        this.id = id;
        this.name = name;
        this.description = description;
        this.isDirect = isDirect;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public boolean isDirect() { return isDirect; }
    public void setDirect(boolean direct) { isDirect = direct; }

    public Long getUnreadCount() { return unreadCount; }
    public void setUnreadCount(Long unreadCount) { this.unreadCount = unreadCount; }

    public String getLastMessage() { return lastMessage; }
    public void setLastMessage(String lastMessage) { this.lastMessage = lastMessage; }

    public String getLastMessageTime() { return lastMessageTime; }
    public void setLastMessageTime(String lastMessageTime) { this.lastMessageTime = lastMessageTime; }

    public String getPeerUsername() { return peerUsername; }
    public void setPeerUsername(String peerUsername) { this.peerUsername = peerUsername; }

    public String getPeerDisplayName() { return peerDisplayName; }
    public void setPeerDisplayName(String peerDisplayName) { this.peerDisplayName = peerDisplayName; }

    public String getPeerAvatarColor() { return peerAvatarColor; }
    public void setPeerAvatarColor(String peerAvatarColor) { this.peerAvatarColor = peerAvatarColor; }

    public String getPeerStatus() { return peerStatus; }
    public void setPeerStatus(String peerStatus) { this.peerStatus = peerStatus; }
}
