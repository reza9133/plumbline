import type { ComponentType } from 'react';
import { Concepts, Introduction, Lifecycle, Quickstart, Readings } from './content1';
import { ContractRef, Limits, Money, Roles } from './content2';
import { Faq, Frontend, Glossary, Limitations, WalletDoc } from './content3';

export interface DocPage {
  slug: string;
  title: string;
  group: 'Start' | 'Understand' | 'Reference' | 'The app' | 'More';
  summary: string;
  keywords: string;
  Component: ComponentType;
}

export const DOCS: DocPage[] = [
  {
    slug: 'introduction',
    title: 'Introduction',
    group: 'Start',
    summary: 'What Plumbline is and why it is built in three layers.',
    keywords: 'overview bonded promises warrant canary plumb line layers',
    Component: Introduction,
  },
  {
    slug: 'quickstart',
    title: 'Quickstart',
    group: 'Start',
    summary: 'From a wallet to a live covenant in five steps.',
    keywords: 'getting started tutorial create activate collect',
    Component: Quickstart,
  },
  {
    slug: 'concepts',
    title: 'Concepts',
    group: 'Understand',
    summary: 'Covenants, tenets, anchors, bound pages, page identity.',
    keywords: 'tenet anchor bound beneficiary url identity credits',
    Component: Concepts,
  },
  {
    slug: 'lifecycle',
    title: 'Life of a covenant',
    group: 'Understand',
    summary: 'States, warnings, cures, breaks and maturity.',
    keywords: 'state machine warned broken matured cancelled cure dark readings log',
    Component: Lifecycle,
  },
  {
    slug: 'readings',
    title: 'How a page is read',
    group: 'Understand',
    summary: 'Arithmetic evidence, the AI inspector, quotes, dates and consensus.',
    keywords: 'ai llm inspector steering validators equivalence quote date stale',
    Component: Readings,
  },
  {
    slug: 'money',
    title: 'Money',
    group: 'Understand',
    summary: 'Bond, slash split, pull payments and the books.',
    keywords: 'bond slash finder closer beneficiary collect solvency gen',
    Component: Money,
  },
  {
    slug: 'roles',
    title: 'Roles and permissions',
    group: 'Understand',
    summary: 'Who can call what, and when.',
    keywords: 'publisher inspector stranger permissions matrix',
    Component: Roles,
  },
  {
    slug: 'limits',
    title: 'Limits',
    group: 'Reference',
    summary: 'Every hard limit the contract enforces.',
    keywords: 'min max bond term cure gap tenets characters',
    Component: Limits,
  },
  {
    slug: 'contract',
    title: 'Contract reference',
    group: 'Reference',
    summary: 'Methods, views, JSON shapes and error messages.',
    keywords: 'api write view create_covenant add_tenet activate inspect mature collect errors',
    Component: ContractRef,
  },
  {
    slug: 'frontend',
    title: 'Using this app',
    group: 'The app',
    summary: 'Pages, transactions, themes, demo data, configuration and build.',
    keywords: 'vite react env build deploy demo theme dim light config',
    Component: Frontend,
  },
  {
    slug: 'wallet',
    title: 'Wallets and networks',
    group: 'The app',
    summary: 'EIP-6963 discovery, connect, disconnect and switching network.',
    keywords: 'eip-6963 eip-1193 metamask rabby switch network chain 61999',
    Component: WalletDoc,
  },
  {
    slug: 'faq',
    title: 'FAQ',
    group: 'More',
    summary: 'Short answers to common questions.',
    keywords: 'questions help undetermined draft',
    Component: Faq,
  },
  {
    slug: 'limitations',
    title: 'Limitations and security',
    group: 'More',
    summary: 'What Plumbline does not promise.',
    keywords: 'risk audit independent beneficiary dynamic pages',
    Component: Limitations,
  },
  {
    slug: 'glossary',
    title: 'Glossary',
    group: 'More',
    summary: 'Terms in one place.',
    keywords: 'terms definitions',
    Component: Glossary,
  },
];
