package com.teamchat.dto;

public class ChatMessageDto {
    private Long id;
    private Long channelId;
    private String sender;
    private String senderDisplayName;
    private String senderAvatarColor;
    private String content;
    private String timestamp;
    private String type; // CHAT, JOIN, LEAVE, STATUS

    public ChatMessageDto() {}

    public ChatMessageDto(Long id, Long channelId, String sender, String senderDisplayName, String senderAvatarColor, String content, String timestamp, String type) {
        this.id = id;
        this.channelId = channelId;
        this.sender = sender;
        this.senderDisplayName = senderDisplayName;
        this.senderAvatarColor = senderAvatarColor;
        this.content = content;
        this.timestamp = timestamp;
        this.type = type;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getChannelId() { return channelId; }
    public void setChannelId(Long channelId) { this.channelId = channelId; }

    public String getSender() { return sender; }
    public void setSender(String sender) { this.sender = sender; }

    public String getSenderDisplayName() { return senderDisplayName; }
    public void setSenderDisplayName(String senderDisplayName) { this.senderDisplayName = senderDisplayName; }

    public String getSenderAvatarColor() { return senderAvatarColor; }
    public void setSenderAvatarColor(String senderAvatarColor) { this.senderAvatarColor = senderAvatarColor; }

    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }

    public String getTimestamp() { return timestamp; }
    public void setTimestamp(String timestamp) { this.timestamp = timestamp; }

    public String getType() { return type; }
    public void setType(String type) { this.type = type; }
}
