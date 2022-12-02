import { CacheModule, forwardRef, Global, Module } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AppModule } from "src/app.module";
import { AuthService } from "src/auth/auth.service";
import { ChatController } from "src/chat/chat.controller";
import { ChatModule } from "src/chat/chat.module";
import { ChatService } from "src/chat/chat.service";
import { Chat } from "src/entities/Chat.entity";
import { Membership } from "src/entities/Membership.entity";
import { Message } from "src/entities/Message.entity";
import { User } from "src/entities/User.entity";
import { MembershipService } from "src/user/membership/membership.service";
import { UserModule } from "src/user/user.module";
import { UserService } from "src/user/user.service";
import { socketGateway } from "./socket.gateway";

@Global()
@Module({
	imports: [
		UserModule, ChatModule,
		TypeOrmModule.forFeature([Chat, User, Message, Membership]),
		forwardRef(() => AppModule),
		CacheModule.register(),
	],
	controllers: [ChatController],
	providers: [
		socketGateway,
		MembershipService,
		{
			provide: 'AUTH_SERVICE',
			useClass: AuthService,
		},
		JwtService,
		UserService,
		ChatService,
	],
	exports: [socketGateway],
})
export class socketModule {}