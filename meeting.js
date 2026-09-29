/* =========================
MEETING DATA
========================= */

const meetingId =
sessionStorage.getItem("meetingId");

const meetingName =
sessionStorage.getItem("meetingName");

const meetingPin =
sessionStorage.getItem("meetingPin");

const displayName =
sessionStorage.getItem("displayName");
const participantId =
sessionStorage.getItem("participantId");


/* =========================
CHECK MEETING DATA
========================= */
if (
!meetingId ||
!meetingName ||
!meetingPin ||
!displayName ||
!participantId
) {
 


alert(
    "Meeting information could not be found."
);

window.location.href =
    "index.html";


}

/* =========================
CURRENT USER
========================= */


const currentUser = {
    name: displayName,
    micOn: false
};

let microphoneStream = null;

/*
 * Speaker starts ON by default.
 *
 * This controls whether remote participants'
 * audio can be heard locally.
 */
let speakerOn = true;
let screenShareStream = null;





/*
 * Store one WebRTC connection
 * for every remote participant.
 *
 * Example:
 *
 * peerConnections[82] = connection to participant 82
 * peerConnections[83] = connection to participant 83
 */
const peerConnections = {};


/*
 * Store ICE candidates separately
 * for every remote participant.
 *
 * Example:
 *
 * pendingIceCandidates[82] = candidates
 * waiting for participant 82
 */
const pendingIceCandidates = {};


/*
 * Store remote audio elements separately
 * for every remote participant.
 */
const remoteAudios = {};


const rtcConfiguration = {


iceServers: [
    {
        urls: "stun:stun.l.google.com:19302"
    }
]


};


/* =========================
ELEMENTS
========================= */

const meetingNameElement =
document.getElementById("meetingName");

const meetingPinElement =
document.getElementById("meetingPin");

const participantCountElement =
document.getElementById("participantCount");

const participantsList =
document.getElementById("participantsList");

const microphoneButton =
document.getElementById("microphoneButton");

const speakerButton =
document.getElementById("speakerButton");

const leaveButton =
document.getElementById("leaveButton");

const copyLinkButton =
document.getElementById("copyLinkButton");

const chatForm =
document.getElementById("chatForm");

const messageInput =
document.getElementById("messageInput");

const messages =
document.getElementById("messages");

const screenShareButton =
    document.getElementById("screenShareButton");

const screenRecordButton =
    document.getElementById("screenRecordButton");

const screenShareVideo =
    document.getElementById("screenShareVideo");

const screenSharePlaceholder =
    document.getElementById("screenSharePlaceholder");
/* =========================
PARTICIPANT SIDEBAR
========================= */

const meetingPage =
document.querySelector(".meeting-page");



const participantsToggle =
document.getElementById("participantsToggle");

const participantsSidebar =
document.getElementById("participantsSidebar");


/* =========================
DISPLAY MEETING INFORMATION
========================= */

meetingNameElement.textContent =
meetingName;

meetingPinElement.textContent =
meetingPin;

participantsToggle.addEventListener(
"click",
function () {


    const isOpen =
        meetingPage.classList.toggle(
            "participants-open"
        );


    participantsToggle.setAttribute(
        "aria-expanded",
        isOpen
    );


    if (isOpen) {

        participantsToggle.setAttribute(
            "aria-label",
            "Close participants"
        );

    } else {

        participantsToggle.setAttribute(
            "aria-label",
            "Open participants"
        );

    }

}


);

/* =========================
LOAD PARTICIPANTS
========================= */

async function loadParticipants() {


try {
    const response =
await fetch(
`https://reuters-cloth-franklin-maternity.trycloudflare.com /api/meetings/${meetingId}/participants`
);

      

    if (!response.ok) {

        throw new Error(
            "Could not load participants."
        );

    }

    const participants =
        await response.json();

    console.log(
        "Participants received:",
        participants
    );

    participantCountElement.textContent =
        participants.length;

    participantsList.innerHTML = "";

    if (participants.length === 0) {

        participantsList.innerHTML = `

            <p class="no-participants">
                No participants yet.
            </p>

        `;

        return;
    }

    participants.forEach(
        function (participant) {

            const participantElement =
                document.createElement("div");

            participantElement.classList.add(
                "participant"
            );

            const firstLetter =
                participant.displayName
                    .charAt(0)
                    .toUpperCase();

            const role =
                participant.host
                    ? "Host"
                    : "Participant";

            participantElement.innerHTML = `

                <div class="participant-avatar">
                    ${firstLetter}
                </div>

                <div class="participant-details">

                    <span class="participant-name">
                        ${participant.displayName}
                    </span>

                    <span class="participant-role">
                        ${role}
                    </span>

                </div>

                <span
                    class="microphone-status"
                    title="Microphone status"
                >
                    🎤
                </span>

            `;

            participantsList.appendChild(
                participantElement
            );

        }
    );

} catch (error) {

    console.error(
        "Error loading participants:",
        error
    );

    participantCountElement.textContent =
        "0";

    participantsList.innerHTML = `

        <p class="no-participants">
            Could not load participants.
        </p>

    `;

}


}


