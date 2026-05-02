// =======================
// SECURITY: XSS Sanitizer

function escapeHTML(str) {
    if (!str) return '';
    return str.toString()
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// =============================
// 1. IMPORTS & GLOBAL DATABASES

import { db } from './firebase-config.js'; 
import { collection, getDocs, query, where, addDoc, updateDoc, deleteDoc, doc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const certsDatabase = {
    "SAR": { 
        title: "Search & Rescue (SAR)", 
        director: "Atlas Buckshank", 
        icon: "🤿", 
        desc: "Specialized in locating, accessing, stabilizing, and extracting patients in high-risk environments." 
    },
    "HALO": { 
        title: "Aviation (HALO)", 
        director: "Lex Frey", 
        icon: "🚁", 
        desc: "Rapid advanced medical response and transport utilizing helicopter flight operations." 
    },
    "HSRS": { 
        title: "High Speed Response", 
        director: "David Gawk Gawk", 
        icon: "🏎️", 
        desc: "Rapid deployment and immediate on-scene intervention in time-critical emergencies." 
    },
    "MASS": { 
        title: "Tactical Command", 
        director: "Jackson Hill", 
        icon: "🛡️", 
        desc: "Coordination and management of large-scale emergencies and mass casualty incidents." 
    }
};

let activeExamKey = []; 

// ===============================
// 2. GLOBAL FUNCTIONS & RENDERERS

function setPortalView(viewTarget) {
    const loginView = document.getElementById('login-view');
    const dashboardView = document.getElementById('dashboard-view');
    
    switch(viewTarget) {
        case 'login':
            loginView.style.display = 'flex';
            dashboardView.style.display = 'none';
            break;
        case 'dashboard':
            loginView.style.display = 'none';
            dashboardView.style.display = 'block';
            break;
        default:
            console.error('Invalid view target provided.');
            break;
    }
}

// Certifications Renderer
window.renderMyCerts = function(userCertsArray) {
    const container = document.getElementById('certs-container');
    if (!container) return; // Failsafe if element is missing

    container.innerHTML = ''; 

    const myCerts = (userCertsArray || []).map(cert => cert.trim().toUpperCase());

    // Loop through EVERY certification in database
    Object.keys(certsDatabase).forEach(certKey => {
        const certInfo = certsDatabase[certKey];
        
        const hasCert = myCerts.includes(certKey);

        // Determine styles based on if they have cert
        const badgeHTML = hasCert
            ? `<span style="background-color: rgba(67, 160, 71, 0.15); color: #43a047; padding: 4px 8px; border-radius: 4px; font-size: 0.75rem; font-weight: 800; letter-spacing: 1px;">ACTIVE</span>`
            : `<span style="background-color: #2a2a2a; color: #666; padding: 4px 8px; border-radius: 4px; font-size: 0.75rem; font-weight: 800; letter-spacing: 1px;">LOCKED</span>`;

        // Dim text slightly if they don't have it
        const contentOpacity = hasCert ? "1" : "0.4";
        
        // Disable CSS hover effect so locked cards don't light up red
        const hoverStyle = hasCert ? "" : "pointer-events: none;";

        const card = document.createElement('div');
        card.className = 'cert-card';
        card.style.cssText = hoverStyle; 

        card.innerHTML = `
            <div style="opacity: ${contentOpacity}; display: flex; flex-direction: column; height: 100%;">
                <div class="cert-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                    <span style="font-size: 1.8rem;">${escapeHTML(certInfo.icon)}</span>
                    ${badgeHTML}
                </div>
                <h3 style="color: #fff; margin-top: 0; margin-bottom: 0.5rem; font-size: 1.25rem;">${escapeHTML(certInfo.title)}</h3>
                <p style="color: #aaa; font-size: 0.9rem; line-height: 1.5; flex-grow: 1; margin-bottom: 1.5rem;">${escapeHTML(certInfo.desc)}</p>
                <div style="border-top: 1px solid #333; padding-top: 1rem; color: #888;">
                    <small><strong style="color: ${hasCert ? '#fb8c00' : '#555'};">Dept. Head:</strong> ${escapeHTML(certInfo.director)}</small>
                </div>
            </div>
        `;
        container.appendChild(card);
    });
}

// Exam Mechanics
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

// Helper to calculate where to drop the dragged item
function getDragAfterElement(container, y) {
    const draggableElements = [...container.querySelectorAll('.sequence-item:not(.dragging)')];
    return draggableElements.reduce((closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = y - box.top - box.height / 2;
        if (offset < 0 && offset > closest.offset) {
            return { offset: offset, element: child };
        } else {
            return closest;
        }
    }, { offset: Number.NEGATIVE_INFINITY }).element;
}

function renderExam(questions) {
    const questionList = document.getElementById('question-list');
    questionList.innerHTML = ''; 
    activeExamKey = []; 

    questions.forEach((q, index) => {
        // Save the raw, un-shuffled data for the grading key
        activeExamKey.push({ 
            id: q.id, 
            question: q.question, 
            answer: q.correct_answer || q.answer, 
            type: q.type, 
            options: q.options 
        });
        
        const qDiv = document.createElement('div');
        qDiv.classList.add('question-block');
        
        const qTitle = document.createElement('h4');
        qTitle.textContent = `${index + 1}. ${q.question}`;
        qDiv.appendChild(qTitle);

        // 🔀 THE FIX: Create a randomized copy of the options for the UI
        const shuffledOptions = shuffleArray([...q.options]);

        switch(q.type) {
            case 'multiple_choice':
                shuffledOptions.forEach(option => {
                    const label = document.createElement('label');
                    label.innerHTML = `<input type="radio" name="q${index}" value="${option}" required> ${option}`;
                    qDiv.appendChild(label);
                });
                break;
                
            case 'multi_select':
                shuffledOptions.forEach(option => {
                    const label = document.createElement('label');
                    label.innerHTML = `<input type="checkbox" name="q${index}" value="${option}"> ${option}`;
                    qDiv.appendChild(label);
                });
                break;
                
            case 'sequence':
                const hint = document.createElement('p');
                hint.style.color = '#fb8c00';
                hint.style.fontSize = '0.9rem';
                hint.textContent = "(Drag and drop the items to set the correct order)";
                qDiv.appendChild(hint);

                const seqContainer = document.createElement('div');
                seqContainer.className = 'sequence-container';
                seqContainer.dataset.questionIndex = index;

                shuffledOptions.forEach((option) => {
                    const item = document.createElement('div');
                    item.className = 'sequence-item';
                    item.draggable = true;
                    item.textContent = option;
                    item.dataset.value = option;
                    
                    item.addEventListener('dragstart', () => item.classList.add('dragging'));
                    item.addEventListener('dragend', () => item.classList.remove('dragging'));
                    seqContainer.appendChild(item);
                });

                seqContainer.addEventListener('dragover', e => {
                    e.preventDefault(); 
                    const afterElement = getDragAfterElement(seqContainer, e.clientY);
                    const draggable = document.querySelector('.dragging');
                    if (afterElement == null) {
                        seqContainer.appendChild(draggable);
                    } else {
                        seqContainer.insertBefore(draggable, afterElement);
                    }
                });

                qDiv.appendChild(seqContainer);
                break;
        }
        questionList.appendChild(qDiv);
    });
}

// Prescription Fetch & Render
async function loadPrescriptions() {
    if (!sessionStorage.getItem('activeEmployeeName')) {
        alert("🔒 Unauthorized Access Detected. Please log in to view medical records.");
        window.location.reload(); // Force kick to login screen
        return; 
    }

    const rxTableBody = document.getElementById('rx-table-body');
    rxTableBody.innerHTML = '<tr><td colspan="7" style="text-align:center;">Loading database...</td></tr>';
    
    try {
        const querySnapshot = await getDocs(collection(db, "prescriptions"));
        rxTableBody.innerHTML = '';
        
        if (querySnapshot.empty) {
            rxTableBody.innerHTML = '<tr><td colspan="7" style="text-align:center;">No active prescriptions found.</td></tr>';
            return;
        }

        querySnapshot.forEach((docSnap) => {
            const rx = docSnap.data();
            const tr = document.createElement('tr');
            const dateStr = new Date(rx.timestamp).toLocaleDateString();

            tr.innerHTML = `
                <td style="font-weight: bold; color: white;">${escapeHTML(rx.patient)}</td>
                <td style="color: #fb8c00;">${escapeHTML(rx.medication)}</td>
                <td>${escapeHTML(rx.dosage)}</td>
                <td>${escapeHTML(rx.refills)}</td>
                <td>${escapeHTML(rx.doctor)}</td>
                <td>${dateStr}</td>
                <td>
                    <button class="action-btn btn-review" onclick="window.editRx('${docSnap.id}', '${escapeHTML(rx.patient)}', '${escapeHTML(rx.medication)}', '${escapeHTML(rx.dosage)}', '${escapeHTML(rx.refills)}', '${escapeHTML(rx.doctor)}')">Edit</button>
                    <button class="action-btn btn-reject" onclick="window.deleteRx('${docSnap.id}')">Delete</button>
                </td>
            `;
            rxTableBody.appendChild(tr);
        });

    } catch (error) {
        console.error("Error loading prescriptions:", error);
        rxTableBody.innerHTML = '<tr><td colspan="7" style="text-align:center; color: red;">Failed to load data. Check console.</td></tr>';
    }
}

// Attached to window for inline HTML onclick attributes
window.editRx = function(id, patient, med, dose, refills, doc) {
    document.getElementById('rx-id').value = id;
    document.getElementById('rx-patient').value = patient;
    document.getElementById('rx-medication').value = med;
    document.getElementById('rx-dosage').value = dose;
    document.getElementById('rx-refills').value = refills;
    document.getElementById('rx-doctor').value = doc;
    
    document.getElementById('rx-form-title').textContent = "Edit Prescription";
    document.getElementById('rx-form-container').style.display = 'block';
    window.scrollTo({ top: 0, behavior: 'smooth' }); 
};

window.deleteRx = async function(id) {
    if (confirm("Are you sure you want to delete this prescription? This cannot be undone.")) {
        try {
            await deleteDoc(doc(db, "prescriptions", id));
            loadPrescriptions(); 
        } catch (error) {
            console.error("Error deleting prescription:", error);
            alert("Failed to delete.");
        }
    }
};

// ==================================
// 3. CORE INITIALIZATION (Page Load)

// Auto-Login Check
if (sessionStorage.getItem('activeEmployeeName')) {
    document.getElementById('employee-name-display').textContent = sessionStorage.getItem('activeEmployeeName');
    document.getElementById('welcome-name').textContent = sessionStorage.getItem('activeEmployeeName');
    
    const savedCerts = JSON.parse(sessionStorage.getItem('activeEmployeeCerts') || "[]");
    window.renderMyCerts(savedCerts);
    
    // EXAM LOCKS: 
    // BLS is the baseline exam, so it remains universally open to all logged-in employees.
    
    // TEMPLATE FOR FUTURE CERTS: How to lock specialized exams (e.g., HALO)
    /*
    const haloBtn = document.getElementById('start-halo-exam-btn');
    if (haloBtn) {
        if (!savedCerts.includes("HALO")) {
            haloBtn.disabled = true;
            haloBtn.textContent = "🔒 Requires HALO Cert";
            haloBtn.style.backgroundColor = "#2a2a2a";
            haloBtn.style.color = "#666";
            haloBtn.style.cursor = "not-allowed";
            haloBtn.style.border = "1px solid #444";
        } else {
            haloBtn.disabled = false;
            haloBtn.textContent = "Begin HALO Examination";
            haloBtn.style.backgroundColor = ""; 
            haloBtn.style.color = "";
            haloBtn.style.cursor = "pointer";
            haloBtn.style.border = "";
        }
    }
    */
    
    setPortalView('dashboard');
} else {
    setPortalView('login');
}


// ==================
// 4. EVENT LISTENERS

// UNIVERSAL NAVIGATION KILLSWITCH
document.querySelector('.portal-sidebar .nav-links')?.addEventListener('click', (e) => {
    if (!sessionStorage.getItem('activeEmployeeName')) {
        e.preventDefault();
        e.stopImmediatePropagation(); // strictly blocks all other click listeners from running
        alert("🔒 Unauthorized Access Detected. Nice try!");
        window.location.reload(); 
    }
}, true); // activates Event Capture mode, making this run first.

// Authentication
document.getElementById('employee-login-form')?.addEventListener('submit', async (e) => {
    e.preventDefault(); 
    
    const discordInput = document.getElementById('discord-input').value.trim();
    const pinInput = document.getElementById('pin-input').value.trim();

    try {
        const rosterRef = collection(db, "roster"); 
        const q = query(rosterRef, where("discordName", "==", discordInput));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            alert("Error: Discord User not found in the personnel database.");
            return; 
        }

        // 1. Declare empty "memory" variables OUTSIDE the loop
        let loginSuccess = false;
        let employeeName = "";
        let employeeCerts = [];
        let savedCallsign = "";
        let savedDiscordName = "";
        let savedDiscordId = "";
        let savedStrikes = 0;

        querySnapshot.forEach((doc) => {
            const data = doc.data();
            const dbCallsign = data.callsign; 
            const extractedPIN = dbCallsign.replace(/\D/g, ''); 

            if (extractedPIN === pinInput) {
                // 2. Save the data to our outside variables before the loop ends
                loginSuccess = true;
                employeeName = data.name;
                employeeCerts = data.certs || [];
                savedCallsign = dbCallsign;
                savedDiscordName = data.discordName || '';
                savedDiscordId = data.discordId || '';
                savedStrikes = data.strikes || 0;
                
                sessionStorage.setItem('activeEmployeeCerts', JSON.stringify(employeeCerts)); 
            }
        });

        if (loginSuccess) {
            document.getElementById('employee-name-display').textContent = employeeName;
            document.getElementById('welcome-name').textContent = employeeName;
            
            // 3. Use the safely stored variables
            sessionStorage.setItem('activeEmployeeName', employeeName);
            sessionStorage.setItem('activeEmployeeCallsign', savedCallsign);
            sessionStorage.setItem('activeEmployeeDiscord', savedDiscordName);
            sessionStorage.setItem('activeEmployeeDiscordId', savedDiscordId);
            sessionStorage.setItem('activeEmployeeStrikes', savedStrikes);
            
            // Render certs immediately upon login
            window.renderMyCerts(employeeCerts);
            setPortalView('dashboard');
        } else {
            alert("Error: Incorrect Callsign PIN.");
        }

    } catch (error) {
        console.error("Firebase Query Error:", error);
        alert("A server error occurred. Please try again.");
    }
});

// Logout
document.querySelector('.btn-logout')?.addEventListener('click', () => {
    sessionStorage.clear(); 
    window.location.href = 'index.html'; 
});

// ==========================
// Navigation Tab Switching
// ==========================
const navHub = document.getElementById('nav-hub');
const navRx = document.getElementById('nav-rx');
const navCerts = document.getElementById('nav-certs');
const navPcr = document.getElementById('nav-pcr');

const hubMenu = document.getElementById('hub-menu');
const examContainer = document.getElementById('exam-container');
const rxContainer = document.getElementById('rx-container');
const certsContainerView = document.getElementById('view-my-certs');
const pcrContainer = document.getElementById('pcr-container');

// Master Reset: Hides everything and turns off all active highlights
function resetPortalTabs() {
    [navHub, navRx, navCerts, navPcr].forEach(btn => { if (btn) btn.classList.remove('active'); });
    [hubMenu, examContainer, rxContainer, certsContainerView, pcrContainer].forEach(sec => { if (sec) sec.style.display = 'none'; });
}

navHub?.addEventListener('click', () => {
    resetPortalTabs();
    navHub.classList.add('active');
    hubMenu.style.display = 'block';
});

navCerts?.addEventListener('click', () => {
    resetPortalTabs();
    navCerts.classList.add('active');
    certsContainerView.style.display = 'block';
});

navRx?.addEventListener('click', () => {
    resetPortalTabs();
    navRx.classList.add('active');
    rxContainer.style.display = 'block';
    loadPrescriptions();
});

navPcr?.addEventListener('click', () => {
    resetPortalTabs();
    navPcr.classList.add('active');
    pcrContainer.style.display = 'block';

    // Auto-fill Data
    document.getElementById('pcr-signature').textContent = sessionStorage.getItem('activeEmployeeName') || "Unknown Medic";
    document.getElementById('pcr-date').valueAsDate = new Date();

    // Resize canvas to match the image exactly once it is visible
    if (typeof resizeCanvas === 'function') resizeCanvas();
});

// Exam Triggers
document.getElementById('start-exam-btn')?.addEventListener('click', async () => {
    if (!sessionStorage.getItem('activeEmployeeName')) {
        alert("🔒 Unauthorized Access Detected. You must be logged in to take exams.");
        window.location.reload(); 
        return; 
    }

    try {
        hubMenu.style.display = 'none';
        examContainer.style.display = 'block';
        document.getElementById('question-list').innerHTML = '<p>Loading secure exam protocol...</p>';

        const bankRef = collection(db, "training_bank");
        const q = query(bankRef, where("category", "==", "Basic Life Support"), where("active", "==", true));
        const snapshot = await getDocs(q);

        if (snapshot.empty) {
            document.getElementById('question-list').innerHTML = '<p>Error: No active BLS questions found in database.</p>';
            return;
        }

        let allQuestions = [];
        snapshot.forEach(doc => {
            allQuestions.push({ id: doc.id, ...doc.data() });
        });
        
        allQuestions = shuffleArray(allQuestions);
        renderExam(allQuestions.slice(0, 10));

    } catch (error) {
        console.error("Exam Fetch Error:", error);
        document.getElementById('question-list').innerHTML = '<p>Error establishing secure connection to database.</p>';
    }
});

document.getElementById('exam-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const submitBtn = document.getElementById('submit-exam-btn');
    submitBtn.disabled = true;
    submitBtn.textContent = "Processing Grade...";

    let score = 0;
    const totalQuestions = activeExamKey.length;
    let discordLog = ""; // This will hold our Q&A output

    activeExamKey.forEach((q, index) => {
        let isCorrect = false;
        let userAnswerText = "No Answer";

        if (q.type === 'multiple_choice') {
            const selected = document.querySelector(`input[name="q${index}"]:checked`)?.value;
            if (selected) userAnswerText = selected;
            if (selected === q.answer) isCorrect = true;
        } 
        else if (q.type === 'multi_select') {
            const selected = Array.from(document.querySelectorAll(`input[name="q${index}"]:checked`)).map(i => i.value);
            if (selected.length > 0) userAnswerText = selected.join(", ");
            if (selected.length === q.answer.length && selected.every(val => q.answer.includes(val))) {
                isCorrect = true;
            }
        }
        else if (q.type === 'sequence') {
            const container = document.querySelector(`.sequence-container[data-question-index="${index}"]`);
            const items = Array.from(container.querySelectorAll('.sequence-item'));
            const userSequence = items.map(item => item.dataset.value);
            
            userAnswerText = userSequence.join(" ➔ ");
            
            let sequenceCorrect = true;
            q.answer.forEach((correctString, expectedIndex) => {
                if (userSequence[expectedIndex] !== correctString) sequenceCorrect = false;
            });
            if (sequenceCorrect) isCorrect = true;
        }

        if (isCorrect) score++;
        
        // Build the log for Discord
        discordLog += `**Q:** ${q.question}\n**Ans:** ${userAnswerText}\n**Status:** ${isCorrect ? '🟢 Correct' : '🔴 Wrong'}\n\n`;
    });

    const finalPercent = Math.round((score / totalQuestions) * 100);
    const passed = finalPercent >= 80;
    const medicName = sessionStorage.getItem('activeEmployeeName') || "Unknown Medic";
    const callsign = sessionStorage.getItem('activeEmployeeCallsign') || "000";

    try {
        const logsRef = collection(db, "academy_logs");
        await addDoc(logsRef, {
            medic: medicName,
            callsign: callsign,
            exam: "BLS Certification",
            score_percent: finalPercent,
            passed: passed,
            timestamp: new Date().toISOString()
        });

        const webhookURL = "https://discord.com/api/webhooks/1497798479354003466/oqTkpuAsb1YQi7sY-PjmBoNEw-A3y-7mjkP3UYGXr-TJA2CxvBTfZFy6FMoYzv4GghUA"; 
        
        const discordMessage = {
            embeds: [{
                title: passed ? "🟢 BLS Exam Passed" : "🔴 BLS Exam Failed",
                description: discordLog, // Prints the full Q&A rundown here
                color: passed ? 4437375 : 15088742,
                fields: [
                    { name: "Medic", value: medicName, inline: true },
                    { name: "Callsign", value: callsign, inline: true },
                    { name: "Score", value: `${finalPercent}%`, inline: false }
                ],
                timestamp: new Date().toISOString()
            }]
        };

        await fetch(webhookURL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(discordMessage)
        });

        alert(`Exam Complete!\nYour Score: ${finalPercent}%\nStatus: ${passed ? "PASSED" : "FAILED"}`);
        
        // Ensure they get kicked back to hub and test resets
        window.location.reload();

    } catch (error) {
        console.error("Error saving grade:", error);
        alert("Your grade was calculated, but there was an error saving. Contact High Command.");
        submitBtn.disabled = false;
        submitBtn.textContent = "Submit Final Answers";
    }
});

