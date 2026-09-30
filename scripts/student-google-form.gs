/**
 * Student Google Form → Agency Workspace.
 *
 * This runs inside Google, not in this repo. It is kept here so there is one
 * copy of record. Install it once in the student form:
 *
 *   1. Open the form in edit mode → ⋮ (top right) → "Apps Script" / "Script editor".
 *   2. Replace everything in the editor with this file and save.
 *   3. Left sidebar → Triggers (clock icon) → Add Trigger:
 *        function: sendToWorkspace · event source: From form · event type: On form submit
 *      Save, and approve the Google permission prompt.
 *
 * Every new response is then sent to the workspace, where the Admin sees it on
 * the dashboard. It sends the questions and answers only; files uploaded to
 * the form stay in Google Drive and arrive as links.
 *
 * If a send fails, Google emails the form owner a failure notice; the response
 * is still in the form's own Responses tab.
 */

var WORKSPACE_URL = "https://app.ituniconsultancy.com/api/student-form";

function sendToWorkspace(e) {
  var answers = e.response.getItemResponses().map(function (itemResponse) {
    var item = itemResponse.getItem();
    var answer = itemResponse.getResponse();
    if (item.getType() === FormApp.ItemType.FILE_UPLOAD) {
      answer = [].concat(answer || []).map(function (fileId) {
        return "https://drive.google.com/open?id=" + fileId;
      });
    }
    return { question: item.getTitle(), answer: answer };
  });

  var result = UrlFetchApp.fetch(WORKSPACE_URL, {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify({ email: e.response.getRespondentEmail(), answers: answers }),
    muteHttpExceptions: true,
  });

  if (result.getResponseCode() !== 200) {
    throw new Error("Workspace did not accept the response: " + result.getResponseCode() + " " + result.getContentText());
  }
}
