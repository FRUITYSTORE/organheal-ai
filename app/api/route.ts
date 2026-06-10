import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { message } = await req.json();

    if (!message) {
      return NextResponse.json(
        {
          error: "Message is required",
        },
        { status: 400 }
      );
    }

    const lowerMessage = message.toLowerCase();

    let response =
      "OrganHeal AI currently provides educational health guidance. OpenAI integration will be connected soon.";

    if (
      lowerMessage.includes("heart") ||
      lowerMessage.includes("cholesterol")
    ) {
      response =
        "Heart health is influenced by cholesterol, blood pressure, exercise, nutrition, sleep, and overall cardiovascular risk factors.";
    }

    if (
      lowerMessage.includes("kidney") ||
      lowerMessage.includes("creatinine")
    ) {
      response =
        "Kidney health is commonly assessed using creatinine, eGFR, blood pressure, hydration status, and urine testing.";
    }

    if (
      lowerMessage.includes("liver") ||
      lowerMessage.includes("alt") ||
      lowerMessage.includes("ast")
    ) {
      response =
        "Liver health is commonly evaluated using ALT, AST, bilirubin, and clinical assessment.";
    }

    if (
      lowerMessage.includes("sleep") ||
      lowerMessage.includes("brain")
    ) {
      response =
        "Sleep quality plays an important role in memory, focus, mood, and overall brain health.";
    }

    return NextResponse.json({
      success: true,
      response,
    });
  } catch {
    return NextResponse.json(
      {
        error: "Server error",
      },
      { status: 500 }
    );
  }
}