// Prescription Triggers
const rxFormContainer = document.getElementById('rx-form-container');
const rxForm = document.getElementById('rx-form');

document.getElementById('add-rx-btn')?.addEventListener('click', () => {
    rxForm.reset();
    document.getElementById('rx-id').value = ""; 
    document.getElementById('rx-form-title').textContent = "Add New Prescription";
    rxFormContainer.style.display = 'block';
});

document.getElementById('cancel-rx-btn')?.addEventListener('click', () => {
    rxFormContainer.style.display = 'none';
});

rxForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const docId = document.getElementById('rx-id').value;
    const rxData = {
        patient: document.getElementById('rx-patient').value.trim(),
        medication: document.getElementById('rx-medication').value.trim(),
        dosage: document.getElementById('rx-dosage').value.trim(),
        refills: document.getElementById('rx-refills').value.trim(),
        doctor: document.getElementById('rx-doctor').value.trim(),
        timestamp: new Date().toISOString()
    };

    try {
        if (docId) {
            await updateDoc(doc(db, "prescriptions", docId), rxData);
        } else {
            await addDoc(collection(db, "prescriptions"), rxData);
        }
        
        rxFormContainer.style.display = 'none';
        rxForm.reset();
        loadPrescriptions(); 
        
    } catch (error) {
        console.error("Error saving prescription:", error);
        alert("Failed to save. Make sure Firebase Rules are updated.");
    }
});

