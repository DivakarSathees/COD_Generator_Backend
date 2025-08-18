require('dotenv').config();
const encoder = require('gpt-3-encoder');
const { jsonrepair } = require("jsonrepair");


// Check number of tokens in the input prompt
function getTokenCount(input) {
    const encoded = encoder.encode(input); // Encode the text into tokens
    console.log(encoded.length);
    
    return encoded.length; // Return the token count
}

const Groq = require("groq-sdk");

const grop = new Groq({
    apiKey: process.env.GROQ_API_KEY,
});

function extractJSONArray(text) {
    const startIndex = text.indexOf('[');
    if (startIndex === -1) {
        throw new Error("No array found in text");
    }

    let bracketCount = 0;
    let endIndex = -1;

    for (let i = startIndex; i < text.length; i++) {
        if (text[i] === '[') bracketCount++;
        else if (text[i] === ']') bracketCount--;

        if (bracketCount === 0) {
            endIndex = i;
            break;
        }
    }

    if (endIndex === -1) {
        throw new Error("JSON array is not closed properly.");
    }

    const jsonArrayText = text.slice(startIndex, endIndex + 1);
    return jsonArrayText;
}


exports.aiSolutionGenerator = async (req) => {
    try{
        let { question_data, inputformat, outputformat, manual_difficulty } = req;
        console.log(question_data);
        
        let prompt = `You are an assistant that must return ONLY valid JSON (no Markdown, no code fences, no commentary).
Infer the most appropriate programming language from the question; if unclear, default to Java.

Requirements:
- Provide a COMPLETE, RUNNABLE solution with ALL required imports.
- The program must read dynamic user input from STDIN and print to STDOUT exactly as specified.
- Do NOT include any placeholder text like "...", "your code here", etc.
- Escape all newlines in JSON strings as \\n.
- Produce 10 to 15 distinct sample input/output pairs that match the program’s exact I/O format.
- Ensure the JSON is syntactically valid.

Return JSON in this exact shape:

[
    {
        "solution_data": "",
        "samples": [
            { "input": "<sample stdin #1>", "output": "<expected stdout #1>" },
            { "input": "<sample stdin #2>", "output": "<expected stdout #2>" }
            // Include between 10 and 15 total pairs
        ],
        "io_spec": {
            "input_format": "<clear, concise instructions of expected STDIN format>",
            "output_format": "<clear, concise description of expected STDOUT format>"
        },
    }
]
Give solution for the following context:

question_data: ${question_data}
inputformat: ${inputformat}
outputformat: ${outputformat}

Do not include any explanations, extra text, or markdown formatting — return only valid JSON.
`
        console.log(prompt);

        const tokenCount = getTokenCount(prompt);
        
        if (tokenCount > 4096) {
            throw new Error("Input prompt exceeds maximum token limit.");
        }

        const response = await grop.chat.completions.create({
            // model: 'llama3-8b-8192', 
            model: 'llama-3.3-70b-versatile', 
            // model: 'gemma2-9b-it',  // or 'gpt-4' if using GPT-4
            // prompt: prompt,
            messages: [
                        { role: "system", content: "You are Compiler based Problem Solution generator"},
                        {
                            role: "user",
                            content: prompt,
                        },
                    ],
                // "model": "gemma2-9b-it",
                // "temperature": 1,
                // "max_completion_tokens": 8192,
                // "top_p": 1,
                // "stream": true,
                // "stop": null
        });
        const resultText = response.choices[0].message.content;
        console.log(resultText);

        try {
            const jsonArrayText = extractJSONArray(resultText);
            let parsedJson;

            try {
                parsedJson = JSON.parse(jsonArrayText);
            } catch (parseError) {
                console.warn("Initial JSON parse failed, trying to repair...");

                // Repair the JSON if it is malformed
                const repairedJson = jsonrepair(jsonArrayText);
                parsedJson = JSON.parse(repairedJson);
            }

            // parsedJson.forEach(q => {
            //     if (q.code_snippet) {
            //         q.question_data = `${q.question_data}$$$examly${q.code_snippet}`;
            //         delete q.code_snippet; // Optional: remove original field
            //     }
            // });

            return parsedJson;
        } catch (e) {
            console.error("Failed to parse JSON:", e);
            throw new Error("The AI response is not valid JSON.");
        }


    } catch (error) {
        console.error("Error in aiSolutionGenerator:", error);
        throw error;
    }
    
}

