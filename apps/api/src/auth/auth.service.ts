import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { EmailService } from '../shared/email.service';
import { LoginDto } from './dto/login.dto';
import { AcceptInvitationDto } from './dto/accept-invitation.dto';
import { InviteDto } from './dto/invite.dto';
import { AuditAction } from '@prisma/client';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly auditService: AuditService,
    private readonly emailService: EmailService,
  ) {}

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      include: {
        role: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Account is deactivated');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const tokens = await this.generateTokens(user.id, user.email, user.role?.code);

    // Audit log
    await this.auditService.log({
      userId: user.id,
      action: AuditAction.LOGIN,
      entity: 'user',
      entityId: user.id,
    });

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        locale: user.locale,
        role: user.role
          ? { id: user.role.id, name: user.role.name, code: user.role.code }
          : null,
      },
    };
  }

  async refreshToken(refreshToken: string) {
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      });

      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        include: { role: true },
      });

      if (!user || !user.isActive) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      return this.generateTokens(user.id, user.email, user.role?.code);
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async acceptInvitation(dto: AcceptInvitationDto) {
    const invitation = await this.prisma.invitation.findUnique({
      where: { token: dto.token },
    });

    if (!invitation) {
      throw new BadRequestException('Invalid invitation token');
    }

    if (invitation.status !== 'INVITED') {
      throw new BadRequestException('Invitation is no longer valid');
    }

    if (new Date() > invitation.expiresAt) {
      await this.prisma.invitation.update({
        where: { id: invitation.id },
        data: { status: 'EXPIRED' },
      });
      throw new BadRequestException('Invitation has expired');
    }

    // Check if email already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email: invitation.email },
    });

    if (existingUser) {
      throw new BadRequestException('An account with this email already exists');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);

    // Create user and accept invitation in a transaction
    const user = await this.prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          email: invitation.email,
          passwordHash,
          name: dto.name,
          roleId: invitation.roleId,
          locale: dto.locale || 'en',
        },
        include: { role: true },
      });

      await tx.invitation.update({
        where: { id: invitation.id },
        data: {
          status: 'ACCEPTED',
          acceptedAt: new Date(),
        },
      });

      return newUser;
    });

    const tokens = await this.generateTokens(user.id, user.email, user.role?.code);

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        locale: user.locale,
        role: user.role
          ? { id: user.role.id, name: user.role.name, code: user.role.code }
          : null,
      },
    };
  }

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        role: {
          include: {
            permissions: {
              include: { permission: true },
            },
          },
        },
        permissions: {
          include: { permission: true },
        },
        profile: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Build effective permissions
    const rolePermissions = user.role?.permissions.map((rp) => rp.permission.code) || [];
    const userGranted = user.permissions
      .filter((up) => up.granted)
      .map((up) => up.permission.code);
    const userDenied = user.permissions
      .filter((up) => !up.granted)
      .map((up) => up.permission.code);

    const effectivePermissions = [
      ...new Set([...rolePermissions, ...userGranted]),
    ].filter((p) => !userDenied.includes(p));

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      locale: user.locale,
      isActive: user.isActive,
      role: user.role
        ? { id: user.role.id, name: user.role.name, code: user.role.code }
        : null,
      profile: user.profile,
      permissions: effectivePermissions,
    };
  }

  async invite(dto: InviteDto, invitedBy: string) {
    // Check if user already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existingUser) {
      throw new BadRequestException('A user with this email already exists');
    }

    // Check if there's already a pending invitation
    const existingInvitation = await this.prisma.invitation.findFirst({
      where: { email: dto.email, status: 'INVITED' },
    });
    if (existingInvitation) {
      throw new BadRequestException('An invitation for this email is already pending');
    }

    // Verify role exists
    const role = await this.prisma.role.findUnique({
      where: { id: dto.roleId },
    });
    if (!role) {
      throw new BadRequestException('Invalid role');
    }

    // Generate unique token
    const token = crypto.randomUUID();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

    const invitation = await this.prisma.invitation.create({
      data: {
        email: dto.email,
        token,
        roleId: dto.roleId,
        invitedBy,
        expiresAt,
      },
    });

    // Audit log
    await this.auditService.log({
      userId: invitedBy,
      action: AuditAction.INVITATION_SENT,
      entity: 'invitation',
      entityId: invitation.id,
      details: { email: dto.email, role: role.name },
    });

    const webUrl = this.configService.get<string>('WEB_URL', 'http://localhost:3000');
    const inviteLink = `${webUrl}/en/accept-invitation?token=${token}`;

    // Get inviter name
    const inviter = await this.prisma.user.findUnique({ where: { id: invitedBy } });

    // Send invitation email (async, don't block response)
    this.emailService.sendInvitationEmail({
      to: dto.email,
      inviterName: inviter?.name || 'RKC Admin',
      roleName: role.name,
      inviteLink,
      expiresAt,
    }).catch((err) => {
      console.error('Failed to send invitation email:', err);
    });

    return {
      id: invitation.id,
      email: dto.email,
      role: role.name,
      token,
      inviteLink,
      expiresAt,
    };
  }

  private async generateTokens(userId: string, email: string, roleCode?: string) {
    const payload = { sub: userId, email, role: roleCode };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload),
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
        expiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRES_IN', '30d'),
      }),
    ]);

    return { accessToken, refreshToken };
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('User not found');

    const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isValid) throw new BadRequestException('Current password is incorrect');

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });

    await this.auditService.log({ userId, action: AuditAction.UPDATE, entity: 'user', entityId: userId, details: { action: 'password_changed' } });

    return { message: 'Password changed successfully' };
  }
}
