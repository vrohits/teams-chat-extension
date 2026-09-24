package com.teamchat.service;

import com.teamchat.dto.ChannelDto;
import com.teamchat.dto.ChatMessageDto;
import com.teamchat.model.Channel;
import com.teamchat.model.Message;
import com.teamchat.model.User;
import com.teamchat.repository.ChannelRepository;
import com.teamchat.repository.MessageRepository;
import com.teamchat.repository.UserRepository;
import jakarta.annotation.PostConstruct;
import org.springframework.data.domain.PageRequest;
import org.springframework.messaging.simp.SimpMessageSendingOperations;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
public class ChatService {

    private final ChannelRepository channelRepository;
    private final MessageRepository messageRepository;
    private final UserRepository userRepository;

    private static final DateTimeFormatter ISO_FORMATTER = DateTimeFormatter.ISO_LOCAL_DATE_TIME;

    public ChatService(ChannelRepository channelRepository,
                       MessageRepository messageRepository,
                       UserRepository userRepository) {
        this.channelRepository = channelRepository;
        this.messageRepository = messageRepository;
        this.userRepository = userRepository;
    }

    @PostConstruct
    public void initDefaultData() {
        if (channelRepository.count() == 0) {
            Channel general = new Channel("general", "Company-wide announcements and team discussions");
            Channel dev = new Channel("development", "Engineering discussions, code reviews, and sprints");
            Channel random = new Channel("random", "Non-work banter, coffee breaks, and water cooler chat");

            channelRepository.save(general);
            channelRepository.save(dev);
            channelRepository.save(random);

            // Add welcome messages
            Message welcomeMsg = new Message(
                    general.getId(),
                    "system",
                    "Teams Bot",
                    "#6264A7",
                    "Welcome to Teams Chat! You can chat in public channels or search for teammates to send 1-on-1 direct messages.",
                    "CHAT"
            );
            messageRepository.save(welcomeMsg);
        }
    }

    public List<ChannelDto> getPublicChannels() {
        List<Channel> channels = channelRepository.findByIsDirectFalse();
        List<ChannelDto> result = new ArrayList<>();

        for (Channel c : channels) {
            ChannelDto dto = new ChannelDto(c.getId(), c.getName(), c.getDescription(), false);
            populateLastMessage(dto, c.getId());
            result.add(dto);
        }
        return result;
    }

    public Channel createChannel(String name, String description) {
        String cleanName = name.trim().toLowerCase().replaceAll("[^a-z0-9_-]", "-");
        return channelRepository.findByNameIgnoreCase(cleanName)
                .orElseGet(() -> channelRepository.save(new Channel(cleanName, description)));
    }

    /**
     * Finds or creates a private 1-on-1 Direct Chat channel between user1 and user2
     */
    public ChannelDto getOrCreateDirectChannel(String user1, String user2) {
        String u1 = user1.trim().toLowerCase();
        String u2 = user2.trim().toLowerCase();
        String channelName = "dm:" + (u1.compareTo(u2) < 0 ? u1 + ":" + u2 : u2 + ":" + u1);

        Channel channel = channelRepository.findByNameIgnoreCase(channelName)
                .orElseGet(() -> {
                    Channel direct = new Channel(channelName, "Direct chat between " + u1 + " and " + u2);
                    direct.setDirect(true);
                    return channelRepository.save(direct);
                });

        ChannelDto dto = new ChannelDto(channel.getId(), channel.getName(), channel.getDescription(), true);
        populatePeerInfo(dto, channelName, u1);
        populateLastMessage(dto, channel.getId());
        return dto;
    }

    /**
     * Lists all 1-on-1 direct chats for a specific user
     */
    public List<ChannelDto> getUserDirectChannels(String currentUsername) {
        String cleanUser = currentUsername.trim().toLowerCase();
        List<Channel> directChannels = channelRepository.findByIsDirectTrueAndNameContainingIgnoreCase(":" + cleanUser);
        List<ChannelDto> result = new ArrayList<>();

        for (Channel c : directChannels) {
            ChannelDto dto = new ChannelDto(c.getId(), c.getName(), c.getDescription(), true);
            populatePeerInfo(dto, c.getName(), cleanUser);
            populateLastMessage(dto, c.getId());
            result.add(dto);
        }
        return result;
    }

