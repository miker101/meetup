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
let peerConnection = null;

let remoteAudio = null;

let pendingIceCandidates = [];


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

function createPeerConnection() {

peerConnection =
    new RTCPeerConnection(
        rtcConfiguration
    );

console.log(
    "WebRTC peer connection created."
);


/*
 * Add our microphone tracks
 * to the WebRTC connection.
 */

if (microphoneStream) {

    microphoneStream
        .getTracks()
        .forEach(function (track) {

            peerConnection.addTrack(
                track,
                microphoneStream
            );

        });

}


/*
 * Receive audio from the other
 * participant.
 */

peerConnection.ontrack =
    function (event) {

        console.log(
            "Remote audio track received."
        );

        if (!remoteAudio) {

            remoteAudio =
                document.createElement(
                    "audio"
                );

            remoteAudio.autoplay = true;

            document.body.appendChild(
                remoteAudio
            );

        }

        remoteAudio.srcObject =
            event.streams[0];

    };


/*
 * Send ICE candidates through
 * our existing WebSocket.
 */

peerConnection.onicecandidate =
    function (event) {

        if (
            event.candidate &&
            meetingSocket
        ) {

            meetingSocket.send(
                JSON.stringify({

                    type: "ice_candidate",

                    meetingId:
                        meetingId,

                    participantId:
                        participantId,

                    candidate:
                        event.candidate

                })
            );

        }

    };

}

async function startWebRTC() {

    /*
     * We need microphone access before
     * creating the WebRTC connection.
     */

    if (!microphoneStream) {

        await requestMicrophoneAccess();

        if (!microphoneStream) {

            return;

        }

    }

    /*
     * Don't create another connection
     * if one already exists.
     */

    if (!peerConnection) {

        createPeerConnection();

    }

    /*
     * Get the current participants.
     */

    try {

        const response = await fetch(
            `https://flying-strips-timing-large.trycloudflare.com/api/meetings/${meetingId}/participants`
        );

        if (!response.ok) {

            throw new Error(
                "Could not load participants for WebRTC."
            );

        }

        const participants =
            await response.json();

        /*
         * We need another participant before
         * starting the voice connection.
         */

        if (participants.length < 2) {

            console.log(
                "Waiting for another participant before starting WebRTC."
            );

            return;

        }

        /*
         * Use the participant with the smallest
         * participant ID as the offer creator.
         *
         * This prevents both browsers from
         * creating an offer at the same time.
         */

        const participantIds =
            participants.map(function (participant) {

                return Number(participant.id);

            });

        const offerCreatorId =
            Math.min(...participantIds);

        /*
         * Only the designated participant
         * creates the offer.
         */

        if (
            Number(participantId)
            !== offerCreatorId
        ) {

            console.log(
                "This participant will wait for the WebRTC offer."
            );

            return;

        }

        console.log(
            "This participant will create the WebRTC offer."
        );

        const offer =
            await peerConnection.createOffer();

        await peerConnection.setLocalDescription(
            offer
        );

        meetingSocket.send(
            JSON.stringify({

                type: "offer",

                meetingId:
                    meetingId,

                participantId:
                    participantId,

                offer:
                    peerConnection.localDescription

            })
        );

        console.log(
            "WebRTC offer sent."
        );

    } catch (error) {

        console.error(
            "Could not start WebRTC:",
            error
        );

    }

}


async function handleWebRTCOffer(
    offer
) {

    try {

        /*
         * The receiver also needs microphone
         * access because it will send its
         * microphone audio back.
         */

        if (!microphoneStream) {

            await requestMicrophoneAccess();

            if (!microphoneStream) {

                return;

            }

        }

        if (!peerConnection) {

            createPeerConnection();

        }

        await peerConnection.setRemoteDescription(
            new RTCSessionDescription(offer)
        );

        /*
         * Add any ICE candidates that arrived
         * before the offer was processed.
         */

        for (
            const candidate
            of pendingIceCandidates
        ) {

            await peerConnection.addIceCandidate(
                candidate
            );

        }

        pendingIceCandidates = [];

        const answer =
            await peerConnection.createAnswer();

        await peerConnection.setLocalDescription(
            answer
        );

        meetingSocket.send(
            JSON.stringify({

                type: "answer",

                meetingId:
                    meetingId,

                participantId:
                    participantId,

                answer:
                    peerConnection.localDescription

            })
        );

        console.log(
            "WebRTC answer sent."
        );

    } catch (error) {

        console.error(
            "Could not handle WebRTC offer:",
            error
        );

    }

}


async function handleWebRTCAnswer(
    answer
) {

    try {

        if (!peerConnection) {

            return;

        }

        await peerConnection.setRemoteDescription(
            new RTCSessionDescription(answer)
        );

        /*
         * Add ICE candidates that arrived
         * before the answer.
         */

        for (
            const candidate
            of pendingIceCandidates
        ) {

            await peerConnection.addIceCandidate(
                candidate
            );

        }

        pendingIceCandidates = [];

        console.log(
            "WebRTC answer accepted."
        );

    } catch (error) {

        console.error(
            "Could not handle WebRTC answer:",
            error
        );

    }

}


async function handleWebRTCIceCandidate(
    candidate
) {

    try {

        if (!peerConnection) {

            return;

        }

        const iceCandidate =
            new RTCIceCandidate(candidate);

        /*
         * If the remote description is already
         * available, add the candidate immediately.
         */

        if (
            peerConnection.remoteDescription
        ) {

            await peerConnection.addIceCandidate(
                iceCandidate
            );

            console.log(
                "Remote ICE candidate added."
            );

        } else {

            /*
             * Otherwise keep it until the
             * remote description arrives.
             */

            pendingIceCandidates.push(
                iceCandidate
            );

            console.log(
                "ICE candidate queued."
            );

        }

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
"wss://flying-strips-timing-large.trycloudflare.com/ws"
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
       
if (
    data.type === "participant_joined"
) {

    console.log(
        data.displayName
        + " joined the meeting."
    );

    loadParticipants();

    /*
     * Give the participant list a moment
     * to update before starting WebRTC.
     */

    setTimeout(function () {

        if (microphoneStream) {

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
        "WebRTC offer received."
    );

    handleWebRTCOffer(
        data.offer
    );

}


/*
 * =========================
 * WEBRTC ANSWER
 * =========================
 */

if (data.type === "answer") {

    console.log(
        "WebRTC answer received."
    );

    handleWebRTCAnswer(
        data.answer
    );

}


/*
 * =========================
 * WEBRTC ICE CANDIDATE
 * =========================
 */

if (data.type === "ice_candidate") {

    console.log(
        "WebRTC ICE candidate received."
    );

    handleWebRTCIceCandidate(
        data.candidate
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
