import config from '../../config';
import { IUserDTO, IUserLiteDTO } from '../dtos/IUserDTO';
import { Result } from '../core/result';
import { User } from '../domain/user';
import { UserMapper } from '../mappers/userMapper';
import IRoleRepo from '../repos/IRepos/IRoleRepo';
import IUserRepo from '../repos/IRepos/IUserRepo';
import IUserService from './IServices/IUserService';

import { compare, hash } from 'bcrypt';
import { sign } from 'jsonwebtoken';
import { Inject, Service } from 'typedi';

@Service()
export default class UserService implements IUserService {
	constructor(
		@Inject(config.repos.user) private userRepoInstance: IUserRepo,
		@Inject(config.repos.role) private roleRepoInstance: IRoleRepo
	) {}

	public async signUp(reqBody: any): Promise<Result<string>> {
		const userExists = await this.userRepoInstance.findOneUser({ email: reqBody.email });
		if (userExists) {
			return Result.fail<string>('User with the email "' + reqBody.email + '" already exists');
		}

		const hashedPassword = await hash(reqBody.password, 10);

		const user = User.create({
			email: reqBody.email,
			password: hashedPassword,
			firstName: reqBody.firstName,
			lastName: reqBody.lastName,
			role: config.defaultRole,
		});

		await this.userRepoInstance.createUser(user);

		const token = this.signToken(UserMapper.toDTO(user));
		return Result.ok<string>(token);
	}

	public async login(reqBody: any): Promise<Result<string>> {
		const user = await this.userRepoInstance.findOneUser({ email: reqBody.email });
		if (user == null) {
			return Result.fail<string>('No user with the email "' + reqBody.email + '" was found');
		}

		const passwordIsMatch = await compare(reqBody.password, user.password);
		if (!passwordIsMatch) {
			return Result.fail<string>('Incorrect password');
		}

		const token = this.signToken(UserMapper.toDTO(user));
		return Result.ok<string>(token);
	}

	public async findAllUsers(): Promise<Result<IUserLiteDTO[]>> {
		const userList = await this.userRepoInstance.findUsers();
		if (userList.length === 0) {
			return Result.fail<IUserLiteDTO[]>('There are no users');
		}

		return Result.ok<IUserLiteDTO[]>(userList.map((e) => UserMapper.toLiteDTO(e)));
	}

	public async findUser(userId: string): Promise<Result<IUserLiteDTO>> {
		const user = await this.userRepoInstance.findOneUser({ _id: userId });
		if (user == null) {
			return Result.fail<IUserLiteDTO>('No user with the id "' + userId + '" was found');
		}

		return Result.ok<IUserLiteDTO>(UserMapper.toLiteDTO(user));
	}

	public async updateProfile(userEmail: string, reqBody: any): Promise<Result<string>> {
		const user = await this.userRepoInstance.findOneUser({ email: userEmail });
		if (user == null) {
			return Result.fail<string>('No user with the email "' + reqBody.email + '" was found');
		}

		if (userEmail != reqBody.email) {
			const userExists = await this.userRepoInstance.findOneUser({ email: reqBody.email });
			if (userExists) {
				return Result.fail<string>('User with the email "' + reqBody.email + '" already exists');
			}
		}

		const hashedPassword = await hash(reqBody.password, 10);

		user.email = reqBody.email;
		user.password = hashedPassword;
		user.firstName = reqBody.firstName;
		user.lastName = reqBody.lastName;

		await this.userRepoInstance.updateUserProfile(user);

		const token = this.signToken(UserMapper.toDTO(user));
		return Result.ok<string>(token);
	}

	public async updateUserRole(userId: string, roleName: string): Promise<Result<IUserDTO>> {
		//TODO: Change to ID
		const user = await this.userRepoInstance.findOneUser({ email: userId });
		if (user == null) {
			return Result.fail<IUserDTO>('No user with the id "' + userId + '" was found');
		}

		if (roleName !== config.defaultRole) {
			const roleExists = await this.roleRepoInstance.findOneRole(roleName);
			if (!roleExists) {
				return Result.fail<IUserDTO>('No role with the name "' + roleName + '" was found');
			}
		}

		user.role = roleName;

		await this.userRepoInstance.updateUserRole(user);
		return Result.ok<IUserDTO>();
	}

	public async deleteUser(userEmail: string): Promise<Result<IUserDTO>> {
		const result = await this.userRepoInstance.deleteUser(userEmail);
		if (!result) {
			return Result.fail<IUserDTO>('No user with the email "' + userEmail + '" was found');
		}

		return Result.ok<IUserDTO>();
	}

	private signToken(data: any): string {
		return sign(data, config.jwtAccessSecret, { expiresIn: config.jwtDuration });
	}
}
