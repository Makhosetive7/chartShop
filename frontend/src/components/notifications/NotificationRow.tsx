/**
 * Enhanced Notification Row Component
 * 
 * Wraps notification items with deep linking to action surfaces.
 * Preserves existing UI while adding contextual navigation.
 */

import { type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import styled from 'styled-components';
import { getNotificationDeepLink, getNotificationActionLabel } from '@/utils/notificationDeepLinks';
import type { StockAlertItem } from '@/api/products';
import type { CreditDueItem, LaybyeAlertItem } from '@/api/sales';
import type { OrderAlertItem } from '@/api/ops';
import type { ActivityItem } from '@/api/chat';

export type NotificationRowData = {
  key: string;
  seenKey: string;
  unread: boolean;
  sort: number;
  kind: 'chase' | 'alert' | 'stock' | 'order' | 'laybye';
  chase?: CreditDueItem;
  alert?: ActivityItem;
  stock?: StockAlertItem;
  order?: OrderAlertItem;
  laybye?: LaybyeAlertItem;
};

type NotificationRowProps = {
  row: NotificationRowData;
  onMarkRead: () => void;
  children: ReactNode;
  className?: string;
};

const RowLink = styled(Link)<{ $unread: boolean }>`
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px 20px;
  border: none;
  background: ${({ $unread }) => ($unread ? '#fef7ed' : 'transparent')};
  text-align: left;
  text-decoration: none;
  color: inherit;
  cursor: pointer;
  transition: all 0.15s ease;
  position: relative;

  &:hover {
    background: ${({ $unread }) => ($unread ? '#fed7aa' : '#f3f4f6')};
  }

  &:active {
    background: ${({ $unread }) => ($unread ? '#fdba74' : '#e5e7eb')};
  }
  
  /* Add action indicator */
  &::after {
    content: '→';
    position: absolute;
    right: 20px;
    color: #6b7280;
    font-size: 14px;
    opacity: 0;
    transition: opacity 0.15s ease;
  }
  
  &:hover::after {
    opacity: 1;
  }
`;

const ActionHint = styled.div`
  position: absolute;
  bottom: 8px;
  right: 20px;
  font-size: 11px;
  color: #6b7280;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.025em;
  opacity: 0;
  transition: opacity 0.15s ease;
  
  ${RowLink}:hover & {
    opacity: 1;
  }
`;

export function NotificationRow({ row, onMarkRead, children, className }: NotificationRowProps) {
  const deepLink = getNotificationDeepLink(row);
  const actionLabel = getNotificationActionLabel(row.kind, getItemStatus(row));
  
  const handleClick = () => {
    // Mark as read when clicked
    if (row.unread) {
      onMarkRead();
    }
    
    // Let Link handle navigation
  };
  
  return (
    <RowLink
      to={deepLink}
      $unread={row.unread}
      onClick={handleClick}
      className={className}
    >
      {children}
      <ActionHint>{actionLabel}</ActionHint>
    </RowLink>
  );
}

/**
 * Fallback button for notifications without deep links
 */
const RowButton = styled.button<{ $unread: boolean }>`
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px 20px;
  border: none;
  background: ${({ $unread }) => ($unread ? '#fef7ed' : 'transparent')};
  text-align: left;
  cursor: pointer;
  transition: all 0.15s ease;
  width: 100%;

  &:hover {
    background: ${({ $unread }) => ($unread ? '#fed7aa' : '#f3f4f6')};
  }

  &:active {
    background: ${({ $unread }) => ($unread ? '#fdba74' : '#e5e7eb')};
  }
  
  &:disabled {
    cursor: default;
    opacity: 0.6;
  }
`;

export function NotificationRowButton({ row, onMarkRead, children, className }: NotificationRowProps) {
  return (
    <RowButton
      type="button"
      $unread={row.unread}
      disabled={!row.unread}
      onClick={onMarkRead}
      className={className}
    >
      {children}
    </RowButton>
  );
}

/**
 * Extract status from notification row for action labeling
 */
function getItemStatus(row: NotificationRowData): string | undefined {
  switch (row.kind) {
    case 'stock':
      return row.stock?.status;
    case 'chase':
      return row.chase?.status;
    case 'order':
      return row.order?.status;
    case 'laybye':
      return row.laybye?.status;
    case 'alert':
      return 'info';
    default:
      return undefined;
  }
}

/**
 * Notification row wrapper that chooses between Link and Button based on deep link support
 */
export function SmartNotificationRow(props: NotificationRowProps) {
  const deepLink = getNotificationDeepLink(props.row);
  
  // Use Link for actionable notifications, Button for mark-read-only
  if (deepLink && deepLink !== '/dashboard') {
    return <NotificationRow {...props} />;
  } else {
    return <NotificationRowButton {...props} />;
  }
}