package com.teamchat.controller;

import com.teamchat.model.User;
import com.teamchat.service.ChatService;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/users")
public class UserController {

    private final ChatService chatService;

    public UserController(ChatService chatService) {
        this.chatService = chatService;
    }

    @PostMapping("/register")
    public User registerUser(@RequestBody Map<String, String> payload) {
        String username = payload.get("username");
        String displayName = payload.getOrDefault("displayName", username);
        String avatarColor = payload.getOrDefault("avatarColor", "#6264A7");
        return chatService.registerOrUpdateUser(username, displayName, avatarColor);
    }

    @GetMapping("/online")
    public List<User> getOnlineUsers() {
        return chatService.getOnlineUsers();
    }

    @GetMapping
    public List<User> getAllUsers() {
        return chatService.getOnlineUsers();
    }

    @GetMapping("/search")
    public List<User> searchUsers(
            @RequestParam(required = false, defaultValue = "") String q,
            @RequestParam(required = false, defaultValue = "") String currentUsername) {
        return chatService.searchUsers(q, currentUsername);
    }
}