/* =========================
INITIAL PARTICIPANT LOAD
========================= */

if (
meetingId &&
meetingName &&
meetingPin &&
displayName&&
participantId
) {


loadParticipants();


}

/* =========================
WEBSOCKET
========================= */

let meetingSocket = null;

/* =========================
CONNECT TO MEETING
========================= */

function createPeerConnection(remoteParticipantId) {


const key =
    String(remoteParticipantId);

/*
 * If a connection already exists
 * for this participant, reuse it.
 */
if (peerConnections[key]) {

    return peerConnections[key];

}

/*
 * Create a separate WebRTC connection
 * for this specific remote participant.
 */
const connection =
    new RTCPeerConnection(
        rtcConfiguration
    );

peerConnections[key] =
    connection;

console.log(
    "WebRTC peer connection created for participant:",
    remoteParticipantId
);
    
/*
 * Monitor the overall WebRTC connection state.
 *
 * This tells us whether the connection actually
 * becomes connected, fails, or gets closed.
 */
connection.onconnectionstatechange =
    function () {

        console.log(
            "WebRTC connection state with participant:",
            remoteParticipantId,
            connection.connectionState
        );

        /*
         * If the connection is temporarily disconnected,
         * give it a few seconds to recover.
         */
        if (
            connection.connectionState ===
            "disconnected"
        ) {

            console.log(
                "WebRTC connection temporarily disconnected from participant:",
                remoteParticipantId
            );

            setTimeout(function () {

                /*
                 * Make sure this is still the same
                 * connection stored for this participant.
                 */
                const currentConnection =
                    peerConnections[
                        String(remoteParticipantId)
                    ];

                /*
                 * Only clean it up if it is STILL
                 * disconnected.
                 */
                if (
                    currentConnection === connection
                    &&
                    connection.connectionState ===
                        "disconnected"
                ) {

                    console.log(
                        "WebRTC connection remained disconnected. Removing stale connection:",
                        remoteParticipantId
                    );

                    connection.close();

                    delete peerConnections[
                        String(remoteParticipantId)
                    ];

                    delete pendingIceCandidates[
                        String(remoteParticipantId)
                    ];

                    /*
                     * Remove stale remote audio.
                     */
                    const remoteAudio =
                        remoteAudios[
                            String(remoteParticipantId)
                        ];

                    if (remoteAudio) {

                        remoteAudio.srcObject =
                            null;

                        remoteAudio.remove();

                        delete remoteAudios[
                            String(remoteParticipantId)
                        ];
                    }

                }

            }, 5000);

        }

    };


/*
 * Monitor the ICE connection state.
 *
 * ICE is responsible for finding the actual
 * network path between the two participants.
 */
connection.oniceconnectionstatechange =
    function () {

        console.log(
            "WebRTC ICE state with participant:",
            remoteParticipantId,
            connection.iceConnectionState
        );

    };




/*
 * Add our microphone tracks
 * to this participant's connection.
 */
if (microphoneStream) {

    microphoneStream
        .getTracks()
        .forEach(function (track) {

            connection.addTrack(
                track,
                microphoneStream
            );

        });

}
    
if (screenShareStream) {

    screenShareStream
        .getVideoTracks()
        .forEach(track => {

            connection.addTrack(
                track,
                screenShareStream
            );

        });

}




/*
 * Receive audio from this
 * specific participant.
 */
connection.ontrack =
    function (event) {

        console.log(
            "Remote audio track received from participant:",
            remoteParticipantId
        );

        let remoteAudio =
            remoteAudios[key];
    const remoteStream =
        event.streams[0];

    const track =
        event.track;
    
        // =========================
    // SCREEN SHARE VIDEO
    // =========================

   
if (track.kind === "video") {

    console.log(
        "Remote screen video received from:",
        remoteParticipantId
    );


    screenShareVideo.srcObject =
        remoteStream;


    screenShareVideo.style.display =
        "block";


    screenSharePlaceholder.style.display =
        "none";


    /*
     * Try automatic playback first.
     *
     * Chrome may block this because the user
     * has not interacted with the page yet.
     */
    
screenShareVideo.muted = true;
screenShareVideo.autoplay = true;
screenShareVideo.playsInline = true;

    screenShareVideo.play()
        .then(() => {

            console.log(
                "Remote screen playback started."
            );

        })
        .catch(error => {

            console.warn(
                "Remote screen playback requires user interaction:",
                error
            );

            /*
             * Show the placeholder again so the user
             * has something visible to click.
             */
            screenSharePlaceholder.style.display =
                "flex";

            screenSharePlaceholder.innerHTML = `
                <h2>Screen share received</h2>
                <p>Click here to view the shared screen.</p>
            `;

            screenSharePlaceholder.style.cursor =
                "pointer";

            screenSharePlaceholder.onclick =
                function () {

                    screenShareVideo.play()
                        .then(() => {

                            screenSharePlaceholder.style.display =
                                "none";

                            screenSharePlaceholder.onclick =
                                null;

                            screenSharePlaceholder.style.cursor =
                                "default";

                            console.log(
                                "Remote screen playback started after user interaction."
                            );

                        })
                        .catch(playError => {

                            console.error(
                                "Could not start remote screen playback:",
                                playError
                            );

                        });

                };

        });


    return;
}


        /*
         * Create an audio element for
         * this participant if necessary.
         */
        if (!remoteAudio) {

            remoteAudio =
                document.createElement(
                    "audio"
                );

            remoteAudio.autoplay =
                true;

            remoteAudio.controls =
                false;

            remoteAudio.playsInline =
                true;

            remoteAudio.dataset.participantId =
                key;

            document.body.appendChild(
                remoteAudio
            );

            remoteAudios[key] =
                remoteAudio;

            remoteAudio.muted =
                !speakerOn;
        }

        /*
         * Connect this participant's
         * audio stream to their audio element.
         */
        remoteAudio.srcObject =
            event.streams[0];

        console.log(
            "Remote audio stream attached for participant:",
            remoteParticipantId
        );

        /*
         * Explicitly start playback.
         *
         * We do not rely only on autoplay.
         */
        remoteAudio.play()
            .then(function () {

                console.log(
                    "Remote audio playback started for participant:",
                    remoteParticipantId
                );

            })
            .catch(function (error) {

                console.warn(
                    "Remote audio playback could not start for participant:",
                    remoteParticipantId,
                    error
                );

            });

    };


connection.onicecandidate =
    function (event) {

        if (
            event.candidate &&
            meetingSocket &&
            meetingSocket.readyState ===
                WebSocket.OPEN
        ) {

            meetingSocket.send(
                JSON.stringify({

                    type:
                        "ice_candidate",

                    meetingId:
                        meetingId,

                    participantId:
                        Number(participantId),

                    targetParticipantId:
                        Number(
                            remoteParticipantId
                        ),

                    candidate:
                        event.candidate

                })
            );

        }

    };


return connection;

}

