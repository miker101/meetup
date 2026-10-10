package com.meetup.backend.repository;

import com.meetup.backend.entity.Meeting;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface MeetingRepository extends JpaRepository<Meeting, Long> {

    Optional<Meeting> findByPin(String pin);

    boolean existsByPin(String pin);
}