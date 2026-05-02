// =======================
// SECURITY: XSS Sanitizer
function escapeHTML(str) {
    if (!str) return '';
    return str.toString()
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/\n/g, '<br>');
}

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, getDocs, doc, updateDoc, addDoc, deleteDoc, query, where } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyB8CUjfRdVlSOACFuuhOtyIXO2IAhJD7VE",
  authDomain: "seasons-rp-ems.firebaseapp.com",
  projectId: "seasons-rp-ems",
  storageBucket: "seasons-rp-ems.firebasestorage.app",
  messagingSenderId: "76899273418",
  appId: "1:76899273418:web:19dc6d8bd90309f7f98233"
};

// Initialize Firebase, Database, and Auth
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// UI Elements
const loginView = document.getElementById('login-view');
const dashboardView = document.getElementById('dashboard-view');
const loginForm = document.getElementById('login-form');
const logoutBtn = document.getElementById('logout-btn');
const errorMsg = document.getElementById('login-error');

// Security Gatekeeper
onAuthStateChanged(auth, (user) => {
    // Check if they exist AND if they are the exact command email
    if (user && user.email === 'command@seasonsrp.com') {
        loginView.style.display = 'none';
        dashboardView.style.display = 'flex';
        loadApplications(); 
    } else {
        loginView.style.display = 'flex';
        dashboardView.style.display = 'none';
        
        // If they unhide the dashboard, ensure it stays completely empty
        document.getElementById('content-new').innerHTML = '';
        document.getElementById('content-review').innerHTML = '';
        document.getElementById('content-decided').innerHTML = '';
        document.getElementById('roster-table-body').innerHTML = '';
    }
});

// Handle Login Button
loginForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    try {
        await signInWithEmailAndPassword(auth, email, password);
        errorMsg.style.display = 'none'; 
    } catch (error) {
        console.error("Auth Error:", error.message);
        errorMsg.style.display = 'block';
    }
});

// Handle Log Out Button
logoutBtn.addEventListener('click', () => {
    signOut(auth);
});

