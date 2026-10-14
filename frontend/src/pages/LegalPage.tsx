import { Link } from 'react-router-dom';
import styled from 'styled-components';
import { Eyebrow } from '@/components/marketing/marketingPrimitives';
import {
  PRIVACY_POLICY,
  TERMS_OF_SERVICE,
  type LegalBlock,
  type LegalDocument,
} from '@/content/legal';

const Shell = styled.div`
  width: min(1120px, 100%);
  margin: 0 auto;
  padding: clamp(2.5rem, 7vw, 4.5rem) clamp(1.25rem, 4vw, 2.5rem);
  display: grid;
  grid-template-columns: 240px 1fr;
  gap: clamp(2rem, 5vw, 3.5rem);
  align-items: start;

  @media (max-width: 860px) {
    grid-template-columns: 1fr;
  }
`;

const Toc = styled.nav`
  position: sticky;
  top: 96px;
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space[2]};
  font-size: 0.9rem;

  p {
    margin: 0 0 ${({ theme }) => theme.space[2]};
    font-size: 0.72rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: ${({ theme }) => theme.colors.textMuted};
    font-weight: ${({ theme }) => theme.fontWeights.semibold};
  }

  a {
    color: ${({ theme }) => theme.colors.textSecondary};
    text-decoration: none;

    &:hover {
      color: ${({ theme }) => theme.colors.primary};
    }
  }

  @media (max-width: 860px) {
    display: none;
  }
`;

const Article = styled.article`
  max-width: 44rem;

  h1 {
    margin: ${({ theme }) => theme.space[4]} 0 ${({ theme }) => theme.space[3]};
    font-size: clamp(2rem, 4.5vw, 2.9rem);
    line-height: 1.1;
    letter-spacing: -0.03em;
    color: ${({ theme }) => theme.colors.maroon};
  }

  h2 {
    margin: ${({ theme }) => theme.space[7]} 0 ${({ theme }) => theme.space[3]};
    font-size: 1.35rem;
    letter-spacing: -0.02em;
    color: ${({ theme }) => theme.colors.maroon};
    scroll-margin-top: 96px;
  }

  p,
  li {
    line-height: 1.7;
    color: ${({ theme }) => theme.colors.textSecondary};
  }

  p {
    margin: 0 0 ${({ theme }) => theme.space[4]};
  }

  ul {
    margin: 0 0 ${({ theme }) => theme.space[4]};
    padding-left: 1.25rem;
  }

  li + li {
    margin-top: ${({ theme }) => theme.space[2]};
  }
`;

const Lead = styled.p`
  font-size: 1.1rem;
`;

const Meta = styled.p`
  font-size: 0.9rem;
  color: ${({ theme }) => theme.colors.textMuted} !important;
`;

const Related = styled.div`
  margin-top: ${({ theme }) => theme.space[7]};
  padding: ${({ theme }) => theme.space[5]};
  background: ${({ theme }) => theme.colors.surface};
  box-shadow: ${({ theme }) => theme.shadows.card};

  p {
    margin: 0;
  }

  a {
    color: ${({ theme }) => theme.colors.primary};
    font-weight: ${({ theme }) => theme.fontWeights.semibold};
  }
`;

function Block({ block }: { block: LegalBlock }) {
  if (typeof block === 'string') return <p>{block}</p>;
  return (
    <ul>
      {block.list.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

function LegalPage({
  doc,
  related,
}: {
  doc: LegalDocument;
  related: { to: string; label: string };
}) {
  return (
    <Shell>
      <Toc aria-label="On this page">
        <p>On this page</p>
        {doc.sections.map((section) => (
          <a key={section.id} href={`#${section.id}`}>
            {section.heading}
          </a>
        ))}
      </Toc>
      <Article>
        <Eyebrow>{doc.eyebrow}</Eyebrow>
        <h1>{doc.title}</h1>
        <Meta>Effective {doc.effectiveDate}</Meta>
        <Lead>{doc.lead}</Lead>
        {doc.sections.map((section) => (
          <section key={section.id}>
            <h2 id={section.id}>{section.heading}</h2>
            {section.body.map((block, index) => (
              <Block key={index} block={block} />
            ))}
          </section>
        ))}
        <Related>
          <p>
            Also read our <Link to={related.to}>{related.label}</Link>.
          </p>
        </Related>
      </Article>
    </Shell>
  );
}

export function PrivacyPage() {
  return <LegalPage doc={PRIVACY_POLICY} related={{ to: '/terms', label: 'Terms and Conditions' }} />;
}

export function TermsPage() {
  return <LegalPage doc={TERMS_OF_SERVICE} related={{ to: '/privacy', label: 'Privacy Policy' }} />;
}
