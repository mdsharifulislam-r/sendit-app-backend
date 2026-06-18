import { openai } from "./openai";

function stripMarkdown(text: string) {
  return text
    .replace(/^```[a-zA-Z]*\n?/, "")
    .replace(/```$/, "")
    .replace(/```/g, "")
    .trim();
}

export async function generateDocs(code: string) {
  const prompt = `
You are a NestJS Swagger generator.

Rules:
- Return ONLY raw TypeScript
- DO NOT wrap in markdown
- DO NOT add \`\`\`
- DO NOT change logic
- DO NOT change formatting
- ONLY add swagger decorators
- Skip decorators if already exists

DTO:
- ApiProperty
- ApiPropertyOptional

Controller:
- ApiTags
- ApiOperation
- ApiResponse
- ApiBearerAuth
- ApiQuery

Return full file.

Code:
${code}
`;

  try {
    const res = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0,
      messages: [
        {
          role: "system",
          content:
            "You generate Swagger decorators for NestJS. Return raw TypeScript only.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    let content = res.choices?.[0]?.message?.content;

    if (!content) return null;

    content = stripMarkdown(content);

    return content;
  } catch (error) {
    console.error("OpenAI error:", error);
    return null;
  }
}