// Data Fetcher & Renderer
async function loadApplications() {
    const colNew = document.getElementById('content-new');
    const colReview = document.getElementById('content-review');
    const colDecided = document.getElementById('content-decided');
    
    colNew.innerHTML = ''; 
    colReview.innerHTML = '';
    colDecided.innerHTML = '';
    
    let countNew = 0;
    let countReview = 0;

    try {
        const querySnapshot = await getDocs(collection(db, "applications"));
        let allApps = []; 

        // 1. Gather all apps
        querySnapshot.forEach((documentSnapshot) => {
            const data = documentSnapshot.data();
            data.id = documentSnapshot.id;
            allApps.push(data);
        });

        // 2. Sort array by date (Newest First)
        allApps.sort((a, b) => new Date(b.submissionTime) - new Date(a.submissionTime));

        // 3. Loop through sorted array and build cards
        allApps.forEach((data) => {
            const appId = data.id; 
            const card = document.createElement('div');
            card.className = 'app-card';
            
            const dateObj = new Date(data.submissionTime);
            const formattedDate = dateObj.toLocaleDateString() + ' ' + dateObj.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});

            let actionButtons = '';
            
            const safeName = data.characterName ? data.characterName.replace(/'/g, "\\'") : "Unknown";
            const dId = data.discordId || "";

            if (data.status === 'New') {
                actionButtons = `<button class="action-btn btn-review" onclick="window.updateStatus('${appId}', 'Review', '${safeName}', '${dId}')">Move to Review</button>`;
            } else if (data.status === 'Review') {
                actionButtons = `
                    <button class="action-btn btn-accept" onclick="window.updateStatus('${appId}', 'Accepted', '${safeName}', '${dId}')">Accept</button>
                    <button class="action-btn btn-reject" onclick="window.updateStatus('${appId}', 'Rejected', '${safeName}', '${dId}')">Reject</button>
                `;
            }

            let statusBadge = '';
            let commandNote = ''; 
            
            if (data.status === 'Accepted') {
                statusBadge = `<span class="badge badge-green">ACCEPTED</span>`;
                if (data.reason) {
                    commandNote = `<div style="margin-top: 10px; padding: 10px; background-color: #1a1a1a; border-left: 3px solid #43a047; border-radius: 4px;"><strong style="color: #43a047;">Command Note:</strong> ${data.reason}</div>`;
                }
            }
            if (data.status === 'Rejected') {
                statusBadge = `<span class="badge badge-red">REJECTED</span>`;
                if (data.reason) {
                    commandNote = `<div style="margin-top: 10px; padding: 10px; background-color: #1a1a1a; border-left: 3px solid #e53935; border-radius: 4px;"><strong style="color: #e53935;">Command Note:</strong> ${data.reason}</div>`;
                }
            }

            card.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                    <h4>${escapeHTML(data.characterName) || 'Unknown Name'}</h4>
                    ${statusBadge}
                </div>
                <p><strong>Discord:</strong> ${escapeHTML(data.discordName)}</p>
                <p><strong>IRL Age:</strong> ${escapeHTML(data.irlAge)} | <strong>TZ:</strong> ${escapeHTML(data.timezone)}</p>
                <p><strong>Submitted:</strong> ${formattedDate}</p>
                
                ${commandNote} <details>
                    <summary>Read Full Application</summary>
                    <p style="color: #e53935; margin-top: 15px; border-bottom: 1px solid #333; padding-bottom: 5px;"><strong>--- Background & Experience ---</strong></p>
                    <p><strong>Criminal Record:</strong> ${escapeHTML(data.criminalRecord)}</p>
                    <p><strong>Hours & Activity:</strong><br> ${escapeHTML(data.playtime)}</p>
                    <p><strong>Past Warnings/Bans:</strong><br> ${escapeHTML(data.warnings)}</p>
                    <p><strong>Past EMS Experience:</strong><br> ${escapeHTML(data.experience)}</p>
                    <p><strong>Why Join EMS:</strong><br> ${escapeHTML(data.whyJoin)}</p>
                    
                    <p style="color: #e53935; margin-top: 15px; border-bottom: 1px solid #333; padding-bottom: 5px;"><strong>--- Medical Scenarios ---</strong></p>
                    <p><strong>Broken Leg Scenario:</strong><br> ${escapeHTML(data.scenarioBrokenLeg)}</p>
                    <p><strong>Prioritize Care Scenario:</strong><br> ${escapeHTML(data.scenarioPrioritize)}</p>
                    <p><strong>Mt. Chiliad Scenario:</strong><br> ${escapeHTML(data.scenarioChiliad)}</p>
                    <p><strong>Civilian Threat Scenario:</strong><br> ${escapeHTML(data.scenarioThreat)}</p>
                    <p><strong>Command Rule Break:</strong><br> ${escapeHTML(data.scenarioRuleBreak)}</p>
                    <p><strong>Demanding Revive (No RP):</strong><br> ${escapeHTML(data.scenarioNoRP)}</p>

                    <p style="color: #e53935; margin-top: 15px; border-bottom: 1px solid #333; padding-bottom: 5px;"><strong>--- Rules & Server Knowledge ---</strong></p>
                    <p><strong>Weapons Policy:</strong><br> ${escapeHTML(data.weaponsPolicy)}</p>
                    <p><strong>Traffic Laws:</strong><br> ${escapeHTML(data.trafficLaws)}</p>
                    <p><strong>Powergaming:</strong><br> ${escapeHTML(data.powergaming)}</p>
                    <p><strong>Metagaming:</strong><br> ${escapeHTML(data.metagaming)}</p>
                    <p><strong>Combat Reviving:</strong><br> ${escapeHTML(data.combatReviving)}</p>
                    <p><strong>NVL / FTVL:</strong><br> ${escapeHTML(data.nvl)}</p>
                    <p><strong>Willing to Train:</strong> ${escapeHTML(data.trainingAttendance)}</p>
                </details>

                <div class="card-actions">
                    ${actionButtons}
                </div>
            `;
            
            if (data.status === 'New') {
                colNew.appendChild(card);
                countNew++;
            } else if (data.status === 'Review') {
                colReview.appendChild(card);
                countReview++;
            } else {
                colDecided.appendChild(card);
            }
        });

        document.getElementById('count-new').innerText = countNew;
        document.getElementById('count-review').innerText = countReview;

    } catch (error) {
        console.error("Error fetching applications: ", error);
        colNew.innerHTML = `<p style="color: red; padding: 1rem;">Failed to load data.</p>`;
    }
}

// Update Status & Add a Reason in Firebase
window.updateStatus = async function(appId, newStatus, charName, discordId) {
    let reasonText = "";

    if (newStatus === 'Accepted' || newStatus === 'Rejected') {
        const userInput = prompt(`(Optional) Enter a reason for marking this application as ${newStatus}:`);
        if (userInput === null) return; 
        reasonText = userInput.trim();
    }

    try {
        const appRef = doc(db, "applications", appId);
        const updateData = { status: newStatus };
        if (reasonText !== "") updateData.reason = reasonText;

        // 1. Update Database
        await updateDoc(appRef, updateData);
        
        // 2. Decision Webhook
        if (newStatus === 'Accepted' || newStatus === 'Rejected') {
            const discordWebhookUrl = "https://discord.com/api/webhooks/1496645570247524372/PMgNuTwnZkFrVJFk7uTaUGrigS3C4QgYqtK7aEQOX73zoQBAPlZz8dH2fwOKHpNwdbKo"; 
            
            const embedColor = newStatus === 'Accepted' ? 4431943 : 15158332; 
            
            const discordMessage = {
                "embeds": [{
                    "title": `📋 Application ${newStatus.toUpperCase()}`,
                    "description": `The application for **${charName}** has been marked as ${newStatus}.`,
                    "color": embedColor
                }]
            };

            if (discordId) {
                discordMessage.content = `<@${discordId}>`;
            }

            if (reasonText && reasonText.trim() !== "") {
                discordMessage.embeds[0].fields = [{
                    "name": "Command Note:",
                    "value": reasonText
                }];
            }

            console.log("🚀 Attempting to send decision to Discord...", discordMessage);

            try {
                // Fire to Discord
                const response = await fetch(discordWebhookUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json' 
                    },
                    body: JSON.stringify(discordMessage)
                });
                
                if (!response.ok) {
                    console.error("❌ Discord rejected the message. Reason:", await response.text());
                } else {
                    console.log("✅ Discord message sent successfully!");
                }
            } catch (error) {
                console.error("🔥 Browser blocked the request:", error);
            }
        }
        
        // 3. Reload board
        loadApplications();
        
    } catch (error) {
        console.error("Error updating status: ", error);
        alert("Failed to update application status.");
    }
}
//=========================
// ROSTER MANAGEMENT SYSTEM

// 1. Tab Switching Logic
window.switchTab = function(tabName) {
    
    const currentUser = auth.currentUser;
    if (!currentUser || currentUser.email !== 'command@seasonsrp.com') {
        alert("🔒 Unauthorized Access Detected. Nice try!");
        window.location.reload(); 
        return; 
    }

    // Define our three tabs and sections
    const tabs = {
        'apps': { btn: document.getElementById('tab-apps'), sec: document.getElementById('section-apps'), load: loadApplications },
        'roster': { btn: document.getElementById('tab-roster'), sec: document.getElementById('section-roster'), load: loadRoster },
        'pcr': { btn: document.getElementById('tab-pcr'), sec: document.getElementById('section-pcr'), load: loadPCRs },
        'promotions': { btn: document.getElementById('tab-promotions'), sec: document.getElementById('section-promotions'), load: loadPromotions } // ADD THIS LINE
    };

    // First, hide EVERYTHING and remove active classes
    Object.values(tabs).forEach(t => {
        if (t.btn) t.btn.classList.remove('active');
        if (t.sec) t.sec.style.display = 'none';
    });

    // Then, show ONLY the one that was clicked and run its database load function
    if (tabs[tabName]) {
        if (tabs[tabName].btn) tabs[tabName].btn.classList.add('active');
        if (tabs[tabName].sec) tabs[tabName].sec.style.display = 'block';
        tabs[tabName].load();
    }
}

// 2. Add New Medic to Firebase
document.getElementById('add-medic-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const newMedic = {
        name: document.getElementById('r-name').value.trim(),
        callsign: document.getElementById('r-callsign').value.trim(),
        position: document.getElementById('r-position').value,
        status: document.getElementById('r-status').value,
        timezone: document.getElementById('r-timezone').value.trim(),
        strikes: parseInt(document.getElementById('r-strikes').value) || 0,
        joinDate: document.getElementById('r-join').value,
        lastPromoted: document.getElementById('r-promoted').value,
        discordName: document.getElementById('r-discord').value.trim(),
        discordId: document.getElementById('r-discordId').value.trim(),
        divisions: document.getElementById('r-divisions').value.split(',').map(d => d.trim()).filter(d => d),
        certs: document.getElementById('r-certs').value.split(',').map(c => c.trim()).filter(c => c),
        isHighCommand: document.getElementById('r-hc').checked,
        notes: document.getElementById('r-notes').value.trim()
    };

    try {
        await addDoc(collection(db, "roster"), newMedic);
        
        // Success actions!
        alert(`✅ ${newMedic.name} was successfully added to the roster!`);
        document.getElementById('add-medic-form').reset(); // Clears the text boxes
        loadRoster(); // Instantly refreshes the master table below
        
    } catch (error) {
        console.error("Firebase rejected this row:", newMedic.name, error);
        alert(`🔥 FIREBASE REJECTED THE UPLOAD!\n\nReason: ${error.message}`);
    }
});

// 3. Load Master Roster Table (With Memory Bank)
window.medicDirectory = {};

async function loadRoster() {
    const tbody = document.getElementById('roster-table-body');
    tbody.innerHTML = '<tr><td colspan="7">Loading roster data...</td></tr>';
    
    try {
        const querySnapshot = await getDocs(collection(db, "roster"));
        tbody.innerHTML = ''; 
        
        let allMedics = [];
        querySnapshot.forEach((docSnap) => {
            const data = docSnap.data();
            data.id = docSnap.id; 
            allMedics.push(data);
            
            // Save full profile into memory bank using ID
            window.medicDirectory[data.id] = data; 
        });

        // Sorting Engine
        allMedics.sort((a, b) => {
            const numA = a.callsign ? parseInt(a.callsign.replace(/\D/g, '')) || 9999 : 9999;
            const numB = b.callsign ? parseInt(b.callsign.replace(/\D/g, '')) || 9999 : 9999;
            return numA - numB;
        });

        // Loop through array
        allMedics.forEach((data) => {
            const strikeStyling = data.strikes > 0 ? `style="color: #e53935; font-weight: bold;"` : `style="color: #888;"`;
            const hcBadge = data.isHighCommand ? `<span class="badge badge-red" style="margin-left: 5px;">HC</span>` : '';

            const row = document.createElement('tr');
            row.innerHTML = `
                <td><strong>${escapeHTML(data.callsign) || 'N/A'}</strong></td>
                <td>${escapeHTML(data.name) || 'Unknown'} ${hcBadge}</td>
                <td>${escapeHTML(data.position) || 'Trainee'}</td>
                <td>${escapeHTML(data.status) || 'Active'}</td>
                <td ${strikeStyling}>${escapeHTML(data.strikes) || 0}</td>
                <td>${escapeHTML(data.discordName) || 'N/A'}</td>
                <td>
                    <button class="action-btn btn-review" onclick="window.openEditModal('${escapeHTML(data.id)}')" style="padding: 0.3rem 0.5rem; font-size: 0.8rem;">Edit Profile</button>
                </td>
            `;
            tbody.appendChild(row);
        });

    } catch (error) {
        console.error("Error loading roster: ", error);
        tbody.innerHTML = '<tr><td colspan="7" style="color: red;">Failed to load roster.</td></tr>';
    }
}

// ===============================
// CSV UPSERT & SOFT PURGE SCRIPT

document.getElementById('btn-csv-import')?.addEventListener('click', async () => {
    const fileInput = document.getElementById('csv-file-input');
    const file = fileInput.files[0];

    if (!file) {
        alert("Please select a .csv file first!");
        return;
    }

    // Change button to show progress
    const btn = document.getElementById('btn-csv-import');
    const originalText = btn.innerText;
    btn.innerText = "Syncing Database... Please Wait";
    btn.disabled = true;

    const reader = new FileReader();
    reader.onload = async function(e) {
        const rawData = e.target.result;
        const rows = rawData.split(/\r?\n/);
        
        let insertedCount = 0;
        let updatedCount = 0;
        let ghostCount = 0;
        let errorCount = 0;

        try {
            // 1. Download current Firebase roster to map existing Discord IDs
            const rosterSnap = await getDocs(collection(db, "roster"));
            let existingMedics = {}; 
            let unhandledDocIds = new Set(); // We will cross people off this list as we find them

            rosterSnap.forEach(docSnap => {
                const data = docSnap.data();
                if (data.discordId) {
                    existingMedics[data.discordId] = docSnap.id;
                }
                unhandledDocIds.add(docSnap.id);
            });

            // 2. Loop through the CSV
            for (let i = 0; i < rows.length; i++) {
                let row = rows[i];
                if (!row.trim()) continue;

                const cols = row.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(c => c ? c.trim().replace(/^"|"$/g, '') : "");
                const medicName = cols[1]; 

                // Skip headers or empty names
                if (!medicName || medicName.toLowerCase() === "name" || medicName.includes("High Command") || medicName.includes("Division Command")) {
                    continue; 
                }

                let strikesNum = parseInt(cols[9]);
                if (isNaN(strikesNum)) strikesNum = 0;

                const currentDiscordId = cols[16] || "";

                const medicData = {
                    name: cols[1] || "Unknown",
                    position: cols[3] || "Trainee",
                    callsign: cols[5] || "N/A",
                    status: cols[7] || "Active",
                    timezone: cols[8] || "EST",
                    strikes: strikesNum,
                    isHighCommand: String(cols[11]).toLowerCase() === 'true', 
                    divisions: cols[12] ? [cols[12]] : [],
                    joinDate: cols[13] || "",
                    lastPromoted: cols[14] || "",
                    discordName: cols[15] || "",
                    discordId: currentDiscordId,
                    notes: cols[17] || ""
                };

                try {
                    // 3. The Fork in the Road (Upsert)
                    if (currentDiscordId && existingMedics[currentDiscordId]) {
                        // MATCH FOUND: Update the existing document
                        const docId = existingMedics[currentDiscordId];
                        await updateDoc(doc(db, "roster", docId), medicData);
                        
                        unhandledDocIds.delete(docId); // Cross them off the ghost list!
                        updatedCount++;
                    } else {
                        // NO MATCH: Insert brand new medic
                        await addDoc(collection(db, "roster"), medicData);
                        insertedCount++;
                    }
                } catch (error) {
                    console.error("Firebase rejected this row:", medicData.name, error);
                    errorCount++;
                }
            }

            // 4. The Soft Purge (Ghost Handling)
            for (const ghostId of unhandledDocIds) {
                // If they weren't in the CSV, set them to Inactive
                await updateDoc(doc(db, "roster", ghostId), { status: "Inactive" });
                ghostCount++;
            }

            alert(`✅ Smart Sync Complete!\n\n🆕 New Hires Added: ${insertedCount}\n🔄 Profiles Updated: ${updatedCount}\n👻 Ghosted (Set Inactive): ${ghostCount}\n❌ Errors: ${errorCount}`);
            
        } catch (masterError) {
            console.error("Fatal Sync Error:", masterError);
            alert("A fatal error occurred during sync. Check the developer console.");
        } finally {
            // Reset UI
            fileInput.value = ''; 
            btn.innerText = originalText;
            btn.disabled = false;
            
            // Instantly refresh the table
            if (typeof loadRoster === "function") {
                loadRoster(); 
            }
        }
    };

    reader.readAsText(file);
});

//============
// ROSTER EDIT 

window.openEditModal = function(docId) {
    // Pull medic's exact profile
    const medic = window.medicDirectory[docId]; 
    if (!medic) return;

    document.getElementById('edit-modal').style.display = 'flex';
    document.getElementById('edit-modal-title').innerText = `Editing Profile: ${medic.name}`;
    document.getElementById('edit-doc-id').value = docId;
    
    // Auto-fill all boxes
    document.getElementById('edit-name').value = medic.name || '';
    document.getElementById('edit-callsign').value = medic.callsign || '';
    document.getElementById('edit-position').value = medic.position || 'Trainee';
    document.getElementById('edit-status').value = medic.status || 'Active';
    document.getElementById('edit-timezone').value = medic.timezone || '';
    document.getElementById('edit-strikes').value = medic.strikes || 0;
    document.getElementById('edit-join').value = medic.joinDate || '';
    document.getElementById('edit-promoted').value = medic.lastPromoted || '';
    document.getElementById('edit-discord').value = medic.discordName || '';
    document.getElementById('edit-discordId').value = medic.discordId || '';
    
    document.getElementById('edit-divisions').value = (medic.divisions && Array.isArray(medic.divisions)) ? medic.divisions.join(', ') : '';
    document.getElementById('edit-certs').value = (medic.certs && Array.isArray(medic.certs)) ? medic.certs.join(', ') : '';
    
    document.getElementById('edit-hc').checked = medic.isHighCommand === true;
    document.getElementById('edit-notes').value = medic.notes || '';
};

window.closeEditModal = function() {
    document.getElementById('edit-modal').style.display = 'none';
};

document.getElementById('edit-medic-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const docId = document.getElementById('edit-doc-id').value;
    
    // Package up new edited data
    const updatedMedic = {
        name: document.getElementById('edit-name').value.trim(),
        callsign: document.getElementById('edit-callsign').value.trim(),
        position: document.getElementById('edit-position').value,
        status: document.getElementById('edit-status').value,
        timezone: document.getElementById('edit-timezone').value.trim(),
        strikes: parseInt(document.getElementById('edit-strikes').value) || 0,
        joinDate: document.getElementById('edit-join').value.trim(),
        lastPromoted: document.getElementById('edit-promoted').value.trim(),
        discordName: document.getElementById('edit-discord').value.trim(),
        discordId: document.getElementById('edit-discordId').value.trim(),
        divisions: document.getElementById('edit-divisions').value.split(',').map(d => d.trim()).filter(d => d),
        certs: document.getElementById('edit-certs').value.split(',').map(c => c.trim()).filter(c => c),
        isHighCommand: document.getElementById('edit-hc').checked,
        notes: document.getElementById('edit-notes').value.trim()
    };

    try {
        const medicRef = doc(db, "roster", docId);
        await updateDoc(medicRef, updatedMedic);

        window.closeEditModal();
        loadRoster(); // Instantly update table
        
    } catch (error) {
        console.error("Error updating medic:", error);
        alert("Failed to update the medic in Firebase.");
    }
});

//====================
// ROSTER DELETE

window.deleteMedic = async function() {
    const docId = document.getElementById('edit-doc-id').value;
    const medicName = document.getElementById('edit-name').value;

    const confirmDelete = confirm(`⚠️ WARNING: Are you sure you want to completely remove ${medicName} from the database? This action cannot be undone.`);
    
    if (!confirmDelete) {
        return;
    }

    try {
        const medicRef = doc(db, "roster", docId);
        await deleteDoc(medicRef);


        window.closeEditModal();
        loadRoster(); 
        
        alert(`✅ ${medicName} has been successfully purged from the roster.`);
        
    } catch (error) {
        console.error("Error deleting medic:", error);
        alert("Failed to delete the medic from Firebase. Check your console for details.");
    }
};

// ====================
// ROSTER SEARCH ENGINE

document.getElementById('roster-search')?.addEventListener('input', function(e) {
    const searchTerm = e.target.value.toLowerCase();
    
    const tableRows = document.querySelectorAll('#roster-table-body tr');

    tableRows.forEach(row => {
        // Read all text inside specific row
        const rowText = row.textContent.toLowerCase();
        
        // If row contains search term, show it. Otherwise, hide
        if (rowText.includes(searchTerm)) {
            row.style.display = '';
        } else {
            row.style.display = 'none';
        }
    });
});

// ====================
// KANBAN SEARCH ENGINE

document.getElementById('app-search')?.addEventListener('input', function(e) {
    const searchTerm = e.target.value.toLowerCase();
    const appCards = document.querySelectorAll('.app-card');

    appCards.forEach(card => {
        const cardText = card.textContent.toLowerCase();
        
        if (cardText.includes(searchTerm)) {
            card.style.display = 'block'; 
        } else {
            card.style.display = 'none';
        }
    });
});

// ====================
// PCR VIEWER SYSTEM

let modalCtx = null;

async function loadPCRs() {
    const tbody = document.getElementById('pcr-table-body');
    tbody.innerHTML = '<tr><td colspan="5">Loading reports...</td></tr>';
    
    try {
        const querySnapshot = await getDocs(collection(db, "pcr_reports"));
        tbody.innerHTML = ''; 
        
        let allPCRs = [];
        querySnapshot.forEach(doc => { allPCRs.push({ id: doc.id, ...doc.data() }); });
        
        allPCRs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        allPCRs.forEach(data => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${data.date}</td>
                <td>${escapeHTML(data.patient)}</td>
                <td>${escapeHTML(data.primaryMedic)}</td>
                <td>${escapeHTML(data.priority)}</td>
                <td>
                    <button class="action-btn btn-review" onclick='window.viewPCR(${JSON.stringify(data).replace(/'/g, "&#39;")})'>View Report</button>
                </td>
            `;
            tbody.appendChild(row);
        });
    } catch (error) {
        console.error("PCR Load Error:", error);
    }
}