// =============
// SEARCH ENGINE
document.getElementById('rx-search')?.addEventListener('input', function(e) {
    const searchTerm = e.target.value.toLowerCase();
    const tableRows = document.querySelectorAll('#rx-table-body tr');

    tableRows.forEach(row => {
        const rowText = row.textContent.toLowerCase();
        if (rowText.includes(searchTerm)) {
            row.style.display = '';
        } else {
            row.style.display = 'none';
        }
    });
});

// ====================
// PCR SYSTEM & CANVAS
const canvas = document.getElementById('body-canvas');
let ctx = null;
let injuryArray = [];

if (canvas) {
    ctx = canvas.getContext('2d');
}

// 1. The Canvas Math Engine
function resizeCanvas() {
    if (!canvas) return;
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    drawMarkers();
}

window.addEventListener('resize', resizeCanvas);

canvas?.addEventListener('click', (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Convert pixels to percentages!
    const percentX = (x / canvas.width) * 100;
    const percentY = (y / canvas.height) * 100;

    injuryArray.push({ x: percentX, y: percentY });
    drawMarkers();
});

function drawMarkers() {
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    injuryArray.forEach(marker => {
        // Convert percentages back to pixels
        const drawX = (marker.x / 100) * canvas.width;
        const drawY = (marker.y / 100) * canvas.height;

        ctx.beginPath();
        ctx.arc(drawX, drawY, 6, 0, Math.PI * 2);
        ctx.fillStyle = '#e53935'; // Red dot
        ctx.fill();
        ctx.strokeStyle = '#fff'; // White border
        ctx.lineWidth = 2;
        ctx.stroke();
    });
}

