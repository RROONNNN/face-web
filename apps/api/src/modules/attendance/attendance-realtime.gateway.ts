import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  OnGatewayConnection,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { AccountRole } from '../auth/account-role.enum';

type AccessTokenPayload = {
  sub: string;
  employeeCode: string;
  role: AccountRole;
};

export type AttendanceUpdatePayload = {
  eventType: 'checkIn' | 'checkOut';
  employeeId: string;
  workDate: string;
  event: {
    id: string;
    shiftId: string;
    time: Date;
    latitude: number | null;
    longitude: number | null;
    method: string;
    imagePath: string | null;
    isOutOfZone: boolean;
  };
};

@Injectable()
@WebSocketGateway({
  cors: {
    origin: process.env.WEB_ORIGIN ?? 'http://localhost:3000',
    credentials: true,
  },
})
export class AttendanceRealtimeGateway implements OnGatewayConnection {
  @WebSocketServer()
  private server!: Server;

  constructor(private readonly jwtService: JwtService) {}

  async handleConnection(client: Socket) {
    const token = this.extractToken(client);

    if (!token) {
      client.disconnect(true);
      return;
    }

    try {
      const payload =
        await this.jwtService.verifyAsync<AccessTokenPayload>(token);

      if (payload.role !== AccountRole.Admin) {
        client.disconnect(true);
      }
    } catch {
      client.disconnect(true);
    }
  }

  publishAttendanceUpdate(payload: AttendanceUpdatePayload) {
    this.server.emit('attendance:update', payload);
  }

  private extractToken(client: Socket) {
    const authToken = client.handshake.auth?.token;

    if (typeof authToken === 'string' && authToken.length > 0) {
      return authToken;
    }

    const authorization = client.handshake.headers.authorization;

    if (typeof authorization !== 'string') {
      return null;
    }

    const [type, token] = authorization.split(' ');
    return type === 'Bearer' && token ? token : null;
  }
}