// The Read-Only Draw Function
window.viewPCR = function(data) {
    document.getElementById('pcr-modal').style.display = 'flex';
    document.getElementById('v-patient').textContent = data.patient;
    document.getElementById('v-medic').textContent = data.primaryMedic;
    document.getElementById('v-gcs').textContent = data.gcsTotal;
    document.getElementById('v-narrative').textContent = data.narrative;

    const canvas = document.getElementById('modal-body-canvas');
    if (!modalCtx) modalCtx = canvas.getContext('2d');
    
    // Wait a millisecond for CSS to size the modal, then draw
    setTimeout(() => {
        canvas.width = canvas.offsetWidth;
        canvas.height = canvas.offsetHeight;
        
        modalCtx.clearRect(0, 0, canvas.width, canvas.height);
        
        if (data.injuries && data.injuries.length > 0) {
            data.injuries.forEach(marker => {
                const drawX = (marker.x / 100) * canvas.width;
                const drawY = (marker.y / 100) * canvas.height;

                modalCtx.beginPath();
                modalCtx.arc(drawX, drawY, 6, 0, Math.PI * 2);
                modalCtx.fillStyle = '#e53935';
                modalCtx.fill();
                modalCtx.strokeStyle = '#fff';
                modalCtx.lineWidth = 2;
                modalCtx.stroke();
            });
        }
    }, 50);
};

