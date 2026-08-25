import { prisma } from "@/shared/db/prisma";

export type NotificationType = 
  | "invoice.overdue"
  | "payment.received"
  | "approval.needed"
  | "approval.granted"
  | "stock.low"
  | "po.received"
  | "leave.requested"
  | "trial.ending";

export interface DispatchNotificationDTO {
  tenantId: string;
  type: NotificationType;
  title: string;
  message: string;
  actionUrl?: string;
  // Specific users to target, or null if broadcasting to a role
  targetUserIds?: string[];
  // Abstract target audience (e.g. "Admins", "AR_Owner") 
  targetAudience?: "ADMINS" | "ALL" | "MANAGERS";
}

export class NotificationService {
  /**
   * Dispatches a notification to the specified users or audience,
   * respecting their preferences (e.g., In-App vs Email).
   */
  static async dispatch(dto: DispatchNotificationDTO): Promise<void> {
    let userIdsToNotify: string[] = [];

    // 1. Resolve Target Users
    if (dto.targetUserIds && dto.targetUserIds.length > 0) {
      userIdsToNotify = dto.targetUserIds;
    } else if (dto.targetAudience) {
      // Logic to resolve abstract audiences
      const memberships = await prisma.tenantMembership.findMany({
        where: { tenantId: dto.tenantId },
      });

      if (dto.targetAudience === "ADMINS") {
        userIdsToNotify = memberships.filter(m => m.role === "Admin" || m.role === "Owner").map(m => m.userId);
      } else if (dto.targetAudience === "ALL") {
        userIdsToNotify = memberships.map(m => m.userId);
      }
      // Add other audience resolution logic here
    }

    if (userIdsToNotify.length === 0) return;

    // 2. Fetch Preferences for these users
    const preferences = await prisma.notificationPreference.findMany({
      where: {
        tenantId: dto.tenantId,
        userId: { in: userIdsToNotify },
        type: dto.type
      }
    });

    const prefMap = new Map(preferences.map(p => [p.userId, p]));

    // 3. Process Notifications per User
    const inAppToCreate = [];

    for (const userId of userIdsToNotify) {
      const userPref = prefMap.get(userId);
      
      const sendInApp = userPref ? userPref.inApp : true; // Default to true
      const sendEmail = userPref ? userPref.email : true; // Default to true

      if (sendInApp) {
        inAppToCreate.push({
          tenantId: dto.tenantId,
          userId,
          type: dto.type,
          title: dto.title,
          message: dto.message,
          actionUrl: dto.actionUrl,
        });
      }

      if (sendEmail) {
        // Stub for actual email delivery (e.g., SendGrid/Resend)
        console.log(`[Email Stub] Sending email to User ${userId} for ${dto.type}: ${dto.title}`);
      }
    }

    // 4. Save In-App Notifications
    if (inAppToCreate.length > 0) {
      await prisma.notification.createMany({
        data: inAppToCreate
      });
    }
  }

  /**
   * Retrieves unread notifications for a user
   */
  static async getUnread(tenantId: string, userId: string) {
    return prisma.notification.findMany({
      where: {
        tenantId,
        userId,
        isRead: false
      },
      orderBy: { createdAt: 'desc' },
      take: 20
    });
  }

  /**
   * Marks notifications as read
   */
  static async markAsRead(notificationIds: string[]) {
    return prisma.notification.updateMany({
      where: { id: { in: notificationIds } },
      data: { isRead: true }
    });
  }
}
