import { NextRequest, NextResponse } from "next/server";

const PORTAL_ID = process.env.HUBSPOT_PORTAL_ID!;
const FORM_GUID = process.env.HUBSPOT_FORM_GUID!;
const HS_ENDPOINT = `https://api.hsforms.com/submissions/v3/integration/submit/${PORTAL_ID}/${FORM_GUID}`;

export async function POST(req: NextRequest) {
  try {
    const {
      firstname,
      lastname,
      email,
      subject,
      message,
      consent,
      recaptchaToken,
      hp,
    } = await req.json();

    // 簡易スパム対策（ハニーポット）
    if (typeof hp === "string" && hp.trim() !== "") {
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    // reCAPTCHA（任意）
    if (process.env.RECAPTCHA_SECRET_KEY && recaptchaToken) {
      const res = await fetch(
        "https://www.google.com/recaptcha/api/siteverify",
        {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            secret: process.env.RECAPTCHA_SECRET_KEY!,
            response: recaptchaToken,
          }),
        }
      );
      const data = await res.json();
      if (!data.success)
        return NextResponse.json(
          { ok: false, error: "captcha_failed" },
          { status: 400 }
        );
    }

    // HubSpot フォーム送信ペイロード
    const fields = [
      { name: "email", value: email },
      { name: "firstname", value: firstname },
      { name: "lastname", value: lastname },
    ];
    // ↓ subject/message は HubSpot 側にその "内部名" のプロパティが存在する場合のみ追加
    if (subject) fields.push({ name: "subject", value: subject as string });
    if (message) fields.push({ name: "message", value: message as string });

    const payload = {
      fields,
      context: {
        pageUri: req.headers.get("referer") ?? "",
        pageName: "Contact",
      },
      legalConsentOptions: {
        consent: {
          consentToProcess: !!consent,
          text: "I agree to allow this website to store and process my personal data.",
          communications: [
            {
              value: !!consent,
              subscriptionTypeId: 999,
              text: "I agree to receive marketing communications.",
            },
          ],
        },
      },
    };

    const hs = await fetch(HS_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!hs.ok) {
      const err = await hs.text();
      return NextResponse.json(
        { ok: false, error: "hubspot_error", detail: err },
        { status: 502 }
      );
    }
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: "server_error", detail: e?.message },
      { status: 500 }
    );
  }
}
