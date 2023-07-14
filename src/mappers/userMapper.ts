import { User } from '../domain/user';
import { EntityID } from '../core/domain/entityID';
import IUserDTO from '../dtos/IUserDTO';
import IUserPersistence from '../dtos/IUserPersistence';

import { Document, Model } from 'mongoose';

export class UserMapper {
	public static toDomain(schema: any | Model<IUserPersistence & Document>): User {
		return User.create(
			{
				email: schema.email,
				password: schema.password,
				firstName: schema.firstName,
				lastName: schema.lastName,
				role: schema.role,
			},
			new EntityID(schema.id)
		);
	}

	public static toDTO(user: User): IUserDTO {
		return {
			email: user.email,
			firstName: user.firstName,
			lastName: user.lastName,
			role: user.role,
		} as IUserDTO;
	}

	public static toPersistence(user: User): IUserPersistence {
		return {
			_id: user.id.toValue(),
			email: user.email,
			password: user.password,
			firstName: user.firstName,
			lastName: user.lastName,
			role: user.role,
		} as IUserPersistence;
	}
}
