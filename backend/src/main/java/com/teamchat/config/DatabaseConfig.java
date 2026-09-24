package com.teamchat.config;

import com.zaxxer.hikari.HikariConfig;
import com.zaxxer.hikari.HikariDataSource;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;

import javax.sql.DataSource;
import java.net.URI;

@Configuration
public class DatabaseConfig {

    private static final Logger log = LoggerFactory.getLogger(DatabaseConfig.class);

    @Value("${spring.datasource.url}")
    private String rawUrl;

    @Value("${spring.datasource.username:}")
    private String username;

    @Value("${spring.datasource.password:}")
    private String password;

    @Value("${spring.datasource.driver-class-name:org.postgresql.Driver}")
    private String driverClassName;

    @Bean
    @Primary
    public DataSource dataSource() {
        String jdbcUrl = rawUrl;

        // If Render or cloud provider provides postgresql:// or postgres:// URI
        if (rawUrl != null && (rawUrl.startsWith("postgresql://") || rawUrl.startsWith("postgres://"))) {
            try {
                URI uri = new URI(rawUrl);
                String host = uri.getHost();
                int port = uri.getPort() == -1 ? 5432 : uri.getPort();
                String path = uri.getPath() != null && uri.getPath().length() > 1 ? uri.getPath().substring(1) : "chatdb";

                if (uri.getUserInfo() != null) {
                    String[] parts = uri.getUserInfo().split(":");
                    username = parts[0];
                    if (parts.length > 1) {
                        password = parts[1];
                    }
                }

                jdbcUrl = "jdbc:postgresql://" + host + ":" + port + "/" + path;
                log.info("Converted cloud PostgreSQL URL to JDBC: jdbc:postgresql://{}:{}/{}", host, port, path);
            } catch (Exception e) {
                log.warn("Failed to parse DB URI, prepending jdbc: fallback", e);
                if (!rawUrl.startsWith("jdbc:")) {
                    jdbcUrl = "jdbc:" + rawUrl;
                }
            }
        }

        HikariConfig config = new HikariConfig();
        config.setJdbcUrl(jdbcUrl);
        if (username != null && !username.isBlank()) {
            config.setUsername(username);
        }
        if (password != null && !password.isBlank()) {
            config.setPassword(password);
        }
        config.setDriverClassName(driverClassName);
        config.setMaximumPoolSize(5); // Keep pool small for free tier
        config.setMinimumIdle(1);
        config.setConnectionTimeout(30000);
        return new HikariDataSource(config);
    }
}
