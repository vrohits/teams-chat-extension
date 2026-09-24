package com.teamchat.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "messages", indexes = {
    @Index(name = "idx_channel_id", columnList = "channelId"),
    @Index(name = "idx_timestamp", columnList = "timestamp")
})
public class Message {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long channelId;

    @Column(nullable = false)
    private String sender;

    private String senderDisplayName;

    private String senderAvatarColor;

    @Column(columnDefinition = "TEXT", nullable = false)
    private String content;

    private LocalDateTime timestamp = LocalDateTime.now();

    private String type = "CHAT"; // CHAT, JOIN, LEAVE

    public Message() {}

    public Message(Long channelId, String sender, String senderDisplayName, String senderAvatarColor, String content, String type) {
        this.channelId = channelId;
        this.sender = sender;
        this.senderDisplayName = senderDisplayName;
        this.senderAvatarColor = senderAvatarColor;
        this.content = content;
        this.type = type != null ? type : "CHAT";
        this.timestamp = LocalDateTime.now();
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

    public LocalDateTime getTimestamp() { return timestamp; }
    public void setTimestamp(LocalDateTime timestamp) { this.timestamp = timestamp; }

    public String getType() { return type; }
    public void setType(String type) { this.type = type; }
}
