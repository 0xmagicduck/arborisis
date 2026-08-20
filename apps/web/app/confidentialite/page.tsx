"use client";

import { LegalPage } from "@/components/LegalPage";

/**
 * Politique de confidentialité — RGPD/nLPD, voir
 * plan/10-securite-confidentialite-conformite.md §10.2 et §10.5. Reflète
 * l'état réel du traitement (pas d'email/mot de passe collecté, Internet
 * Archive pas encore actif — voir plan/05 §5.10), pas une version future
 * anticipée.
 */
export default function ConfidentialitePage() {
  return (
    <LegalPage title="Politique de confidentialité" updated="20 août 2026">
      <p>
        Arborisis collecte volontairement le minimum de données nécessaires à son fonctionnement.
        Cette page décrit précisément ce qui est collecté, pourquoi, et pour combien de temps.
      </p>

      <h2>Responsable du traitement</h2>
      <p>
        Bastien Javaux, rue du Craetveld 135, 1120 Neder-over-Heembeek, Belgique —{" "}
        <a href="mailto:bastienjavaux@icloud.com">bastienjavaux@icloud.com</a>. Voir aussi les{" "}
        <a href="/mentions-legales">mentions légales</a>.
      </p>

      <h2>Ce qu&apos;Arborisis ne collecte jamais</h2>
      <ul>
        <li>Aucune adresse email — la création de compte ne demande ni email ni mot de passe.</li>
        <li>Aucun mot de passe — l&apos;authentification repose sur WebAuthn (clé d&apos;accès/passkey).</li>
        <li>
          Aucune géolocalisation de la personne qui consulte le site — seule la localisation du son
          enregistré est demandée, et uniquement à la personne qui publie un enregistrement.
        </li>
        <li>Aucun cookie publicitaire ou de suivi, aucun outil d&apos;analytics tiers (Google Analytics ou équivalent).</li>
      </ul>

      <h2>Ce qu&apos;Arborisis collecte</h2>
      <ul>
        <li>
          <strong>Pseudo (handle) et nom affiché</strong> — choisis par la personne à l&apos;inscription,
          publics par nature.
        </li>
        <li>
          <strong>Bio</strong> — optionnelle, publique, renseignée librement.
        </li>
        <li>
          <strong>Clé publique WebAuthn</strong> — nécessaire à l&apos;authentification ; une clé publique
          seule n&apos;est pas exploitable pour usurper un compte.
        </li>
        <li>
          <strong>Codes de récupération</strong> — hachés (scrypt), utilisés uniquement pour retrouver
          l&apos;accès à un compte en cas de perte de la clé d&apos;accès.
        </li>
        <li>
          <strong>Contenu publié</strong> — titre, description, tags, licence, et localisation
          géographique de l&apos;enregistrement sonore : tout ceci est intentionnellement public dès la
          publication.
        </li>
        <li>
          <strong>Cookie de session</strong> — strictement nécessaire au maintien de la connexion,
          aucune bannière de consentement requise (aucun cookie non essentiel n&apos;est posé).
        </li>
        <li>
          <strong>Journaux techniques serveur</strong> — adresse IP et user-agent, pour la sécurité et le
          diagnostic, conservés 30 jours glissants, jamais transmis à un tiers analytique.
        </li>
      </ul>

      <h2>Base légale et finalité</h2>
      <p>
        Le traitement repose sur l&apos;exécution du service demandé (fournir un compte et publier des
        enregistrements sur une archive communautaire) et, pour le contenu publié, sur le consentement
        explicite donné à chaque publication (choix de la licence, de la localisation partagée).
      </p>

      <h2>Hébergement et transferts</h2>
      <p>
        Toutes les données (base de données, fichiers audio) sont hébergées chez Infomaniak, en
        Suisse — voir les <a href="/mentions-legales">mentions légales</a>. À la date de cette version,
        aucune donnée n&apos;est transférée vers Internet Archive (organisation à but non lucratif basée
        aux États-Unis) : cette intégration, envisagée à terme pour la pérennité des sons publiés, est
        volontairement reportée après le lancement (voir la feuille de route publique du projet). Cette
        page sera mise à jour avant toute activation.
      </p>

      <h2>Durée de conservation</h2>
      <p>
        Un compte et son contenu sont conservés tant que le compte existe. Les journaux techniques sont
        supprimés au bout de 30 jours glissants.
      </p>

      <h2>Vos droits</h2>
      <p>
        Conformément au RGPD (et à la loi belge transposant le RGPD, applicable ici puisque le
        responsable du traitement est établi en Belgique), vous disposez d&apos;un droit d&apos;accès, de
        rectification, d&apos;effacement, de portabilité et d&apos;opposition sur vos données. Pour l&apos;exercer,
        écrire à <a href="mailto:bastienjavaux@icloud.com">bastienjavaux@icloud.com</a>.
      </p>
      <p>
        Suppression de compte : vos enregistrements et votre profil sont supprimés. Un enregistrement
        déjà répliqué vers un service d&apos;archivage externe (Internet Archive, une fois cette intégration
        active) pourrait ne pas pouvoir être retiré de cette copie externe, par nature de ce type
        d&apos;archive pérenne — vous en serez informé·e avant toute publication vers un tel service.
      </p>
      <p>
        Vous pouvez aussi introduire une réclamation auprès de l&apos;
        <a href="https://www.autoriteprotectiondonnees.be/" target="_blank" rel="noreferrer">
          Autorité de protection des données
        </a>{" "}
        (Belgique), ou auprès de l&apos;autorité de votre pays de résidence si vous êtes ailleurs dans
        l&apos;Union européenne.
      </p>
    </LegalPage>
  );
}
