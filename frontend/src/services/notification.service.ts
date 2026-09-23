import { api } from './api.service';

export interface Notification {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  data: any;
  readAt: string | null;
  createdAt: string;
}

export interface NotificationsResponse {
  success: boolean;
  message: string;
  data: {
    notifications: Notification[];
    total: number;
    page: number;
    limit: number;
  };
}

export interface UnreadCountResponse {
  success: boolean;
  data: {
    count: number;
  };
}

export const notificationService = {
  // Get user's notifications
  getNotifications: (params?: {
    page?: number;
    limit?: number;
    unreadOnly?: boolean;
  }) => api.get<NotificationsResponse>('/notifications', params),

  // Get unread count
  getUnreadCount: () =>
    api.get<UnreadCountResponse>('/notifications/unread-count'),

  // Mark notification as read
  markAsRead: (id: string) =>
    api.patch<{ success: boolean; message: string; data: { notification: Notification } }>(
      `/notifications/${id}/read`,
      {}
    ),

  // Mark all as read
  markAllAsRead: () =>
    api.patch<{ success: boolean; message: string; data: { count: number } }>(
      '/notifications/mark-all-read',
      {}
    ),
};
