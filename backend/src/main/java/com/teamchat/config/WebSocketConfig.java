package com.teamchat.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.*;

@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    @Override
    public void configureMessageBroker(MessageBrokerRegistry config) {
        // In-memory message broker with destinations prefixed with /topic or /queue
        config.enableSimpleBroker("/topic", "/queue");
        // Messages routed from client to methods annotated with @MessageMapping will start with /app
        config.setApplicationDestinationPrefixes("/app");
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        // Endpoint with SockJS fallback
        registry.addEndpoint("/ws-chat")
                .setAllowedOriginPatterns("*")
                .withSockJS();

        // Native WebSocket endpoint without SockJS wrapper
        registry.addEndpoint("/ws-chat-native")
                .setAllowedOriginPatterns("*");
    }
}
