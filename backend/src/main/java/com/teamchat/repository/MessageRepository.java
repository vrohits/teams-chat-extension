package com.teamchat.repository;

import com.teamchat.model.Message;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface MessageRepository extends JpaRepository<Message, Long> {
    List<Message> findByChannelIdOrderByTimestampAsc(Long channelId);
    List<Message> findByChannelIdOrderByTimestampDesc(Long channelId, Pageable pageable);
    Long countByChannelId(Long channelId);
}
