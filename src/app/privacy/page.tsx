import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/components/site/SiteShell";
import ReactMarkdown from "react-markdown";
import { loadWebsiteContent } from "@/lib/website-content.server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How Sewsiness collects, uses and protects your information.",
};

export default async function PrivacyPage() {
  const { contact: CONTACT, legal } = await loadWebsiteContent();
  // An admin can replace this text from /admin/website (Legal pages). Empty = the built-in text below.
  if (legal.privacyMarkdown.trim()) {
    return <LegalPage title="Privacy Policy"><ReactMarkdown>{legal.privacyMarkdown}</ReactMarkdown></LegalPage>;
  }
  return (
    <LegalPage title="Privacy Policy">
      <p>
        Sewsiness is the brand behind the business of sewing. This policy explains what personal information we
        collect through our website, our app, our free training and our products, what we do with it, and the
        choices you have. We aim to follow Ghana&apos;s Data Protection Act, 2012 (Act 843).
      </p>

      <section>
        <h2>What we collect</h2>
        <ul>
          <li><strong>What you give us.</strong> Your name, email address and phone or WhatsApp number when you sign up for a webinar, create a studio account, join our community or message us.</li>
          <li><strong>Your studio information in the app.</strong> The records you enter to run your business: clients, measurements, orders, fittings, costings, payments, inventory and similar details.</li>
          <li><strong>Purchases.</strong> Our products are sold through Selar. Selar handles payment. We may receive order details such as your name, email address and what you bought.</li>
          <li><strong>Technical information.</strong> Basic details such as device type, browser and error logs, and a sign-in cookie that keeps you logged in to the app. This website does not use advertising cookies.</li>
        </ul>
      </section>

      <section>
        <h2>How we use it</h2>
        <ul>
          <li>To create and run your account and to provide the app and your training.</li>
          <li>To reply to your messages and give you support.</li>
          <li>To send you what you signed up for, such as webinar details and product access, and occasional updates about Sewsiness. You can ask us to stop updates at any time.</li>
          <li>To keep the app secure, fix problems and improve it.</li>
          <li>To meet our legal obligations.</li>
        </ul>
        <p>We do not sell your personal information.</p>
      </section>

      <section>
        <h2>Your clients&apos; information</h2>
        <p>
          If you add your own clients to the app (for example names, phone numbers and measurements), you decide what
          goes in, and we store it on your behalf to provide the service. Please make sure your clients know you keep
          their details and have agreed to it. We do not use your clients&apos; information for our own marketing.
          Clients only see their own order through a private tracking link that you choose to share.
        </p>
      </section>

      <section>
        <h2>Who we share it with</h2>
        <p>We share information only with the services that help us run Sewsiness, and only as needed:</p>
        <ul>
          <li>Hosting and database providers that store the app and its data.</li>
          <li>Selar, which processes payments and delivers our digital products.</li>
          <li>Email and messaging services we use to contact you, including WhatsApp.</li>
          <li>Authorities, where the law requires it.</li>
        </ul>
        <p>
          Some of these providers may process information outside Ghana. We choose providers that protect
          information appropriately. If you follow us on TikTok or join our WhatsApp community, those platforms
          have their own privacy policies.
        </p>
      </section>

      <section>
        <h2>How long we keep it</h2>
        <p>
          We keep your information while your account is active or while we need it to help you. If you ask us to
          delete your account, we will remove your information unless we are required to keep some of it by law.
        </p>
      </section>

      <section>
        <h2>How we protect it</h2>
        <p>
          Passwords are stored in scrambled (hashed) form, connections to the app are encrypted, and access to
          studio data is limited by role. No online service can promise perfect security, so please use a strong
          password and keep it private.
        </p>
      </section>

      <section>
        <h2>Your rights</h2>
        <p>You can ask us to:</p>
        <ul>
          <li>tell you what information we hold about you and give you a copy;</li>
          <li>correct information that is wrong;</li>
          <li>delete your information or close your account;</li>
          <li>stop using your information for updates or marketing; and</li>
          <li>withdraw a consent you gave us.</li>
        </ul>
        <p>
          Email <a href={`mailto:${CONTACT.generalEmail}`}>{CONTACT.generalEmail}</a> and we will respond as soon as
          we can. If you are not happy with how we handle your information, you may also contact Ghana&apos;s Data
          Protection Commission.
        </p>
      </section>

      <section>
        <h2>Children</h2>
        <p>Sewsiness is made for people who sew for a living. It is not aimed at children, and we do not knowingly collect information from them.</p>
      </section>

      <section>
        <h2>Changes to this policy</h2>
        <p>
          If we change this policy, we will post the new version on this page and update the date at the top. See
          also our <Link href="/terms">Terms of Use</Link>.
        </p>
      </section>

      <section>
        <h2>Contact us</h2>
        <p>
          Questions about privacy: <a href={`mailto:${CONTACT.generalEmail}`}>{CONTACT.generalEmail}</a>. Help with
          your account: <a href={`mailto:${CONTACT.supportEmail}`}>{CONTACT.supportEmail}</a>. WhatsApp:{" "}
          <a href={CONTACT.whatsappLink}>{CONTACT.whatsappDisplay}</a>.
        </p>
      </section>
    </LegalPage>
  );
}