document.getElementById('clear-canvas-btn')?.addEventListener('click', () => {
    injuryArray = [];
    drawMarkers();
});

// 2. Auto-Calculate GCS
document.querySelectorAll('.gcs-calc').forEach(select => {
    select.addEventListener('change', () => {
        const e = parseInt(document.getElementById('gcs-eyes').value) || 0;
        const v = parseInt(document.getElementById('gcs-verbal').value) || 0;
        const m = parseInt(document.getElementById('gcs-motor').value) || 0;
        document.getElementById('gcs-total').textContent = e + v + m;
    });
});

// 3. Submit to Firebase
document.getElementById('pcr-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const pcrData = {
        date: document.getElementById('pcr-date').value,
        location: document.getElementById('pcr-location').value.trim(),
        priority: document.getElementById('pcr-priority').value.trim(),
        patient: document.getElementById('pcr-patient').value.trim(),
        dob: document.getElementById('pcr-dob').value.trim(),
        allergies: document.getElementById('pcr-allergies').value.trim(),
        gcsTotal: document.getElementById('gcs-total').textContent,
        injuries: injuryArray, // Saves the percentage math to the DB!
        narrative: document.getElementById('pcr-narrative').value.trim(),
        primaryMedic: sessionStorage.getItem('activeEmployeeName'),
        callsign: sessionStorage.getItem('activeEmployeeCallsign'),
        timestamp: new Date().toISOString()
    };

    try {
        await addDoc(collection(db, "pcr_reports"), pcrData);
        alert("✅ Patient Care Report successfully submitted to High Command.");
        document.getElementById('pcr-form').reset();
        injuryArray = [];
        drawMarkers();
        document.getElementById('gcs-total').textContent = "15";
    } catch (error) {
        console.error("PCR Submit Error:", error);
        alert("Failed to submit PCR. Make sure Firebase Rules allow writes to 'pcr_reports'.");
    }
});