function addScreenShareToExistingConnections() {

    if (!screenShareStream) {
        return;
    }


    const screenTrack =
        screenShareStream.getVideoTracks()[0];


    if (!screenTrack) {
        return;
    }


    Object.entries(peerConnections).forEach(
        ([remoteParticipantId, peerConnection]) => {

            const senderExists =
                peerConnection
                    .getSenders()
                    .some(sender =>
                        sender.track === screenTrack
                    );


            if (senderExists) {
                return;
            }


            peerConnection.addTrack(
                screenTrack,
                screenShareStream
            );


            console.log(
                "Screen track added to participant:",
                remoteParticipantId
            );

        }
    );

}

async function renegotiateScreenShare() {

    if (!meetingSocket ||
        meetingSocket.readyState !== WebSocket.OPEN) {

        console.warn(
            "WebSocket is not open. Cannot renegotiate screen share."
        );

        return;
    }


    for (const [
        remoteParticipantId,
        peerConnection
    ] of Object.entries(peerConnections)) {

        if (
            peerConnection.connectionState === "closed" ||
            peerConnection.connectionState === "failed"
        ) {
            continue;
        }


        if (
            peerConnection.signalingState !==
            "stable"
        ) {
            console.log(
                "Skipping renegotiation for participant:",
                remoteParticipantId,
                "because signaling state is:",
                peerConnection.signalingState
            );

            continue;
        }


        try {

            const offer =
                await peerConnection.createOffer();


            await peerConnection.setLocalDescription(
                offer
            );


            meetingSocket.send(
                JSON.stringify({

                    type: "offer",

                    meetingId: meetingId,

                    participantId: participantId,

                    targetParticipantId:
                        remoteParticipantId,

                    offer: offer

                })
            );


            console.log(
                "Screen-share renegotiation sent to:",
                remoteParticipantId
            );

        } catch (error) {

            console.error(
                "Screen-share renegotiation failed for:",
                remoteParticipantId,
                error
            );

        }

    }

}


