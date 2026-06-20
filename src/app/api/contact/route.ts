import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, email, message } = body;

    // Validation
    if (!name || typeof name !== "string" || name.trim() === "") {
      return NextResponse.json({ success: false, message: "Name is required." }, { status: 400 });
    }
    if (!email || typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json({ success: false, message: "Valid email is required." }, { status: 400 });
    }
    if (!message || typeof message !== "string" || message.trim() === "") {
      return NextResponse.json({ success: false, message: "Message is required." }, { status: 400 });
    }

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      console.error("Missing RESEND_API_KEY environment variable.");
      return NextResponse.json({ success: false, message: "Mail configuration error." }, { status: 500 });
    }

    // Email 1: Developer Notification
    const devMailRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "CognitoX Workspace <contact@felix-au.me>",
        to: "drivecloudetc@gmail.com",
        reply_to: email,
        subject: `CognitoX: New Message from ${name}`,
        html: `
          <div style="font-family: sans-serif; padding: 20px; color: #111;">
            <h2>New Contact Form Submission</h2>
            <p><strong>Name:</strong> ${name}</p>
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Message:</strong></p>
            <blockquote style="border-left: 4px solid #6366f1; padding-left: 15px; margin-left: 0; font-style: italic;">
              ${message.replace(/\n/g, "<br/>")}
            </blockquote>
            <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
            <p style="font-size: 12px; color: #888;">Sent from CognitoX Workspace sandbox environment.</p>
          </div>
        `,
      }),
    });

    const devMailData = await devMailRes.json();
    if (!devMailRes.ok) {
      console.error("Developer notification mail failed:", devMailData);
      return NextResponse.json({ success: false, message: devMailData.message || "Failed to dispatch email." }, { status: devMailRes.status });
    }

    // Email 2: User Confirmation Copy
    const userMailRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "CognitoX Support <contact@felix-au.me>",
        to: email,
        subject: "We received your message - CognitoX Support",
        html: `
          <div style="font-family: sans-serif; padding: 20px; color: #111; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px;">
            <h2 style="color: #6366f1;">Thank you for contacting us!</h2>
            <p>Hello ${name},</p>
            <p>This is a confirmation copy to let you know that your message has been received. I (Felix Au) will review your request and get back to you as soon as possible.</p>
            <p>Here is a summary of the details you submitted:</p>
            <div style="background-color: #f8fafc; padding: 15px; border-radius: 6px; margin: 15px 0;">
              <p style="margin: 0 0 10px 0;"><strong>Your Message:</strong></p>
              <p style="margin: 0; font-style: italic; color: #475569;">"${message.replace(/\n/g, "<br/>")}"</p>
            </div>
            <p>Best regards,<br/>The CognitoX Team</p>
            <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
            <p style="font-size: 11px; color: #94a3b8; text-align: center;">This is an automated confirmation email. Please do not reply directly to this message.</p>
          </div>
        `,
      }),
    });

    const userMailData = await userMailRes.json();
    if (!userMailRes.ok) {
      console.warn("User confirmation copy email failed to dispatch:", userMailData);
      // We don't fail the whole request since the developer notification already succeeded.
    }

    return NextResponse.json({ success: true, message: "Message dispatched successfully." });
  } catch (error: any) {
    console.error("Contact API Exception:", error);
    return NextResponse.json({ success: false, message: "Internal server error." }, { status: 500 });
  }
}
