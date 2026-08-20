"use client";

import { LegalPage } from "@/components/LegalPage";

/**
 * Conditions générales d'utilisation — voir
 * plan/10-securite-confidentialite-conformite.md §10.3 (politique de
 * contenu, modération) et plan/05 §5.5 (licences, condition d'hébergement).
 */
export default function CguPage() {
  return (
    <LegalPage title="Conditions générales d'utilisation" updated="20 août 2026">
      <h2>Ce qu&apos;est Arborisis</h2>
      <p>
        Arborisis est une archive sonore naturaliste, géographique et communautaire : un espace pour
        publier, écouter et cartographier des enregistrements de paysages sonores. C&apos;est un projet
        ouvert, sans but commercial, dont le code est publié sous licence libre.
      </p>

      <h2>Contenu accepté</h2>
      <p>
        Arborisis accueille des <strong>enregistrements de terrain</strong> : sons naturels, urbains ou
        ambiants, captés sur le vif, associés à un lieu réel. Ne sont pas à leur place ici : de la
        musique produite en studio, des voix off ou podcasts, du contenu publicitaire, ou tout
        enregistrement sans rapport avec un lieu ou un environnement sonore réel.
      </p>
      <p>
        Est strictement interdit tout contenu illégal, portant atteinte aux droits d&apos;un tiers
        (enregistrement effectué sans droit d&apos;accès au lieu, voix identifiable enregistrée sans
        consentement, etc.), diffamatoire, ou manifestement hors sujet.
      </p>

      <h2>Licence du contenu que vous publiez</h2>
      <p>
        Chaque enregistrement est publié sous une licence Creative Commons choisie par la personne qui
        le publie, parmi : <strong>CC0</strong> (domaine public), <strong>CC BY</strong>,{" "}
        <strong>CC BY-SA</strong> ou <strong>CC BY-NC</strong>. Aucun enregistrement ne peut être publié
        « tous droits réservés » — c&apos;est une condition de fonctionnement du service, cohérente avec sa
        vocation d&apos;archive ouverte et avec l&apos;intégration prévue à terme avec Internet Archive (voir la{" "}
        <a href="/confidentialite">politique de confidentialité</a>). En publiant, vous garantissez
        détenir les droits nécessaires pour accorder cette licence.
      </p>

      <h2>Compte et authentification</h2>
      <p>
        La création de compte ne demande ni email ni mot de passe : l&apos;accès repose sur une clé
        d&apos;accès (passkey/WebAuthn) propre à votre appareil, complétée par des codes de récupération à
        conserver en lieu sûr. Vous êtes responsable de la garde de votre clé d&apos;accès et de vos codes
        de récupération — Arborisis ne peut pas restaurer un compte dont les deux sont perdus.
      </p>

      <h2>Modération et signalement</h2>
      <p>
        Chaque enregistrement publié peut être signalé directement depuis sa fiche. Les signalements
        sont revus manuellement. Un contenu enfreignant ces conditions peut être dépublié sans préavis ;
        un compte utilisé de façon répétée pour publier du contenu non conforme peut être suspendu.
      </p>

      <h2>Disponibilité et pérennité</h2>
      <p>
        Arborisis est un projet individuel et communautaire, pas un service commercial avec garantie de
        disponibilité (SLA). Il n&apos;y a pas d&apos;engagement contractuel de disponibilité continue. Le
        code source étant public et sous licence libre (AGPL-3.0), toute personne peut en assurer la
        continuité indépendamment si besoin.
      </p>

      <h2>Responsabilité</h2>
      <p>
        Chaque contributeur·ice reste seul·e responsable du contenu qu&apos;iel publie. Arborisis retire
        les contenus signalés et avérés non conformes dès qu&apos;il en a connaissance, mais n&apos;examine pas
        chaque enregistrement avant publication de façon systématique.
      </p>

      <h2>Modifications</h2>
      <p>
        Ces conditions peuvent évoluer avec le projet ; la date de dernière mise à jour est indiquée en
        haut de cette page. Les changements substantiels seront annoncés sur le dépôt GitHub du projet.
      </p>

      <h2>Droit applicable</h2>
      <p>
        Ces conditions sont régies par le droit belge, sans préjudice des dispositions impératives de
        protection des consommateurs ou des données personnelles qui pourraient s&apos;appliquer dans votre
        pays de résidence au sein de l&apos;Union européenne.
      </p>
    </LegalPage>
  );
}
