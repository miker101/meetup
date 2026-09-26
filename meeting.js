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

/* =========================
DISPLAY MEETING INFORMATION
========================= */

meetingNameElement.textContent =
meetingName;

meetingPinElement.textContent =
meetingPin;

/* =========================
LOAD PARTICIPANTS
========================= */

async function loadParticipants() {


try {

    const response = await fetch(
        `https://flying-strips-timing-large.trycloudflare.com/api/meetings/${meetingId}/participants`
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

            remoteAudio.dataset.participantId =
                key;

            document.body.appendChild(
                remoteAudio
            );

            remoteAudios[key] =
                remoteAudio;

        }

        /*
         * Connect this participant's
         * audio stream to their audio element.
         */
        remoteAudio.srcObject =
            event.streams[0];

    };


/*
 * Send ICE candidates specifically
 * to the participant this connection
 * belongs to.
 */
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


async function startWebRTC() {


/*
 * We need microphone access before
 * creating WebRTC connections.
 */
if (!microphoneStream) {

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
            `https://housewives-mix-nowhere-performed.trycloudflare.com/api/meetings/${meetingId}/participants`
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

* Only the participant with the
* smaller ID creates the offer.
*
* This prevents both sides from
* creating offers simultaneously.
  */
    if (
Number(participantId) >=
remoteParticipantId
) {


continue;


}

/*

* If this connection already has a
* remote description, the connection
* has already been established.
*
* Do not create another offer.
  */
  if (connection.remoteDescription) {

  console.log(
  "WebRTC connection already established with participant:",
  remoteParticipantId
  );

  continue;

}

/*

* If this connection is already
* negotiating, don't create another offer.
  */
  if (
  connection.signalingState !==
  "stable"
  ) {

  continue;

}


        /*
         * Create an offer for this specific
         * participant.
         */
        console.log(
            "Creating WebRTC offer for participant:",
            remoteParticipantId
        );


        const offer =
            await connection.createOffer();


        await connection.setLocalDescription(
            offer
        );


        /*
         * Send the offer ONLY to this
         * specific participant.
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
                    connection.localDescription

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

    /*
     * The receiver needs microphone access
     * because this is a two-way voice connection.
     */
    if (!microphoneStream) {

        await requestMicrophoneAccess();

        if (!microphoneStream) {

            return;

        }

    }


    /*
     * Create or retrieve the WebRTC connection
     * belonging to the participant who sent
     * this offer.
     */
    const connection =
        createPeerConnection(
            remoteParticipantId
        );


    /*
     * Accept the remote participant's offer.
     */
    await connection.setRemoteDescription(
        new RTCSessionDescription(offer)
    );


    /*
     * Get ICE candidates that arrived
     * before the offer was processed.
     */
    const key =
        String(remoteParticipantId);

    const queuedCandidates =
        pendingIceCandidates[key] || [];


    /*
     * Add all queued ICE candidates
     * to this participant's connection.
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
     * Clear the queue for this participant.
     */
    pendingIceCandidates[key] = [];


    /*
     * Create an answer for this
     * specific remote participant.
     */
    const answer =
        await connection.createAnswer();


    await connection.setLocalDescription(
        answer
    );


    /*
     * Send the answer ONLY back to
     * the participant who sent the offer.
     */
    meetingSocket.send(
        JSON.stringify({

            type:
                "answer",

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




function connectToMeeting() {


meetingSocket =
new WebSocket(
"wss://housewives-mix-nowhere-performed.trycloudflare.com/ws"
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
    if (
        microphoneStream &&
        meetingSocket &&
        meetingSocket.readyState ===
            WebSocket.OPEN
    ) {

        startWebRTC();

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
