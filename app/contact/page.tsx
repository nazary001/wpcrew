import ContactForm from "@/components/ContactForm";
import { SITE_NAME } from "@/lib/config";
import { pageMeta } from "@/lib/seo";

export const metadata = pageMeta({
  title: "Contact",
  description: `Questions, corrections or partnership ideas — here's how to reach the ${SITE_NAME} editorial team.`,
  path: "/contact",
});

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
      <header className="reveal rule-double pb-6">
        <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
          Get in <span className="u-marker">touch</span>
        </h1>
        <p className="mt-3 leading-relaxed text-moss">
          Spotted an error in a guide? Have a tool, framework or topic you think
          we should cover? Working on something you&apos;d like to share, or have
          a partnership idea? Drop a note below — messages go straight to the
          editorial desk.
        </p>
      </header>

      <div className="reveal reveal-2 mt-8 border border-line bg-card p-6 sm:p-8">
        <ContactForm />
      </div>

      <p className="reveal reveal-3 mt-6 text-xs leading-relaxed text-moss">
        We use your details only to answer your message — see our{" "}
        <a href="/privacy-policy" className="text-pine underline">
          Privacy Policy
        </a>
        . You can also reach us at{" "}
        <a href="mailto:hello@wpcrew.co" className="text-pine underline">
          hello@wpcrew.co
        </a>
        .
      </p>
    </div>
  );
}
