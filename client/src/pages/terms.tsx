export default function Terms() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 py-16">
        <h1 className="font-serif text-4xl font-bold mb-2" data-testid="text-terms-title">Terms &amp; Conditions</h1>
        <p className="text-sm text-muted-foreground mb-10">Effective Date: April 3, 2026</p>

        <div className="space-y-8 text-foreground">

          <p className="text-muted-foreground leading-relaxed">
            By accessing or using ItsCountry ("Platform," "we," "our," or "us"), you agree to the following Terms and Conditions.
          </p>

          <section>
            <h2 className="font-serif text-xl font-semibold mb-3">1. Account Access</h2>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>Users must provide accurate and complete information when creating an account</li>
              <li>All accounts are subject to approval by the Platform</li>
              <li>We reserve the right to approve, deny, suspend, or terminate any account at our discretion</li>
            </ul>
          </section>

          <section>
            <h2 className="font-serif text-xl font-semibold mb-3">2. User Roles</h2>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>Access to the Platform may vary depending on assigned user type (e.g., Artist, Radio &amp; Advertising, Listener)</li>
              <li>User roles are assigned and managed by the Platform and may be updated or changed at any time</li>
            </ul>
          </section>

          <section>
            <h2 className="font-serif text-xl font-semibold mb-3">3. Content Access</h2>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>Content on the Platform is provided for streaming and preview purposes only</li>
              <li>Downloadable access to files is not currently available through the Platform</li>
              <li>Any requests for access to files or usage must be made through the Platform's designated contact methods</li>
              <li>Unauthorized downloading, copying, sharing, or distribution of any content is strictly prohibited</li>
            </ul>
          </section>

          <section>
            <h2 className="font-serif text-xl font-semibold mb-3">4. Intellectual Property</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">
              All music, media, and content available on the Platform are protected by copyright and other applicable intellectual property laws.
            </p>
            <p className="text-muted-foreground mb-2">Users may not:</p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>Reproduce, distribute, or share content without permission</li>
              <li>Use content for commercial or public purposes without authorization</li>
            </ul>
          </section>

          <section>
            <h2 className="font-serif text-xl font-semibold mb-3">5. Access Requests</h2>
            <p className="text-muted-foreground leading-relaxed">
              Requests for access to content or files are handled manually through email or other communication methods. Access is granted at the sole discretion of the Platform.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-xl font-semibold mb-3">6. Acceptable Use</h2>
            <p className="text-muted-foreground mb-2">Users agree not to:</p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>Attempt unauthorized access to any part of the Platform</li>
              <li>Interfere with system functionality or security</li>
              <li>Use the Platform for any unlawful or unauthorized purpose</li>
            </ul>
          </section>

          <section>
            <h2 className="font-serif text-xl font-semibold mb-3">7. Platform Availability</h2>
            <p className="text-muted-foreground leading-relaxed">
              We do not guarantee uninterrupted or error-free access to the Platform. Features may be modified, updated, or removed at any time without notice.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-xl font-semibold mb-3">8. Limitation of Liability</h2>
            <p className="text-muted-foreground leading-relaxed">
              The Platform is provided "as is" without warranties of any kind. We are not liable for any damages arising from the use or inability to use the Platform.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-xl font-semibold mb-3">9. Changes to Terms</h2>
            <p className="text-muted-foreground leading-relaxed">
              We reserve the right to update these Terms and Conditions at any time. Continued use of the Platform after changes are made constitutes acceptance of the updated Terms.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-xl font-semibold mb-3">10. Contact</h2>
            <p className="text-muted-foreground leading-relaxed">
              For questions or requests, contact us at{" "}
              <a
                href="mailto:info@its-country.com"
                className="text-primary hover:underline font-medium"
                data-testid="link-terms-email"
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
