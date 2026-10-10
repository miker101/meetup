package com.meetup.backend.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "participants")
public class Participant {


@Id
@GeneratedValue(strategy = GenerationType.IDENTITY)
private Long id;

@Column(nullable = false)
private String displayName;

@Column(nullable = false)
private boolean host;

@Column(nullable = false)
private boolean active;

@ManyToOne(fetch = FetchType.LAZY)
@JoinColumn(name = "meeting_id", nullable = false)
private Meeting meeting;

public Participant() {

}

public Participant(
        String displayName,
        boolean host,
        Meeting meeting) {

    this.displayName = displayName;
    this.host = host;
    this.active = true;
    this.meeting = meeting;
}

public Long getId() {

    return id;
}

public String getDisplayName() {

    return displayName;
}

public void setDisplayName(String displayName) {

    this.displayName = displayName;
}

public boolean isHost() {

    return host;
}

public void setHost(boolean host) {

    this.host = host;
}

public boolean isActive() {

    return active;
}

public void setActive(boolean active) {

    this.active = active;
}

public Meeting getMeeting() {

    return meeting;
}

public void setMeeting(Meeting meeting) {

    this.meeting = meeting;
}


}
