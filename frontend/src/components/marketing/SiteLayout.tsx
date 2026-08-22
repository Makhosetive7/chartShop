import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import styled from 'styled-components';
import { SiteHeader } from './SiteHeader';
import { SiteFooter } from './SiteFooter';
import { BackToTop } from './BackToTop';
import { isScrollChromeRoute } from './scrollChrome';

const Shell = styled.div`
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: ${({ theme }) => theme.colors.background};
`;

const Main = styled.main`
  flex: 1;
`;

export function SiteLayout() {
  const location = useLocation();
  const showScrollChrome = isScrollChromeRoute(location.pathname);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  return (
    <Shell>
      <SiteHeader showScrollProgress={showScrollChrome} />
      <Main>
        <Outlet />
      </Main>
      <SiteFooter />
      {showScrollChrome ? <BackToTop /> : null}
    </Shell>
  );
}

/** @deprecated use SiteLayout */
export const MarketingLayout = SiteLayout;
