import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, getDocs } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// YOUR FIREBASE CONFIG
const firebaseConfig = {
  apiKey: "AIzaSyB8CUjfRdVlSOACFuuhOtyIXO2IAhJD7VE",
  authDomain: "seasons-rp-ems.firebaseapp.com",
  projectId: "seasons-rp-ems",
  storageBucket: "seasons-rp-ems.firebasestorage.app",
  messagingSenderId: "76899273418",
  appId: "1:76899273418:web:19dc6d8bd90309f7f98233"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

let allMedics = [];

// Fetch, Sort, and Render the Roster
async function loadPublicRoster() {
    const grid = document.getElementById('roster-grid');
    
    try {
        const querySnapshot = await getDocs(collection(db, "roster"));
        allMedics = [];
        querySnapshot.forEach((doc) => allMedics.push(doc.data()));

        // 🌟 THE SORTING ENGINE (Numeric Callsign Order) 🌟
        allMedics.sort((a, b) => {
            // Strip out letters, just compare the numbers. "N/A" gets sent to the bottom (9999).
            const numA = a.callsign ? parseInt(a.callsign.replace(/\D/g, '')) || 9999 : 9999;
            const numB = b.callsign ? parseInt(b.callsign.replace(/\D/g, '')) || 9999 : 9999;
            
            return numA - numB;
        });

        renderCards('all');

    } catch (error) {
        console.error("Error loading roster:", error);
        grid.innerHTML = '<p style="color: #e53935; text-align: center; width: 100%;">Error loading roster database.</p>';
    }
}

// Render the UI Cards
function renderCards(filter) {
    const grid = document.getElementById('roster-grid');
    grid.innerHTML = '';

    const filteredMedics = filter === 'all' 
        ? allMedics 
        : allMedics.filter(m => m.position.includes(filter) || (filter === 'High Command' && m.isHighCommand));

    if (filteredMedics.length === 0) {
        grid.innerHTML = '<p style="color: #888; text-align: center; width: 100%;">No personnel found in this category.</p>';
        return;
    }

    filteredMedics.forEach(medic => {
        // Only show Active or LOA personnel (Hide 'Inactive' or fired players)
        if (medic.status === 'Inactive') return;

        const hcGlow = medic.isHighCommand ? 'box-shadow: 0 0 15px rgba(229, 57, 53, 0.3); border-color: #e53935;' : '';
        const loaBadge = medic.status === 'LOA' ? `<span class="badge" style="background: #fb8c00; color: #fff; padding: 2px 6px; border-radius: 4px;">On Leave (LOA)</span>` : '';
        
        // Generate Division Badges (e.g., FTO, Aviation)
        let divisionHTML = '';
        if (medic.divisions && medic.divisions.length > 0 && medic.divisions[0] !== "") {
            divisionHTML = medic.divisions.map(div => `<span class="badge" style="background: #333; color: #bbb; padding: 2px 6px; border-radius: 4px;">${div}</span>`).join(' ');
        }

        const card = document.createElement('div');
        card.className = 'medic-card';
        card.style = hcGlow;
        card.innerHTML = `
            <div class="medic-header">
                <h3>${medic.callsign}</h3>
                ${loaBadge}
            </div>
            <h2>${medic.name}</h2>
            <p class="medic-rank">${medic.position}</p>
            <div class="medic-divisions">
                ${divisionHTML}
            </div>
        `;
        grid.appendChild(card);
    });
}

// Attach Filter Button Logic
document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        renderCards(e.target.getAttribute('data-filter'));
    });
});

// Run on load
loadPublicRoster();