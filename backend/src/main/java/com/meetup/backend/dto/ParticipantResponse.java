package com.meetup.backend.dto;

public class ParticipantResponse {

    private Long id;
    private String displayName;
    private boolean host;

    public ParticipantResponse() {
    }

    public ParticipantResponse(
            Long id,
            String displayName,
            boolean host) {

        this.id = id;
        this.displayName = displayName;
        this.host = host;
    }

    public Long getId() {
        return id;
    }

    public String getDisplayName() {
        return displayName;
    }

    public boolean isHost() {
        return host;
    }
}