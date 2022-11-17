import { ConsoleLogger, Inject, Injectable } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { Strategy, Profile } from 'passport-42';
import { AuthService } from "../auth.service";

@Injectable()
export class FortyTwoStrategy extends PassportStrategy(Strategy) {
	constructor(
		@Inject('AUTH_SERVICE') private readonly authService: AuthService,
	) {
		super({
			// grant_type: 'client_credentials',
			clientID: 'u-s4t2ud-31d739729a66569fa3753c24bec5a62d62557111a6b9bd51a690afe5061f8cfc',
			clientSecret: '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',
			callbackURL: 'http://localhost:3000/auth/42/redirect',
			scope: ['public', 'profile']
		});
	}
	async validate(accessToken: string, refreshToken: string, profile: Profile) {
		console.log(accessToken);
		console.log(refreshToken);
		console.log(profile);
		const user = await this.authService.validateUser({
			username: profile.username
		});
		console.log('Validate');
		console.log(user);
		return user || null;
	}
}