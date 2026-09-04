import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Button } from '../components/ui/Button';
import { pushToast } from '../components/ui/Toast';
import { submitContactMessage } from '../lib/firestore/contactMessages';
import { mapFsError } from '../lib/firestore/util';

const RATE_KEY = 'yta_contact_last_sent';
const RATE_MIN_MS = 60_000; // 1 message per minute from this browser

export function ContactPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  // Honeypot — real users leave it empty; bots fill it.
  const [website, setWebsite] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement | null>(null);

  useEffect(() => {
    if (!sending) return;
    const t = setTimeout(() => setSending(false), 30_000);
    return () => clearTimeout(t);
  }, [sending]);

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    // Client-side rate limit
    try {
      const last = Number(localStorage.getItem(RATE_KEY) || 0);
      if (Date.now() - last < RATE_MIN_MS) {
        const wait = Math.ceil((RATE_MIN_MS - (Date.now() - last)) / 1000);
        setError(`يرجى الانتظار ${wait} ثانية قبل إرسال رسالة جديدة.`);
        return;
      }
    } catch { /* ignore */ }

    setSending(true);
    try {
      await submitContactMessage({
        name: name.trim(),
        email: email.trim(),
        subject: subject.trim(),
        message: message.trim(),
        website
      });
      try { localStorage.setItem(RATE_KEY, String(Date.now())); } catch { /* ignore */ }
      setName('');
      setEmail('');
      setSubject('');
      setMessage('');
      setWebsite('');
      pushToast('تم استلام رسالتك — سنردّ عليك قريبًا.', 'success');
    } catch (err) {
      const msg = (err as Error)?.message;
      if (msg === 'SPAM_DETECTED') {
        setError('تم رفض الرسالة لأسباب أمنية.');
      } else {
        setError(mapFsError(err));
      }
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="container container--narrow page-pad">
      <h1>تواصل معنا</h1>
      <p className="lede">
        لديك سؤال، اقتراح، أو ملاحظة؟ أرسلها وسنردّ عليك في أقرب وقت.
      </p>

      <div className="card">
        {error && <div role="alert" className="alert" style={{ marginBottom: 16 }}>{error}</div>}
        <form className="form" onSubmit={onSubmit} noValidate ref={formRef}>
          {/* Honeypot — visually hidden, must remain empty. */}
          <div aria-hidden="true" style={{ position: 'absolute', left: '-10000px', top: 'auto', width: 1, height: 1, overflow: 'hidden' }}>
            <label htmlFor="ct-website">Leave this empty</label>
            <input
              id="ct-website"
              name="website"
              type="text"
              tabIndex={-1}
              autoComplete="off"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
            />
          </div>

          <div className="field">
            <label className="field__label" htmlFor="ct-name">الاسم</label>
            <input
              id="ct-name"
              className="input"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoComplete="name"
              maxLength={100}
            />
          </div>
          <div className="field">
            <label className="field__label" htmlFor="ct-email">البريد الإلكتروني</label>
            <input
              id="ct-email"
              className="input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              maxLength={200}
            />
          </div>
          <div className="field">
            <label className="field__label" htmlFor="ct-subject">الموضوع</label>
            <input
              id="ct-subject"
              className="input"
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              required
              maxLength={150}
            />
          </div>
          <div className="field">
            <label className="field__label" htmlFor="ct-msg">الرسالة</label>
            <textarea
              id="ct-msg"
              className="textarea"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="اشرح باختصار…"
              required
              maxLength={2000}
            />
            <div className="field__counter" aria-live="polite">{message.length} / 2000</div>
          </div>
          <Button type="submit" size="lg" block disabled={sending}>
            {sending ? 'جاري الإرسال…' : 'إرسال'}
          </Button>
        </form>
      </div>
    </div>
  );
}