// ====================
// FTO PROMOTIONS SYSTEM

async function loadPromotions() {
    const grid = document.getElementById('promotions-grid');
    grid.innerHTML = '<p style="color: #888; width: 100%; text-align: center;">Loading applications...</p>';
    
    try {
        const q = query(collection(db, "fto_applications"), where("status", "==", "Pending"));
        const querySnapshot = await getDocs(q);
        grid.innerHTML = '';
        
        if (querySnapshot.empty) {
            grid.innerHTML = '<p style="color: #888; width: 100%; text-align: center;">No pending FTO applications.</p>';
            return;
        }

        querySnapshot.forEach((docSnap) => {
            const data = docSnap.data();
            const strikeStyling = data.strikes > 0 ? `color: #e53935; font-weight: bold;` : `color: #43a047;`;
            
            const card = document.createElement('div');
            card.className = 'medic-card';
            card.style.borderColor = '#fb8c00';
            card.innerHTML = `
                <div class="medic-header">
                    <h3 style="color: #fb8c00;">${escapeHTML(data.medicName)}</h3>
                </div>
                <h2>${escapeHTML(data.callsign)}</h2>
                <p style="color: #ccc; margin-bottom: 5px;">Discord: ${escapeHTML(data.discordName)}</p>
                <p style="margin-bottom: 15px;">Strikes: <span style="${strikeStyling}">${escapeHTML(data.strikes)}</span></p>
                <button class="btn-primary" style="width: 100%; background-color: #fb8c00;" onclick="window.viewFTO(${escapeHTML(JSON.stringify({id: docSnap.id, ...data}))})">Review Packet</button>
            `;
            grid.appendChild(card);
        });
    } catch (error) {
        console.error("Promotions Load Error:", error);
        grid.innerHTML = '<p style="color: red;">Failed to load promotions.</p>';
    }
}