async function startWebRTC(requireMicrophone = true,forceOffer = false) {




/*
 * Voice WebRTC requires microphone access.
 *
 * Screen sharing does not.
 *
 * This allows V3 screen sharing to establish
 * WebRTC connections while the microphone
 * remains OFF.
 */
if (
    requireMicrophone &&
    !microphoneStream
) {

    await requestMicrophoneAccess();

    if (!microphoneStream) {

        return;

    }

}


/*
 * WebSocket must be connected before
 * we can send WebRTC signaling messages.
 */
if (
    !meetingSocket ||
    meetingSocket.readyState !== WebSocket.OPEN
) {

    console.warn(
        "WebSocket is not ready for WebRTC signaling."
    );

    return;

}


try {

    /*
     * Get all active participants
     * currently inside the meeting.
     */
    const response =
        await fetch(
            `https://reuters-cloth-franklin-maternity.trycloudflare.com/api/meetings/${meetingId}/participants`
        );

    if (!response.ok) {

        throw new Error(
            "Could not load participants for WebRTC."
        );

    }


    const participants =
        await response.json();


    /*
     * Go through every participant
     * except ourselves.
     */
    for (
        const remoteParticipant
        of participants
    ) {

        const remoteParticipantId =
            Number(
                remoteParticipant.id
            );


        /*
         * Never create a connection
         * to ourselves.
         */
        if (
            remoteParticipantId ===
            Number(participantId)
        ) {

            continue;

        }


        /*
         * Create or retrieve the connection
         * belonging to this participant.
         */
        const connection =
            createPeerConnection(
                remoteParticipantId
            );
        
/*
 * Check whether this connection is no longer usable.
 *
 * Failed or closed connections must be removed
 * before we decide whether an existing connection
 * can be reused.
 */
if (
    connection.connectionState === "failed" ||
    connection.connectionState === "closed" ||
    connection.iceConnectionState === "failed" ||
    connection.iceConnectionState === "closed"
) {

    console.log(
        "Removing stale WebRTC connection:",
        remoteParticipantId
    );

    connection.close();

    delete peerConnections[
        String(remoteParticipantId)
    ];

    delete pendingIceCandidates[
        String(remoteParticipantId)
    ];
}


/*
 * Get the connection again.
 *
 * If the previous connection was stale,
 * createPeerConnection() will now create
 * a completely fresh RTCPeerConnection.
 */
const activeConnection =
    createPeerConnection(
        remoteParticipantId
    );


/*

* Decide whether this connection is already
* being used successfully.
*
* IMPORTANT:
* We do NOT use remoteDescription as proof
* that the connection is healthy.
*
* A stale WebRTC connection can still have
* a remoteDescription even after the actual
* connection has failed.
  */

/*

* CONNECTED
*
* The connection is working normally.
* Nothing else needs to be done.
  */
  if (
  activeConnection.connectionState ===
  "connected"
  ) {

  console.log(
  "WebRTC connection is healthy with participant:",
  remoteParticipantId
  );

  continue;
  }

/*

* CONNECTING
*
* A negotiation is already in progress.
* Do not create another offer.
  */
  if (
  activeConnection.connectionState ===
  "connecting"
  ) {

  console.log(
  "WebRTC connection is currently connecting to participant:",
  remoteParticipantId
  );

  continue;
  }

/*

* DISCONNECTED
*
* Fix 1 is responsible for handling this state.
*
* We give WebRTC time to recover instead of
* immediately creating another offer.
  */
  if (
  activeConnection.connectionState ===
  "disconnected"
  ) {

  console.log(
  "WebRTC connection is temporarily disconnected from participant:",
  remoteParticipantId
  );

  continue;
  }


/*
 * During normal voice WebRTC setup,
 * only the participant with the smaller ID
 * creates the initial offer.
 *
 * During screen sharing, the participant
 * who started sharing must be allowed
 * to create the offer.
 */
if (
    !forceOffer &&
    Number(participantId) >=
    remoteParticipantId
) {

    continue;
}
/*
 * If the connection is already negotiating,
 * do not create another offer.
 */
if (
    activeConnection.signalingState !==
    "stable"
) {

    continue;

}


/*
 * Create an offer for this participant.
 */
console.log(
    "Creating WebRTC offer for participant:",
    remoteParticipantId
);


const offer =
    await activeConnection.createOffer();


await activeConnection.setLocalDescription(
    offer
);


/*
 * Send the offer only to the intended participant.
 */
meetingSocket.send(
    JSON.stringify({

        type:
            "offer",

        meetingId:
            meetingId,

        participantId:
            Number(participantId),

        targetParticipantId:
            remoteParticipantId,

        offer:
            activeConnection.localDescription

    })
);


console.log(
    "WebRTC offer sent to participant:",
    remoteParticipantId
);

    }

} catch (error) {

    console.error(
        "Could not start WebRTC:",
        error
    );

}


}

