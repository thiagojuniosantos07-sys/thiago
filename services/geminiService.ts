
import { GoogleGenAI } from "@google/genai";
import { GenerationStyle, GenerationTheme, ImageFormat } from "../types";

const MODEL_NAME = 'gemini-2.5-flash-image';

const formatToAspectRatio: Record<string, "1:1" | "3:4" | "4:3" | "9:16" | "16:9"> = {
  [ImageFormat.SQUARE]: "1:1",
  [ImageFormat.VERTICAL]: "3:4", 
  [ImageFormat.STORY]: "9:16",
  [ImageFormat.BANNER]: "16:9",
  [ImageFormat.BOOK]: "1:1", 
  [ImageFormat.PHONE]: "1:1"  
};

/**
 * Extrai o MIME type de uma string base64 do navegador
 */
const getMimeTypeFromBase64 = (base64: string): string => {
  const match = base64.match(/^data:([^;]+);base64,/);
  return match ? match[1] : 'image/png';
};

export const generateProductCover = async (
  style: GenerationStyle, 
  theme: GenerationTheme,
  format: ImageFormat,
  title: string, 
  subtitle: string,
  customDescription: string,
  base64Image?: string,
  transparent?: boolean
): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const themeDescriptions = {
    [GenerationTheme.NATURE]: "Background: lush forests, crisp mountain air, clear blue skies.",
    [GenerationTheme.SCIENCE]: "Focus: medical accuracy, glowing lung structures, high-tech health tech.",
    [GenerationTheme.ZEN]: "Atmosphere: Serene, calm, soft meditative lighting.",
    [GenerationTheme.ENERGY]: "Vibe: High-energy, vibrant colors, powerful movement.",
    [GenerationTheme.FREEDOM]: "Metaphor: Clouds and open horizons, liberation."
  };

  const stylePrompts = {
    [GenerationStyle.PHOTOGRAPHIC]: "Cinematic professional photography.",
    [GenerationStyle.MINIMALIST]: "Sleek modern minimalist graphic design.",
    [GenerationStyle.THREE_D]: "Stunning 3D medical digital art.",
    [GenerationStyle.ILLUSTRATION]: "Flat vector illustration for health apps."
  };

  const aspectRatio = formatToAspectRatio[format] || "1:1";

  let formatInstruction = "";
  if (format === ImageFormat.BOOK) {
    formatInstruction = "Product: 3D Realistic physical book mockup.";
  } else if (format === ImageFormat.PHONE) {
    formatInstruction = "Context: Design displayed on a modern smartphone screen.";
  }

  const backgroundInstruction = transparent 
    ? "Background: PURE SOLID FLAT WHITE (#FFFFFF). Isolated object only. No environment."
    : (format === ImageFormat.BOOK || format === ImageFormat.PHONE 
        ? "Surface: Premium minimalist table with soft aesthetic lighting." 
        : themeDescriptions[theme]);

  const brandingInstruction = title.trim() 
    ? `Branding: Main Title "${title}", Subtitle "${subtitle}". Elegant typography.`
    : `Focus: Visuals only. High-quality rendering without text placeholders.`;

  const editingContext = base64Image 
    ? `Action: Use the provided reference image as the base. Edit and professionalize it. 
       User Request: ${customDescription || "Enhance visual quality and follow the theme."}`
    : `Details: ${customDescription || "Follow theme guidelines."}`;

  const basePrompt = `TASK: Create a professional digital asset for ${format}.
  STYLE: ${stylePrompts[style]}.
  THEME: ${themeDescriptions[theme]}.
  ${formatInstruction}
  ${backgroundInstruction}
  ${brandingInstruction}
  ${editingContext}
  QUALITY: Hyper-realistic or premium grade. Professional layout.`;

  const parts: any[] = [{ text: basePrompt }];
  
  if (base64Image) {
    const mimeType = getMimeTypeFromBase64(base64Image);
    const data = base64Image.split(',')[1];
    parts.push({
      inlineData: {
        data: data,
        mimeType: mimeType
      }
    });
  }

  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: { parts },
      config: {
        imageConfig: {
          aspectRatio: aspectRatio
        }
      }
    });

    if (!response.candidates?.[0]?.content?.parts) {
      throw new Error("O servidor de IA retornou uma resposta vazia.");
    }

    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }

    throw new Error("Nenhuma imagem foi gerada. Tente mudar o estilo ou o prompt.");
  } catch (error: any) {
    console.error("Image generation failed in service:", error);
    // Repassa o erro de forma mais limpa
    throw new Error(error.message || "Falha técnica na geração da imagem.");
  }
};
