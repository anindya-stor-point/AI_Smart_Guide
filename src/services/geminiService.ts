import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export interface AnalysisResult {
  appName: string;
  userStatus: "New" | "Returning";
  instructions: string;
  voiceScript: string;
  arrowPosition: { x: number; y: number } | null;
}

export async function analyzeScreen(base64Image: string): Promise<AnalysisResult> {
  const response = await ai.models.generateContent({
    model: "gemini-3.1-flash-lite-preview",
    contents: [
      {
        parts: [
          {
            text: `You are a Bengali App Guide. Analyze the provided app screen image.
            1. Identify the App Name (e.g., YouTube, Facebook, Canva).
            2. Determine if the user is New or Returning based on the screen content (e.g., login screens, onboarding, or main feeds).
            3. Provide clear Bengali instructions for the next action. Be very specific about what to click.
            4. Provide a short Bengali voice script for audio guidance. Start with "এখানে ক্লিক করুন..." or similar.
            5. CRITICAL: Identify the exact center coordinates (X and Y as 0-100 percentage) of the button or element the user should click next.
            
            Return the result in JSON format.`
          },
          {
            inlineData: {
              mimeType: "image/jpeg",
              data: base64Image
            }
          }
        ]
      }
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          appName: { type: Type.STRING },
          userStatus: { type: Type.STRING, enum: ["New", "Returning"] },
          instructions: { type: Type.STRING },
          voiceScript: { type: Type.STRING },
          arrowPosition: {
            type: Type.OBJECT,
            properties: {
              x: { type: Type.NUMBER },
              y: { type: Type.NUMBER }
            },
            nullable: true
          }
        },
        required: ["appName", "userStatus", "instructions", "voiceScript"]
      }
    }
  });

  return JSON.parse(response.text);
}
