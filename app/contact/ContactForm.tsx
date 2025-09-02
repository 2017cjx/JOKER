"use client";

import { useState } from "react";

export default function ContactForm() {
  const [loading, setLoading] = useState(false);
  const [ok, setOk] = useState<boolean | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setOk(null);
    setErr(null);

    const form = e.currentTarget;
    const formData = new FormData(form);
    const hp = (formData.get("company") as string) ?? "";

    const body = {
      firstname: formData.get("firstname"),
      lastname: formData.get("lastname"),
      email: formData.get("email"),
      subject: formData.get("subject"),
      message: formData.get("message"),
      consent: formData.get("consent") === "on",
      hp,
    };

    const res = await fetch("/api/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const json = await res.json();
    setLoading(false);
    if (res.ok && json.ok) {
      setOk(true);
      form.reset();
    } else {
      setOk(false);
      setErr(json?.error ?? "unknown_error");
    }
  }

  return (
    <form onSubmit={onSubmit} className="contact-form">
      <div className="form-grid">
        <div className="field">
          <input
            id="firstname"
            name="firstname"
            required
            className="input"
            placeholder=" "
          />
          <label htmlFor="firstname" className="label">
            First Name
          </label>
        </div>
        <div className="field">
          <input
            id="lastname"
            name="lastname"
            required
            className="input"
            placeholder=" "
          />
          <label htmlFor="lastname" className="label">
            Last Name
          </label>
        </div>
      </div>

      <div className="field">
        <input
          id="email"
          name="email"
          type="email"
          required
          className="input"
          placeholder=" "
        />
        <label htmlFor="email" className="label">
          Email
        </label>
      </div>

      <div className="field">
        <input
          id="subject"
          name="subject"
          required
          className="input"
          placeholder=" "
        />
        <label htmlFor="subject" className="label">
          Subject
        </label>
      </div>

      <div className="field">
        <textarea
          id="message"
          name="message"
          required
          rows={6}
          className="textarea"
          placeholder=" "
        />
        <label htmlFor="message" className="label">
          Message
        </label>
      </div>

      {/* ハニーポット（非表示） */}
      <div aria-hidden className="honeypot">
        <label>Company</label>
        <input name="company" autoComplete="off" />
      </div>

      <label className="consent">
        <input type="checkbox" name="consent" /> I agree to the processing of my
        data.
      </label>

      <button type="submit" disabled={loading} className="submit">
        {loading ? (
          <>
            <span className="spinner" aria-hidden /> Sending...
          </>
        ) : (
          "Send"
        )}
      </button>

      {ok === true && (
        <p className="notice success">Thanks! We received your message.</p>
      )}
      {ok === false && <p className="notice error">Failed to send: {err}</p>}
    </form>
  );
}
