import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, addDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

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


document.getElementById('ems-app-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const submitBtn = e.target.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.innerText = "Submitting...";

    try {
        // Automatically grabs every question and radio button instantly
        const formData = new FormData(e.target);
        const appData = Object.fromEntries(formData.entries());
        
        // Add invisible tracking variables
        appData.status = 'New';
        appData.submissionTime = Date.now();

        console.log("📡 Saving to Firebase...", appData);

        // 1. Upload to Firebase
        await addDoc(collection(db, "applications"), appData);

        // 2. Build the Discord Embed
const discordMessage = {
    "content": "<@&1429239658474246225> <@&1369735669760655512> A new application needs review!",
    "embeds": [{
        "title": `🚑 New Application: ${appData.characterName}`,
        "description": "A new application has been submitted and is waiting for review on the Command Dashboard.\n\n🔗 **[Click here to open the Command Dashboard](https://seasons-rp-ems.web.app/command.html)**",
        "color": 15158332,
        "fields": [
            { "name": "Discord Name", "value": appData.discordName || "N/A", "inline": true },
            { "name": "IRL Age", "value": appData.irlAge || "N/A", "inline": true },
            { "name": "Timezone", "value": appData.timezone || "N/A", "inline": true }
        ]
    }]
};

// 3. Webhook Trigger
const discordWebhookUrl = "https://discord.com/api/webhooks/1496645570247524372/PMgNuTwnZkFrVJFk7uTaUGrigS3C4QgYqtK7aEQOX73zoQBAPlZz8dH2fwOKHpNwdbKo";

await fetch(discordWebhookUrl, {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json'
    },
    body: JSON.stringify(discordMessage)
});

        // 4. Hide form, show success message
        document.getElementById('ems-app-form').style.display = 'none';
        
        const successMsg = document.getElementById('success-message');
        if (successMsg) {
            successMsg.style.display = 'block';
        } else {
            alert("✅ Success! Your application has been submitted to Command.");
        }

    } catch (error) {
        console.error("🔥 CRITICAL ERROR:", error);
        alert("Failed to submit. Check the F12 Console for details.");
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerText = "Submit Application";
    }
});