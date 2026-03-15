import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-[#09090b] text-[#fafafa] py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <Link to="/" className="inline-flex items-center gap-2 text-[#a1a1aa] hover:text-[#fafafa] transition-colors mb-8">
          <ArrowLeft size={20} />
          Zurück zur Startseite
        </Link>
        
        <h1 className="text-3xl font-bold mb-8">Datenschutzerklärung</h1>
        
        <div className="space-y-6 text-[#a1a1aa] leading-relaxed">
          <section>
            <h2 className="text-xl font-semibold text-[#fafafa] mb-3">1. Datenschutz auf einen Blick</h2>
            <p>
              Allgemeine Hinweise: Die folgenden Hinweise geben einen einfachen Überblick darüber, was mit Ihren personenbezogenen Daten passiert, wenn Sie diese Website besuchen. Personenbezogene Daten sind alle Daten, mit denen Sie persönlich identifiziert werden können.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#fafafa] mb-3">2. Datenerfassung auf dieser Website</h2>
            <p>
              Die Datenverarbeitung auf dieser Website erfolgt durch den Websitebetreiber. Dessen Kontaktdaten können Sie dem Impressum dieser Website entnehmen.
              Ihre Daten werden zum einen dadurch erhoben, dass Sie uns diese mitteilen. Hierbei kann es sich z. B. um Daten handeln, die Sie in ein Kontaktformular eingeben.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#fafafa] mb-3">3. Cookies & Firebase</h2>
            <p>
              Unsere Internetseiten verwenden so genannte "Cookies". Cookies sind kleine Textdateien und richten auf Ihrem Endgerät keinen Schaden an. Sie werden entweder vorübergehend für die Dauer einer Sitzung (Session-Cookies) oder dauerhaft (permanente Cookies) auf Ihrem Endgerät gespeichert.
              Wir nutzen Google Firebase für Authentifizierung, Datenbank und Hosting. Firebase kann ebenfalls Cookies und ähnliche Technologien verwenden, um die Sicherheit und Funktionalität der Dienste zu gewährleisten.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#fafafa] mb-3">4. Ihre Rechte</h2>
            <p>
              Sie haben jederzeit das Recht, unentgeltlich Auskunft über Herkunft, Empfänger und Zweck Ihrer gespeicherten personenbezogenen Daten zu erhalten. Sie haben außerdem ein Recht, die Berichtigung oder Löschung dieser Daten zu verlangen.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
