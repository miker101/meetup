package com.meetup.backend.websocket;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import org.springframework.stereotype.Component;

import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import java.io.IOException;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import com.meetup.backend.entity.Participant;

import java.util.Optional;


import com.meetup.backend.repository.ParticipantRepository;


@Component
public class MeetingWebSocketHandler
extends TextWebSocketHandler {

private final ObjectMapper objectMapper =
        new ObjectMapper();

/*
 * Stores all WebSocket sessions
 * currently inside each meeting.
 */
private final Map<String, Set<WebSocketSession>>
        meetingRooms =
        new ConcurrentHashMap<>();

/*
 * Stores the meeting ID belonging
 * to each WebSocket session.
 */
private final Map<String, String>
        sessionMeetings =
        new ConcurrentHashMap<>();

/*
 * Stores the display name belonging
 * to each WebSocket session.
 */
private final Map<String, String>
        sessionNames =
        new ConcurrentHashMap<>();

/*
 * Called when a browser connects
 * to /ws.
 */

/*

* Stores the participant ID belonging
* to each WebSocket session.
  */
  private final Map<String, Long>
  sessionParticipants =
  new ConcurrentHashMap<>();

  private final Map<Long, WebSocketSession>
          participantSessions =
          new ConcurrentHashMap<>();
  /*
   * Stores the participant currently sharing
   * their screen in each meeting.
   *
   * Key   = meeting ID
   * Value = participant ID
   */
  private final Map<String, Long> screenShareOwners =
          new ConcurrentHashMap<>();


/*

* Repository used to update the
* participant's SQL record.
  */
  private final ParticipantRepository
  participantRepository;

@Override
public void afterConnectionEstablished(
        WebSocketSession session) {

    System.out.println(
            "WebSocket connected: "
            + session.getId()
    );
}

/*
 * Called whenever the browser sends
 * a message to the server.
 */
@Override
protected void handleTextMessage(
        WebSocketSession session,
        TextMessage message) {

    try {

        JsonNode data =
                objectMapper.readTree(
                        message.getPayload()
                );

        String type =
                data.path("type").asText();

        /*
         * =========================
         * JOIN ROOM
         * =========================
         */
        if ("join".equals(type)) {

            String meetingId =
                    data.path("meetingId").asText();

            String displayName =
                    data.path("displayName").asText();
            Long participantId =
            		data.path("participantId").asLong();

            if (
            		meetingId.isBlank()
            		|| displayName.isBlank()
            		|| participantId == 0
            		) {

            		
            		return;
            		

            		}
            Long meetingDatabaseId;

            try {

                meetingDatabaseId =
                        Long.parseLong(meetingId);

            } catch (NumberFormatException error) {

                return;

            }

            Optional<Participant> participant =
                    participantRepository
                            .findByIdAndMeetingId(
                                    participantId,
                                    meetingDatabaseId
                            );

            if (participant.isEmpty()) {

                System.out.println(
                        "Invalid participant/meeting combination."
                );

                return;
            }
            
            /*
             * A participant may reconnect after
             * refreshing the meeting page.
             *
             * Reactivate the existing participant
             * instead of creating a new participant.
             */
            if (!participant.get().isActive()) {

                participant.get().setActive(true);

                participantRepository.save(
                        participant.get()
                );

                System.out.println(
                        "Participant reactivated: "
                        + participantId
                );
            }
            


            



            /*
             * Add this session to
             * the correct meeting room.
             */
            meetingRooms
                    .computeIfAbsent(
                            meetingId,
                            key -> ConcurrentHashMap.newKeySet()
                    )
                    .add(session);

            /*
             * Remember which meeting
             * this WebSocket belongs to.
             */
            sessionMeetings.put(
                    session.getId(),
                    meetingId
            );

            /*
             * Remember the user's name
             * for later leave notifications.
             */
            sessionNames.put(
                    session.getId(),
                    displayName
            );
            /*

            * Remember which SQL participant
            * belongs to this WebSocket session.
              */
              sessionParticipants.put(
              session.getId(),
              participantId
              );
              /*`
               * Check whether this participant`
               * already has another WebSocket session.`
               */

              WebSocketSession existingSession =
                      participantSessions.put(
                              participantId,
                              session
                      );

              if (
                      existingSession != null
                      && existingSession.isOpen()
                      && !existingSession.getId().equals(
                              session.getId()
                      )
              ) {

                  try {

                      existingSession.close();

                  } catch (Exception error) {

                      System.err.println(
                              "Could not close previous WebSocket session: "
                              + error.getMessage()
                      );
                  }
              }

              /*
               * Stores the WebSocket session belonging
               * to each participant.
               */



            System.out.println(
                    displayName
                    + " joined meeting "
                    + meetingId
            );

            /*
             * Tell everyone else in this
             * meeting that a new participant
             * has joined.
             */
            String joinResponse =
                    objectMapper.writeValueAsString(
                    		Map.of(
                    		        "type",
                    		        "participant_joined",
                    		        "participantId",
                    		        participantId,
                    		        "displayName",
                    		        displayName
                    		)
                    );

            broadcastToMeeting(
                    meetingId,
                    joinResponse,
                    session
            );

            /*
             * Tell the newly joined participant
             * whether someone is already sharing
             * their screen.
             */
            Long currentScreenShareOwner =
                    screenShareOwners.get(meetingId);

            if (currentScreenShareOwner != null) {

                String screenShareState =
                        objectMapper.writeValueAsString(
                                Map.of(
                                        "type",
                                        "screen_share_started",

                                        "participantId",
                                        currentScreenShareOwner
                                )
                        );

                session.sendMessage(
                        new TextMessage(
                                screenShareState
                        )
                );
            }

            return;
        }

        /*
         * =========================
         * CHAT MESSAGE
         * =========================
         */
        if ("chat".equals(type)) {

        	
        	String meetingId =
        	        sessionMeetings.get(
        	                session.getId()
        	        );

        	if (meetingId == null) {

        	    return;

        	}

        	String displayName =
        	        data.path("displayName")
        	                .asText();

        	String chatMessage =
        	        data.path("message")
        	                .asText();

        	if (
        	        displayName.isBlank()
        	        || chatMessage.isBlank()
        	) {

        	    return;

        	}

        	/*
        	 * Create the message that
        	 * will be sent to everyone
        	 * in this meeting.
        	 */

        	String response =
        	        objectMapper.writeValueAsString(
        	                Map.of(
        	                        "type",
        	                        "chat",
        	                        "displayName",
        	                        displayName,
        	                        "message",
        	                        chatMessage
        	                )
        	        );

        	/*
        	 * Broadcast ONLY to this
        	 * meeting's participants.
        	 */

        	broadcastToMeeting(
        	        meetingId,
        	        response,
        	        null
        	);

        	return;
        	

        	}
        /*
         * =========================
         * SCREEN SHARE NOTIFICATIONS
         * =========================
         */

        if (
                "screen_share_started".equals(type)
                || "screen_share_stopped".equals(type)
        ) {

            /*
             * Get the meeting associated with
             * the current WebSocket session.
             */
            String meetingId =
                    sessionMeetings.get(
                            session.getId()
                    );

            if (meetingId == null) {
                return;
            }

            /*
             * Get the participant name stored
             * when this WebSocket session joined.
             *
             * We use the server-side value instead
             * of trusting a name supplied by JavaScript.
             */
            String displayName =
                    sessionNames.get(
                            session.getId()
                    );

            if (
                    displayName == null
                    || displayName.isBlank()
            ) {
                return;
            }

            /*
             * Create the notification that will
             * be sent to everyone in this meeting.
             */
            String response =
                    objectMapper.writeValueAsString(
                            Map.of(
                                    "type",
                                    type,

                                    "participantId",
                                    sessionParticipants.get(
                                            session.getId()
                                    ),

                                    "displayName",
                                    displayName
                            )
                    );

            /*
             * Broadcast ONLY to participants
             * inside this meeting.
             */
            broadcastToMeeting(
                    meetingId,
                    response,
                    null
            );

            System.out.println(
                    displayName
                    + (
                        "screen_share_started".equals(type)
                            ? " started sharing their screen."
                            : " stopped sharing their screen."
                    )
            );

            return;
        }

        	/*

        	* =========================
        	* WEBRTC SIGNALING
        	* =========================
        	  */

        
        
        if ("offer".equals(type)) {

            System.out.println(
                    "WebRTC offer received from session: "
                    + session.getId()
            );

            forwardWebRTCMessage(
                    session,
                    data
            );

            return;
        }

        if ("answer".equals(type)) {

            System.out.println(
                    "WebRTC answer received from session: "
                    + session.getId()
            );

            forwardWebRTCMessage(
                    session,
                    data
            );

            return;
        }

        if ("ice_candidate".equals(type)) {

            System.out.println(
                    "WebRTC ICE candidate received from session: "
                    + session.getId()
            );

            forwardWebRTCMessage(
                    session,
                    data
            );

            return;
        }
        


        } catch (Exception error) {

            System.err.println(
                    "WebSocket error: "
                    + error.getMessage()
            );

        }

        }
        

    
        /*
         * =========================
         * WEBRTC MESSAGE FORWARDING
         * =========================
         */

private void forwardWebRTCMessage(
        WebSocketSession senderSession,
        JsonNode data) throws IOException {

    /*
     * Get the participant ID that
     * should receive this WebRTC message.
     */
    Long targetParticipantId =
            data.path("targetParticipantId").asLong();

    if (targetParticipantId == 0) {

        System.out.println(
                "WebRTC message has no target participant."
        );

        return;
    }


    /*
     * Find the WebSocket session belonging
     * to the target participant.
     */
    WebSocketSession targetSession =
            participantSessions.get(
                    targetParticipantId
            );

    if (targetSession == null) {

        System.out.println(
                "Target participant is not connected: "
                + targetParticipantId
        );

        return;
    }


    /*
     * Make sure the target session is still open.
     */
    if (!targetSession.isOpen()) {

        System.out.println(
                "Target participant WebSocket is closed: "
                + targetParticipantId
        );

        return;
    }


    /*
     * Forward the original WebRTC message
     * ONLY to the intended participant.
     */
    targetSession.sendMessage(
            new TextMessage(
                    data.toString()
            )
    );


    System.out.println(
            "WebRTC message forwarded to participant: "
            + targetParticipantId
    );
}



public MeetingWebSocketHandler(
ParticipantRepository participantRepository) {


this.participantRepository =
        participantRepository;


}



private void broadcastToMeeting(
        String meetingId,
        String message,
        WebSocketSession excludedSession) {

    Set<WebSocketSession> participants =
            meetingRooms.get(meetingId);

    if (participants == null) {
        return;
    }

    for (
            WebSocketSession participant
            : participants
    ) {

        if (
                participant.isOpen()
                && (
                    excludedSession == null
                    || !participant.getId()
                            .equals(excludedSession.getId())
                )
        ) {

            try {

                participant.sendMessage(
                        new TextMessage(message)
                );

            } catch (Exception error) {

                System.err.println(
                        "Could not send WebSocket message: "
                        + error.getMessage()
                );
            }
        }
    }
}

/*
 * Called when a browser closes
 * the WebSocket connection.
 */
@Override
public void afterConnectionClosed(
        WebSocketSession session,
        CloseStatus status) {
	String meetingId =
			        sessionMeetings.remove(
			                session.getId()
			        );

	String displayName =
			        sessionNames.remove(
			                session.getId()
			        );

	Long participantId =
			        sessionParticipants.remove(
			                session.getId()
			        );

	boolean isCurrentSession = false;

	if (participantId != null) {

	
	WebSocketSession currentSession =
	        participantSessions.get(
	                participantId
	        );

	isCurrentSession =
	        currentSession != null
	        && currentSession.getId().equals(
	                session.getId()
	        );
	

	}







    if (meetingId == null) {
        return;
    }

    Set<WebSocketSession>
            participants =
                    meetingRooms.get(
                            meetingId
                    );

    if (participants == null) {
        return;
    }

    participants.remove(session);
    /*

    * Mark the participant as inactive
    * in the SQL database.
      */
    if (
    		        participantId != null
    		        && isCurrentSession
    		) {

    		    participantSessions.remove(
    		            participantId,
    		            session
    		    );

    		    participantRepository
    		            .findById(participantId)
    		            .ifPresent(participant -> {

    		                participant.setActive(false);

    		                participantRepository.save(
    		                        participant
    		                );

    		            });
    	  }

      

    


    /*
     * Tell the remaining users that
     * this participant has left.
     */
    if (
    		        isCurrentSession
    		        && displayName != null
    		        && !displayName.isBlank()
    		) {


        try {

            String leaveResponse =
                    objectMapper.writeValueAsString(
                            Map.of(
                                    "type",
                                    "participant_left",
                                    "participantId",
                                    participantId,

                                    "displayName",
                                    displayName
                            )
                    );

            broadcastToMeeting(
                    meetingId,
                    leaveResponse,
                    null
            );

        } catch (Exception error) {

            System.err.println(
                    "Could not send leave notification: "
                    + error.getMessage()
            );
        }
    }

    /*
     * If nobody remains in the room,
     * remove the room completely.
     */
    if (participants.isEmpty()) {

        meetingRooms.remove(
                meetingId
        );
    }

    System.out.println(
            "WebSocket disconnected: "
            + session.getId()
    );

    }
}
