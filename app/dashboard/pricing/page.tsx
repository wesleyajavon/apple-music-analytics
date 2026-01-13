"use client";

import React, { useState } from 'react';

const pricingTiers = [
  {
    name: 'Basic',
    id: 'tier-basic',
    price: { monthly: '19€', yearly: '15€' },
    description: 'L\'essentiel pour commencer votre activité sereinement.',
    features: [
      'Jusqu\'à 5 projets actifs',
      'Accès aux outils de base',
      'Support par email (48h)',
      '1 Go de stockage cloud',
      'Exports PDF standards'
    ],
    cta: 'Commencer gratuitement',
    mostPopular: false,
    icon: '⚡',
  },
  {
    name: 'Pro',
    id: 'tier-pro',
    price: { monthly: '49€', yearly: '39€' },
    description: 'La solution complète pour les professionnels exigeants.',
    features: [
      'Projets illimités',
      'Outils d\'analyse avancés',
      'Support prioritaire (2h)',
      '20 Go de stockage cloud',
      'Exports personnalisés (White label)',
      'Intégrations API standard',
      'Collaboration d\'équipe (3 pers.)'
    ],
    cta: 'Passer à la vitesse Pro',
    mostPopular: true,
    icon: '🛡️',
  },
  {
    name: 'Enterprise',
    id: 'tier-enterprise',
    price: { monthly: '99€', yearly: '79€' },
    description: 'Une infrastructure robuste pour les grandes organisations.',
    features: [
      'Utilisateurs illimités',
      'SSO & Sécurité renforcée',
      'Account Manager dédié',
      'Stockage illimité',
      'SLA garanti à 99.9%',
      'Formation sur mesure',
      'API dédiée & Webhooks'
    ],
    cta: 'Contacter l\'équipe',
    mostPopular: false,
    icon: '🏢',
  },
];

export default function PricingPage() {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');

  return (
    <div className="py-12">
      {/* Header Section */}
      <div className="max-w-4xl mx-auto text-center mb-12">
        <h2 className="text-blue-700 dark:text-blue-400 font-semibold tracking-wide uppercase text-sm mb-3">
          Tarification
        </h2>
        <h1 className="text-4xl font-extrabold text-gray-900 dark:text-white sm:text-5xl tracking-tight mb-4">
          Choisissez le plan adapté à votre croissance
        </h1>
        <p className="text-lg text-gray-500 dark:text-gray-400 max-w-2xl mx-auto">
          Des tarifs transparents et sans frais cachés. Changez de plan ou annulez à tout moment.
        </p>

        {/* Billing Toggle */}
        <div className="mt-8 flex justify-center items-center gap-4">
          <span className={`text-sm ${billingCycle === 'monthly' ? 'text-gray-900 dark:text-white font-medium' : 'text-gray-500 dark:text-gray-400'}`}>
            Mensuel
          </span>
          <button
            onClick={() => setBillingCycle(billingCycle === 'monthly' ? 'yearly' : 'monthly')}
            className="relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 bg-blue-700 dark:bg-blue-600"
            role="switch"
            aria-checked={billingCycle === 'yearly'}
            aria-label="Basculer entre mensuel et annuel"
          >
            <span
              aria-hidden="true"
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                billingCycle === 'yearly' ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
          <span className={`text-sm ${billingCycle === 'yearly' ? 'text-gray-900 dark:text-white font-medium' : 'text-gray-500 dark:text-gray-400'}`}>
            Annuel <span className="text-blue-700 dark:text-blue-400 font-bold">( -20% )</span>
          </span>
        </div>
      </div>

      {/* Pricing Grid */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 gap-8 lg:grid-cols-3 items-start">
        {pricingTiers.map((tier) => (
          <div
            key={tier.id}
            className={`relative flex flex-col h-full bg-white dark:bg-gray-800 rounded-lg shadow-md border ${
              tier.mostPopular 
                ? 'border-blue-500 ring-2 ring-blue-500 ring-opacity-10 scale-105 z-10' 
                : 'border-gray-200 dark:border-gray-700'
            } p-6 transition-all hover:shadow-lg`}
          >
            {tier.mostPopular && (
              <div className="absolute top-0 right-6 transform -translate-y-1/2">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-blue-700 text-white uppercase tracking-wider">
                  Recommandé
                </span>
              </div>
            )}

            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-2xl">
                {tier.icon}
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                {tier.name}
              </h3>
            </div>

            <p className="text-gray-500 dark:text-gray-400 text-sm mb-6 min-h-[40px]">
              {tier.description}
            </p>

            <div className="mb-6 flex items-baseline">
              <span className="text-4xl font-extrabold text-gray-900 dark:text-white tracking-tight">
                {billingCycle === 'monthly' ? tier.price.monthly : tier.price.yearly}
              </span>
              <span className="ml-1 text-gray-500 dark:text-gray-400">/mois</span>
            </div>

            <ul className="flex-1 space-y-4 mb-8">
              {tier.features.map((feature, idx) => (
                <li key={idx} className="flex items-start gap-3">
                  <svg 
                    className="w-5 h-5 text-blue-700 dark:text-blue-400 shrink-0 mt-0.5" 
                    fill="none" 
                    viewBox="0 0 24 24" 
                    stroke="currentColor"
                    aria-hidden="true"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-sm text-gray-600 dark:text-gray-300">
                    {feature}
                  </span>
                </li>
              ))}
            </ul>

            <button
              className={`w-full flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all group ${
                tier.mostPopular
                  ? 'bg-blue-700 text-white hover:bg-blue-800'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              {tier.cta}
              <svg 
                className="w-4 h-4 transition-transform group-hover:translate-x-1" 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
                aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </button>
          </div>
        ))}
      </div>

      {/* Trust Badge / Footer Section */}
      <div className="mt-16 max-w-4xl mx-auto text-center">
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
          Plus de 500+ entreprises nous font confiance au quotidien.
        </p>
        <div className="flex flex-wrap justify-center gap-8 opacity-40 grayscale contrast-125 dark:invert">
          <div className="h-8 w-24 bg-gray-400 rounded-md animate-pulse" />
          <div className="h-8 w-24 bg-gray-400 rounded-md animate-pulse" />
          <div className="h-8 w-24 bg-gray-400 rounded-md animate-pulse" />
          <div className="h-8 w-24 bg-gray-400 rounded-md animate-pulse" />
        </div>
      </div>
    </div>
  );
}
