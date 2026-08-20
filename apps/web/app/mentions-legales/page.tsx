"use client";

import { LegalPage } from "@/components/LegalPage";

/**
 * Mentions légales — identification de l'éditeur, hébergement, propriété
 * intellectuelle. Voir plan/10-securite-confidentialite-conformite.md.
 */
export default function MentionsLegalesPage() {
  return (
    <LegalPage title="Mentions légales" updated="20 août 2026">
      <h2>Éditeur du site</h2>
      <p>
        Arborisis est un projet individuel, à but non lucratif, édité et maintenu par :
      </p>
      <ul>
        <li>Bastien Javaux</li>
        <li>Rue du Craetveld 135, 1120 Neder-over-Heembeek, Belgique</li>
        <li>
          Contact : <a href="mailto:bastienjavaux@icloud.com">bastienjavaux@icloud.com</a>
        </li>
      </ul>
      <p>
        Arborisis n&apos;est pas une société commerciale : il n&apos;y a ni raison sociale, ni numéro
        d&apos;entreprise, ni TVA à déclarer ici. Directeur de la publication : Bastien Javaux.
      </p>

      <h2>Hébergement</h2>
      <p>
        Le site et l&apos;infrastructure applicative (serveur, base de données, stockage des sons) sont
        hébergés par <strong>Infomaniak Network SA</strong> (Suisse), sur son offre Infomaniak Public
        Cloud. Coordonnées légales complètes de l&apos;hébergeur disponibles sur{" "}
        <a href="https://www.infomaniak.com/fr/mentions-legales" target="_blank" rel="noreferrer">
          infomaniak.com/fr/mentions-legales
        </a>
        .
      </p>
      <p>
        Le nom de domaine <strong>arborisis.com</strong> est enregistré via Gandi SAS, sa zone DNS gérée
        via Cloudflare.
      </p>

      <h2>Propriété intellectuelle</h2>
      <p>
        Le code source d&apos;Arborisis est publié sous licence libre AGPL-3.0 et disponible sur{" "}
        <a href="https://github.com/0xmagicduck/arborisis" target="_blank" rel="noreferrer">
          github.com/0xmagicduck/arborisis
        </a>
        . Le contenu sonore publié par les contributeur·ices reste leur propriété intellectuelle,
        partagé sous la licence Creative Commons que chaque personne choisit au moment de la
        publication (CC0, CC BY, CC BY-SA ou CC BY-NC) — voir les{" "}
        <a href="/cgu">conditions générales d&apos;utilisation</a> pour le détail.
      </p>

      <h2>Signalement d&apos;un contenu</h2>
      <p>
        Pour signaler un contenu illicite, un problème de propriété intellectuelle, ou toute autre
        demande relevant de ces mentions légales, écrire à{" "}
        <a href="mailto:bastienjavaux@icloud.com">bastienjavaux@icloud.com</a>. Un mécanisme de
        signalement direct existe aussi sur chaque fiche d&apos;enregistrement.
      </p>
    </LegalPage>
  );
}
