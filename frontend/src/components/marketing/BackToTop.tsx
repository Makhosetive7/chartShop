import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowUp } from 'lucide-react';
import styled from 'styled-components';
import { shouldShowBackToTop } from './scrollChrome';

const Button = styled(motion.button)`
  position: fixed;
  right: clamp(1rem, 3vw, 1.75rem);
  bottom: clamp(1rem, 3vw, 1.75rem);
  z-index: 45;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  padding: 0;
  border: 1px solid ${({ theme }) => theme.colors.maroon};
  border-radius: 0;
  background: ${({ theme }) => theme.colors.maroon};
  color: ${({ theme }) => theme.colors.textOnDark};
  cursor: pointer;
  box-shadow: ${({ theme }) => theme.shadows.card};

  &:hover {
    background: ${({ theme }) => theme.colors.primary};
    border-color: ${({ theme }) => theme.colors.primary};
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.primaryLight};
    outline-offset: 3px;
  }

  svg {
    display: block;
  }
`;

function scrollToTop() {
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

export function BackToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let frame = 0;

    const update = () => {
      frame = 0;
      setVisible(shouldShowBackToTop());
    };

    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(update);
    };

    update();
    window.addEventListener('scroll', onScroll, { passive: true });

    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener('scroll', onScroll);
    };
  }, []);

  return (
    <AnimatePresence>
      {visible ? (
        <Button
          type="button"
          aria-label="Back to top"
          data-testid="back-to-top"
          onClick={scrollToTop}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 12 }}
          transition={{ duration: 0.2 }}
        >
          <ArrowUp size={20} strokeWidth={2.25} aria-hidden />
        </Button>
      ) : null}
    </AnimatePresence>
  );
}
