import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export default function Imprint() {
  return (
    <div className="min-h-screen bg-[#09090b] text-[#fafafa] py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <Link to="/" className="inline-flex items-center gap-2 text-[#a1a1aa] hover:text-[#fafafa] transition-colors mb-8">
          <ArrowLeft size={20} />
          Zurück zur Startseite
        </Link>
        
        <h1 className="text-3xl font-bold mb-8">Impressum</h1>
        
        <div className="space-y-6 text-[#a1a1aa] leading-relaxed">
          <section>
            <h2 className="text-xl font-semibold text-[#fafafa] mb-3">Angaben gemäß § 5 TMG</h2>
            <p>
              Kreativ-Desk OS GmbH<br />
              Musterstraße 123<br />
              8000 Zürich<br />
              Schweiz
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#fafafa] mb-3">Kontakt</h2>
            <p>
              Telefon: +41 44 123 45 67<br />
              E-Mail: hello@kreativ-desk.ch
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#fafafa] mb-3">Vertretungsberechtigte Geschäftsführer</h2>
            <p>
              Max Mustermann, Jane Doe
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#fafafa] mb-3">Registereintrag</h2>
            <p>
              Eintragung im Handelsregister.<br />
              Registergericht: Zürich<br />
              Registernummer: CH-123.4.567.890-1
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#fafafa] mb-3">Umsatzsteuer-ID</h2>
            <p>
              Umsatzsteuer-Identifikationsnummer gemäß § 27 a Umsatzsteuergesetz:<br />
              CHE-123.456.789 MWST
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
