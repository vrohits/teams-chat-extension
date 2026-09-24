package com.teamchat.controller;

import com.teamchat.dto.ChatMessageDto;
import com.teamchat.service.ChatService;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/channels/{channelId}/messages")
public class MessageController {

    private final ChatService chatService;

    public MessageController(ChatService chatService) {
        this.chatService = chatService;
    }

    @GetMapping
    public List<ChatMessageDto> getMessages(
            @PathVariable Long channelId,
            @RequestParam(defaultValue = "50") int limit) {
        return chatService.getMessagesByChannel(channelId, limit);
    }
}
