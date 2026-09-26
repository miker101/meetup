const joinMeetingBtn = document.getElementById("joinMeetingBtn");
const createMeetingBtn = document.getElementById("createMeetingBtn");


/* Create Meeting */

if (createMeetingBtn) {
    createMeetingBtn.addEventListener("click", function () {
        window.location.href = "create.html";
    });
}


/* Join Meeting */

if (joinMeetingBtn) {
    joinMeetingBtn.addEventListener("click", function () {
        window.location.href = "join.html";
    });
}