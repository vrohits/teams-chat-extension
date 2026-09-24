package com.teamchat.controller;

import com.teamchat.dto.ChatMessageDto;
import com.teamchat.service.ChatService;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessageSendingOperations;
import org.springframework.web.bind.annotation.*;

@RestController
public class ChatController {

    private final SimpMessageSendingOperations messagingTemplate;
    private final ChatService chatService;

    public ChatController(SimpMessageSendingOperations messagingTemplate, ChatService chatService) {
        this.messagingTemplate = messagingTemplate;
        this.chatService = chatService;
    }

    /**
     * WebSocket endpoint: client sends to /app/chat.send
     * Broadcasts saved message to /topic/channel.{channelId} and personal user topics
     */
    @MessageMapping("/chat.send")
    public void sendMessage(@Payload ChatMessageDto messageDto) {
        ChatMessageDto saved = chatService.saveMessage(messageDto);
        messagingTemplate.convertAndSend("/topic/channel." + saved.getChannelId(), saved);
        chatService.notifyDirectUsers(saved, messagingTemplate);
    }

    /**
     * WebSocket endpoint: client announces user joined a channel
     */
    @MessageMapping("/chat.join")
    public void joinChannel(@Payload ChatMessageDto messageDto) {
        messageDto.setType("JOIN");
        messageDto.setContent(messageDto.getSenderDisplayName() + " joined the chat");
        ChatMessageDto saved = chatService.saveMessage(messageDto);
        messagingTemplate.convertAndSend("/topic/channel." + saved.getChannelId(), saved);
    }

    /**
     * Fallback REST endpoint for sending messages if WebSocket disconnects
     */
    @PostMapping("/api/messages")
    public ChatMessageDto sendViaRest(@RequestBody ChatMessageDto messageDto) {
        ChatMessageDto saved = chatService.saveMessage(messageDto);
        messagingTemplate.convertAndSend("/topic/channel." + saved.getChannelId(), saved);
        chatService.notifyDirectUsers(saved, messagingTemplate);
        return saved;
    }
}
