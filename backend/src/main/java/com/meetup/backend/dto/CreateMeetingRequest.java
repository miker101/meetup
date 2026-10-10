package com.meetup.backend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class CreateMeetingRequest {

    @NotBlank(message = "Your name is required")
    @Size(max = 50, message = "Your name cannot exceed 50 characters")
    private String displayName;

    @NotBlank(message = "Meeting name is required")
    @Size(max = 100, message = "Meeting name cannot exceed 100 characters")
    private String meetingName;

    public CreateMeetingRequest() {
    }

    public String getDisplayName() {
        return displayName;
    }

    public void setDisplayName(String displayName) {
        this.displayName = displayName;
    }

    public String getMeetingName() {
        return meetingName;
    }

    public void setMeetingName(String meetingName) {
        this.meetingName = meetingName;
    }
}