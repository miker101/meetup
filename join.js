const joinMeetingForm =
document.getElementById("joinMeetingForm");

const displayNameInput =
document.getElementById("displayName");

const meetingPinInput =
document.getElementById("meetingPin");

const joinStatus =
document.getElementById("joinStatus");

/* =========================
JOIN MEETING
========================= */

joinMeetingForm.addEventListener(
"submit",
async function (event) {


event.preventDefault();

/* =========================
   GET VALUES
========================== */

const displayName =
    displayNameInput.value.trim();

const meetingPin =
    meetingPinInput.value.trim();

/* =========================
   VALIDATION
========================== */

if (!displayName) {

    joinStatus.textContent =
        "Please enter your name.";

    displayNameInput.focus();

    return;
}

if (!meetingPin) {

    joinStatus.textContent =
        "Please enter the meeting ID.";

    meetingPinInput.focus();

    return;
}

if (!/^\d{6}$/.test(meetingPin)) {

    joinStatus.textContent =
        "Meeting ID must contain exactly 6 digits.";

    meetingPinInput.focus();

    return;
}

try {

    /* =========================
       SHOW STATUS
    ========================== */

    joinStatus.textContent =
        "Joining meeting...";

    /* =========================
       SEND REQUEST
    ========================== */

   const response = await fetch(
"https://flying-strips-timing-large.trycloudflare.com/api/meetings/join",
{
method: "POST",


    headers: {
        "Content-Type": "application/json"
    },

    body: JSON.stringify({

        displayName: displayName,

        meetingPin: meetingPin

    })
}


);


    /* =========================
       HANDLE BACKEND ERROR
    ========================== */

    if (!response.ok) {

        const errorData =
            await response.json();

        joinStatus.textContent =
            errorData.message ||
            "Unable to join meeting.";

        return;
    }

    /* =========================
       READ RESPONSE
    ========================== */

    const meeting =
        await response.json();

    console.log(
        "Meeting joined successfully:",
        meeting
    );

    /* =========================
       SAVE MEETING DATA
    ========================== */

    sessionStorage.setItem(
        "meetingId",
        meeting.id
    );

    sessionStorage.setItem(
        "meetingName",
        meeting.name
    );

    sessionStorage.setItem(
        "meetingPin",
        meeting.pin
    );

    sessionStorage.setItem(
        "displayName",
        displayName
    );

    /* =========================
       SAVE PARTICIPANT ID
    ========================== */

    sessionStorage.setItem(
        "participantId",
        meeting.participantId
    );

    /* =========================
       REDIRECT
    ========================== */

    window.location.href =
        "meeting.html";

} catch (error) {

    console.error(
        "Join meeting error:",
        error
    );

    joinStatus.textContent =
        "Unable to connect to the MeetUp server.";

}


}
);
