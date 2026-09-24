package com.teamchat.repository;

import com.teamchat.model.Channel;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ChannelRepository extends JpaRepository<Channel, Long> {
    Optional<Channel> findByNameIgnoreCase(String name);
    List<Channel> findByIsDirectFalse();
    List<Channel> findByIsDirectTrue();
    List<Channel> findByIsDirectTrueAndNameContainingIgnoreCase(String username);
}
