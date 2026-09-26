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
    "home.html";


}

/* =========================
CURRENT USER
========================= */

const currentUser = {


name: displayName,

micOn: true


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
'https://flying-strips-timing-large.trycloudflare.com/api/meetings/${meetingId}/participants'
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

        participantsList.innerHTML = 

            <p class="no-participants">
                No participants yet.
            </p>

        ;

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


            participantElement.innerHTML ='

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

            ';


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
displayName
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
displayName
) {


connectToMeeting();

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
function () {


    currentUser.micOn =
        !currentUser.micOn;


    updateMicrophoneButton();

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
