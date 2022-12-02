import { Inject } from '@nestjs/common';
import {
	SubscribeMessage,
	WebSocketGateway,
	WebSocketServer,
  } from '@nestjs/websockets';
import { AuthService } from 'src/auth/auth.service';
import { Server, Socket } from 'socket.io';
import { MessageDto } from 'src/chat/message.dto';
import { ChatService } from 'src/chat/chat.service';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { Chat } from 'src/entities/Chat.entity';
import { UserService } from 'src/user/user.service';

class userDto {
	id: number; /* user id */
}


class UserSocket {
  userID?: number;
  socketID?: string;
}



@WebSocketGateway({
	cors: {
		origin: [
			'http://localhost:3006',
		],
		credentials: true,
	},
	// namespace: 'chat',
	// transports: ['websocket'],
})
export class socketGateway {
	constructor (
		@Inject('AUTH_SERVICE') private readonly authService: AuthService,
		private readonly userService: UserService,
		private readonly chatService: ChatService,
	) {
		console.log("socket Gateway constructor");
	}

	@WebSocketServer()
	server: Server;

	/* List of current users */
	// connections: Set<number> = new Set();
	connections: UserSocket[] = [];


	async handleConnection (client: Socket, ...args: any[]) {
		const user = await this.findUser(client)
		if (!user)
			return;

		const rooms = await this.fetchRooms(client); /* Currently joined rooms */
		/* Add user to list of connections */
		this.connections.push({
			userID: user.id, socketID: client.id
		});


		/* Add client to every chat he is in */
		rooms.forEach((room) => {
			client.join('chat:' + room.id);
		});

		console.log('Connections', this.connections);
		console.log('Rooms', rooms);
	}

	async handleDisconnect (client: Socket) {
		const user = await this.findUser(client)

		/* This should never happen. But in case it happens we just return */
		if (!user)
			return;

		/* Remove user from list of connections */
		const clientToBeRemoved = this.connections.find((connection) => connection.socketID == client.id);
		if (clientToBeRemoved)
			this.connections.splice(this.connections.indexOf(clientToBeRemoved), 1);

		console.log('Connections', this.connections);
	}

	/* Chats */
	@SubscribeMessage('chat/join')
	async handleJoinChatMultiple (client: Socket, payload: any) {
		const user = await this.findUser(client)
		if (!user)
			return;
		console.log('Join chat', payload);
		/* Add client to every chat he is in */
		client.join('chat:' + payload.chatID);
	}

	@SubscribeMessage('chat/leave')
	async handleLeaveChat (client: Socket, payload: any) {
		const user = await this.findUser(client)
		if (!user)
			return;
		console.log('Leave chat', payload);
		client.leave('chat:' + payload.chatID);
	}
	
	@SubscribeMessage('chat/new-chat')
	async emitNewChatMessage(client: Socket, payload: MessageDto) {
		console.log('Recieved emit', new Date().valueOf().toString());
		const user = await this.findUser(client)
		if (!user)
			return;
	
		if (user.id != payload.senderID) {
			console.log('User ID does not match sender ID');
			return;
		}
		const messagePayload = await this.chatService.sendMessage(payload.chatID, user.id, payload.message);
		this.server.in('chat:' + payload.chatID).emit('chat/refresh-message', messagePayload);
	}

	@SubscribeMessage('ping')
	async handlePing (client: Socket, payload: Date) {
		const user = await this.findUser(client)
		if (!user)
			return;
		this.userService.updateUser(user.id, { lastOnline: new Date().valueOf().toString() });
	}



	private async fetchRooms (client: Socket): Promise<Chat[]> {
		const user = await this.findUser(client)
		if (!user)
			return null;
		const rooms = await this.chatService.getChats(user.id, "joined");
		return rooms;
	}
	private parseCookies (cookies: string) {
		const list = {};
		cookies && cookies.split(';').forEach((cookie) => {
			const parts = cookie.split('=');
			list[parts.shift().trim()] = decodeURI(parts.join('='));
		});
		return list;
	}

	private async findUser (client: Socket): Promise<userDto> {
		const cookies = this.parseCookies(client.handshake.headers.cookie);
		const user = await this.authService.verifyJWT(cookies['jwt'])
		if (!user)
			return null;

		if (!await this.authService.findUserById(user.id))
			return null;
		return { id: user.sub };
	}
}