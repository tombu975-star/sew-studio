import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/components/site/SiteShell";
import { CONTACT } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "Terms of Use",
  description: "The terms for using the Sewsiness website, app, training and products.",
};

export default function TermsPage() {
  return (
    <LegalPage title="Terms of Use">
      <p>
        These terms apply when you use the Sewsiness website, app, free training and products. By using them, you
        agree to these terms. If you do not agree, please do not use them.
      </p>

      <section>
        <h2>About Sewsiness</h2>
        <p>
          Sewsiness offers business coaching, training, tools and an app for people who sew for a living. Our
          guidance is general information to help you understand the business side of sewing. It is not legal, tax or
          financial advice, and we cannot promise any particular result for your business.
        </p>
      </section>

      <section>
        <h2>The app</h2>
        <ul>
          <li><strong>Early testing.</strong> The app is in early testing. Features may change, and there may be mistakes or interruptions. Please keep your own copy of anything important.</li>
          <li><strong>Free for two months.</strong> New studios get two months free, with every feature available during that time.</li>
          <li><strong>After the free period.</strong> You choose the plan that fits your studio. Your records stay visible, and adding new entries requires a plan.</li>
          <li><strong>Your account.</strong> Give us accurate details, keep your password private, and tell us if you think someone else has used your account. You are responsible for what happens under it, including anyone you add to your studio.</li>
        </ul>
      </section>

      <section>
        <h2>Your information and your clients</h2>
        <p>
          What you enter in the app is yours. You give us permission to store and process it so we can run the app
          for you. If you add information about your clients, you are responsible for having their permission to
          keep it and to share an order link with them. Please read our <Link href="/privacy">Privacy Policy</Link>.
        </p>
      </section>

      <section>
        <h2>Using Sewsiness properly</h2>
        <p>Please do not:</p>
        <ul>
          <li>break the law or use Sewsiness to harm or mislead others;</li>
          <li>try to get into accounts or data that are not yours, or disrupt the app;</li>
          <li>copy, resell or share our paid products, templates or training with people who have not bought them; or</li>
          <li>upload anything you do not have the right to use.</li>
        </ul>
        <p>We may suspend an account that breaks these terms.</p>
      </section>

      <section>
        <h2>Products</h2>
        <p>
          Our workbooks, templates, ebooks and bundles are digital products sold through Selar. Prices are shown in
          Ghana cedis (GHS) on each product&apos;s Selar page. Payment, delivery and receipts are handled by Selar
          and are also subject to Selar&apos;s own terms. If something is wrong with a purchase, email{" "}
          <a href={`mailto:${CONTACT.supportEmail}`}>{CONTACT.supportEmail}</a> and we will help.
        </p>
        <p>
          When you buy a product, you may use it for your own business. Sewsiness keeps the copyright in all of its
          content.
        </p>
      </section>

      <section>
        <h2>Free training</h2>
        <p>
          Our free webinars and community are offered as a service. We may change, reschedule or stop them. Signing
          up means we may contact you about the sessions, using the details you give us.
        </p>
      </section>

      <section>
        <h2>Our responsibility</h2>
        <p>
          We work hard to provide a useful service, but the website, app, training and products are provided
          &ldquo;as they are&rdquo;. To the extent the law allows, Sewsiness is not responsible for losses that
          come from using them, including lost income or lost data, or from decisions you make based on our guidance
          or the app&apos;s calculations (for example costings and projections). Please check figures that matter
          before you rely on them.
        </p>
      </section>

      <section>
        <h2>Changes and ending</h2>
        <p>
          We may update these terms and will post the new version here with a new date. If you keep using Sewsiness
          after a change, you accept the updated terms. You can stop using Sewsiness at any time, and you can ask us
          to close your account.
        </p>
      </section>

      <section>
        <h2>Governing law</h2>
        <p>These terms are governed by the laws of Ghana.</p>
      </section>

      <section>
        <h2>Contact us</h2>
        <p>
          <a href={`mailto:${CONTACT.generalEmail}`}>{CONTACT.generalEmail}</a> for general questions,{" "}
          <a href={`mailto:${CONTACT.supportEmail}`}>{CONTACT.supportEmail}</a> for help, or WhatsApp{" "}
          <a href={CONTACT.whatsappLink}>{CONTACT.whatsappDisplay}</a>.
        </p>
      </section>
    </LegalPage>
  );
}
