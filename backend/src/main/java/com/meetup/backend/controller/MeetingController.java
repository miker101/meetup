package com.meetup.backend.controller;

import com.meetup.backend.dto.CreateMeetingRequest;
import com.meetup.backend.service.MeetingService;
import com.meetup.backend.dto.MeetingResponse;

import jakarta.validation.Valid;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import com.meetup.backend.dto.JoinMeetingRequest;

import com.meetup.backend.dto.ParticipantResponse;

import java.util.List;

@RestController
@RequestMapping("/api/meetings")
public class MeetingController {

    private final MeetingService meetingService;

    public MeetingController(MeetingService meetingService) {
        this.meetingService = meetingService;
    }
    

    @PostMapping
    public ResponseEntity<MeetingResponse> createMeeting(
            @Valid @RequestBody CreateMeetingRequest request) {

        MeetingResponse meeting = meetingService.createMeeting(
                request.getMeetingName(),
                request.getDisplayName()
        );

        return ResponseEntity.ok(meeting);
    }
    @PostMapping("/join")
    public ResponseEntity<MeetingResponse> joinMeeting(
            @Valid @RequestBody JoinMeetingRequest request) {

        MeetingResponse meeting = meetingService.joinMeeting(
                request.getMeetingPin(),
                request.getDisplayName()
        );

        return ResponseEntity.ok(meeting);
    }
    @GetMapping("/{meetingId}/participants")
    public ResponseEntity<List<ParticipantResponse>> getParticipants(
            @PathVariable Long meetingId) {

        List<ParticipantResponse> participants =
                meetingService.getParticipants(meetingId);

        return ResponseEntity.ok(participants);
    }
}