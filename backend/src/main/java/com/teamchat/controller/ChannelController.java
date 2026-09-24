package com.teamchat.controller;

import com.teamchat.dto.ChannelDto;
import com.teamchat.model.Channel;
import com.teamchat.service.ChatService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/channels")
public class ChannelController {

    private final ChatService chatService;

    public ChannelController(ChatService chatService) {
        this.chatService = chatService;
    }

    @GetMapping
    public List<ChannelDto> getChannels() {
        return chatService.getPublicChannels();
    }

    @PostMapping
    public ResponseEntity<Channel> createChannel(@RequestBody Map<String, String> payload) {
        String name = payload.get("name");
        String description = payload.getOrDefault("description", "");
        if (name == null || name.trim().isEmpty()) {
            return ResponseEntity.badRequest().build();
        }
        Channel created = chatService.createChannel(name, description);
        return ResponseEntity.ok(created);
    }

    @PostMapping("/direct")
    public ResponseEntity<ChannelDto> getOrCreateDirectChannel(@RequestBody Map<String, String> payload) {
        String user1 = payload.get("user1");
        String user2 = payload.get("user2");
        if (user1 == null || user2 == null || user1.isBlank() || user2.isBlank()) {
            return ResponseEntity.badRequest().build();
        }
        ChannelDto directChannel = chatService.getOrCreateDirectChannel(user1, user2);
        return ResponseEntity.ok(directChannel);
    }

    @GetMapping("/direct")
    public List<ChannelDto> getUserDirectChannels(@RequestParam String username) {
        return chatService.getUserDirectChannels(username);
    }
}
