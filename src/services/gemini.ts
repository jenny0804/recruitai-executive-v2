import { GoogleGenAI } from "@google/genai";

const genAI = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || "",
});

export const generateResponse = async (
  prompt: string, 
  history: any[], 
  pdfBase64s?: string[],
  masterProfile?: string
) => {
  try {
    const systemInstruction = masterProfile 
      ? `Todas tus respuestas deben de basarse en los PDFs brindados y compararlos contra este PERFIL MAESTRO (Descripción de Puesto): "${masterProfile}". Si no encuentras la respuesta indica que: No se encuentra esa información en el pdf.`
      : "Todas tus respuestas deben de basarse en los PDFs brindados. Si no encuentras la respuesta indica que: No se encuentra esa información en el pdf";

    const userParts: any[] = [];
    
    if (pdfBase64s && pdfBase64s.length > 0) {
      pdfBase64s.forEach(base64 => {
        userParts.push({
          inlineData: {
            mimeType: "application/pdf",
            data: base64
          }
        });
      });
    }
    
    userParts.push({ text: prompt });

    const response = await (genAI.models as any).generateContent({
      model: "gemini-2.5-flash-lite",
      contents: [
        ...history,
        {
          role: "user",
          parts: userParts
        }
      ],
      config: {
        systemInstruction: systemInstruction,
      },
    });

    return response.text || "Lo siento, no pude generar una respuesta.";
  } catch (error) {
    console.error("Error calling Gemini API:", error);
    throw error;
  }
};