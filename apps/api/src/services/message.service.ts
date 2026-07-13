import prisma from '@melue/db';

export class MessageService {
  static async send(senderId: string, studentId: string, content: string, subject?: string, recipientId?: string) {
    const message = await prisma.message.create({
      data: {
        senderId,
        studentId,
        content,
        subject,
        recipientId,
      },
      include: {
        sender: {
          select: { firstName: true, lastName: true },
        },
      },
    });

    // Create notification for recipient
    if (recipientId) {
      await prisma.notification.create({
        data: {
          userId: recipientId,
          type: 'new_message',
          title: subject || 'New Message',
          message: content.substring(0, 200),
          link: `/messages/${message.id}`,
        },
      });
    }

    return message;
  }

  static async getInbox(userId: string) {
    const messages = await prisma.message.findMany({
      where: {
        OR: [
          { recipientId: userId },
          { senderId: userId },
        ],
      },
      include: {
        sender: {
          select: { id: true, firstName: true, lastName: true },
        },
        student: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
      orderBy: { sentAt: 'desc' },
    });

    return messages;
  }

  static async markRead(id: string, userId: string) {
    const message = await prisma.message.findUnique({
      where: { id },
    });

    if (!message) {
      throw new Error('Message not found');
    }

    if (message.recipientId !== userId) {
      throw new Error('Not authorized to mark this message');
    }

    await prisma.message.update({
      where: { id },
      data: { isRead: true },
    });

    return { message: 'Marked as read' };
  }
}
