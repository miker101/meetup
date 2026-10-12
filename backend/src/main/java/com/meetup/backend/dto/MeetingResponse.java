package com.meetup.backend.dto;

import java.time.LocalDateTime;

public class MeetingResponse {


private Long id;

private Long participantId;

private String name;

private String pin;

private String hostName;

private LocalDateTime createdAt;

public MeetingResponse() {

}

public MeetingResponse(

        Long id,

        Long participantId,

        String name,

        String pin,

        String hostName,

        LocalDateTime createdAt) {

    this.id = id;

    this.participantId = participantId;

    this.name = name;

    this.pin = pin;

    this.hostName = hostName;

    this.createdAt = createdAt;

}

public Long getId() {

    return id;

}

public Long getParticipantId() {

    return participantId;

}

public String getName() {

    return name;

}

public String getPin() {

    return pin;

}

public String getHostName() {

    return hostName;

}

public LocalDateTime getCreatedAt() {

    return createdAt;

}


}