async function handleWebRTCOffer(offer,remoteParticipantId) {


try {

    const key =
        String(remoteParticipantId);

    /*
     * Get the connection belonging
     * to the participant who sent the offer.
     *
     * If it does not exist yet, create it.
     */
    let connection =
        peerConnections[key];

    if (!connection) {

        connection =
            createPeerConnection(
                remoteParticipantId
            );

    }

    /*
     * Apply the incoming offer.
     *
     * This is what tells WebRTC:
     * "The remote participant now wants
     * to send us another media track."
     */
    await connection.setRemoteDescription(
        new RTCSessionDescription(offer)
    );

    /*
     * Add any ICE candidates that arrived
     * before the offer was processed.
     */
    const queuedCandidates =
        pendingIceCandidates[key] || [];

    for (
        const candidate
        of queuedCandidates
    ) {

        await connection.addIceCandidate(
            candidate
        );

    }

    pendingIceCandidates[key] = [];

    /*
     * Create an answer for the participant
     * who sent the offer.
     */
    const answer =
        await connection.createAnswer();

    await connection.setLocalDescription(
        answer
    );

    /*
     * Send the answer back to the participant
     * who created the offer.
     */
    if (
        meetingSocket &&
        meetingSocket.readyState ===
            WebSocket.OPEN
    ) {

        meetingSocket.send(
            JSON.stringify({

                type: "answer",

                meetingId:
                    meetingId,

                participantId:
                    Number(participantId),

                targetParticipantId:
                    Number(remoteParticipantId),

                answer:
                    connection.localDescription

            })
        );

    }

    console.log(
        "WebRTC answer sent to participant:",
        remoteParticipantId
    );

} catch (error) {

    console.error(
        "Could not handle WebRTC offer:",
        error
    );

}


}


async function handleWebRTCAnswer(answer,remoteParticipantId) {


try {

    /*
     * Get the WebRTC connection belonging
     * to the participant who sent the answer.
     */
    const key =
        String(remoteParticipantId);

    const connection =
        peerConnections[key];


    /*
     * The connection should already exist
     * because we created it when sending
     * the original offer.
     */
    if (!connection) {

        console.warn(
            "No WebRTC connection found for participant:",
            remoteParticipantId
        );

        return;

    }


    /*
     * Accept the remote participant's answer.
     */
    await connection.setRemoteDescription(
        new RTCSessionDescription(answer)
    );


    /*
     * Check whether any ICE candidates
     * arrived before the answer.
     */
    const queuedCandidates =
        pendingIceCandidates[key] || [];


    /*
     * Add those candidates to this
     * participant's connection.
     */
    for (
        const candidate
        of queuedCandidates
    ) {

        await connection.addIceCandidate(
            candidate
        );

    }


    /*
     * Clear the ICE queue for this participant.
     */
    pendingIceCandidates[key] = [];


    console.log(
        "WebRTC answer accepted from participant:",
        remoteParticipantId
    );

} catch (error) {

    console.error(
        "Could not handle WebRTC answer:",
        error
    );

}


}



async function handleWebRTCIceCandidate(candidate,remoteParticipantId) {


try {

    const key =
        String(remoteParticipantId);


    /*
     * Convert the received candidate
     * into an RTCIceCandidate object.
     */
    const iceCandidate =
        new RTCIceCandidate(candidate);


    /*
     * Get the WebRTC connection belonging
     * to this remote participant.
     */
    const connection =
        peerConnections[key];


    /*
     * If the connection does not exist yet,
     * store the candidate for later.
     */
    if (!connection) {

        if (!pendingIceCandidates[key]) {

            pendingIceCandidates[key] = [];

        }

        pendingIceCandidates[key].push(
            iceCandidate
        );

        console.log(
            "ICE candidate queued for participant:",
            remoteParticipantId
        );

        return;

    }


    /*
     * If the remote description has already
     * been received, add the candidate now.
     */
    if (
        connection.remoteDescription
    ) {

        await connection.addIceCandidate(
            iceCandidate
        );

        console.log(
            "Remote ICE candidate added for participant:",
            remoteParticipantId
        );

        return;

    }


    /*
     * Otherwise wait until the remote
     * description has been processed.
     */
    if (!pendingIceCandidates[key]) {

        pendingIceCandidates[key] = [];

    }

    pendingIceCandidates[key].push(
        iceCandidate
    );

    console.log(
        "ICE candidate queued for participant:",
        remoteParticipantId
    );

} catch (error) {

    console.error(
        "Could not handle ICE candidate:",
        error
    );

}


}


