package com.meetup.backend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public class JoinMeetingRequest {

    @NotBlank(message = "Your name is required")
    @Size(max = 50, message = "Your name cannot exceed 50 characters")
    private String displayName;

    @NotBlank(message = "Meeting PIN is required")
    @Pattern(regexp = "\\d{6}", message = "Meeting PIN must contain exactly 6 digits")
    private String meetingPin;

    public JoinMeetingRequest() {
    }

    public String getDisplayName() {
        return displayName;
    }

    public void setDisplayName(String displayName) {
        this.displayName = displayName;
    }

    public String getMeetingPin() {
        return meetingPin;
    }

    public void setMeetingPin(String meetingPin) {
        this.meetingPin = meetingPin;
    }
}