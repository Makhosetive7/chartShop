import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import styled from 'styled-components';
import { SiteHeader } from './SiteHeader';
import { SiteFooter } from './SiteFooter';
import { ScrollProgressBar } from './ScrollProgressBar';
import { BackToTop } from './BackToTop';

const Shell = styled.div`
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: ${({ theme }) => theme.colors.background};
`;

const Main = styled.main`
  flex: 1;
`;

export function MarketingLayout() {
  const location = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  return (
    <Shell>
      <ScrollProgressBar />
      <SiteHeader />
      <Main>
        <Outlet />
      </Main>
      <SiteFooter />
      <BackToTop />
    </Shell>
  );
}