async function startScreenSharing() {

    try {

        // Ask the browser to let the user choose
        // a screen, window, or browser tab to share.
        const stream =
            await navigator.mediaDevices.getDisplayMedia({
                video: true,
                audio: false
            });


        // Save the screen-sharing stream.
        screenShareStream = stream;


        // Display the shared screen in our meeting area.
        screenShareVideo.srcObject =
            screenShareStream;


        // Show the video.
        screenShareVideo.style.display =
            "block";


        // Hide the empty meeting-area message.
        screenSharePlaceholder.style.display =
            "none";


        // Detect when the user stops sharing
        // using the browser's built-in Stop Sharing button.
       
const screenTrack =
    screenShareStream.getVideoTracks()[0];


screenTrack.addEventListener(
    "ended",
    stopScreenSharing
);
        
console.log(
    "Peer connections before screen-share renegotiation:",
    Object.keys(peerConnections)
);





/*
 * Make sure WebRTC connections exist even
 * when the microphone is OFF.
 *
 * The second argument allows the screen
 * sharer to initiate the offer regardless
 * of participant ID.
 */
await startWebRTC(
    false,
    true
);

/*
 * Add the screen track to any connections
 * that already existed.
 */
addScreenShareToExistingConnections();

/*
 * Renegotiate so the remote participant
 * receives the new screen track.
 */
await renegotiateScreenShare();



console.log(
    "Screen sharing started."
);

/*
 * Tell everyone in this meeting that
 * this participant started sharing.
 */
if (
    meetingSocket &&
    meetingSocket.readyState ===
        WebSocket.OPEN
) {

    meetingSocket.send(
        JSON.stringify({

            type:
                "screen_share_started"

        })
    );

}

}catch (error) {

    console.error(
        "Screen sharing failed:",
        error
    );

}
}
function stopScreenSharing() {

    // Stop all tracks belonging to the screen share.
    if (screenShareStream) {

        screenShareStream
            .getTracks()
            .forEach(track => track.stop());

    }


    // Remove the stream from the video element.
    screenShareVideo.srcObject = null;


    // Hide the screen-share video.
    screenShareVideo.style.display = "none";


    // Show the empty meeting-area message again.
    screenSharePlaceholder.style.display = "flex";


    // Clear the stored screen-share stream.
    screenShareStream = null;


    console.log(
    "Screen sharing stopped."
);

/*
 * Tell everyone in this meeting that
 * this participant stopped sharing.
 */
if (
    meetingSocket &&
    meetingSocket.readyState ===
        WebSocket.OPEN
) {

    meetingSocket.send(
        JSON.stringify({

            type:
                "screen_share_stopped"

        })
    );

}

}
/* =========================
SCREEN SHARE NOTIFICATION
========================= */

function showScreenShareNotification(message) {

    /*
     * Remove an existing notification
     * so notifications do not stack up.
     */
    const existingNotification =
        document.getElementById(
            "screenShareNotification"
        );

    if (existingNotification) {

        existingNotification.remove();

    }

    /*
     * Create the notification element.
     */
    const notification =
        document.createElement("div");

    notification.id =
        "screenShareNotification";

    notification.className =
        "screen-share-notification";

    notification.textContent =
        "🖥️ " + message;

    document.body.appendChild(
        notification
    );

    /*
     * Automatically remove the notification
     * after a few seconds.
     */
    setTimeout(function () {

        notification.remove();

    }, 4000);

}


