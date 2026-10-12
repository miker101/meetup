package com.meetup.backend.service;

import com.meetup.backend.entity.Meeting;
import com.meetup.backend.entity.Participant;
import com.meetup.backend.repository.MeetingRepository;
import com.meetup.backend.repository.ParticipantRepository;

import org.springframework.stereotype.Service;

import java.util.Random;

import com.meetup.backend.exception.MeetingNotFoundException;
import com.meetup.backend.dto.MeetingResponse;
import com.meetup.backend.dto.ParticipantResponse;

import java.util.List;

@Service
public class MeetingService {


private final MeetingRepository meetingRepository;
private final ParticipantRepository participantRepository;

public MeetingService(
        MeetingRepository meetingRepository,
        ParticipantRepository participantRepository) {

    this.meetingRepository = meetingRepository;
    this.participantRepository = participantRepository;
}

public MeetingResponse createMeeting(
        String meetingName,
        String hostName) {

    // Generate a unique six-digit meeting PIN.
    String pin = generateUniquePin();

    // Create the meeting.
    Meeting meeting = new Meeting(
            meetingName,
            pin,
            hostName
    );

    // Save the meeting first so it receives its database ID.
    Meeting savedMeeting =
            meetingRepository.save(meeting);

    // Create the host as the first participant.
    Participant host =
            new Participant(
                    hostName,
                    true,
                    savedMeeting
            );

    // Save the host participant.
    Participant savedHost =
            participantRepository.save(host);

    /*
     * Return the meeting information together
     * with the host's participant ID.
     */
    return convertToResponse(
            savedMeeting,
            savedHost.getId()
    );
}

public MeetingResponse joinMeeting(
        String meetingPin,
        String displayName) {

    // Find the meeting using the PIN.
    Meeting meeting =
            meetingRepository.findByPin(meetingPin)
                    .orElseThrow(() ->
                            new MeetingNotFoundException(
                                    "Meeting not found"
                            ));

    // Create the person joining the meeting.
    Participant participant =
            new Participant(
                    displayName,
                    false,
                    meeting
            );

    // New participants start as active.
    participant.setActive(true);

    // Save the participant and receive its ID.
    Participant savedParticipant =
            participantRepository.save(participant);

    /*
     * Return the meeting information together
     * with this participant's ID.
     */
    return convertToResponse(
            meeting,
            savedParticipant.getId()
    );
}

private String generateUniquePin() {

    Random random = new Random();

    String pin;

    do {

        pin = String.format(
                "%06d",
                random.nextInt(1_000_000)
        );

    } while (
            meetingRepository.existsByPin(pin)
    );

    return pin;
}

private MeetingResponse convertToResponse(
        Meeting meeting,
        Long participantId) {

    return new MeetingResponse(
            meeting.getId(),
            participantId,
            meeting.getName(),
            meeting.getPin(),
            meeting.getHostName(),
            meeting.getCreatedAt()
    );
}

public List<ParticipantResponse> getParticipants(
        Long meetingId) {

    /*
     * Only return participants who are
     * currently active in the meeting.
     */
    List<Participant> participants =
            participantRepository
                    .findByMeetingIdAndActiveTrue(
                            meetingId
                    );

    return participants.stream()
            .map(participant ->
                    new ParticipantResponse(
                            participant.getId(),
                            participant.getDisplayName(),
                            participant.isHost()
                    ))
            .toList();
}


}
