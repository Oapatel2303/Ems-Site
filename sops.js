// Grab the UI elements
const viewer = document.getElementById('markdown-viewer');
const navButtons = document.querySelectorAll('.sop-link');

// Function to fetch and render a Markdown file
async function loadDocument(filename) {
    try {
        viewer.innerHTML = '<p style="color: #888;">Loading...</p>';
        
        // Fetch the file from the sops folder
        const response = await fetch(`sops/${filename}.md?v=${Date.now()}`);
        
        if (!response.ok) {
            throw new Error('Document not found');
        }
        
        const markdownText = await response.text();
        
        // Use the marked.js library to convert the text to HTML
        viewer.innerHTML = marked.parse(markdownText);
        
    } catch (error) {
        console.error(error);
        viewer.innerHTML = `
            <h2 style="color: #e53935;">Error 404</h2>
            <p>This SOP document could not be loaded. It may be under construction or the file is missing.</p>
        `;
    }
}

// Attach click events to the sidebar buttons
navButtons.forEach(button => {
    button.addEventListener('click', () => {
        // Remove the active class from all buttons
        navButtons.forEach(btn => btn.classList.remove('active'));
        
        // Add the active class to the clicked button
        button.classList.add('active');
        
        // Load the associated file
        const fileToLoad = button.getAttribute('data-file');
        loadDocument(fileToLoad);
    });
});

// Load the general SOPs automatically when the page first opens
loadDocument('general');