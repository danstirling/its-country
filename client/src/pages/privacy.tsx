export default function Privacy() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 py-16">
        <h1 className="font-serif text-4xl font-bold mb-2" data-testid="text-privacy-title">Privacy Policy</h1>
        <p className="text-sm text-muted-foreground mb-10">Effective Date: April 3, 2026</p>

        <div className="prose prose-neutral max-w-none space-y-8 text-foreground">

          <p className="text-muted-foreground leading-relaxed">
            ItsCountry ("we," "our," or "us") respects your privacy and is committed to protecting your information.
          </p>

          <section>
            <h2 className="font-serif text-xl font-semibold mb-3">1. Information We Collect</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">We may collect the following information:</p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>Name and email address (when creating an account)</li>
              <li>Account type requests (Artist, Radio, Listener, etc.)</li>
              <li>Login activity and account status</li>
              <li>Any information submitted through forms or email communication</li>
            </ul>
          </section>

          <section>
            <h2 className="font-serif text-xl font-semibold mb-3">2. How We Use Your Information</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">We use your information to:</p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>Create and manage user accounts</li>
              <li>Review and approve account access</li>
              <li>Communicate regarding account status or access requests</li>
              <li>Improve platform functionality and user experience</li>
            </ul>
          </section>

          <section>
            <h2 className="font-serif text-xl font-semibold mb-3">3. User Accounts &amp; Approval</h2>
            <p className="text-muted-foreground leading-relaxed">
              Account access is subject to approval. We may approve, deny, or revoke access at our discretion.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-xl font-semibold mb-3">4. File Access &amp; Content</h2>
            <p className="text-muted-foreground leading-relaxed">
              Users may stream content for preview purposes. Access to downloadable files is controlled and may require approval or direct communication.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-xl font-semibold mb-3">5. Data Sharing</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">
              We do not sell or rent your personal information. Information may only be shared:
            </p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>When required by law</li>
              <li>To protect the platform and its users</li>
            </ul>
          </section>

          <section>
            <h2 className="font-serif text-xl font-semibold mb-3">6. Third-Party Services</h2>
            <p className="text-muted-foreground leading-relaxed">
              We may use third-party services (such as hosting, storage, or email providers) to operate the platform.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-xl font-semibold mb-3">7. Security</h2>
            <p className="text-muted-foreground leading-relaxed">
              We take reasonable steps to protect user data, but no system is completely secure.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-xl font-semibold mb-3">8. Your Rights</h2>
            <p className="text-muted-foreground leading-relaxed">
              You may request to update or delete your account by contacting us.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-xl font-semibold mb-3">9. Changes to This Policy</h2>
            <p className="text-muted-foreground leading-relaxed">
              We may update this Privacy Policy at any time. Continued use of the platform means you accept those changes.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-xl font-semibold mb-3">10. Contact</h2>
            <p className="text-muted-foreground leading-relaxed">
              For questions, contact us at{" "}
              <a
                href="mailto:info@its-country.com"
                className="text-primary hover:underline font-medium"
                data-testid="link-privacy-email"
              >
                info@its-country.com
              </a>
            </p>
          </section>

        </div>
      </div>
    </div>
  );
}