// ====================
// FTO PROMOTIONAL EXAM

const ftoContainer = document.getElementById('fto-app-container');

document.getElementById('start-fto-btn')?.addEventListener('click', () => {
    hubMenu.style.display = 'none';
    ftoContainer.style.display = 'block';
    window.scrollTo({ top: 0, behavior: 'smooth' });
});

document.getElementById('cancel-fto-btn')?.addEventListener('click', () => {
    document.getElementById('fto-app-form').reset();
    ftoContainer.style.display = 'none';
    hubMenu.style.display = 'block';
});

document.getElementById('fto-app-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const submitBtn = document.getElementById('submit-fto-btn');
    submitBtn.disabled = true;
    submitBtn.textContent = "Submitting...";

    // 1. Gather form data
    const formData = new FormData(e.target);
    const appData = Object.fromEntries(formData.entries());
    
    // 2. Inject invisible Session Data
    appData.medicName = sessionStorage.getItem('activeEmployeeName') || "Unknown";
    appData.callsign = sessionStorage.getItem('activeEmployeeCallsign') || "Unknown";
    appData.discordName = sessionStorage.getItem('activeEmployeeDiscord') || "Unknown";
    appData.discordId = sessionStorage.getItem('activeEmployeeDiscordId') || "Unknown";
    appData.strikes = sessionStorage.getItem('activeEmployeeStrikes') || 0;
    appData.status = 'Pending';
    appData.timestamp = new Date().toISOString();

    try {
        await addDoc(collection(db, "fto_applications"), appData);
        
        // 3. Webhook to Command Channel
        const ftoWebhookUrl = "https://discord.com/api/webhooks/1499957508251586681/1lkUCnv2wmmAvOmX5V7s3Y_hTfxJuV6sAlaMjzgSSze-8HOraT0FOwchbWLJJKRu80MQ"; // <-- INSERT WEBHOOK
        const discordMsg = {
            content: "<@&1369735669760655512> <@&1429239658474246225> A new FTO Application has been submitted!",
            embeds: [{
                title: `⭐ New FTO Application: ${appData.medicName}`,
                description: `**Callsign:** ${appData.callsign}\n**Strikes:** ${appData.strikes}\n\nReview this application on the Command Dashboard Promotions tab.`,
                color: 16485376
            }]
        };

        await fetch(ftoWebhookUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(discordMsg) });

        alert("✅ Your FTO Application has been securely transmitted to the Training Director.");
        e.target.reset();
        ftoContainer.style.display = 'none';
        hubMenu.style.display = 'block';

    } catch (error) {
        console.error("FTO Submit Error:", error);
        alert("Failed to submit. Check Firebase rules for 'fto_applications'.");
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = "Submit Application";
    }
});