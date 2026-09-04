/**
 * Enhanced Notification Empty State
 * 
 * Provides clear feedback about notification status:
 * - All clear vs feed broken vs loading
 * - Actionable guidance when appropriate
 */

import styled from 'styled-components';
import { CheckCircle, RefreshCw, AlertCircle, Bell } from 'lucide-react';

type EmptyStateProps = {
  type: 'loading' | 'error' | 'empty-filtered' | 'all-clear';
  filter?: 'all' | 'unread';
  onRetry?: () => void;
  onClearFilter?: () => void;
};

const Container = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 64px 20px;
  text-align: center;
  color: #6b7280;
`;

const IconContainer = styled.div<{ $type: string }>`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 64px;
  height: 64px;
  border-radius: 50%;
  margin-bottom: 20px;
  background: ${({ $type }) => {
    switch ($type) {
      case 'loading':
        return '#f3f4f6';
      case 'error':
        return '#fef2f2';
      case 'all-clear':
        return '#f0fdf4';
      default:
        return '#f9fafb';
    }
  }};
  color: ${({ $type }) => {
    switch ($type) {
      case 'loading':
        return '#9ca3af';
      case 'error':
        return '#ef4444';
      case 'all-clear':
        return '#22c55e';
      default:
        return '#6b7280';
    }
  }};
`;

const Title = styled.h3`
  font-size: 18px;
  font-weight: 600;
  color: #111827;
  margin: 0 0 8px 0;
`;

const Description = styled.p`
  font-size: 14px;
  color: #6b7280;
  margin: 0 0 20px 0;
  max-width: 320px;
  line-height: 1.5;
`;

const ActionButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  background: #f3f4f6;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  color: #374151;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;

  &:hover {
    background: #e5e7eb;
    border-color: #9ca3af;
  }

  &:active {
    background: #d1d5db;
  }
`;

const LoadingIcon = styled(RefreshCw)<{ $spinning: boolean }>`
  animation: ${({ $spinning }) => $spinning ? 'spin 1s linear infinite' : 'none'};
  
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
`;

export function NotificationEmptyState({ type, filter, onRetry, onClearFilter }: EmptyStateProps) {
  const renderContent = () => {
    switch (type) {
      case 'loading':
        return {
          icon: <LoadingIcon size={28} $spinning={true} />,
          title: 'Loading notifications...',
          description: 'Checking for alerts and updates.',
          action: null
        };

      case 'error':
        return {
          icon: <AlertCircle size={28} />,
          title: 'Unable to load notifications',
          description: 'There was a problem fetching your notifications. Check your connection and try again.',
          action: onRetry ? (
            <ActionButton onClick={onRetry}>
              <RefreshCw size={16} />
              Try Again
            </ActionButton>
          ) : null
        };

      case 'empty-filtered':
        return {
          icon: <Bell size={28} />,
          title: filter === 'unread' ? 'No unread notifications' : 'No notifications',
          description: filter === 'unread' 
            ? 'All caught up! Switch to "All" to see your notification history.'
            : 'No notifications to display with current filters.',
          action: filter === 'unread' && onClearFilter ? (
            <ActionButton onClick={onClearFilter}>
              Show All Notifications
            </ActionButton>
          ) : null
        };

      case 'all-clear':
        return {
          icon: <CheckCircle size={28} />,
          title: 'All caught up!',
          description: 'No urgent actions needed. Your shop operations are running smoothly.',
          action: null
        };

      default:
        return {
          icon: <Bell size={28} />,
          title: 'No notifications',
          description: 'Notifications will appear here when there are actions to take.',
          action: null
        };
    }
  };

  const content = renderContent();

  return (
    <Container>
      <IconContainer $type={type}>
        {content.icon}
      </IconContainer>
      <Title>{content.title}</Title>
      <Description>{content.description}</Description>
      {content.action}
    </Container>
  );
}

/**
 * Smart empty state that chooses the right type based on context
 */
type SmartEmptyStateProps = {
  isLoading: boolean;
  isError: boolean;
  hasNotifications: boolean;
  hasFilteredNotifications: boolean;
  filter: 'all' | 'unread';
  onRetry?: () => void;
  onClearFilter?: () => void;
};

export function SmartNotificationEmptyState({
  isLoading,
  isError,
  hasNotifications,
  hasFilteredNotifications,
  filter,
  onRetry,
  onClearFilter
}: SmartEmptyStateProps) {
  if (isLoading) {
    return <NotificationEmptyState type="loading" />;
  }

  if (isError) {
    return <NotificationEmptyState type="error" onRetry={onRetry} />;
  }

  if (!hasNotifications) {
    return <NotificationEmptyState type="all-clear" />;
  }

  if (!hasFilteredNotifications) {
    return (
      <NotificationEmptyState 
        type="empty-filtered" 
        filter={filter}
        onClearFilter={onClearFilter}
      />
    );
  }

  return null;
}