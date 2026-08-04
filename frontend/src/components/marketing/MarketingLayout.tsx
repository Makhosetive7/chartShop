import { Outlet } from 'react-router-dom';
import styled from 'styled-components';
import { SiteHeader } from './SiteHeader';
import { SiteFooter } from './SiteFooter';

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
  return (
    <Shell>
      <SiteHeader />
      <Main>
        <Outlet />
      </Main>
      <SiteFooter />
    </Shell>
  );
}
