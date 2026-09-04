/**
 * Notification Group Component
 * 
 * Groups and prioritizes notifications by type and severity.
 * Reduces noise by showing summaries for multiple items of the same type.
 */

import { useMemo } from 'react';
import styled from 'styled-components';
import { AlertTriangle, Package, Clock, CalendarClock, Bell } from 'lucide-react';
import { getNotificationPriority } from '@/utils/notificationDeepLinks';
import type { NotificationRowData } from './NotificationRow';

type NotificationGroupProps = {
  items: NotificationRowData[];
  type: 'stock' | 'chase' | 'order' | 'laybye' | 'alert';
  renderItem: (item: NotificationRowData) => React.ReactNode;
};

const GroupContainer = styled.div`
  margin-bottom: 24px;
`;

const GroupHeader = styled.div<{ $priority: number }>`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 20px;
  background: ${({ $priority }) => 
    $priority >= 95 ? '#fef2f2' : 
    $priority >= 85 ? '#fef7ed' : 
    $priority >= 75 ? '#fffbeb' : '#f9fafb'
  };
  border-bottom: 1px solid #e5e7eb;
  font-size: 14px;
  font-weight: 600;
  color: ${({ $priority }) =>
    $priority >= 95 ? '#dc2626' :
    $priority >= 85 ? '#ea580c' :
    $priority >= 75 ? '#d97706' : '#374151'
  };
`;

const GroupIcon = styled.div<{ $priority: number }>`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 6px;
  background: ${({ $priority }) =>
    $priority >= 95 ? '#fecaca' :
    $priority >= 85 ? '#fed7aa' :
    $priority >= 75 ? '#fde68a' : '#f3f4f6'
  };
  color: ${({ $priority }) =>
    $priority >= 95 ? '#dc2626' :
    $priority >= 85 ? '#ea580c' :
    $priority >= 75 ? '#d97706' : '#6b7280'
  };
`;

const GroupTitle = styled.span`
  flex: 1;
`;

const GroupCount = styled.span`
  font-size: 12px;
  font-weight: 500;
  opacity: 0.8;
`;

const ItemsList = styled.div`
  // Items will be rendered here
`;

const ICONS = {
  stock: Package,
  chase: AlertTriangle,
  order: Clock,
  laybye: CalendarClock,
  alert: Bell
};

const GROUP_TITLES = {
  stock: {
    out: 'Products Out of Stock',
    low: 'Products Running Low',
    mixed: 'Stock Alerts'
  },
  chase: {
    overdue: 'Overdue Payments',
    due: 'Payments Due Today',
    tomorrow: 'Payments Due Tomorrow',
    mixed: 'Credit Due'
  },
  order: {
    overdue: 'Overdue Orders',
    due: 'Orders Ready for Pickup',
    stale: 'Stale Orders',
    mixed: 'Order Alerts'
  },
  laybye: {
    overdue: 'Overdue Laybyes',
    due: 'Laybyes Due',
    quiet: 'Quiet Laybyes',
    mixed: 'Laybye Alerts'
  },
  alert: {
    mixed: 'Activity Alerts'
  }
};

export function NotificationGroup({ items, type, renderItem }: NotificationGroupProps) {
  // Sort items by priority (highest first)
  const sortedItems = useMemo(() => {
    return [...items].sort((a, b) => {
      const priorityA = getNotificationPriority(a.kind, getItemStatus(a));
      const priorityB = getNotificationPriority(b.kind, getItemStatus(b));
      return priorityB - priorityA; // Descending order
    });
  }, [items]);

  // Determine group characteristics
  const groupInfo = useMemo(() => {
    if (items.length === 0) return null;

    // Get all unique statuses in this group
    const statuses = new Set(items.map(item => getItemStatus(item)).filter(Boolean));
    const maxPriority = Math.max(...items.map(item => 
      getNotificationPriority(item.kind, getItemStatus(item))
    ));

    // Determine title based on status homogeneity
    let title: string;
    if (statuses.size === 1) {
      const status = Array.from(statuses)[0];
      title = GROUP_TITLES[type]?.[status as keyof typeof GROUP_TITLES[typeof type]] || 
              GROUP_TITLES[type]?.mixed || 
              `${type} alerts`;
    } else {
      title = GROUP_TITLES[type]?.mixed || `${type} alerts`;
    }

    return {
      title,
      count: items.length,
      priority: maxPriority,
      Icon: ICONS[type]
    };
  }, [items, type]);

  if (!groupInfo || items.length === 0) {
    return null;
  }

  return (
    <GroupContainer>
      <GroupHeader $priority={groupInfo.priority}>
        <GroupIcon $priority={groupInfo.priority}>
          <groupInfo.Icon size={14} strokeWidth={2} />
        </GroupIcon>
        <GroupTitle>{groupInfo.title}</GroupTitle>
        <GroupCount>
          {groupInfo.count} {groupInfo.count === 1 ? 'item' : 'items'}
        </GroupCount>
      </GroupHeader>
      <ItemsList>
        {sortedItems.map(item => renderItem(item))}
      </ItemsList>
    </GroupContainer>
  );
}

/**
 * Extract status from notification item
 */
function getItemStatus(item: NotificationRowData): string | undefined {
  switch (item.kind) {
    case 'stock':
      return item.stock?.status;
    case 'chase':
      return item.chase?.status;
    case 'order':
      return item.order?.status;
    case 'laybye':
      return item.laybye?.status;
    case 'alert':
      return 'info';
    default:
      return undefined;
  }
}

/**
 * Group notifications by type and render with priorities
 */
export function NotificationGroups({ 
  notifications, 
  renderItem 
}: { 
  notifications: NotificationRowData[];
  renderItem: (item: NotificationRowData) => React.ReactNode;
}) {
  const groups = useMemo(() => {
    // Group by notification type
    const grouped = notifications.reduce((acc, item) => {
      if (!acc[item.kind]) {
        acc[item.kind] = [];
      }
      acc[item.kind].push(item);
      return acc;
    }, {} as Record<string, NotificationRowData[]>);

    // Sort groups by highest priority item in each group
    const groupEntries = Object.entries(grouped).map(([type, items]) => {
      const maxPriority = Math.max(...items.map(item =>
        getNotificationPriority(item.kind, getItemStatus(item))
      ));
      return { type: type as NotificationRowData['kind'], items, maxPriority };
    });

    // Sort groups by priority (highest first)
    groupEntries.sort((a, b) => b.maxPriority - a.maxPriority);

    return groupEntries;
  }, [notifications]);

  return (
    <>
      {groups.map(({ type, items }) => (
        <NotificationGroup
          key={type}
          type={type}
          items={items}
          renderItem={renderItem}
        />
      ))}
    </>
  );
}