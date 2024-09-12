// Set the Groq API key directly

require('dotenv').config();
const express = require('express');
const Groq = require("groq-sdk");
const { exec } = require('child_process');
const fs = require('fs').promises;
const path = require('path');

const app = express();
const groq = new Groq();

app.use(express.json());
app.use(express.static('public'));

async function generateDiagram(mermaidCode) {
    const inputPath = path.join(__dirname, 'output', `input_${Date.now()}.mmd`);
    const outputPath = path.join(__dirname, 'output', `diagram_${Date.now()}.svg`);
    
    try {
        // Write Mermaid code to a file
        await fs.writeFile(inputPath, mermaidCode);

        // Use mermaid-cli as a child process
        await new Promise((resolve, reject) => {
            exec(`npx @mermaid-js/mermaid-cli -i ${inputPath} -o ${outputPath}`, (error, stdout, stderr) => {
                if (error) {
                    console.error(`exec error: ${error}`);
                    return reject(error);
                }
                resolve();
            });
        });

        const svgContent = await fs.readFile(outputPath, 'utf-8');
        
        // Clean up temporary files
        await fs.unlink(inputPath);
        await fs.unlink(outputPath);

        return { success: true, result: svgContent };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

async function analyzeError(errorMessage, originalQuery, mermaidCode) {
    const prompt = `
The following error occurred while generating a Mermaid diagram: '${errorMessage}'.
The original user query was: "${originalQuery}"
The Mermaid code that caused the error was:
\`\`\`
${mermaidCode}
\`\`\`
Please analyze this error and provide a brief explanation of what might have gone wrong, along with suggestions on how to correct it. Focus on common Mermaid syntax issues and how to better interpret the user's query.`;
    
    const response = await groq.chat.completions.create({
        messages: [
            { role: "system", content: "You are an expert in Mermaid diagram syntax and error analysis." },
            { role: "user", content: prompt }
        ],
        model: "Llama3-70b-8192",
    });
    
    return response.choices[0].message.content;
}

async function regenerateDiagram(originalQuery, errorAnalysis) {
    const prompt = `
Original user query: "${originalQuery}"
Error analysis: ${errorAnalysis}

Based on this information, please provide a corrected version of the Mermaid diagram syntax that addresses the user's query. Return your response in the following format:

Explanation: [Your explanation of the diagram]

Mermaid Code:
\`\`\`mermaid
[Your corrected Mermaid code here]
\`\`\`
`;
    
    const response = await groq.chat.completions.create({
        messages: [
            { role: "system", content: "You are an expert in creating and correcting Mermaid diagram syntax based on natural language queries." },
            { role: "user", content: prompt }
        ],
        model: "Llama3-70b-8192",
    });
    
    return response.choices[0].message.content;
}

app.post('/generate-diagram', async (req, res) => {
    const { query } = req.body;
    const maxAttempts = 3;
    
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        try {
            const response = await groq.chat.completions.create({
                messages: [
                    { role: "system", content: "You are a helpful assistant that can create Mermaid diagrams based on natural language queries. Always include the Mermaid code in your response, wrapped in ```mermaid code blocks." },
                    { role: "user", content: `Create a Mermaid diagram for the following request: "${query}"` }
                ],
                model: "Llama3-70b-8192",
            });
            
            const assistantResponse = response.choices[0].message.content;
            const mermaidCodeMatch = assistantResponse.match(/```mermaid\s*([\s\S]*?)\s*```/);
            
            if (mermaidCodeMatch) {
                const mermaidCode = mermaidCodeMatch[1].trim();
                const { success, result, error } = await generateDiagram(mermaidCode);
                
                if (success) {
                    return res.json({ 
                        diagram: result, 
                        explanation: assistantResponse.replace(mermaidCodeMatch[0], '').trim()
                    });
                } else if (attempt < maxAttempts - 1) {
                    const errorAnalysis = await analyzeError(error, query, mermaidCode);
                    const regenerationResponse = await regenerateDiagram(query, errorAnalysis);
                    
                    const regeneratedMermaidMatch = regenerationResponse.match(/```mermaid\s*([\s\S]*?)\s*```/);
                    if (regeneratedMermaidMatch) {
                        console.log(`Attempt ${attempt + 1} failed. Trying again with corrected diagram.`);
                        continue;
                    }
                }
                
                return res.status(500).json({ error: `Failed to generate diagram: ${error}` });
            } else {
                return res.status(400).json({ error: "No Mermaid diagram found in the response." });
            }
        } catch (error) {
            console.error(`Attempt ${attempt + 1} failed:`, error);
            if (attempt === maxAttempts - 1) {
                return res.status(500).json({ error: "Failed to generate diagram after multiple attempts." });
            }
        }
    }
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});