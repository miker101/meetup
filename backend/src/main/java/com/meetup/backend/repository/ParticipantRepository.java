package com.meetup.backend.repository;

import com.meetup.backend.entity.Participant;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;


public interface ParticipantRepository
extends JpaRepository<Participant, Long> {

List<Participant> findByMeetingIdAndActiveTrue(
        Long meetingId
);
Optional<Participant> findByIdAndMeetingId(
        Long participantId,
        Long meetingId
);



}
