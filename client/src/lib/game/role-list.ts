import { roleData, type Conclusion, type InsiderGroup, type PlayerIndex, type Role, type RoleSet } from './roles';

export type RoleList = RoleOutline[];
export type RoleOutline = RoleOutlineOption[];

export type RoleOutlineOption = (
	| { roleSet: RoleSet }
	| { role: Role }
) & {
	winIfAny?: Conclusion[];
	insiderGroups?: InsiderGroup[];
	playerPool?: PlayerIndex[];
};

export type RoleOrRoleSet =
	| { type: 'roleSet'; roleSet: RoleSet }
	| { type: 'role'; role: Role };

export function rolesFromRoleSet(roleSet: RoleSet): Role[] {
	const roles = Object.keys(roleData) as Role[];
	if (roleSet === 'any') {
		return roles;
	}

	return roles.filter((role) => roleData[role].roleSets.includes(roleSet));
}

export function rolesFromOutlineOption(option: RoleOutlineOption): Role[] {
	if ('role' in option) {
		return [option.role];
	}

	return rolesFromRoleSet(option.roleSet);
}

export function rolesFromOutline(outline: RoleOutline): Role[] {
	return [...new Set(outline.flatMap(rolesFromOutlineOption))];
}

export function rolesFromRoleList(roleList: RoleList): Role[] {
	return [...new Set(roleList.flatMap(rolesFromOutline))];
}

export function rolesFromRoleOrSet(value: RoleOrRoleSet): Role[] {
	if (value.type === 'role') {
		return [value.role];
	}

	return rolesFromRoleSet(value.roleSet);
}
