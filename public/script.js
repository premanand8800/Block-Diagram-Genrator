document.addEventListener('DOMContentLoaded', () => {
    const queryInput = document.getElementById('query');
    const generateBtn = document.getElementById('generateBtn');
    const refineBtn = document.getElementById('refineBtn');
    const refineDropdown = document.getElementById('refineDropdown');
    const saveBtn = document.getElementById('saveBtn');
    const linkedinBtn = document.getElementById('linkedinBtn');
    const instagramBtn = document.getElementById('instagramBtn');
    const facebookBtn = document.getElementById('facebookBtn');
    const resultDiv = document.getElementById('result');
    const settingsBtn = document.getElementById('settingsBtn');

    let currentDiagram = null;

    generateBtn.addEventListener('click', async () => {
        const query = queryInput.value.trim();
        if (!query) {
            alert('Please enter a diagram description.');
            return;
        }
        generateBtn.textContent = 'Generating... Please have patience';
        generateBtn.disabled = true;
        resultDiv.textContent = 'Generating diagram...';
        try {
            const response = await fetch('/generate-diagram', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ query }),
            });
            const data = await response.json();
            if (response.ok) {
                currentDiagram = data.diagram;
                resultDiv.innerHTML = currentDiagram;
            } else {
                throw new Error(data.error || 'Failed to generate diagram');
            }
        } catch (error) {
            resultDiv.textContent = `Error: ${error.message}`;
        } finally {
            generateBtn.textContent = 'Generate Diagram';
            generateBtn.disabled = false;
        }
    });

    refineBtn.addEventListener('click', () => {
        refineDropdown.classList.toggle('show');
    });

    // Close the dropdown if the user clicks outside of it
    window.addEventListener('click', (event) => {
        if (!event.target.matches('#refineBtn')) {
            refineDropdown.classList.remove('show');
        }
    });

    refineDropdown.addEventListener('click', async (event) => {
        if (event.target.tagName === 'BUTTON') {
            const diagramType = event.target.getAttribute('data-type');
            const currentQuery = queryInput.value.trim();
            
            if (!currentQuery) {
                alert('Please enter a diagram description first.');
                return;
            }

            let newQuery = `Create a ${diagramType} diagram for: ${currentQuery}`;
            queryInput.value = newQuery;

            refineDropdown.classList.remove('show');
            
            // Automatically generate the new diagram
            generateBtn.click();
        }
    });

    saveBtn.addEventListener('click', () => {
        if (!currentDiagram) {
            alert('No diagram to save. Please generate a diagram first.');
            return;
        }
        const blob = new Blob([currentDiagram], {type: 'image/svg+xml'});
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'diagram.svg';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    });

    linkedinBtn.addEventListener('click', () => {
        alert('LinkedIn sharing not implemented yet.');
    });

    instagramBtn.addEventListener('click', () => {
        alert('Instagram sharing not implemented yet.');
    });

    facebookBtn.addEventListener('click', () => {
        alert('Facebook sharing not implemented yet.');
    });

    settingsBtn.addEventListener('click', () => {
        alert('Settings functionality not implemented yet.');
    });
});