let activeFTOAppId = null;
let activeFTODiscordId = null;

window.viewFTO = function(data) {
    activeFTOAppId = data.id;
    activeFTODiscordId = data.discordId;

    document.getElementById('f-name').textContent = data.medicName;
    document.getElementById('f-callsign').textContent = data.callsign;
    document.getElementById('f-discord').textContent = data.discordId;
    document.getElementById('f-strikes').textContent = data.strikes;

    const answersDiv = document.getElementById('f-answers');
    answersDiv.innerHTML = `
        <h4 style="color: #fb8c00; margin-top: 15px;">Why do you want to be an FTO?</h4><p>${escapeHTML(data.q_why)}</p>
        <h4 style="color: #fb8c00; margin-top: 15px;">Responsibilities of an FTO:</h4><p>${escapeHTML(data.q_resp)}</p>
        <h4 style="color: #fb8c00; margin-top: 15px;">What makes you stand out:</h4><p>${escapeHTML(data.q_standout)}</p>
        <h4 style="color: #fb8c00; margin-top: 15px;">Current strengths:</h4><p>${escapeHTML(data.q_strength)}</p>
        
        <h4 style="color: #fb8c00; margin-top: 15px; border-top: 1px dashed #333; padding-top: 10px;">Scenario 1 (Police Complaint):</h4><p>${escapeHTML(data.s_police)}</p>
        <h4 style="color: #fb8c00; margin-top: 15px;">Scenario 2 (Junior Mistakes):</h4><p>${escapeHTML(data.s_junior)}</p>
        <h4 style="color: #fb8c00; margin-top: 15px;">Scenario 3 (MCI Safety):</h4><p>${escapeHTML(data.s_mci)}</p>
        <h4 style="color: #fb8c00; margin-top: 15px;">Scenario 4 (Vehicle Rules):</h4><p>${escapeHTML(data.s_vehicle)}</p>
    `;

    document.getElementById('fto-modal').style.display = 'flex';
};

