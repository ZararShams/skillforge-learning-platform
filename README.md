# skillforge-learning-platform
SKILLFORGE: LOCAL WINDOWS DEMO

START HERE
1. Install Node.js 24 LTS from https://nodejs.org/en/download if needed.
2. Right-click the downloaded ZIP and choose Extract All.
3. Open the extracted skillforge-local folder.
4. Double-click START-SKILLFORGE.cmd.
5. Your browser should open http://localhost:3000. If it does not, type
   that address into your browser. Keep the command window open.
6. Press Ctrl+C in the command window to stop the app.

No npm install is needed to run this download. Built browser assets are
included. Once Node.js is installed, the demo can run without internet.
The Windows launcher is provided, but testing was performed on Linux with
Node.js 24.19.0. The Windows double-click flow still needs your confirmation.

YOUR RECORDS
The first run creates a data folder containing skillforge.sqlite.
Records remain when you close the browser or restart the app.
For a backup, stop the server and copy the whole data folder.
To begin again, stop the server and rename data to data-backup; restarting
creates fresh sample records. Do not delete your only copy of saved work.
This local version starts with fresh demo data, not your hosted records.
The hosted website has not been changed.

DEMO WALKTHROUGH
1. Explore programs and open Networking Foundations or Python Automation.
2. Enrol in Python Automation and open My learning to submit written evidence.
3. Switch Demo role to Trainer, then select an assessment.
4. Enter scores within the 20, 40 and 40 limits; save a draft.
5. Release the result with feedback. Each criterion needs at least 80%
   for the overall outcome to be competent.
6. Switch to Learner and show released feedback and My competencies.
7. Switch to Trainer and show Audit history. Amend a result with a reason
   to demonstrate version tracking.
Networking Foundations already has a sample submission for marking.

SCOPE AND DESIGN
This is a single-user local prototype, using React, a Node.js HTTP server
and SQLite. Demo roles are switchable and are not real account authentication.
Anyone using this computer's local app shares the same demo workspace.
The server listens on 127.0.0.1 only; localhost is not a public website link.
Credential checks and notifications are pending records, not actual digital
credentials or sent messages. It does not implement every SkillForge feature.
If your report describes the demonstrated implementation, describe this local
stack accurately. Separate the complete system design from the prototype.

EDITING AND TESTING (OPTIONAL)
Source is included. Install development packages with npm install, then run
npm run build after changing source. Run node server.mjs to start manually.
Run node tests/run.mjs for API, asset, request-boundary and restart checks.
Tests create a temporary database and do not use your normal data folder.
Frontend: src/App.tsx, src/globals.css, components, hooks, lib.
Backend source: server/api.ts and server/storage.mjs.
Build: scripts/build-server.mjs creates API and catalogue JavaScript.
Do not edit generated dist assets or server/api.mjs directly.

TROUBLESHOOTING
Node not found: install Node.js, then reopen the launcher.
Port 3000 in use: close any earlier SkillForge command window and retry.
Browser cannot connect: check that the command window is still running.
Save errors: extract to a writable folder, such as Documents, and retry.
An experimental SQLite warning on some Node releases is informational.

AUTHORSHIP AND DEPENDENCIES
This prototype and local adaptation were developed with AI assistance.
Changing where the app runs does not change that provenance. Follow the
assignment's permission and disclosure requirements when using this work.
Third-party packages retain their own licenses; see THIRD-PARTY-NOTICES.txt.
