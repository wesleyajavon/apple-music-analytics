"use client";

import { WhenWillIListenWidget } from "@/lib/components/when-will-i-listen-widget";

export default function WhenWillIListenPage() {
  return (
    <div className="px-4 py-6 sm:px-0">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-4xl">
          Quand vais-je écouter ?
        </h1>
        <p className="mt-2 text-base text-gray-500 dark:text-gray-400 max-w-2xl">
          Prédiction de votre créneau d&apos;écoute le plus probable pour aujourd&apos;hui,
          basée sur vos habitudes passées. Le calcul utilise des heuristiques statistiques
          (pas d&apos;IA) — l&apos;IA sert uniquement à expliquer le résultat.
        </p>
      </header>

      <WhenWillIListenWidget includeExplanation />
    </div>
  );
}