function connectToMeeting() {


meetingSocket =
new WebSocket(
"https://reuters-cloth-franklin-maternity.trycloudflare.com/ws"
);



/* =========================
   CONNECTION OPENED
========================== */

meetingSocket.onopen =
    function () {

        console.log(
            "Connected to MeetUp WebSocket."
        );


        /*
         * Tell the server which
         * meeting this user belongs to.
         */

        meetingSocket.send(
JSON.stringify({


    type: "join",

    meetingId: meetingId,

    displayName: displayName,

    participantId: participantId

})


);
    
setTimeout(function () {

    loadParticipants();

}, 500);




    };


/* =========================
   RECEIVE MESSAGE
========================== */

meetingSocket.onmessage =
function (event) {

    console.log(
        "WebSocket message received:",
        event.data
    );

    try {

        const data =
            JSON.parse(event.data);

        /*
         * =========================
         * CHAT MESSAGE
         * =========================
         */
        if (data.type === "chat") {

            addChatMessage(
                data.displayName,
                data.message
            );
        }
        /*
 * =========================
 * SCREEN SHARE STARTED
 * =========================
 */

if (
    data.type ===
    "screen_share_started"
) {

    showScreenShareNotification(
        data.displayName
        + " is sharing their screen."
    );

}


/*
 * =========================
 * SCREEN SHARE STOPPED
 * =========================
 */

if (
    data.type ===
    "screen_share_stopped"
) {

    showScreenShareNotification(
        data.displayName
        + " stopped sharing their screen."
    );

}

        /*
         * =========================
         * PARTICIPANT JOINED
         * =========================
         */
       
if (data.type === "participant_joined") {


console.log(
    "Participant joined:",
    data.displayName
);

/*
 * Refresh the participant list
 * so the new participant appears.
 */
loadParticipants();

/*
 * Give the participant list a moment
 * to update before starting WebRTC.
 */
setTimeout(function () {

    /*
     * Only start WebRTC if this participant
     * has already granted microphone access.
     */
    /*
 * Start normal WebRTC if the microphone
 * has already been enabled.
 */
if (
    microphoneStream &&
    meetingSocket &&
    meetingSocket.readyState ===
        WebSocket.OPEN
) {

    startWebRTC();

}


/*
 * If screen sharing is already active,
 * establish a WebRTC connection for the
 * new participant and send the existing
 * screen stream.
 */
if (
    screenShareStream &&
    meetingSocket &&
    meetingSocket.readyState ===
        WebSocket.OPEN
) {

    startWebRTC(
        false,
        true
    );

}

}, 500);


}



        /*
         * =========================
         * PARTICIPANT LEFT
         * =========================
         */
       
if (
    data.type === "participant_left"
) {

    console.log(
        data.displayName
        + " left the meeting."
    );

    const remoteParticipantId =
        String(data.participantId);

    /*
     * Clean up the WebRTC connection
     * belonging to the participant who left.
     */
    const connection =
        peerConnections[remoteParticipantId];

    if (connection) {

        console.log(
            "Closing WebRTC connection for participant:",
            remoteParticipantId
        );

        connection.close();

        delete peerConnections[
            remoteParticipantId
        ];
    }

    /*
     * Remove any ICE candidates that were
     * waiting for this participant.
     */
    delete pendingIceCandidates[
        remoteParticipantId
    ];

    /*
     * Remove the remote audio element so
     * the browser no longer keeps the
     * participant's audio around.
     */
    const remoteAudio =
        remoteAudios[remoteParticipantId];

    if (remoteAudio) {

        remoteAudio.srcObject = null;

        remoteAudio.remove();

        delete remoteAudios[
            remoteParticipantId
        ];
    }

    /*
     * Refresh the participant list.
     */
    loadParticipants();
}


        
/*
 * =========================
 * WEBRTC OFFER
 * =========================
 */

if (data.type === "offer") {


console.log(
    "WebRTC offer received from participant:",
    data.participantId
);

handleWebRTCOffer(
    data.offer,
    data.participantId
);


}



/*
 * =========================
 * WEBRTC ANSWER
 * =========================
 */

if (data.type === "answer") {


console.log(
    "WebRTC answer received from participant:",
    data.participantId
);

handleWebRTCAnswer(
    data.answer,
    data.participantId
);


}


/*
 * =========================
 * WEBRTC ICE CANDIDATE
 * =========================
 */
if (data.type === "ice_candidate") {


console.log(
    "WebRTC ICE candidate received from participant:",
    data.participantId
);

handleWebRTCIceCandidate(
    data.candidate,
    data.participantId
);


}





    } catch (error) {

        console.error(
            "Could not process WebSocket message:",
            error
        );
    }
};





/* =========================
   CONNECTION CLOSED
========================== */

meetingSocket.onclose =
function () {

    console.log(
        "Disconnected from MeetUp WebSocket."
    );

    /*
     * Try to reconnect after a short delay.`
     */

    setTimeout(function () {

        if (
            meetingId
            && meetingName
            && meetingPin
            && displayName
            && participantId
        ) {

            console.log(
                "Attempting to reconnect..."
            );

            connectToMeeting();
        }

    }, 2000);
};



/* =========================
   CONNECTION ERROR
========================== */

meetingSocket.onerror =
    function (error) {

        console.error(
            "WebSocket error:",
            error
        );

    };


}

/* =========================
START WEBSOCKET
========================= */

if (
meetingId &&
meetingName &&
meetingPin &&
displayName&&
participantId
) {


connectToMeeting();

}
async function requestMicrophoneAccess() {

try {

    microphoneStream =
        await navigator.mediaDevices.getUserMedia({
            audio: true
        });
    
microphoneStream
    .getAudioTracks()
    .forEach(function (track) {

        track.enabled = false;

    });



    console.log(
        "Microphone access granted."
    );

    console.log(
        "Microphone stream:",
        microphoneStream
    );

} catch (error) {

    console.error(
        "Microphone access failed:",
        error
    );

    alert(
        "Microphone access is required for voice chat."
    );

}


}


/* =========================
MICROPHONE
========================= */

