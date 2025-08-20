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


exports.aiCODGenerator = async (req) => {
    try {
        // const prompt = `Generate 5 multiple choice questions with 4 options each and the correct answer for the following text: "The quick brown fox jumps over the lazy dog."`;
        
        console.log(req);
        let { difficulty_level, topic, code_snippet, prompt } = req;
// console.log(code_snippet);

//         if(prompt) {
//             // if(code_snippet == 0 ) {
//                 prompt += `. You are an AI that generates scenario-based programming questions in a structured JSON format. 
// When given an instruction, always output in the following structure:

// {
//   "question_data": "<p><strong>Title: ...</strong></p> ...",
//   "inputformat": "<p>...</p>",
//   "outputformat": "<p>...</p>",
//   "manual_difficulty": "Hard | Medium | Easy"
// }

// The description should:
// - Be scenario-based (real-world context).
// - Include a Title.
// - Include a Problem Description.
// - Include a clear Question section.
// - Specify Classes/Methods if needed.
// - Follow HTML formatting for rich text.

// Now generate based on the instruction:

// Instruction: Generate a scenario-based programming description
// `;
//             // }
//             // else {
//             //     prompt = `Your task is to create ${question_count} ${difficulty_level}-level code snippet based MCQs on the topic - ${topic} with ${options_count} options for each question & a single correct answer.`;
//             // }
//         }

if (prompt) {
  prompt += `. You are an AI that generates scenario-based programming questions in a structured JSON format. 
When given an instruction, always output in the following structure as a JSON array:

[
  {
    "question_data": "<p><strong>Title: Employee Management</strong></p>
<p>You are tasked with developing a Java program to manage employee records. The program should allow users to input the first name, last name, employee ID, and job title of an employee. Once the user inputs these details, the program should display the employee's information, including their full name, employee ID, and job title.</p>

<p><strong>Requirements:</strong></p>

<ul>
  <li>Create a class <code>Person</code> with the following attributes:
    <ul>
      <li><code>firstName</code> - String</li>
      <li><code>lastName</code> - String</li>
    </ul>
    This class serves as a base class for other classes and will be extended by the <code>Employee</code> class.
  </li>
  <li>Create a class <code>Employee</code> that extends the <code>Person</code> class:
    <ul>
      <li>Inherits attributes <code>firstName</code> and <code>lastName</code> from Person.</li>
      <li>Has additional attributes:
        <ul>
          <li><code>employeeId</code> - int</li>
          <li><code>jobTitle</code> - String</li>
        </ul>
      </li>
      <li>Implement getters, setters, and constructors for all the above-mentioned attributes.</li>
    </ul>
  </li>
  <li>Create a class named <code>Main</code> which contains the main method where program execution begins:
    <ul>
      <li>It prompts the user to input the details of an employee.</li>
      <li>It creates an <code>Employee</code> object with the provided details.</li>
      <li>It displays the employee's information using the getters implemented in the <code>Employee</code> class.</li>
    </ul>
  </li>
</ul>",
    "inputformat": "<p>The first line consists of a String that represents firstName.<br>The second line consists of a String that represents lastName.<br>The third line consists of an int that represents the employeeId.<br>The fourth line consists of a String that represents the jobTitle.</p>",
    "outputformat": "<p>The output should display the employee details in the following format:<br>Employee details:<br><br>Name: &lt;firstName&gt; &lt;lastName&gt;, &lt;jobTitle&gt;<br><br>Employee ID: &lt;employeeId&gt;</p>",
    "manual_difficulty": "Easy"
  }
]

The description should:
- Be scenario-based (real-world context).
- Include a Title.
- Include a Problem Description.
- Include a clear Question section.
- Specify Classes/Methods if needed.
- Follow HTML formatting for rich text.

Now generate a NEW question based on the user instruction, strictly following the same JSON structure.
`;
}



        prompt += ` Please respond with the COD in the following strict JSON format as an array:
[
  {
    "question_data": "Sample question here",
    "inputformat": "",
    "outputformat": "",
    "manual_difficulty": "Hard | Medium | Easy",
  }
]

Do not include any explanations, extra text, or markdown formatting — return only valid JSON.
`;


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
                        { role: "system", content: "You are COD Problem generator"},
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

        // for await (const chunk of response) {
        //     process.stdout.write(chunk.choices[0]?.delta?.content || '');
        //   }
        // console.log(response.choices[0].message);
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
        
        return response.choices[0].message;
    } catch (error) {
        console.error("Error in aiCODGenerator:", error);
    }
}