async function decideFTO(decision) {
    if (!activeFTOAppId) return;

    let reasonText = "";
    const userInput = prompt(`(Optional) Enter a reason for marking this FTO application as ${decision}:`);
    if (userInput === null) return; // Cancelled
    reasonText = userInput.trim();
    
    try {
        const updateData = { status: decision, notified: false }; // notified: false is the trigger for your bot!
        if (reasonText !== "") updateData.reason = reasonText;

        // 1. Update Firebase (This instantly wakes up your custom Discord Bot)
        await updateDoc(doc(db, "fto_applications", activeFTOAppId), updateData);
        
        // 2. Send the Public Log to your Command Channel
        const ftoChannelWebhookUrl = "https://discord.com/api/webhooks/1499957508251586681/1lkUCnv2wmmAvOmX5V7s3Y_hTfxJuV6sAlaMjzgSSze-8HOraT0FOwchbWLJJKRu80MQ"; 
        const embedColor = decision === 'Accepted' ? 4431943 : 15158332;

        const discordMessage = {
            "embeds": [{
                "title": `⭐ FTO Application ${decision.toUpperCase()}`,
                "description": `The FTO application for **${document.getElementById('f-name').textContent}** has been marked as ${decision}.`,
                "color": embedColor
            }]
        };

        if (reasonText !== "") {
            discordMessage.embeds[0].fields = [{ "name": "Command Note:", "value": reasonText }];
        }

        await fetch(ftoChannelWebhookUrl, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(discordMessage) });

        alert(`✅ Application ${decision} logged. The bot is sending the DM now!`);
        document.getElementById('fto-modal').style.display = 'none';
        loadPromotions(); // Refresh list

    } catch (error) {
        console.error("FTO Decision Error:", error);
        alert("Failed to process decision. Check console.");
    }
}

document.getElementById('btn-fto-accept')?.addEventListener('click', () => decideFTO('Accepted'));
document.getElementById('btn-fto-reject')?.addEventListener('click', () => decideFTO('Rejected'));