function updateMicrophoneButton() {


if (currentUser.micOn) {

    microphoneButton.classList.remove(
        "muted"
    );


    microphoneButton.innerHTML = `

        🎤

        <span>
            Mute
        </span>

    `;

} else {

    microphoneButton.classList.add(
        "muted"
    );


    microphoneButton.innerHTML = `

        🔇

        <span>
            Unmute
        </span>

    `;

}

}


microphoneButton.addEventListener(
    "click",
    async function () {

        /*
         * MIC IS CURRENTLY OFF
         * --------------------
         * Ask for microphone permission first.
         */
        if (!currentUser.micOn) {

            if (!microphoneStream) {

                await requestMicrophoneAccess();

                if (!microphoneStream) {

                    return;

                }

            }

            /*
             * Permission was granted.
             * Turn the microphone ON.
             */
            currentUser.micOn = true;

            microphoneStream
                .getAudioTracks()
                .forEach(function (track) {

                    track.enabled = true;

                });

            updateMicrophoneButton();

            console.log(
                "Microphone turned ON."
            );
            startWebRTC();

            return;
        }
        
        


        /*
         * MIC IS CURRENTLY ON
         * -------------------
         * Turn the microphone OFF.
         */
        currentUser.micOn = false;

        if (microphoneStream) {

            microphoneStream
                .getAudioTracks()
                .forEach(function (track) {

                    track.enabled = false;

                });

        }

        updateMicrophoneButton();

        console.log(
            "Microphone turned OFF."
        );

    }
);

speakerButton.addEventListener(
    "click",
    function () {

        /*
         * Flip the speaker state.
         *
         * true  = we hear other participants
         * false = we do not hear other participants
         */
        speakerOn = !speakerOn;


        /*
         * Apply the new speaker state
         * to every remote participant's
         * audio element.
         */
        Object.values(remoteAudios)
            .forEach(function (audio) {

                audio.muted =
                    !speakerOn;

            });


        /*
         * Update the button so the UI
         * clearly shows the current state.
         */
        if (speakerOn) {

            speakerButton.innerHTML =
                "🔊 <span>Speaker On</span>";

            speakerButton.classList.remove(
                "muted"
            );

        } else {

            speakerButton.innerHTML =
                "🔇 <span>Speaker Off</span>";

            speakerButton.classList.add(
                "muted"
            );

        }

    }
);

updateMicrophoneButton();

/* =========================
COPY MEETING LINK
========================= */

copyLinkButton.addEventListener(
"click",
async function () {


    const meetingLink =
        window.location.href;


    try {

        await navigator.clipboard.writeText(
            meetingLink
        );


        alert(
            "Meeting link copied!"
        );


    } catch (error) {

        console.error(
            "Could not copy meeting link:",
            error
        );


        alert(
            "Could not copy the meeting link."
        );

    }

}


);

/* =========================
LEAVE MEETING
========================= */

leaveButton.addEventListener(
"click",
function () {

    const confirmed =
        confirm(
            "Are you sure you want to leave the meeting?"
        );


    if (!confirmed) {

        return;

    }


    /*
     * Close WebSocket connection
     */

    if (
        meetingSocket &&
        meetingSocket.readyState === WebSocket.OPEN
    ) {

        meetingSocket.close();

    }


    sessionStorage.removeItem(
        "meetingId"
    );

    sessionStorage.removeItem(
        "meetingName"
    );

    sessionStorage.removeItem(
        "meetingPin"
    );

    sessionStorage.removeItem(
        "displayName"
    );
    sessionStorage.removeItem(
        "participantId"
    );



    window.location.href =
        "index.html";
    

}


);
screenShareButton.addEventListener(
    "click",
    startScreenSharing
);



/* =========================
ADD CHAT MESSAGE
========================= */

function addChatMessage(
sender,
message
) {


const messageElement =
    document.createElement("div");


messageElement.classList.add(
    "message"
);


messageElement.innerHTML = `

    <span class="message-sender">
        ${sender}
    </span>

    <p>
        ${message}
    </p>

`;


messages.appendChild(
    messageElement
);


messages.scrollTop =
    messages.scrollHeight;


}

/* =========================
SEND CHAT MESSAGE
========================= */

chatForm.addEventListener(
"submit",
function (event) {


    event.preventDefault();


    const message =
        messageInput.value.trim();


    if (!message) {

        return;

    }


    /*
     * Make sure WebSocket is connected.
     */

    if (
        !meetingSocket ||
        meetingSocket.readyState !== WebSocket.OPEN
    ) {

        alert(
            "Chat connection is not ready."
        );

        return;

    }


    /*
     * Send the message to Spring Boot.
     */

    meetingSocket.send(
        JSON.stringify({

            type: "chat",

            displayName:
                currentUser.name,

            message: message

        })
    );


    messageInput.value = "";

    messageInput.focus();

}


);
