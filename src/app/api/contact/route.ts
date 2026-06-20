import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, email, message } = body;

    // 1. Validate Input
    if (!name || !email || !message) {
      return NextResponse.json(
        { success: false, message: "Please fill in all fields (name, email, and message)." },
        { status: 400 }
      );
    }

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      console.error("Resend configuration error: RESEND_API_KEY is not defined.");
      return NextResponse.json(
        { success: false, message: "Server mail integration configuration error." },
        { status: 500 }
      );
    }

    // 2. Transmit Email via Resend REST API
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "CognitoX Contact Form <onboarding@resend.dev>",
        to: "felixaugum@gmail.com",
        subject: `CognitoX: New Message from ${name}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
            <h2 style="color: #6366f1; border-bottom: 2px solid #eeeff2; padding-bottom: 10px;">New Message Recieved</h2>
            <p><strong>Name:</strong> ${name}</p>
            <p><strong>Email Address:</strong> <a href="mailto:${email}">${email}</a></p>
            <hr style="border: none; border-top: 1px solid #eeeff2; margin: 20px 0;" />
            <p><strong>Message:</strong></p>
            <p style="background-color: #f9fafb; padding: 15px; border-radius: 6px; border-left: 4px solid #6366f1; white-space: pre-wrap;">${message}</p>
            <hr style="border: none; border-top: 1px solid #eeeff2; margin: 20px 0;" />
            <p style="font-size: 11px; color: #888; text-align: center;">Sent from CognitoX Workspace Sandbox Platform</p>
          </div>
        `,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Resend API error response:", data);
      return NextResponse.json(
        { success: false, message: data.message || "Failed to deliver email through Resend." },
        { status: response.status }
      );
    }

    return NextResponse.json(
      { success: true, message: "Your message has been delivered successfully!", messageId: data.id },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Exception caught in contact API route:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Internal server error occurred." },
      { status: 500 }
    );
  }
}
