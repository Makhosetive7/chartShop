import { useEffect, useState } from 'react';
import styled from 'styled-components';
import { getScrollProgress } from './scrollChrome';

const Track = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  z-index: 50;
  pointer-events: none;
  background: transparent;
`;

const Fill = styled.div<{ $progress: number }>`
  height: 100%;
  width: 100%;
  transform-origin: left center;
  transform: scaleX(${({ $progress }) => $progress});
  background: ${({ theme }) => theme.colors.primary};
  transition: transform 80ms linear;
`;

export function ScrollProgressBar() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let frame = 0;

    const update = () => {
      frame = 0;
      setProgress(getScrollProgress());
    };

    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(update);
    };

    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);

    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, []);

  return (
    <Track aria-hidden="true" data-testid="scroll-progress">
      <Fill $progress={progress} />
    </Track>
  );
}