    private void populatePeerInfo(ChannelDto dto, String dmChannelName, String currentUsername) {
        String[] parts = dmChannelName.split(":");
        if (parts.length >= 3) {
            String peer = parts[1].equalsIgnoreCase(currentUsername) ? parts[2] : parts[1];
            dto.setPeerUsername(peer);

            userRepository.findByUsernameIgnoreCase(peer).ifPresentOrElse(user -> {
                dto.setPeerDisplayName(user.getDisplayName() != null ? user.getDisplayName() : user.getUsername());
                dto.setPeerAvatarColor(user.getAvatarColor() != null ? user.getAvatarColor() : "#6264A7");
                dto.setPeerStatus(user.getStatus());
            }, () -> {
                dto.setPeerDisplayName(peer);
                dto.setPeerAvatarColor("#6264A7");
                dto.setPeerStatus("OFFLINE");
            });
        }
    }

    private void populateLastMessage(ChannelDto dto, Long channelId) {
        List<Message> latest = messageRepository.findByChannelIdOrderByTimestampDesc(channelId, PageRequest.of(0, 1));
        if (!latest.isEmpty()) {
            Message last = latest.get(0);
            dto.setLastMessage(last.getSenderDisplayName() + ": " + last.getContent());
            dto.setLastMessageTime(last.getTimestamp().format(DateTimeFormatter.ofPattern("HH:mm")));
        } else {
            dto.setLastMessage("No messages yet");
            dto.setLastMessageTime("");
        }
    }

    public List<User> searchUsers(String query, String currentUsername) {
        String q = query != null ? query.trim() : "";
        List<User> list;
        if (q.isEmpty()) {
            list = userRepository.findAll();
        } else {
            list = userRepository.findByUsernameContainingIgnoreCaseOrDisplayNameContainingIgnoreCase(q, q);
        }

        if (currentUsername != null && !currentUsername.isBlank()) {
            return list.stream()
                    .filter(u -> !u.getUsername().equalsIgnoreCase(currentUsername))
                    .collect(Collectors.toList());
        }
        return list;
    }

    @Transactional
    public ChatMessageDto saveMessage(ChatMessageDto dto) {
        Message msg = new Message(
                dto.getChannelId(),
                dto.getSender(),
                dto.getSenderDisplayName(),
                dto.getSenderAvatarColor(),
                dto.getContent(),
                dto.getType()
        );
        msg = messageRepository.save(msg);

        // Update user lastSeen
        userRepository.findByUsernameIgnoreCase(dto.getSender()).ifPresent(user -> {
            user.setLastSeen(LocalDateTime.now());
            user.setStatus("ONLINE");
            userRepository.save(user);
        });

        dto.setId(msg.getId());
        dto.setTimestamp(msg.getTimestamp().format(ISO_FORMATTER));
        return dto;
    }

    /**
     * Broadcasts to personal user topics for direct chat notifications
     */
    public void notifyDirectUsers(ChatMessageDto msg, SimpMessageSendingOperations messagingTemplate) {
        channelRepository.findById(msg.getChannelId()).ifPresent(channel -> {
            if (channel.isDirect() && channel.getName().startsWith("dm:")) {
                String[] parts = channel.getName().split(":");
                if (parts.length >= 3) {
                    messagingTemplate.convertAndSend("/topic/user." + parts[1].toLowerCase(), msg);
                    messagingTemplate.convertAndSend("/topic/user." + parts[2].toLowerCase(), msg);
                }
            }
        });
    }

    public List<ChatMessageDto> getMessagesByChannel(Long channelId, int limit) {
        List<Message> messages = messageRepository.findByChannelIdOrderByTimestampDesc(
                channelId, PageRequest.of(0, limit)
        );
        Collections.reverse(messages);
        return messages.stream().map(this::toDto).collect(Collectors.toList());
    }

    public User registerOrUpdateUser(String username, String displayName, String avatarColor) {
        return userRepository.findByUsernameIgnoreCase(username)
                .map(existing -> {
                    if (displayName != null && !displayName.isBlank()) existing.setDisplayName(displayName);
                    if (avatarColor != null && !avatarColor.isBlank()) existing.setAvatarColor(avatarColor);
                    existing.setStatus("ONLINE");
                    existing.setLastSeen(LocalDateTime.now());
                    return userRepository.save(existing);
                })
                .orElseGet(() -> userRepository.save(new User(username, displayName, avatarColor)));
    }

    public List<User> getOnlineUsers() {
        return userRepository.findAll();
    }

    private ChatMessageDto toDto(Message m) {
        return new ChatMessageDto(
                m.getId(),
                m.getChannelId(),
                m.getSender(),
                m.getSenderDisplayName(),
                m.getSenderAvatarColor(),
                m.getContent(),
                m.getTimestamp().format(ISO_FORMATTER),
                m.getType()
        );
    }
}
