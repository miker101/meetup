const createMeetingForm =
document.getElementById("createMeetingForm");

const createStatus =
document.getElementById("createStatus");

createMeetingForm.addEventListener(
"submit",
async function (event) {


event.preventDefault();

/* =========================
   GET FORM VALUES
========================== */

const userName =
    document.getElementById("userName")
        .value
        .trim();

const roomName =
    document.getElementById("roomName")
        .value
        .trim();

/* =========================
   VALIDATION
========================== */

if (!userName || !roomName) {

    createStatus.textContent =
        "Please fill in all fields.";

    return;
}

/* =========================
   CREATE REQUEST DATA
========================== */

const meetingData = {

    meetingName: roomName,

    displayName: userName

};

try {

    createStatus.textContent =
        "Creating meeting...";

    /* =========================
       SEND REQUEST
    ========================== */

    const response = await fetch(
"https://reuters-cloth-franklin-maternity.trycloudflare.com/api/meetings",
{
method: "POST",


    headers: {
        "Content-Type": "application/json"
    },

    body: JSON.stringify(meetingData)
}


);

    /* =========================
       HANDLE BACKEND ERROR
    ========================== */

    if (!response.ok) {

        const errorData =
            await response.json();

        createStatus.textContent =
            errorData.message ||
            "Unable to create meeting.";

        return;
    }

    /* =========================
       READ BACKEND RESPONSE
    ========================== */

    const meeting =
        await response.json();

    console.log(
        "Meeting created:",
        meeting
    );

    /* =========================
       SAVE MEETING INFORMATION
       FOR THE MEETING ROOM
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
        userName
    );

    /* =========================
       SAVE PARTICIPANT ID
    ========================== */

    sessionStorage.setItem(
        "participantId",
        meeting.participantId
    );

    /* =========================
       OPEN MEETING PAGE
    ========================== */

    window.location.href =
        "meeting.html";

} catch (error) {

    console.error(
        "Create meeting error:",
        error
    );

    createStatus.textContent =
        "Unable to connect to the MeetUp server.";
}


}
);
